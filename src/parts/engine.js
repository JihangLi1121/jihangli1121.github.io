  /* =====================================================================
     4 · CellUniverse engine — real solver output, ray-traced on the GPU
     ---------------------------------------------------------------------
     CU        decodes the packed lineage export (171 frames, 15,798
               cell-frames, 611 lineage nodes) and interpolates between
               frames so divisions read as events rather than pops.
     CUGL      renders each cell as a true ray-traced ellipsoid: the quad
               is only a bounding billboard, the surface is solved
               analytically per fragment, so there is no tessellation at
               any zoom. Rotation reproduces the solver's own convention,
               R = Rz·Ry·Rx (see Ellipsoid::generateInverseRotationMatrix).
     ===================================================================== */

  var CU = (function () {
    var D = window.CU_LINEAGE;
    if (!D) return null;

    /* ---- unpack base64 → typed view ---- */
    var bin = atob(D.blob), N = bin.length;
    var u8 = new Uint8Array(N);
    for (var i = 0; i < N; i++) u8[i] = bin.charCodeAt(i);
    var dv = new DataView(u8.buffer);
    var REC = 14;

    var F = D.frames, counts = D.counts;
    var start = new Int32Array(F + 1), acc = 0;
    for (var f = 0; f < F; f++) { start[f] = acc; acc += counts[f]; }
    start[F] = acc;

    /* ---- lineage tree ---- */
    var nCells = D.nCells;
    var parent = new Int16Array(nCells), founder = new Uint8Array(nCells), gen = new Uint8Array(nCells);
    for (var c = 0; c < nCells; c++) {
      parent[c] = D.cells[c][0]; founder[c] = D.cells[c][1]; gen[c] = D.cells[c][2];
    }
    var kids = [];
    for (c = 0; c < nCells; c++) kids.push([]);
    for (c = 0; c < nCells; c++) if (parent[c] >= 0) kids[parent[c]].push(c);

    /* index → record slot, per frame */
    var slot = [];
    for (f = 0; f < F; f++) {
      var m = new Map(), s = start[f];
      for (var k = 0; k < counts[f]; k++) m.set(dv.getUint16((s + k) * REC, true), s + k);
      slot.push(m);
    }

    var PQ = D.posQ, RQ = D.radQ, AQ = D.angQ;
    function rd(o) {
      var b = o * REC;
      return {
        i:  dv.getUint16(b, true),
        x:  dv.getInt16(b + 2, true) * PQ,
        y:  dv.getInt16(b + 4, true) * PQ,
        z:  dv.getInt16(b + 6, true) * PQ,
        a:  dv.getUint8(b + 8) * RQ,
        b:  dv.getUint8(b + 9) * RQ,
        c:  dv.getUint8(b + 10) * RQ,
        tx: dv.getInt8(b + 11) * AQ,
        ty: dv.getInt8(b + 12) * AQ,
        tz: dv.getInt8(b + 13) * AQ
      };
    }
    function alerp(a, b, u) {            /* shortest-arc angle blend */
      var d = b - a;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return a + d * u;
    }

    /* Sample the population at continuous time t (frame units).
       Cells present in both keyframes interpolate; a cell that only
       exists in the later frame is being born (scale + fade in), one
       that only exists in the earlier frame has just divided away. */
    function sample(t, out) {
      var A = Math.max(0, Math.min(F - 1, Math.floor(t)));
      var B = Math.min(F - 1, A + 1);
      var u = A === B ? 0 : Math.max(0, Math.min(1, t - A));
      var sa = slot[A], sb = slot[B];
      out.length = 0;

      sb.forEach(function (ob, id) {
        var rb = rd(ob), oa = sa.get(id);
        if (oa !== undefined) {
          var ra = rd(oa);
          out.push({
            id: id, born: 0,
            x: ra.x + (rb.x - ra.x) * u, y: ra.y + (rb.y - ra.y) * u, z: ra.z + (rb.z - ra.z) * u,
            a: ra.a + (rb.a - ra.a) * u, b: ra.b + (rb.b - ra.b) * u, c: ra.c + (rb.c - ra.c) * u,
            tx: alerp(ra.tx, rb.tx, u), ty: alerp(ra.ty, rb.ty, u), tz: alerp(ra.tz, rb.tz, u),
            k: 1, al: 1
          });
        } else {
          var e = u * u * (3 - 2 * u);
          out.push({
            id: id, born: 1,
            x: rb.x, y: rb.y, z: rb.z, a: rb.a, b: rb.b, c: rb.c,
            tx: rb.tx, ty: rb.ty, tz: rb.tz,
            k: 0.45 + 0.55 * e, al: e
          });
        }
      });
      sa.forEach(function (oa, id) {
        if (sb.has(id)) return;
        var ra = rd(oa);                       /* dividing away */
        out.push({
          id: id, born: -1,
          x: ra.x, y: ra.y, z: ra.z, a: ra.a, b: ra.b, c: ra.c,
          tx: ra.tx, ty: ra.ty, tz: ra.tz,
          k: 1 - 0.3 * u, al: 1 - u
        });
      });
      return out;
    }

    /* divisions between two consecutive frames */
    var divis = new Int16Array(F);
    for (f = 1; f < F; f++) {
      var n = 0;
      slot[f].forEach(function (o, id) { if (!slot[f - 1].has(id)) n++; });
      divis[f] = n;
    }

    /* ---- radial tree layout: one quadrant per founder, radius = generation ---- */
    var leaves = new Int32Array(nCells);
    (function countLeaves() {
      for (var c = nCells - 1; c >= 0; c--) {
        if (!kids[c].length) { leaves[c] = 1; continue; }
        var s = 0;
        for (var j = 0; j < kids[c].length; j++) s += leaves[kids[c][j]];
        leaves[c] = s;
      }
    })();
    var ang = new Float32Array(nCells), a0 = new Float32Array(nCells), a1 = new Float32Array(nCells);
    var maxGen = 0;
    for (c = 0; c < nCells; c++) maxGen = Math.max(maxGen, gen[c]);
    (function layout() {
      var roots = [];
      for (var c2 = 0; c2 < nCells; c2++) if (parent[c2] < 0) roots.push(c2);
      var GAP = 0.055;                                   /* wedge separation */
      var span = (Math.PI * 2) / roots.length;
      roots.forEach(function (r, i) {
        assign(r, i * span + GAP / 2, (i + 1) * span - GAP / 2);
      });
      function assign(c3, lo, hi) {
        a0[c3] = lo; a1[c3] = hi; ang[c3] = (lo + hi) / 2;
        var ch = kids[c3];
        if (!ch.length) return;
        var tot = 0, j;
        for (j = 0; j < ch.length; j++) tot += leaves[ch[j]];
        var at = lo;
        for (j = 0; j < ch.length; j++) {
          var w = (hi - lo) * leaves[ch[j]] / tot;
          assign(ch[j], at, at + w);
          at += w;
        }
      }
    })();

    return {
      frames: F, nCells: nCells, maxGen: maxGen, extent: D.extent,
      counts: counts, divisions: divis,
      parent: parent, founder: founder, gen: gen, kids: kids, names: D.names,
      ang: ang, a0: a0, a1: a1, leaves: leaves,
      alive: function (f) { return slot[f]; },
      sample: sample
    };
  })();

  /* ---- founder palettes: F1 tracks the live channel so 488/561 still reads ---- */
  var FOUNDER = {
    a: [[0.36, 1.00, 0.72], [0.30, 0.78, 1.00], [1.00, 0.76, 0.32], [0.78, 0.55, 1.00]],
    b: [[1.00, 0.42, 0.80], [0.40, 0.80, 1.00], [1.00, 0.80, 0.38], [0.62, 1.00, 0.70]]
  };
  function founderRGB(f) {
    var pal = FOUNDER[root.getAttribute("data-channel") === "b" ? "b" : "a"];
    return pal[(f - 1) % 4];
  }

  /* =====================================================================
     4b · CUGL — analytic ray-traced ellipsoids (WebGL2)
     ===================================================================== */
  var VS = [
    "#version 300 es",
    "precision highp float;",
    "layout(location=0) in vec2 aQuad;",
    "layout(location=1) in vec3 aCenter;",
    "layout(location=2) in vec3 aRadii;",
    "layout(location=3) in vec3 aEuler;",
    "layout(location=4) in vec3 aColor;",
    "layout(location=5) in float aAlpha;",
    "uniform mat4 uView, uProj;",
    "uniform float uPad;",
    "out vec3 vViewPos; out vec3 vCenterV; out vec3 vRadii; out mat3 vRot;",
    "out vec3 vColor; out float vAlpha; out vec2 vQuad;",
    /* solver convention: R = Rz * Ry * Rx */
    "mat3 rot(vec3 t){",
    "  float cx=cos(t.x), sx=sin(t.x), cy=cos(t.y), sy=sin(t.y), cz=cos(t.z), sz=sin(t.z);",
    "  return mat3(vec3(cz*cy, sz*cy, -sy),",
    "              vec3(cz*sy*sx - sz*cx, sz*sy*sx + cz*cx, cy*sx),",
    "              vec3(cz*sy*cx + sz*sx, sz*sy*cx - cz*sx, cy*cx));",
    "}",
    "void main(){",
    "  vRot = mat3(uView) * rot(aEuler);",
    "  vCenterV = (uView * vec4(aCenter,1.0)).xyz;",
    "  vRadii = aRadii; vColor = aColor; vAlpha = aAlpha; vQuad = aQuad;",
    "  float r = max(aRadii.x, max(aRadii.y, aRadii.z)) * uPad;",
    "  vec3 pv = vCenterV + vec3(aQuad * r, 0.0);",
    "  vViewPos = pv;",
    "  gl_Position = uProj * vec4(pv, 1.0);",
    "}"
  ].join("\n");

  var FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vViewPos; in vec3 vCenterV; in vec3 vRadii; in mat3 vRot;",
    "in vec3 vColor; in float vAlpha; in vec2 vQuad;",
    "uniform mat4 uProj;",
    "uniform float uRim, uFogA, uFogB, uAmb, uGain, uEmis;",
    "out vec4 frag;",
    "void main(){",
    "  vec3 D = normalize(vViewPos);",
    "  mat3 Rt = transpose(vRot);",
    "  vec3 o = (Rt * -vCenterV) / vRadii;",
    "  vec3 d = (Rt * D) / vRadii;",
    "  float A = dot(d,d), B = 2.0*dot(o,d), C = dot(o,o) - 1.0;",
    "  float disc = B*B - 4.0*A*C;",
    "  if (disc < 0.0) discard;",
    "  float sq = sqrt(disc);",
    "  float t1 = (-B - sq) / (2.0*A);",
    "  float t2 = (-B + sq) / (2.0*A);",
    "  if (t2 <= 0.0) discard;",
    "  float t = max(t1, 0.0);",                          /* clamp when the eye is inside */
    /* how far the ray travels through the cell — fluorescence scales with path length */
    "  float maxR = max(vRadii.x, max(vRadii.y, vRadii.z));",
    "  float th = clamp((t2 - t) / (2.0 * maxR), 0.0, 1.0);",
    "  vec3 q = o + t*d;",
    "  vec3 N = normalize(vRot * (q / vRadii));",
    "  vec3 P = t * D;",
    "  vec4 cp = uProj * vec4(P, 1.0);",
    "  gl_FragDepth = 0.5 * (cp.z / cp.w) + 0.5;",
    "  vec3 V = -D;",
    "  float ndv = clamp(dot(N,V), 0.0, 1.0);",
    /* key light rides with the camera, like an epifluorescence objective */
    "  vec3 L = normalize(vec3(0.32, 0.55, 0.78));",
    "  float dif = clamp(dot(N,L), 0.0, 1.0);",
    "  float fres = pow(1.0 - ndv, 2.2);",
    /* emission from the interior + a bright membrane at the silhouette */
    "  vec3 col = vColor * (uAmb + 0.40*dif + uEmis*pow(th, 0.75));",
    "  col += vColor * fres * uRim;",
    "  float spec = pow(clamp(dot(reflect(-L,N),V),0.0,1.0), 60.0);",
    "  col += vec3(spec) * 0.12;",
    /* depth cue: far cells sink into the ground, like a z-stack */
    "  float fog = clamp((-P.z - uFogA) / max(0.001, uFogB - uFogA), 0.0, 1.0);",
    "  col *= mix(1.0, 0.18, fog);",
    /* thin edges stay translucent, so cells read as glowing gel not plastic */
    "  float a = vAlpha * clamp(0.26 + 0.90*th, 0.0, 1.0);",
    "  frag = vec4(col * uGain * a, a);",
    "}"
  ].join("\n");

  var HVS = [
    "#version 300 es",
    "precision highp float;",
    "layout(location=0) in vec2 aQuad;",
    "layout(location=1) in vec3 aCenter;",
    "layout(location=2) in vec3 aRadii;",
    "layout(location=4) in vec3 aColor;",
    "layout(location=5) in float aAlpha;",
    "uniform mat4 uView, uProj; uniform float uSize;",
    "out vec2 vQ; out vec3 vC; out float vA;",
    "void main(){",
    "  vec3 cv = (uView * vec4(aCenter,1.0)).xyz;",
    "  float r = max(aRadii.x, max(aRadii.y, aRadii.z)) * uSize;",
    "  vQ = aQuad; vC = aColor; vA = aAlpha;",
    "  gl_Position = uProj * vec4(cv + vec3(aQuad * r, 0.0), 1.0);",
    "}"
  ].join("\n");

  var HFS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vQ; in vec3 vC; in float vA;",
    "uniform float uInt;",
    "out vec4 frag;",
    "void main(){",
    "  float r = length(vQ);",
    "  if (r > 1.0) discard;",
    "  float g = exp(-r*r*3.2) * (1.0 - r);",
    /* pure light: adds glow without adding opacity, so the page shows through */
    "  frag = vec4(vC * g * uInt * vA, 0.0);",
    "}"
  ].join("\n");

  /* ---- post chain: bright-pass → separable blur → additive composite ---- */
  var QVS = [
    "#version 300 es", "precision highp float;",
    "layout(location=0) in vec2 aQuad;", "out vec2 vUV;",
    "void main(){ vUV = aQuad*0.5+0.5; gl_Position = vec4(aQuad,0.0,1.0); }"
  ].join("\n");

  var BRIGHT_FS = [
    "#version 300 es", "precision highp float;",
    "in vec2 vUV; uniform sampler2D uTex; uniform float uThresh;",
    "out vec4 frag;",
    "void main(){",
    "  vec3 c = texture(uTex, vUV).rgb;",
    "  float l = max(c.r, max(c.g, c.b));",
    "  float k = max(0.0, l - uThresh) / max(0.0001, l);",
    "  frag = vec4(c * k, 1.0);",
    "}"
  ].join("\n");

  var BLUR_FS = [
    "#version 300 es", "precision highp float;",
    "in vec2 vUV; uniform sampler2D uTex; uniform vec2 uDir;",
    "out vec4 frag;",
    "void main(){",
    "  vec3 s = texture(uTex, vUV).rgb * 0.227027;",
    "  s += (texture(uTex, vUV + uDir*1.3846).rgb + texture(uTex, vUV - uDir*1.3846).rgb) * 0.3162162;",
    "  s += (texture(uTex, vUV + uDir*3.2307).rgb + texture(uTex, vUV - uDir*3.2307).rgb) * 0.0702702;",
    "  frag = vec4(s, 1.0);",
    "}"
  ].join("\n");

  var COMP_FS = [
    "#version 300 es", "precision highp float;",
    "in vec2 vUV; uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uInt;",
    "out vec4 frag;",
    "void main(){",
    "  vec4 s = texture(uScene, vUV);",
    "  vec3 b = texture(uBloom, vUV).rgb;",
    /* bloom is pure light: it brightens without claiming coverage */
    "  frag = vec4(s.rgb + b * uInt, s.a);",
    "}"
  ].join("\n");

  function mat4Perspective(fovy, asp, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function mat4LookAt(eye, ctr, up) {
    var z0 = eye[0] - ctr[0], z1 = eye[1] - ctr[1], z2 = eye[2] - ctr[2];
    var l = Math.hypot(z0, z1, z2) || 1; z0 /= l; z1 /= l; z2 /= l;
    var x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    l = Math.hypot(x0, x1, x2) || 1; x0 /= l; x1 /= l; x2 /= l;
    var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    return new Float32Array([
      x0, y0, z0, 0, x1, y1, z1, 0, x2, y2, z2, 0,
      -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
      -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
      -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]), 1
    ]);
  }

  function CUGL(canvas) {
    var gl = null;
    try {
      gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true, depth: true });
    } catch (e) { gl = null; }
    if (!gl) return null;

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) console.warn("shader", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    function prog(vs, fs) {
      var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
      if (!a || !b) return null;
      var p = gl.createProgram();
      gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        if (window.console) console.warn("link", gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    }
    var pSolid = prog(VS, FS), pHalo = prog(HVS, HFS);
    if (!pSolid || !pHalo) return null;
    var pBright = prog(QVS, BRIGHT_FS), pBlur = prog(QVS, BLUR_FS), pComp = prog(QVS, COMP_FS);

    /* HDR headroom makes the bright-pass meaningful; RGBA8 still works without it */
    var hdr = !!gl.getExtension("EXT_color_buffer_float");
    var CFMT = hdr ? gl.RGBA16F : gl.RGBA8;
    var CTYPE = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    var samples = 0;
    try { samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0); } catch (e) { samples = 0; }

    var post = !!(pBright && pBlur && pComp);
    var T = { w: 0, h: 0, ms: null, msC: null, msD: null, sc: null, scT: null, a: null, aT: null, b: null, bT: null };

    function tex(w, h) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, CFMT, w, h, 0, gl.RGBA, CTYPE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    function fboWith(t) {
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return f;
    }
    function freeTargets() {
      ["ms", "sc", "a", "b"].forEach(function (k) { if (T[k]) gl.deleteFramebuffer(T[k]); T[k] = null; });
      ["msC", "msD"].forEach(function (k) { if (T[k]) gl.deleteRenderbuffer(T[k]); T[k] = null; });
      ["scT", "aT", "bT"].forEach(function (k) { if (T[k]) gl.deleteTexture(T[k]); T[k] = null; });
    }
    function allocTargets(w, h) {
      freeTargets();
      T.w = w; T.h = h;
      var hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);

      T.ms = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.ms);
      T.msC = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, T.msC);
      if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, CFMT, w, h);
      else gl.renderbufferStorage(gl.RENDERBUFFER, CFMT, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.msC);
      T.msD = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, T.msD);
      if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.msD);
      var okMS = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      T.scT = tex(w, h); T.sc = fboWith(T.scT);
      var okSC = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      T.aT = tex(hw, hh); T.a = fboWith(T.aT);
      T.bT = tex(hw, hh); T.b = fboWith(T.bT);
      var okBL = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!(okMS && okSC && okBL)) { post = false; freeTargets(); }
    }

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var inst = gl.createBuffer();
    var STRIDE = 13 * 4;
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    [[1, 3, 0], [2, 3, 12], [3, 3, 24], [4, 3, 36], [5, 1, 48]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]);
      gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, STRIDE, a[2]);
      gl.vertexAttribDivisor(a[0], 1);
    });
    gl.bindVertexArray(null);

    var U = {};
    ["uView", "uProj", "uPad", "uRim", "uFogA", "uFogB", "uAmb", "uGain", "uEmis"].forEach(function (n) {
      U[n] = gl.getUniformLocation(pSolid, n);
    });
    var UH = {};
    ["uView", "uProj", "uSize", "uInt"].forEach(function (n) { UH[n] = gl.getUniformLocation(pHalo, n); });
    var UB = post ? { t: gl.getUniformLocation(pBright, "uTex"), th: gl.getUniformLocation(pBright, "uThresh") } : null;
    var UL = post ? { t: gl.getUniformLocation(pBlur, "uTex"), d: gl.getUniformLocation(pBlur, "uDir") } : null;
    var UC = post ? {
      s: gl.getUniformLocation(pComp, "uScene"),
      b: gl.getUniformLocation(pComp, "uBloom"),
      i: gl.getUniformLocation(pComp, "uInt")
    } : null;

    /* fullscreen quad shares the same vertex buffer, without the instance divisors */
    var qvao = gl.createVertexArray();
    gl.bindVertexArray(qvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    function blit(p, w, h, fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.useProgram(p);
      gl.bindVertexArray(qvao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    }

    var buf = new Float32Array(0), count = 0;

    return {
      gl: gl,
      /* cells: sampled population; colOf(cell)->[r,g,b]; view: camera state */
      upload: function (cells, colOf, view) {
        var n = cells.length;
        if (buf.length < n * 13) buf = new Float32Array(Math.max(n * 13, 512 * 13));
        /* back-to-front so alpha fades composite correctly */
        var V = view.mat;
        cells.forEach(function (c) {
          c._d = V[2] * c.x + V[6] * c.y + V[10] * c.z + V[14];
        });
        cells.sort(function (p, q) { return p._d - q._d; });
        for (var i = 0; i < n; i++) {
          var c = cells[i], o = i * 13, col = colOf(c), k = c.k;
          buf[o] = c.x; buf[o + 1] = c.y; buf[o + 2] = c.z;
          buf[o + 3] = c.a * k; buf[o + 4] = c.b * k; buf[o + 5] = c.c * k;
          buf[o + 6] = c.tx; buf[o + 7] = c.ty; buf[o + 8] = c.tz;
          buf[o + 9] = col[0]; buf[o + 10] = col[1]; buf[o + 11] = col[2];
          buf[o + 12] = c.al * (col[3] === undefined ? 1 : col[3]);
        }
        count = n;
        gl.bindBuffer(gl.ARRAY_BUFFER, inst);
        gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, n * 13), gl.DYNAMIC_DRAW);
      },
      resize: function (w, h, dpr) {
        var W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== W) canvas.width = W;
        if (canvas.height !== H) canvas.height = H;
        if (post && (T.w !== W || T.h !== H)) allocTargets(W, H);
        return W / H;
      },
      draw: function (view, look) {
        var W = canvas.width, H = canvas.height;
        var usePost = post && look.bloom > 0 && T.ms;

        /* ---- scene ---- */
        gl.bindFramebuffer(gl.FRAMEBUFFER, usePost ? T.ms : null);
        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (count) {
          gl.bindVertexArray(vao);
          gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   /* premultiplied over */
          gl.useProgram(pSolid);
          gl.uniformMatrix4fv(U.uView, false, view.mat);
          gl.uniformMatrix4fv(U.uProj, false, view.proj);
          gl.uniform1f(U.uPad, 1.34);
          gl.uniform1f(U.uRim, look.rim);
          gl.uniform1f(U.uAmb, look.amb);
          gl.uniform1f(U.uGain, look.gain);
          gl.uniform1f(U.uEmis, look.emis === undefined ? 0.7 : look.emis);
          gl.uniform1f(U.uFogA, look.fogA);
          gl.uniform1f(U.uFogB, look.fogB);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

          if (look.halo > 0) {
            gl.depthMask(false);
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.useProgram(pHalo);
            gl.uniformMatrix4fv(UH.uView, false, view.mat);
            gl.uniformMatrix4fv(UH.uProj, false, view.proj);
            gl.uniform1f(UH.uSize, look.haloSize);
            gl.uniform1f(UH.uInt, look.halo);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
            gl.depthMask(true);
          }
          gl.bindVertexArray(null);
        }
        if (!usePost) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }

        /* ---- resolve MSAA into a sampleable texture ---- */
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.ms);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.sc);
        gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
        var hw = Math.max(1, W >> 1), hh = Math.max(1, H >> 1);

        /* bright pass → half res */
        gl.useProgram(pBright);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scT);
        gl.uniform1i(UB.t, 0); gl.uniform1f(UB.th, look.bloomThresh || 0.55);
        blit(pBright, hw, hh, T.a);

        /* separable blur, two iterations for a softer falloff */
        for (var i = 0; i < 2; i++) {
          gl.useProgram(pBlur);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.aT);
          gl.uniform1i(UL.t, 0); gl.uniform2f(UL.d, 1 / hw, 0);
          blit(pBlur, hw, hh, T.b);

          gl.useProgram(pBlur);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.bT);
          gl.uniform1i(UL.t, 0); gl.uniform2f(UL.d, 0, 1 / hh);
          blit(pBlur, hw, hh, T.a);
        }

        /* composite to the canvas */
        gl.useProgram(pComp);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scT);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.aT);
        gl.uniform1i(UC.s, 0); gl.uniform1i(UC.b, 1); gl.uniform1f(UC.i, look.bloom);
        blit(pComp, W, H, null);
        gl.activeTexture(gl.TEXTURE0);
      },
      destroy: function () {
        try {
          freeTargets();
          gl.deleteBuffer(quad); gl.deleteBuffer(inst);
          gl.deleteVertexArray(vao); gl.deleteVertexArray(qvao);
          [pSolid, pHalo, pBright, pBlur, pComp].forEach(function (p) { if (p) gl.deleteProgram(p); });
          var ext = gl.getExtension("WEBGL_lose_context");
          if (ext) ext.loseContext();
        } catch (e) {}
      }
    };
  }

  /* orbit camera → view/proj for a given aspect */
  function orbit(yaw, pitch, dist, asp, target) {
    var cp = Math.cos(pitch), t = target || [0, 0, 0];
    var eye = [t[0] + dist * cp * Math.sin(yaw), t[1] + dist * Math.sin(pitch), t[2] + dist * cp * Math.cos(yaw)];
    return {
      mat: mat4LookAt(eye, t, [0, 1, 0]),
      proj: mat4Perspective(0.66, asp, Math.max(1, dist * 0.05), dist * 4),
      eye: eye, dist: dist
    };
  }
