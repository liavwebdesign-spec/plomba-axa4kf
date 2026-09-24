/* פלומבה שלטים · main.js
   שער התקדמות: הכל גלוי בלי JS. עם JS: reveal, הדר, תפריט, נגישות, טפסים, מחשבון, הדמיה, סצנת האות. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  html.classList.add('js');
  var q = new URLSearchParams(location.search);
  if (q.get('qa') === '1') html.classList.add('qa');
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('qa');

  var BIZ = {
    phone: '050-2222155', phoneIntl: '972502222155', office: '03-6325373',
    wa: function (text) { return 'https://wa.me/972502222155?text=' + encodeURIComponent(text || 'היי שלום, אשמח להצעת מחיר לשילוט.'); }
  };
  w.PLOMBA = BIZ;

  /* ---------- reveal (מנוע: keyframes, לא transition) ---------- */
  var reveals = d.querySelectorAll('.reveal');
  if (!RM && 'IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add('is-in'); }); }

  /* ---------- הדר ---------- */
  var header = d.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', w.scrollY > 8); }
  w.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- ציר תהליך שמתמלא (MV:b35), בלי GSAP: גלילה רגילה בלבד ---------- */
  var vt = d.querySelector('.vt');
  if (vt) {
    var vfill = vt.querySelector('.vt-fill'), vsteps = [].slice.call(vt.querySelectorAll('.vt-step'));
    var vtick = function () {
      var r = vt.getBoundingClientRect(), vh = w.innerHeight, p = RM ? 1 : Math.max(0, Math.min(1, (vh * 0.62 - r.top) / (r.height * 0.9)));
      vfill.style.height = (p * 100) + '%';
      vsteps.forEach(function (st) { st.classList.toggle('on', RM || st.getBoundingClientRect().top < vh * 0.66); });
    };
    w.addEventListener('scroll', vtick, { passive: true }); w.addEventListener('resize', vtick); vtick();
  }

  /* ---------- תפריט מובייל ---------- */
  var toggle = d.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = d.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    d.querySelectorAll('.mobile-menu a').forEach(function (a) { a.addEventListener('click', function () { d.body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) { d.body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); } });
  }

  /* ---------- ניווט פעיל ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  d.querySelectorAll('.nav a, .mobile-menu nav a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('#')[0];
    if (href && href === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- CTA דביק (מובייל): רק כשאף CTA ראשי לא על המסך, כולל הפוטר ---------- */
  var sticky = d.querySelector('.sticky-cta');
  if (sticky && 'IntersectionObserver' in w) {
    var visible = new Set();
    var targets = d.querySelectorAll('.hero, .closer, .site-footer, .btn-primary, .calc-result, .form-card');
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      var on = visible.size === 0 && w.scrollY > 300;
      sticky.classList.toggle('is-on', on);
      d.body.classList.toggle('sticky-off', !on);
    }, { rootMargin: '-72px 0px -72px 0px' });
    targets.forEach(function (t) { io2.observe(t); });
    d.body.classList.add('sticky-off');
  }

  /* ---------- קישורי וואטסאפ ---------- */
  d.querySelectorAll('[data-wa]').forEach(function (a) { a.setAttribute('href', BIZ.wa(a.getAttribute('data-wa') || '')); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); });

  /* ---------- סרגל נגישות (B19) ---------- */
  (function a11y() {
    var link = d.querySelector('.a11y-btn'); if (!link) return;
    var opts = [
      ['bigger', 'הגדלת טקסט'], ['smaller', 'הקטנת טקסט'], ['contrast', 'ניגודיות גבוהה'], ['invert', 'היפוך צבעים'], ['gray', 'גווני אפור'],
      ['links', 'הדגשת קישורים'], ['font', 'גופן קריא'], ['spacing', 'ריווח טקסט'], ['nomotion', 'עצירת אנימציות'], ['cursor', 'סמן גדול'], ['guide', 'קו קריאה'], ['reset', 'איפוס']
    ];
    var state = {}; try { state = JSON.parse(localStorage.getItem('plomba-a11y') || '{}'); } catch (e) {}
    var scale = state.scale || 1;
    function apply() {
      html.style.setProperty('--a11y-scale', scale);
      ['contrast', 'invert', 'gray', 'links', 'font', 'spacing', 'nomotion', 'cursor', 'guide'].forEach(function (k) { html.classList.toggle('a11y-' + k, !!state[k]); });
      panel.querySelectorAll('[data-a11y]').forEach(function (b) { var k = b.getAttribute('data-a11y'); if (k in state) b.setAttribute('aria-pressed', state[k] ? 'true' : 'false'); });
      try { state.scale = scale; localStorage.setItem('plomba-a11y', JSON.stringify(state)); } catch (e) {}
    }
    var panel = d.createElement('div'); panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'הגדרות נגישות');
    panel.innerHTML = '<header><span>נגישות</span><button type="button" class="a11y-close" aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></header><div class="list">' +
      opts.map(function (o) { return '<button type="button" data-a11y="' + o[0] + '" aria-pressed="false"><span>' + o[1] + '</span></button>'; }).join('') +
      '</div><footer><a href="accessibility.html">הצהרת נגישות</a><span>ת"י 5568</span></footer>';
    d.body.appendChild(panel);
    var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'a11y-btn'; btn.setAttribute('aria-label', 'פתיחת תפריט נגישות'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = link.innerHTML; link.replaceWith(btn);
    function open(o) { panel.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) panel.querySelector('button[data-a11y]').focus(); else btn.focus(); }
    btn.addEventListener('click', function () { open(!panel.classList.contains('is-open')); });
    panel.querySelector('.a11y-close').addEventListener('click', function () { open(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) open(false); });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a11y]'); if (!b) return; var k = b.getAttribute('data-a11y');
      if (k === 'bigger') scale = Math.min(1.6, +(scale + 0.15).toFixed(2));
      else if (k === 'smaller') scale = Math.max(0.85, +(scale - 0.15).toFixed(2));
      else if (k === 'reset') { state = {}; scale = 1; }
      else state[k] = !state[k];
      apply();
    });
    d.addEventListener('mousemove', function (e) { if (state.guide) html.style.setProperty('--a11y-guide-y', (e.clientY - 5) + 'px'); });
    var a11yq = q.get('a11y'); if (a11yq) { a11yq.split(',').forEach(function (k) { if (k === 'open') open(true); else state[k] = true; }); }
    apply();
  })();

  /* ---------- טפסים: שליחה אמיתית לוואטסאפ (הסקיצה) או ל-endpoint (Lovable) ---------- */
  d.querySelectorAll('form[data-lead]').forEach(function (form) {
    var card = form.closest('.form-card') || form.parentNode;
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        var field = f.closest('.field') || f.closest('.consent');
        var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'tel' && f.value.replace(/\D/g, '').length < 9);
        if (field) field.classList.toggle('is-error', bad);
        f.setAttribute('aria-invalid', String(bad));
        if (bad) ok = false;
      });
      if (!ok) { var first = form.querySelector('.is-error input, .is-error textarea'); if (first) first.focus(); return; }
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.pathname; data.ts = new Date().toISOString();
      var btnS = form.querySelector('[type=submit]'); btnS.disabled = true; btnS.dataset.label = btnS.textContent; btnS.textContent = 'שולח...';
      var endpoint = form.getAttribute('data-endpoint');
      var done = function () { card.classList.add('is-sent'); card.classList.remove('is-failed'); try { var s = JSON.parse(localStorage.getItem('plomba-leads') || '[]'); s.push(data); localStorage.setItem('plomba-leads', JSON.stringify(s)); } catch (er) {} };
      var fail = function () { card.classList.add('is-failed'); btnS.disabled = false; btnS.textContent = btnS.dataset.label; };
      if (endpoint) {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function (r) { if (!r.ok) throw 0; done(); }).catch(fail);
      } else {
        /* בסקיצה: הפנייה נפתחת בוואטסאפ של שלום עם כל הפרטים. זה ערוץ אמיתי, לא הצלחה מדומה. */
        var msg = 'פנייה מהאתר\nשם: ' + (data.name || '') + '\nטלפון: ' + (data.phone || '') + (data.company ? '\nחברה: ' + data.company : '') + (data.kind ? '\nסוג: ' + data.kind : '') + (data.msg ? '\nפרטים: ' + data.msg : '');
        w.open(BIZ.wa(msg), '_blank', 'noopener'); done();
      }
    });
    form.querySelectorAll('input, textarea').forEach(function (f) { f.addEventListener('input', function () { var fl = f.closest('.field'); if (fl) fl.classList.remove('is-error'); }); });
  });

  /* ---------- FAQ: אחד פתוח ---------- */
  d.querySelectorAll('.faq details').forEach(function (det) {
    det.addEventListener('toggle', function () { if (det.open) d.querySelectorAll('.faq details[open]').forEach(function (o) { if (o !== det) o.open = false; }); });
  });

  /* ---------- סינון פרויקטים ---------- */
  var filters = d.querySelector('.filters');
  if (filters) {
    var items = d.querySelectorAll('.masonry .proj');
    var empty = d.querySelector('.empty-note');
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      filters.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      var f = b.getAttribute('data-filter'); var n = 0;
      items.forEach(function (it) { var show = f === 'all' || (it.getAttribute('data-cat') || '').split(' ').indexOf(f) > -1; it.classList.toggle('is-hidden', !show); if (show) n++; });
      if (empty) empty.style.display = n ? 'none' : 'block';
      if (history.replaceState) history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
    });
    var h = location.hash.slice(1); if (h) { var pre = filters.querySelector('[data-filter="' + h + '"]'); if (pre) pre.click(); }
  }

  /* ---------- מחשבון אותיות ---------- */
  var calc = d.querySelector('[data-calc]');
  if (calc) {
    /* [להזין משלום] תעריפי בסיס משוערים לאות בגובה 10 ס"מ, בש"ח. המחשבון מציג טווח, לא מחיר סופי. */
    var RATES = { pvc: { base: 95, label: 'אותיות PVC' }, acrylic: { base: 150, label: 'אותיות פרספקס' }, aluminum: { base: 380, label: 'אותיות אלומיניום בנויות' }, steel: { base: 520, label: 'נירוסטה' } };
    var LIGHT = { none: { add: 0, label: 'בלי תאורה' }, halo: { add: 180, label: 'תאורת הילה' }, front: { add: 240, label: 'תאורה פרונטלית' } };
    var MOUNT = { wall: { mult: 1, label: 'קיר פנימי' }, facade: { mult: 1.25, label: 'חזית חיצונית' }, glass: { mult: 1.1, label: 'זכוכית' } };
    var form = calc.querySelector('form');
    var out = { price: calc.querySelector('[data-price]'), sum: calc.querySelector('[data-sum]'), wa: calc.querySelector('[data-calc-wa]'), n: calc.querySelector('[data-n-out]'), h: calc.querySelector('[data-h-out]') };
    function fmt(n) { return new Intl.NumberFormat('he-IL').format(Math.round(n / 50) * 50); }
    function run() {
      var fd = new FormData(form);
      var mat = RATES[fd.get('material')] || RATES.pvc, li = LIGHT[fd.get('light')] || LIGHT.none, mo = MOUNT[fd.get('mount')] || MOUNT.wall;
      var n = +fd.get('count') || 6, hcm = +fd.get('height') || 30;
      var perLetter = (mat.base * Math.pow(hcm / 10, 1.35) + li.add * (hcm / 20)) * mo.mult;
      var total = perLetter * n; var lo = total * 0.85, hi = total * 1.2;
      if (out.n) out.n.value = n; if (out.h) out.h.value = hcm;
      out.price.innerHTML = fmt(lo) + ' <small>עד</small> ' + fmt(hi) + ' <small>ש"ח</small>';
      out.sum.innerHTML = '<li><span>חומר</span><b>' + mat.label + '</b></li><li><span>גובה אות</span><b>' + hcm + ' ס"מ</b></li><li><span>כמות</span><b>' + n + ' אותיות</b></li><li><span>תאורה</span><b>' + li.label + '</b></li><li><span>התקנה</span><b>' + mo.label + '</b></li>';
      if (out.wa) out.wa.href = BIZ.wa('היי שלום, בניתי מפרט במחשבון באתר:\n' + mat.label + ', גובה ' + hcm + ' ס"מ, ' + n + ' אותיות, ' + li.label + ', ' + mo.label + '.\nהערכה: ' + fmt(lo) + ' עד ' + fmt(hi) + ' ש"ח.\nאשמח להצעה מדויקת.');
    }
    form.addEventListener('input', run); form.addEventListener('change', run); run();
    /* Enter בשדה לא שולח את הטופס (בלי זה הדף נטען מחדש עם הפרמטרים ב-URL): מעדכן ומעביר את הפוקוס לתוצאה */
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); var res = calc.querySelector('.calc-result'); if (res) res.focus(); });
  }

  /* ---------- הדמיה מיידית: קנבס ---------- */
  var sim = d.querySelector('[data-sim]');
  if (sim) {
    var stage = sim.querySelector('.sim-stage'), cv = sim.querySelector('canvas'), ctx = cv.getContext('2d');
    var S = { bg: null, logo: null, text: '', x: 0.5, y: 0.45, scale: 0.35, rot: 0, depth: 12, mat: 'alu', led: false, color: '#C6731C' };
    var MATS = { alu: { face: ['#f1f1f1', '#b9bcc2'], side: '#6d7178', name: 'אלומיניום' }, black: { face: ['#2b2b2b', '#111'], side: '#000', name: 'שחור מט' }, white: { face: ['#ffffff', '#e6e6e6'], side: '#9a9a9a', name: 'לבן' }, brass: { face: ['#e8c87a', '#b8892f'], side: '#7a5a17', name: 'פליז' }, custom: { face: null, side: null, name: 'צבע' } };
    function shade(hex, k) { var c = hex.replace('#', ''); var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16); return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')'; }
    function fit() { var r = stage.getBoundingClientRect(); var dpr = Math.min(2, w.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
    function draw() {
      var W = cv.width / (Math.min(2, w.devicePixelRatio || 1)), H = cv.height / (Math.min(2, w.devicePixelRatio || 1));
      ctx.clearRect(0, 0, W, H);
      if (S.bg) { var r = Math.max(W / S.bg.width, H / S.bg.height); var bw = S.bg.width * r, bh = S.bg.height * r; ctx.drawImage(S.bg, (W - bw) / 2, (H - bh) / 2, bw, bh); }
      else { ctx.fillStyle = '#2a2723'; ctx.fillRect(0, 0, W, H); }
      var hasLogo = !!S.logo, hasText = !!S.text.trim();
      if (!hasLogo && !hasText) return;
      var m = MATS[S.mat]; var face = m.face || [S.color, shade(S.color, .8)], side = m.side || shade(S.color, .45);
      var cx = S.x * W, cy = S.y * H;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.rot * Math.PI / 180);
      var lw, lh; if (hasLogo) { lw = W * S.scale; lh = lw * S.logo.height / S.logo.width; } else { ctx.font = '700 ' + Math.round(W * S.scale * 0.22) + 'px "Google Sans Display", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lw = ctx.measureText(S.text).width; lh = W * S.scale * 0.22; }
      /* צל רך על הקיר */
      ctx.save(); ctx.globalAlpha = .45; ctx.filter = 'blur(' + Math.max(6, S.depth) + 'px)'; ctx.fillStyle = '#000';
      if (hasLogo) drawTinted(S.logo, -lw / 2 + S.depth * .6, -lh / 2 + S.depth * 1.2, lw, lh, '#000'); else { ctx.fillText(S.text, S.depth * .6, S.depth * 1.2); }
      ctx.restore();
      /* הילת LED */
      if (S.led) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(' + (18 + S.depth) + 'px)'; ctx.globalAlpha = .9; if (hasLogo) drawTinted(S.logo, -lw / 2, -lh / 2, lw, lh, '#fff2c9'); else { ctx.fillStyle = '#fff2c9'; ctx.fillText(S.text, 0, 0); } ctx.restore(); }
      /* עומק: שכבות מוסטות */
      for (var i = S.depth; i > 0; i--) { var k = 1 - (i / S.depth) * .35; var col = shade(rgbToHex(side), k); if (hasLogo) drawTinted(S.logo, -lw / 2 + i * .5, -lh / 2 + i * .5, lw, lh, col); else { ctx.fillStyle = col; ctx.fillText(S.text, i * .5, i * .5); } }
      /* פנים */
      var g = ctx.createLinearGradient(-lw / 2, -lh / 2, lw / 2, lh / 2); g.addColorStop(0, face[0]); g.addColorStop(1, face[1]);
      if (hasLogo) { drawTinted(S.logo, -lw / 2, -lh / 2, lw, lh, g, true); } else { ctx.fillStyle = g; ctx.fillText(S.text, 0, 0); }
      ctx.restore();
    }
    var off = d.createElement('canvas'), octx = off.getContext('2d');
    function drawTinted(img, x, y, wd, ht, fill, gradient) {
      off.width = Math.max(1, Math.round(wd)); off.height = Math.max(1, Math.round(ht));
      octx.clearRect(0, 0, off.width, off.height); octx.drawImage(img, 0, 0, off.width, off.height);
      octx.globalCompositeOperation = 'source-in';
      if (gradient) { var gg = octx.createLinearGradient(0, 0, off.width, off.height); gg.addColorStop(0, fill.c0 || '#fff'); gg.addColorStop(1, fill.c1 || '#bbb'); octx.fillStyle = typeof fill === 'string' ? fill : (function () { var m = MATS[S.mat]; var f = m.face || [S.color, shade(S.color, .8)]; var g2 = octx.createLinearGradient(0, 0, off.width, off.height); g2.addColorStop(0, f[0]); g2.addColorStop(1, f[1]); return g2; })(); }
      else octx.fillStyle = fill;
      octx.fillRect(0, 0, off.width, off.height); octx.globalCompositeOperation = 'source-over';
      ctx.drawImage(off, x, y, wd, ht);
    }
    function rgbToHex(c) { if (c[0] === '#') return c; var m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(function (n) { return (+n).toString(16).padStart(2, '0'); }).join(''); }
    function loadFile(file, cb) { if (!file || !/^image\//.test(file.type)) return; var img = new Image(); img.onload = function () { cb(img); URL.revokeObjectURL(img.src); }; img.src = URL.createObjectURL(file); }
    var bgIn = sim.querySelector('[data-sim-bg]'), logoIn = sim.querySelector('[data-sim-logo]'), txtIn = sim.querySelector('[data-sim-text]');
    bgIn.addEventListener('change', function () { loadFile(bgIn.files[0], function (img) { S.bg = img; stage.classList.remove('is-empty'); sim.querySelector('[data-bg-name]').textContent = bgIn.files[0].name; draw(); }); });
    logoIn.addEventListener('change', function () { loadFile(logoIn.files[0], function (img) { S.logo = img; stage.classList.remove('is-empty'); sim.querySelector('[data-logo-name]').textContent = logoIn.files[0].name; draw(); }); });
    txtIn.addEventListener('input', function () { S.text = txtIn.value; if (!S.logo) { stage.classList.toggle('is-empty', !S.bg && !S.text.trim()); } draw(); });
    ['scale', 'rot', 'depth'].forEach(function (k) { var el = sim.querySelector('[data-sim-' + k + ']'); if (el) el.addEventListener('input', function () { S[k] = +el.value; draw(); }); });
    sim.querySelectorAll('[data-sim-mat]').forEach(function (b) { b.addEventListener('click', function () { S.mat = b.getAttribute('data-sim-mat'); sim.querySelectorAll('[data-sim-mat]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); draw(); }); });
    var colorIn = sim.querySelector('[data-sim-color]'); if (colorIn) colorIn.addEventListener('input', function () { S.color = colorIn.value; S.mat = 'custom'; sim.querySelectorAll('[data-sim-mat]').forEach(function (o) { o.setAttribute('aria-pressed', o.getAttribute('data-sim-mat') === 'custom' ? 'true' : 'false'); }); draw(); });
    var ledIn = sim.querySelector('[data-sim-led]'); if (ledIn) ledIn.addEventListener('change', function () { S.led = ledIn.checked; draw(); });
    /* גרירה */
    var drag = null;
    function pt(e) { var r = cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height }; }
    function down(e) { drag = pt(e); drag.sx = S.x; drag.sy = S.y; cv.style.cursor = 'grabbing'; if (e.cancelable) e.preventDefault(); }
    function move(e) { if (!drag) return; var p = pt(e); S.x = Math.min(1, Math.max(0, drag.sx + (p.x - drag.x))); S.y = Math.min(1, Math.max(0, drag.sy + (p.y - drag.y))); draw(); if (e.cancelable) e.preventDefault(); }
    function up() { drag = null; cv.style.cursor = 'grab'; }
    cv.addEventListener('mousedown', down); w.addEventListener('mousemove', move); w.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    ['dragenter', 'dragover'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove('is-drag'); }); });
    stage.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; loadFile(f, function (img) { if (!S.bg) { S.bg = img; } else { S.logo = img; } stage.classList.remove('is-empty'); draw(); }); });
    var dl = sim.querySelector('[data-sim-download]'); if (dl) dl.addEventListener('click', function () { var a = d.createElement('a'); a.download = 'plomba-simulation.png'; a.href = cv.toDataURL('image/png'); a.click(); });
    var waS = sim.querySelector('[data-sim-wa]'); if (waS) waS.addEventListener('click', function () { var m = MATS[S.mat]; waS.href = BIZ.wa('היי שלום, הכנתי הדמיה של האותיות באתר (' + m.name + (S.led ? ', עם תאורת LED' : '') + ', עומק ' + S.depth + '). מצרף את התמונה כאן ואשמח להצעת מחיר.'); });
    w.addEventListener('resize', fit); fit();
  }

  /* ---------- פיצול מילים למשפט האווירה (S16) ---------- */
  function splitWords(el) { if (el.querySelector('.w')) return el.querySelectorAll('.w'); var words = el.textContent.trim().split(/\s+/); el.textContent = ''; words.forEach(function (wd, i) { var s = d.createElement('span'); s.className = 'w'; s.textContent = wd; el.appendChild(s); if (i < words.length - 1) el.appendChild(d.createTextNode(' ')); }); return el.querySelectorAll('.w'); }

  /* ---------- GSAP: סצנת האות שנבנית + משפט אווירה ---------- */
  function initGsap() {
    if (!w.gsap || RM) { d.querySelectorAll('.letter-scene .stage-line').forEach(function (l) { l.classList.add('is-on'); }); d.querySelectorAll('.letter-scene .photo').forEach(function (p) { p.style.opacity = 1; }); return; }
    gsap.registerPlugin(ScrollTrigger);
    history.scrollRestoration = 'manual';
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      /* משפט אווירה: מילים מתבהרות (G4 רמה ב) */
      d.querySelectorAll('.breath h2').forEach(function (h) {
        var ws = splitWords(h);
        gsap.fromTo(ws, { opacity: .18 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: h, start: 'top 85%', end: 'top 35%', scrub: true } });
      });
      /* האות שנבנית */
      var scene = d.querySelector('.letter-scene'); if (!scene) return;
      var svg = scene.querySelector('.scene-visual svg'), lines = scene.querySelectorAll('.stage-line'), photo = scene.querySelector('.photo');
      var outline = svg.querySelector('.l-outline'), sides = svg.querySelectorAll('.l-side'), face = svg.querySelector('.l-face'), glow = svg.querySelector('.l-glow'), leds = svg.querySelectorAll('.l-led');
      var len = outline.getTotalLength();
      gsap.set(outline, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(sides, { opacity: 0, x: 0, y: 0 });
      gsap.set(face, { opacity: 0 }); gsap.set(glow, { opacity: 0 }); gsap.set(leds, { opacity: 0, scale: 0, transformOrigin: 'center' }); gsap.set(photo, { opacity: 0 });
      var isDesk = w.matchMedia('(min-width: 1024px)').matches;
      var tl = gsap.timeline({ scrollTrigger: { trigger: scene, start: 'top top', end: '+=' + (isDesk ? 2600 : 1800), scrub: 1, pin: isDesk, anticipatePin: 1 } });
      function on(i) { return function () { lines.forEach(function (l, k) { l.classList.toggle('is-on', k <= i); }); }; }
      tl.to(outline, { strokeDashoffset: 0, duration: 2, ease: 'none', onStart: on(0), onReverseComplete: on(-1) })
        .call(on(1))
        .to(sides, { opacity: 1, x: function (i) { return -(i + 1) * 3; }, y: function (i) { return (i + 1) * 3; }, stagger: .05, duration: 1.2 })
        .to(face, { opacity: 1, duration: .8 }, '<.6')
        .call(on(2))
        .to(leds, { opacity: 1, scale: 1, stagger: .04, duration: .8 })
        .to(glow, { opacity: .9, duration: 1 }, '<.2')
        .call(on(3))
        .to(photo, { opacity: 1, duration: 1.4 })
        .to(svg, { opacity: 0, duration: .8 }, '<.5')
        .to({}, { duration: .6 });
    });
    w.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (d.readyState === 'complete') initGsap(); else w.addEventListener('load', initGsap);
  /* שער QA: ?y=N גולל מיד לנקודה, לצילומי headless של מצבי ביניים */
  if (q.get('y')) w.addEventListener('load', function () { setTimeout(function () { w.scrollTo({ top: +q.get('y'), behavior: 'instant' }); }, 300); });

  /* ---------- שער debug: מי גולש אופקית ---------- */
  if (q.get('debug') === '1') w.addEventListener('load', function () { var bad = []; d.querySelectorAll('body *').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > w.innerWidth + 1)) bad.push(el.tagName + '.' + (el.className || '').toString().split(' ')[0]); }); d.body.setAttribute('data-overflow', bad.slice(0, 12).join(' | ') || 'none'); });
})();
