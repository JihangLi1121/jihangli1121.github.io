  /* =====================================================================
     9 · CellUniverse viewer — 3D reconstruction + radial lineage tree,
     both driven by the same timeline over the real solver export.
     ===================================================================== */
  function initViewer() {
    var canvas = $("#vcanvas", caseBody);
    if (!canvas || !CU) return;
    var tcan = $("#treecanvas", caseBody);

    var R = CUGL(canvas);
    var yaw = 0.62, pitch = -0.30, zoom = 1, raf = 0, alive = true;
    var t = 0, playing = !REDUCE, iso = 0, mode = 0, drag = null, pinch = 0;
    var MODES = ["lineage", "generation", "depth"];
    var opt = { links: true, spin: !REDUCE };
    /* far enough that the fully-divided embryo (306 cells) still fits the frame */
    var pop = [], dist0 = CU.extent * 3.5;

    /* first/last frame each node is present — lets the tree grow with time */
    var first = new Int16Array(CU.nCells).fill(32767), last = new Int16Array(CU.nCells).fill(-1);
    for (var f = 0; f < CU.frames; f++) {
      CU.alive(f).forEach(function (o, id) {
        if (f < first[id]) first[id] = f;
        if (f > last[id]) last[id] = f;
      });
    }

    var el = {
      cells: $("#r-cells", caseBody), div: $("#r-div", caseBody), gen: $("#r-gen", caseBody),
      obl: $("#r-obl", caseBody), yaw: $("#r-yaw", caseBody), zoom: $("#r-zoom", caseBody),
      stamp: $("#v-stamp", caseBody), scrub: $("#v-scrub", caseBody),
      play: $("#v-play", caseBody), playi: $("#v-playi", caseBody),
      rate: $("#v-rate", caseBody), modename: $("#v-modename", caseBody),
      legend: $("#v-legend", caseBody)
    };
    if (el.scrub) el.scrub.max = String(CU.frames - 1);

    /* ---- founder legend / isolate ---- */
    if (el.legend) {
      var html = "";
      for (var fi = 1; fi <= 4; fi++) {
        var rgb = founderRGB(fi);
        html += '<button type="button" class="lg" data-f="' + fi + '" aria-pressed="false">' +
          '<i style="background:rgb(' + (rgb[0] * 255 | 0) + ',' + (rgb[1] * 255 | 0) + ',' + (rgb[2] * 255 | 0) + ')"></i>' +
          "P" + fi + "</button>";
      }
      el.legend.innerHTML = html;
      $$(".lg", el.legend).forEach(function (b) {
        b.addEventListener("click", function () {
          var v = +b.getAttribute("data-f");
          iso = (iso === v) ? 0 : v;
          $$(".lg", el.legend).forEach(function (o) {
            o.setAttribute("aria-pressed", String(+o.getAttribute("data-f") === iso));
          });
          render();
        });
      });
    }

    /* ---- colour ---- */
    function colOf(c) {
      var dim = (iso && CU.founder[c.id] !== iso) ? 0.14 : 1;
      var rgb;
      if (mode === 0) rgb = founderRGB(CU.founder[c.id]);
      else if (mode === 1) {
        var g = CU.gen[c.id] / Math.max(1, CU.maxGen);
        var a = CH.cur;
        rgb = [(a[0] / 255) * (0.35 + 0.65 * g), (a[1] / 255) * (0.30 + 0.70 * (1 - g * 0.4)), (a[2] / 255) * (0.45 + 0.55 * (1 - g))];
      } else {
        var d = (c.z + CU.extent) / (2 * CU.extent);
        rgb = [0.30 + 0.70 * d, 0.55 + 0.35 * (1 - Math.abs(d - 0.5) * 2), 1.0 - 0.55 * d];
      }
      if (c.born === 1) rgb = [Math.min(1, rgb[0] + 0.5), Math.min(1, rgb[1] + 0.5), Math.min(1, rgb[2] + 0.5)];
      return [rgb[0] * dim, rgb[1] * dim, rgb[2] * dim, dim < 1 ? 0.35 : 1];
    }

    /* ---- radial lineage tree ---- */
    function drawTree(frame) {
      if (!tcan) return;
      var m = fit(tcan), ctx = m.ctx, w = m.w, h = m.h;
      var cx = w / 2, cy = h / 2, R1 = Math.min(w, h) / 2 - 8, R0 = R1 * 0.10;
      var light = CH.isLight;
      ctx.clearRect(0, 0, w, h);
      /* A collapsed or not-yet-laid-out canvas makes R1 negative, and arc()
         throws on a negative radius — which would abort render() before the
         readouts update. Bail instead. */
      if (!(R1 > 4)) return;

      function rad(g) { return Math.max(0, R0 + (R1 - R0) * (g / Math.max(1, CU.maxGen))); }
      function px(a, r) { return [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)]; }

      /* generation rings */
      ctx.strokeStyle = light ? "rgba(20,50,45,.13)" : "rgba(140,180,175,.11)";
      ctx.lineWidth = 1;
      for (var g = 0; g <= CU.maxGen; g++) {
        ctx.beginPath(); ctx.arc(cx, cy, rad(g), 0, 6.2832); ctx.stroke();
      }

      var liveSet = CU.alive(frame);
      for (var c = 0; c < CU.nCells; c++) {
        if (first[c] > frame) continue;                       /* not yet born */
        var p = CU.parent[c];
        var isLive = liveSet.has(c);
        var fRGB = founderRGB(CU.founder[c]);
        var dimmed = iso && CU.founder[c] !== iso;
        var al = dimmed ? 0.10 : (isLive ? 0.95 : 0.30);
        var col = "rgba(" + (fRGB[0] * 255 | 0) + "," + (fRGB[1] * 255 | 0) + "," + (fRGB[2] * 255 | 0) + "," + al + ")";
        ctx.strokeStyle = col;
        ctx.lineWidth = isLive && !dimmed ? 1.6 : 1;

        if (p >= 0) {
          var rp = rad(CU.gen[p]), rc = rad(CU.gen[c]);
          var ap = CU.ang[p], ac = CU.ang[c];
          ctx.beginPath();                                    /* sibling arc at parent radius */
          ctx.arc(cx, cy, rp, Math.min(ap, ac) - Math.PI / 2, Math.max(ap, ac) - Math.PI / 2);
          ctx.stroke();
          var s = px(ac, rp), e = px(ac, rc);                 /* radial spoke out to the child */
          ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
        }
        if (isLive && !dimmed) {                              /* tip marker on live cells */
          var q = px(CU.ang[c], rad(CU.gen[c]));
          ctx.fillStyle = col;
          var born = first[c] > frame - 2;
          ctx.beginPath(); ctx.arc(q[0], q[1], born ? 2.6 : 1.5, 0, 6.2832); ctx.fill();
          if (born) {                                         /* fresh division flash */
            ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(q[0], q[1], 5.2, 0, 6.2832); ctx.stroke();
          }
        }
      }
    }

    /* click a wedge of the tree to isolate that founder */
    if (tcan) {
      tcan.addEventListener("click", function (e) {
        var r = tcan.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        if (Math.hypot(dx, dy) < 6) { iso = 0; }
        else {
          var a = Math.atan2(dy, dx) + Math.PI / 2;
          if (a < 0) a += 2 * Math.PI;
          var q = Math.floor(a / (Math.PI / 2)) + 1;
          iso = (iso === q) ? 0 : q;
        }
        $$(".lg", el.legend).forEach(function (o) {
          o.setAttribute("aria-pressed", String(+o.getAttribute("data-f") === iso));
        });
        render();
      });
    }

    /* ---- controls ---- */
    function setOpt(k, v) {
      opt[k] = v;
      var b = caseBody.querySelector('[data-v="' + k + '"]');
      if (b) b.setAttribute("aria-pressed", String(!!v));
      render();
    }
    $$(".vctl button", caseBody).forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-v");
        if (k === "reset") { yaw = 0.62; pitch = -0.30; zoom = 1; iso = 0;
          $$(".lg", el.legend).forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
          setOpt("spin", !REDUCE); return; }
        if (k === "mode") {
          mode = (mode + 1) % 3;
          if (el.modename) el.modename.textContent = "Colour: " + MODES[mode];
          render(); return;
        }
        setOpt(k, b.getAttribute("aria-pressed") !== "true");
      });
    });

    function setPlay(v) {
      playing = v;
      if (el.playi) el.playi.textContent = v ? "❙❙" : "▶";
      if (el.play) el.play.setAttribute("aria-label", v ? "Pause the time series" : "Play the time series");
    }
    if (el.play) el.play.addEventListener("click", function () { setPlay(!playing); });
    if (el.scrub) {
      el.scrub.addEventListener("input", function () {
        t = +el.scrub.value; setPlay(false); render();
      });
    }
    function stopSpin() { if (opt.spin) setOpt("spin", false); }

    /* ---- orbit interaction ---- */
    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY };
      canvas.classList.add("is-drag");
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      stopSpin();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      yaw += (e.clientX - drag.x) * 0.008;
      pitch = clamp(pitch + (e.clientY - drag.y) * 0.006, -1.35, 1.35);
      drag.x = e.clientX; drag.y = e.clientY;
      render();
    });
    function endDrag() { drag = null; canvas.classList.remove("is-drag"); }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoom = clamp(zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.4, 4.2);
      stopSpin(); render();
    }, { passive: false });
    canvas.addEventListener("keydown", function (e) {
      var k = e.key, st = 0.09;
      if (k === "ArrowLeft") yaw -= st;
      else if (k === "ArrowRight") yaw += st;
      else if (k === "ArrowUp") pitch = clamp(pitch - st, -1.35, 1.35);
      else if (k === "ArrowDown") pitch = clamp(pitch + st, -1.35, 1.35);
      else if (k === "+" || k === "=") zoom = clamp(zoom * 1.1, 0.4, 4.2);
      else if (k === "-") zoom = clamp(zoom / 1.1, 0.4, 4.2);
      else if (k === " ") { setPlay(!playing); e.preventDefault(); return; }
      else return;
      e.preventDefault(); stopSpin(); render();
    });
    canvas.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        stopSpin();
      }
    }, { passive: true });
    canvas.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom = clamp(zoom * (d / pinch), 0.4, 4.2); pinch = d; render();
      }
    }, { passive: false });
    canvas.addEventListener("touchend", function () { pinch = 0; });

    /* ---- 2D fallback when WebGL2 is unavailable ---- */
    function draw2D() {
      var m = fit(canvas), ctx = m.ctx, w = m.w, h = m.h;
      ctx.fillStyle = CH.isLight ? "#EFF2ED" : "#05090B";
      ctx.fillRect(0, 0, w, h);
      var cs = Math.cos(yaw), sn = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var sc = Math.min(w, h) / (CU.extent * 2.4) * zoom;
      pop.forEach(function (c) {
        var x = c.x * cs + c.z * sn, z = -c.x * sn + c.z * cs;
        c._sx = w / 2 + x * sc; c._sy = h / 2 + (c.y * cp - z * sp) * sc;
        c._sz = c.y * sp + z * cp;
        c._sr = ((c.a + c.b + c.c) / 3) * c.k * sc;
      });
      pop.sort(function (p, q) { return p._sz - q._sz; });
      ctx.globalCompositeOperation = CH.isLight ? "source-over" : "lighter";
      pop.forEach(function (c) {
        var col = colOf(c);
        var s = (col[0] * 255 | 0) + "," + (col[1] * 255 | 0) + "," + (col[2] * 255 | 0);
        var g = ctx.createRadialGradient(c._sx, c._sy, 0, c._sx, c._sy, Math.max(1, c._sr));
        g.addColorStop(0, "rgba(" + s + "," + (0.62 * c.al) + ")");
        g.addColorStop(0.7, "rgba(" + s + "," + (0.20 * c.al) + ")");
        g.addColorStop(1, "rgba(" + s + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c._sx, c._sy, Math.max(1, c._sr), 0, 6.2832); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    }

    /* ---- render ---- */
    function render() {
      if (!alive) return;
      var frame = Math.max(0, Math.min(CU.frames - 1, Math.round(t)));
      CU.sample(t, pop);

      if (R) {
        var r = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var asp = R.resize(r.width, r.height, dpr);
        var dist = dist0 / zoom;
        var view = orbit(yaw, pitch, dist, asp);
        R.upload(pop, colOf, view);
        R.draw(view, {
          rim:  CH.isLight ? 0.95 : 1.70,
          amb:  CH.isLight ? 0.30 : 0.07,
          gain: CH.isLight ? 0.86 : 0.95,
          emis: CH.isLight ? 0.52 : 0.68,
          fogA: dist * 0.6, fogB: dist * 2.0,
          halo: CH.isLight ? 0.07 : 0.26, haloSize: 1.9,
          bloom: CH.isLight ? 0.32 : 0.70, bloomThresh: CH.isLight ? 0.72 : 0.62
        });
      } else draw2D();

      /* Readouts first: they are the instrument's actual output, and must not
         depend on a canvas drawing successfully. */
      var live = CU.counts[frame], mg = 0, obl = 0, n = 0;
      CU.alive(frame).forEach(function (o, id) {
        if (CU.gen[id] > mg) mg = CU.gen[id];
      });
      pop.forEach(function (c) { if (c.al > 0.5) { obl += 1 - c.c / Math.max(0.001, c.a); n++; } });
      if (el.cells) el.cells.textContent = live;
      if (el.div) el.div.textContent = CU.divisions[frame];
      if (el.gen) el.gen.textContent = mg;
      if (el.obl) el.obl.textContent = (n ? obl / n : 0).toFixed(2);
      if (el.yaw) el.yaw.textContent = (((yaw * 180 / Math.PI) % 360 + 360) % 360).toFixed(1) + "°";
      if (el.zoom) el.zoom.textContent = zoom.toFixed(2) + "×";
      if (el.stamp) el.stamp.textContent = "t" + String(frame + 1).padStart(3, "0") + " / " + CU.frames;
      if (el.scrub && document.activeElement !== el.scrub) el.scrub.value = String(t);

      drawTree(frame);
    }

    var last = performance.now();
    function loop() {
      if (!alive) return;
      var now = performance.now(), dt = Math.min(64, now - last); last = now;
      CH.tick(dt);
      var moved = false;
      if (playing && !REDUCE) {
        t += (dt / 1000) * 7.5;
        if (t > CU.frames - 1) t = 0;
        moved = true;
      }
      if (opt.spin && !REDUCE) { yaw += 0.0026; moved = true; }
      if (moved) render();
      raf = requestAnimationFrame(loop);
    }
    setPlay(playing);
    render();
    raf = requestAnimationFrame(loop);

    var onResize = function () { render(); };
    window.addEventListener("resize", onResize);
    teardown.push(function () {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (R) R.destroy();
    });
  }
