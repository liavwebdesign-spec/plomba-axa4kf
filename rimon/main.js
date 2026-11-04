(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* page opening */
  if (!still.matches && window.scrollY < 40) {
    root.classList.add('open-anim');
    setTimeout(function () { root.classList.remove('open-anim'); }, 2500);
  }

  /* reveal */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !still.matches) {
    var groups = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var parent = e.target.parentElement;
        var n = groups.get(parent) || 0;
        groups.set(parent, n + 1);
        e.target.style.setProperty('--d', Math.min(n, 4) * 0.07 + 's');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* header */
  var head = document.querySelector('[data-head]');
  var lastY = window.scrollY;
  var menuOpen = false;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (menuOpen) return;
    if (y < 80 || y < lastY - 4) head.classList.remove('is-away');
    else if (y > lastY + 4) { head.classList.add('is-away'); closeDrop(); }
    lastY = y;
  }, { passive: true });
  head.addEventListener('focusin', function () { head.classList.remove('is-away'); });

  /* sign types menu */
  var drop = document.querySelector('[data-drop]');
  var dropBtn = drop.querySelector('.drop__btn');
  var dropList = drop.querySelector('.drop__list');
  function closeDrop() { dropBtn.setAttribute('aria-expanded', 'false'); dropList.classList.remove('is-open'); }
  dropBtn.addEventListener('click', function () {
    var open = dropBtn.getAttribute('aria-expanded') === 'true';
    dropBtn.setAttribute('aria-expanded', String(!open));
    dropList.classList.toggle('is-open', !open);
  });
  document.addEventListener('click', function (e) { if (!drop.contains(e.target)) closeDrop(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrop(); dropBtn.focus(); } });
  drop.addEventListener('focusout', function (e) { if (e.relatedTarget && !drop.contains(e.relatedTarget)) closeDrop(); });

  /* dialogs keep the tab key inside */
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    var list = Array.prototype.filter.call(box.querySelectorAll('a[href],button:not([disabled])'), function (x) { return x.offsetParent !== null || getComputedStyle(x).position === 'fixed'; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* phone menu */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('phone-menu');
  function setMenu(open) {
    menuOpen = open;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    root.style.overflow = open ? 'hidden' : '';
    if (open) { var a = menu.querySelector('a'); if (a) a.focus(); }
  }
  menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); return; }
    if (e.key !== 'Tab') return;
    var list = Array.prototype.slice.call(menu.querySelectorAll('a[href]'));
    list.unshift(menuBtn);
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  window.matchMedia('(min-width:1024px)').addEventListener('change', function (m) { if (m.matches && menuOpen) setMenu(false); });

  /* anchors glide */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' });
    if (target.hasAttribute('tabindex') && e.detail === 0) target.focus({ preventScroll: true });
  });

  /* accessibility panel */
  var a11yLink = document.querySelector('[data-a11y]');
  var a11yBtn = document.createElement('button');
  a11yBtn.type = 'button';
  a11yBtn.className = 'a11y-link';
  a11yBtn.setAttribute('aria-label', 'נגישות');
  a11yBtn.setAttribute('aria-expanded', 'false');
  a11yBtn.innerHTML = a11yLink.innerHTML;
  a11yLink.replaceWith(a11yBtn);
  var panel = document.createElement('div');
  panel.className = 'a11y-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'נגישות');
  panel.hidden = true;
  panel.innerHTML = '<h2>נגישות</h2><ul>' +
    '<li><button type="button" data-a="big" aria-pressed="false">הגדלת טקסט</button></li>' +
    '<li><button type="button" data-a="a-contrast" aria-pressed="false">ניגודיות גבוהה</button></li>' +
    '<li><button type="button" data-a="a-links" aria-pressed="false">הדגשת קישורים</button></li>' +
    '<li><button type="button" data-a="a-still" aria-pressed="false">עצירת אנימציות</button></li>' +
    '</ul><a href="https://plomba.co.il/accessibility">הצהרת נגישות</a><button type="button" class="a11y-close">סגירה</button>';
  document.body.appendChild(panel);
  function setPanel(open) {
    panel.hidden = !open;
    a11yBtn.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('button').focus(); else a11yBtn.focus();
  }
  a11yBtn.addEventListener('click', function () { setPanel(panel.hidden); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') setPanel(false); trap(panel, e); });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('a11y-close')) { setPanel(false); return; }
    var on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (b.dataset.a === 'big') root.style.setProperty('--a11y-scale', on ? '1.15' : '1');
    else root.classList.toggle(b.dataset.a, on);
    if (b.dataset.a === 'a-still') stopLoop();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  /* questions */
  document.querySelectorAll('.qa__q').forEach(function (q) {
    var a = document.getElementById(q.getAttribute('aria-controls'));
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') !== 'true';
      q.setAttribute('aria-expanded', String(open));
      a.classList.toggle('is-open', open);
      if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 300);
    });
  });

  /* sign types: one window, many photos */
  var typesBox = document.querySelector('[data-types]');
  var tws = typesBox.querySelectorAll('.tw');
  var typeRows = typesBox.querySelectorAll('.type');
  function showType(i) {
    tws.forEach(function (im, n) {
      if (n === i && im.dataset.src && !im.getAttribute('src')) im.src = im.dataset.src;
      im.classList.toggle('is-on', n === i);
    });
    typeRows.forEach(function (row, n) { row.classList.toggle('is-active', n === i); });
  }
  typeRows.forEach(function (row, i) {
    row.addEventListener('pointerenter', function () { showType(i); });
    row.addEventListener('focus', function () { showType(i); });
  });
  /* the photo follows the row at mid screen, so it changes without a mouse too */
  if ('IntersectionObserver' in window && window.matchMedia('(min-width:1024px)').matches) {
    var typeIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) showType(Array.prototype.indexOf.call(typeRows, e.target));
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    typeRows.forEach(function (row) { typeIo.observe(row); });
  }

  /* phone action bar */
  var bar = document.querySelector('[data-bar]');
  var same = document.querySelectorAll('[data-same], .site-foot, [data-closing]');
  var inView = new Set();
  function setBar() {
    var on = inView.size === 0 && window.scrollY > 60;
    bar.classList.toggle('is-on', on);
    if (on) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
  }
  if ('IntersectionObserver' in window) {
    var barIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); });
      setBar();
    });
    same.forEach(function (el) { barIo.observe(el); });
    window.addEventListener('scroll', setBar, { passive: true });
  }

  /* photos taking turns inside the sign */
  var win = document.querySelector('[data-win]');
  var photos = win.querySelectorAll('.ph:not(.ph--end)');
  var loop = 0, turn = -1, atRest = true;
  function nextPhoto() {
    if (!atRest || document.hidden) return;
    if (turn > -1) photos[turn].classList.remove('is-on');
    turn = turn + 1 < photos.length ? turn + 1 : -1;
    if (turn > -1) photos[turn].classList.add('is-on');
  }
  function stopLoop() { clearInterval(loop); loop = 0; }
  if (!still.matches) loop = setInterval(nextPhoto, 3000);

  /* line around the closing words */
  var closing = document.querySelector('[data-closing]');
  var bubble = closing.querySelector('[data-bubble]');
  var tail = closing.querySelector('[data-tail]');
  var tailSvg = tail.ownerSVGElement;
  function drawTail() {
    var C = closing.getBoundingClientRect(), B = bubble.getBoundingClientRect();
    var phone = C.width < 768;
    var L = phone ? 10 : Math.max(16, Math.min(40, C.width * 0.0225));
    var R = phone ? 48 : Math.max(72, Math.min(190, B.width * 0.1));
    var x0 = B.left - C.left + L / 2, x1 = B.right - C.left - L / 2;
    var y0 = B.top - C.top + L / 2, y1 = B.bottom - C.top - L / 2;
    var w = x1 - x0;
    var post = x0 + w * 0.705, cap = x0 + w * 0.36;
    var bottom = C.height - Math.max(L, phone ? 24 : 32);
    var r2 = Math.min(R, (bottom - y1) * 0.9);
    tail.setAttribute('stroke-width', L);
    tail.setAttribute('d', 'M' + cap + ' ' + y1 + 'H' + (x0 + R) +
      'A' + R + ' ' + R + ' 0 0 1 ' + x0 + ' ' + (y1 - R) +
      'V' + (y0 + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x0 + R) + ' ' + y0 +
      'H' + (x1 - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1 + ' ' + (y0 + R) +
      'V' + (y1 - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x1 - R) + ' ' + y1 +
      'H' + post + 'V' + (bottom - r2) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + (post - r2) + ' ' + bottom +
      'H' + (-L));
    tailSvg.setAttribute('viewBox', '0 0 ' + C.width + ' ' + C.height);
  }
  drawTail();
  if (window.ResizeObserver) new ResizeObserver(drawTail).observe(closing);

  /* scroll scenes */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') { bubble.classList.add('no-line'); return; }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var HOLES = 'M600 145H842C868 205 881 270 881 345C881 455 850 550 778 641H688C775 565 822 470 822 345C822 320 820 300 815 281H590C605 255 612 225 612 205C612 185 606 165 600 145ZM549 145C530 220 490 280 435 317H294V183Q294 145 332 145ZM320 373H404V465H320ZM566 373H650V465H566ZM313 523H654C620 595 560 641 483 641C406 641 347 595 313 523Z';
  var SEG = [];
  HOLES.replace(/([MLHVQCZ])([^MLHVQCZ]*)/g, function (m, c, a) { SEG.push([c, (a.match(/-?\d*\.?\d+/g) || []).map(Number)]); return m; });
  var VX = 158, VW = 1042;
  function pathAt(s, tx, ty) {
    return SEG.map(function (sg) {
      var c = sg[0];
      return c + sg[1].map(function (v, i) {
        return (c === 'V' || (c !== 'H' && i % 2)) ? (v * s + ty).toFixed(1) : ((v - VX) * s + tx).toFixed(1);
      }).join(' ');
    }).join('');
  }
  var ANCHOR = { x: 483, y: 584, r: 56 };
  var SIGN = { x: 294, y: 145, w: 770, h: 496 };

  var mm = gsap.matchMedia();
  mm.add({
    wide: '(min-width:1024px) and (prefers-reduced-motion: no-preference)',
    narrow: '(max-width:1023px) and (prefers-reduced-motion: no-preference)',
    tall: '(min-width:1200px) and (min-height:700px) and (prefers-reduced-motion: no-preference)'
  }, function (ctx) {
    var c = ctx.conditions;
    if (!c.wide && !c.narrow) return;
    root.classList.add('gsap-live', 'is-live');

    /* the sign opens */
    var hero = document.querySelector('.hero');
    var opening = document.querySelector('[data-opening]');
    var mark = hero.querySelector('[data-mark]');
    var lines = hero.querySelector('[data-lines]');
    var inner = hero.querySelector('[data-photos]');
    var copy = hero.querySelector('[data-copy]');
    var heroKids = c.wide ? [copy] : [hero.querySelector('h1'), hero.querySelector('.hero__line'), hero.querySelector('.hero__actions')];
    var G = {}, st = { z: 0 };
    var inOut = gsap.parseEase('power2.inOut');
    function measure() {
      G.W = hero.clientWidth; G.H = hero.clientHeight;
      G.x0 = mark.offsetLeft; G.y0 = mark.offsetTop; G.w0 = mark.offsetWidth;
      G.s0 = G.w0 / VW;
      G.s1 = Math.hypot(G.W, G.H) / 2 / ANCHOR.r * 1.08;
    }
    function apply() {
      if (st.z >= 1) {
        win.style.clipPath = 'none';
        lines.style.visibility = 'hidden';
        inner.style.transform = 'none';
        return;
      }
      lines.style.visibility = '';
      var s = G.s0 * Math.pow(G.s1 / G.s0, st.z);
      var e = inOut(Math.min(1, st.z * 1.6));
      var ax = G.x0 + (ANCHOR.x - VX) * G.s0, ay = G.y0 + ANCHOR.y * G.s0;
      var px = ax + (G.W / 2 - ax) * e, py = ay + (G.H / 2 - ay) * e;
      var tx = px - (ANCHOR.x - VX) * s, ty = py - ANCHOR.y * s;
      win.style.clipPath = 'path("' + pathAt(s, tx, ty) + '")';
      lines.style.transform = 'translate(' + (tx - G.x0).toFixed(1) + 'px,' + (ty - G.y0).toFixed(1) + 'px) scale(' + (s / G.s0).toFixed(4) + ')';
      var x0 = Math.max(0, tx + (SIGN.x - VX) * s), x1 = Math.min(G.W, tx + (SIGN.x - VX + SIGN.w) * s);
      var y0 = Math.max(0, ty + SIGN.y * s), y1 = Math.min(G.H, ty + (SIGN.y + SIGN.h) * s);
      var k = Math.min(1, Math.max((x1 - x0) / G.W, (y1 - y0) / G.H) * 1.04);
      var ix = Math.min(G.W - G.W * k, Math.max(0, (x0 + x1) / 2 - G.W * k / 2));
      var iy = Math.min(G.H - G.H * k, Math.max(0, (y0 + y1) / 2 - G.H * k / 2));
      inner.style.transform = 'translate(' + ix.toFixed(1) + 'px,' + iy.toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
      var rest = st.z < 0.004;
      if (rest !== atRest) {
        atRest = rest;
        photos.forEach(function (p, i) { p.classList.toggle('is-on', rest && i === turn); });
      }
    }
    measure(); apply();
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: opening, start: 'top top', end: 'bottom bottom', scrub: 0.5 }
    });
    tl.to(heroKids, { autoAlpha: 0, y: -24, duration: 0.14, ease: 'power2.out' }, 0)
      .set(heroKids, { autoAlpha: 1, y: 0 }, 0.84)
      .to(st, { z: 1, duration: 0.8, ease: 'power1.inOut', onUpdate: apply }, 0.02)
      .to({}, { duration: 0.16 }, 0.84);
    ScrollTrigger.create({
      trigger: opening, start: 'bottom top', end: 'max',
      onEnter: function () { hero.classList.add('is-past'); },
      onLeaveBack: function () { hero.classList.remove('is-past'); }
    });
    hero.addEventListener('focusin', function () { if (st.z > 0 && window.scrollY > 0) window.scrollTo(0, 0); });
    function onInit() { measure(); }
    function onRef() { apply(); drawTail(); }
    ScrollTrigger.addEventListener('refreshInit', onInit);
    ScrollTrigger.addEventListener('refresh', onRef);

    /* the sign gets made, step by step */
    var proc = document.querySelector('[data-process]');
    var stage = proc.querySelector('.process__stage');
    var build = proc.querySelector('[data-build]');
    var steps = proc.querySelectorAll('[data-step]');
    var bLine = build.querySelector('.b-line'), bPost = build.querySelector('.b-post'), bSketch = build.querySelector('.b-sketch');
    var bPanel = build.querySelector('.b-panel'), bBlue = build.querySelector('.b-blue');
    gsap.set([bLine, bPost, bSketch], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set([bPanel, bBlue], { opacity: 0 });
    function mark_step(p) {
      var n = Math.min(3, Math.floor(p * 4));
      steps.forEach(function (li, i) { li.classList.toggle('is-active', i <= n); });
    }
    mark_step(0);
    var scrollOpts;
    if (c.tall) {
      proc.classList.add('is-pinned');
      gsap.set(proc, { height: '260vh' });
      gsap.set(stage, { position: 'sticky', top: 0, height: '100vh', alignItems: 'center', paddingTop: 72, paddingBottom: 0 });
      scrollOpts = { trigger: proc, start: 'top top', end: 'bottom bottom', scrub: 0.4, onUpdate: function (self) { mark_step(self.progress); } };
    } else {
      scrollOpts = { trigger: proc, start: 'top 70%', end: 'bottom 90%', scrub: 0.4, onUpdate: function (self) { mark_step(self.progress); } };
    }
    /* on the pinned version the outline starts on the way in, so the scene opens on a shape and not on a stray dash */
    gsap.to(bLine, {
      strokeDashoffset: 0, ease: 'none', autoRound: false,
      scrollTrigger: c.tall ? { trigger: proc, start: 'top 70%', end: 'top -40%', scrub: 0.4 } : { trigger: proc, start: 'top 70%', end: 'top 20%', scrub: 0.4 }
    });
    gsap.timeline({ defaults: { ease: 'none', autoRound: false }, scrollTrigger: scrollOpts })
      .to(bSketch, { strokeDashoffset: 0, duration: 0.22 }, 0.27)
      .to(bBlue, { opacity: 1, duration: 0.1 }, 0.52)
      .to(bPanel, { opacity: 1, duration: 0.1 }, 0.6)
      .to(bSketch, { opacity: 0, duration: 0.06 }, 0.68)
      .to(bPost, { strokeDashoffset: 0, duration: 0.2 }, 0.76)
      .to({}, { duration: 0.04 }, 0.96);

    /* photos open out of their block */
    gsap.utils.toArray('[data-open]').forEach(function (img) {
      gsap.fromTo(img, { clipPath: 'inset(18% 18% 18% 18%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'none',
        scrollTrigger: { trigger: img.parentNode, start: 'top 96%', end: 'top 66%', scrub: 0.4 }
      });
    });

    /* closing line */
    gsap.set(tail, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.to(tail, {
      strokeDashoffset: 0, ease: 'none', autoRound: false,
      scrollTrigger: { trigger: closing, start: 'top 75%', end: 'bottom bottom', scrub: 0.4 }
    });

    return function () {
      ScrollTrigger.removeEventListener('refreshInit', onInit);
      ScrollTrigger.removeEventListener('refresh', onRef);
      win.style.clipPath = ''; lines.style.transform = ''; lines.style.visibility = ''; inner.style.transform = '';
      gsap.set([proc, stage], { clearProps: 'all' });
      proc.classList.remove('is-pinned');
      gsap.set([bLine, bPost, bSketch, bPanel, bBlue, tail], { clearProps: 'all' });
      steps.forEach(function (li) { li.classList.remove('is-active'); });
      root.classList.remove('gsap-live', 'is-live');
      atRest = true;
    };
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
