#!/usr/bin/env python3
"""Build the 1200x630 social share card.

Composites a real frame of the CellUniverse render behind the title block, so
the card shows the actual work rather than a flat colour field.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1200, 630
GROUND = (7, 11, 13)
ACCENT = (79, 240, 193)
TEXT = (220, 232, 229)
MUTED = (147, 165, 163)

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)
SITE = os.path.join(os.path.dirname(_HERE), "assets", "media")

def font(path, size, idx=0):
    try:
        return ImageFont.truetype(path, size, index=idx)
    except Exception:
        return ImageFont.load_default()

DISPLAY = "/System/Library/Fonts/Supplemental/Futura.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"

f_name = font(DISPLAY, 96, 0)     # Futura Medium (upright)
f_tag  = font(DISPLAY, 33, 0)
f_mono = font(MONO, 21)
f_small = font(MONO, 18)

card = Image.new("RGB", (W, H), GROUND)

# --- the specimen, bled off the right edge, dimmed so type stays dominant ---
try:
    cells = Image.open(os.path.join(SITE, "celluniverse-input-t26.jpg")).convert("RGB")
    ch = int(H * 1.25)
    cells = cells.resize((int(cells.width * ch / cells.height), ch), Image.LANCZOS)
    cells = cells.crop((0, 0, min(cells.width, 700), H))
    cells = cells.filter(ImageFilter.GaussianBlur(0.6))
    cells = Image.blend(Image.new("RGB", cells.size, GROUND), cells, 0.85)
    card.paste(cells, (W - cells.width, 0))
    # fade it into the ground from the left
    grad = Image.new("L", (cells.width, H), 0)
    gd = ImageDraw.Draw(grad)
    for x in range(cells.width):
        gd.line([(x, 0), (x, H)], fill=int(255 * min(1.0, (x / (cells.width * 0.62)))))
    base = card.crop((W - cells.width, 0, W, H))
    flat = Image.new("RGB", base.size, GROUND)
    card.paste(Image.composite(base, flat, grad), (W - cells.width, 0))
except Exception as e:
    print("specimen skipped:", e)

d = ImageDraw.Draw(card)

# --- hairline frame, echoing the page's reticle ---
d.rectangle([40, 40, W - 41, H - 41], outline=(28, 42, 46), width=1)

x = 84
d.text((x, 104), "SPECIMEN JL·2026", font=f_small, fill=(108, 126, 124))
d.text((x, 150), "JIHANG", font=f_name, fill=TEXT)
d.text((x, 250), "LI", font=f_name, fill=ACCENT)

d.text((x, 388), "3D cell-lineage reconstruction in C++,", font=f_tag, fill=MUTED)
d.text((x, 430), "and production AI systems full-stack.", font=f_tag, fill=MUTED)

d.line([(x, 500), (x + 96, 500)], fill=ACCENT, width=2)
d.text((x, 524), "MCS · UC IRVINE", font=f_mono, fill=(147, 165, 163))
d.text((x, 552), "jihangli1121.github.io/My-website", font=f_mono, fill=(108, 126, 124))

out = os.path.join(SITE, "og-card.jpg")
card.save(out, "JPEG", quality=90, optimize=True, progressive=True)
print("wrote %s  %dx%d  %.0f KB" % (out, W, H, os.path.getsize(out) / 1024))
