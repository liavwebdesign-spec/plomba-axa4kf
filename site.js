/* פלומבה v8 · התנהגות ותנועה לכל האתר (RTL).
   התנהגות: הדר שקוף שהופך לבן ונעלם מטה · תפריט מובייל · סרטון הירו עם עצירה · מסדרון פרויקטים בנייד · עוגנים.
   תנועה, כולה מ-Motion Vault (v8, במקום הסט של אלמור), בסדר העמוד:
   MV:g87 פס שחושף את הכותרת הראשית ואת המספרים · MV:g97 סריקה שהופכת שלד אפור לצילום בצבע · MV:g65 רצועת פרויקטים
   מוצמדת שהמרכזי בה גדל (דסקטופ) · MV:g100 לוח שלטים מתהפך בתהליך · MV:g137 מרכאות שנפתחות · MV:g98 לוחיות לוגואים
   שמתהפכות בגל · סוגר MV:ft4 שנמס לפוטר, עם הפס של g87 בכותרת (v8.1, במקום g108).
   ?qa=1, prefers-reduced-motion ו"עצירת אנימציות": הכל במצב הסופי. */
(function () {
  var d = document, w = window, html = d.documentElement, q = new URLSearchParams(location.search);
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches, QA = q.get('qa') === '1';
  if (QA) html.classList.add('qa');
  var still = function () { return html.classList.contains('a11y-nomotion'); };

  /* ---------- הדר ---------- */
  var hd = d.getElementById('hd'), top = d.querySelector('.hero, .page-hero');
  if (hd) {
    var last = w.scrollY, raf = 0;
    var upd = function () {
      raf = 0;
      var y = w.scrollY, dy = y - last;
      var solidAt = top ? top.offsetHeight - hd.offsetHeight - 40 : 10;
      hd.classList.toggle('is-solid', y > solidAt);
      var hold = d.body.classList.contains('mm-open') || !!hd.querySelector(':focus-visible');
      if (y < hd.offsetHeight + 24 || hold) { hd.classList.remove('is-hidden'); last = y; return; }
      if (Math.abs(dy) < 6) return;
      hd.classList.toggle('is-hidden', dy > 0); last = y;
    };
    w.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    w.addEventListener('resize', upd);
    hd.addEventListener('focusin', upd); upd();
  }

  /* ---------- תפריט מובייל ---------- */
  var mm = d.getElementById('mm'), burger = d.querySelector('.burger');
  if (mm && burger) {
    var panel = mm.querySelector('.mobile-menu-panel'), closeBtn = mm.querySelector('.mobile-menu-close');
    panel.inert = true;
    var setMM = function (open) {
      mm.classList.toggle('is-open', open); panel.inert = !open;
      d.body.classList.toggle('mm-open', open);
      html.classList.toggle('is-locked', open);   /* נעילה על html; scrollbar-gutter שומר את הרוחב, בלי ריפוד ידני */
      burger.setAttribute('aria-expanded', String(open));
      if (open) setTimeout(function () { closeBtn.focus(); }, 150);
      else burger.focus();   /* תמיד בחזרה לכפתור שפתח: ב-Safari לחיצה לא מפקסת כפתור, ו-activeElement היה body */
    };
    burger.addEventListener('click', function () { setMM(!mm.classList.contains('is-open')); });
    closeBtn.addEventListener('click', function () { setMM(false); });
    mm.querySelector('.mobile-menu-backdrop').addEventListener('click', function () { setMM(false); });
    mm.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMM(false); }); });
    w.addEventListener('resize', function () { if (w.innerWidth > 1080 && mm.classList.contains('is-open')) setMM(false); });
    d.addEventListener('keydown', function (e) {
      if (!mm.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMM(false); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(panel.querySelectorAll('a[href],button')).filter(function (x) { return x.offsetParent !== null; });
      var i = f.indexOf(d.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[n].focus();
    });
  }

  /* ---------- סרטון ההירו: מתנגן לכולם, גם ב-reduced-motion, עם כפתור עצירה גלוי (motion.md 2א).
     רק "עצירת אנימציות" בסרגל הנגישות עוצר אותו מעצמו. אם הדפדפן חוסם הפעלה, הפוסטר נשאר והכפתור מציע הפעלה ---------- */
  var hero = d.querySelector('.hero'), vid = hero && hero.querySelector('.hero-video');
  if (vid) {
    var tgl = hero.querySelector('.hero-toggle'), paused = QA || still();
    var label = function () { if (!tgl) return; tgl.setAttribute('aria-pressed', String(paused)); tgl.setAttribute('aria-label', paused ? 'הפעלת סרטון הרקע' : 'עצירת סרטון הרקע'); };
    var apply = function () {
      if (paused) vid.pause();
      else { var p = vid.play(); if (p && p.catch) p.catch(function () { paused = true; label(); }); }
      label();
    };
    if (tgl) tgl.addEventListener('click', function () { paused = !paused; apply(); });
    if (QA && q.get('vt')) {   /* שער בדיקה: פריים מסוים לבדיקת ניגודיות */
      var seek = function () { vid.currentTime = +q.get('vt'); };
      if (vid.readyState >= 1) seek(); else vid.addEventListener('loadedmetadata', seek, { once: true });
    }
    new MutationObserver(function () { if (still() && !paused) { paused = true; apply(); } }).observe(html, { attributes: true, attributeFilter: ['class'] });
    apply();
  }

  /* ---------- מסדרון גליל (נייד, ובכל מקום שהרצועה המוצמדת לא פעילה) ---------- */
  d.querySelectorAll('[data-corridor]').forEach(function (wrap) {
    var track = wrap.querySelector('.corridor'), prev = wrap.querySelector('[data-dir="prev"]'), nxt = wrap.querySelector('[data-dir="next"]');
    if (!track) return;
    var max = function () { return track.scrollWidth - track.clientWidth; };
    var pos = function () { return Math.abs(track.scrollLeft); };       /* ב-RTL scrollLeft שלילי */
    var sync = function () { if (prev) prev.disabled = pos() < 4; if (nxt) nxt.disabled = pos() > max() - 4; };
    var go = function (dir) {
      var card = track.querySelector('.proj-card'), step = card ? card.getBoundingClientRect().width + 24 : 400;
      track.scrollBy({ left: -dir * step, behavior: RM ? 'auto' : 'smooth' });  /* קדימה ב-RTL זה שמאלה */
    };
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (nxt) nxt.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', sync, { passive: true }); w.addEventListener('resize', sync); sync();
  });

  /* ---------- עוגנים: גלילה רכה ב-JS, כי smooth על ה-html מזיז טריגרים ברענון (פרופיקס, 23.9) ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2 || e.defaultPrevented) return;
    var t = d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!t) return;
    e.preventDefault();
    var y = t.getBoundingClientRect().top + w.scrollY - (hd ? hd.offsetHeight : 0) - 16;
    w.scrollTo({ top: Math.max(0, y), behavior: RM || still() ? 'auto' : 'smooth' });
    if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  /* ---------- GSAP ---------- */
  if (!w.gsap || !w.ScrollTrigger || QA || RM || still()) { html.classList.remove('mo'); return; }
  gsap.registerPlugin(ScrollTrigger);
  html.classList.add('gsap-live');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* פעם אחת בכניסה, ובטוח לקישור עמוק: מי שנוחת אחרי נקודת ההתחלה מקבל את המצב הסופי (לקח המאגר: once לבדו לא נורה) */
  var onceIn = function (el, start, fire) {
    var done = false, go = function (instant) { if (!done) { done = true; fire(instant); } };
    ScrollTrigger.create({ trigger: el, start: start, onEnter: function () { go(false); },
      onRefresh: function (self) { if (self.progress > 0) go(self.progress >= 1); } });
  };

  gsap.matchMedia().add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)', ok: '(prefers-reduced-motion: no-preference)' }, function (ctx) {
    if (!ctx.conditions.ok) { html.classList.remove('mo'); return; }
    var desk = ctx.conditions.desk, undo = [];

    /* MV:g87 · פס שנכנס מימין, מכסה את השורה, והטקסט מופיע מאחוריו כשהוא יוצא שמאלה */
    var wipe = function (line, delay, instant) {
      var bar = line.querySelector('.wl-bar'), txt = line.querySelector('.wl-t');
      if (instant) { gsap.set(txt, { opacity: 1 }); return; }
      gsap.timeline({ delay: delay })
        .to(bar, { scaleX: 1, duration: .45, ease: 'power3.inOut' })
        .set(txt, { opacity: 1 })
        .set(bar, { transformOrigin: '0% 50%' })
        .to(bar, { scaleX: 0, duration: .5, ease: 'power3.inOut' });
    };
    var title = d.querySelector('.hero-title, .page-title');
    if (title) title.querySelectorAll('.wl').forEach(function (l, i) { wipe(l, .2 + i * .18); });
    var nums = gsap.utils.toArray('.stat-num .wl');
    if (nums.length) onceIn('.stats', 'top 80%', function (instant) { nums.forEach(function (l, i) { wipe(l, i * .14, instant); }); });

    /* MV:g97 · שכבת שלד אפורה, וקו סריקה שחושף את הצילום בצבע מלמעלה למטה, צמוד לגלילה ("מההדמיה למציאות") */
    gsap.utils.toArray('.tile-media, .split-media:not(.is-portrait)').forEach(function (box) {
      var img = box.querySelector('img'); if (!img) return;
      var gray = img.cloneNode(); gray.removeAttribute('fetchpriority'); gray.alt = ''; gray.setAttribute('aria-hidden', 'true');
      gray.classList.add('scan-gray'); img.classList.add('scan-color'); img.parentNode.insertBefore(gray, img);
      var line = d.createElement('span'); line.className = 'scan-line'; line.setAttribute('aria-hidden', 'true'); box.appendChild(line);
      gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 82%', end: 'center 42%', scrub: .5, invalidateOnRefresh: true } })
        .fromTo(img, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, 0)
        .fromTo(line, { y: 0 }, { y: function () { return box.clientHeight - 2; }, ease: 'none', duration: 1 }, 0)
        .fromTo(line, { opacity: 0 }, { opacity: 1, duration: .04 }, 0)
        .to(line, { opacity: 0, duration: .06 }, .94);
      undo.push(function () { gray.remove(); line.remove(); img.classList.remove('scan-color'); });
    });

    /* MV:g65 · רצועת הפרויקטים מוצמדת, והפרויקט שבמרכז גדל. המעטפת LTR, הרצועה RTL, ו-x עולה מ-(-dist) ל-0:
       המצלמה נעה שמאלה, הפרויקטים נכנסים משמאל, ככיוון הקריאה. בנייד נשאר מסדרון גליל */
    if (desk) d.querySelectorAll('.projects[data-corridor]').forEach(function (sec) {
      var view = sec.querySelector('.corridor'), track = sec.querySelector('.corridor-track');
      var items = track ? [].slice.call(track.querySelectorAll('.proj-card')) : [];
      if (!view || items.length < 3) return;
      sec.classList.add('strip-live'); view.removeAttribute('tabindex'); view.scrollLeft = 0;
      var dist = function () { return Math.max(1, track.scrollWidth - view.clientWidth); };
      var centers = [], unit = 1, mid = 0;
      var measure = function () {
        centers = items.map(function (el) { return el.offsetLeft + el.offsetWidth / 2; });
        unit = Math.abs(centers[0] - centers[1]) || 1; mid = view.clientWidth / 2;
      };
      /* המרחק מהמרכז נמדד מהמיקום הידוע ומה-x של הרצועה, בלי לקרוא layout בכל פריים. ביחידות של כרטיס, כדי שרק אחד יבלוט */
      var paint = function () {
        var x = gsap.getProperty(track, 'x');
        items.forEach(function (el, i) {
          var k = Math.min(1, Math.abs(centers[i] + x - mid) / (unit * 1.7)), f = 1 - k * k;
          gsap.set(el, { scale: .86 + f * .2, opacity: .42 + f * .58 });
        });
      };
      var tw = gsap.fromTo(track, { x: function () { return -dist(); } }, { x: 0, ease: 'none', onUpdate: paint,
        scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(Math.min(dist() * .75, w.innerHeight * 1.9)); }, pin: true, anticipatePin: 1, scrub: .5,
          invalidateOnRefresh: true, onRefresh: function () { measure(); paint(); } } });
      /* מקלדת: פרויקט שמקבל פוקוס מביא את הגלילה לנקודה שבה הוא במרכז */
      var onFocus = function (e) {
        var card = e.target.closest('.proj-card'), st = tw.scrollTrigger; if (!card || !st) return;
        view.scrollLeft = 0;
        var t = Math.min(1, Math.max(0, (centers[0] - centers[items.indexOf(card)]) / dist()));
        w.scrollTo({ top: st.start + t * (st.end - st.start), behavior: 'auto' });
      };
      sec.addEventListener('focusin', onFocus);
      undo.push(function () { sec.removeEventListener('focusin', onFocus); sec.classList.remove('strip-live'); view.setAttribute('tabindex', '0'); });
    });

    /* MV:g100 · לוח שלטים מתהפך: כל לוחית נסגרת ל-rotateX -90, מחליפה אות ונפתחת מ-90, בהפרש של 40ms.
       השלב נבחר לפי מיקום ולא לפי onEnter, כדי שגם קפיצה או רענון באמצע יראו את המילה הנכונה */
    var board = d.querySelector('.sf');
    if (board) {
      var words = board.dataset.words.split(','), len = Math.max.apply(null, words.map(function (x) { return x.length; }));
      var tiles = [].slice.call(board.querySelectorAll('.sf-t')), steps = [].slice.call(d.querySelectorAll('.flow-step'));
      var dots = [].slice.call(d.querySelectorAll('.flow-dots i')), count = d.querySelector('.flow-count b'), now = 0;
      var setMeta = function (k) {
        steps.forEach(function (s, j) { s.classList.toggle('is-on', j === k); });
        dots.forEach(function (x, j) { x.classList.toggle('on', j === k); });
        if (count) count.textContent = '0' + (k + 1);
      };
      var show = function (k) {
        if (k === now) return; now = k; setMeta(k);
        var wd = words[k].padEnd(len, ' ');
        tiles.forEach(function (t, i) {
          if (t._tl) t._tl.kill();
          t._tl = gsap.timeline({ delay: i * .04 })
            .to(t, { rotateX: -90, duration: .18, ease: 'power2.in', onComplete: function () { t.textContent = wd[i]; } })
            .set(t, { rotateX: 90 })
            .to(t, { rotateX: 0, duration: .28, ease: 'power3.out' });
        });
      };
      var pick = function () {
        var line = w.innerHeight * .6, idx = 0;
        steps.forEach(function (s, k) { if (s.getBoundingClientRect().top < line) idx = k; });
        show(idx);
      };
      ScrollTrigger.create({ trigger: '.flow-steps', start: 'top bottom', end: 'bottom top', onUpdate: pick, onRefresh: pick });
      undo.push(function () { tiles.forEach(function (t, i) { if (t._tl) t._tl.kill(); t.textContent = words[0].padEnd(len, ' ')[i]; }); now = 0; setMeta(0); });
    }

    /* MV:g137 · שני סימני המרכאות מתחילים צמודים במרכז ונפתחים לפינות, הציטוט עולה ביניהם */
    gsap.utils.toArray('.qq').forEach(function (box) {
      var o = box.querySelector('.qq-m.o'), c = box.querySelector('.qq-m.c'), k = desk ? 1 : .5;
      var bq = box.querySelector('blockquote'), cap = box.querySelector('figcaption');
      gsap.set(bq, { opacity: 0, y: 14 }); gsap.set(cap, { opacity: 0 });   /* מצב ההתחלה מוצב מיד, לא כשהסקראב מגיע ל-30% */
      gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 75%', end: 'center 50%', scrub: .6 } })
        .fromTo(o, { xPercent: -140 * k, yPercent: 120 * k }, { xPercent: 0, yPercent: 0, duration: 1, ease: 'none' }, 0)
        .fromTo(c, { xPercent: 140 * k, yPercent: -120 * k }, { xPercent: 0, yPercent: 0, duration: 1, ease: 'none' }, 0)
        .to(bq, { opacity: 1, y: 0, duration: .6, ease: 'none' }, .3)
        .to(cap, { opacity: 1, duration: .3, ease: 'none' }, .7);
    });

    /* MV:g98 · הלוחיות מתהפכות מהגב (שלט ריק) אל הלקוח, בגל אלכסוני מהפינה הימנית העליונה (האינדקס הראשון ב-RTL) */
    gsap.utils.toArray('.fw').forEach(function (grid) {
      var tl = [].slice.call(grid.querySelectorAll('.fw-tile')), cols = desk ? 7 : 2;
      gsap.fromTo(tl, { rotateY: 180 }, { rotateY: 0, ease: 'power2.inOut', duration: 1,
        stagger: { grid: [Math.ceil(tl.length / cols), cols], from: 'start', amount: 1.4 },
        scrollTrigger: { trigger: grid, start: 'top 85%', end: 'bottom 55%', scrub: .6 } });
    });

    /* MV:g87 גם בסוגר: הכותרת נחשפת בפס כשהסוגר נכנס, כמו כותרת ההירו. הפסקה והכפתורים סטטיים (אזור המרה) */
    gsap.utils.toArray('.closer').forEach(function (c) {
      var ls = [].slice.call(c.querySelectorAll('.closer-title .wl')); if (!ls.length) return;
      onceIn(c, 'top 65%', function (instant) { ls.forEach(function (l, i) { wipe(l, i * .18, instant); }); });
    });

    ScrollTrigger.sort();
    return function () { undo.forEach(function (f) { f(); }); };
  });

  w.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
