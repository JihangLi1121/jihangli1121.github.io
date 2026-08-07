#!/usr/bin/env python3
"""Pack CellUniverse FinalLineageTree.csv into a compact base64 payload for the web viewer.

Layout per cell-frame record (14 bytes):
  uint16 cellIdx | int16 x,y,z (0.25 units) | uint8 a,b,c (0.25 units) | int8 tx,ty,tz (2pi/256)
Frames are delimited by a uint16 count array.
"""
import csv, json, math, base64, struct, collections, sys
_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)

SRC = "/Users/jihangli/MCS/3D_Cell_Tracking/CellUniverse/C++/outputs/20260604_023936_Yiding_1~171_VISUAL_TIF/Yiding_Embryo_1~171_FinalLineageTree.csv"
OUT = os.path.join(_HERE, "lineage_data.js")

rows = list(csv.DictReader(open(SRC)))
suffix = lambda n: n.split("_")[-1]

byframe = collections.defaultdict(list)
for r in rows:
    byframe[r["file"]].append(r)
frames = sorted(byframe)

# ---- cell table: stable index, parent link, founder, generation ----
order = []           # suffix in first-appearance order
seen = set()
for f in frames:
    for r in byframe[f]:
        s = suffix(r["name"])
        if s not in seen:
            seen.add(s); order.append(s)
idx = {s: i for i, s in enumerate(order)}
cells = []
for s in order:
    parent = idx[s[:-1]] if len(s) > 1 else -1
    cells.append({"s": s, "p": parent, "f": int(s[0]), "g": len(s) - 1})

# ---- normalise: centre on global bbox centre, keep world units ----
xs = [float(r["x"]) for r in rows]; ys = [float(r["y"]) for r in rows]; zs = [float(r["z"]) for r in rows]
cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2; cz = (min(zs) + max(zs)) / 2
# radius that encloses everything, for camera framing
extent = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)) / 2

POS_Q, RAD_Q = 0.25, 0.25
ANG_Q = (2 * math.pi) / 256.0

def wrap(a):
    a = math.fmod(a + math.pi, 2 * math.pi)
    if a < 0: a += 2 * math.pi
    return a - math.pi

counts, blob = [], bytearray()
maxpos = 0
for f in frames:
    recs = byframe[f]
    counts.append(len(recs))
    for r in recs:
        i = idx[suffix(r["name"])]
        x = (float(r["x"]) - cx) / POS_Q; y = (float(r["y"]) - cy) / POS_Q; z = (float(r["z"]) - cz) / POS_Q
        maxpos = max(maxpos, abs(x), abs(y), abs(z))
        a = float(r["majorRadius"]) / RAD_Q; b = float(r["bRadius"]) / RAD_Q; c = float(r["minorRadius"]) / RAD_Q
        tx = wrap(float(r["theta_x"])) / ANG_Q; ty = wrap(float(r["theta_y"])) / ANG_Q; tz = wrap(float(r["theta_z"])) / ANG_Q
        clamp8  = lambda v: max(0, min(255, int(round(v))))
        clampi8 = lambda v: max(-128, min(127, int(round(v))))
        blob += struct.pack("<Hhhh BBB bbb", i,
                            int(round(x)), int(round(y)), int(round(z)),
                            clamp8(a), clamp8(b), clamp8(c),
                            clampi8(tx), clampi8(ty), clampi8(tz))

assert maxpos < 32767, f"position overflow {maxpos}"
assert len(blob) == len(rows) * 14, (len(blob), len(rows) * 14)

payload = {
    "frames": len(frames),
    "nCells": len(cells),
    "posQ": POS_Q, "radQ": RAD_Q, "angQ": ANG_Q,
    "extent": round(extent, 2),
    "counts": counts,
    "cells": [[c["p"], c["f"], c["g"]] for c in cells],
    "names": [c["s"] for c in cells],
    "blob": base64.b64encode(bytes(blob)).decode("ascii"),
}

js = "window.CU_LINEAGE=" + json.dumps(payload, separators=(",", ":")) + ";\n"
open(OUT, "w").write(js)

print(f"frames        {len(frames)}")
print(f"cells (nodes) {len(cells)}  gens 0..{max(c['g'] for c in cells)}")
print(f"cell-frames   {len(rows)}   min/frame {min(counts)}  max/frame {max(counts)}")
print(f"centre        ({cx:.1f}, {cy:.1f}, {cz:.1f})  extent {extent:.1f}")
print(f"binary        {len(blob)/1024:.0f} KB -> base64 {len(payload['blob'])/1024:.0f} KB")
print(f"total js      {len(js)/1024:.0f} KB  -> {OUT}")
