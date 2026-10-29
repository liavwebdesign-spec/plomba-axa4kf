// מישור הקיר מתוך ארבע נקודות שהגולש סימן על הצילום.
// ריבוע היחידה (0,0)-(1,1) הוא המלבן שסומן; ההומוגרפיה מפורקת לסיבוב ולמיקום של המישור מול המצלמה.

// פתרון מערכת לינארית קטנה (גאוס עם פיבוט)
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

// הומוגרפיה מריבוע היחידה לארבע נקודות בתמונה (סדר: למעלה-שמאל, למעלה-ימין, למטה-ימין, למטה-שמאל)
export function homography(pts) {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = pts[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

export function project(H, x, y) {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const scale = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// מרחק המוקד בפיקסלים: מה-EXIF כשיש (מקביל ל-35 מ"מ), אחרת עדשה ראשית של טלפון (26 מ"מ)
export function focalPx(w, h, f35 = 26) {
  return (f35 * Math.hypot(w, h)) / 43.27;
}

// המצב של המישור מול המצלמה, בקואורדינטות של OpenCV (x ימינה, y למטה, z קדימה).
// widthCm: הרוחב האמיתי של המלבן שסומן. מחזיר את ראשית המלבן, צירי הרוחב והגובה שלו בס"מ, והגובה האמיתי.
export function planePose(pts, w, h, f, widthCm) {
  const H = homography(pts);
  const cx = w / 2, cy = h / 2;
  // K^-1 H, עמודה אחרי עמודה
  const col = (j) => [(H[0][j] - cx * H[2][j]) / f, (H[1][j] - cy * H[2][j]) / f, H[2][j]];
  let m1 = col(0), m2 = col(1), m3 = col(2);
  let k = 1 / norm(m1);
  if (m3[2] * k < 0) k = -k; // המישור לפני המצלמה
  const r1 = scale(m1, k);
  const hRatio = Math.abs(k) * norm(m2); // גובה המלבן ביחס לרוחבו
  let r2 = scale(m2, k / (Math.abs(k) * norm(m2)));
  // גרם-שמידט: הצירים חייבים להיות ניצבים
  r2 = sub(r2, scale(r1, dot(r1, r2)));
  r2 = scale(r2, 1 / norm(r2));
  const t = scale(m3, k);
  return {
    origin: scale(t, widthCm),
    ex: r1,              // לאורך הרוחב, ימינה בתמונה
    ey: r2,              // לאורך הגובה, למטה בתמונה
    n: cross(r1, r2),    // אל תוך הקיר
    widthCm,
    heightCm: hRatio * widthCm,
    H,
  };
}

// נקודה בתמונה ← נקודה על המישור (ביחידות של ריבוע היחידה), דרך ההומוגרפיה ההפוכה
export function unproject(H, u, v) {
  const [a, b, c] = H[0], [d, e, f] = H[1], [g, hh, i] = H[2];
  const inv = [
    [e * i - f * hh, c * hh - b * i, b * f - c * e],
    [f * g - d * i, a * i - c * g, c * d - a * f],
    [d * hh - e * g, b * g - a * hh, a * e - b * d],
  ];
  const w = inv[2][0] * u + inv[2][1] * v + inv[2][2];
  return [(inv[0][0] * u + inv[0][1] * v + inv[0][2]) / w, (inv[1][0] * u + inv[1][1] * v + inv[1][2]) / w];
}
