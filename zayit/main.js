(function () {
  "use strict";
  var doc = document.documentElement;
  var motion = doc.classList.contains("anim");

  /* ---------- menu ---------- */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("open", open);
    doc.classList.toggle("menu-open", open);
    if (open) { var first = menu.querySelector("a, button"); if (first) first.focus(); }
    else if (menu.contains(document.activeElement)) burger.focus();
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });

  var subBtn = document.querySelector(".sub-btn");
  var subWrap = document.querySelector(".has-sub");
  function setSub(open) {
    subBtn.setAttribute("aria-expanded", String(open));
    subWrap.classList.toggle("open", open);
  }
  subBtn.addEventListener("click", function () { setSub(subBtn.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("click", function (e) {
    if (!subWrap.contains(e.target) && window.innerWidth > 1000) setSub(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (subBtn.getAttribute("aria-expanded") === "true") { setSub(false); subBtn.focus(); }
    if (burger.getAttribute("aria-expanded") === "true") { setMenu(false); burger.focus(); }
  });
  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (a) { setMenu(false); setSub(false); }
  });
  subWrap.addEventListener("focusout", function (e) {
    if (e.relatedTarget && !subWrap.contains(e.relatedTarget) && window.innerWidth > 1000) setSub(false);
  });

  /* ---------- sign types: photo follows the row ---------- */
  var rows = [].slice.call(document.querySelectorAll(".kinds-list li"));
  var views = [].slice.call(document.querySelectorAll(".kinds-view img"));
  var pointerInList = false;
  function showKind(i) {
    views.forEach(function (v, n) { v.classList.toggle("on", n === i); });
    rows.forEach(function (r, n) { r.firstElementChild.classList.toggle("on", n === i); });
  }
  rows.forEach(function (r, i) {
    r.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { pointerInList = true; showKind(i); } });
    r.addEventListener("focusin", function () { showKind(i); });
  });
  var list = document.querySelector(".kinds-list");
  if (list) list.addEventListener("pointerleave", function () { pointerInList = false; });
  if (rows.length) showKind(0);

  /* ---------- scroll-linked drawing ---------- */
  var vh = window.innerHeight;
  var groups = [], front = null, rises = [], rowTops = [], dock = document.querySelector("[data-dock]"), dockFrom = 0, dockTo = 0;
  var offsetTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  var transforms = {
    down: function (s) { return "scaleY(" + s + ")"; }, up: function (s) { return "scaleY(" + s + ")"; },
    left: function (s) { return "scaleX(" + s + ")"; }, right: function (s) { return "scaleX(" + s + ")"; }
  };

  function measure() {
    vh = window.innerHeight;
    groups = [].slice.call(document.querySelectorAll("[data-scrub]")).filter(function (g) { return g.offsetParent !== null; }).map(function (g) {
      var kids = [].slice.call(g.querySelectorAll("[data-dir]")).map(function (b) {
        var narrowStep = b.classList.contains("stair-bg") && window.innerWidth <= 700;
        return { el: b, cover: b.classList.contains("stair-bg"), dir: narrowStep ? "left" : b.dataset.dir, a: +b.dataset.a, b: +b.dataset.b, min: narrowStep && b.parentElement.classList.contains("s4") ? 1 : +(b.dataset.min || 0), last: -1 };
      });
      return { top: offsetTop(g), h: g.offsetHeight, kids: kids };
    });
    var fr = document.querySelector("[data-front]");
    if (fr) {
      var mask = [].slice.call(fr.querySelectorAll(".word-mask")).filter(function (m) { return getComputedStyle(m).display !== "none"; })[0];
      if (mask) {
        front = { el: mask, range: Math.max(240, offsetTop(fr) * .95), panels: [].slice.call(mask.children).map(function (p) {
          return { el: p, m: p.dataset.m, a: +p.dataset.a, b: +p.dataset.b, last: -1 };
        }), hidden: false };
      } else front = null;
    }
    rises = [].slice.call(document.querySelectorAll("[data-rise]")).filter(function (r) { return r.offsetParent !== null; }).map(function (r) {
      var box = r.parentElement;
      return { el: r, top: offsetTop(box), h: box.offsetHeight };
    });
    rowTops = rows.map(function (r) { return offsetTop(r) + r.offsetHeight / 2; });
    var open = document.querySelector(".acts");
    var last = document.querySelector(".last");
    if (open && last) { dockFrom = offsetTop(open) + open.offsetHeight; dockTo = offsetTop(last) - vh * .6; }
  }

  function paint(y) {
    if (motion) {
      if (front) {
        var hp = clamp(y / front.range);
        if (hp >= 1 && !front.hidden) { front.el.style.visibility = "hidden"; front.hidden = true; }
        if (hp < 1 && front.hidden) { front.el.style.visibility = ""; front.hidden = false; }
        if (!front.hidden) front.panels.forEach(function (p) {
          var s = 1 - ease(clamp((hp - p.a) / (p.b - p.a)));
          s = Math.round(s * 1000) / 1000;
          if (s === p.last) return; p.last = s;
          p.el.style.transform = p.m === "y" ? "scaleY(" + s + ")" : "scaleX(" + s + ")";
        });
      }
      groups.forEach(function (g) {
        var topInView = g.top - y;
        if (topInView > vh * 1.15 && g.done === 0) return;
        var p = clamp((vh * .98 - topInView) / (vh * .62 + g.h * .35));
        g.done = p;
        g.kids.forEach(function (k) {
          var t = ease(clamp((p - k.a) / (k.b - k.a)));
          var s = k.min + (1 - k.min) * t;
          s = Math.round(s * 1000) / 1000;
          if (s === k.last) return; k.last = s;
          k.el.style.transform = transforms[k.dir](k.cover ? Math.round((1 - s) * 1000) / 1000 : s);
        });
      });
      rises.forEach(function (r) {
        var p = clamp((vh * .95 - (r.top - y)) / (vh * .7));
        var off = Math.round((1 - ease(p)) * 90);
        r.el.style.transform = "translateY(" + off + "px)";
      });
    }
    if (!pointerInList && window.innerWidth > 900 && rowTops.length) {
      var line = y + vh * .42, best = 0, gap = 1e9;
      rowTops.forEach(function (t, i) { var d = Math.abs(t - line); if (d < gap) { gap = d; best = i; } });
      if (best !== paint.kind) { paint.kind = best; showKind(best); }
    }
    if (dock) dock.classList.toggle("show", y > dockFrom && y < dockTo && !actionsOnScreen);
    doc.classList.toggle("scrolled", y > 8);
  }

  /* ---------- phone bar steps aside when the same buttons are on screen ---------- */
  var actionsOnScreen = false;
  if (dock && "IntersectionObserver" in window) {
    var shown = new Set();
    var watch = new IntersectionObserver(function (list) {
      list.forEach(function (e) { if (e.isIntersecting) shown.add(e.target); else shown.delete(e.target); });
      actionsOnScreen = shown.size > 0;
      paint(window.scrollY);
    }, { rootMargin: "0px 0px -58px 0px" });
    document.querySelectorAll(".acts, .foot").forEach(function (a) { watch.observe(a); });
  }

  /* ---------- text and blocks enter once ---------- */
  var entering = ".owner-text > *, .steps-text > *, .steps-acts, .clients-line, .logos li, .said-head > *, .said-list li, .kinds-title, .kinds-list li, .works-head > *, .w figcaption, .works-all, .preview-text > *, .preview-wall, .faq h2, details, .last-text > *, .foot-brand, .foot-col, .foot-legal";
  var enterAll = function () { document.querySelectorAll(".rv").forEach(function (e) { e.classList.add("in"); }); };
  if (motion && "IntersectionObserver" in window) {
    var enter = new IntersectionObserver(function (list) {
      list.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); enter.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(entering).forEach(function (e) {
      var i = [].indexOf.call(e.parentElement.children, e);
      e.classList.add("rv");
      e.style.setProperty("--d", Math.min(i, 4) * 70 + "ms");
      enter.observe(e);
    });
  }

  /* ---------- accessibility panel ---------- */
  var accessBtn = document.querySelector(".access-btn"), accessPanel = document.getElementById("access-panel");
  var settings = [].slice.call(accessPanel.querySelectorAll("[data-set]"));
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setAccess(open) {
    accessBtn.setAttribute("aria-expanded", String(open));
    accessPanel.hidden = !open;
    if (open) settings[0].focus();
  }
  function setMotion(on) {
    motion = on && !reduced;
    doc.classList.toggle("anim", motion);
    if (!motion) {
      enterAll();
      document.querySelectorAll("[data-dir], [data-rise]").forEach(function (e) { e.style.transform = ""; });
    }
    refresh();
  }
  function saveAccess() {
    var on = settings.filter(function (b) { return doc.classList.contains("a-" + b.dataset.set); }).map(function (b) { return b.dataset.set; });
    try { localStorage.setItem("access", on.join(" ")); } catch (e) {}
    settings.forEach(function (b) { b.setAttribute("aria-pressed", String(on.indexOf(b.dataset.set) > -1)); });
  }
  accessBtn.addEventListener("click", function () { setAccess(accessPanel.hidden); });
  settings.forEach(function (b) {
    b.addEventListener("click", function () {
      var on = doc.classList.toggle("a-" + b.dataset.set);
      if (b.dataset.set === "still") setMotion(!on);
      saveAccess();
    });
  });
  accessPanel.querySelector("[data-reset]").addEventListener("click", function () {
    settings.forEach(function (b) { doc.classList.remove("a-" + b.dataset.set); });
    saveAccess();
    setMotion(true);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !accessPanel.hidden) { setAccess(false); accessBtn.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!accessPanel.hidden && !e.target.closest("[data-access]")) setAccess(false);
  });
  saveAccess();

  var smooth = window.scrollY, running = false;
  function tick() {
    var target = window.scrollY;
    smooth += (target - smooth) * (motion ? .16 : 1);
    if (Math.abs(target - smooth) < .4) smooth = target;
    paint(smooth);
    if (smooth !== target) requestAnimationFrame(tick); else running = false;
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function refresh() { measure(); groups.forEach(function (g) { g.kids.forEach(function (k) { k.last = -1; }); }); paint(window.scrollY); }
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", refresh);
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  document.querySelectorAll("details").forEach(function (d) { d.addEventListener("toggle", measure); });
  document.querySelectorAll("img").forEach(function (i) { if (!i.complete) i.addEventListener("load", measure, { once: true }); });
  refresh();
})();
