// הלוגו של הגולש: קובץ (תמונה, SVG, PDF או AI) או שם שהוקלד ← קנבס ← רקע מוסר, צבעים מופרדים ← קווים וקטוריים.

const MAX = 1200;       // הצלע הארוכה של הלוגו אחרי חיתוך, בפיקסלים
const TRACE_MAX = 1000; // הצלע הארוכה שנשלחת להמרה לווקטור

export class LogoError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------- קובץ ← קנבס ----------

export async function fileToCanvas(file) {
  if (file.size > 30 * 1024 * 1024) throw new LogoError('too-big');
  const head = new Uint8Array(await file.slice(0, 2048).arrayBuffer());
  const text = new TextDecoder('latin1').decode(head);
  const name = (file.name || '').toLowerCase();
  if (text.startsWith('%PDF')) return pdfToCanvas(file);
  if (text.startsWith('%!PS') || name.endsWith('.eps') || name.endsWith('.ai')) throw new LogoError('eps');
  if (file.type === 'image/svg+xml' || name.endsWith('.svg') || /<svg[\s>]/i.test(text)) return svgToCanvas(await file.text());
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const s = Math.min(1, (MAX * 1.6) / Math.max(bmp.width, bmp.height));
    const c = canvasOf(bmp.width * s, bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return c;
  } catch {
    throw new LogoError('unreadable');
  }
}

async function svgToCanvas(src) {
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new LogoError('unreadable');
  let w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    if (!(w > 0 && h > 0) || /%/.test(svg.getAttribute('width') || '')) { w = vb[2]; h = vb[3]; }
  } else if (!(w > 0 && h > 0)) { w = 1000; h = 1000; }
  const s = (MAX * 1.6) / Math.max(w, h);
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w * s); svg.setAttribute('height', h * s);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    // onload ולא decode(): בלשונית ברקע decode() יכול להתעכב שניות
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const c = canvasOf(w * s, h * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } catch {
    throw new LogoError('unreadable');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// PDF ו-AI (נשמר כברירת מחדל עם תאימות PDF): עמוד ראשון. מעבר ראשון מוצא איפה הלוגו בעמוד, השני מצייר רק אותו בחדות
async function pdfToCanvas(file) {
  const pdfjs = await import('../vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch {
    throw new LogoError('unreadable');
  }
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const s1 = 800 / Math.max(base.width, base.height);
    const v1 = page.getViewport({ scale: s1 });
    const c1 = canvasOf(v1.width, v1.height);
    await page.render({ canvasContext: c1.getContext('2d'), viewport: v1, background: 'rgba(0,0,0,0)' }).promise;
    const box = contentBox(c1) || { x: 0, y: 0, w: c1.width, h: c1.height };
    const s2 = Math.min(s1 * ((MAX * 1.6) / Math.max(box.w, box.h)), 4096 / Math.max(base.width, base.height));
    const k = s2 / s1;
    const c2 = canvasOf(box.w * k, box.h * k);
    await page.render({
      canvasContext: c2.getContext('2d'), viewport: page.getViewport({ scale: s2 }), background: 'rgba(0,0,0,0)',
      transform: [1, 0, 0, 1, -box.x * k, -box.y * k],
    }).promise;
    return c2;
  } finally {
    doc.destroy();
  }
}

// המלבן שיש בו תוכן: פיקסלים לא שקופים ולא לבנים
function contentBox(c) {
  const { data, width: w, height: h } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 24 && !(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const pad = Math.ceil(Math.max(x1 - x0, y1 - y0) * 0.03) + 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ---------- שם שהוקלד ← קנבס ----------

// סגנונות הכתב לשם שהגולש מקליד: רק לציור השם על השלט ולתצוגה בבורר, לא לטקסט של האתר. OFL, רישיונות בתיקיית fonts.
// השמות והמשקלים תואמים ל-SIM_FONTS ב-build.py. נרשמים כאן כי הם שייכים לכלי, והדפדפן מוריד כל קובץ רק כשמציירים בו.
const HE = 'U+0590-05FF, U+FB1D-FB4F, U+20AA', LAT = 'U+0000-00FF, U+2000-206F, U+20AC, U+2122';
for (const [family, file, weight] of [['Heebo', 'heebo', 800], ['Rubik', 'rubik', 700], ['Frank Ruhl Libre', 'frank-ruhl-libre', 700], ['Secular One', 'secular-one', 400]]) {
  for (const [part, range] of [['hebrew', HE], ['latin', LAT]]) {
    const url = new URL(`fonts/${file}-${part}-${weight}.woff2`, import.meta.url);
    document.fonts.add(new FontFace(family, `url(${url}) format('woff2')`, { weight: String(weight), unicodeRange: range, display: 'swap' }));
  }
}

export async function textToCanvas(text, { family = 'Heebo', weight = 800, color = '#111111' } = {}) {
  text = text.trim().replace(/\s+/g, ' ');
  if (!text) throw new LogoError('empty');
  const size = 320;
  const font = `${weight} ${size}px "${family}"`;
  try { await document.fonts.load(font, text); } catch { /* נשאר עם פונט חלופי */ }
  const rtl = /[֐-׿]/.test(text);
  const probe = canvasOf(1, 1).getContext('2d');
  probe.font = font;
  probe.direction = rtl ? 'rtl' : 'ltr';
  // אותו עיגון כמו בציור למטה; בעברית ברירת המחדל היא start, כלומר ימין, והמדידה יוצאת הפוכה
  probe.textAlign = 'left';
  const m = probe.measureText(text);
  const left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
  const up = m.actualBoundingBoxAscent, down = m.actualBoundingBoxDescent;
  const pad = size * 0.15;
  const c = canvasOf(left + right + pad * 2, up + down + pad * 2);
  const ctx = c.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // actualBoundingBoxLeft נמדד שמאלה מנקודת העיגון, ולכן העיגון זז ימינה באותו מרחק
  ctx.fillText(text, pad + left, pad + up);
  return c;
}

// ---------- סלוגן מתחת ללוגו ----------

// מוסיף שורת סלוגן ממורכזת מתחת ללוגו, לפני הסרת הרקע. הצבע הוא הצבע הנפוץ בלוגו, כך שהסלוגן נכנס לאותה שכבה
// ויוצא באותו חומר. הרקע מזוהה כמו ב-extractLogo: שקיפות, או הצבע החציוני בשוליים.
// share: איזה חלק מרוחב השלט הוא הלוגו עצמו, כדי שהוספת סלוגן לא תשנה את גודל הלוגו על הקיר
export async function withSlogan(src, slogan, { family = 'GS', weight = 600 } = {}) {
  slogan = slogan.trim().replace(/\s+/g, ' ');
  if (!slogan) return { canvas: src, share: 1 };
  const sw = src.width, sh = src.height;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) transparent++;
  const alphaMode = transparent / (sw * sh) > 0.03;
  const bgv = alphaMode ? null : borderMedian(d, sw, sh);

  // גבולות התוכן וההיסטוגרמה של הצבעים שלו (5 ביט לערוץ). בקובץ גדול דוגמים כל כמה פיקסלים
  const step = Math.max(1, Math.floor(Math.sqrt((sw * sh) / 1.5e6)));
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  const hist = new Map();
  for (let y = 0; y < sh; y += step) for (let x = 0; x < sw; x += step) {
    const p = (y * sw + x) * 4;
    if (alphaMode ? d[p + 3] <= 200 : Math.sqrt(d2([d[p], d[p + 1], d[p + 2]], bgv)) <= 70) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    const k = ((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3);
    const e = hist.get(k);
    if (e) { e[0] += d[p]; e[1] += d[p + 1]; e[2] += d[p + 2]; e[3]++; } else hist.set(k, [d[p], d[p + 1], d[p + 2], 1]);
  }
  if (x1 < 0) return { canvas: src, share: 1 };
  x1 = Math.min(sw - 1, x1 + step - 1); y1 = Math.min(sh - 1, y1 + step - 1);
  let best = null;
  for (const e of hist.values()) if (!best || e[3] > best[3]) best = e;
  const color = hex([best[0] / best[3], best[1] / best[3], best[2] / best[3]]);

  const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
  const font = (px) => `${weight} ${px}px "${family}"`;
  try { await document.fonts.load(font(100), slogan); } catch { /* נשאר עם פונט חלופי */ }
  const rtl = /[֐-׿]/.test(slogan);
  const probe = canvasOf(1, 1).getContext('2d');
  probe.font = font(100);
  probe.direction = rtl ? 'rtl' : 'ltr';
  probe.textAlign = 'left';
  const m = probe.measureText(slogan);
  const w100 = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  // בערך חמישית מגובה הלוגו, לא רחב מהלוגו, ולא קטן מדי כדי שיצא קריא בשלט (ואז הקנבס מתרחב)
  const size = Math.max(Math.min(lh * 0.2, (lw * 0.96 * 100) / w100), Math.max(lw, lh) * 0.05, 16);
  const k = size / 100;
  const left = m.actualBoundingBoxLeft * k, tw = w100 * k;
  const up = m.actualBoundingBoxAscent * k, th = up + m.actualBoundingBoxDescent * k;
  const gap = Math.max(size * 0.5, lh * 0.07);
  const pad = Math.round(Math.max(lw, tw) * 0.04) + 4;
  const W = Math.max(lw, tw) + pad * 2, H = lh + gap + th + pad * 2;
  const c = canvasOf(W, H);
  const ctx = c.getContext('2d');
  if (!alphaMode) { ctx.fillStyle = hex(bgv); ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(src, x0, y0, lw, lh, Math.round((W - lw) / 2), pad, lw, lh);
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(slogan, (W - tw) / 2 + left, pad + lh + gap + up);
  return { canvas: c, share: lw / Math.max(lw, tw) };
}

// ---------- הסרת רקע והפרדת צבעים ----------

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function borderMedian(d, w, h) {
  const rs = [], gs = [], bs = [];
  const take = (x, y) => { const i = (y * w + x) * 4; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
  const step = Math.max(1, Math.floor((w + h) / 600));
  for (let x = 0; x < w; x += step) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y += step) { take(0, y); take(w - 1, y); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// k-means עם התחלה קבועה של k-means++, כדי שאותו לוגו יקבל תמיד אותם צבעים
function kmeans(samples, k) {
  const rand = rng(7);
  const cents = [samples[Math.floor(rand() * samples.length)].slice()];
  const near = new Float64Array(samples.length).fill(Infinity);
  while (cents.length < k) {
    const last = cents[cents.length - 1];
    let sum = 0;
    for (let i = 0; i < samples.length; i++) { near[i] = Math.min(near[i], d2(samples[i], last)); sum += near[i]; }
    if (sum === 0) break;
    let r = rand() * sum, i = 0;
    while (i < samples.length - 1 && r > near[i]) { r -= near[i]; i++; }
    cents.push(samples[i].slice());
  }
  const counts = new Array(cents.length).fill(0);
  for (let it = 0; it < 14; it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < cents.length; j++) { const dd = d2(s, cents[j]); if (dd < bd) { bd = dd; best = j; } }
      const a = acc[best]; a[0] += s[0]; a[1] += s[1]; a[2] += s[2]; a[3]++;
    }
    cents.forEach((c, j) => { const a = acc[j]; counts[j] = a[3]; if (a[3]) { c[0] = a[0] / a[3]; c[1] = a[1] / a[3]; c[2] = a[2] / a[3]; } });
  }
  return cents.map((c, j) => ({ c, n: counts[j] }));
}

// מקבל קנבס, מחזיר את הלוגו חתוך: כמה כל פיקסל מכוסה, איזה צבע הוא, ופלטה של עד 6 צבעים
export function extractLogo(src, { tolerance = 40, removeBg = true } = {}) {
  const sw = src.width, sh = src.height;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const sn = sw * sh;

  let transparent = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) transparent++;
  const mode = transparent / sn > 0.03 ? 'alpha' : removeBg ? 'color' : 'none';
  const bgv = mode === 'color' ? borderMedian(d, sw, sh) : null;

  // כיסוי ראשוני: מהשקיפות של הקובץ, או מהמרחק מצבע הרקע
  const cov = new Float32Array(sn);
  for (let i = 0; i < sn; i++) {
    const p = i * 4;
    if (mode === 'alpha') cov[i] = d[p + 3] / 255;
    else if (mode === 'color') cov[i] = smooth(tolerance, tolerance + 30, Math.sqrt(d2([d[p], d[p + 1], d[p + 2]], bgv)));
    else cov[i] = 1;
  }

  // חיתוך לגבולות הלוגו
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (cov[y * sw + x] > 0.15) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new LogoError('empty');
  const pad = Math.ceil(Math.max(x1 - x0, y1 - y0) * 0.02) + 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(sw - 1, x1 + pad); y1 = Math.min(sh - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const sc = Math.min(1, MAX / Math.max(cw, ch));
  const w = Math.max(1, Math.round(cw * sc)), h = Math.max(1, Math.round(ch * sc));

  // דגימה מחדש לגודל העבודה. הצבע והכיסוי מוקטנים בנפרד, כדי שהכיסוי לא יכהה את הצבע בקצוות
  const colorCanvas = canvasOf(cw, ch), alphaCanvas = canvasOf(cw, ch);
  const cid = colorCanvas.getContext('2d').createImageData(cw, ch), aid = alphaCanvas.getContext('2d').createImageData(cw, ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (y + y0) * sw + (x + x0), di = (y * cw + x) * 4;
    cid.data[di] = d[si * 4]; cid.data[di + 1] = d[si * 4 + 1]; cid.data[di + 2] = d[si * 4 + 2]; cid.data[di + 3] = 255;
    aid.data[di] = aid.data[di + 1] = aid.data[di + 2] = Math.round(cov[si] * 255); aid.data[di + 3] = 255;
  }
  colorCanvas.getContext('2d').putImageData(cid, 0, 0);
  alphaCanvas.getContext('2d').putImageData(aid, 0, 0);
  const shrink = (c) => {
    const o = canvasOf(w, h), ctx = o.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const wd = shrink(colorCanvas), ad = shrink(alphaCanvas);
  const N = w * h;
  const alpha = new Uint8ClampedArray(N);
  const rgb = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    alpha[i] = ad[i * 4];
    rgb[i * 3] = wd[i * 4]; rgb[i * 3 + 1] = wd[i * 4 + 1]; rgb[i * 3 + 2] = wd[i * 4 + 2];
  }

  // פיקסלים מבפנים (לא קצוות מוחלקים) קובעים את הפלטה
  const interior = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (alpha[i] < 250) continue;
    let flat = true;
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (alpha[j] < 250 || Math.abs(rgb[j * 3] - rgb[i * 3]) + Math.abs(rgb[j * 3 + 1] - rgb[i * 3 + 1]) + Math.abs(rgb[j * 3 + 2] - rgb[i * 3 + 2]) > 30) { flat = false; break; }
    }
    if (flat) interior.push(i);
  }
  let pool = interior;
  if (pool.length < 200) { pool = []; for (let i = 0; i < N; i++) if (alpha[i] > 200) pool.push(i); }
  if (!pool.length) throw new LogoError('empty');
  const samples = [];
  const stride = Math.max(1, Math.floor(pool.length / 24000));
  for (let k = 0; k < pool.length; k += stride) { const i = pool[k]; samples.push([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]); }

  let clusters = kmeans(samples, Math.min(6, samples.length));
  // איחוד צבעים קרובים, ואז זריקת צבעים זניחים
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let a = 0; a < clusters.length; a++) for (let b = a + 1; b < clusters.length; b++) {
      if (d2(clusters[a].c, clusters[b].c) < 38 * 38) {
        const A = clusters[a], B = clusters[b], t = A.n + B.n || 1;
        A.c = A.c.map((v, i) => (v * A.n + B.c[i] * B.n) / t); A.n += B.n;
        clusters.splice(b, 1); merged = true; break outer;
      }
    }
  }
  const total = clusters.reduce((s, c) => s + c.n, 0) || 1;
  clusters = clusters.filter((c) => c.n / total >= 0.012).sort((p, q) => q.n - p.n);
  if (!clusters.length) throw new LogoError('empty');
  const pal = clusters.map((c) => c.c);

  // לכל פיקסל: הצבע הכי מתאים, וכמה ממנו מכסה את הפיקסל (קצה מוחלק הוא ערבוב של הצבע עם הרקע)
  const labels = new Uint8Array(N);
  const cover = new Uint8ClampedArray(N);
  const counts = new Array(pal.length).fill(0);
  const dv = bgv ? pal.map((P) => [P[0] - bgv[0], P[1] - bgv[1], P[2] - bgv[2]]) : null;
  for (let i = 0; i < N; i++) {
    const a = alpha[i];
    if (a < 8) { labels[i] = 255; continue; }
    const c = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
    let best = 0, bestErr = Infinity, bestCov = a / 255;
    for (let k = 0; k < pal.length; k++) {
      const e = d2(c, pal[k]);
      if (e < bestErr) { bestErr = e; best = k; bestCov = a / 255; }
      if (dv) {
        const v = dv[k], len = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
        if (len > 1) {
          const t = Math.min(1, Math.max(0, ((c[0] - bgv[0]) * v[0] + (c[1] - bgv[1]) * v[1] + (c[2] - bgv[2]) * v[2]) / len));
          const em = d2(c, [bgv[0] + t * v[0], bgv[1] + t * v[1], bgv[2] + t * v[2]]) + 1;
          if (em < bestErr) { bestErr = em; best = k; bestCov = Math.min(t, a / 255 + 0.5); }
        }
      }
    }
    labels[i] = best;
    cover[i] = Math.round(bestCov * 255);
    if (cover[i] >= 128) counts[best]++;
  }

  // תצוגה מקדימה נקייה: צבעי הפלטה עם הכיסוי
  const preview = canvasOf(w, h);
  const pctx = preview.getContext('2d');
  const pid = pctx.createImageData(w, h);
  for (let i = 0; i < N; i++) {
    if (labels[i] === 255) continue;
    const P = pal[labels[i]];
    pid.data[i * 4] = P[0]; pid.data[i * 4 + 1] = P[1]; pid.data[i * 4 + 2] = P[2]; pid.data[i * 4 + 3] = cover[i];
  }
  pctx.putImageData(pid, 0, 0);

  const used = counts.reduce((a, b) => a + b, 0) || 1;
  return {
    width: w, height: h, mode,
    background: bgv ? hex(bgv) : null,
    palette: pal.map((c, k) => ({ hex: hex(c), share: counts[k] / used })),
    labels, cover, preview,
  };
}

// ---------- המרה לווקטור (ב-worker) ----------

let worker = null;
let queue = Promise.resolve();

export function traceLogo(logo) {
  const s = Math.min(1, TRACE_MAX / Math.max(logo.width, logo.height));
  const w = Math.max(1, Math.round(logo.width * s)), h = Math.max(1, Math.round(logo.height * s));
  const pal = logo.palette.map((p) => [1, 3, 5].map((o) => parseInt(p.hex.slice(o, o + 2), 16)));

  // כל צבע מוקטן בנפרד, כדי שההקטנה לא תייצר צבעי ביניים; בכל פיקסל מנצח הצבע שמכסה אותו הכי הרבה
  const src = canvasOf(logo.width, logo.height), sctx = src.getContext('2d');
  const sid = sctx.createImageData(logo.width, logo.height);
  const lay = canvasOf(w, h), lctx = lay.getContext('2d', { willReadFrequently: true });
  lctx.imageSmoothingQuality = 'high';
  const out = new Uint8ClampedArray(w * h * 4);
  const best = new Uint8ClampedArray(w * h);
  pal.forEach((P, k) => {
    for (let i = 0; i < logo.labels.length; i++) {
      sid.data[i * 4] = sid.data[i * 4 + 1] = sid.data[i * 4 + 2] = 255;
      sid.data[i * 4 + 3] = logo.labels[i] === k ? logo.cover[i] : 0;
    }
    sctx.putImageData(sid, 0, 0);
    lctx.clearRect(0, 0, w, h);
    lctx.drawImage(src, 0, 0, w, h);
    const ld = lctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) {
      const a = ld[i * 4 + 3];
      if (a >= 128 && a > best[i]) {
        best[i] = a;
        out[i * 4] = P[0]; out[i * 4 + 1] = P[1]; out[i * 4 + 2] = P[2]; out[i * 4 + 3] = 255;
      }
    }
  });
  const tracePal = pal.map(([r, g, b]) => ({ r, g, b, a: 255 })).concat([{ r: 0, g: 0, b: 0, a: 0 }]);

  worker ||= new Worker(new URL('./trace-worker.js', import.meta.url));
  const job = queue.then(() => new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (!data.ok) return reject(new LogoError('trace'));
      data.td.layers.length = pal.length; // השכבה האחרונה היא השקיפות
      resolve({ ...data.td, unit: logo.width / w });
    };
    worker.onerror = () => reject(new LogoError('trace'));
    worker.postMessage({ imgd: { width: w, height: h, data: out }, pal: tracePal });
  }));
  queue = job.catch(() => {});
  return job;
}
