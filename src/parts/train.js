  /* TRAINING CURVES ---------------------------------------------------------
     The TensorBoard logs are not in the repo, so this is NOT raw telemetry.
     Every marked point is a value the CS 271P report states in prose; the line
     between markers is interpolation and is drawn dashed and labelled as such.
     If the .tfevents files turn up, swap ANCHORS for the real series and drop
     the "reconstructed" note — nothing else has to change.
     ---------------------------------------------------------------------- */
  var TRAIN_BASIC = {
    label: "basic.cfg · PPO mean reward",
    xMax: 300, xUnit: "k steps",
    yMin: -60, yMax: 100,
    ticks: [-50, 0, 50, 100],
    /* report §3.1.4: starts ≈ −50, positive within 50k, improving to ~100k,
       plateau 75–80, final 76.31 at 300k */
    anchors: [
      { x: 0,   y: -50,  note: "≈ −50 at start" },
      { x: 50,  y: 8,    note: "positive by 50k" },
      { x: 100, y: 70,   note: "plateau begins" },
      { x: 300, y: 76.31, note: "76.31 final", end: true }
    ]
  };
  var TRAIN_CORRIDOR = {
    label: "Deadly Corridor · mean episode length",
    xMax: 560, xUnit: "k steps",
    yMin: 0, yMax: 260,
    ticks: [0, 100, 200],
    /* report §3.4.2: 140–160 initially, 200–220 through Skill 1, dips at each
       curriculum transition, sharp decline after 500k in Skills 4–5 */
    anchors: [
      { x: 0,   y: 150, note: "140–160 steps" },
      { x: 200, y: 195 },
      { x: 400, y: 212, note: "200–220 · Skill 1" },
      { x: 440, y: 186 },
      { x: 480, y: 172 },
      { x: 520, y: 150 },
      { x: 560, y: 118, note: "Skills 4–5", end: true }
    ],
    /* the curriculum steps up every 40k after the first 400k */
    stages: [400, 440, 480, 520]
  };

  function trainHTML() {
    return '<div class="frame"><div class="plot-wrap"><canvas id="traincanvas" ' +
      'aria-label="Training progress. Basic scenario PPO mean reward rises from about minus 50 to 76.31 over ' +
      '300k steps. Deadly Corridor mean episode length runs from 140 to 160 steps, up to 200 to 220 through ' +
      'Skill 1, then falls to about 118 as the curriculum reaches Skills 4 and 5 at 560k steps."></canvas></div>' +
      '<div class="frame__cap"><em>Reported checkpoints — the line between them is interpolated, not logged</em>' +
      "<span>Curriculum steps at 400 · 440 · 480 · 520k</span></div></div>";
  }

  function initTrain() {
    var canvas = $("#traincanvas", caseBody);
    if (!canvas) return;
    var alive = true, raf = 0, t0 = performance.now();

    function curve(ctx, P, x0, y0, w, h, prog, light) {
      var padL = 40, padT = 26, padB = 30, padR = 12;
      var pw = w - padL - padR, ph = h - padT - padB;
      if (pw < 40 || ph < 30) return;
      var X = function (v) { return x0 + padL + (v / P.xMax) * pw; };
      var Y = function (v) { return y0 + padT + ph - ((v - P.yMin) / (P.yMax - P.yMin)) * ph; };

      ctx.font = '9px ui-monospace, Menlo, monospace';
      ctx.textAlign = "left";
      ctx.fillStyle = light ? "rgba(20,50,45,.62)" : "rgba(150,180,176,.66)";
      ctx.fillText(P.label.toUpperCase(), x0 + padL, y0 + 12);

      /* curriculum stage boundaries */
      if (P.stages) {
        ctx.strokeStyle = light ? "rgba(20,50,45,.2)" : "rgba(150,180,176,.2)";
        ctx.setLineDash([2, 4]);
        P.stages.forEach(function (sx) {
          ctx.beginPath();
          ctx.moveTo(Math.round(X(sx)) + 0.5, y0 + padT);
          ctx.lineTo(Math.round(X(sx)) + 0.5, y0 + padT + ph);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = light ? "rgba(20,50,45,.13)" : "rgba(140,175,170,.13)";
      ctx.textAlign = "right";
      P.ticks.forEach(function (v) {
        var y = Math.round(Y(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(x0 + padL, y); ctx.lineTo(x0 + padL + pw, y); ctx.stroke();
        ctx.fillStyle = light ? "rgba(20,50,45,.5)" : "rgba(150,180,176,.55)";
        ctx.fillText(String(v), x0 + padL - 6, y + 3);
      });

      /* the interpolated path — dashed, because it is not measured */
      var A = P.anchors;
      var upto = prog * (A.length - 1);
      ctx.strokeStyle = CH.css(0.75);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(A[0].x), Y(A[0].y));
      for (var i = 1; i < A.length; i++) {
        var t = Math.max(0, Math.min(1, upto - (i - 1)));
        if (t <= 0) break;
        ctx.lineTo(X(A[i - 1].x + (A[i].x - A[i - 1].x) * t),
                   Y(A[i - 1].y + (A[i].y - A[i - 1].y) * t));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* the anchors themselves — these are the reported numbers */
      ctx.textAlign = "center";
      A.forEach(function (a, i) {
        if (i > upto) return;
        ctx.fillStyle = CH.css(1);
        ctx.beginPath(); ctx.arc(X(a.x), Y(a.y), a.end ? 3.4 : 2.4, 0, 6.2832); ctx.fill();
        if (a.note) {
          ctx.fillStyle = light ? "rgba(20,50,45,.72)" : "rgba(200,220,216,.75)";
          var tx = Math.min(x0 + w - 44, Math.max(x0 + padL + 24, X(a.x)));
          ctx.fillText(a.note, tx, Y(a.y) - 9);
        }
      });

      ctx.textAlign = "left";
      ctx.fillStyle = light ? "rgba(20,50,45,.45)" : "rgba(150,180,176,.5)";
      ctx.fillText("0", x0 + padL, y0 + padT + ph + 14);
      ctx.textAlign = "right";
      ctx.fillText(P.xMax + " " + P.xUnit, x0 + padL + pw, y0 + padT + ph + 14);
    }

    function draw(prog) {
      if (!alive) return;
      var m = fit(canvas), ctx = m.ctx, w = m.w, h = m.h;
      var light = CH.isLight;
      ctx.fillStyle = light ? "#EFF2ED" : "#05090B";
      ctx.fillRect(0, 0, w, h);
      if (w < 620) {
        curve(ctx, TRAIN_BASIC, 0, 0, w, h / 2, prog, light);
        curve(ctx, TRAIN_CORRIDOR, 0, h / 2, w, h / 2, prog, light);
      } else {
        curve(ctx, TRAIN_BASIC, 0, 0, w / 2, h, prog, light);
        curve(ctx, TRAIN_CORRIDOR, w / 2, 0, w / 2, h, prog, light);
        ctx.strokeStyle = light ? "rgba(20,50,45,.13)" : "rgba(140,175,170,.13)";
        ctx.beginPath(); ctx.moveTo(w / 2 + 0.5, 14); ctx.lineTo(w / 2 + 0.5, h - 20); ctx.stroke();
      }
    }

    function loop(now) {
      if (!alive) return;
      var p = REDUCE ? 1 : Math.min(1, (now - t0) / 1400);
      draw(1 - Math.pow(1 - p, 3));
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

