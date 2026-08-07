  function viewerHTML() {
    return '<div class="frame"><div class="viewer">' +
      '<div class="viewer__canvas-wrap"><canvas id="vcanvas" tabindex="0" aria-label="Interactive 3D reconstruction of the tracked embryo. Drag to orbit, scroll to zoom, arrow keys to rotate."></canvas>' +
        '<span class="viewer__hint">Drag to orbit · scroll to zoom</span>' +
        '<span class="vstamp mono" id="v-stamp">t001 / 171</span>' +
      "</div>" +
      '<div class="viewer__side">' +
        '<div class="tree-wrap"><canvas id="treecanvas" aria-label="Radial lineage tree. Four founder families radiate outward, one ring per generation; branches appear as cells divide."></canvas>' +
          '<span class="tree-cap mono">Lineage · gen 0–9</span></div>' +
        '<div class="vlegend" id="v-legend" role="group" aria-label="Isolate a founder family"></div>' +
        '<div class="readout">' +
          "<div>Live cells<b id=\"r-cells\">0</b></div>" +
          "<div>Divisions this frame<b id=\"r-div\">0</b></div>" +
          "<div>Deepest generation<b id=\"r-gen\">0</b></div>" +
          "<div>Mean oblateness<b id=\"r-obl\">0.00</b></div>" +
          "<div>Azimuth<b id=\"r-yaw\">0.0°</b></div>" +
          "<div>Zoom<b id=\"r-zoom\">1.00×</b></div>" +
        "</div>" +
      "</div></div>" +

      '<div class="vtime">' +
        '<button type="button" class="vplay" id="v-play" aria-label="Play or pause the time series"><span id="v-playi">❙❙</span></button>' +
        '<input type="range" id="v-scrub" class="vscrub" min="0" max="170" step="0.01" value="0" aria-label="Frame">' +
        '<span class="mono vspeed" id="v-rate">1×</span>' +
      "</div>" +

      '<div class="vctl">' +
        '<button type="button" data-v="mode"><i class="ctl__dot"></i><span id="v-modename">Colour: lineage</span></button>' +
        '<button type="button" data-v="links" aria-pressed="true"><i class="ctl__dot"></i>Lineage links</button>' +
        '<button type="button" data-v="spin" aria-pressed="true"><i class="ctl__dot"></i>Auto-rotate</button>' +
        '<button type="button" data-v="reset"><i class="ctl__dot" style="background:transparent"></i>Reset view</button>' +
      "</div>" +

      '<div class="frame__cap"><em>Real solver output — 171 frames, 15,798 fitted cells, 611 lineage nodes</em>' +
      "<span>Ray-traced on the GPU · no libraries</span></div></div>";
  }
