// הדמיה באיכות צילום. ההדמיה הרגילה (engine.js) מציירת בזמן אמת, וכשהגולש עוצר, השלט מרונדר מחדש במעקב קרניים
// בסביבת רחוב אמיתית ומשולב בצילום בשיטת ההפרש (Debevec): מרנדרים את הקיר בלי השלט (B) ועם השלט (A),
// ומעבירים לצילום רק את מה שהשלט שינה בו (צל, הילה, השתקפות). התמונה המחודדת עולה מעל ההדמיה הרגילה כשהיא מוכנה.
// מבט מהצד: אותו שלט על אותו קיר, כשהצילום מוקרן על מישור הקיר דרך המצלמה המקורית, כך שהקיר נשאר הקיר של הגולש.
// הכל רץ בכרטיס המסך של הגולש. מכשיר חלש מדי, או בלי WebGL2 עם צבע צף, נשאר עם ההדמיה הרגילה.
import * as THREE from '../vendor/three/three.module.min.js';
import { RGBELoader } from '../vendor/three/RGBELoader.js';
import { WebGLPathTracer } from '../vendor/pathtracer/three-gpu-pathtracer.module.js';
import { LIGHT_TONES } from './engine.js';

const ENV = new URL('./img/env-real.hdr', import.meta.url).href;
const COARSE = matchMedia('(pointer: coarse)').matches;
const PIX = COARSE ? 220000 : 380000;        // גודל הרינדור מקדימה, בפיקסלים
const PIX_SIDE = COARSE ? 300000 : 560000;   // ומהצד
const OUT_MAX = COARSE ? 900000 : 1600000;   // התמונה שעולה מעל ההדמיה, בפיקסלים של הצילום
const TEX = COARSE ? 1536 : 2048;            // מרקמים בתוך מעקב הקרניים
const BUDGET = 5000;                         // אלפיות שנייה לכל המעברים של תמונה אחת
const MIN_SPP = 48, MAX_SPP = 256, SIDE_SPP = 384;
const SIDE_EV = 0.85;                          // בהירות הקיר במבט מסובב, ביחס לצילום
// מפתח של זווית, בעשירית מעלה; 0.0,0.0 הוא המבט של הצילום
const keyOf = (a, e) => [a, e].map((x) => (Math.round(x * 10) / 10 || 0).toFixed(1)).join(',');
const FRONT = keyOf(0, 0);
const HALO = { front: 1, side: 1.7 };        // עוצמת הלדים מאחורי האותיות
const FRONT_K = 1.25;                        // עוצמת הפנים של אותיות מוארות מלפנים
// בלילה הקיר מקבל אור רחוב כחלחל, והאותיות כמעט כהות: האור שלהן הוא מה שמגדיר אותן
const TINT_N = [0.5, 0.6, 0.95], TINT_S = [0.62, 0.66, 0.78], N_WALL = 0.13, N_SIGN = 0.06;
const FROST = { frosted: 2.4, acid: 1.6 };   // כמה הזכוכית מטשטשת את הקיר שמאחוריה, בס"מ
const SETTLE = 400;                          // שקט אחרי השינוי האחרון לפני שמתחילים
const ABORT = Symbol('abort'), SLOW = Symbol('slow');

const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const LUT = Float32Array.from({ length: 256 }, (_, i) => toLin(i));
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// עד k הערך עובר כמו שהוא, ומעליו נדחס בעדינות אל הלבן במקום להישרף
const knee = (v, k) => (v < k ? Math.max(0, v) : k >= 1 ? 1 : k + (1 - k) * (1 - Math.exp(-(v - k) / (1 - k))));
// הלובן של הקיר עצמו, מנוחש מהבהירות שלו בצילום: קיר לבן שצולם בהיר באמת לבן, ולכן שלט אפור נשאר עליו אפור
// ולא מתבהר יחד איתו. בגבולות, כי צילום כהה מדי או שרוף לא מעיד על הצבע של הקיר
const albedoOf = (L) => clamp(L, 0.06, 0.72);
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function supported() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ok = !!gl && !!gl.getExtension('EXT_color_buffer_float');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch { return false; }
}

// ---------- מעקב הקרניים: מופע אחד לעמוד ----------

let R = null;
function tracer() {
  if (R) return R;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  // הכל מרונדר למטרות ליניאריות. בלי זה השיידר מוכן ברקע בגרסה אחת, והרינדור הראשון מכין גרסה שנייה ותוקע את הדף
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  const pt = new WebGLPathTracer(r);
  Object.assign(pt, {
    renderDelay: 0, minSamples: 1, fadeDuration: 0, rasterizeScene: false, renderToCanvas: false, dynamicLowRes: false,
    bounces: 6, transmissiveBounces: 6, filterGlossyFactor: 0.35, stableNoise: true,
  });
  pt.tiles.set(1, 1);
  pt.textureSize.set(TEX, TEX);
  R = { r, pt, cur: null, lost: false, px: new Float32Array(4) };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); R.lost = true; });
  return R;
}
// קריאה של פיקסל אחד מחכה שכרטיס המסך יסיים, וכך המדידה של הזמן אמיתית
const sync = () => R.r.readRenderTargetPixels(R.pt.target, 0, 0, 1, 1, R.px);

let envP = null;
const loadEnv = () => (envP ||= new RGBELoader().loadAsync(ENV).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }));

// הכנת השיידר של מעקב הקרניים לוקחת בווינדוס חצי דקה ויותר. לכן היא מתחילה ברקע מיד כשהעמוד עולה,
// על סצנה זעירה, ועד שהגולש מעלה צילום ומסמן קיר היא כבר מוכנה. השיידר אחד לכל סצנה, אז זה קורה פעם אחת
let warmP = null;
const warm = () => (warmP ||= (async () => {
  const env = await loadEnv();
  const { r, pt } = tracer();
  const scn = new THREE.Scene(), g = new THREE.PlaneGeometry(1, 1), m = new THREE.MeshStandardMaterial();
  scn.environment = env;
  scn.add(new THREE.Mesh(g, m));
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  cam.position.z = 2;
  cam.updateMatrixWorld();
  r.setSize(8, 8, false);
  pt.setScene(scn, cam);
  pt.reset();
  while (pt.samples < 1) {
    if (R.lost) throw new Error('context lost');
    pt.renderSample();
    await frame();
  }
  R.cur = null;
  g.dispose(); m.dispose();
})());

// ---------- השלט, כעותק עם חומרים משלו ----------

// גוף לכל קבוצת חומר, באותו מיקום ובאותה הטיה: מעקב הקרניים ממספר חומר אחד לכל גוף,
// ובלי הפיצול הצד של האות מקבל את החומר של הפנים
function splitGroups(mesh) {
  const mats = [].concat(mesh.material), g = mesh.geometry;
  const place = (m) => {
    m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
    m.userData = { ...mesh.userData };
    return m;
  };
  if (mats.length === 1 || !g.groups.length) return [place(new THREE.Mesh(g.clone(), mats[0].clone()))];
  const total = g.index ? g.index.count : g.attributes.position.count;
  return g.groups.map((gr) => {
    const n = Math.min(gr.count, total - gr.start), ng = new THREE.BufferGeometry();
    if (g.index) {
      for (const k in g.attributes) ng.setAttribute(k, g.attributes[k].clone());
      ng.setIndex(new THREE.BufferAttribute(g.index.array.slice(gr.start, gr.start + n), 1));
    } else {
      for (const k in g.attributes) {
        const a = g.attributes[k];
        ng.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + n) * a.itemSize), a.itemSize, a.normalized));
      }
    }
    return place(new THREE.Mesh(ng, mats[gr.materialIndex].clone()));
  });
}

function cloneSign({ body, st }) {
  const sign = body.clone(true), meshes = [], mats = [], lit = [];
  const front = st.product.light?.mode === 'front';
  sign.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    for (const p of splitGroups(o)) {
      o.parent.add(p);
      mats.push(p.material);
      const em = p.material.emissive;
      if (front && em && em.r + em.g + em.b > 0 && p.material.emissiveIntensity > 0) lit.push(p.material);
    }
    o.parent.remove(o);
  }
  // האור של אותיות מוארות מלפנים נכנס רק במעבר האור של הלילה
  for (const m of lit) m.emissiveIntensity = 0;
  return { sign, mats, lit };
}

// הלדים של שלט עם הילה: צורת האות, ממש מאחורי הגב שלה, ומאירים רק לכיוון הקיר
function haloEmitters({ st, body, letterMeshes }) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 1, emissiveIntensity: 0, transparent: true, opacity: 0,
    emissive: new THREE.Color(LIGHT_TONES[st.product.light.tone] || LIGHT_TONES.neutral),
  });
  const group = new THREE.Group(), b = st.bounds, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
  for (const m of letterMeshes) {
    const g = new THREE.ShapeGeometry(st.shapes[m.userData.layer], 8);
    g.translate(-cx, -cy, 0);
    g.applyMatrix4(new THREE.Matrix4().makeScale(m.scale.x, m.scale.y, 1));
    g.computeVertexNormals();
    const e = new THREE.Mesh(g, mat);
    e.position.z = body.position.z - 0.25;
    group.add(e);
  }
  return { group, mat };
}

// מה שלא שייך למעבר הופך לשקוף לגמרי: סצנה שמשנה מבנה בין מעברים מבלבלת את מספור החומרים
const show = (mats, on) => mats.forEach((x) => { x.transparent = !on; x.opacity = on ? 1 : 0; });

// ---------- מסכות ----------

const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
// opaque: כל מה שמסתיר את הקיר (אותיות, הדפסה, ברגים); panel: לוח הזכוכית בלבד
function maskScene(body, kind) {
  const s = new THREE.Scene(), c = body.clone(true);
  s.background = new THREE.Color(0, 0, 0);
  c.traverse((o) => { if (o.isMesh) o.visible = kind === 'panel' ? !!o.userData.panel : !o.userData.panel; });
  s.add(c);
  s.overrideMaterial = WHITE;
  return s;
}

// השורות מלמטה למעלה, כמו בכל מה שנקרא מכרטיס המסך
function readMask(scene, cam, w, h) {
  const r = R.r, rt = new THREE.WebGLRenderTarget(w, h, { samples: 8 });
  r.setRenderTarget(rt);
  r.render(scene, cam);
  r.setRenderTarget(null);
  const buf = new Uint8Array(w * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  rt.dispose();
  const m = new Float32Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = buf[i * 4] / 255;
  return m;
}

// ---------- עיבוד ----------

// טשטוש גאוסי עם משקל לכל פיקסל (קונבולוציה מנורמלת): מחליק את הרעש בצל ובהילה על הקיר
// בלי למרוח את השלט אל הקיר. src ו-out ב-4 ערוצים, wgt ערוץ אחד
function wblur(src, wgt, w, h, sigma) {
  const n = w * h, rad = Math.ceil(sigma * 3);
  const ker = Float32Array.from({ length: 2 * rad + 1 }, (_, i) => Math.exp(-((i - rad) ** 2) / (2 * sigma * sigma)));
  const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const q = wgt[i], j = i * 4;
    a[j] = src[j] * q; a[j + 1] = src[j + 1] * q; a[j + 2] = src[j + 2] * q; a[j + 3] = q;
  }
  const pass = (from, to, horiz) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lo = -Math.min(rad, horiz ? x : y), hi = Math.min(rad, horiz ? w - 1 - x : h - 1 - y);
      const step = horiz ? 4 : w * 4;
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0, j = (y * w + x) * 4 + lo * step;
      for (let k = lo; k <= hi; k++, j += step) {
        const kw = ker[k + rad];
        s0 += from[j] * kw; s1 += from[j + 1] * kw; s2 += from[j + 2] * kw; s3 += from[j + 3] * kw;
      }
      const o = (y * w + x) * 4;
      to[o] = s0; to[o + 1] = s1; to[o + 2] = s2; to[o + 3] = s3;
    }
  };
  pass(a, b, true);
  pass(b, a, false);
  for (let i = 0; i < n; i++) {
    const j = i * 4, s = a[j + 3];
    if (s > 1e-4) { a[j] /= s; a[j + 1] /= s; a[j + 2] /= s; } else { a[j] = src[j]; a[j + 1] = src[j + 1]; a[j + 2] = src[j + 2]; }
  }
  return a;
}

// היחס בין רינדור עם השלט לרינדור בלעדיו: זה מה שהשלט עשה לקיר
function ratio(num, den, n) {
  const r = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) r[i] = (i & 3) === 3 ? 1 : num[i] / (den[i] + 1e-6);
  return r;
}

// אינדקסים ומשקלים לדגימה בילינארית מהרינדור (מלמטה למעלה) אל התמונה הסופית (מלמעלה למטה)
function grid(rw, rh, ow, oh) {
  const xs = new Int32Array(ow * 2), wx = new Float32Array(ow), ys = new Int32Array(oh * 2), wy = new Float32Array(oh);
  for (let x = 0; x < ow; x++) {
    const f = clamp(((x + 0.5) * rw) / ow - 0.5, 0, rw - 1), a = Math.floor(f);
    xs[x * 2] = a; xs[x * 2 + 1] = Math.min(rw - 1, a + 1); wx[x] = f - a;
  }
  for (let y = 0; y < oh; y++) {
    const f = clamp(rh - 1 - (((y + 0.5) * rh) / oh - 0.5), 0, rh - 1), a = Math.floor(f);
    ys[y * 2] = a; ys[y * 2 + 1] = Math.min(rh - 1, a + 1); wy[y] = f - a;
  }
  return { xs, wx, ys, wy };
}

// ---------- ההדמיה ----------

export function createReal(sim, host, { badge, badgeText, onAvail } = {}) {
  if (!supported()) return null;
  const layer = canvasOf(2, 2);
  layer.className = 'sim-real';
  layer.setAttribute('aria-hidden', 'true');
  host.querySelector('.sim-canvas').after(layer);
  const lctx = layer.getContext('2d');

  let L = null, az = 0, el = 0, akey = FRONT, step = 0, alive = true, before = false, ready = false;
  let sig = '', tok = 0, job = null, timer = 0, lastChange = 0, lastAng = 0;
  let entries = { front: null, side: null };
  const dead = [];
  let shown = null, shownNight = -1, fade = 0, flashT = 0;

  // ---------- מתי מותר ----------

  const ids = new WeakMap();
  let idN = 0;
  const idOf = (o) => { if (!o) return 0; if (!ids.has(o)) ids.set(o, ++idN); return ids.get(o); };
  const round = (m) => Array.from(m.elements, (v) => Math.round(v * 1000) / 1000);
  function signature() {
    const { camera, anchor, st } = sim.parts;
    camera.updateMatrixWorld();
    return JSON.stringify([idOf(st.photo), idOf(st.shapes), st.enabled, st.colors, st.product, st.size,
      round(anchor.matrix), round(camera.projectionMatrix), round(camera.matrixWorld)]);
  }

  function eligible() {
    if (!alive || !ready || !L || step === 1) return 'no';
    const st = sim.parts.st;
    if (!st.photo || !st.product || !st.shapes || !st.frame) return 'no';
    if (st.grow < 1 || host.classList.contains('is-dragging') || sim.orbit?.busy) return 'wait';
    return 'ok';
  }

  const night = () => (sim.state.night ? 1 : 0);
  const want = () => (akey === FRONT ? entries.front : entries.side?.key === akey ? entries.side : null);

  function check(my) {
    if (R?.lost) throw new Error('context lost');
    if (!alive || my.tok !== tok || my.akey !== akey || step === 1) throw ABORT;
  }

  // ---------- תצוגה ----------

  function place(e) {
    if (!L) return;
    const box = e.kind === 'side' ? { left: L.left, top: L.top, width: L.width, height: L.height } : {
      left: L.left + (e.x0 / e.W) * L.width, top: L.top + (e.y0 / e.H) * L.height,
      width: (e.cw / e.W) * L.width, height: (e.ch / e.H) * L.height,
    };
    for (const k in box) layer.style[k] = box[k] + 'px';
  }

  function display(e, n) {
    const img = e.img[n];
    const same = shown === e && shownNight !== n && layer.classList.contains('is-on');
    if (shown !== e || layer.width !== img.width || layer.height !== img.height) { layer.width = img.width; layer.height = img.height; }
    cancelAnimationFrame(fade);
    if (same && !reduced()) {
      // מעבר יום ולילה: אותה תמונה מתחלפת בהדרגה, בקצב של ההדמיה הרגילה
      const from = e.img[shownNight], t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 700);
        lctx.globalAlpha = 1; lctx.drawImage(from, 0, 0);
        lctx.globalAlpha = k; lctx.drawImage(img, 0, 0);
        lctx.globalAlpha = 1;
        if (k < 1) fade = requestAnimationFrame(tick);
      };
      fade = requestAnimationFrame(tick);
    } else {
      lctx.clearRect(0, 0, layer.width, layer.height);
      lctx.drawImage(img, 0, 0);
    }
    shown = e; shownNight = n;
    place(e);
    layer.classList.add('is-on');
    host.classList.toggle('is-side', e.kind === 'side');
  }

  function hide() {
    cancelAnimationFrame(fade);
    layer.classList.remove('is-on');
    host.classList.remove('is-side');
    shown = null; shownNight = -1;
  }

  // ---------- התג "איכות צילום" ----------

  function badgeShow(text, p) {
    if (!badge) return;
    clearTimeout(flashT);
    badgeText.textContent = text;
    badge.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
    badge.classList.add('is-on');
  }
  function badgeDone() {
    if (!badge) return;
    badgeShow('איכות צילום', 1);
    flashT = setTimeout(() => badge.classList.remove('is-on'), 2200);
  }
  function badgeOff() { if (badge) { clearTimeout(flashT); badge.classList.remove('is-on'); } }

  // ---------- ניהול ----------

  function drop() {
    tok++;
    for (const k of ['front', 'side']) if (entries[k]) { dead.push(entries[k]); entries[k] = null; }
    hide();
    flush();
  }

  // סצנה ישנה נזרקת רק כשאין עבודה שרצה עליה
  function flush() {
    if (job) return;
    while (dead.length) disposeEntry(dead.pop());
  }

  function poke() {
    if (!alive) return;
    const s = signature();
    if (s !== sig) { sig = s; lastChange = performance.now(); drop(); badgeOff(); }
    refresh();
  }

  function refresh() {
    if (!alive) return;
    clearTimeout(timer); timer = 0;
    const ok = eligible();
    if (ok === 'no') { hide(); return; }
    const e = want(), n = night();
    if (e?.img[n]) display(e, n);
    else if (e?.kind === 'side' && e.img[1 - n]) display(e, 1 - n);
    else hide();
    if (e?.img[n] || e?.empty) return;
    if (ok === 'wait') { timer = setTimeout(refresh, 450); return; }
    if (job) return;
    const wait = SETTLE - (performance.now() - Math.max(lastChange, lastAng));
    if (wait > 0) { timer = setTimeout(refresh, wait + 10); return; }
    job = run().finally(() => { job = null; flush(); refresh(); });
  }

  async function run() {
    const my = { tok, akey }, A = az, E = el, front = akey === FRONT;
    try {
      const env = await loadEnv();
      check(my);
      tracer();
      // תמונה נשמרת רק אם שום דבר לא השתנה בזמן שנבנתה. מכל זווית מסובבת נשמרת רק האחרונה
      const slot = front ? 'front' : 'side';
      if (!front && entries.side && entries.side.key !== my.akey) { dead.push(entries.side); entries.side = null; }
      let e = entries[slot];
      if (!e) {
        e = await (front ? buildFront(env, my) : buildSide(env, my, A, E));
        check(my);
        entries[slot] = e;
      }
      if (e.empty) return;
      const n = night();
      if (n && !e.img[1]) {
        if ((e.halo || e.lit.length) && !e.E) await traceE(e, my);
        e.img[1] = e.kind === 'side' ? composeSide(e, 1) : composeFront(e, 1);
      }
      check(my);
      badgeDone();
    } catch (err) {
      // סצנה שנבנתה חלקית נזרקת אחרי שהעבודה מסתיימת
      if (my.e && my.e !== entries.front && my.e !== entries.side) dead.push(my.e);
      if (err === ABORT) { badgeOff(); return; }
      console.warn('[real]', err === SLOW ? 'slow device' : err);
      kill();
    }
  }

  // ---------- מעקב הקרניים ----------

  async function use(e, my) {
    const { r, pt } = R;
    r.setSize(e.rw, e.rh, false);
    if (R.cur !== e) {
      pt.setScene(e.scn, e.cam);
      R.cur = e;
      // המעבר הראשון אחרי בניית הסצנה יוצא עם רעש אחר, ולכן חימום שנזרק (וגם המתנה להידור של השיידר)
      const t0 = performance.now();
      pt.reset();
      while (pt.samples < 4) {
        pt.renderSample();
        await frame();
        check(my);
        if (performance.now() - t0 > 60000) throw SLOW;
      }
    }
  }

  async function measure(my) {
    const { pt } = R;
    pt.reset();
    sync();
    const t0 = performance.now();
    for (let i = 0; i < 4; i++) pt.renderSample();
    sync();
    const ms = (performance.now() - t0) / 4;
    await frame();
    check(my);
    return ms;
  }

  function pickN(ms, passes, max) {
    const n = Math.round(BUDGET / (ms * passes));
    if (n < 24) throw SLOW;
    return clamp(n, MIN_SPP, max);
  }

  async function trace(e, n, my, prog) {
    const { r, pt } = R;
    pt.reset();
    const t0 = performance.now();
    let k = 2;
    while (pt.samples < n) {
      const t = performance.now();
      for (let i = 0; i < k && pt.samples < n; i++) pt.renderSample();
      sync();
      // כל פעם קצת פחות מפריים, כדי שהעמוד ימשיך לזוז בזמן העבודה
      k = clamp(Math.round((k * 14) / Math.max(1, performance.now() - t)), 1, 32);
      prog?.(pt.samples / n);
      await frame();
      check(my);
      if (performance.now() - t0 > 60000) throw SLOW;
    }
    const buf = new Float32Array(e.rw * e.rh * 4);
    r.readRenderTargetPixels(pt.target, 0, 0, e.rw, e.rh, buf);
    return buf;
  }

  // אור הלילה בלבד: בלי השמיים, רק הלדים או הפנים המוארות, כשהשלט עצמו חוסם ומחזיר אור
  async function traceE(e, my) {
    const { pt } = R;
    await use(e, my);
    if (e.em) { e.em.mat.emissiveIntensity = (HALO[e.kind] * 3) / e.sL; show([e.em.mat], true); }
    for (const m of e.lit) m.emissiveIntensity = FRONT_K / e.sL;
    show(e.mats, true);
    e.scn.environmentIntensity = 0;
    pt.updateMaterials();
    pt.updateEnvironment();
    const label = 'מדליקים את התאורה';
    badgeShow(label, 0);
    e.E = await trace(e, e.em ? Math.min(2 * e.n, 512) : e.n, my, (p) => badgeShow(label, p));
    const n = e.rw * e.rh;
    if (e.kind === 'front') {
      e.RE = wblur(ratio(e.E, e.B, n), e.wWall, e.rw, e.rh, 2.5);
      e.signN = signNight(e);
    } else {
      // מהצד: האור על הקיר מוחלק כיחס למעבר היום, כך שהגרעיניות יורדת והמרקם של הצילום נשאר
      const w = Float32Array.from(e.m, (x) => 1 - x);
      const bl = wblur(ratio(e.E, e.D, n), w, e.rw, e.rh, 2.5);
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { const j = i * 4 + c; e.E[j] += (bl[j] * e.D[j] - e.E[j]) * w[i]; }
    }
  }

  // ---------- מקדימה ----------

  async function buildFront(env, my) {
    const parts = sim.parts, { camera, anchor, body, st } = parts, P = st.product;
    const { width: w, height: h } = sim.state;
    const glass = P.type === 'glass';
    // המלבן בצילום שמכיל את השלט ואת מה שהוא משנה סביבו
    const pad = clamp(0.22 * Math.max(w, h), 18, 60);
    const zMax = (P.standoff || 0) + (glass ? P.glass.thickness + 1.2 : P.depth || 1);
    camera.updateMatrixWorld();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const v = new THREE.Vector3();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const z of [0, zMax]) {
      v.set(sx * (w / 2 + pad), sy * (h / 2 + pad), z).applyMatrix4(anchor.matrix).project(camera);
      const px = ((v.x + 1) / 2) * st.W, py = ((1 - v.y) / 2) * st.H;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(st.W, Math.ceil(x1)); y1 = Math.min(st.H, Math.ceil(y1));
    const cw = x1 - x0, ch = y1 - y0;
    if (!(cw >= 8 && ch >= 8)) return { kind: 'front', empty: true };
    const sc = Math.min(1, Math.sqrt(PIX / (cw * ch))), rw = Math.max(8, Math.round(cw * sc)), rh = Math.max(8, Math.round(ch * sc));
    const os = Math.min(1, Math.sqrt(OUT_MAX / (cw * ch))), ow = Math.max(8, Math.round(cw * os)), oh = Math.max(8, Math.round(ch * os));

    // המצלמה במערכת הצירים של הקיר: הקיר הוא z=0 והשלט יוצא לכיוון +z
    const cam = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 1, 100000);
    anchor.matrix.clone().invert().multiply(camera.matrixWorld).decompose(cam.position, cam.quaternion, cam.scale);
    cam.scale.set(1, 1, 1);
    cam.setViewOffset(st.W, st.H, x0, y0, cw, ch);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // הצילום באותו חיתוך: בגודל הרינדור (לחשיפה ולצבע הקיר) ובגודל הסופי
    const crop = (cw2, ch2) => {
      const c = canvasOf(cw2, ch2), x = c.getContext('2d', { willReadFrequently: true });
      x.imageSmoothingQuality = 'high';
      x.drawImage(st.photo, x0, y0, cw, ch, 0, 0, cw2, ch2);
      return x.getImageData(0, 0, cw2, ch2).data;
    };
    const pr = crop(rw, rh);
    let Lc = 0;
    for (let i = 0; i < pr.length; i += 4) Lc += lum(LUT[pr[i]], LUT[pr[i + 1]], LUT[pr[i + 2]]);
    const alb = albedoOf(Lc / (pr.length / 4));

    const scn = new THREE.Scene();
    scn.environment = env; scn.background = null; scn.environmentIntensity = 1;
    // הקיר מקבל את אותו גימור כמו צבע השלט, כדי שהיחס ביניהם ייקבע רק מהצבעים. קיר מט לגמרי יוצא ברינדור כהה בהרבה
    // מהצילום, והחשיפה שמפצה עליו שורפת את השלט (אפור יצא לבן על קיר לבן)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: new THREE.Color(alb, alb, alb), roughness: 0.5, metalness: 0.05 }));
    const { sign, mats, lit } = cloneSign(parts);
    const em = P.light?.mode === 'halo' ? haloEmitters(parts) : null;
    scn.add(wall, sign);
    if (em) scn.add(em.group);
    const e = {
      kind: 'front', scn, cam, rw, rh, ow, oh, x0, y0, cw, ch, W: st.W, H: st.H,
      mats, lit, em, halo: !!em, glass, img: [null, null],
    };
    my.e = e;

    const label = 'מחדדים לאיכות צילום';
    badgeShow(label, 0);
    show(mats, false);
    await use(e, my);
    e.n = pickN(await measure(my), 2, MAX_SPP);
    e.B = await trace(e, e.n, my, (p) => badgeShow(label, p * 0.5));
    show(mats, true);
    R.pt.updateMaterials();
    const A = await trace(e, e.n, my, (p) => badgeShow(label, 0.5 + p * 0.5));
    check(my);

    // מסכות בגודל הרינדור ובגודל התמונה הסופית
    const ms = [maskScene(body, 'opaque'), glass && maskScene(body, 'panel')];
    const n = rw * rh;
    const mo = readMask(ms[0], cam, rw, rh), mp = glass ? readMask(ms[1], cam, rw, rh) : null;
    e.mo = readMask(ms[0], cam, ow, oh);
    e.mp = glass ? readMask(ms[1], cam, ow, oh) : null;

    e.p = crop(ow, oh);
    if (glass && FROST[P.glass.kind]) {
      // מה שמאחורי זכוכית חלבית נראה מטושטש
      const f = Math.max(1, (2 * FROST[P.glass.kind] * ow) / (w + 2 * pad));
      const sw = Math.max(1, Math.round(ow / f)), sh = Math.max(1, Math.round(oh / f));
      const small = canvasOf(sw, sh), sx = small.getContext('2d');
      sx.imageSmoothingQuality = 'high';
      sx.drawImage(st.photo, x0, y0, cw, ch, 0, 0, sw, sh);
      const big = canvasOf(ow, oh), bx = big.getContext('2d', { willReadFrequently: true });
      bx.imageSmoothingQuality = 'high';
      bx.drawImage(small, 0, 0, ow, oh);
      e.pb = bx.getImageData(0, 0, ow, oh).data;
    }

    // חשיפה: כמה להכפיל את הרינדור כדי שהקיר ייראה כמו בצילום, ובאיזה גוון לצבוע את השלט
    const sp = [0, 0, 0], sb = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { sp[c] += LUT[pr[i * 4 + c]]; sb[c] += e.B[i * 4 + c]; }
    e.sL = lum(...sp) / Math.max(1e-6, lum(...sb));
    const mx = Math.max(...sp, 1e-6), t = sp.map((x) => 0.5 + (0.5 * x) / mx), tl = lum(...t);
    e.s = t.map((x) => (e.sL * x) / tl);
    await frame();
    check(my);

    // היחס לקיר, מוחלק רק בין פיקסלים של קיר; מאחורי הזכוכית מוחלק בנפרד ופחות, כי רואים דרכה
    e.wWall = new Float32Array(n);
    for (let i = 0; i < n; i++) e.wWall[i] = (1 - mo[i]) * (1 - (mp ? mp[i] : 0));
    const raw = ratio(A, e.B, n);
    e.RA = wblur(raw, e.wWall, rw, rh, 2.5);
    if (glass) {
      const wp = new Float32Array(n);
      for (let i = 0; i < n; i++) wp[i] = (1 - mo[i]) * mp[i];
      const RP = wblur(raw, wp, rw, rh, P.glass.kind === 'clear' ? 1.2 : 2.5);
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { const j = i * 4 + c; e.RA[j] += (RP[j] - e.RA[j]) * mp[i]; }
    }
    e.A = A;
    e.signD = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) e.signD[i] = (i & 3) === 3 ? 1 : e.s[i & 3] * A[i];
    if (!e.halo && !e.lit.length) e.signN = signNight(e);
    await frame();
    check(my);
    e.img[0] = composeFront(e, 0);
    return e;
  }

  // האותיות בלילה: כמעט כהות וכחלחלות, ועליהן האור שלהן
  function signNight(e) {
    const n = e.rw * e.rh, A = e.A, E = e.E, out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const j = i * 4, al = lum(A[j], A[j + 1], A[j + 2]);
      for (let c = 0; c < 3; c++) out[j + c] = e.s[c] * (al + (A[j + c] - al) * 0.4) * TINT_S[c] * N_SIGN + (E ? e.sL * E[j + c] : 0);
      out[j + 3] = 1;
    }
    return out;
  }

  function composeFront(e, nt) {
    const { rw, rh, ow, oh, mo, mp, p, pb } = e;
    const { xs, wx, ys, wy } = grid(rw, rh, ow, oh);
    const RA = e.RA, RE = nt ? e.RE : null, SG = nt ? e.signN : e.signD;
    const out = new ImageData(ow, oh), o = out.data;
    // שוליים רכים בצדדים שלא נוגעים בקצה הצילום, כדי שהתמונה תיבלע בהדמיה שמתחתיה
    const fw = Math.max(6, 0.06 * Math.min(ow, oh));
    const edge = [e.x0 > 0, e.y0 > 0, e.x0 + e.cw < e.W, e.y0 + e.ch < e.H];
    const s = (buf, a, b, c, d, fx, fy, k) =>
      (buf[a + k] * (1 - fx) + buf[b + k] * fx) * (1 - fy) + (buf[c + k] * (1 - fx) + buf[d + k] * fx) * fy;
    for (let y = 0; y < oh; y++) {
      const r0 = ys[y * 2] * rw, r1 = ys[y * 2 + 1] * rw, fy = wy[y];
      const mrow = (oh - 1 - y) * ow;
      const ay = Math.min(edge[1] ? (y + 0.5) / fw : 1, edge[3] ? (oh - y - 0.5) / fw : 1);
      for (let x = 0; x < ow; x++) {
        const c0 = xs[x * 2], c1 = xs[x * 2 + 1], fx = wx[x];
        const a = (r0 + c0) * 4, b = (r0 + c1) * 4, c = (r1 + c0) * 4, d = (r1 + c1) * 4;
        const pi = (y * ow + x) * 4, mi = mrow + x;
        const m = mo[mi], q = mp ? mp[mi] : 0;
        const ph = [0, 0, 0];
        for (let k = 0; k < 3; k++) ph[k] = pb && q > 0 ? LUT[p[pi + k]] + (LUT[pb[pi + k]] - LUT[p[pi + k]]) * q : LUT[p[pi + k]];
        const pl = lum(...ph);
        for (let k = 0; k < 3; k++) {
          const ra = s(RA, a, b, c, d, fx, fy, k), sg = s(SG, a, b, c, d, fx, fy, k);
          let wall;
          if (!nt) wall = ph[k] * ra;
          else {
            const pn = (pl + (ph[k] - pl) * 0.55) * TINT_N[k] * N_WALL;
            wall = pn * ra + (RE ? ph[k] * s(RE, a, b, c, d, fx, fy, k) : 0);
          }
          const v = m * knee(sg, 0.8) + (1 - m) * knee(wall, Math.max(0.8, nt ? 0 : ph[k]));
          o[pi + k] = 255 * toSrgb(clamp(v, 0, 1));
        }
        const ax = Math.min(edge[0] ? (x + 0.5) / fw : 1, edge[2] ? (ow - x - 0.5) / fw : 1);
        o[pi + 3] = 255 * clamp(Math.min(ax, ay), 0, 1);
      }
    }
    const cv = canvasOf(ow, oh);
    cv.getContext('2d').putImageData(out, 0, 0);
    return cv;
  }

  // ---------- מהצד ----------

  async function buildSide(env, my, A, E) {
    const parts = sim.parts, { camera, anchor, body, st } = parts, P = st.product;
    const { width: sw, height: sh } = sim.state;
    camera.updateMatrixWorld();

    // בדיוק המצלמה של התצוגה החיה באותה זווית, בקואורדינטות של השלט
    const oc = sim.orbitCamera(A, E);
    const cam = new THREE.PerspectiveCamera(oc.fov, oc.aspect, 1, 100000);
    anchor.matrix.clone().invert().multiply(oc.matrixWorld).decompose(cam.position, cam.quaternion, new THREE.Vector3());
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // הבהירות הממוצעת של הצילום, כדי שהקיר המוקרן יקבל את הלובן שלו (albedoOf) ולא יותר
    const small = canvasOf(64, 64), sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(st.photo, 0, 0, 64, 64);
    const sd = sctx.getImageData(0, 0, 64, 64).data;
    let Lp = 0;
    for (let i = 0; i < sd.length; i += 4) Lp += lum(LUT[sd[i]], LUT[sd[i + 1]], LUT[sd[i + 2]]);
    Lp = Math.max(0.02, Lp / (sd.length / 4));

    // הקיר: מישור צפוף שכל קודקוד שלו מקבל את המקום שלו בצילום; מחוץ לצילום הקיר ממשיך בשיקוף.
    // הוא מכסה את כל מה שהמצלמה רואה, והקודקודים צפופים ליד השלט ומתרווחים לכיוון השוליים
    const cap = 300 * Math.max(sw, sh), o = cam.position, r = new THREE.Vector3();
    let bx0 = -sw, bx1 = sw, by0 = -sh, by1 = sh;
    for (const [nx, ny] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      r.set(nx, ny, 0.5).unproject(cam).sub(o).normalize();
      const t = r.z < -1e-6 && o.z > 0 ? -o.z / r.z : Infinity;
      const hx = Number.isFinite(t) ? o.x + r.x * t : Math.sign(r.x) * cap, hy = Number.isFinite(t) ? o.y + r.y * t : Math.sign(r.y) * cap;
      bx0 = Math.min(bx0, hx * 1.05); bx1 = Math.max(bx1, hx * 1.05); by0 = Math.min(by0, hy * 1.05); by1 = Math.max(by1, hy * 1.05);
    }
    bx0 = Math.max(bx0, -cap); bx1 = Math.min(bx1, cap); by0 = Math.max(by0, -cap); by1 = Math.min(by1, cap);
    const g = new THREE.PlaneGeometry(2, 2, 192, 192);
    const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3();
    const spread = (t, lo, hi) => (t < 0 ? lo : hi) * Math.abs(t) ** 1.7;
    for (let i = 0; i < pos.count; i++) pos.setXY(i, spread(pos.getX(i), bx0, bx1), spread(pos.getY(i), by0, by1));
    g.computeBoundingSphere();
    const mir = (t) => { t = ((t % 2) + 2) % 2; return t > 1 ? 2 - t : t; };
    let u0 = 1, v0 = 1, u1 = 0, v1 = 0;
    const vz = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), 0).applyMatrix4(anchor.matrix);
      // קיר שמאחורי המצלמה שצילמה מקבל את אמצע הצילום, כמו בתצוגה החיה
      const behind = vz.copy(v).applyMatrix4(camera.matrixWorldInverse).z > -1e-4;
      v.project(camera);
      const uu = behind ? 0.5 : mir((v.x + 1) / 2), vv = behind ? 0.5 : mir((v.y + 1) / 2);
      uv.setXY(i, Number.isFinite(uu) ? uu : 0.5, Number.isFinite(vv) ? vv : 0.5);
      u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i));
    }
    // רק החלק של הצילום שבאמת נראה, כדי שיישאר חד בתוך מעקב הקרניים
    const px0 = Math.floor(u0 * st.W), px1 = Math.ceil(u1 * st.W), py0 = Math.floor((1 - v1) * st.H), py1 = Math.ceil((1 - v0) * st.H);
    const tw = Math.max(1, px1 - px0), th = Math.max(1, py1 - py0), tk = Math.min(1, TEX / Math.max(tw, th));
    const tc = canvasOf(Math.max(1, Math.round(tw * tk)), Math.max(1, Math.round(th * tk)));
    const tx = tc.getContext('2d');
    tx.imageSmoothingQuality = 'high';
    tx.drawImage(st.photo, px0, py0, tw, th, 0, 0, tc.width, tc.height);
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (uv.getX(i) * st.W - px0) / tw, 1 - ((1 - uv.getY(i)) * st.H - py0) / th);
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color().setScalar(Math.min(3, albedoOf(Lp) / Lp)), roughness: 0.5, metalness: 0.05 })); // אותו גימור כמו בחזית

    const k = Math.sqrt(PIX_SIDE / (st.W * st.H)), rw = Math.max(8, Math.round(st.W * k)), rh = Math.max(8, Math.round(st.H * k));
    const scn = new THREE.Scene();
    scn.environment = env; scn.background = null; scn.environmentIntensity = 1;
    const { sign, mats, lit } = cloneSign(parts);
    const em = P.light?.mode === 'halo' ? haloEmitters(parts) : null;
    scn.add(wall, sign);
    if (em) scn.add(em.group);
    const e = { kind: 'side', key: my.akey, scn, cam, rw, rh, mats, lit, em, halo: !!em, tex, img: [null, null] };
    my.e = e;

    const label = 'מחדדים את הזווית לאיכות צילום';
    badgeShow(label, 0);
    await use(e, my);
    e.n = pickN(await measure(my), 1, SIDE_SPP);
    e.D = await trace(e, e.n, my, (p) => badgeShow(label, p));
    check(my);
    e.m = readMask(maskScene(body, 'opaque'), cam, rw, rh);

    // חשיפה: שולי התמונה הם קיר, והם צריכים להיראות כמו הקיר בצילום
    let sum = 0, cnt = 0;
    for (let y = 0; y < rh; y++) {
      if (y > rh * 0.08 && y < rh * 0.92) continue;
      for (let x = 0; x < rw; x++) { const i = (y * rw + x) * 4; sum += lum(e.D[i], e.D[i + 1], e.D[i + 2]); cnt++; }
    }
    e.sL = (SIDE_EV * Lp) / Math.max(1e-6, sum / Math.max(1, cnt));
    await frame();
    check(my);
    e.img[0] = composeSide(e, 0);
    return e;
  }

  function composeSide(e, nt) {
    const { rw, rh, D, E, m, sL } = e;
    const out = new ImageData(rw, rh), o = out.data;
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const pi = (y * rw + x) * 4, ti = ((rh - 1 - y) * rw + x) * 4, mm = m[ti >> 2];
      const dl = lum(D[ti], D[ti + 1], D[ti + 2]);
      for (let c = 0; c < 3; c++) {
        let val = sL * D[ti + c];
        if (nt) {
          const base = (dl + (D[ti + c] - dl) * 0.5) * sL;
          val = base * (mm * TINT_S[c] * N_SIGN + (1 - mm) * TINT_N[c] * N_WALL) + (E ? sL * E[ti + c] : 0);
        }
        o[pi + c] = 255 * toSrgb(knee(val, 0.8));
      }
      o[pi + 3] = 255;
    }
    const cv = canvasOf(rw, rh);
    cv.getContext('2d').putImageData(out, 0, 0);
    return cv;
  }

  // ---------- ניקוי ----------

  function disposeEntry(e) {
    if (!e || e.empty) return;
    if (R?.cur === e) R.cur = null;
    e.scn?.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      [].concat(o.material).forEach((x) => x.dispose());
    });
    e.tex?.dispose();
  }

  function kill() {
    if (!alive) return;
    alive = false;
    tok++;
    clearTimeout(timer);
    hide();
    badgeOff();
    for (const k of ['front', 'side']) if (entries[k]) dead.push(entries[k]);
    entries = { front: null, side: null };
    if (!job) flush();
    layer.remove();
    host.classList.remove('is-side');
    onAvail?.(false);
  }

  // עד שהשיידר מוכן לא מראים כלום, וגם לא את בחירת הזווית: הגולש עובד עם ההדמיה הרגילה
  warm().then(() => {
    if (!alive) return;
    ready = true;
    onAvail?.(true);
    refresh();
  }, (err) => { console.warn('[real]', err); kill(); });

  return {
    poke,
    layout(l) { L = l; if (shown) place(shown); refresh(); },
    // הזווית של התצוגה החיה; כשחוזרים למבט של הצילום, המבט המסובב האחרון נזרק
    setAngle(a = 0, e = 0) {
      const k = keyOf(a, e);
      if (k !== akey) { az = a; el = e; akey = k; lastAng = performance.now(); }
      if (k === FRONT && entries.side) { dead.push(entries.side); entries.side = null; flush(); }
      refresh();
    },
    setStep(n) { step = n; refresh(); },
    setBefore(on) { before = on; layer.classList.toggle('is-before', before); },
    // ההדמיה הרגילה בגודל הצילום, ומעליה התמונה המחודדת מקדימה (אם היא מוכנה ותואמת)
    async snapshot({ maxSide = 2400 } = {}) {
      const e = entries.front, n = night();
      if (!alive || !e || e.empty || !e.img[n] || signature() !== sig) return null;
      const blob = await sim.exportImage({ maxSide, night: !!n, type: 'image/png' });
      if (!blob) return null;
      const bmp = await createImageBitmap(blob), k = bmp.width / e.W;
      const c = canvasOf(bmp.width, bmp.height), x = c.getContext('2d');
      x.drawImage(bmp, 0, 0);
      x.imageSmoothingQuality = 'high';
      x.drawImage(e.img[n], e.x0 * k, e.y0 * k, e.cw * k, e.ch * k);
      bmp.close?.();
      return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
    },
    dispose: kill,
  };
}
