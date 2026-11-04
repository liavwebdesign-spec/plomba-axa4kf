(function () {
  var doc = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = matchMedia('(min-width: 900px)');
  var BAR = 64;

  /* Smooth wheel */
  var smooth = null;
  if (!still && window.Lenis) {
    smooth = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    (function tick(t) { smooth.raf(t); requestAnimationFrame(tick); })(performance.now());
  }

  /* Same-page links */
  function go(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    if (smooth) smooth.scrollTo(el, { offset: -BAR, duration: 1.1 });
    else window.scrollTo(0, el.getBoundingClientRect().top + scrollY - BAR);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  /* Menu */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    doc.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'סגירת התפריט' : 'פתיחת התפריט');
    menu.toggleAttribute('inert', !open);
    if (smooth) { open ? smooth.stop() : smooth.start(); }
    if (open) { var first = menu.querySelector('a'); if (first) first.focus({ preventScroll: true }); }
  }
  menu.setAttribute('inert', '');
  toggle.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !doc.classList.contains('menu-open')) return;
    setMenu(false);
    toggle.focus();
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    e.preventDefault();
    if (doc.classList.contains('menu-open')) setMenu(false);
    go(a.getAttribute('href'));
  });

  /* Accessibility panel */
  var accessBtn = document.querySelector('.access-toggle');
  var access = document.getElementById('access');
  var stored = {};
  try { stored = JSON.parse(localStorage.getItem('access') || '{}') || {}; } catch (e) {}
  function setAccess(open) {
    access.hidden = !open;
    accessBtn.setAttribute('aria-expanded', String(open));
  }
  function applyMode(btn, on) {
    var mode = btn.getAttribute('data-mode');
    doc.classList.toggle(mode, on);
    btn.setAttribute('aria-pressed', String(on));
    stored[mode] = on;
    if (mode === 'a-still') freeze(on);
  }
  accessBtn.addEventListener('click', function () { setAccess(access.hidden); });
  access.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyMode(btn, btn.getAttribute('aria-pressed') !== 'true');
      try { localStorage.setItem('access', JSON.stringify(stored)); } catch (e) {}
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !access.hidden) { setAccess(false); accessBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!access.hidden && !access.contains(e.target) && !accessBtn.contains(e.target)) setAccess(false);
  });

  /* Photos fade in when they arrive */
  document.querySelectorAll('.photo img').forEach(function (img) {
    function mark() { img.classList.add('is-in'); }
    if (img.complete && img.naturalWidth) mark();
    else { img.addEventListener('load', mark); img.addEventListener('error', mark); }
  });

  /* Sign types: the picture follows the row */
  var view = document.querySelector('.kinds__view');
  var rowsOfKinds = [].slice.call(document.querySelectorAll('.kinds__list a'));
  var pics = view ? view.querySelectorAll('img') : [];
  var shown = -1;
  function showKind(i) {
    if (i === shown) return;
    shown = i;
    pics.forEach(function (p, n) { p.classList.toggle('is-on', n === i); });
    rowsOfKinds.forEach(function (a, n) { a.classList.toggle('is-near', n === i); });
  }
  rowsOfKinds.forEach(function (a, i) {
    a.addEventListener('mouseenter', function () { showKind(i); });
    a.addEventListener('focus', function () { showKind(i); });
  });

  /* From sketch to lit sign */
  var stage = document.querySelector('.path__stage');
  var steps = document.querySelector('.path__steps');
  var sign = null;
  if (stage && steps && !still) {
    var q = function (s) { return stage.querySelector(s); };
    sign = {
      wall: q('.s-wall'), guides: q('.s-guides'), line: q('.s-line'), glow: q('.s-glow'), side: q('.s-side'), ticks: q('.s-ticks'),
      stem: q('.s-stem'), top: q('.s-top'), base: q('.s-base'), nook: q('.s-nook'),
      rows: steps.querySelectorAll('li')
    };
    sign.lineLen = sign.line.getTotalLength();
    sign.line.style.strokeDasharray = sign.lineLen;
  }
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var part = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var rgb = function (a, b, t) {
    return 'rgb(' + a.map(function (v, i) { return Math.round(mix(v, b[i], t)); }).join(',') + ')';
  };
  var PALE = [236, 239, 240], DARK = [24, 26, 27], BLUE = [9, 166, 212], METAL = [46, 49, 51];

  function drawSign(p) {
    var draw = ease(part(p, 0.02, 0.22));
    var fill = ease(part(p, 0.26, 0.34));
    var fix = part(p, 0.28, 0.48);
    var apart = ease(part(p, 0.5, 0.56)) * (1 - ease(part(p, 0.56, 0.73)));
    var solid = ease(part(p, 0.5, 0.56));
    var lit = ease(part(p, 0.76, 0.96));

    sign.wall.setAttribute('fill', rgb(PALE, DARK, lit));
    sign.guides.style.opacity = Math.min(ease(part(p, 0, 0.08)), 1 - ease(part(p, 0.46, 0.54)));
    sign.ticks.style.opacity = Math.min(ease(part(p, 0.26, 0.32)), 1 - ease(part(p, 0.46, 0.52)));
    sign.line.style.strokeDashoffset = sign.lineLen * (1 - draw);
    sign.line.style.opacity = 1 - ease(part(p, 0.48, 0.54));

    /* Revisions until it is approved: the bars change length and settle */
    var w = fix < 0.5 ? mix(300, 470, ease(fix * 2)) : mix(470, 400, ease((fix - 0.5) * 2));
    var n = fix < 0.5 ? mix(150, 290, ease(fix * 2)) : mix(290, 230, ease((fix - 0.5) * 2));
    var x = 520 - w;
    sign.top.setAttribute('x', x); sign.top.setAttribute('width', w);
    sign.base.setAttribute('x', x); sign.base.setAttribute('width', w);
    sign.nook.setAttribute('x', x); sign.nook.setAttribute('height', n);

    var alpha = p < 0.5 ? fill * 0.34 : mix(0.34, 1, solid);
    var color = lit > 0 ? rgb(BLUE, METAL, lit) : 'rgb(9,166,212)';
    [sign.stem, sign.top, sign.base, sign.nook].forEach(function (r) { r.setAttribute('fill', color); r.style.opacity = alpha; });
    sign.top.setAttribute('transform', 'translate(' + (-70 * apart) + ' ' + (-54 * apart) + ')');
    sign.base.setAttribute('transform', 'translate(' + (-70 * apart) + ' ' + (54 * apart) + ')');
    sign.nook.setAttribute('transform', 'translate(' + (-120 * apart) + ' ' + (-14 * apart) + ')');
    sign.stem.setAttribute('transform', 'translate(' + (56 * apart) + ' 0)');

    sign.side.style.opacity = ease(part(p, 0.72, 0.76)) * (1 - lit);
    sign.glow.style.opacity = lit;

    var now = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
    sign.rows.forEach(function (li, i) { li.classList.toggle('is-now', i === now); });
  }

  /* Scroll-linked parts */
  var drift = [].slice.call(document.querySelectorAll('[data-drift]'));
  var inner = [].slice.call(document.querySelectorAll('.hero__word img'));
  var hero = document.querySelector('.hero');
  var speeds = [0.05, 0.09, 0.03, 0.08, 0.04, 0.1];
  var queued = false, frozen = false;

  function frame() {
    queued = false;
    if (frozen) return;
    var vh = innerHeight, mid = vh / 2, rate = desk.matches ? 0.22 : 0.1;
    drift.forEach(function (el) {
      var box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -vh * 0.6 || box.top > vh * 1.6) return;
      var y = (box.top + box.height / 2 - mid) * rate * (parseFloat(el.getAttribute('data-drift')) || 1);
      y = Math.max(-300, Math.min(300, y));
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    });
    if (hero && desk.matches) {
      var s = scrollY;
      if (s < hero.offsetHeight) inner.forEach(function (img, i) {
        /* Lags behind the page while growing from its bottom edge, so the letter stays covered */
        var d = s * speeds[i];
        img.style.transform = 'translate3d(0,' + d.toFixed(1) + 'px,0) scale(' + (1 + d / img.offsetHeight).toFixed(4) + ')';
      });
    }
    if (view && desk.matches) {
      var box0 = view.parentElement.getBoundingClientRect();
      if (box0.bottom > 0 && box0.top < vh) {
        var near = 0, best = Infinity;
        rowsOfKinds.forEach(function (a, i) {
          var b = a.getBoundingClientRect(), gap = Math.abs(b.top + b.height / 2 - vh * 0.55);
          if (gap < best) { best = gap; near = i; }
        });
        showKind(near);
      }
    }
    if (sign) {
      var r = steps.getBoundingClientRect();
      var p;
      if (desk.matches) p = (vh * 0.68 - r.top) / r.height;
      else { var st = stage.getBoundingClientRect(); p = (vh * 0.85 - st.top) / (vh * 0.7 + st.height * 0.3); }
      drawSign(clamp(p));
    }
  }
  function freeze(on) {
    frozen = on;
    if (smooth) { if (on) smooth.destroy(); }
    if (on) {
      drift.concat(inner).forEach(function (el) { el.style.transform = 'none'; });
      if (sign) drawSign(1);
    } else request();
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

  access.querySelectorAll('button').forEach(function (btn) {
    if (stored[btn.getAttribute('data-mode')]) applyMode(btn, true);
  });

  if (!still) {
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    desk.addEventListener('change', request);
    frame();
    addEventListener('load', frame);
  }
})();
