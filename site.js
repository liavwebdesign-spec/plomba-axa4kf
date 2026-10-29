/* פלומבה v15 · הדר hd9, שלט תלת ממד (h5), אנטומיה (g90), עבודות נחשפות, עיגול התהליך (g22), נגישות */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  w.__plomba = true;
  var q = new URLSearchParams(location.search);
  var QA = html.classList.contains('qa');
  var mqRM = w.matchMedia('(prefers-reduced-motion: reduce)');
  var FINE = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var still = function () { return QA || mqRM.matches || html.classList.contains('a11y-nomotion'); };
  var WA = function (t) { return 'https://wa.me/972502222155?text=' + encodeURIComponent(t || 'היי שלום, אשמח לייעוץ על שלט לארגון שלנו.'); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- וואטסאפ עם טקסט ---------- */
  d.querySelectorAll('[data-wa]').forEach(function (a) { if (a.id !== 'cfg-send') a.href = WA(a.getAttribute('data-wa')); });

  d.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- reveal ---------- */
  var rv = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in w && !still()) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- מתג האור: יום וערב בכל האתר. ברירת המחדל בוקר (ליאב 28.10), ובחירה של הגולש נשמרת ---------- */
  var swEls = [].slice.call(d.querySelectorAll('[data-light-sw]')), tcm = d.querySelector('meta[name="theme-color"]');
  function lightUi() {
    var on = html.getAttribute('data-light') === 'evening';
    swEls.forEach(function (b) { b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    if (tcm) tcm.content = on ? '#061A2C' : '#E2E5E8';
  }
  function setLight(m, save) {
    if (save) { try { localStorage.setItem('plomba-light', m); } catch (e) {} }
    var apply = function () { html.setAttribute('data-light', m); lightUi(); };
    if (d.startViewTransition && !still()) d.startViewTransition(apply); else apply();
  }
  swEls.forEach(function (b) { b.addEventListener('click', function () { setLight(html.getAttribute('data-light') === 'evening' ? 'day' : 'evening', true); }); });
  lightUi();

  /* ---------- הדר: שקוף מעל ההירו, אטום בגלילה, נעלם למטה ---------- */
  var hd = d.getElementById('hd'), lastY = w.scrollY, ticking = false;
  var megaBtn = d.getElementById('mega-btn'), mega = d.getElementById('mega');
  function megaOpen() { return hd.classList.contains('mega-open'); }
  function onScroll() {
    ticking = false;
    var y = w.scrollY, solid = y > 24, hide = y > 320 && y > lastY + 2 && !megaOpen() && !html.classList.contains('menu-open');
    if (hd.classList.contains('is-solid') !== solid) hd.classList.toggle('is-solid', solid);
    if (y < lastY - 2 || y < 320) { if (hd.classList.contains('is-hidden')) hd.classList.remove('is-hidden'); }
    else if (hide && !hd.classList.contains('is-hidden')) hd.classList.add('is-hidden');
    lastY = y;
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- עוגנים בעמוד: גלישה רכה עד מתחת להדר, ובהפחתת תנועה קפיצה ---------- */
  // GSAP מכבה את הגלילה הרכה של ה-CSS (היא מתנגשת בסצנות), אז הקישורים גולשים כאן
  d.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.hasAttribute('data-open-dlg')) return;
    var id = a.getAttribute('href').slice(1), t = null;
    try { t = id && d.getElementById(decodeURIComponent(id)); } catch (err) {}
    if (!t) return;
    e.preventDefault();
    var top = t.getBoundingClientRect().top + w.scrollY - (hd ? hd.offsetHeight : 0);
    w.scrollTo({ top: Math.max(0, Math.round(top)), behavior: still() ? 'auto' : 'smooth' });
    try { history.pushState(null, '', '#' + id); } catch (err) {}
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
  // אם הפוקוס נכנס להדר המוסתר, הוא חוזר
  hd.addEventListener('focusin', function () { hd.classList.remove('is-hidden'); });

  /* מגה תפריט */
  if (megaBtn && mega) {
    var tClose;
    var setMega = function (o, focusBack) {
      clearTimeout(tClose);
      hd.classList.toggle('mega-open', o); megaBtn.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (!o && focusBack) megaBtn.focus();
    };
    megaBtn.addEventListener('click', function () { setMega(!megaOpen()); });
    if (FINE) {
      [megaBtn, mega].forEach(function (el) {
        el.addEventListener('mouseenter', function () { clearTimeout(tClose); setMega(true); });
        el.addEventListener('mouseleave', function () { tClose = setTimeout(function () { setMega(false); }, 220); });
      });
    }
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && megaOpen()) setMega(false, true); });
    d.addEventListener('click', function (e) { if (megaOpen() && !hd.contains(e.target)) setMega(false); });
    mega.addEventListener('focusout', function (e) { if (!hd.contains(e.relatedTarget)) setMega(false); });
  }

  /* תפריט טלפון: נעילה, מלכודת פוקוס, Escape */
  var burger = d.getElementById('burger'), mnav = d.getElementById('mnav');
  if (burger && mnav) {
    var setMenu = function (o) {
      html.classList.toggle('menu-open', o); burger.setAttribute('aria-expanded', o ? 'true' : 'false');
      burger.setAttribute('aria-label', o ? 'סגירת תפריט' : 'פתיחת תפריט');
      burger.innerHTML = o ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      if (o) { hd.classList.remove('is-hidden'); var f = mnav.querySelector('a'); if (f) f.focus(); } else burger.focus();
    };
    burger.addEventListener('click', function () { setMenu(!html.classList.contains('menu-open')); });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { if (html.classList.contains('menu-open')) { html.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); } }); });
    d.addEventListener('keydown', function (e) {
      if (!html.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;
      var els = [burger].concat([].slice.call(mnav.querySelectorAll('a, button'))), i = els.indexOf(d.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && i === els.length - 1) { e.preventDefault(); els[0].focus(); }
    });
  }

  /* ---------- השלט התלת ממדי ---------- */
  // שכבות של אותו טקסט (או מסכה של לוגו), כל אחת עמוק יותר. --i=1 הכי קרובה לחזית
  function layer(sign, n, colorAt, content) {
    sign.querySelectorAll('.s-layer').forEach(function (el) { el.remove(); });
    var face = sign.querySelector('.s-face'), frag = d.createDocumentFragment();
    for (var i = n; i >= 1; i--) {
      var s = d.createElement('span'); s.className = 's-layer'; s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i); s.style.setProperty('--c', colorAt(i / n));
      if (content) content(s); else s.dataset.t = face.textContent;
      frag.appendChild(s);
    }
    sign.insertBefore(frag, face); sign.style.setProperty('--n', n);
  }

  var heroSign = d.querySelector('.hero [data-sign]');
  if (heroSign) layer(heroSign, 22, function (t) { return 'hsl(208 18% ' + Math.round(78 - 44 * t) + '%)'; });

  // הטיה עדינה אחרי הסמן, רק כשהוא זז (אין לולאה במנוחה)
  var heroRig = d.getElementById('hero-rig'), hero = d.querySelector('.hero');
  if (heroRig && FINE && !still()) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var tick = function () {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      heroRig.style.setProperty('--px', cx.toFixed(3)); heroRig.style.setProperty('--py', cy.toFixed(3));
      raf = (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) ? requestAnimationFrame(tick) : 0;
    };
    hero.addEventListener('pointermove', function (e) {
      if (still()) return;
      tx = clamp((e.clientX / innerWidth - .5) * 2, -1, 1); ty = clamp((e.clientY / innerHeight - .5) * 2, -1, 1);
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  /* ---------- MV:g22 · העיגול של התהליך: הקשת נמשכת, ובכל רבע שלב אחד ---------- */
  // בדסקטופ הגלילה מניעה אותו (נעוץ). בכל מסך לחיצה על נקודה או על השם שלה עוברת לשלב
  var circle = (function () {
    var pc = d.querySelector('[data-circle]'); if (!pc) return null;
    var C = 1822.12, arc = pc.querySelector('.pc-arc'), num = d.getElementById('pc-n');
    var sts = [].slice.call(pc.querySelectorAll('.pc-st')), lbs = [].slice.call(pc.querySelectorAll('.pc-lb')), steps = [].slice.call(pc.querySelectorAll('.pc-step'));
    var knob = pc.querySelector('.pc-knob'), names = knob ? (knob.getAttribute('data-steps') || '').split('|') : [];
    var api = { el: pc, st: null, on: 0 };
    // הכפתור במרכז מסתובב עם הקשת: הסימון שלו מצביע על המקום שהקשת הגיעה אליו
    api.draw = function (p) { p = clamp(p, 0, 1); arc.style.strokeDashoffset = (C * (1 - p)).toFixed(2); if (knob) knob.style.setProperty('--a', (p * 360).toFixed(1)); };
    api.set = function (i) {
      if (i === api.on) return; api.on = i;
      sts.forEach(function (b, k) { b.classList.toggle('is-done', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      lbs.forEach(function (l, k) { l.classList.toggle('is-on', k === i); });
      steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      if (num) num.textContent = i + 1;
      if (knob) { knob.setAttribute('aria-valuenow', i + 1); knob.setAttribute('aria-valuetext', 'שלב ' + (i + 1) + ' מתוך 4: ' + (names[i] || '')); }
    };
    var go = function (k) {
      var st = api.st;
      if (st) w.scrollTo({ top: st.start + (st.end - st.start) * (k / 4 + .125), behavior: still() ? 'auto' : 'smooth' });
      else { api.set(k); api.draw(k / 4 + .125); }
    };
    sts.forEach(function (b, k) { b.addEventListener('click', function () { go(k); }); });
    lbs.forEach(function (l, k) { l.addEventListener('click', function () { go(k); }); });
    if (knob) {
      // מקלדת: חיצים, עמודים, בית וסוף, כמו כל מחוון
      knob.addEventListener('keydown', function (e) {
        var k = api.on, key = e.key;
        if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'PageUp') k = Math.min(3, k + 1);
        else if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'PageDown') k = Math.max(0, k - 1);
        else if (key === 'Home') k = 0;
        else if (key === 'End') k = 3;
        else return;
        e.preventDefault(); go(k);
      });
      // סיבוב בגרירה רק בעכבר ובעט. במגע לחיצה עוברת לשלב הבא, כדי שהגלילה בטלפון לא תיתקע על החוגה
      var drag = null, moved = false;
      var angle = function (e) {
        var r = knob.getBoundingClientRect(), a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
        return (a + 360) % 360;
      };
      knob.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        if (e.button !== 0) return;
        var a0 = angle(e); drag = { start: a0, last: a0, a: api.on * 90 + 45 }; moved = false;
        knob.setPointerCapture(e.pointerId);
      });
      knob.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var a = angle(e);
        // בלי לעבור דרך האפס: הסיבוב נעצר בקצוות, כמו חוגה אמיתית
        if (Math.abs(a - drag.last) > 180) a = drag.last > 180 ? 359.9 : 0;
        if (!moved && Math.abs(a - drag.start) < 6) return;
        if (!moved) { moved = true; pc.classList.add('is-drag'); }
        drag.last = a; drag.a = a;
        var st = api.st;
        if (st) w.scrollTo(0, st.start + (st.end - st.start) * a / 360);
        else { knob.style.setProperty('--a', a.toFixed(1)); api.set(Math.min(3, Math.floor(a / 90))); api.draw(a / 360); }
      });
      var end = function () {
        if (!drag) return;
        var a = drag.a; drag = null;
        if (moved) { pc.classList.remove('is-drag'); go(Math.min(3, Math.floor(a / 90))); }
      };
      knob.addEventListener('pointerup', end);
      knob.addEventListener('pointercancel', end);
      knob.addEventListener('click', function () { if (moved) { moved = false; return; } go((api.on + 1) % 4); });
    }
    return api;
  })();

  /* ---------- ספק אחד: שלט אחד עובר בגלילה את כל הדרך, משרטוט עם מידות ועד הבורג האחרון.
     בלי תנועה רואים את השלט הגמור. layout מודד את המילה ומסדר סביבה את הלוח, הברגים והמידות ---------- */
  var why = (function () {
    var sec = d.querySelector('[data-why]'); if (!sec) return null;
    var svg = sec.querySelector('.wy-svg'), one = function (q) { return svg.querySelector(q); }, all = function (q) { return [].slice.call(svg.querySelectorAll(q)); };
    var word = d.getElementById('wy-t'), grid = one('.wy-mesh'), out = one('.wy-out'), flat = one('.wy-flat'), sheet = one('.wy-sheet'), scribe = one('.wy-scribe');
    var frame = one('.wy-frame'), corners = all('.wy-frame path'), dims = one('.wy-dims'), dl = all('.wy-dl'), lb = all('.wy-lb');
    var laser = one('.wy-laser'), lz = all('.wy-laser rect'), spark = one('.wy-spark'), panel = one('.wy-panel'), pr = all('.wy-pr'), glint = one('.wy-glint');
    var cast = one('.wy-cast'), halo = one('.wy-halo'), caps = all('.wy-cap'), rings = all('.wy-ring'), doneR = d.getElementById('wy-done-r'), rawR = d.getElementById('wy-raw-r');
    var ok = sec.querySelector('.wy-ok'), steps = [].slice.call(sec.querySelectorAll('.wy-step'));
    // W המילה, P לוח הזכוכית, S הגיליון שממנו חותכים. ברגים: קודם שניים למעלה (מימין), אחר כך למטה
    var W = { x: 139, y: 220, w: 722, h: 182 }, P = { x: 103, y: 184, w: 794, h: 254 }, S = { x: 103, y: 190, w: 794, h: 242 };
    var CAP = [[133, 214], [867, 214], [133, 408], [867, 408]], ORDER = [1, 0, 3, 2], OUT = 900, on = -1, live = false, last = 0;
    var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
    var ease = function (k) { return k * k * (3 - 2 * k); };
    var rect = function (e, r) { e.setAttribute('x', r.x.toFixed(1)); e.setAttribute('y', r.y.toFixed(1)); e.setAttribute('width', r.w.toFixed(1)); e.setAttribute('height', r.h.toFixed(1)); };
    var capAt = function (g, i, s) { g.setAttribute('transform', 'translate(' + CAP[i][0].toFixed(1) + ' ' + CAP[i][1].toFixed(1) + ')' + (s ? ' scale(' + s.toFixed(3) + ')' : '')); };

    var layout = function () {
      var cs = getComputedStyle(word), cx = d.createElement('canvas').getContext('2d');
      cx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; cx.direction = 'rtl'; cx.textAlign = 'center';
      var m = cx.measureText(word.textContent), l = m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight, a = m.actualBoundingBoxAscent, ds = m.actualBoundingBoxDescent;
      if (!(l + r > 0) || !(a + ds > 0)) return;
      // קו הבסיס כך שהדיו של המילה ממורכז סביב 320
      var base = Math.round(320 + (a - ds) / 2);
      word.setAttribute('y', base);
      W = { x: 500 - l, y: base - a, w: l + r, h: a + ds };
      var x = W.x, y = W.y, w = W.w, h = W.h;
      P = { x: x - 72, y: y - 66, w: w + 144, h: h + 132 }; pr.forEach(function (e) { rect(e, P); });
      CAP = [[P.x + 30, P.y + 30], [P.x + P.w - 30, P.y + 30], [P.x + 30, P.y + P.h - 30], [P.x + P.w - 30, P.y + P.h - 30]];
      caps.forEach(function (g, i) { capAt(g, i); });
      S = { x: x - 36, y: y - 30, w: w + 72, h: h + 60 }; rect(sheet, S);
      // שרטוט: רוחב מעל, גובה משמאל, וחץ לחומר מתחת
      var fs = parseFloat(getComputedStyle(lb[0]).fontSize) || 23, yw = y - 46, xh = x - 46, mx = x + w * .27, my = y + h * .8, ly = y + h + 44;
      dl[0].setAttribute('d', 'M' + x.toFixed(1) + ' ' + yw + 'H' + (x + w).toFixed(1) + 'M' + x.toFixed(1) + ' ' + (yw - 9) + 'v18M' + (x + w).toFixed(1) + ' ' + (yw - 9) + 'v18');
      dl[1].setAttribute('d', 'M' + xh.toFixed(1) + ' ' + y.toFixed(1) + 'V' + (y + h).toFixed(1) + 'M' + (xh - 9).toFixed(1) + ' ' + y.toFixed(1) + 'h18M' + (xh - 9).toFixed(1) + ' ' + (y + h).toFixed(1) + 'h18');
      dl[2].setAttribute('d', 'M' + (mx - 6).toFixed(1) + ' ' + my.toFixed(1) + 'h12M' + mx.toFixed(1) + ' ' + my.toFixed(1) + 'V' + ly.toFixed(1));
      dl.forEach(function (e) { var n = Math.ceil(e.getTotalLength ? e.getTotalLength() : 800) + 2; e._len = n; e.setAttribute('stroke-dasharray', n + ' ' + n); });
      lb[0].setAttribute('x', (x + w / 2).toFixed(1)); lb[0].setAttribute('y', (yw - 16).toFixed(1));
      var hx = xh - 16, hy = y + h / 2;
      lb[1].setAttribute('x', hx.toFixed(1)); lb[1].setAttribute('y', hy.toFixed(1)); lb[1].setAttribute('transform', 'rotate(-90 ' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ')');
      lb[2].setAttribute('x', mx.toFixed(1)); lb[2].setAttribute('y', (ly + fs * 1.1).toFixed(1));
      // הדמיה: פינות של עינית סביב השלט
      var F = { x: x - 52, y: y - 46, w: w + 104, h: h + 92 }, c = 34, X2 = F.x + F.w, Y2 = F.y + F.h;
      var cd = [[F.x, F.y + c, F.x, F.y, F.x + c, F.y], [X2 - c, F.y, X2, F.y, X2, F.y + c], [F.x, Y2 - c, F.x, Y2, F.x + c, Y2], [X2 - c, Y2, X2, Y2, X2, Y2 - c]];
      corners.forEach(function (e, i) { var q = cd[i].map(function (v) { return v.toFixed(1); }); e.setAttribute('d', 'M' + q[0] + ' ' + q[1] + 'L' + q[2] + ' ' + q[3] + 'L' + q[4] + ' ' + q[5]); });
      lz.forEach(function (e) { e.setAttribute('y', (S.y - 26).toFixed(1)); e.setAttribute('height', (S.h + 52).toFixed(1)); });
      glint.setAttribute('y', P.y.toFixed(1)); glint.setAttribute('height', P.h.toFixed(1));
      out.setAttribute('stroke-dasharray', OUT + ' ' + OUT);
      // מסגרת הציור צמודה לתוכן ושומרת אותו במרכז, כדי שבטלפון השלט יהיה גדול ככל האפשר
      var half = Math.max(500 - (hx - fs), P.x + P.w + 30 - 500) + 16, vy = Math.min(yw - 16 - fs, P.y) - 18, vb = Math.max(ly + fs * 1.4, P.y + P.h + 40) + 14;
      svg.setAttribute('viewBox', (500 - half).toFixed(1) + ' ' + vy.toFixed(1) + ' ' + (2 * half).toFixed(1) + ' ' + (vb - vy).toFixed(1));
      ok.parentNode.style.setProperty('--okt', ((Y2 - vy) / (vb - vy) * 100).toFixed(2) + '%');
    };

    var render = function (p) {
      last = p;
      var k, op = function (e, v) { e.style.opacity = v.toFixed(3); };
      // 1. שרטוט: רשת, קו המתאר נמשך, ואז המידות
      op(grid, (1 - .65 * seg(p, .26, .34)) * (1 - seg(p, .5, .58)));
      out.style.strokeDashoffset = (OUT * (1 - ease(seg(p, 0, .2)))).toFixed(1);
      op(out, (1 - .75 * seg(p, .28, .4)) * (1 - seg(p, .5, .56)));
      op(dims, (p > .09 ? 1 : 0) * (1 - seg(p, .26, .32)));
      k = ease(seg(p, .1, .22)); dl.forEach(function (e) { e.style.strokeDashoffset = (e._len * (1 - k)).toFixed(1); });
      k = seg(p, .16, .24); lb.forEach(function (e) { op(e, k); });
      // 2. הדמיה: המילה מתמלאת בצבע, עינית סביבה, והלוחית "ההדמיה אושרה"
      op(flat, seg(p, .28, .4) * (1 - seg(p, .52, .58)));
      op(frame, seg(p, .3, .38) * (1 - seg(p, .5, .54)));
      frame.style.transform = 'scale(' + (1.06 - .06 * ease(seg(p, .3, .4))).toFixed(4) + ')';
      k = seg(p, .38, .46) * (1 - seg(p, .5, .54));
      ok.style.opacity = k.toFixed(3); ok.style.visibility = k > 0 ? 'visible' : 'hidden';
      ok.style.transform = 'translateY(' + ((1 - ease(seg(p, .38, .46))) * 10).toFixed(1) + 'px)';
      // 3. ייצור: גיליון עם קו חיתוך, והלייזר עובר מימין לשמאל. מה שמימינו כבר אות עם דופן
      op(sheet, seg(p, .52, .58)); op(scribe, seg(p, .55, .6));
      var cut = p < .58 ? S.x + S.w + 40 : S.x + S.w - S.w * ease(seg(p, .58, .72));
      doneR.setAttribute('x', cut.toFixed(1)); doneR.setAttribute('width', Math.max(0, 1000 - cut).toFixed(1));
      rawR.setAttribute('width', Math.max(0, cut).toFixed(1));
      op(laser, seg(p, .56, .58) * (1 - seg(p, .72, .74)));
      laser.setAttribute('transform', 'translate(' + cut.toFixed(1) + ' 0)');
      spark.setAttribute('cy', (W.y + W.h * (.5 + .42 * Math.sin(p * 260))).toFixed(1));
      // 4. התקנה: לוח הזכוכית, הצל נצמד לקיר כשהשלט מתקרב אליו, ארבעה ברגים, והאור נדלק
      k = ease(seg(p, .76, .84)); op(panel, k); panel.style.transform = 'scale(' + (.94 + .06 * k).toFixed(4) + ')';
      k = ease(seg(p, .78, .88)); op(cast, k); cast.style.transform = 'translate(' + ((1 - k) * 18).toFixed(1) + 'px,' + ((1 - k) * 24).toFixed(1) + 'px)';
      caps.forEach(function (g, i) {
        var t0 = .83 + .028 * ORDER.indexOf(i), r = seg(p, t0 + .015, t0 + .065);
        op(g, seg(p, t0, t0 + .012)); capAt(g, i, 1.35 - .35 * ease(seg(p, t0, t0 + .03)));
        rings[i].setAttribute('r', (13 + 26 * r).toFixed(1)); op(rings[i], r > 0 && r < 1 ? .9 * (1 - r) : 0);
      });
      // ההילה נראית רק בתאורת ערב, ולכן ההבהוב שלה נכתב רק שם
      k = seg(p, .9, .98);
      if (d.documentElement.dataset.light === 'evening') halo.style.setProperty('--hl', (p < .9 ? 0 : k < .3 ? k / .3 * .85 : k < .42 ? .85 - (k - .3) / .12 * .75 : k < .56 ? .1 + (k - .42) / .14 * .9 : 1).toFixed(3));
      else halo.style.removeProperty('--hl');
      k = seg(p, .92, 1); glint.setAttribute('x', (P.x - 160 + (P.w + 160) * ease(k)).toFixed(1)); op(glint, k > 0 && k < 1 ? 1 : 0);
      var i = Math.min(3, Math.floor(p * 4));
      if (i !== on) { on = i; steps.forEach(function (s, j) { s.classList.toggle('is-on', j === i); }); }
    };

    var reset = function () {
      live = false; on = -1; sec.classList.remove('gsap-live');
      [grid, out, flat, sheet, scribe, frame, dims, laser, panel, cast, glint, ok].concat(dl, lb, caps, rings).forEach(function (e) { e.removeAttribute('style'); });
      halo.style.removeProperty('--hl');
      doneR.setAttribute('x', 0); doneR.setAttribute('width', 1000); rawR.setAttribute('width', 0);
      laser.removeAttribute('transform'); glint.setAttribute('x', -160);
      caps.forEach(function (g, i) { capAt(g, i); }); rings.forEach(function (r) { r.setAttribute('r', 13); });
      steps.forEach(function (s) { s.classList.remove('is-on'); });
    };

    var fit = function () { layout(); if (live) render(last); };
    fit();
    if (d.fonts) { var cs0 = getComputedStyle(word); d.fonts.load(cs0.fontWeight + ' 150px ' + cs0.fontFamily, word.textContent).then(fit, fit); d.fonts.ready.then(fit); }
    return { list: sec.querySelector('.wy-steps'), stage: sec.querySelector('.wy-stage'), render: render, reset: reset,
      start: function () { live = true; sec.classList.add('gsap-live'); render(0); } };
  })();

  /* ---------- עבודות: לוחות לאורך הקיר. הלוח שהכי קרוב לאמצע המסך מתרומם מהקיר (--l), וההשתקפות והצילום זזים לפי המרחק שלו מהאמצע (--d).
     בדסקטופ הגלילה מזיזה את המסילה (ב-motion), עד 1023 גוללים אותה באצבע. בלי תנועה כל הלוחות דולקים, והמונה והפס עדיין עוקבים ---------- */
  var works = (function () {
    var sc = d.querySelector('[data-works]'); if (!sc) return null;
    var view = sc.querySelector('.wk-view'), track = sc.querySelector('.wk-track'), its = [].slice.call(track.children);
    var num = sc.querySelector('.wk-i'), nm = sc.querySelector('.wk-nm'), rail = sc.querySelector('.wk-rail');
    var names = its.map(function (li) { var b = li.querySelector('.wt b'); return b ? b.textContent : ''; });
    var last = its.length - 2, on = 0, raf = 0, wd = 0;
    var lift = function (p) {
      raf = 0;
      var vw = innerWidth, flat = still() || (vw >= 1024 && !sc.classList.contains('gsap-live')), near = 0, nd = 9;
      its.forEach(function (li, i) {
        var r = li.getBoundingClientRect(), dd = (r.left + r.width / 2 - vw / 2) / (vw * .45), a = Math.min(1, Math.abs(dd));
        if (i <= last) { // כרטיס הסיום לא מתרומם ואין בו צילום שזז
          li.style.setProperty('--l', flat ? 1 : (1 - a * a * (3 - 2 * a)).toFixed(3));
          li.style.setProperty('--d', flat ? 0 : clamp(dd, -1.2, 1.2).toFixed(3));
        }
        if (Math.abs(dd) < nd) { nd = Math.abs(dd); near = i; }
      });
      near = Math.min(near, last);
      if (near !== on) { on = near; num.textContent = (near < 9 ? '0' : '') + (near + 1); nm.textContent = names[near]; }
      if (p == null) { var mx = view.scrollWidth - view.clientWidth; p = mx > 0 ? Math.abs(view.scrollLeft) / mx : 0; }
      rail.style.setProperty('--wp', (.12 + .88 * clamp(p, 0, 1)).toFixed(3));
    };
    var ask = function () { if (!raf) raf = requestAnimationFrame(function () { lift(); }); };
    view.addEventListener('scroll', ask, { passive: true });
    w.addEventListener('resize', ask);
    w.addEventListener('load', ask);
    lift();
    // הגובה נמדד לפני כל רענון של ScrollTrigger, כשהמסילה עדיין במקום. המסלול עד שני מסכים, כדי שהעמוד לא ירגיש תקוע
    var size = function () { wd = Math.max(0, track.scrollWidth - view.clientWidth); sc.style.height = Math.round(innerHeight + Math.min(wd * 1.1, innerHeight * 2)) + 'px'; };
    return { sc: sc, track: track, lift: lift, dist: function () { return wd; },
      start: function () { sc.classList.add('gsap-live'); size(); ScrollTrigger.addEventListener('refreshInit', size); },
      reset: function () { sc.classList.remove('gsap-live'); sc.style.height = ''; ScrollTrigger.removeEventListener('refreshInit', size); lift(); } };
  })();

  /* ---------- כניסה להדמיה: לפני ואחרי. גוררים את הקו (עכבר או אצבע), או חיצים על הטווח המוסתר.
     כשרוב התמונה על המסך הקו נכנס מימין ועוצר באמצע הלוגו, כדי שיהיה ברור שאפשר לגרור ---------- */
  var cmp = d.querySelector('.cmp');
  if (cmp) {
    var rg = cmp.querySelector('.cmp-range'), END = parseFloat(getComputedStyle(cmp).getPropertyValue('--end')) || 30, sweep = 0, dragging = false;
    // cut הוא המרחק של הקו מהקצה השמאלי באחוזים; הטווח סופר כמה מהקיר מוצג עם השלט
    var setCut = function (c) {
      c = Math.max(0, Math.min(100, c));
      cmp.style.setProperty('--cut', c + '%');
      var v = Math.round(100 - c);
      rg.value = v; rg.setAttribute('aria-valuetext', v + ' אחוז מהקיר עם השלט');
      cmp.classList.toggle('is-b-off', c < 12);
      cmp.classList.toggle('is-a-off', c > 88);
    };
    var stop = function () { if (sweep) { cancelAnimationFrame(sweep); sweep = 0; } };
    var at = function (e) { var r = cmp.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    cmp.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      stop(); dragging = true; cmp.classList.add('is-drag');
      try { cmp.setPointerCapture(e.pointerId); } catch (x) {}
      setCut(at(e));
    });
    cmp.addEventListener('pointermove', function (e) { if (dragging) setCut(at(e)); });
    var up = function () { dragging = false; cmp.classList.remove('is-drag'); };
    cmp.addEventListener('pointerup', up); cmp.addEventListener('pointercancel', up);
    rg.addEventListener('input', function () { stop(); setCut(100 - rg.value); });
    if (still() || !('IntersectionObserver' in w)) setCut(END);
    else {
      setCut(100);
      var cmpo = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        cmpo.disconnect();
        var t0 = 0, dur = 1700;
        var step = function (t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          setCut(100 + (END - 100) * e);
          sweep = k < 1 ? requestAnimationFrame(step) : 0;
        };
        sweep = requestAnimationFrame(step);
      }, { threshold: .55 });
      cmpo.observe(cmp);
    }
  }

  /* ---------- שאלות: הגובה של התשובה נפתח ונסגר ברכות (WAAPI), והתשובה עולה מתוכו. בלי תנועה, הפתיחה הרגילה של הדפדפן ---------- */
  d.querySelectorAll('details.fq').forEach(function (el) {
    var sum = el.querySelector('summary'), anim = null, to = null;
    var done = function () { el.open = to; anim = null; to = null; el.classList.remove('is-anim', 'is-shut'); el.style.height = ''; };
    var run = function (a, b) {
      if (anim) anim.cancel();
      anim = el.animate({ height: [a + 'px', b + 'px'] }, { duration: clamp(Math.abs(b - a) * 1.8, 440, 680), easing: 'cubic-bezier(.22,.61,.36,1)' });
      anim.onfinish = done;
    };
    sum.addEventListener('click', function (e) {
      if (still() || !el.animate) return;
      e.preventDefault();
      var h = el.offsetHeight;
      el.classList.add('is-anim');
      if (to === false || !el.open) {
        // פותחים: הגובה הנוכחי נשמר, התוכן נכנס לדום, ואז מודדים את הגובה הפתוח
        to = true; el.style.height = h + 'px'; el.open = true; el.classList.add('is-shut');
        el.style.height = ''; var full = el.offsetHeight; el.style.height = h + 'px';
        requestAnimationFrame(function () { el.classList.remove('is-shut'); });
        run(h, full);
      } else {
        to = false; el.classList.add('is-shut');
        run(h, sum.offsetHeight);
      }
    });
  });

  /* ---------- סצנות גלילה (GSAP) ---------- */
  var scenes = [];
  function motion() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || QA) return;
    gsap.registerPlugin(ScrollTrigger);
    html.classList.add('gsap-live');
    try { history.scrollRestoration = 'manual'; } catch (e) {}
    var mm = gsap.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', md: '(min-width: 768px)', lg: '(min-width: 1024px)' }, function (ctx) {
      var c = ctx.conditions;
      if (!c.ok || html.classList.contains('a11y-nomotion')) return;
      // ההירו: השלט מסתובב אל הצופה ויורד לאט, הטקסט נסוג
      if (hero && heroRig) {
        var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .6 } });
        tl.to(heroRig, { '--ry': -4, '--rx': 1, ease: 'none' }, 0)
          // בטלפון התנועה קצרה יותר: השלט והטקסט נערמים זה על זה, ולכן הם לא נפגשים גם בסוף היציאה
          .to('.hero-sign', { yPercent: c.md ? 22 : 12, ease: 'none' }, 0)
          .to('.hero-copy', { yPercent: c.md ? -10 : -5, opacity: .2, ease: 'none' }, 0)
          .to('.hero-glow', { opacity: .55, ease: 'none' }, 0);
      }
      // ספק אחד: הגלילה מעבירה שלט אחד את כל הדרך. כל רבע היא נקודה אחת, והיא מתחילה כשהנקודה מגיעה לאמצע השטח הפנוי
      if (why && why.list) {
        why.start();
        var wl = why.list, wo = { p: 0 };
        var wcy = function () { var V = innerHeight; return c.lg ? V / 2 : (Math.min(V, 76 + why.stage.offsetHeight) + V) / 2; };
        gsap.to(wo, { p: 1, ease: 'none', onUpdate: function () { why.render(wo.p); },
          scrollTrigger: { trigger: wl, scrub: .6, invalidateOnRefresh: true,
            start: function () { return 'top ' + Math.round(wcy() - parseFloat(getComputedStyle(wl).paddingTop)) + 'px'; },
            end: function () { return 'bottom ' + Math.round(wcy() + parseFloat(getComputedStyle(wl).paddingBottom)) + 'px'; } } });
      }
      // עבודות, MV:G1: הסקשן נעוץ, והגלילה מעבירה את הלוחות לאורך הקיר. גובה הסקשן הוא המרחק שהמסילה עוברת
      if (works && c.lg) {
        works.start();
        gsap.to(works.track, { x: works.dist, ease: 'none', onUpdate: function () { works.lift(this.progress()); },
          scrollTrigger: { trigger: works.sc, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true } });
      }
      // העיגול נעוץ, והגלילה מקיפה אותו: כל רבע הוא שלב
      if (circle && c.lg) {
        circle.el.classList.add('gsap-live');
        var co = { p: 0 };
        var tc = gsap.to(co, { p: 1, ease: 'none', scrollTrigger: { trigger: circle.el, start: 'top top', end: 'bottom bottom', scrub: .4 },
          onUpdate: function () { circle.draw(co.p); circle.set(Math.min(3, Math.floor(co.p * 4))); } });
        circle.st = tc.scrollTrigger;
        circle.draw(0);
      }
      return function () {
        d.querySelectorAll('.pc').forEach(function (e) { e.classList.remove('gsap-live'); });
        if (works) works.reset();
        if (circle) { circle.st = null; circle.set(0); circle.draw(.125); }
        if (why) why.reset();
      };
    });
    scenes.push(mm);
    w.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (d.readyState === 'complete' || d.readyState === 'interactive') motion(); else d.addEventListener('DOMContentLoaded', motion);


  /* ---------- נסו על השם שלכם ---------- */
  (function configurator() {
    var form = d.getElementById('cfg-form'); if (!form) return;
    var stage = d.getElementById('cfg-stage'), rig = d.getElementById('cfg-rig'), sign = d.getElementById('cfg-sign');
    var face = sign.querySelector('.s-face'), halo = sign.querySelector('.s-halo'), cast = sign.querySelector('.s-cast');
    var nameIn = d.getElementById('cfg-name'), fileIn = d.getElementById('cfg-logo'), clearBtn = d.getElementById('cfg-logo-clear');
    var depth = d.getElementById('cfg-depth'), depthOut = d.getElementById('cfg-depth-out'), depthLbl = d.getElementById('cfg-depth-lbl');
    var custom = d.getElementById('cfg-custom'), customSw = d.getElementById('cfg-custom-sw');
    var evening = d.getElementById('cfg-evening'), send = d.getElementById('cfg-send'), live = d.getElementById('cfg-live');
    var toneSet = d.getElementById('cfg-tone');
    var S = { logo: null, logoRatio: 1, ry: -16, eveningTouched: false };
    var MAT = { alu: { name: 'אלומיניום בנוי', unit: 'ס״מ', min: 2, max: 12, def: 6, cm: 1, lbl: 'עומק הדופן' }, pvc: { name: 'PVC מוקצף', unit: 'מ״מ', min: 6, max: 30, def: 19, cm: .1, lbl: 'עובי' } };
    var COLOR = { '#1F2328': 'שחור', '#F2F1EC': 'לבן', '#B9C0C6': 'נירוסטה', '#C9A45C': 'פליז' };
    var LIGHT = { none: 'בלי תאורה', front: 'תאורה פנימית', halo: 'הילה אחורית' };
    var TONE = { white: ['לבן', '232,244,255', '200,226,255', '150,196,245'], warm: ['לבן חם', '255,226,176', '255,190,110', '240,150,60'], cyan: ['תכלת', '190,240,255', '76,203,245', '26,163,218'] };
    var WALL = { plaster: 'טיח לבן', concrete: 'בטון', wood: 'עץ', dark: 'חיפוי כהה' };
    var val = function (n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };

    function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
    function mix(c, k, to) { var a = hex(c), b = to ? hex(to) : [0, 0, 0]; return 'rgb(' + a.map(function (v, i) { return Math.round(v * k + b[i] * (1 - k)); }).join(',') + ')'; }
    function faceFor(c) {
      if (c === '#B9C0C6') return 'repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0 1px, rgba(0,0,0,0) 1px 3px), linear-gradient(180deg, #EEF1F3 0%, #A9B0B7 55%, #D6DADE 100%)';
      if (c === '#C9A45C') return 'linear-gradient(180deg, #F3DDA6 0%, #B98D3E 55%, #E4C47F 100%)';
      if (c === '#1F2328') return 'linear-gradient(180deg, #3A4048 0%, #1F2328 50%, #16191D 100%)';
      return 'linear-gradient(180deg, ' + mix(c, .78, '#ffffff') + ' 0%, ' + c + ' 55%, ' + mix(c, .85) + ' 100%)';
    }
    function color() { var v = val('color'); return v === 'custom' ? custom.value.toUpperCase() : v; }

    // מתאים את הגודל לבמה: שם בגולן, או לוגו לפי היחס שלו
    var meas = d.createElement('span'); meas.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:600 100px/1 GSD, GS, sans-serif;inset-inline-start:-9999px;top:0';
    d.body.appendChild(meas);
    function fit(text) {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (S.logo) { var hh = Math.min(H * .42, W * .62 / S.logoRatio); return hh; }
      meas.textContent = text; var w100 = meas.offsetWidth || 300;
      return Math.max(28, Math.min(W * .72 / w100 * 100, H * .34));
    }

    function render() {
      var m = MAT[val('mat')] || MAT.alu, c = color(), light = val('light'), tone = TONE[val('tone')] || TONE.white, wall = val('wall');
      var text = (nameIn.value || '').trim() || 'השם שלכם';
      // פקדים תלויים: תאורה פנימית רק באלומיניום בנוי; גוון האור רק כשיש אור
      var front = form.querySelector('input[name="light"][value="front"]');
      front.disabled = val('mat') === 'pvc';
      if (front.disabled && light === 'front') { form.querySelector('input[name="light"][value="halo"]').checked = true; light = 'halo'; }
      toneSet.disabled = light === 'none'; toneSet.style.opacity = light === 'none' ? '.45' : '';
      if (!S.eveningTouched) evening.checked = light !== 'none';
      d.getElementById('cfg-colors').disabled = !!S.logo;

      stage.dataset.wall = wall;
      stage.classList.toggle('is-evening', evening.checked);

      var fs = fit(text), cap = S.logo ? fs : fs * .72, realH = S.logo ? 60 : 40;
      var depthPx = cap * (depth.value * m.cm) / realH, n = clamp(Math.round(depthPx / 1.1), 2, 26), step = depthPx / n;
      sign.style.setProperty('--fs-sign', fs.toFixed(1) + 'px');
      sign.style.setProperty('--step', step.toFixed(3));
      sign.style.setProperty('--so', light === 'halo' ? Math.max(8, cap * .08).toFixed(1) : (val('mat') === 'pvc' ? 3 : 1.5));
      sign.style.setProperty('--lit', light === 'halo' ? 1 : 0);
      sign.style.setProperty('--off', 1); sign.style.setProperty('--d', 1);
      sign.style.setProperty('--halo', tone[1]); sign.style.setProperty('--halo2', tone[2]); sign.style.setProperty('--halo3', tone[3]);
      var lightWall = wall === 'plaster' || wall === 'concrete';
      sign.style.setProperty('--cast', evening.checked ? 'rgba(0,0,0,.25)' : (lightWall ? 'rgba(10,12,14,.5)' : 'rgba(0,0,0,.6)'));

      var sideA = S.logo ? '#3A3F46' : (c === '#1F2328' ? '#30353C' : mix(c, .8)), sideB = S.logo ? '#15181B' : (c === '#1F2328' ? '#0E1013' : mix(c, .42));
      var sideAt = function (t) { var a = hex(rgbHex(sideA)), b = hex(rgbHex(sideB)); return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; };

      if (S.logo) {
        sign.classList.add('is-logo'); sign.style.setProperty('--sil', 'url(' + S.logo + ')');
        sign.style.width = (fs * S.logoRatio).toFixed(1) + 'px'; sign.style.height = fs.toFixed(1) + 'px';
        face.style.backgroundImage = 'none'; face.style.filter = ''; face.innerHTML = '<img class="s-logo" alt="" src="' + S.logo + '">';
        layer(sign, n, sideAt, function (s) { s.classList.add('s-mask'); });
        halo.dataset.t = cast.dataset.t = ''; halo.innerHTML = cast.innerHTML = '<i class="s-sil"></i>';
        face.querySelector('img').style.filter = light === 'front' ? 'brightness(1.25) drop-shadow(0 0 ' + (fs * .05).toFixed(0) + 'px rgba(' + tone[1] + ',.9))' : '';
      } else {
        sign.classList.remove('is-logo'); sign.style.removeProperty('--sil'); sign.style.width = sign.style.height = '';
        face.innerHTML = ''; face.textContent = text; halo.innerHTML = cast.innerHTML = ''; halo.dataset.t = cast.dataset.t = text;
        if (light === 'front') {
          face.style.backgroundImage = 'linear-gradient(180deg, #ffffff 0%, ' + mix(rgbHex('rgb(' + tone[1] + ')'), .9, '#ffffff') + ' 100%)';
          face.style.textShadow = '';
          face.style.filter = 'drop-shadow(0 0 ' + (fs * .04).toFixed(0) + 'px rgba(' + tone[1] + ',.95)) drop-shadow(0 0 ' + (fs * .14).toFixed(0) + 'px rgba(' + tone[2] + ',.55))';
        } else { face.style.backgroundImage = faceFor(c); face.style.filter = ''; }
        layer(sign, n, sideAt);
      }
      describe(m, c, light, tone, wall, text);
    }
    function rgbHex(c) { if (c.charAt(0) === '#') return c; var m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(function (v) { return (+v).toString(16).padStart(2, '0'); }).join(''); }

    var tLive;
    function describe(m, c, light, tone, wall, text) {
      var cn = S.logo ? 'בצבעי הלוגו' : (COLOR[c] || 'גוון ' + c);
      var lt = light === 'none' ? LIGHT.none : LIGHT[light] + ', ' + tone[0];
      var who = S.logo ? 'הלוגו שלנו (אשלח אותו כאן)' : '"' + text + '"';
      var msg = 'היי שלום, ניסיתי באתר את השלט שלנו:\nשלט: ' + who + '\nחומר: ' + m.name + ', ' + (m.cm === 1 ? 'דופן ' : 'עובי ') + depth.value + ' ' + m.unit + '\nגוון: ' + cn + '\nתאורה: ' + lt + '\nקיר: ' + WALL[wall] + '\nאשמח להדמיה על הקיר שלנו. אשלח צילום של הקיר.';
      send.href = WA(msg);
      clearTimeout(tLive);
      tLive = setTimeout(function () { live.textContent = 'השלט עכשיו: ' + (S.logo ? 'הלוגו שהעליתם' : text) + ', ' + m.name + ', ' + depth.value + ' ' + m.unit + ', ' + cn + ', ' + lt + ', על ' + WALL[wall] + '.'; }, 600);
    }

    function setMat() {
      var m = MAT[val('mat')] || MAT.alu;
      depth.min = m.min; depth.max = m.max; depth.value = m.def; depthLbl.textContent = m.lbl;
      depthOut.textContent = depth.value + ' ' + m.unit;
    }
    nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); nameIn.blur(); } });
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.name === 'mat') setMat();
      if (t === depth) depthOut.textContent = depth.value + ' ' + (MAT[val('mat')] || MAT.alu).unit;
      if (t === evening) S.eveningTouched = true;
      if (t === custom) { customSw.style.setProperty('--sw', custom.value); form.querySelector('input[name="color"][value="custom"]').checked = true; }
      if (t.name === 'color' && t.value === 'custom' && e.isTrusted) { try { custom.showPicker ? custom.showPicker() : custom.click(); } catch (er) { custom.click(); } }
      if (t !== fileIn) render();
    });
    form.addEventListener('change', function (e) { if (e.target === custom) render(); });

    // לוגו: רקע לבן הופך לשקוף, וחותכים לגבולות הציור
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0]; if (!f || !/^image\//.test(f.type)) return;
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 900 / Math.max(img.naturalWidth || 600, img.naturalHeight || 600));
        var cw = Math.max(1, Math.round((img.naturalWidth || 600) * k)), ch = Math.max(1, Math.round((img.naturalHeight || 300) * k));
        var cv = d.createElement('canvas'); cv.width = cw; cv.height = ch; var x = cv.getContext('2d'); x.drawImage(img, 0, 0, cw, ch);
        var data = x.getImageData(0, 0, cw, ch), p = data.data, bg = [p[0], p[1], p[2]], opaque = p[3] > 250 && p[p.length - 1] > 250;
        var minX = cw, minY = ch, maxX = 0, maxY = 0;
        for (var y = 0; y < ch; y++) for (var xx = 0; xx < cw; xx++) {
          var i = (y * cw + xx) * 4;
          if (opaque) { var dd = Math.abs(p[i] - bg[0]) + Math.abs(p[i + 1] - bg[1]) + Math.abs(p[i + 2] - bg[2]); if (dd < 48) p[i + 3] = 0; else if (dd < 90) p[i + 3] = Math.round(p[i + 3] * (dd - 48) / 42); }
          if (p[i + 3] > 24) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
        if (maxX <= minX || maxY <= minY) return;
        x.putImageData(data, 0, 0);
        var out = d.createElement('canvas'); out.width = maxX - minX + 1; out.height = maxY - minY + 1;
        out.getContext('2d').drawImage(cv, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        S.logo = out.toDataURL('image/png'); S.logoRatio = out.width / out.height; clearBtn.hidden = false; render(); URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    });
    clearBtn.addEventListener('click', function () { S.logo = null; fileIn.value = ''; clearBtn.hidden = true; render(); nameIn.focus(); });

    // גרירה מסובבת את השלט
    var drag = null;
    stage.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, ry: S.ry }; stage.classList.add('dragging'); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
    stage.addEventListener('pointermove', function (e) { if (!drag) return; S.ry = clamp(drag.ry - (e.clientX - drag.x) * .18, -38, 38); rig.style.setProperty('--ry', S.ry.toFixed(1)); });
    var end = function () { drag = null; stage.classList.remove('dragging'); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

    if ('ResizeObserver' in w) { var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(render, 80); }).observe(stage); }
    var start = function () { setMat(); render(); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(start); else start();
  })();

  /* ---------- נגישות ---------- */
  (function a11y() {
    var link = d.querySelector('.a11y-btn'); if (!link) return;
    var opts = [['bigger', 'הגדלת טקסט'], ['smaller', 'הקטנת טקסט'], ['contrast', 'ניגודיות גבוהה'], ['invert', 'היפוך צבעים'], ['gray', 'גווני אפור'],
      ['links', 'הדגשת קישורים'], ['font', 'גופן קריא'], ['spacing', 'ריווח טקסט'], ['nomotion', 'עצירת אנימציות'], ['cursor', 'סמן גדול'], ['guide', 'קו קריאה'], ['reset', 'איפוס']];
    var state = {}; try { state = JSON.parse(localStorage.getItem('plomba-a11y') || '{}'); } catch (e) {}
    var scale = state.scale || 1;
    var panel = d.createElement('div'); panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'הגדרות נגישות');
    panel.innerHTML = '<header><span>נגישות</span><button type="button" class="a11y-close" aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></header><div class="list">' +
      opts.map(function (o) { return '<button type="button" data-a11y="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join('') +
      '</div><footer><span>ת"י 5568</span></footer>';
    d.body.appendChild(panel);
    var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'a11y-btn'; btn.setAttribute('aria-label', 'פתיחת תפריט נגישות'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = link.innerHTML; link.replaceWith(btn);
    function apply() {
      html.style.setProperty('--a11y-scale', scale);
      ['contrast', 'invert', 'gray', 'links', 'font', 'spacing', 'nomotion', 'cursor', 'guide'].forEach(function (k) { html.classList.toggle('a11y-' + k, !!state[k]); });
      panel.querySelectorAll('[data-a11y]').forEach(function (b) { var k = b.getAttribute('data-a11y'); if (k in state) b.setAttribute('aria-pressed', state[k] ? 'true' : 'false'); });
      if (state.nomotion && w.ScrollTrigger) { scenes.forEach(function (m) { m.revert(); }); scenes = []; ScrollTrigger.getAll().forEach(function (t) { t.kill(true); }); }
      try { state.scale = scale; localStorage.setItem('plomba-a11y', JSON.stringify(state)); } catch (e) {}
    }
    function open(o) { panel.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) panel.querySelector('button[data-a11y]').focus(); else btn.focus(); }
    btn.addEventListener('click', function () { open(!panel.classList.contains('is-open')); });
    panel.querySelector('.a11y-close').addEventListener('click', function () { open(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) open(false); });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a11y]'); if (!b) return; var k = b.getAttribute('data-a11y');
      if (k === 'bigger') scale = Math.min(1.6, +(scale + .15).toFixed(2));
      else if (k === 'smaller') scale = Math.max(.85, +(scale - .15).toFixed(2));
      else if (k === 'reset') { state = {}; scale = 1; }
      else state[k] = !state[k];
      apply();
    });
    d.addEventListener('mousemove', function (e) { if (state.guide) html.style.setProperty('--a11y-guide-y', (e.clientY - 5) + 'px'); });
    var a11yq = q.get('a11y'); if (a11yq) a11yq.split(',').forEach(function (k) { if (k === 'open') open(true); else state[k] = true; });
    apply();
  })();
})();

/* עבודות: סינון (?cat=) ותצוגה מוגדלת עם וואטסאפ על העבודה */
(function () {
  var d = document, grid = d.getElementById('pj-grid');
  if (!grid) return;
  var items = [].slice.call(grid.children), btns = [].slice.call(d.querySelectorAll('.fl')), live = d.getElementById('pj-live');
  function setF(f, push) {
    if (!btns.some(function (b) { return b.dataset.f === f; })) f = 'all';
    var n = 0;
    items.forEach(function (li) { var on = f === 'all' || li.dataset.c === f; li.hidden = !on; if (on) n++; });
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.f === f ? 'true' : 'false'); });
    if (live && push) live.textContent = 'מוצגות ' + n + ' עבודות';
    if (push) history.replaceState(null, '', f === 'all' ? location.pathname : '?cat=' + f);
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setF(b.dataset.f, true); }); });
  setF(new URLSearchParams(location.search).get('cat') || 'all', false);
  var lb = d.getElementById('lb');
  if (!lb || !lb.showModal) return;
  var img = lb.querySelector('img'), cap = lb.querySelector('.lb-c'), wa = lb.querySelector('.lb-wa'), from;
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.pj-b'); if (!b) return;
    var im = b.querySelector('img'), name = b.parentNode.querySelector('.pj-c').textContent;
    from = b; img.src = b.dataset.full; img.alt = im.alt; cap.textContent = name;
    wa.href = 'https://wa.me/972502222155?text=' + encodeURIComponent('היי שלום, ראיתי באתר את העבודה ל' + name + ' ואשמח למשהו דומה. מצרף צילום של הקיר.');
    lb.showModal();
  });
  lb.querySelector('.lb-x').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', function () { if (from) from.focus(); });
})();
