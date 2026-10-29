// מנוע ההדמיה: הצילום של הגולש כרקע, הקיר כמישור בפרספקטיבה, והשלט כגוף תלת ממדי עליו.
// יחידות העולם: סנטימטרים. המצלמה בראשית ומסתכלת ל-z שלילי, כמו המצלמה שצילמה.
import * as THREE from '../vendor/three/three.module.min.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { RGBELoader } from '../vendor/three/RGBELoader.js';
import { planePose, focalPx } from './plane.js';

const TONES = { warm: '#ffbe82', neutral: '#fff0dc', cool: '#e6efff' };
export const LIGHT_TONES = TONES;

// כיוון האור הראשי ביחס לשלט: מלמעלה, קצת משמאל ומלפנים (תאורת תקרה)
const KEY = new THREE.Vector3(-0.15, 0.5, 0.85).normalize();

// מבט מסתובב: גוררים את הקיר והמצלמה מסתובבת סביב השלט. הזוויות במעלות ביחס לקיר (0 מול הקיר).
// ככל שמסתובבים המצלמה מתקרבת ועוברת לעדשה צרה יותר, עד שהשלט ממלא את המסך כמו בצילום מוצר
const ORBIT = { yaw: 62, pitch: [-20, 40], presetEl: 6, fov: 32, zoom: 1.35, full: 24, snap: 2.5 };
const DEG = Math.PI / 180;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv = (v) => new THREE.Vector3(v[0], -v[1], -v[2]); // OpenCV ← three

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// טשטוש גאוסי מקורב: שלושה מעברים של ממוצע נע, אופקי ואנכי
function blur(src, w, h, r) {
  r = Math.max(0, Math.round(r));
  if (!r) return src.slice();
  let a = src.slice(), b = new Float32Array(src.length);
  const pass = (from, to, horiz) => {
    const len = horiz ? w : h, lines = horiz ? h : w, step = horiz ? 1 : w, inv = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * w : l;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += from[base + Math.min(len - 1, Math.max(0, k)) * step];
      for (let i = 0; i < len; i++) {
        to[base + i * step] = acc * inv;
        acc += from[base + Math.min(len - 1, i + r + 1) * step] - from[base + Math.max(0, i - r) * step];
      }
    }
  };
  for (let it = 0; it < 3; it++) { pass(a, b, true); pass(b, a, false); }
  return a;
}

function maskTexture(data, w, h) {
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(255, Math.round(data[(h - 1 - y) * w + x] * 255))); // שורה 0 של הטקסטורה היא התחתונה
    const i = (y * w + x) * 4;
    px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
  }
  const t = new THREE.DataTexture(px, w, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function rgbTexture(ch, w, h) {
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (h - 1 - y) * w + x, i = (y * w + x) * 4;
    for (let j = 0; j < 3; j++) px[i + j] = Math.max(0, Math.min(255, Math.round(ch[j][s] * 255)));
    px[i + 3] = 255;
  }
  const t = new THREE.DataTexture(px, w, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// מרקם של אלומיניום מוברש: פסים אופקיים דקים
function brushedTexture() {
  const s = 512, c = canvasOf(s, s), ctx = c.getContext('2d'), id = ctx.createImageData(s, s);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < s; y++) {
    const row = 150 + rnd() * 60;
    let v = row;
    for (let x = 0; x < s; x++) {
      v += (row + (rnd() - 0.5) * 70 - v) * 0.08;
      const i = (y * s + x) * 4;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 260, 1 / 260);
  return t;
}

function toPath(path, segs) {
  path.moveTo(segs[0][1], segs[0][2]);
  for (const g of segs) g[0] ? path.quadraticCurveTo(g[3], g[4], g[5], g[6]) : path.lineTo(g[3], g[4]);
}

// צורות לכל שכבת צבע, ביחידות של הלוגו המקורי (פיקסלים)
function layerShapes(td) {
  return td.layers.map((layer) => {
    const shapes = [];
    for (const p of layer) {
      if (p.hole || p.segs.length < 3) continue;
      const s = new THREE.Shape();
      toPath(s, p.segs.map((g) => g.map((v, i) => (i ? v * td.unit : v))));
      for (const hi of p.holes) {
        const hp = layer[hi];
        if (!hp || hp.segs.length < 3) continue;
        const h = new THREE.Path();
        toPath(h, hp.segs.map((g) => g.map((v, i) => (i ? v * td.unit : v))));
        s.holes.push(h);
      }
      shapes.push(s);
    }
    return shapes;
  });
}

function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function createSimulator(host, { onChange, onLayout, onOrbit } = {}) {
  host.classList.add('sim-stage');
  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'הדמיית השלט על הקיר. גוררים את השלט כדי להזיז אותו, ואת הקיר כדי לסובב את המבט. חיצים מזיזים את השלט, פלוס ומינוס משנים את הגודל. במבט מסובב החיצים מסובבים, ו-Escape מחזיר למבט מקדימה');
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('class', 'sim-overlay');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<polygon class="sim-frame"/>' + [0, 1, 2, 3].map((i) => `<circle class="sim-handle" data-i="${i}" r="9"/>`).join('');
  host.append(canvas, overlay);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = pmrem.fromScene(new RoomEnvironment(), 0.03), alive = true;
  scene.environment = envRT.texture;
  // סביבת אור שנאפתה בבלנדר: שמיים, אופק ורצועות אור בצדדים, כמו רחוב. עד שהיא נטענת נשאר החדר
  new RGBELoader().load(new URL('./img/env-street.hdr', import.meta.url).href, (t) => {
    if (alive) {
      envRT.dispose();
      envRT = pmrem.fromEquirectangular(t);
      scene.environment = envRT.texture;
      requestRender();
    }
    t.dispose();
  });
  const camera = new THREE.PerspectiveCamera(50, 1, 5, 100000);

  // הצילום: מלבן על כל המסך, נצבע ראשון, בלי מיפוי טונים כדי שהצבעים יישארו כמו בצילום
  const photoMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, night: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform float night; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 n = mix(vec3(l), c, 0.55) * vec3(0.5, 0.6, 0.95) * 0.13;
        gl_FragColor = vec4(mix(c, n, night), 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), photoMat);
  photoMesh.frustumCulled = false;
  photoMesh.renderOrder = -10;
  scene.add(photoMesh);

  // הקיר במבט מסובב: מישור הקיר מקבל את הצילום דרך המצלמה המקורית, כך שבכל זווית רואים את הקיר של הגולש.
  // מחוץ לצילום הקיר ממשיך בשיקוף, כמו במבט באיכות צילום. מקדימה נשאר הצילום עצמו, פיקסל לפיקסל
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, night: { value: 0 }, vp: { value: new THREE.Matrix4() } },
    vertexShader: 'uniform mat4 vp; varying vec4 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = vp * w; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform sampler2D map; uniform float night; varying vec4 vP;
      void main(){
        vec2 t = vP.w > 1e-4 ? vP.xy / vP.w * 0.5 + 0.5 : vec2(0.5);
        t = 1.0 - abs(mod(t, 2.0) - 1.0);
        vec3 c = texture2D(map, t).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 n = mix(vec3(l), c, 0.55) * vec3(0.5, 0.6, 0.95) * 0.13;
        gl_FragColor = vec4(mix(c, n, night), 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 8, 8), wallMat);
  wallMesh.matrixAutoUpdate = false;
  wallMesh.frustumCulled = false;
  wallMesh.renderOrder = -10;
  wallMesh.visible = false;
  scene.add(wallMesh);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8580, 1);
  const key = new THREE.DirectionalLight(0xfff4e8, 1);
  scene.add(hemi, key, key.target);

  // השלט: anchor יושב על הקיר במרכז השלט; body מורחק מהקיר במרחק ההתקנה
  const anchor = new THREE.Group();
  const body = new THREE.Group();
  anchor.add(body);
  scene.add(anchor);
  anchor.matrixAutoUpdate = false;

  const flatMat = (opts) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, ...opts });
  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMat({ color: 0x000000 }));
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMat({ blending: THREE.AdditiveBlending, toneMapped: false }));
  const bloomMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMat({ blending: THREE.AdditiveBlending, toneMapped: false, depthTest: false }));
  shadowMesh.position.z = 0.05; glowMesh.position.z = 0.1;
  shadowMesh.renderOrder = 1; glowMesh.renderOrder = 2; bloomMesh.renderOrder = 5;
  anchor.add(shadowMesh, glowMesh, bloomMesh);

  const brushed = brushedTexture();

  const st = {
    photo: null, W: 1, H: 1, f: 1,
    pose: null, frame: null,
    td: null, logo: null, shapes: null, bounds: null, enabled: null,
    product: null,
    size: 100,           // רוחב השלט בס"מ
    u: 0, v: 0,          // מרכז השלט על הקיר, בס"מ מהפינה השמאלית העליונה של המלבן שסומן
    night: 0, nightTarget: 0,
    grow: 1, growT0: 0,  // הכניסה: האותיות יוצאות מהקיר (0 שטוח, 1 בעומק מלא)
    light: { hemi: 1, key: 1, env: 1, sky: new THREE.Color(1, 1, 1) },
    dirty: { geo: true, tex: true },
  };

  // ---------- צילום וקיר ----------

  function setPhoto(img, { f35 } = {}) {
    const s = Math.min(1, 2400 / Math.max(img.width, img.height));
    const c = canvasOf(img.width * s, img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    st.photo = c; st.W = c.width; st.H = c.height;
    st.pose = null; st.placed = false; // צילום חדש: השלט חוזר למרכז ולגודל שמתאים לקיר
    st.f = focalPx(st.W, st.H, f35 || 26);
    photoMat.uniforms.map.value?.dispose();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    photoMat.uniforms.map.value = wallMat.uniforms.map.value = t;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(st.H / 2 / st.f));
    camera.aspect = st.W / st.H;
    camera.updateProjectionMatrix();
    resetOrbit();
    measureLight();
    layout();
  }

  // עוצמת האור בחדר לפי הצילום, כדי שהשלט לא ייראה מודבק
  function measureLight() {
    const s = 48, c = canvasOf(s, Math.round((s * st.H) / st.W)), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(st.photo, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    let r = 0, g = 0, b = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += lin(d[i]); g += lin(d[i + 1]); b += lin(d[i + 2]); }
    r /= n; g /= n; b /= n;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const E = THREE.MathUtils.clamp(L / 0.55, 0.25, 1.6); // קיר בהיר בערך 55% החזרה
    const m = Math.max(r, g, b) || 1;
    st.light.sky.setRGB(0.5 + (0.5 * r) / m, 0.5 + (0.5 * g) / m, 0.5 + (0.5 * b) / m);
    st.light.hemi = 0.55 * E; st.light.key = 1.1 * E; st.light.env = 0.7 * E;
  }

  // ארבע נקודות בצילום (בפיקסלים של הצילום) והרוחב האמיתי של מה שסומן
  // spot: בקיר לדוגמה, איפה השלט יושב ועד איזה גובה (חלק מגובה הקיר), כדי שלא יעלה על מנורה או דלפק
  function setWall(pts, widthCm, spot) {
    const first = !st.pose;
    st.pose = planePose(pts, st.W, st.H, st.f, widthCm);
    st.pts = pts;
    st.spot = spot || null;
    const O = cv(st.pose.origin), EX = cv(st.pose.ex), EY = cv(st.pose.ey), N = cv(st.pose.n);
    st.frame = { O, EX, EY, N, X: EX.clone(), Y: EY.clone().negate(), Z: N.clone().negate() };
    if (first || !st.placed) {
      st.u = st.pose.widthCm / 2;
      st.v = st.pose.heightCm * (st.spot?.v ?? 0.45);
    }
    if (!st.placed) fitSize();
    st.dirty.tex = true;
    update();
  }

  function fitSize() {
    if (!st.pose || !st.bounds) return;
    const a = aspect();
    const w = Math.min(st.pose.widthCm * (st.spot?.w ?? 0.55), st.pose.heightCm * (st.spot?.h ?? 0.5) * a);
    st.size = Math.max(10, Math.round(w / 5) * 5);
  }

  // ---------- לוגו ומוצר ----------

  // td: תוצאת traceLogo, logo: תוצאת extractLogo. size: אותו לוגו שנבנה מחדש (סלוגן), ולכן הרוחב נקבע מבחוץ ולא מותאם לקיר
  function setLogo(td, logo, { size } = {}) {
    st.td = td; st.logo = logo;
    st.shapes = layerShapes(td);
    st.enabled = logo.palette.map(() => true);
    st.colors = logo.palette.map((p) => p.hex);
    computeBounds();
    if (size) st.size = clampSize(size);
    else { st.placed = false; fitSize(); }
    st.dirty.geo = st.dirty.tex = true;
    update();
  }

  function setLayers({ enabled, colors } = {}) {
    if (enabled) st.enabled = enabled.slice();
    if (colors) st.colors = colors.slice();
    if (enabled) { computeBounds(); st.dirty.geo = true; }
    st.dirty.mat = st.dirty.tex = true;
    update();
  }

  function computeBounds() {
    const box = new THREE.Box2(), tmp = new THREE.Box2();
    st.shapes.forEach((shapes, k) => {
      if (!st.enabled[k]) return;
      for (const s of shapes) box.union(tmp.setFromPoints(s.getPoints(2)));
    });
    st.bounds = box.isEmpty() ? new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(st.logo.width, st.logo.height)) : box;
  }

  const aspect = () => {
    if (!st.bounds) return 1;
    const b = st.bounds, w = b.max.x - b.min.x, h = b.max.y - b.min.y;
    if (st.product?.type === 'glass') {
      const m = glassMargin(w, h, 1);
      return (w + 2 * m) / (h + 2 * m);
    }
    return w / Math.max(1e-6, h);
  };
  // שוליים של שלט זכוכית סביב הלוגו, ביחידות של הלוגו
  const glassMargin = (w, h) => Math.max(w, h) * 0.14;

  // spec: { type: 'letters'|'glass', depth, standoff, face:{finish, color?}, side:{finish, color?}|null,
  //         light: null|{mode:'halo'|'front', tone}, glass:{kind:'clear'|'frosted'|'acid', thickness, hidden} }
  function setProduct(spec) {
    const prev = st.product;
    st.product = JSON.parse(JSON.stringify(spec));
    if (!prev || prev.type !== spec.type || prev.depth !== spec.depth || prev.glass?.thickness !== spec.glass?.thickness) st.dirty.geo = true;
    if (JSON.stringify(prev?.glass) !== JSON.stringify(spec.glass) || prev?.standoff !== spec.standoff) st.dirty.glass = true;
    st.dirty.tex = st.dirty.mat = true;
    update();
  }

  // ---------- בנייה ----------

  const disposeTree = (o) => o.traverse((m) => {
    if (m.geometry) m.geometry.dispose();
    if (m.material) [].concat(m.material).forEach((x) => x.dispose());
  });

  // צבע הפנים כפי שהוא נראה כשהאור עובר דרכו: כפול גוון הנורה, מנורמל לבהירות מלאה
  function litColor(hex, tone) {
    const c = new THREE.Color(hex).multiply(tone);
    const mx = Math.max(c.r, c.g, c.b);
    return mx > 0.02 ? c.multiplyScalar(1 / mx) : tone.clone().multiplyScalar(0.2);
  }

  function finishMaterial(f, color) {
    const base = { color: new THREE.Color(color || '#ffffff') };
    switch (f) {
      case 'brushed': return new THREE.MeshStandardMaterial({ color: '#d4d6d9', metalness: 1, roughness: 0.34, roughnessMap: brushed, metalnessMap: null });
      case 'gold': return new THREE.MeshStandardMaterial({ color: '#d9ab58', metalness: 1, roughness: 0.3, roughnessMap: brushed });
      case 'mirror': return new THREE.MeshStandardMaterial({ color: '#e8eaec', metalness: 1, roughness: 0.08 });
      case 'acrylic': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.25, metalness: 0 });
      case 'matte': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.75, metalness: 0 });
      default: return new THREE.MeshStandardMaterial({ ...base, roughness: 0.5, metalness: 0.05 }); // צבע
    }
  }

  let letterMeshes = [];
  let glassParts = null;

  function buildGeometry() {
    disposeTree(body);
    body.clear();
    letterMeshes = [];
    glassParts = null;
    if (!st.shapes || !st.product) return;
    const P = st.product;
    const b = st.bounds, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
    const unit = st.size / (b.max.x - b.min.x); // ס"מ לפיקסל, לבנייה בלבד
    if (P.type === 'glass') {
      const t = P.glass.thickness;
      glassParts = { group: new THREE.Group(), print: [] };
      st.shapes.forEach((shapes, k) => {
        if (!st.enabled[k] || !shapes.length) return;
        const g = new THREE.ShapeGeometry(shapes, 6);
        g.translate(-cx, -cy, 0);
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ roughness: 0.55 }));
        m.userData.layer = k;
        m.position.z = t + 0.03; // ההדפסה על הפנים הקדמיות של הזכוכית
        glassParts.print.push(m);
        body.add(m);
      });
      return;
    }
    const depth = Math.max(0.2, P.depth);
    const bt = Math.min(0.06, depth * 0.08);
    const bs = 0.08 / unit;
    st.shapes.forEach((shapes, k) => {
      if (!st.enabled[k] || !shapes.length) return;
      const g = new THREE.ExtrudeGeometry(shapes, {
        depth: depth - 2 * bt, curveSegments: 5,
        bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelOffset: -bs, bevelSegments: 1,
      });
      g.translate(-cx, -cy, bt);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]);
      m.userData.layer = k;
      letterMeshes.push(m);
      body.add(m);
    });
  }

  // חלקי הזכוכית תלויים בגודל (בס"מ), ולכן נבנים מחדש כשהגודל משתנה
  function buildGlass(sz) {
    if (!glassParts) return;
    const P = st.product, t = P.glass.thickness;
    disposeTree(glassParts.group);
    glassParts.group.clear();
    body.remove(glassParts.group);
    // הלוח תופס בדיוק את העובי [0, t]; הקצה ירקרק כמו בזכוכית אמיתית
    const bv = Math.min(0.08, t * 0.12);
    const pg = new THREE.ExtrudeGeometry(roundRect(sz.w, sz.h, Math.min(1.2, sz.w * 0.03)), {
      depth: t - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 2, curveSegments: 6,
    });
    pg.translate(0, 0, bv);
    // שקופה = אקסטרה קליר, בלי הגוון הירקרק; חלבית מותזת חול; אסיד בגימור מט חלק יותר
    const KINDS = {
      clear: { color: '#ffffff', roughness: 0.04, transmission: 1, att: 400, edge: '#cfe7df' },
      frosted: { color: '#f2f7f5', roughness: 0.5, transmission: 0.82, att: 60, edge: '#bfe0d3' },
      acid: { color: '#f6f9f8', roughness: 0.3, transmission: 0.9, att: 60, edge: '#bfe0d3' },
    };
    const g = KINDS[P.glass.kind] || KINDS.clear;
    const panel = new THREE.Mesh(pg, [
      new THREE.MeshPhysicalMaterial({
        color: g.color, metalness: 0, roughness: g.roughness, transmission: g.transmission, thickness: t, ior: 1.5,
        attenuationColor: new THREE.Color('#d8efe6'), attenuationDistance: g.att, specularIntensity: 1,
      }),
      new THREE.MeshStandardMaterial({ color: g.edge, roughness: 0.15, metalness: 0 }),
    ]);
    panel.userData.panel = true; // ההדמיה באיכות צילום מפרידה את הלוח (רואים דרכו) ממה שמסתיר את הקיר
    glassParts.group.add(panel);
    // ארבעה ברגי הרחקה בפינות; בהרחקה נסתרת אין כיפה בחזית והבורג נשאר מאחור
    const inset = Math.min(4, Math.min(sz.w, sz.h) * 0.12), rad = Math.min(1.1, sz.w * 0.03);
    const steel = new THREE.MeshStandardMaterial({ color: '#dcdfe2', metalness: 1, roughness: 0.25 });
    const barrel = new THREE.CylinderGeometry(rad * 0.85, rad * 0.85, P.standoff, 24).rotateX(Math.PI / 2).translate(0, 0, -P.standoff / 2);
    const cap = new THREE.CylinderGeometry(rad, rad, 1.2, 32).rotateX(Math.PI / 2).translate(0, 0, t + 0.6);
    const hidden = !!P.glass.hidden, hin = hidden ? inset * 1.6 : inset;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx * (sz.w / 2 - hin), y = sy * (sz.h / 2 - hin);
      const a = new THREE.Mesh(barrel, steel);
      a.position.set(x, y, 0);
      glassParts.group.add(a);
      if (hidden) continue;
      const c = new THREE.Mesh(cap, steel);
      c.position.set(x, y, 0);
      glassParts.group.add(c);
    }
    body.add(glassParts.group);
  }

  function applyMaterials() {
    const P = st.product;
    if (!P) return;
    const lit = P.light;
    const tone = new THREE.Color(TONES[lit?.tone] || TONES.neutral);
    const n = st.night;
    const faceColor = (k) => P.face.color || st.colors[k];
    for (const m of letterMeshes) {
      const k = m.userData.layer;
      [].concat(m.material).forEach((x) => x.dispose());
      const face = finishMaterial(P.face.finish, faceColor(k));
      const side = P.side ? finishMaterial(P.side.finish, P.side.color || faceColor(k)) : face;
      if (lit?.mode === 'front') {
        // אור דרך פרספקס צבעוני: הצבע נשמר רווי, לא נשרף ללבן
        face.emissive = litColor(faceColor(k), tone);
        face.emissiveIntensity = 0.08 + 0.82 * n;
      }
      m.material = [face, side];
    }
    if (glassParts) for (const m of glassParts.print) m.material.color.set(P.face.color || st.colors[m.userData.layer]);
  }

  // צל רך על הקיר, אור הילה מאחורי האותיות, וזוהר קל לאותיות מוארות מלפנים
  function buildWallTextures(sz) {
    const P = st.product, b = st.bounds;
    const lw = b.max.x - b.min.x, lh = b.max.y - b.min.y;
    const glass = P.type === 'glass';
    const depth = glass ? P.glass.thickness : P.depth;
    const back = P.standoff, front = P.standoff + depth;
    const offX = -KEY.x / KEY.z, offY = KEY.y / KEY.z; // סטייה של הצל לכל ס"מ מהקיר (y למטה בתמונה)
    const halo = P.light?.mode === 'halo';
    const r1 = Math.max(1.2, back * 0.75);
    const padCm = Math.max(halo ? r1 * 9 : 0, front * 1.2 + 4, 6);
    const res = Math.min(360 / Math.max(sz.w, sz.h), 1024 / (Math.max(sz.w, sz.h) + 2 * padCm)); // פיקסלים לס"מ
    const gw = Math.ceil((sz.w + 2 * padCm) * res), gh = Math.ceil((sz.h + 2 * padCm) * res);

    // המסכה של הלוגו (או של לוח הזכוכית) על הרשת
    const mc = canvasOf(gw, gh), ctx = mc.getContext('2d', { willReadFrequently: true });
    const logoW = glass ? sz.w - 2 * glassMargin(sz.w, sz.h) * (sz.w / sz.w) : sz.w;
    const lcm = glass ? (sz.w / (lw + 2 * glassMargin(lw, lh))) : sz.w / lw; // ס"מ ליחידת לוגו
    const alphaCanvas = logoAlpha();
    const dx = (gw - lw * lcm * res) / 2, dy = (gh - lh * lcm * res) / 2;
    const read = () => { const d = ctx.getImageData(0, 0, gw, gh).data, o = new Float32Array(gw * gh); for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3] / 255; return o; };
    ctx.drawImage(alphaCanvas, b.min.x, b.min.y, lw, lh, dx, dy, lw * lcm * res, lh * lcm * res);
    const logoMask = read();
    let castMask = logoMask;
    if (glass) {
      ctx.clearRect(0, 0, gw, gh);
      ctx.fillStyle = '#000';
      ctx.fillRect((gw - sz.w * res) / 2, (gh - sz.h * res) / 2, sz.w * res, sz.h * res);
      const panelMask = read();
      castMask = panelMask.map((v, i) => Math.min(1, v * 0.3 + logoMask[i] * 0.6));
    }
    void logoW;

    // הצל: הצללית מוזזת לאורך עומק השלט, ואז מטושטשת
    const smear = new Float32Array(gw * gh);
    const steps = 8;
    for (let s = 0; s < steps; s++) {
      const z = back + ((front - back) * s) / (steps - 1);
      const ox = Math.round(offX * z * res), oy = Math.round(offY * z * res);
      for (let y = 0; y < gh; y++) {
        const sy = y - oy;
        if (sy < 0 || sy >= gh) continue;
        for (let x = 0; x < gw; x++) {
          const sx = x - ox;
          if (sx < 0 || sx >= gw) continue;
          const v = castMask[sy * gw + sx];
          if (v > smear[y * gw + x]) smear[y * gw + x] = v;
        }
      }
    }
    const soft = blur(smear, gw, gh, (0.5 + 0.35 * front) * res / 2.2);
    const contact = blur(castMask, gw, gh, (0.3 + 0.2 * back) * res / 2.2);
    const shadow = soft.map((v, i) => 1 - (1 - 0.75 * v) * (1 - 0.45 * contact[i] * (back < 1 ? 1 : 0.6)));
    replaceTex(shadowMesh, maskTexture(shadow, gw, gh), 'alphaMap');

    const wcm = gw / res, hcm = gh / res;
    for (const m of [shadowMesh, glowMesh, bloomMesh]) m.scale.set(wcm, hcm, 1);

    glowMesh.visible = bloomMesh.visible = false;
    if (P.light?.mode === 'halo') {
      const a = blur(logoMask, gw, gh, (r1 * res) / 2.2), c = blur(logoMask, gw, gh, (r1 * 3.2 * res) / 2.2);
      replaceTex(glowMesh, maskTexture(a.map((v, i) => Math.min(1, 0.85 * v + 0.75 * c[i])), gw, gh), 'map');
      glowMesh.visible = true;
    } else if (P.light?.mode === 'front') {
      // כל צבע זורח בצבע שלו: על הקיר מסביב, והילה רכה מעל האותיות
      const tone = new THREE.Color(TONES[P.light.tone] || TONES.neutral);
      const rA = ((1.5 + depth * 0.3) * res) / 2.2, rB = ((0.6 + sz.h * 0.02) * res) / 2.2;
      const glow = [0, 1, 2].map(() => new Float32Array(gw * gh)), bloom = [0, 1, 2].map(() => new Float32Array(gw * gh));
      st.colors.forEach((hex, k) => {
        if (!st.enabled[k]) return;
        ctx.clearRect(0, 0, gw, gh);
        ctx.drawImage(logoAlpha(k), b.min.x, b.min.y, lw, lh, dx, dy, lw * lcm * res, lh * lcm * res);
        const m = read(), c = litColor(P.face.color || hex, tone), rgb = [c.r, c.g, c.b];
        const a = blur(m, gw, gh, rA), q = blur(m, gw, gh, rB);
        for (let j = 0; j < 3; j++) for (let i = 0; i < m.length; i++) { glow[j][i] += a[i] * rgb[j]; bloom[j][i] += q[i] * rgb[j]; }
      });
      replaceTex(glowMesh, rgbTexture(glow, gw, gh), 'map');
      replaceTex(bloomMesh, rgbTexture(bloom, gw, gh), 'map');
      glowMesh.visible = bloomMesh.visible = true;
    }
    bloomMesh.position.z = front + 0.5;
  }

  function replaceTex(mesh, tex, slot) {
    mesh.material[slot]?.dispose();
    mesh.material[slot] = tex;
    mesh.material.needsUpdate = true;
  }

  // מסכת הכיסוי של השכבות הפעילות (או של שכבה אחת), בגודל הלוגו המקורי
  function logoAlpha(only = -1) {
    const L = st.logo, c = canvasOf(L.width, L.height), ctx = c.getContext('2d'), id = ctx.createImageData(L.width, L.height);
    for (let i = 0; i < L.labels.length; i++) {
      const k = L.labels[i];
      if (k !== 255 && st.enabled[k] && (only < 0 || k === only)) id.data[i * 4 + 3] = L.cover[i];
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  // ---------- מיקום, גודל, תאורה ----------

  function signSize() {
    const a = aspect();
    return { w: st.size, h: st.size / a };
  }

  function placeAnchor() {
    const F = st.frame;
    const pos = F.O.clone().addScaledVector(F.EX, st.u).addScaledVector(F.EY, st.v);
    anchor.matrix.makeBasis(F.X, F.Y, F.Z).setPosition(pos);
    anchor.matrixWorldNeedsUpdate = true;
    wallMesh.matrix.copy(anchor.matrix);
    wallMesh.matrixWorldNeedsUpdate = true;
    // אור ראשי מכיוון קבוע ביחס לקיר
    const dir = F.X.clone().multiplyScalar(KEY.x).addScaledVector(F.Y, KEY.y).addScaledVector(F.Z, KEY.z);
    key.position.copy(pos).addScaledVector(dir, 1000);
    key.target.position.copy(pos);
    key.target.updateMatrixWorld();
  }

  function scaleBody(sz) {
    const P = st.product, b = st.bounds, lw = b.max.x - b.min.x;
    let s;
    if (P.type === 'glass') {
      const m = glassMargin(lw, b.max.y - b.min.y);
      s = sz.w / (lw + 2 * m);
    } else s = sz.w / lw;
    const g = Math.max(0.001, st.grow);
    body.position.z = P.standoff * g;
    for (const m of body.children) if (m !== glassParts?.group) m.scale.set(s, -s, g);
    if (glassParts) {
      glassParts.group.scale.set(1, 1, g);
      for (const m of glassParts.print) m.position.z = (P.glass.thickness + 0.03) * g;
    }
  }

  function applyLights() {
    const n = st.night, L = st.light, dim = 1 - 0.88 * n;
    hemi.color.copy(st.light.sky);
    hemi.intensity = L.hemi * dim;
    key.intensity = L.key * (1 - n);
    scene.environmentIntensity = L.env * dim;
    photoMat.uniforms.night.value = wallMat.uniforms.night.value = n;
    const P = st.product;
    if (!P) return;
    const tone = new THREE.Color(TONES[P.light?.tone] || TONES.neutral);
    if (P.light?.mode === 'halo') glowMesh.material.color.copy(tone).multiplyScalar(0.22 + 1.05 * n);
    if (P.light?.mode === 'front') {
      glowMesh.material.color.setScalar(0.05 + 0.4 * n);
      bloomMesh.material.color.setScalar(0.03 + 0.3 * n);
      for (const m of letterMeshes) m.material[0].emissiveIntensity = 0.08 + 0.82 * n;
    }
    shadowMesh.material.opacity = (P.light ? 0.85 - 0.6 * n : 0.85 - 0.5 * n) * st.grow;
    if (P.light) glowMesh.material.color.multiplyScalar(st.grow);
  }

  let raf = 0;
  function update() {
    if (!st.photo || !st.frame || !st.shapes || !st.product) { requestRender(); return; }
    const sz = signSize();
    if (st.dirty.geo) { buildGeometry(); st.dirty.mat = true; st.dirty.glass = true; st.dirty.geo = false; }
    if (st.dirty.mat) { applyMaterials(); st.dirty.mat = false; }
    if (glassParts && (st.dirty.glass || st.lastW !== sz.w)) { buildGlass(sz); st.dirty.glass = false; }
    if (st.dirty.tex || st.lastW !== sz.w) { buildWallTextures(sz); st.dirty.tex = false; }
    st.lastW = sz.w;
    scaleBody(sz);
    placeAnchor();
    applyLights();
    requestRender();
    onChange?.({ width: Math.round(sz.w), height: Math.round(sz.h), u: st.u, v: st.v });
  }

  function requestRender() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }

  let lastT = 0;
  function frame(t) {
    raf = 0;
    let more = false;
    if (st.night !== st.nightTarget) {
      const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
      const step = dt / 0.7;
      st.night = st.nightTarget > st.night ? Math.min(st.nightTarget, st.night + step) : Math.max(st.nightTarget, st.night - step);
      applyLights();
      lastT = t;
      more = true;
    } else lastT = 0;
    if (st.grow < 1) {
      st.growT0 ||= t;
      const k = Math.min(1, (t - st.growT0) / 1100);
      st.grow = k >= 1 ? 1 : 1 - (1 - k) ** 3;
      if (st.product && st.frame && st.shapes) { scaleBody(signSize()); applyLights(); }
      more = st.grow < 1;
    }
    if (orb.anim) more = stepOrbit(t) || more;
    draw();
    drawOverlay();
    if (more && !raf) raf = requestAnimationFrame(frame);
  }

  // מקדימה: הצילום עצמו והמצלמה שצילמה. במבט מסובב: הקיר המוקרן והמצלמה המסתובבת
  function draw() {
    const o = isOrbit();
    photoMesh.visible = !o;
    wallMesh.visible = o;
    if (o) {
      orbitPose(orb.az, orb.el);
      wallMat.uniforms.vp.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    }
    renderer.render(scene, o ? orbitCam : camera);
  }

  // האותיות יוצאות מהקיר אל העומק שלהן; בהפחתת תנועה מופיעות מיד
  function playIntro() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    st.grow = 0; st.growT0 = 0;
    update();
  }

  function setSignVisible(v) { anchor.visible = v; requestRender(); }

  function setNight(on, { instant } = {}) {
    st.nightTarget = on ? 1 : 0;
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { st.night = st.nightTarget; applyLights(); }
    requestRender();
  }

  // ---------- מבט מסתובב ----------

  const orbitCam = new THREE.PerspectiveCamera(50, 1, 5, 100000);
  const orb = { az: 0, el: 0, on: true, anim: null, held: false };
  const isOrbit = () => !!st.frame && (Math.abs(orb.az) > 0.01 || Math.abs(orb.el) > 0.01);

  // נקודת הסיבוב (מרכז השלט, באמצע העומק שלו), והכיוון של המצלמה המקורית ממנה, במעלות ביחס לקיר
  function orbitBase() {
    const F = st.frame, P = st.product;
    const zc = P ? P.standoff + (P.type === 'glass' ? P.glass.thickness : P.depth || 1) / 2 : 0;
    const T = new THREE.Vector3(0, 0, zc).applyMatrix4(anchor.matrix);
    camera.updateMatrixWorld();
    const rel = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).sub(T);
    const x = rel.dot(F.X), y = rel.dot(F.Y), z = rel.dot(F.Z), D0 = rel.length();
    return { T, D0, dir0: rel.divideScalar(D0), a0: Math.atan2(x, z) / DEG, e0: Math.atan2(y, Math.hypot(x, z)) / DEG };
  }

  // הגבולות נמדדים מהקיר, אבל המבט המקורי תמיד בתוכם
  function orbitClamp(az, el, b = orbitBase()) {
    return {
      az: THREE.MathUtils.clamp(az, Math.min(0, -ORBIT.yaw - b.a0), Math.max(0, ORBIT.yaw - b.a0)),
      el: THREE.MathUtils.clamp(el, Math.min(0, ORBIT.pitch[0] - b.e0), Math.max(0, ORBIT.pitch[1] - b.e0)),
    };
  }

  // המצלמה בזווית (az, el) מהמבט המקורי. ב-0,0 זו בדיוק המצלמה שצילמה
  function orbitPose(az, el, cam = orbitCam) {
    const F = st.frame, b = orbitBase();
    const k = ease(Math.min(1, Math.hypot(az, el) / ORBIT.full));
    const A = (b.a0 + az) * DEG, E = (b.e0 + el) * DEG;
    const dir = F.X.clone().multiplyScalar(Math.sin(A) * Math.cos(E)).addScaledVector(F.Y, Math.sin(E)).addScaledVector(F.Z, Math.cos(A) * Math.cos(E));
    const sz = signSize(), aspect = st.W / st.H;
    const vf = ORBIT.fov * DEG, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const d1 = Math.max((sz.w * ORBIT.zoom) / 2 / Math.tan(hf / 2), (sz.h * ORBIT.zoom) / 2 / Math.tan(vf / 2));
    cam.fov = camera.fov + (ORBIT.fov - camera.fov) * k;
    cam.aspect = aspect; cam.near = 5; cam.far = 100000;
    cam.position.copy(b.T).addScaledVector(dir, b.D0 + (d1 - b.D0) * k);
    // מתחילים מהכיוון של המצלמה המקורית, שמסתובב יחד איתה, ומסיימים במבט ישר אל השלט
    const turn = new THREE.Quaternion().setFromUnitVectors(b.dir0, dir).multiply(camera.quaternion);
    const look = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(cam.position, b.T, F.Y));
    cam.quaternion.copy(turn).slerp(look, k);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return cam;
  }

  // "מימין" ו"משמאל": עמידה של 34 מעלות מהצד ביחס לקיר, קצת מעל גובה השלט
  function presetOffsets(a) {
    const b = orbitBase();
    return orbitClamp(a - b.a0, ORBIT.presetEl - b.e0, b);
  }

  // 0 מקדימה, 34 או 34- באחד המבטים הקבועים, null בכל זווית אחרת
  function orbitView() {
    if (!isOrbit()) return 0;
    for (const a of [34, -34]) {
      const p = presetOffsets(a);
      if (Math.abs(orb.az - p.az) < 0.3 && Math.abs(orb.el - p.el) < 0.3) return a;
    }
    return null;
  }

  const orbitBusy = () => !!(orb.held || orb.anim);
  function emitOrbit() { onOrbit?.({ az: orb.az, el: orb.el, view: orbitView(), settled: !orbitBusy() }); }

  function setOrbitNow(az, el) {
    const c = st.frame ? orbitClamp(az, el) : { az: 0, el: 0 };
    orb.az = c.az; orb.el = c.el;
  }

  // מעבר למבט מבוקש, בתנועה רכה או מיד (בהפחתת תנועה תמיד מיד)
  function setOrbit(az, el, { animate = false, dur = 650 } = {}) {
    if (!st.frame || !orb.on) az = el = 0;
    const to = st.frame ? orbitClamp(az, el) : { az: 0, el: 0 };
    if (animate && !reducedMotion() && (Math.abs(to.az - orb.az) > 0.01 || Math.abs(to.el - orb.el) > 0.01)) {
      orb.anim = { kind: 'tween', from: { az: orb.az, el: orb.el }, to, dur, t0: 0 };
    } else {
      orb.anim = null;
      orb.az = to.az; orb.el = to.el;
    }
    emitOrbit();
    requestRender();
  }

  function orbitTo(a, opts) {
    if (!a || !st.frame) { setOrbit(0, 0, opts); return; }
    const p = presetOffsets(a);
    setOrbit(p.az, p.el, opts);
  }

  function resetOrbit() {
    orb.anim = null; orb.held = false; orb.az = orb.el = 0;
    host.classList.remove('is-dragging');
    emitOrbit();
  }

  // אחרי שעוזבים: מי שכמעט חזר לחזית נצמד אליה, ואחרת המבט נשאר איפה שנעצר
  function settleOrbit() {
    if (isOrbit() && Math.abs(orb.az) < ORBIT.snap && Math.abs(orb.el) < ORBIT.snap) setOrbit(0, 0, { animate: true, dur: 380 });
    else { emitOrbit(); requestRender(); }
  }

  // צעד אחד של תנועה: מעבר רך למבט, או גלישה שנרגעת אחרי שזורקים את הקיר באצבע
  function stepOrbit(t) {
    const a = orb.anim;
    if (a.kind === 'tween') {
      a.t0 ||= t;
      const k = Math.min(1, (t - a.t0) / a.dur), e = ease(k);
      orb.az = a.from.az + (a.to.az - a.from.az) * e;
      orb.el = a.from.el + (a.to.el - a.from.el) * e;
      if (k >= 1) orb.anim = null;
      emitOrbit();
      return !!orb.anim;
    }
    const dt = Math.min(0.05, (t - (a.last || t)) / 1000);
    a.last = t;
    const f = Math.exp(-dt / 0.16);
    a.vaz *= f; a.vel *= f;
    const az = orb.az + a.vaz * dt, el = orb.el + a.vel * dt;
    setOrbitNow(az, el);
    if (orb.az !== az) a.vaz = 0; // נעצרים בגבול
    if (orb.el !== el) a.vel = 0;
    if (Math.hypot(a.vaz, a.vel) < 4) { orb.anim = null; settleOrbit(); return !!orb.anim; }
    emitOrbit();
    return true;
  }

  function setOrbitEnabled(v) {
    orb.on = v;
    canvas.style.cursor = '';
    if (!v && (isOrbit() || orb.anim || orb.held)) { if (drag?.mode === 'orbit') drag = null; resetOrbit(); requestRender(); }
  }

  // ---------- גודל המסך ----------

  let cssW = 1, cssH = 1;
  function layout() {
    const r = host.getBoundingClientRect();
    const a = st.W / st.H;
    let w = r.width, h = r.width / a;
    if (h > r.height && r.height > 0) { h = r.height; w = h * a; }
    cssW = Math.max(1, w); cssH = Math.max(1, h);
    for (const el of [canvas, overlay]) {
      el.style.width = cssW + 'px'; el.style.height = cssH + 'px';
      el.style.left = (r.width - cssW) / 2 + 'px'; el.style.top = (r.height - cssH) / 2 + 'px';
    }
    overlay.setAttribute('viewBox', `0 0 ${cssW} ${cssH}`);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, st.W / cssW));
    renderer.setSize(cssW, cssH, false);
    requestRender();
    onLayout?.({ left: (r.width - cssW) / 2, top: (r.height - cssH) / 2, width: cssW, height: cssH, scale: cssW / st.W });
  }
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  // ---------- הטלה: קיר ↔ מסך ----------

  // נקודה על הקיר (u, v, גובה מהקיר) ← נקודה במסך (פיקסלי CSS)
  function wallToScreen(u, v, z = 0) {
    const F = st.frame;
    const p = F.O.clone().addScaledVector(F.EX, u).addScaledVector(F.EY, v).addScaledVector(F.Z, z).project(camera);
    return [((p.x + 1) / 2) * cssW, ((1 - p.y) / 2) * cssH];
  }

  // נקודה במסך ← נקודה על הקיר
  function screenToWall(x, y) {
    const F = st.frame;
    const ndc = new THREE.Vector3((x / cssW) * 2 - 1, 1 - (y / cssH) * 2, 0.5).unproject(camera).normalize();
    const den = ndc.dot(F.N);
    if (Math.abs(den) < 1e-6) return null;
    const t = F.O.dot(F.N) / den;
    if (t <= 0) return null;
    const p = ndc.multiplyScalar(t).sub(F.O);
    return [p.dot(F.EX), p.dot(F.EY)];
  }

  function corners() {
    const sz = signSize(), z = st.product ? st.product.standoff + (st.product.type === 'glass' ? st.product.glass.thickness : st.product.depth) : 0;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => wallToScreen(st.u + (a * sz.w) / 2, st.v + (b * sz.h) / 2, z));
  }

  let showFrame = true;
  function drawOverlay() {
    const vis = showFrame && st.frame && st.shapes && st.product && !isOrbit();
    overlay.style.display = vis ? '' : 'none';
    if (!vis) return;
    const c = corners();
    overlay.querySelector('.sim-frame').setAttribute('points', c.map((p) => p.join(',')).join(' '));
    overlay.querySelectorAll('.sim-handle').forEach((h, i) => { h.setAttribute('cx', c[i][0]); h.setAttribute('cy', c[i][1]); });
  }

  // ---------- גרירה, שינוי גודל, מקלדת ----------

  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pointers = new Map();
  let drag = null;

  function inside(w) {
    const sz = signSize(), m = Math.max(sz.w, sz.h) * 0.08;
    return w && Math.abs(w[0] - st.u) <= sz.w / 2 + m && Math.abs(w[1] - st.v) <= sz.h / 2 + m;
  }

  const clampSize = (w) => THREE.MathUtils.clamp(Math.round(w), 10, 1200);
  function setSize(w) { st.size = clampSize(w); st.placed = true; update(); }
  function setPosition(u, v) { st.u = u; st.v = v; st.placed = true; update(); }

  // מקדימה: גרירה על השלט מזיזה אותו, וגרירה על הקיר מסובבת את המבט. במבט מסובב כל גרירה מסובבת
  canvas.addEventListener('pointerdown', (e) => {
    if (!st.frame) return;
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) {
      // שתי אצבעות מקדימה משנות גודל, גם אם הראשונה כבר התחילה לסובב ובקושי זזה
      if (drag?.mode === 'orbit' && !(drag.az0 === 0 && drag.el0 === 0 && drag.moved < 12)) return;
      if (drag?.mode === 'orbit') { orb.held = false; setOrbitNow(0, 0); emitOrbit(); }
      else if (isOrbit()) return;
      const [a, b] = [...pointers.values()];
      drag = { mode: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]), s0: st.size };
      return;
    }
    if (pointers.size > 2) return;
    const [x, y] = local(e);
    const w = isOrbit() ? null : screenToWall(x, y);
    if (inside(w)) {
      canvas.setPointerCapture(e.pointerId);
      drag = { mode: 'move', du: w[0] - st.u, dv: w[1] - st.v };
    } else if (orb.on) {
      canvas.setPointerCapture(e.pointerId);
      orb.anim = null; orb.held = true;
      drag = { mode: 'orbit', id: e.pointerId, x, y, az0: orb.az, el0: orb.el, moved: 0, hist: [[e.timeStamp, orb.az, orb.el]] };
    } else return;
    host.classList.add('is-dragging');
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, local(e));
    if (!drag) {
      if (st.frame && e.pointerType === 'mouse') canvas.style.cursor = !isOrbit() && inside(screenToWall(...local(e))) ? 'move' : orb.on ? 'grab' : '';
      return;
    }
    if (drag.mode === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      setSize((drag.s0 * Math.hypot(a[0] - b[0], a[1] - b[1])) / Math.max(1, drag.d0));
    } else if (drag.mode === 'move') {
      const w = screenToWall(...local(e));
      if (w) setPosition(w[0] - drag.du, w[1] - drag.dv);
    } else if (drag.mode === 'orbit' && e.pointerId === drag.id) {
      // רוחב התצוגה כולו הוא בערך חצי סיבוב, כך שהתנועה מרגישה זהה בטלפון ובמחשב
      const [x, y] = local(e), s = 170 / Math.max(240, cssW);
      drag.moved = Math.max(drag.moved, Math.hypot(x - drag.x, y - drag.y));
      setOrbitNow(drag.az0 - (x - drag.x) * s, drag.el0 + (y - drag.y) * s);
      drag.hist.push([e.timeStamp, orb.az, orb.el]);
      if (drag.hist.length > 24) drag.hist.shift();
      emitOrbit();
      requestRender();
    }
  });

  // עזיבה: מהירות מ-100 המילישניות האחרונות. זריקה ממשיכה לגלוש ונרגעת, עזיבה רגועה נעצרת במקום
  function releaseOrbit(e) {
    const h = drag.hist.filter((p) => e.timeStamp - p[0] <= 100);
    drag = null; orb.held = false;
    let vaz = 0, vel = 0;
    if (e.type === 'pointerup' && h.length > 1) {
      const a = h[0], b = h[h.length - 1], dt = Math.max(0.016, (b[0] - a[0]) / 1000);
      vaz = (b[1] - a[1]) / dt; vel = (b[2] - a[2]) / dt;
    }
    if (!reducedMotion() && Math.hypot(vaz, vel) > 20) { orb.anim = { kind: 'glide', vaz, vel, last: 0 }; emitOrbit(); requestRender(); }
    else settleOrbit();
  }

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (drag?.mode === 'orbit' && e.pointerId === drag.id) releaseOrbit(e);
    if (pointers.size < 2 && drag?.mode === 'pinch') drag = null;
    if (pointers.size === 0) { drag = null; host.classList.remove('is-dragging'); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // לחיצה כפולה במבט מסובב מחזירה למבט מקדימה
  canvas.addEventListener('dblclick', (e) => {
    if (!isOrbit()) return;
    e.preventDefault();
    setOrbit(0, 0, { animate: true });
  });

  overlay.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.sim-handle');
    if (!h) return;
    e.preventDefault();
    h.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const r = canvas.getBoundingClientRect();
      const w = screenToWall(ev.clientX - r.left, ev.clientY - r.top);
      if (!w) return;
      const a = aspect();
      setSize(Math.max(2 * Math.abs(w[0] - st.u), 2 * Math.abs(w[1] - st.v) * a));
    };
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
  });

  canvas.addEventListener('wheel', (e) => {
    if (!st.frame || isOrbit() || !inside(screenToWall(...local(e)))) return;
    e.preventDefault();
    setSize(st.size * (e.deltaY < 0 ? 1.04 : 1 / 1.04));
  }, { passive: false });

  canvas.addEventListener('keydown', (e) => {
    if (!st.frame) return;
    if (isOrbit() || orb.anim) {
      if (e.key === 'Escape' || e.key === 'Home') { setOrbit(0, 0, { animate: true }); e.preventDefault(); return; }
      const d = e.shiftKey ? 15 : 5, b = orb.anim?.to || orb;
      const turns = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
      if (turns[e.key]) { setOrbit(b.az + turns[e.key][0], b.el + turns[e.key][1], { animate: true, dur: 250 }); e.preventDefault(); }
      return;
    }
    const step = e.shiftKey ? 10 : 2;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { setPosition(st.u + moves[e.key][0], st.v + moves[e.key][1]); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { setSize(st.size + step); e.preventDefault(); }
    else if (e.key === '-') { setSize(st.size - step); e.preventDefault(); }
  });

  // ---------- ייצוא ----------

  // תמונה בגודל הצילום (עד 2400 פיקסלים), בלי המסגרת
  function exportImage({ maxSide = 2400, night, type = 'image/jpeg', quality = 0.9 } = {}) {
    const s = Math.min(1, maxSide / Math.max(st.W, st.H));
    const w = Math.round(st.W * s), h = Math.round(st.H * s);
    const keepNight = st.night, keepGrow = st.grow;
    if (night !== undefined || st.grow < 1) { st.night = night === undefined ? st.night : night ? 1 : 0; st.grow = 1; if (st.product && st.frame && st.shapes) scaleBody(signSize()); applyLights(); }
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    // הקובץ תמיד מהמבט של הצילום, גם כשהתצוגה מסובבת כרגע
    photoMesh.visible = true; wallMesh.visible = false;
    renderer.render(scene, camera);
    const out = new Promise((res) => canvas.toBlob(res, type, quality));
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    if (night !== undefined || keepGrow < 1) { st.night = keepNight; st.grow = keepGrow; if (st.product && st.frame && st.shapes) scaleBody(signSize()); applyLights(); }
    draw();
    return out;
  }

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    disposeTree(scene);
    alive = false;
    envRT.dispose();
    pmrem.dispose();
    renderer.dispose();
    canvas.remove(); overlay.remove();
  }

  return {
    setPhoto, setWall, setLogo, setLayers, setProduct, setSize, setPosition, setNight,
    exportImage, dispose, wallToScreen, screenToWall, playIntro, setSignVisible,
    setOrbit, orbitTo, setOrbitEnabled,
    // המצלמה של זווית מסוימת, בשביל הרינדור המציאותי שמצלם בדיוק מאותה נקודה
    orbitCamera: (az, el) => orbitPose(az, el, new THREE.PerspectiveCamera()),
    get orbit() { return { az: orb.az, el: orb.el, busy: orbitBusy(), view: orbitView() }; },
    showFrame(v) { showFrame = v; requestRender(); },
    get state() { const sz = signSize(); return { width: Math.round(sz.w), height: Math.round(sz.h), u: st.u, v: st.v, night: st.nightTarget, wall: st.pose && { width: st.pose.widthCm, height: st.pose.heightCm } }; },
    get renderer() { return renderer; },
    // החלקים הפנימיים, בשביל הרינדור המציאותי שבונה סצנה משלו מאותו שלט
    get parts() { return { scene, camera, anchor, body, st, letterMeshes, glassParts }; },
    photoSize: () => [st.W, st.H],
  };
}
