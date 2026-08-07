  /* =====================================================================
     12 · Deep links, command palette, reading position
     ===================================================================== */

  /* ---- deep-linkable case studies -------------------------------------
     #specimen/<id> opens that case study on load and on back/forward, so a
     specimen can be sent as a link instead of "scroll down and click". */
  (function deepLinks() {
    var PREFIX = "#specimen/";
    function idFromHash() {
      var h = location.hash || "";
      return h.indexOf(PREFIX) === 0 ? h.slice(PREFIX.length) : null;
    }
    function sync(push) {
      var id = idFromHash();
      if (id && byId[id]) {
        if (!dlg.open || currentCaseId !== id) openCase(id, null, true);
      } else if (dlg.open) {
        closeCase(true);
      }
    }
    window.addEventListener("hashchange", sync);
    /* run once the grid exists, so the trigger button can be found */
    if (idFromHash()) window.setTimeout(sync, 0);
  })();

  /* ---- reading position on the z-rail ---------------------------------
     The focal marker already says which plane you are on; this says how far
     through the specimen you are. */
  (function readingPosition() {
    var bar = $("#railprog");
    if (!bar) return;
    /* Deliberately synchronous. The rAF-throttled version silently stopped
       updating whenever rAF was starved, which left the bar pinned at 0 —
       and the work here is one arithmetic step and one custom-property
       write, well inside a scroll frame's budget. */
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      bar.setAttribute("aria-valuenow", Math.round(p * 100));
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    /* the grid is built by script, so the page gets taller after first paint */
    window.setTimeout(update, 0);
    window.setTimeout(update, 600);
    update();
  })();

  /* ---- command palette -------------------------------------------------
     ⌘K / Ctrl-K, or "/" . Sections, specimens and the few real actions. */
  (function palette() {
    var pal = $("#pal"), input = $("#palq"), list = $("#pallist");
    if (!pal || !input || !list) return;

    var items = [];
    $$(".rail__link").forEach(function (a) {
      var t = a.querySelector("span:last-child");
      items.push({ kind: "Plane", label: t ? t.textContent.trim() : a.textContent.trim(),
                   run: function () { a.click(); } });
    });
    PROJECTS.forEach(function (p) {
      items.push({ kind: "Specimen", label: p.title + " — " + p.sub,
                   run: function () { openCase(p.id, null); } });
    });
    items.push({ kind: "Action", label: "Résumé — read it",
                 run: function () { location.href = "resume.html"; } });
    items.push({ kind: "Action", label: "Résumé — download the PDF",
                 run: function () { location.href = "resume.pdf"; } });
    items.push({ kind: "Action", label: "Email Jihang",
                 run: function () { location.href = "mailto:lijihang21@gmail.com"; } });
    items.push({ kind: "Action", label: "Source of this page on GitHub",
                 run: function () { window.open("https://github.com/JihangLi1121/jihangli1121.github.io", "_blank", "noopener"); } });
    items.push({ kind: "Action", label: "Switch channel — 488 / 561",
                 run: function () { setChannel(root.getAttribute("data-channel") === "b" ? "a" : "b", true); } });
    items.push({ kind: "Action", label: "Switch field — darkfield / brightfield",
                 run: function () { setTheme(CH.isLight ? "dark" : "light"); } });

    var shown = [], cur = 0, lastFocus = null;

    function score(it, q) {
      if (!q) return 0;
      var s = (it.kind + " " + it.label).toLowerCase();
      var i = s.indexOf(q);
      return i < 0 ? -1 : i;
    }
    function render() {
      var q = input.value.trim().toLowerCase();
      shown = items
        .map(function (it) { return { it: it, s: score(it, q) }; })
        .filter(function (r) { return r.s >= 0; })
        .sort(function (a, b) { return a.s - b.s; })
        .map(function (r) { return r.it; });
      if (cur >= shown.length) cur = Math.max(0, shown.length - 1);
      list.innerHTML = shown.length
        ? shown.map(function (it, i) {
            return '<li role="option" aria-selected="' + (i === cur) + '"' +
              (i === cur ? ' class="is-on"' : "") + ' data-i="' + i + '">' +
              '<span class="pal__kind">' + esc(it.kind) + "</span>" +
              '<span class="pal__label">' + esc(it.label) + "</span></li>";
          }).join("")
        : '<li class="pal__empty">Nothing matches that.</li>';
    }
    function open() {
      lastFocus = document.activeElement;
      pal.hidden = false;
      root.classList.add("pal-open");
      input.value = ""; cur = 0; render();
      input.focus();
    }
    function close() {
      pal.hidden = true;
      root.classList.remove("pal-open");
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }
    function run(i) {
      var it = shown[i];
      if (!it) return;
      close();
      window.setTimeout(it.run, 10);
    }

    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) ||
                   e.target.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); pal.hidden ? open() : close(); return;
      }
      if (e.key === "/" && !typing && pal.hidden && !dlg.open) { e.preventDefault(); open(); return; }
      if (pal.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); cur = Math.min(cur + 1, shown.length - 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cur = Math.max(cur - 1, 0); render(); }
      else if (e.key === "Enter") { e.preventDefault(); run(cur); }
    });
    input.addEventListener("input", function () { cur = 0; render(); });
    list.addEventListener("click", function (e) {
      var li = e.target.closest("li[data-i]");
      if (li) run(parseInt(li.getAttribute("data-i"), 10));
    });
    pal.addEventListener("click", function (e) { if (e.target === pal) close(); });
    $$("[data-pal-open]").forEach(function (b) {
      b.addEventListener("click", function () { pal.hidden ? open() : close(); });
    });
  })();

  /* ---- printing ------------------------------------------------------
     Metrics count up from 0 when scrolled into view, so anything still
     off-screen printed as "0". Settle every counter before the sheet is
     rendered, and let the reveal animation finish too. */
  (function printReady() {
    function settle() {
      $$("[data-count]").forEach(function (el) {
        var target = parseFloat(el.getAttribute("data-count")) || 0;
        el.textContent = fmt(target) + (el.getAttribute("data-suffix") || "");
      });
      $$(".rv").forEach(function (el) { el.classList.add("is-in"); });
    }
    window.addEventListener("beforeprint", settle);
    if (window.matchMedia) {
      var mq = window.matchMedia("print");
      var on = mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq);
      on(function (e) { if (e.matches) settle(); });
    }
  })();
