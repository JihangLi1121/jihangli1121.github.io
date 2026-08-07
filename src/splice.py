#!/usr/bin/env python3
"""Splice the real-data CellUniverse engine into design-a-confocal.html."""
import io, sys, os

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)
# always splice from the pristine artifact export: splicing in place is not
# idempotent (viewer.css would be appended again on every run)
SRC = os.path.join(BASE, "design-a-confocal.bak.html")
DST = os.path.join(BASE, "design-a-confocal.html")

html = io.open(SRC, encoding="utf-8").read()
part = lambda n: io.open(os.path.join(BASE, "parts", n), encoding="utf-8").read()
data = io.open(os.path.join(BASE, "lineage_data.js"), encoding="utf-8").read()

def cut(text, a, b, repl, label):
    """Replace text[a_start : b_start] with repl."""
    i = text.find(a)
    if i < 0: sys.exit("MISSING START: " + label)
    j = text.find(b, i + len(a))
    if j < 0: sys.exit("MISSING END: " + label)
    if text.count(a) != 1: sys.exit("AMBIGUOUS START: " + label)
    return text[:i] + repl + text[j:]

# 1 — CSS -------------------------------------------------------------------
assert html.count("</style>") == 1
html = html.replace("</style>", part("viewer.css") + "</style>")

# 2 — data payload + inlined stills, before the main script ------------------
inline = io.open(os.path.join(BASE, "inline", "assets-inline.js"), encoding="utf-8").read()
MAIN = "<script>"
i = html.find(MAIN)
assert i > 0
html = html[:i] + "<script>" + data + "</script>\n<script>" + inline + "</script>\n" + html[i:]

# 3 — hero field -> engine + new hero ---------------------------------------
html = cut(html,
           "  (function heroField() {",
           "  /* =====================================================================\n     5 · Specimen data",
           part("engine.js") + "\n" + part("hero.js") + "\n",
           "heroField")

# 3b — media: prefer real assets when a manifest is present -------------------
html = cut(html,
           "  function carouselHTML(p) {",
           "  function viewerHTML() {",
           part("media.js"),
           "media")

# 3c — Doom chart: real evaluation figures replace the generated curve --------
html = cut(html, "  function plotHTML() {", "  function caseHTML(p) {", part("plot_html.js"), "plotHTML")
html = cut(html, "  function initPlot() {",
           "  /* =====================================================================\n     11 · Smooth in-page navigation",
           part("plot_init.js"), "initPlot")

# 4 — viewer markup ----------------------------------------------------------
html = cut(html,
           "  function viewerHTML() {",
           "  function plotHTML() {",
           part("markup.js") + "\n",
           "viewerHTML")

# 5 — buildLineage + initViewer -> real-data viewer ---------------------------
html = cut(html,
           "  /* MODEL SOURCE ---",
           "  /* =====================================================================\n     10 · Doom RL",
           part("viewer.js") + "\n",
           "initViewer")

# 6 — deep links, palette, reading position (same IIFE scope) ---------------
MARK = "  $$('a[href^=\"#\"]').forEach(function (a) {"
i = html.find(MARK)
if i < 0: sys.exit("MISSING: nav handler anchor")
html = html[:i] + part("extras.js") + "\n" + html[i:]

io.open(DST, "w", encoding="utf-8").write(html)
print("wrote %s  (%.0f KB, %d lines)" % (DST, len(html) / 1024, html.count("\n") + 1))
for probe in ["window.CU_LINEAGE", "function CUGL", "CU.sample", "drawTree", "vscrub", "gl_FragDepth"]:
    print("  %-22s %d" % (probe, html.count(probe)))
