// המסלול של הגולש בעמוד ההדמיה: קיר ← מידות ← לוגו ← שלט ← שליחה. המנוע ב-engine.js, הלוגו ב-logo.js, המוצרים ב-products.js.

import { createSimulator } from './engine.js';
import { fileToCanvas, textToCanvas, withSlogan, extractLogo, traceLogo } from './logo.js';
import { PRODUCTS, ORDER, TIPS, defaults, visibleOptions, usesLogoColors, toSpec, describe } from './products.js';

// הכתובת שמקבלת את הבקשה עם הקבצים. ריקה עד חיבור מסד הנתונים (10.11.2026), ועד אז הטופס אומר בגלוי שלא נשלח
const ENDPOINT = '';
const WA = '972502222155';
const PHONE = '050-2222155', PHONE_INTL = '+972502222155';
const DEFAULT_WALL_CM = 240;
const STEPS = ['הקיר', 'המידות', 'הלוגו', 'השלט', 'שליחה'];
const CORNERS = ['הפינה השמאלית העליונה', 'הפינה הימנית העליונה', 'הפינה הימנית התחתונה', 'הפינה השמאלית התחתונה'];

const $ = (id) => document.getElementById(id);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SVG = 'http://www.w3.org/2000/svg';
const rgbOf = (h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));

const host = $('sim-host'), grid = document.querySelector('.sim-grid');
const S = {
  step: 0,
  // pts: ארבע הפינות בפיקסלים של המנוע; src: הצילום בגודל המקורי, בשביל הזכוכית המגדלת; scale: פיקסל מנוע לפיקסל מקורי
  wall: { kind: 'sample', id: 'reception', file: null, src: null, scale: 1, pts: null, good: null, widthCm: DEFAULT_WALL_CM, estimate: false },
  logo: { kind: 'demo', file: null, text: '', font: 'modern', data: null, enabled: [], colors: [] },
  slogan: '',
  lastFile: null,
  product: 'pvc', choices: defaults('pvc'),
  lay: null,
  size: { width: 0, height: 0 },
};

// ---------- מצבי טעינה ושגיאה ----------

function busy(text) {
  $('sim-busy-t').textContent = text;
  $('sim-busy').hidden = false;
  host.setAttribute('aria-busy', 'true');
}
function idle() {
  $('sim-busy').hidden = true;
  host.removeAttribute('aria-busy');
}

// הודעה עם קישור לוואטסאפ במקום המילה {wa}
function waLink(text, label = 'בוואטסאפ') {
  const a = document.createElement('a');
  a.href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  a.target = '_blank'; a.rel = 'noopener';
  a.textContent = label;
  return a;
}
function say(el, msg, waText) {
  el.textContent = '';
  const [a, b] = msg.split('{wa}');
  el.append(a);
  if (b !== undefined) el.append(waLink(waText || 'היי שלום, ניסיתי את ההדמיה באתר ואשמח לשלוח לכם את הלוגו.'), b);
  el.hidden = false;
}
const hush = (id) => { $(id).hidden = true; $(id).textContent = ''; };

// ---------- תמונות ----------

function loadImage(src) {
  return new Promise((ok, no) => { const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = src; });
}
const srcWidth = (src) => src.naturalWidth || src.width;

// אורך המוקד בשווה ערך 35 מ"מ מה-EXIF של הצילום, כדי שהזווית של השלט תתאים למצלמה
async function focal35(file) {
  try {
    const b = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (b.getUint16(0) !== 0xFFD8) return null;
    let o = 2;
    while (o + 10 < b.byteLength) {
      const marker = b.getUint16(o), len = b.getUint16(o + 2);
      if ((marker & 0xFF00) !== 0xFF00) return null;
      if (marker === 0xFFE1 && b.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = b.getUint16(t) === 0x4949;
        const u16 = (p) => b.getUint16(p, le), u32 = (p) => b.getUint32(p, le);
        const find = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e; } return -1; };
        const ptr = find(t + u32(t + 4), 0x8769);
        if (ptr < 0) return null;
        const e = find(t + u32(ptr + 8), 0xA405);
        const v = e < 0 ? 0 : u16(e + 8);
        return v >= 10 && v <= 300 ? v : null;
      }
      o += 2 + len;
    }
  } catch { /* קובץ בלי EXIF תקין: נשארים עם ברירת המחדל של המנוע */ }
  return null;
}

// ---------- הקיר ----------

function setWallPhoto(src, f35) {
  sim.setPhoto(src, { f35 });
  const [W, H] = sim.photoSize();
  host.style.setProperty('--ar', (W / H).toFixed(4));
  S.wall.src = src;
  S.wall.scale = W / srcWidth(src);
  return [W, H];
}

function pushWallNow() {
  try {
    sim.setWall(S.wall.pts, S.wall.widthCm, S.wall.spot);
    S.wall.good = S.wall.pts.map((p) => p.slice());
  } catch {
    if (S.wall.good) { S.wall.pts = S.wall.good.map((p) => p.slice()); drawMark(); }
  }
  updateSizeRange();
}
let wallRaf = 0;
function pushWall() {
  if (wallRaf) return;
  wallRaf = requestAnimationFrame(() => { wallRaf = 0; pushWallNow(); });
}

// קירות לדוגמה מצולמים: הקיר שמאחורי הדלפק (שמאל, למעלה, ימין, למטה בחלקים מהצילום), הרוחב שלו והמקום של השלט.
// משטח בלי חדר סביבו מסומן עם שוליים של עשירית
const ROOMS = {
  reception: { box: [0.168, 0.135, 0.652, 0.61], cm: 250, spot: { v: 0.44, h: 0.44, w: 0.5 } },
  lobby: { box: [0.249, 0.223, 0.875, 0.762], cm: 330, spot: { v: 0.478, h: 0.3, w: 0.45 } },
};

async function useSample(id) {
  busy('מכינים את הקיר');
  try {
    const img = await loadImage(`img/wall-${id}.jpg`);
    const [W, H] = setWallPhoto(img);
    const room = ROOMS[id] || { box: [0.1, 0.1, 0.9, 0.9], cm: DEFAULT_WALL_CM, spot: null };
    const [l, t, r, b] = room.box;
    Object.assign(S.wall, { kind: 'sample', id, file: null, widthCm: room.cm, estimate: false, spot: room.spot,
      pts: [[l * W, t * H], [r * W, t * H], [r * W, b * H], [l * W, b * H]] });
    pushWallNow();
    $('sim-wall-w').value = room.cm;
    hush('sim-photo-err');
    wallHelp();
    drawMark();
  } finally { idle(); }
}

async function usePhoto(file) {
  hush('sim-photo-err');
  if (!file) return;
  busy('מכינים את הצילום');
  try {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { src = await loadImage(URL.createObjectURL(file)); }
    const [W, H] = setWallPhoto(src, await focal35(file));
    Object.assign(S.wall, { kind: 'photo', id: null, file, widthCm: DEFAULT_WALL_CM, estimate: true, spot: null,
      pts: [[0.2 * W, 0.25 * H], [0.8 * W, 0.25 * H], [0.8 * W, 0.75 * H], [0.2 * W, 0.75 * H]] });
    pushWallNow();
    document.querySelectorAll('input[name="wall"]').forEach((r) => { r.checked = false; });
    $('sim-wall-w').value = '';
    wallHelp();
    idle();
    go(1);
  } catch {
    idle();
    say($('sim-photo-err'), 'לא הצלחנו לפתוח את הצילום. נסו קובץ JPG או PNG.');
  }
}

function wallHelp() {
  const el = $('sim-wall-help');
  el.textContent = S.wall.kind === 'sample' ? 'בקיר לדוגמה המידה כבר מסומנת. אפשר לשנות אותה.'
    : S.wall.estimate ? 'עד שתקלידו מידה, נניח רוחב של 2.4 מטר.' : 'השלט מקבל גודל לפי המידה הזו.';
}

// ---------- סימון הקיר: ארבע פינות על הצילום, זכוכית מגדלת בזמן גרירה ----------

const mark = $('sim-mark'), markQ = mark.querySelector('.sim-mark-q'), markW = mark.querySelector('.sim-mark-w');
const markDim = document.createElementNS(SVG, 'path');
markDim.setAttribute('class', 'sim-mark-dim');
mark.prepend(markDim);
const handles = CORNERS.map((name, i) => {
  const g = document.createElementNS(SVG, 'g');
  g.setAttribute('class', 'sim-mh');
  g.setAttribute('tabindex', '0');
  g.setAttribute('role', 'button');
  g.setAttribute('aria-label', `${name} של מה שסימנתם. גררו, או הזיזו בחיצים`);
  g.innerHTML = '<circle class="hit" r="22"/><circle class="ring" r="13"/><circle class="dot" r="4"/>';
  mark.append(g);
  return g;
});
const loupe = $('sim-loupe'), lctx = loupe.getContext('2d');
const LOUPE = 132, ZOOM = 3;

function convex(q) {
  for (let k = 0; k < 4; k++) {
    const a = q[k], b = q[(k + 1) % 4], c = q[(k + 2) % 4];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) return false;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 24) return false;
  }
  return true;
}

function drawMark() {
  if (mark.hasAttribute('hidden') || !S.lay || !S.wall.pts) return;
  const s = S.lay.scale, p = S.wall.pts.map(([x, y]) => [x * s, y * s]);
  markQ.setAttribute('points', p.map((q) => q.join(',')).join(' '));
  markDim.setAttribute('d', `M0 0H${S.lay.width}V${S.lay.height}H0Z M${p.map((q) => q.join(' ')).join(' L')}Z`);
  handles.forEach((g, i) => g.setAttribute('transform', `translate(${p[i][0]} ${p[i][1]})`));
  const [a, b] = p, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const below = my < 34;
  markW.textContent = `${Math.round(S.wall.widthCm)} ס״מ${S.wall.estimate ? ' (הערכה)' : ''}`;
  markW.setAttribute('x', mx);
  markW.setAttribute('y', below ? my + 30 : my - 16);
  markW.setAttribute('transform', `rotate(${deg.toFixed(2)} ${mx} ${my})`);
}

function movePt(i, x, y) {
  const [W, H] = sim.photoSize();
  const q = S.wall.pts.map((p) => p.slice());
  q[i] = [clamp(x, 0, W), clamp(y, 0, H)];
  if (!convex(q)) return;
  S.wall.pts = q;
  drawMark();
  pushWall();
  if (!loupe.hidden) drawLoupe(i);
}

function drawLoupe(i) {
  const src = S.wall.src, l = S.lay;
  if (!src || !l) return;
  const [px, py] = S.wall.pts[i];
  const hx = l.left + px * l.scale, hy = l.top + py * l.scale;
  const hr = host.getBoundingClientRect();
  let top = hy - LOUPE - 34;
  if (top < 6) top = hy + 34;
  loupe.style.left = clamp(hx - LOUPE / 2, 6, hr.width - LOUPE - 6) + 'px';
  loupe.style.top = clamp(top, 6, hr.height - LOUPE - 6) + 'px';
  const c = loupe.width, sw = LOUPE / (ZOOM * l.scale * S.wall.scale);
  const ox = px / S.wall.scale, oy = py / S.wall.scale;
  lctx.fillStyle = '#04121F';
  lctx.fillRect(0, 0, c, c);
  lctx.imageSmoothingQuality = 'high';
  lctx.drawImage(src, ox - sw / 2, oy - sw / 2, sw, sw, 0, 0, c, c);
  lctx.strokeStyle = 'rgba(4,18,31,.7)'; lctx.lineWidth = 6;
  cross(c); lctx.strokeStyle = '#E8DFCB'; lctx.lineWidth = 2; cross(c);
}
function cross(c) {
  const m = c / 2, r = 14;
  lctx.beginPath();
  lctx.moveTo(m, m - 46); lctx.lineTo(m, m - r); lctx.moveTo(m, m + r); lctx.lineTo(m, m + 46);
  lctx.moveTo(m - 46, m); lctx.lineTo(m - r, m); lctx.moveTo(m + r, m); lctx.lineTo(m + 46, m);
  lctx.stroke();
  lctx.beginPath(); lctx.arc(m, m, 3, 0, Math.PI * 2); lctx.stroke();
}

handles.forEach((g, i) => {
  let drag = null;
  g.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    g.setPointerCapture(e.pointerId);
    g.focus({ preventScroll: true });
    const r = mark.getBoundingClientRect(), s = S.lay.scale, [px, py] = S.wall.pts[i];
    drag = { id: e.pointerId, dx: e.clientX - r.left - px * s, dy: e.clientY - r.top - py * s };
    mark.classList.add('is-dragging');
    loupe.hidden = false;
    drawLoupe(i);
  });
  g.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const r = mark.getBoundingClientRect(), s = S.lay.scale;
    movePt(i, (e.clientX - r.left - drag.dx) / s, (e.clientY - r.top - drag.dy) / s);
  });
  const end = () => { drag = null; mark.classList.remove('is-dragging'); loupe.hidden = true; };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  g.addEventListener('lostpointercapture', end);
  g.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const k = (e.shiftKey ? 10 : 2) / S.lay.scale, [px, py] = S.wall.pts[i];
    movePt(i, px + d[0] * k, py + d[1] * k);
  });
});

function setMarkMode(on) {
  mark.toggleAttribute('hidden', !on);
  host.classList.toggle('is-marking', on);
  if (on) drawMark(); else loupe.hidden = true;
}

$('sim-wall-w').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  if (v >= 20 && v <= 5000) { S.wall.widthCm = v; S.wall.estimate = false; }
  else if (!e.target.value) { S.wall.widthCm = DEFAULT_WALL_CM; S.wall.estimate = S.wall.kind === 'photo'; }
  else return;
  wallHelp();
  drawMark();
  pushWall();
});

// ---------- הלוגו ----------

const LOGO_MSG = {
  'too-big': 'הקובץ גדול מדי (מעל 30 מגה). נסו קובץ קטן יותר, או שלחו אותו {wa}.',
  eps: 'קובצי AI ו-EPS לא נפתחים בדפדפן. שמרו את הלוגו כ-PDF או SVG ונסו שוב, או שלחו אותו {wa} כמו שהוא.',
  unreadable: 'לא הצלחנו לקרוא את הקובץ. נסו PDF, SVG, PNG או JPG.',
  empty: 'לא מצאנו לוגו בקובץ. נסו קובץ שבו הלוגו על רקע אחיד, או שלחו אותו {wa}.',
  trace: 'לא הצלחנו להכין את הלוגו. נסו קובץ אחר, למשל PNG על רקע לבן.',
};

let logoJob = 0;
// keep: אותו לוגו שנבנה מחדש, ולכן הגוונים שהגולש החליף והצבעים שכיבה נשמרים.
// hold: רק הסלוגן השתנה, ולכן הלוגו נשאר באותו גודל על הקיר והסלוגן נוסף מתחתיו
async function applyLogo(makeCanvas, meta, { intro = true, keep = false, hold = false } = {}) {
  const job = ++logoJob;
  hush('sim-logo-err');
  busy('מכינים את הלוגו');
  try {
    const font = meta.kind === 'text' ? FONTS[meta.font] : null;
    const { canvas, share } = await withSlogan(await makeCanvas(), S.slogan, font ? { family: font[0], weight: font[1] } : {});
    const data = extractLogo(canvas);
    const td = await traceLogo(data);
    if (job !== logoJob) return;
    const size = hold && S.logo.data && S.size.width ? Math.min((S.size.width * (S.logo.share ?? 1)) / share, S.wall.widthCm * 0.9) : 0;
    sim.setLogo(td, data, { size });
    const enabled = data.palette.map(() => true), colors = data.palette.map((p) => p.hex);
    if (keep && S.logo.data) {
      const prev = S.logo.data.palette.map((p, i) => ({ rgb: rgbOf(p.hex), orig: p.hex.toLowerCase(), color: S.logo.colors[i], on: S.logo.enabled[i] }));
      data.palette.forEach((p, i) => {
        const rgb = rgbOf(p.hex);
        const near = prev.reduce((a, q) => { const dd = q.rgb.reduce((t, v, j) => t + (v - rgb[j]) ** 2, 0); return dd < a.dd ? { q, dd } : a; }, { q: null, dd: 48 ** 2 }).q;
        if (!near) return;
        enabled[i] = near.on;
        if (near.color.toLowerCase() !== near.orig) colors[i] = near.color;
      });
      if (!enabled.some(Boolean)) enabled.fill(true);
      sim.setLayers({ enabled, colors });
    }
    Object.assign(S.logo, meta, { data, enabled, colors, share });
    renderPalette();
    $('sim-demo-note').hidden = S.logo.kind !== 'demo';
    $('sim-fonts').hidden = S.logo.kind !== 'text';
    if (S.logo.kind !== 'demo') $('sim-demo-block').hidden = true;
    if (intro) sim.playIntro();
    updateSizeRange();
  } catch (e) {
    if (job !== logoJob) return;
    const msg = meta.kind === 'text' && e?.code === 'empty' ? 'הקלידו את השם שיופיע בשלט.' : LOGO_MSG[e?.code] || LOGO_MSG.unreadable;
    say($('sim-logo-err'), msg);
  } finally {
    if (job === logoJob) idle();
  }
}

const useFile = (file, opts) => {
  $('sim-text').value = '';
  return applyLogo(() => fileToCanvas(file), { kind: 'file', file, text: '' }, opts).then(() => { if (S.logo.file === file) S.lastFile = file; });
};

async function useDemo(opts) {
  const r = await fetch('images/brand/logo.png');
  const file = new File([await r.blob()], 'logo.png', { type: 'image/png' });
  return applyLogo(() => fileToCanvas(file), { kind: 'demo', file: null, text: '' }, opts);
}

const FONTS = JSON.parse($('sim-fonts').dataset.fonts);
function useText(opts) {
  const text = $('sim-text').value.trim();
  if (!text) {
    if (S.logo.kind !== 'text') return;
    return S.lastFile ? useFile(S.lastFile) : useDemo({ intro: false });
  }
  const font = document.querySelector('input[name="font"]:checked')?.value || 'modern';
  const [family, weight] = FONTS[font];
  const color = S.wall.kind === 'sample' && S.wall.id === 'dark' ? '#F4F1EA' : '#1D1D1F';
  return applyLogo(() => textToCanvas(text, { family, weight, color }), { kind: 'text', file: null, text, font }, { intro: false, keep: S.logo.kind === 'text' && S.logo.font === font, ...opts });
}
let textTimer = 0;
$('sim-text').addEventListener('input', () => { clearTimeout(textTimer); textTimer = setTimeout(useText, 450); });
$('sim-fonts').addEventListener('change', () => useText());

// הסלוגן נבנה לתוך הלוגו עצמו, ולכן כל שינוי בו בונה מחדש את הלוגו הנוכחי
function rebuildLogo() {
  const opts = { intro: false, keep: true, hold: true };
  if (S.logo.kind === 'text') return useText(opts);
  if (S.logo.kind === 'file' && S.logo.file) return useFile(S.logo.file, opts);
  return useDemo(opts);
}
let sloganTimer = 0;
$('sim-slogan').addEventListener('input', () => {
  clearTimeout(sloganTimer);
  sloganTimer = setTimeout(() => {
    const v = $('sim-slogan').value.trim().replace(/\s+/g, ' ');
    if (v === S.slogan) return;
    S.slogan = v;
    rebuildLogo();
  }, 450);
});

// כל צבע בלוגו: אפשר להחליף גוון או להוציא מהשלט (למשל רקע שלא הוסר)
function renderPalette() {
  const pal = S.logo.data?.palette || [];
  const ul = $('sim-pal');
  ul.textContent = '';
  pal.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'sim-pc';
    li.innerHTML = `<label class="sim-sw" style="--sw:${S.logo.colors[i]}"><input type="color" value="${S.logo.colors[i].toLowerCase()}"><span class="sr-only">הגוון של צבע ${i + 1}</span></label>
      <span class="sim-hex" dir="ltr">${S.logo.colors[i].toUpperCase()}</span>
      <label class="switch"><input type="checkbox" role="switch"${S.logo.enabled[i] ? ' checked' : ''}>בשלט</label>`;
    li.classList.toggle('is-off', !S.logo.enabled[i]);
    const [color, on] = li.querySelectorAll('input');
    let raf = 0;
    color.addEventListener('input', () => {
      S.logo.colors[i] = color.value;
      li.querySelector('.sim-sw').style.setProperty('--sw', color.value);
      li.querySelector('.sim-hex').textContent = color.value.toUpperCase();
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; sim.setLayers({ colors: S.logo.colors }); });
    });
    on.addEventListener('change', () => {
      if (!on.checked && S.logo.enabled.filter(Boolean).length === 1) {
        on.checked = true;
        $('sim-pal-fine').textContent = 'צריך להשאיר בשלט לפחות צבע אחד.';
        return;
      }
      S.logo.enabled[i] = on.checked;
      li.classList.toggle('is-off', !on.checked);
      sim.setLayers({ enabled: S.logo.enabled });
      paletteState();
      updateSizeRange();
    });
    ul.append(li);
  });
  $('sim-pal-grp').hidden = !pal.length;
  paletteState();
}

function paletteState() {
  const live = usesLogoColors(S.product, S.choices);
  $('sim-pal').querySelectorAll('input[type="color"]').forEach((c) => { c.disabled = !live; });
  $('sim-pal').classList.toggle('is-material', !live);
  $('sim-pal-fine').textContent = live ? 'כבו צבע שהוא בעצם רקע, או לחצו על צבע כדי להחליף גוון.'
    : 'בגימור הזה הצבע נקבע לפי החומר. אפשר עדיין לכבות צבע שהוא בעצם רקע.';
}

// ---------- הסברים ----------
// כפתור ה-i ליד כותרת של בחירה פותח הסבר קצר מתחת לכותרת. אחד פתוח בכל רגע, ופתוח נשאר פתוח כשהאפשרויות נבנות מחדש

const tipHTML = (t) => (Array.isArray(t) ? t : [t]).map((l) => `<p>${l}</p>`).join('');
const TIP_ICON = document.querySelector('.tip-b svg').outerHTML;
let openTip = '';

function fillTips() {
  $('tip-size').innerHTML = `<div class="tip-in">${tipHTML(TIPS.size)}</div>`;
  $('tip-palette').innerHTML = `<div class="tip-in">${tipHTML(TIPS.palette)}</div>`;
  $('tip-compare').innerHTML = `<div class="tip-in"><dl>${ORDER.map((id) => `<dt>${PRODUCTS[id].name}</dt><dd>${PRODUCTS[id].tip}</dd>`).join('')}</dl><p>${TIPS.compare}</p></div>`;
}

function setTip(btn, open) {
  const panel = $(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.setAttribute('aria-expanded', String(open));
  panel.getAnimations().forEach((a) => a.cancel());
  if (open) {
    openTip = panel.id;
    panel.hidden = false;
    if (!reduced()) panel.animate([{ height: '0px', opacity: 0 }, { height: `${panel.scrollHeight}px`, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    return;
  }
  if (openTip === panel.id) openTip = '';
  if (reduced()) { panel.hidden = true; return; }
  panel.animate([{ height: `${panel.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => { panel.hidden = true; };
}

$('sim-panel').addEventListener('click', (e) => {
  const btn = e.target.closest('.tip-b, .tip-link');
  if (!btn) return;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  if (open) $('sim-panel').querySelectorAll('.tip-b[aria-expanded="true"], .tip-link[aria-expanded="true"]').forEach((b) => { if (b !== btn) setTip(b, false); });
  setTip(btn, open);
});
$('sim-panel').addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !openTip) return;
  const btn = $('sim-panel').querySelector(`[aria-controls="${openTip}"]`);
  const grp = btn?.closest('.grp, fieldset');
  if (!btn || !grp?.contains(document.activeElement)) return;
  setTip(btn, false);
  btn.focus();
});

// ---------- השלט ----------

function renderProducts() {
  const box = $('sim-prods');
  box.innerHTML = ORDER.map((id) => `<label class="sim-prod"><input type="radio" name="prod" value="${id}"${id === S.product ? ' checked' : ''}>
    <span><img src="sim/img/prod-${id}.webp" width="120" height="120" alt="" loading="lazy" decoding="async"><b>${PRODUCTS[id].name}</b></span></label>`).join('');
  box.addEventListener('change', (e) => {
    if (e.target.name !== 'prod') return;
    S.product = e.target.value;
    S.choices = defaults(S.product);
    applyProduct({ intro: true });
  });
}

function renderOptions() {
  const box = $('sim-opts');
  box.textContent = '';
  for (const o of visibleOptions(S.product, S.choices)) {
    const fs = document.createElement('fieldset');
    fs.className = 'grp';
    const name = `opt-${o.key}`;
    const tipId = `tip-${S.product}-${o.key}`, open = openTip === tipId;
    // עם הסבר: שם הקבוצה בא מהכותרת בלבד, כדי שקורא המסך לא יקריא גם את כפתור ההסבר בכל בחירה
    if (o.tip) fs.setAttribute('aria-labelledby', `lg-${o.key}`);
    const legend = o.tip ? `<span class="tip-l"><span id="lg-${o.key}">${o.label}</span><button type="button" class="tip-b" aria-expanded="${open}" aria-controls="${tipId}">${TIP_ICON}<span class="sr-only">הסבר על ${o.label}</span></button></span>` : o.label;
    const panel = o.tip ? `<div class="tip" id="${tipId}"${open ? '' : ' hidden'}><div class="tip-in">${tipHTML(o.tip)}</div></div>` : '';
    fs.innerHTML = `<legend>${legend}</legend>${panel}<div class="chips">${o.choices.map((c) =>
      `<label class="chip"><input type="radio" name="${name}" value="${c.v}"${c.v === S.choices[o.key] ? ' checked' : ''}><span>${c.label}</span></label>`).join('')}</div>`;
    const hint = o.choices.find((c) => c.v === S.choices[o.key])?.hint;
    if (hint) { const p = document.createElement('p'); p.className = 'sim-fine'; p.textContent = hint; fs.append(p); }
    fs.addEventListener('change', (e) => {
      S.choices[o.key] = o.choices.find((c) => String(c.v) === e.target.value).v;
      applyProduct({ focus: `${name}` });
    });
    box.append(fs);
  }
}

function applyProduct({ intro = false, focus } = {}) {
  $('sim-prod-lead').textContent = PRODUCTS[S.product].lead;
  renderOptions();
  if (focus) document.querySelector(`input[name="${focus}"]:checked`)?.focus({ preventScroll: true });
  sim.setProduct(toSpec(S.product, S.choices));
  if (intro) sim.playIntro();
  paletteState();
  litNote();
}

function litNote() {
  $('sim-lit-note').hidden = !(S.product === 'lit' && !$('sim-night').checked);
}
$('sim-lit-on').addEventListener('click', () => {
  $('sim-night').checked = true;
  setNight(true);
  $('sim-night').focus();
});

const range = $('sim-size'), rangeOut = $('sim-size-out');
function updateSizeRange() {
  const wall = sim.state.wall;
  range.max = clamp(Math.round(((wall?.width || DEFAULT_WALL_CM) * 1.2) / 5) * 5, 60, 1200);
  range.value = S.size.width;
}
range.addEventListener('input', () => sim.setSize(+range.value));

function onChange({ width, height }) {
  S.size = { width, height };
  $('sim-rw').textContent = width;
  $('sim-rh').textContent = height;
  $('sim-read').hidden = false;
  $('sim-est').hidden = !S.wall.estimate;
  if (document.activeElement !== range) range.value = width;
  rangeOut.value = `${width} ס״מ`;
  $('sim-size-fine').textContent = `הגובה נקבע לפי הלוגו: ${height} ס״מ. אפשר גם לגרור את השלט על הקיר ולמשוך את הפינות שלו.`;
  real?.poke();
}

// הזווית של התצוגה: הכפתור המתאים מסומן רק כשהמבט עומד בדיוק עליו, ובכל זווית אחרת אף אחד
const angRadios = [...document.querySelectorAll('input[name="sim-ang"]')];
function onOrbit({ az, el, view }) {
  angRadios.forEach((r) => { r.checked = view !== null && +r.value === view; });
  real?.setAngle(az, el);
}

function onLayout(l) {
  S.lay = l;
  Object.assign(mark.style, { left: l.left + 'px', top: l.top + 'px', width: l.width + 'px', height: l.height + 'px' });
  mark.setAttribute('viewBox', `0 0 ${l.width} ${l.height}`);
  drawMark();
  real?.layout(l);
}

// ---------- כלים מתחת להדמיה ----------

function setNight(on) {
  sim.setNight(on);
  host.classList.toggle('is-night', on);
  litNote();
  real?.poke();
}
$('sim-night').addEventListener('change', (e) => setNight(e.target.checked));

const before = $('sim-before');
const show = (v) => { sim.setSignVisible(v); before.classList.toggle('is-on', !v); real?.setBefore(!v); };
before.addEventListener('pointerdown', (e) => { e.preventDefault(); before.setPointerCapture(e.pointerId); show(false); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) before.addEventListener(ev, () => show(true));
before.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); show(false); } });
before.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') show(true); });
before.addEventListener('blur', () => show(true));
before.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- מעבר בין שלבים ----------

const back = $('sim-back'), next = $('sim-next');

function go(n) {
  n = clamp(n, 0, STEPS.length - 1);
  S.step = n;
  grid.dataset.step = n;
  document.querySelectorAll('.sim-step').forEach((sec) => { sec.hidden = +sec.dataset.step !== n; });
  document.querySelectorAll('.sim-st').forEach((b, i) => {
    if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('is-done', i < n);
  });
  back.hidden = n === 0;
  next.hidden = n === STEPS.length - 1;
  if (n < STEPS.length - 1) next.textContent = `הבא: ${STEPS[n + 1]}`;
  setMarkMode(n === 1);
  sim.showFrame(n === 3);
  // סימון הקיר נעשה מקדימה, ובו אי אפשר לסובב
  sim?.setOrbitEnabled(n !== 1);
  real?.setStep(n);
  if (n === 4) summary();
  const h = $(`sim-h${n}`);
  h.focus({ preventScroll: true });
  const top = h.getBoundingClientRect().top;
  let margin = parseFloat(getComputedStyle(h).scrollMarginTop) || 0;
  // בטלפון ובטאבלט ההדמיה דביקה למעלה: הכותרת והשלבים יורדים מתחת לה (76 = גובה ההדר, 72 = פס השלבים)
  if (matchMedia('(max-width: 1023px)').matches) margin = (n === 4 ? 0 : host.closest('.sim-view').offsetHeight) + 76 + 72;
  // גלילה אנכית בלבד: scrollIntoView מזיז גם לצדדים, ובטלפון זה הסיט את כל העמוד
  if (top < margin - 4 || top > innerHeight - 120) scrollTo({ top: scrollY + top - margin, behavior: reduced() ? 'auto' : 'smooth' });
}

$('sim').addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) go(+b.dataset.go);
});
back.addEventListener('click', () => go(S.step - 1));
next.addEventListener('click', () => go(S.step + 1));

// ---------- סיכום ושליחה ----------

function wallName() {
  if (S.wall.kind === 'photo') return 'הצילום שלכם';
  const label = document.querySelector(`input[name="wall"][value="${S.wall.id}"]`)?.closest('label')?.textContent.trim();
  return `קיר לדוגמה${label ? ` (${label})` : ''}`;
}

function summaryRows() {
  const [name, ...opts] = describe(S.product, S.choices);
  const { width, height } = S.size;
  const rows = [['השלט', name], ...opts.map((l) => { const i = l.indexOf(': '); return [l.slice(0, i), l.slice(i + 2)]; })];
  rows.push(['גודל', `${width} על ${height} ס״מ${S.wall.estimate ? ' (הערכה)' : ''}`]);
  rows.push(['הקיר', wallName()]);
  rows.push(['הלוגו', S.logo.kind === 'file' ? S.logo.file.name : S.logo.kind === 'text' ? S.logo.text : 'עוד לא הועלה (מוצג הלוגו של פלומבה)']);
  if (S.slogan) rows.push(['סלוגן', S.slogan]);
  return rows;
}

let thumbUrl = '';
async function summary() {
  const dl = $('sim-dl');
  dl.textContent = '';
  for (const [k, v] of summaryRows()) {
    const dt = document.createElement('dt'), dd = document.createElement('dd'), bdi = document.createElement('bdi');
    dt.textContent = k; bdi.textContent = v; dd.append(bdi);
    dl.append(dt, dd);
  }
  $('sim-demo-block').hidden = S.logo.kind !== 'demo';
  const blob = (await real?.snapshot({ maxSide: 960 })) || await sim.exportImage({ maxSide: 960 });
  if (!blob) return;
  if (thumbUrl) URL.revokeObjectURL(thumbUrl);
  thumbUrl = URL.createObjectURL(blob);
  const img = $('sim-thumb');
  img.src = thumbUrl;
  img.alt = `ההדמיה שלכם: ${describe(S.product, S.choices)[0]} על ${wallName()}`;
  img.hidden = false;
}

const form = $('sim-form'), status = $('sim-status'), submit = $('sim-submit');
const CHECKS = {
  name: (v) => v.trim().length >= 2,
  phone: (v) => { const d = v.replace(/\D/g, ''); return d.length >= 9 && d.length <= 13; },
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
};
function check(name) {
  const input = $(`sim-f-${name}`), ok = CHECKS[name](input.value);
  input.setAttribute('aria-invalid', String(!ok));
  $(`sim-e-${name}`).hidden = ok;
  return ok;
}
for (const name of Object.keys(CHECKS)) {
  $(`sim-f-${name}`).addEventListener('input', () => { if ($(`sim-f-${name}`).getAttribute('aria-invalid') === 'true') check(name); });
}

function waText() {
  const [name, ...opts] = describe(S.product, S.choices);
  const slogan = S.slogan ? `, עם הסלוגן "${S.slogan}"` : '';
  return `היי שלום, עשיתי הדמיה באתר: ${[name, ...opts].join(', ')}, רוחב ${S.size.width} ס״מ${slogan}. אשלח לוגו וצילום של הקיר.`;
}

function report(lead) {
  status.textContent = '';
  const tel = document.createElement('a');
  tel.href = `tel:${PHONE_INTL}`; tel.textContent = PHONE; tel.dir = 'ltr';
  status.append(lead, ' בינתיים התקשרו ל-', tel, ' או ', waLink(waText(), 'כתבו לנו בוואטסאפ'), '.');
  status.hidden = false;
  status.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const bad = Object.keys(CHECKS).filter((n) => !check(n));
  if (bad.length) { $(`sim-f-${bad[0]}`).focus(); return; }
  if (!ENDPOINT) { report('בגרסת התצוגה הזו הטופס עוד לא שולח, ולכן הפרטים וההדמיה לא נשלחו.'); return; }
  submit.disabled = true;
  const label = submit.textContent;
  submit.textContent = 'שולחים';
  try {
    const fd = new FormData(form);
    fd.append('product', S.product);
    fd.append('choices', JSON.stringify(S.choices));
    fd.append('summary', summaryRows().map(([k, v]) => `${k}: ${v}`).join('\n'));
    fd.append('size', JSON.stringify({ ...S.size, estimate: S.wall.estimate, wallWidth: S.wall.widthCm }));
    fd.append('mockup', (await real?.snapshot({ maxSide: 2400 })) || await sim.exportImage({ maxSide: 2400 }), 'mockup.jpg');
    if (S.wall.kind === 'photo') fd.append('photo', S.wall.file, S.wall.file.name); else fd.append('wall_sample', S.wall.id);
    if (S.logo.kind === 'file') fd.append('logo', S.logo.file, S.logo.file.name);
    if (S.logo.kind === 'text') { fd.append('logo_text', S.logo.text); fd.append('logo_font', S.logo.font); }
    if (S.slogan) fd.append('logo_slogan', S.slogan);
    const r = await fetch(ENDPOINT, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(String(r.status));
    location.href = 'thanks.html';
  } catch {
    report('משהו השתבש בשליחה, והפרטים לא נשלחו.');
  } finally {
    submit.disabled = false;
    submit.textContent = label;
  }
});

// ---------- העלאת קבצים: בחירה או גרירה ----------

$('sim-photo').addEventListener('change', (e) => { usePhoto(e.target.files[0]); e.target.value = ''; });
$('sim-logo').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) useFile(f); e.target.value = ''; });
document.querySelectorAll('input[name="wall"]').forEach((r) => r.addEventListener('change', () => useSample(r.value)));

document.querySelectorAll('.sim-drop').forEach((zone) => {
  const over = (on) => (e) => { e.preventDefault(); zone.classList.toggle('is-over', on); };
  zone.addEventListener('dragenter', over(true));
  zone.addEventListener('dragover', over(true));
  zone.addEventListener('dragleave', over(false));
  zone.addEventListener('drop', (e) => {
    over(false)(e);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (zone.dataset.drop === 'photo') usePhoto(f); else useFile(f);
  });
});
// קובץ שנופל ליד אזור ההעלאה לא פותח את הדפדפן על הקובץ ומוחק את ההדמיה
$('sim').addEventListener('dragover', (e) => e.preventDefault());
$('sim').addEventListener('drop', (e) => e.preventDefault());

// ---------- הפעלה ----------

let sim, real = null;
function fail() {
  host.querySelectorAll('.sim-canvas, .sim-overlay').forEach((el) => el.remove());
  $('sim-ang').hidden = true;
  idle();
  $('sim-fail').hidden = false;
  grid.classList.add('is-failed');
  $('sim-panel').hidden = true;
  document.querySelector('.sim-tools').hidden = true;
}

async function boot() {
  try {
    sim = createSimulator(host, { onChange, onLayout, onOrbit });
  } catch {
    fail();
    return;
  }
  grid.dataset.step = 0;
  fillTips();
  renderProducts();
  applyProduct();
  try {
    await useSample('reception');
    await useDemo({ intro: false });
  } catch { /* בלי הלוגו לדוגמה הכלי עדיין עובד: הגולש מעלה לוגו משלו */ }
  idle();
  grid.classList.add('is-ready');
  $('sim-ang').hidden = false;
  sim.showFrame(false);
  sim.playIntro();
  // איכות צילום בכל זווית: נטען אחרי שההדמיה הרגילה כבר עובדת. במכשיר שלא מסוגל, הסיבוב עובד בלעדיה
  import('./real.js').then(({ createReal }) => {
    real = createReal(sim, host, { badge: $('sim-q'), badgeText: $('sim-q-t') });
    if (!real) return;
    real.layout(S.lay);
    real.setStep(S.step);
    real.setAngle(sim.orbit.az, sim.orbit.el);
    real.poke();
  }).catch(() => {});
}
angRadios.forEach((r) => r.addEventListener('change', () => { if (r.checked) sim?.orbitTo(+r.value, { animate: true }); }));


boot();

