#!/usr/bin/env python3
"""Convert resume.pdf into one vector SVG that resume.html shows as an <img>.

Why vector rather than a raster page image: the PDF is pure outlines — 4,500
glyph paths, zero embedded bitmaps — so any rasterisation throws away detail
that the source actually has. At 300 dpi with a 16-colour palette the serifs
turned grey and mushy and the link blue quantised away entirely. An SVG is
sharp at every zoom, keeps the colours, and gzips to ~110 KB against the
579 KB PNG it replaces.

pdftocairo writes one SVG per page and names its glyph and clip ids from
zero in each file, so the pages cannot simply be concatenated — page 2's
`glyph0-1` would shadow page 1's. Every id gets a per-page prefix, then each
page goes in as a nested <svg> so its coordinates stay local.

Usage: make_resume_svg.py <in.pdf> <out.svg>
"""
import io
import os
import re
import subprocess
import sys
import tempfile

GAP = 16  # points of dark space between stacked pages


def page_count(pdf):
    out = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
    m = re.search(r"^Pages:\s+(\d+)", out, re.M)
    return int(m.group(1)) if m else 1


def render_page(pdf, n, tmp):
    dst = os.path.join(tmp, "p%d.svg" % n)
    subprocess.run(["pdftocairo", "-svg", "-f", str(n), "-l", str(n), pdf, dst],
                   check=True)
    return io.open(dst, encoding="utf-8").read()


def namespace_ids(svg, prefix):
    """Rewrite every id so pages can share one document."""
    for old in sorted(set(re.findall(r'id="([^"]+)"', svg)), key=len, reverse=True):
        new = prefix + old
        svg = svg.replace('id="%s"' % old, 'id="%s"' % new)
        svg = svg.replace('"#%s"' % old, '"#%s"' % new)   # xlink:href="#glyph0-1"
        svg = svg.replace('(#%s)' % old, '(#%s)' % new)   # clip-path="url(#clip1)"
    return svg


def dimensions(svg):
    vb = re.search(r'viewBox="([\d.\-\s]+)"', svg).group(1).split()
    return float(vb[2]), float(vb[3])


def body(svg):
    """Everything inside the root <svg>, declaration and root tag dropped."""
    start = svg.index(">", svg.index("<svg")) + 1
    return svg[start:svg.rindex("</svg>")]


def main(pdf, out):
    pages = []
    with tempfile.TemporaryDirectory() as tmp:
        for n in range(1, page_count(pdf) + 1):
            raw = render_page(pdf, n, tmp)
            pages.append((dimensions(raw), body(namespace_ids(raw, "p%d-" % n))))

    width = max(w for (w, _h), _b in pages)
    height = sum(h for (_w, h), _b in pages) + GAP * (len(pages) - 1)

    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        'viewBox="0 0 %g %g" width="%g" height="%g" '
        'role="img" aria-label="Résumé of Jihang Li">' % (width, height, width, height)
    ]
    y = 0.0
    for (w, h), inner in pages:
        x = (width - w) / 2
        # the page's own white ground: the wrapper is white today, but a page
        # that is narrower than its neighbours would otherwise show through
        parts.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#ffffff"/>'
                     % (x, y, w, h))
        parts.append('<svg x="%g" y="%g" width="%g" height="%g" viewBox="0 0 %g %g">%s</svg>'
                     % (x, y, w, h, w, h, inner))
        y += h + GAP
    parts.append("</svg>\n")

    io.open(out, "w", encoding="utf-8").write("".join(parts))
    print("%s  %d page(s)  %.0f KB" % (out, len(pages), os.path.getsize(out) / 1024))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
