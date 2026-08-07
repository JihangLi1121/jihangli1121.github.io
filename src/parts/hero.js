  /* =====================================================================
     4c · Hero field — the real embryo, developing behind the title.
     171 frames of solver output on a slow loop, drifting on its own axis.
     ===================================================================== */
  (function heroField() {
    var canvas = $("#field-canvas");
    if (!canvas || !CU) return;

    var R = CUGL(canvas);
    /* Loop a window of the series rather than the whole run: past ~90 frames
       the embryo is a dense mass that composites to a white blob behind the
       type. F0..F1 keeps individual cells and their divisions legible. */
    var F0 = 16, F1 = 92;
    var pop = [], t = F0, yaw = 0.5, raf = 0, last = performance.now();
    var SPEED = 6.2;                                   /* frames per second */
    /* the hero canvas is very tall; sit well back so the embryo reads as a
       field of cells across the frame rather than a few giant spheres */
    var dist = CU.extent * 3.0;

    /* ---------- WebGL path ---------- */
    /* Behind type, four competing hues read as mud. Pull hard toward the live
       channel so the field is one colour with lineage showing only as variation. */
    function colOf(c) {
      var rgb = founderRGB(CU.founder[c.id]);
      var acc = CH.cur, m = 0.74;
      return [
        rgb[0] * (1 - m) + (acc[0] / 255) * m,
        rgb[1] * (1 - m) + (acc[1] / 255) * m,
        rgb[2] * (1 - m) + (acc[2] / 255) * m,
        0.58
      ];
    }

    function stepGL(now) {
      var dt = Math.min(64, now - last); last = now;
      CH.tick(dt);
      if (!REDUCE) { t += (dt / 1000) * SPEED; yaw += dt * 0.000042; }
      if (t >= F1) t -= (F1 - F0);

      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      var asp = R.resize(r.width, r.height, dpr);
      var view = orbit(yaw, -0.22 + Math.sin(yaw * 0.7) * 0.1, dist, asp);

      CU.sample(t, pop);
      R.upload(pop, colOf, view);
      /* softer and glowier than the viewer — this is atmosphere, not an instrument */
      R.draw(view, {
        rim:  CH.isLight ? 0.85 : 2.00,
        amb:  CH.isLight ? 0.26 : 0.08,
        gain: CH.isLight ? 0.74 : 0.90,
        emis: CH.isLight ? 0.44 : 0.58,
        fogA: dist * 0.95, fogB: dist * 2.5,
        halo: CH.isLight ? 0.10 : 0.34, haloSize: 2.3,
        bloom: CH.isLight ? 0.42 : 0.80, bloomThresh: 0.58
      });
      raf = REDUCE ? 0 : requestAnimationFrame(stepGL);
    }

    /* ---------- 2D fallback: same data, depth-sorted soft discs ---------- */
    function step2D(now) {
      var dt = Math.min(64, now - last); last = now;
      CH.tick(dt);
      if (!REDUCE) { t += (dt / 1000) * SPEED; yaw += dt * 0.000042; }
      if (t >= F1) t -= (F1 - F0);

      var m = fit(canvas), ctx = m.ctx, w = m.w, h = m.h;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = CH.groundCss(1);
      ctx.fillRect(0, 0, w, h);

      CU.sample(t, pop);
      var cy2 = Math.cos(-0.22), sy2 = Math.sin(-0.22);
      var cs = Math.cos(yaw), sn = Math.sin(yaw);
      var sc = Math.min(w, h) / (CU.extent * 2.5);
      pop.forEach(function (c) {
        var x = c.x * cs + c.z * sn, z = -c.x * sn + c.z * cs;
        var y = c.y * cy2 - z * sy2;
        c._sx = w / 2 + x * sc; c._sy = h / 2 + y * sc;
        c._sz = c.y * sy2 + z * cy2;
        c._sr = ((c.a + c.b + c.c) / 3) * c.k * sc;
      });
      pop.sort(function (p, q) { return p._sz - q._sz; });
      ctx.globalCompositeOperation = CH.isLight ? "source-over" : "lighter";
      pop.forEach(function (c) {
        var rgb = founderRGB(CU.founder[c.id]);
        var g = ctx.createRadialGradient(c._sx, c._sy, 0, c._sx, c._sy, Math.max(1, c._sr));
        var col = (rgb[0] * 255 | 0) + "," + (rgb[1] * 255 | 0) + "," + (rgb[2] * 255 | 0);
        g.addColorStop(0, "rgba(" + col + "," + (0.30 * c.al) + ")");
        g.addColorStop(0.62, "rgba(" + col + "," + (0.13 * c.al) + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c._sx, c._sy, Math.max(1, c._sr), 0, 6.2832); ctx.fill();
      });
      raf = REDUCE ? 0 : requestAnimationFrame(step2D);
    }

    var step = R ? stepGL : step2D;

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && !REDUCE && !raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    });
    if (REDUCE) { t = (F0 + F1) / 2; step(performance.now()); }
    else raf = requestAnimationFrame(step);
    window.addEventListener("resize", function () { if (REDUCE) step(performance.now()); });
  })();
