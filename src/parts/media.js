  /* Real assets are optional. When assets/js/assets.js has been loaded it
     defines window.CU_ASSETS; the entries below replace the generated
     placeholders for that project. With no manifest — as in a standalone
     preview — every slot falls back to its on-theme placeholder, so the same
     index.html works deployed or on its own. */
  function applyAssets(p) {
    var A = window.CU_ASSETS && window.CU_ASSETS[p.id];
    if (!A || p._assets) return;
    p._assets = true;
    if (A.images && A.images.length) p.images = A.images;
    if (A.video) p.video = A.video;
  }

  function carouselHTML(p) {
    applyAssets(p);
    var imgs = p.images.map(function (im, i) {
      var real = !!im.src;
      var src = real ? im.src : placeholder(im.gen, im.seed);
      var alt = real ? im.cap : im.cap + " — generated placeholder for " + im.note;
      return '<img src="' + esc(src) + '"' +
        /* NB: no loading="lazy" — these live inside a <dialog>, which never
           counts as intersecting the viewport, so lazy images never load at
           all. The dialog itself is the deferral: nothing fetches until the
           case study is opened. */
        (real ? ' decoding="async"' : ' data-gen="' + im.gen + '" data-seed="' + im.seed + '" data-src-note="' + esc(im.note || "") + '"') +
        ' alt="' + esc(alt) + '" class="' + (i === 0 ? "is-on" : "") + '">';
    }).join("");
    var dots = p.images.map(function (im, i) {
      return '<button type="button" data-go="' + i + '" aria-current="' + (i === 0 ? "true" : "false") + '"><span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Slide ' + (i + 1) + "</span></button>";
    }).join("");
    return '<div class="frame">' +
      '<div class="carousel__stage" id="carstage">' + imgs +
        '<button class="navbtn navbtn--prev" type="button" data-step="-1" aria-label="Previous image">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 2 4 7l5 5"></path></svg></button>' +
        '<button class="navbtn navbtn--next" type="button" data-step="1" aria-label="Next image">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 2l5 5-5 5"></path></svg></button>' +
      "</div>" +
      '<div class="frame__cap"><em id="carcap">' + esc(p.images[0].cap) + "</em>" +
        '<span id="carpos">01 / ' + (p.images.length < 10 ? "0" : "") + p.images.length + "</span>" +
        '<div class="dots" role="group" aria-label="Choose image">' + dots + "</div></div>" +
    "</div>";
  }

  function videoHTML(p) {
    applyAssets(p);
    var v = p.video, real = !!v.src && !/^assets\/[a-z]+\/demo\.mp4$/.test(v.src);
    var poster = v.poster || placeholder(v.gen, v.seed, "poster placeholder");
    /* preload="none" keeps the clip off the wire until someone presses play —
       the poster is all a visitor pays for. */
    return '<div class="frame"><div class="vid">' +
      '<video controls playsinline preload="none" poster="' + esc(poster) + '"' +
      ' src="' + esc(v.src) + '" aria-label="' + esc(p.title) + " demo clip" + (real ? "" : " (not attached yet)") + '"></video>' +
      (real ? "" :
        '<div class="vid__note"><span class="mono">No clip attached yet</span>' +
        "<code>" + esc(v.src) + "</code>" +
        '<span class="mono" style="color:var(--muted-2);letter-spacing:.14em">Drop the mp4 at that path — the player is already wired</span>' +
        "</div>") +
      "</div>" +
      '<div class="frame__cap"><em>' + esc(real && v.cap ? v.cap : "Video slot · " + v.src) + "</em>" +
      "<span>" + esc(real && v.meta ? v.meta : "H.264 · 16:10 recommended") + "</span></div></div>";
  }

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

