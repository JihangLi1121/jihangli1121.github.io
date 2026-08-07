#!/usr/bin/env python3
"""Maximum-intensity projections of the raw confocal stacks — the solver's input."""
from PIL import Image
import numpy as np, glob, os
_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)

SRC = "/Users/jihangli/MCS/3D_Cell_Tracking/data/PKS_JIM113_121522_s1-from-Pavak@UCLA"
OUT = os.path.join(_HERE, "media")
FR = os.path.join(OUT, "mipframes")
os.makedirs(FR, exist_ok=True)

files = sorted(glob.glob(os.path.join(SRC, "frame*.tif")))

def mip(path):
    im = Image.open(path)
    n = getattr(im, "n_frames", 1)
    acc = None
    for z in range(n):
        im.seek(z)
        a = np.array(im).astype(np.float32)
        acc = a if acc is None else np.maximum(acc, a)
    return acc

# one global stretch so brightness doesn't flicker across the series
# The stacks are low-contrast: background sits around p50 and the cells are a
# narrow bright tail, so the black point has to come from the upper percentiles
# or the projection washes out to flat grey.
lo_s, hi_s = [], []
for f in files[::10]:
    m = mip(f)
    lo_s.append(np.percentile(m, 88)); hi_s.append(np.percentile(m, 99.95))
lo, hi = float(np.mean(lo_s)), float(np.mean(hi_s))
print("stretch %.1f .. %.1f" % (lo, hi))

SCALE = 2
for i, f in enumerate(files):
    m = mip(f)
    v = np.clip((m - lo) / max(1e-6, hi - lo), 0, 1)
    v = v ** 0.80                                   # gentle lift on the dim interior
    g = (v * 255).astype(np.uint8)
    # tint toward the 488 channel so it sits in the page's palette
    rgb = np.stack([(g * 0.62).astype(np.uint8), g, (g * 0.82).astype(np.uint8)], -1)
    im = Image.fromarray(rgb, "RGB")
    im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
    im.save(os.path.join(FR, "mip_%03d.png" % i))
print("wrote %d MIP frames at %dx%d" % (len(files), im.width, im.height))

for keep, name in [(0, "confocal_mip_t01"), (25, "confocal_mip_t26"), (50, "confocal_mip_t51")]:
    Image.open(os.path.join(FR, "mip_%03d.png" % keep)).convert("RGB").save(
        os.path.join(OUT, name + ".jpg"), quality=88, optimize=True)
print("wrote stills")
