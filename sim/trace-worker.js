// המרת הלוגו לקווים וקטוריים, ברקע כדי שהעמוד לא ייתקע.
// הפלטה מגיעה מוכנה והתמונה כבר בצבעי הפלטה בדיוק, ולכן מחזור כימות אחד בלבד (אחרת הספרייה ממצעת ומגרילה צבעים).
importScripts('../vendor/imagetracer/imagetracer_v1.2.6.js');

const OPTS = {
  ltres: 1, qtres: 1, pathomit: 8, rightangleenhance: true,
  colorsampling: 0, colorquantcycles: 1, mincolorratio: 0, layering: 0,
  blurradius: 0, strokewidth: 0, linefilter: true, scale: 1, roundcoords: -1, viewbox: true, desc: false,
};

self.onmessage = ({ data }) => {
  try {
    const td = self.ImageTracer.imagedataToTracedata(data.imgd, { ...OPTS, pal: data.pal });
    // רק מה שצריך לבניית הצורות: מסלולים, חורים, סוגי מקטעים
    const layers = td.layers.map((layer) => layer.map((p) => ({
      hole: !!p.isholepath,
      holes: p.holechildren,
      segs: p.segments.map((s) => s.type === 'Q' ? [1, s.x1, s.y1, s.x2, s.y2, s.x3, s.y3] : [0, s.x1, s.y1, s.x2, s.y2]),
    })));
    self.postMessage({ ok: true, td: { width: td.width, height: td.height, layers } });
  } catch (e) {
    self.postMessage({ ok: false, error: String((e && e.message) || e) });
  }
};
