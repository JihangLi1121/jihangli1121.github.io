  /* Every number below is measured, taken from the CS 271P final report
     (Tables 3.1 and 3.3). Nothing here is interpolated or invented — the
     previous version drew a seeded-random curve, which had no business
     being captioned as a training result. */
  var DOOM_BASIC = {
    label: "basic.cfg · mean reward over 100 eval episodes",
    yMax: 100,
    bars: [
      { k: "A2C",      v: 0.94,  lo: 0.93, hi: 0.96 },
      { k: "DQN",      v: 13.88, lo: -20,  hi: 50 },
      { k: "Baseline", v: 77.23, ref: true },
      { k: "PPO",      v: 79.28, lo: 52,   hi: 95, win: true }
    ]
  };
  var DOOM_CORRIDOR = {
    label: "Deadly Corridor · skill 5 · 20 eval episodes",
    yMax: 2400,
    bars: [
      { k: "Baseline", v: 80.7, ref: true },
      { k: "PPO",      v: 673.53, sd: 835.19, lo: -104.39, hi: 2276.52, win: true }
    ]
  };

  function plotHTML() {
    return '<div class="frame"><div class="plot-wrap"><canvas id="plotcanvas" ' +
      'aria-label="Evaluation results. Basic scenario mean reward over 100 episodes: A2C 0.94, DQN 13.88, ' +
      'baseline 77.23, PPO 79.28. Deadly Corridor at skill 5 over 20 episodes: baseline 80.7, ' +
      'curriculum-trained PPO 673.53, best episode 2276.52."></canvas></div>' +
      '<div class="frame__cap"><em>Measured evaluation — CS 271P final report, Tables 3.1 &amp; 3.3</em>' +
      "<span>PPO 673.53 vs 80.7 baseline · 8.3×</span></div></div>";
  }

  function initPlot() {
    var canvas = $("#plotcanvas", caseBody);
    if (!canvas) return;
    var alive = true, raf = 0, t0 = performance.now();

    function panel(ctx, P, x0, y0, w, h, prog, light) {
      var padL = 34, padT = 26, padB = 30;
      var pw = w - padL - 10, ph = h - padT - padB;
      var Y = function (v) { return y0 + padT + ph - (Math.max(0, v) / P.yMax) * ph; };

      ctx.font = '9px ui-monospace, Menlo, monospace';
      ctx.textAlign = "left";
      ctx.fillStyle = light ? "rgba(20,50,45,.62)" : "rgba(150,180,176,.66)";
      ctx.fillText(P.label.toUpperCase(), x0 + padL, y0 + 12);

      /* gridlines + axis */
      var ticks = P.yMax > 200 ? [0, 800, 1600, 2400] : [0, 25, 50, 75, 100];
      ctx.strokeStyle = light ? "rgba(20,50,45,.13)" : "rgba(140,175,170,.13)";
      ctx.lineWidth = 1;
      ctx.textAlign = "right";
      ticks.forEach(function (v) {
        var y = Math.round(Y(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(x0 + padL, y); ctx.lineTo(x0 + padL + pw, y); ctx.stroke();
        ctx.fillStyle = light ? "rgba(20,50,45,.5)" : "rgba(150,180,176,.55)";
        ctx.fillText(String(v), x0 + padL - 6, y + 3);
      });

      var n = P.bars.length;
      var slot = pw / n, bw = Math.min(46, slot * 0.5);
      P.bars.forEach(function (b, i) {
        var cx = x0 + padL + slot * (i + 0.5);
        var v = b.v * prog;
        var top = Y(v), base = Y(0);

        /* observed range, where the report gives one */
        if (b.hi !== undefined && prog > 0.85) {
          var a = (prog - 0.85) / 0.15;
          ctx.strokeStyle = light ? "rgba(20,50,45,.34)" : "rgba(150,180,176,.36)";
          ctx.beginPath();
          ctx.moveTo(cx, Y(b.hi)); ctx.lineTo(cx, Y(Math.max(0, b.lo)));
          ctx.moveTo(cx - 5, Y(b.hi)); ctx.lineTo(cx + 5, Y(b.hi));
          ctx.moveTo(cx - 5, Y(Math.max(0, b.lo))); ctx.lineTo(cx + 5, Y(Math.max(0, b.lo)));
          ctx.globalAlpha = a; ctx.stroke(); ctx.globalAlpha = 1;
        }

        ctx.fillStyle = b.win ? CH.css(0.9)
          : b.ref ? (light ? "rgba(20,50,45,.34)" : "rgba(150,180,176,.32)")
          : (light ? "rgba(20,50,45,.2)" : "rgba(150,180,176,.2)");
        ctx.fillRect(cx - bw / 2, top, bw, Math.max(1, base - top));

        if (b.ref) {                                   /* baseline reference line */
          ctx.strokeStyle = light ? "rgba(20,50,45,.4)" : "rgba(150,180,176,.4)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(x0 + padL, Y(b.v)); ctx.lineTo(x0 + padL + pw, Y(b.v)); ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = light ? "rgba(20,50,45,.7)" : "rgba(150,180,176,.72)";
        ctx.fillText(b.k, cx, y0 + padT + ph + 13);
        ctx.fillStyle = b.win ? CH.css(1) : (light ? "rgba(20,50,45,.85)" : "rgba(215,232,229,.85)");
        ctx.fillText(b.v.toFixed(2), cx, Math.max(y0 + padT + 9, top - 5));
      });
    }

    function draw(prog) {
      if (!alive) return;
      var m = fit(canvas), ctx = m.ctx, w = m.w, h = m.h;
      var light = CH.isLight;
      ctx.fillStyle = light ? "#EFF2ED" : "#05090B";
      ctx.fillRect(0, 0, w, h);

      var stacked = w < 620;
      if (stacked) {
        panel(ctx, DOOM_BASIC, 0, 0, w, h / 2, prog, light);
        panel(ctx, DOOM_CORRIDOR, 0, h / 2, w, h / 2, prog, light);
      } else {
        panel(ctx, DOOM_BASIC, 0, 0, w / 2, h, prog, light);
        panel(ctx, DOOM_CORRIDOR, w / 2, 0, w / 2, h, prog, light);
        ctx.strokeStyle = light ? "rgba(20,50,45,.13)" : "rgba(140,175,170,.13)";
        ctx.beginPath(); ctx.moveTo(w / 2 + 0.5, 14); ctx.lineTo(w / 2 + 0.5, h - 20); ctx.stroke();
      }
    }

    function loop(now) {
      if (!alive) return;
      var p = REDUCE ? 1 : Math.min(1, (now - t0) / 900);
      var e = 1 - Math.pow(1 - p, 3);
      draw(e);
      if (p < 1) raf = requestAnimationFrame(loop);
    }
    if (REDUCE) draw(1); else raf = requestAnimationFrame(loop);

    var onResize = function () { draw(1); };
    window.addEventListener("resize", onResize);
    teardown.push(function () {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    });
  }
