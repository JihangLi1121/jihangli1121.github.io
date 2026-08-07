  /* METHOD DIAGRAM ----------------------------------------------------------
     The two decisions that made Deadly Corridor trainable: a reward the stock
     config could not express, and a difficulty ladder. Both come straight from
     the report (§3.4.1, Table 3.2, §3.4.2). Inline SVG so it stays crisp and
     picks up the live channel colour through currentColor.
     ---------------------------------------------------------------------- */
  function methodHTML() {
    var T = [
      { term: "movement reward", w: "", why: "the map's own signal — positive for closing on the vest", sign: "n" },
      { term: "200 × Δhitcount", w: "+", why: "engage, don't sprint past the enemies", sign: "p" },
      { term: "10 × Δdamage", w: "−", why: "hold position, dodge", sign: "m" },
      { term: "5 × Δammo", w: "−", why: "don't spray shots", sign: "m" }
    ];
    var rows = T.map(function (t, i) {
      var y = 70 + i * 46;
      var col = t.sign === "p" ? "var(--accent)" : t.sign === "m" ? "var(--muted)" : "var(--text)";
      return '<g>' +
        '<text x="20" y="' + y + '" class="m-sign">' + t.w + "</text>" +
        '<text x="46" y="' + y + '" class="m-term" fill="' + col + '">' + t.term + "</text>" +
        '<text x="46" y="' + (y + 17) + '" class="m-why">' + t.why + "</text>" +
      "</g>";
    }).join("");

    /* One timeline, not five rows: width is how long each stage ran, height is
       how hard it was. Skill 1 taking ~71% of the run is the actual finding. */
    var stages = [
      { n: "Skill 1", dur: 400 }, { n: "2", dur: 40 },
      { n: "3", dur: 40 }, { n: "4", dur: 40 }, { n: "5", dur: 40 }
    ];
    var x0 = 20, x1 = 300, base = 200, TOT = 560;
    var at = x0;
    var bars = stages.map(function (st, i) {
      var w = (st.dur / TOT) * (x1 - x0);
      var hgt = 26 + i * 13;                       /* difficulty, drawn upward */
      var y = base - hgt;
      var g = '<g>' +
        '<rect x="' + at.toFixed(1) + '" y="' + y + '" width="' + Math.max(2, w - 1.5).toFixed(1) +
          '" height="' + hgt + '" fill="var(--accent)" opacity="' + (0.30 + i * 0.16).toFixed(2) + '" rx="1"></rect>' +
        '<text x="' + (at + w / 2).toFixed(1) + '" y="' + (base + 13) + '" class="m-stage" text-anchor="middle">' +
          st.n + "</text>" +
        (i === 0 ? '<text x="' + (at + w / 2).toFixed(1) + '" y="' + (y - 7) +
          '" class="m-note" text-anchor="middle">400k steps · ent_coef 0.02</text>' : "") +
      "</g>";
      at += w;
      return g;
    }).join("");

    return '<div class="frame"><div class="method">' +
      '<svg class="m-svg" viewBox="0 0 320 300" role="img" ' +
        'aria-label="Reward function: movement reward, plus 200 times change in hitcount, minus 10 times damage taken, minus 5 times ammo used, all scaled by 0.01.">' +
        '<text x="20" y="30" class="m-hd">REWARD FUNCTION</text>' +
        '<text x="20" y="48" class="m-sub">the stock config exposes none of these counters —</text>' +
        '<text x="20" y="60" class="m-sub">a custom VizDoomGym wrapper had to read them</text>' +
        rows +
        '<line x1="20" y1="262" x2="300" y2="262" class="m-rule"></line>' +
        '<text x="20" y="282" class="m-foot">× 0.01 scaling — keeps gradients from exploding</text>' +
      "</svg>" +
      '<svg class="m-svg" viewBox="0 0 320 300" role="img" ' +
        'aria-label="Curriculum: Skill 1 for the first 400k steps, then Skills 2 through 5 for 40k steps each, to 560k total. Bar height rises with difficulty.">' +
        '<text x="20" y="30" class="m-hd">CURRICULUM</text>' +
        '<text x="20" y="48" class="m-sub">dropped straight into skill 5 the agent dies before</text>' +
        '<text x="20" y="60" class="m-sub">it learns anything — so difficulty ramps</text>' +
        bars +
        '<line x1="20" y1="200.5" x2="300" y2="200.5" class="m-rule"></line>' +
        '<text x="20" y="234" class="m-axis">0</text>' +
        '<text x="300" y="234" class="m-axis" text-anchor="end">560k steps</text>' +
        '<text x="20" y="262" class="m-foot">bar width = steps · height = difficulty</text>' +
        '<text x="20" y="278" class="m-foot">entropy annealed from 0.02 as difficulty rose</text>' +
      "</svg>" +
      "</div>" +
      '<div class="frame__cap"><em>Method — reward shaping and the difficulty ladder</em>' +
      "<span>CS 271P report §3.4</span></div></div>";
  }

