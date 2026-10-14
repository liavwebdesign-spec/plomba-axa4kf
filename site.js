/* פלומבה v14 · הדר hd9, שלט תלת ממד (h5), זרקור על הלקוחות (g138), נסו על השם שלכם, נגישות */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  w.__plomba = true;
  var q = new URLSearchParams(location.search);
  var QA = html.classList.contains('qa');
  var mqRM = w.matchMedia('(prefers-reduced-motion: reduce)');
  var FINE = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var still = function () { return QA || mqRM.matches || html.classList.contains('a11y-nomotion'); };
  var WA = function (t) { return 'https://wa.me/972502222155?text=' + encodeURIComponent(t || 'היי שלום, אשמח להדמיה לשלט.'); };
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

  /* ---------- סצנות גלילה (GSAP) ---------- */
  var scenes = [];
  function motion() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || QA) return;
    gsap.registerPlugin(ScrollTrigger);
    html.classList.add('gsap-live');
    try { history.scrollRestoration = 'manual'; } catch (e) {}
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (html.classList.contains('a11y-nomotion')) return;
      // ההירו: השלט מסתובב אל הצופה ויורד לאט, הטקסט נסוג
      if (hero && heroRig) {
        var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .6 } });
        tl.to(heroRig, { '--ry': -4, '--rx': 1, ease: 'none' }, 0)
          .to('.hero-sign', { yPercent: 22, ease: 'none' }, 0)
          .to('.hero-copy', { yPercent: -10, opacity: .2, ease: 'none' }, 0)
          .to('.hero-glow', { opacity: .55, ease: 'none' }, 0);
      }
      // MV:g90 · אנטומיה של אות: השכבות נפרדות מהקיר, ובכל שלב שכבה אחת מוארת
      var an = d.querySelector('[data-anat]');
      if (an && innerWidth >= 768) {
        var anRig = d.getElementById('an-rig'), anItems = an.querySelectorAll('.an-list li'); an.classList.add('gsap-live');
        var ao = { x: 0, ry: 12, rx: 6 }, aOn = -1;
        var aPut = function () {
          anRig.style.setProperty('--x', ao.x.toFixed(3)); anRig.style.setProperty('--ry', ao.ry.toFixed(2)); anRig.style.setProperty('--rx', ao.rx.toFixed(2));
          var p = ta.progress(), i = p < .2 ? -1 : Math.min(3, Math.floor((p - .2) / .8 * 4));
          if (i !== aOn) { aOn = i; anItems.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
            if (i < 0) anRig.removeAttribute('data-on'); else anRig.setAttribute('data-on', anItems[i].getAttribute('data-part')); }
        };
        var ta = gsap.timeline({ scrollTrigger: { trigger: an, start: 'top top', end: 'bottom bottom', scrub: .6 }, onUpdate: aPut });
        ta.to(ao, { x: 1, ry: 40, rx: 12, duration: 1, ease: 'power2.inOut' }).to(ao, { ry: 28, duration: 4, ease: 'none' });
        aPut();
      }
      // MV:g150 · סיור בבניין: מתקרבים לקומה, והבאה נפתחת כמו דלת
      var tr = d.querySelector('[data-tour]');
      if (tr && innerWidth >= 768) {
        var sc = [].slice.call(tr.querySelectorAll('.tr-scene')), dots = tr.querySelectorAll('.tr-dots li'); tr.classList.add('gsap-live');
        var tt = gsap.timeline({ scrollTrigger: { trigger: tr, start: 'top top', end: 'bottom bottom', scrub: .6 },
          onUpdate: function () { var i = Math.min(sc.length - 1, Math.round(tt.progress() * (sc.length - 1) - .1)); dots.forEach(function (li, k) { li.classList.toggle('is-on', k === Math.max(0, i)); }); } });
        sc.forEach(function (s, i) {
          if (i) { gsap.set(s, { '--ct': '100%', '--cx': '41%', '--cr': '10px' }); gsap.set(s.querySelector('.tr-text > div'), { opacity: 0, y: 40 }); }
        });
        tt.to({}, { duration: .3 });
        sc.forEach(function (s, i) {
          if (!i) return;
          var prev = sc[i - 1], at = '+=0';
          tt.to(prev.querySelector('.tr-text > div'), { opacity: 0, y: -30, duration: .3, ease: 'power1.in' }, at)
            .to(prev, { '--zm': 1.45, duration: 1, ease: 'power1.in' }, '<')
            .to(s, { '--ct': '38%', duration: .45, ease: 'power2.out' }, '<.15')
            .to(s, { '--ct': '0%', '--cx': '0%', '--cr': '0px', duration: .55, ease: 'power2.inOut' })
            .fromTo(s, { '--zm': 1.18 }, { '--zm': 1, duration: .8, ease: 'power2.out' }, '<')
            .to(s.querySelector('.tr-text > div'), { opacity: 1, y: 0, duration: .4, ease: 'power2.out' }, '<.3')
            .set(prev, { visibility: 'hidden' })
            .to({}, { duration: .3 });
        });
        dots[0].classList.add('is-on');
        // מקלדת: פוקוס על קישור בקומה מוסתרת גולל אליה
        sc.forEach(function (s, i) {
          s.addEventListener('focusin', function () {
            var st = tt.scrollTrigger; if (!st) return;
            var y = st.start + (st.end - st.start) * (i / (sc.length - 1));
            if (Math.abs(w.scrollY - y) > 40) w.scrollTo(0, y);
          });
        });
      }
      // MV:g138 · הזרקור נוסע בזיגזג על קיר הלוגואים, ובסוף נפתח על כולו
      var sl = d.querySelector('[data-spot]');
      if (sl) {
        var pin = sl.querySelector('.sl-pin'); sl.classList.add('gsap-live');
        var phone = innerWidth < 768, o = { x: 86, y: 18, r: phone ? 52 : 22 };
        var pts = phone ? [{ x: 20, y: 18 }, { x: 80, y: 42 }, { x: 22, y: 64 }, { x: 78, y: 88 }] : [{ x: 40, y: 22 }, { x: 12, y: 52 }, { x: 62, y: 54 }, { x: 88, y: 84 }, { x: 36, y: 86 }];
        var put = function () { pin.style.setProperty('--sx', o.x + '%'); pin.style.setProperty('--sy', o.y + '%'); pin.style.setProperty('--sr', o.r + 'vw'); };
        var t2 = gsap.timeline({ scrollTrigger: { trigger: sl, start: 'top top', end: 'bottom bottom', scrub: .6 }, onUpdate: put });
        pts.forEach(function (p) { t2.to(o, { x: p.x, y: p.y, duration: 1, ease: 'power1.inOut' }); });
        t2.to(o, { x: 50, y: 52, r: phone ? 140 : 80, duration: 1.2, ease: 'power2.inOut' });
        put();
        return function () { d.querySelectorAll('.an, .tr').forEach(function (e) { e.classList.remove('gsap-live'); }); sl.classList.remove('gsap-live'); ['--sx', '--sy', '--sr'].forEach(function (k) { pin.style.removeProperty(k); }); };
      }
    });
    scenes.push(mm);
    w.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (d.readyState === 'complete' || d.readyState === 'interactive') motion(); else d.addEventListener('DOMContentLoaded', motion);


  /* ---------- אנטומיה: הדופן היא שכבות של אותה אות ---------- */
  var anSide = d.getElementById('an-side');
  if (anSide) { for (var ai = 0; ai < 16; ai++) { var sp = d.createElement('span'); sp.style.setProperty('--i', ai); sp.style.setProperty('--c', 'hsl(208 14% ' + Math.round(70 - ai * 2.6) + '%)'); anSide.appendChild(sp); } }

  /* ---------- MV:g43 · רשימת עבודות: התמונה עוקבת אחרי הסמן ---------- */
  var wl = d.querySelector('[data-works]'), wc = d.querySelector('.wk-cursor');
  if (wl && wc && FINE) {
    var wimg = wc.querySelector('img'), mx = 0, my = 0, cx2 = 0, cy2 = 0, wraf = 0, won = false;
    var wtick = function () {
      var dx = mx - cx2; cx2 += dx * .16; cy2 += (my - cy2) * .16;
      wc.style.setProperty('--mx', cx2.toFixed(1) + 'px'); wc.style.setProperty('--my', cy2.toFixed(1) + 'px');
      wc.style.setProperty('--rot', still() ? '0deg' : clamp(dx * .04, -8, 8).toFixed(2) + 'deg');
      wraf = (won || Math.abs(mx - cx2) > .5 || Math.abs(my - cy2) > .5) ? requestAnimationFrame(wtick) : 0;
    };
    wl.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      var a = e.target.closest('a'); if (!a) return;
      if (!won) { cx2 = mx; cy2 = my; won = true; wc.classList.add('is-on'); }
      if (wimg.getAttribute('src') !== a.getAttribute('data-img')) wimg.src = a.getAttribute('data-img');
      if (!wraf) wraf = requestAnimationFrame(wtick);
    });
    wl.addEventListener('pointerleave', function () { won = false; wc.classList.remove('is-on'); });
    w.addEventListener('scroll', function () { if (won) { won = false; wc.classList.remove('is-on'); } }, { passive: true });
  }

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
    var meas = d.createElement('span'); meas.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:600 100px/1 Golan, GS, sans-serif;inset-inline-start:-9999px;top:0';
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
