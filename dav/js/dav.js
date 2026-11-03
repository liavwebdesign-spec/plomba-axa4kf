(function () {
  var d = document, w = window, html = d.documentElement, q = new URLSearchParams(location.search);
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  function still() { return reduce.matches || html.classList.contains('qa') || html.classList.contains('a11y-nomotion'); }
  html.classList.toggle('still', still());

  /* הודעות וואטסאפ מוכנות */
  $$('[data-wa]').forEach(function (a) { a.href = 'https://wa.me/972502222155?text=' + encodeURIComponent(a.getAttribute('data-wa')); });

  /* כרטיסי הביקורות: סמל גוגל וכוכבים */
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';
  $$('[data-g]').forEach(function (el) { el.innerHTML = G; });
  $$('[data-stars]').forEach(function (el) { el.innerHTML = STAR + STAR + STAR + STAR + STAR; });

  /* הדר: בר מרחף אחרי הפתיחה, נעלם בירידה וחוזר בעלייה */
  (function () {
    var hd = $('#hd'), last = w.scrollY, tick = false;
    function run() {
      tick = false;
      var y = w.scrollY, vh = w.innerHeight;
      hd.classList.toggle('is-float', y > 40);
      if (y > vh * .9 && y > last + 2) hd.classList.add('is-hidden');
      else if (y < last - 2 || y <= vh * .9) hd.classList.remove('is-hidden');
      last = y;
    }
    w.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    d.addEventListener('focusin', function (e) { if (hd.contains(e.target)) hd.classList.remove('is-hidden'); });
    run();
  })();

  /* תפריט מסך מלא */
  (function () {
    var btn = $('#menu-btn'), menu = $('#menu'), rest = [$('#main'), $('.ft'), $('.wa-float')];
    function set(on) {
      menu.hidden = !on;
      html.classList.toggle('menu-on', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      $('.hd-menu-t', btn).textContent = on ? 'סגירה' : 'תפריט';
      rest.forEach(function (el) { if (el) el.inert = on; });
      if (on) { var f = $('a', menu); if (f) f.focus({ preventScroll: true }); }
    }
    btn.addEventListener('click', function () { set(menu.hidden); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  })();

  /* סרטונים: נטענים כשמתקרבים, מתנגנים רק כשרואים אותם; תקלה בקובץ משאירה את התמונה */
  var vids = (function () {
    var list = $$('video[data-vid]'), desk = w.matchMedia('(min-width: 1024px)'), seen = new Map();
    function off() { return still() || html.classList.contains('vids-off'); }
    function wanted(v) {
      if (off() || !seen.get(v)) return false;
      var col = v.closest('[data-col]');
      return !(col && desk.matches && !col.classList.contains('is-on'));
    }
    function load(v) {
      if (v.src) return;
      var s = v.getAttribute('data-src') || (w.innerWidth < 768 ? v.getAttribute('data-m') : v.getAttribute('data-d'));
      if (s) { v.src = s; v.load(); }
    }
    function sync(v) {
      if (wanted(v)) { load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (v.src) v.pause();
    }
    list.forEach(function (v) {
      v.addEventListener('playing', function () { v.classList.add('is-playing'); });
      v.addEventListener('error', function () { v.classList.remove('is-playing'); });
    });
    /* המעקב על האלמנט העוטף, כי סרטון שקוף או חתוך לא נחשב גלוי */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { $$('video[data-vid]', e.target).forEach(function (v) { seen.set(v, e.isIntersecting); sync(v); }); });
    }, { rootMargin: '10% 0px' });
    $$('.hero-card, .col, .mb-card, .ft').forEach(function (el) { io.observe(el); });
    return { syncAll: function () { list.forEach(sync); } };
  })();

  /* עצירה והפעלה של כל הסרטונים */
  (function () {
    try { if (localStorage.getItem('plomba-vids') === 'off') html.classList.add('vids-off'); } catch (e) {}
    function label() {
      var off = html.classList.contains('vids-off');
      $$('[data-vid-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', off ? 'true' : 'false'); b.setAttribute('aria-label', off ? 'הפעלה של הסרטונים' : 'עצירה של הסרטונים'); });
    }
    d.addEventListener('click', function (e) {
      if (!e.target.closest('[data-vid-toggle]')) return;
      var off = html.classList.toggle('vids-off');
      try { localStorage.setItem('plomba-vids', off ? 'off' : 'on'); } catch (e2) {}
      label(); vids.syncAll();
    });
    label();
  })();

  /* עמודות סוגי השלטים: הטור שעומדים עליו פותח את הקישורים והסרטון שלו; הסרטון האחרון נשאר ברקע */
  (function () {
    var cols = $$('[data-col]');
    function on(c) { if (c.classList.contains('is-on')) return; cols.forEach(function (x) { x.classList.toggle('is-on', x === c); }); vids.syncAll(); }
    function open(c) { cols.forEach(function (x) { x.classList.toggle('is-open', x === c); }); if (c) on(c); }
    cols.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') open(c); });
      c.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') c.classList.remove('is-open'); });
      c.addEventListener('focusin', function () { on(c); });
      c.addEventListener('click', function (e) { if (!e.target.closest('a')) open(c); });
    });
  })();

  /* וואטסאפ צף: יורד כשהעמודות עוברות בפינה, כדי לא לשבת על הטקסט שלהן */
  (function () {
    var fl = $('.wa-float'), st = $('[data-cols-stage]'); if (!fl || !st || !w.IntersectionObserver) return;
    new IntersectionObserver(function (es) { fl.classList.toggle('is-off', es[0].isIntersecting); }, { rootMargin: '-90% 0px 0px 0px' }).observe(st);
  })();

  /* סליידר עבודות */
  (function () {
    var box = $('[data-slider]'); if (!box) return;
    var tr = $('[data-track]', box), prev = $('[data-prev]', box), next = $('[data-next]', box);
    function step() { var it = $('.ev-it', tr), gap = parseFloat(getComputedStyle(tr).columnGap) || 0; return it.getBoundingClientRect().width + gap; }
    function state() {
      var max = tr.scrollWidth - tr.clientWidth, x = Math.abs(tr.scrollLeft);
      prev.disabled = x < 4; next.disabled = x > max - 4;
    }
    /* ב-RTL הגלילה שלילית: הבא הוא שמאלה */
    next.addEventListener('click', function () { tr.scrollBy({ left: -step(), behavior: still() ? 'auto' : 'smooth' }); });
    prev.addEventListener('click', function () { tr.scrollBy({ left: step(), behavior: still() ? 'auto' : 'smooth' }); });
    tr.addEventListener('scroll', state, { passive: true });
    w.addEventListener('resize', state);
    state();
  })();

  /* לפני ואחרי */
  (function () {
    var box = $('[data-cmp]'); if (!box) return;
    var r = $('input', box), touched = false;
    function set(v) { box.style.setProperty('--cut', v + '%'); r.setAttribute('aria-valuetext', Math.round(v) + ' אחוז מהקיר עם השלט'); }
    r.addEventListener('input', function () { touched = true; set(+r.value); });
    if (!still() && w.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || touched) return;
        io.disconnect();
        var t0 = performance.now();
        (function f(t) {
          if (touched) return;
          var p = Math.min(1, (t - t0) / 1600), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, v = 22 + e * 46;
          r.value = v; set(v);
          if (p < 1) requestAnimationFrame(f);
        })(t0);
      }, { threshold: .4 });
      io.observe(box);
    }
  })();

  /* שאלות: פתיחה בגובה */
  $$('.fq').forEach(function (det) {
    var sum = $('summary', det), body = $('.fq-a', det), anim;
    sum.addEventListener('click', function (e) {
      if (still() || !body.animate) return;
      e.preventDefault();
      if (anim) anim.cancel();
      var closing = det.open;
      if (!closing) det.open = true;
      var h = body.scrollHeight;
      anim = body.animate({ height: closing ? [h + 'px', '0px'] : ['0px', h + 'px'] }, { duration: 520, easing: 'cubic-bezier(.19,1,.22,1)' });
      anim.onfinish = function () { if (closing) det.open = false; anim = null; };
    });
  });

  /* נגישות */
  (function () {
    var link = $('.a11y-btn'); if (!link) return;
    var opts = [['bigger', 'הגדלת טקסט'], ['smaller', 'הקטנת טקסט'], ['contrast', 'ניגודיות גבוהה'], ['invert', 'היפוך צבעים'], ['gray', 'גווני אפור'],
      ['links', 'הדגשת קישורים'], ['font', 'גופן קריא'], ['spacing', 'ריווח טקסט'], ['nomotion', 'עצירת אנימציות'], ['cursor', 'סמן גדול'], ['guide', 'קו קריאה'], ['reset', 'איפוס']];
    var state = {}; try { state = JSON.parse(localStorage.getItem('plomba-a11y') || '{}'); } catch (e) {}
    var scale = state.scale || 1;
    var panel = d.createElement('div'); panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'הגדרות נגישות');
    panel.innerHTML = '<header><span>נגישות</span><button type="button" class="a11y-close" aria-label="סגירה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></header><div class="list">' +
      opts.map(function (o) { return '<button type="button" data-a11y="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join('') +
      '</div><footer><a href="../accessibility.html">הצהרת נגישות</a><span>ת"י 5568</span></footer>';
    d.body.appendChild(panel);
    var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'a11y-btn'; btn.setAttribute('aria-label', 'פתיחת תפריט נגישות'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = link.innerHTML; link.replaceWith(btn);
    var narrow = w.matchMedia('(max-width: 1279px)');
    function place() { if (narrow.matches) $('.hd-start').appendChild(btn); else d.body.appendChild(btn); }
    place(); narrow.addEventListener('change', place);
    function apply() {
      html.style.setProperty('--a11y-scale', scale);
      ['contrast', 'invert', 'gray', 'links', 'font', 'spacing', 'nomotion', 'cursor', 'guide'].forEach(function (k) { html.classList.toggle('a11y-' + k, !!state[k]); });
      $$('[data-a11y]', panel).forEach(function (b) { var k = b.getAttribute('data-a11y'); if (k in state) b.setAttribute('aria-pressed', state[k] ? 'true' : 'false'); else b.setAttribute('aria-pressed', 'false'); });
      var was = html.classList.contains('still'), now = still();
      if (was !== now) { html.classList.toggle('still', now); w.dispatchEvent(new Event('plomba-motion')); }
      vids.syncAll();
      try { state.scale = scale; localStorage.setItem('plomba-a11y', JSON.stringify(state)); } catch (e) {}
    }
    function open(o) { panel.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) $('button[data-a11y]', panel).focus(); else btn.focus(); }
    btn.addEventListener('click', function () { open(!panel.classList.contains('is-open')); });
    $('.a11y-close', panel).addEventListener('click', function () { open(false); });
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
    apply();
  })();

  /* תנועה בגלילה */
  function scenes() {
    if (!w.gsap || !w.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var mm = gsap.matchMedia(), scrub = .6;

    function split(el) {
      if (el.querySelector('.w')) return $$('.w', el);
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (t, i) {
        var s = d.createElement('span'); s.className = 'w'; s.textContent = t; el.appendChild(s);
        if (i < words.length - 1) el.appendChild(d.createTextNode(' '));
      });
      return $$('.w', el);
    }

    mm.add('(min-width: 0px)', function () {
      /* פתיחה: הטקסט עולה בטעינה */
      gsap.from('.hero-h-in', { y: 28, opacity: 0, duration: 1.2, ease: 'expo.out', delay: .15 });

      /* פתיחה: הקלף מתכווץ פנימה מהשוליים והטקסט נעלם */
      var gut = function () { return Math.min(50, Math.max(20, w.innerWidth * .03472)); };
      gsap.fromTo('[data-hero]', { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, {
        clipPath: function () { return 'inset(' + Math.round(w.innerHeight * .08) + 'px ' + gut() + 'px 0px ' + gut() + 'px round 10px)'; },
        ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=52%', scrub: .35, invalidateOnRefresh: true }
      });
      gsap.fromTo('[data-hero-h]', { y: 0, opacity: 1 }, { y: -60, opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=30%', scrub: .25 } });
      gsap.fromTo('[data-hero-media]', { yPercent: 0, scale: 1.02 }, { yPercent: 12, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: scrub } });

      /* מילה מילה */
      $$('[data-words]').forEach(function (el) {
        var ws = split(el);
        gsap.fromTo(ws, { opacity: .24 }, { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: .3 } });
      });

      /* סרטון הייצור */
      gsap.fromTo('[data-mb-media]', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.mb', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.mb-body > *', { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.mb-card', start: 'top 45%', toggleActions: 'play none none reverse' } });

      /* תמונות שנפתחות מהמרכז */
      $$('[data-open]').forEach(function (fig) {
        gsap.fromTo(fig, { clipPath: 'inset(14% 14% 14% 14% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)', ease: 'none', scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 45%', scrub: scrub } });
        gsap.fromTo($('img', fig), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 25%', scrub: scrub } });
      });

      /* כניסות רכות */
      var soft = '.cols-head > *, .pr-text > .lbl, .ev-head .lbl, .em-head .lbl, .em-head .btn, .em-dots li, .ev-view, .ev-foot, .cl-text > *, .cl-logos li, .rv-head > *, .gr, .rv-all, .sx-text > *, .cmp, .fq-head > *, .fq, .ft-card, .ft-col, .ft-brand-a, .ft-brand-b';
      gsap.set(soft, { y: 26, opacity: 0 });
      ScrollTrigger.batch(soft, {
        start: 'top 92%', once: true,
        onEnter: function (els) { gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .06, overwrite: true }); }
      });
    });

    /* סוגי השלטים: הקלף גדל עד מסך מלא, ואז הטקסט */
    mm.add('(min-width: 1024px)', function () {
      gsap.fromTo('[data-cols-stage]', { clipPath: 'inset(30% 33% 30% 33% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '[data-cols]', start: 'top 4%', end: 'top -135%', scrub: scrub } });
      gsap.fromTo('.col-body', { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'none', stagger: .05, scrollTrigger: { trigger: '[data-cols]', start: 'top -100%', end: 'top -145%', scrub: scrub } });
      /* סרטון הייצור נפתח מהשוליים */
      gsap.fromTo('[data-mb]', { clipPath: 'inset(0% 3.472% 0% 3.472% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.mb', start: 'top bottom', end: 'top 25%', scrub: scrub } });
      /* קלפי התהליך נדלקים כשהם מגיעים */
      $$('.pc').forEach(function (c, i) {
        if (!i) return;
        gsap.fromTo(c, { opacity: .55 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top 90%', end: 'top 55%', scrub: true } });
      });
    });

    mm.add('(max-width: 1023px)', function () {
      gsap.fromTo('[data-mb]', { clipPath: 'inset(0% 5% 0% 5% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.mb', start: 'top bottom', end: 'top 35%', scrub: scrub } });
      $$('.col').forEach(function (c) { gsap.from(c, { y: 34, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } }); });
      $$('.pc').forEach(function (c) { gsap.from(c, { y: 26, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 92%', once: true } }); });
    });

    /* כשמכבים אנימציות מהסרגל: מחזירים הכול למצב הסופי */
    w.addEventListener('plomba-motion', function () { if (still()) { mm.revert(); ScrollTrigger.getAll().forEach(function (t) { t.kill(true); }); } else location.reload(); });

    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    w.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (!still()) scenes();
  else if (w.gsap) { /* מצב קבוע: בלי תנועה */ }
})();
