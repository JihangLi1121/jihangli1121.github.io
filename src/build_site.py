#!/usr/bin/env python3
"""Build the deployable site from the artifact fragment.

The artifact build inlines everything (artifacts block external requests).
The site build splits the 300KB lineage payload into its own cacheable file,
loads the real-asset manifest, and wraps the fragment in a real document.
"""
import io, os, re, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)
frag = io.open(os.path.join(BASE, "design-a-confocal.html"), encoding="utf-8").read()

# --- pull the lineage payload out into its own file --------------------------
m = re.search(r"<script>(window\.CU_LINEAGE=.*?)</script>\s*", frag, re.S)
if not m:
    sys.exit("lineage payload not found")
data = m.group(1)
os.makedirs(os.path.join(SITE, "assets", "js"), exist_ok=True)
io.open(os.path.join(SITE, "assets", "js", "lineage.js"), "w", encoding="utf-8").write(data)
frag = frag[:m.start()] + frag[m.end():]

# --- drop the inlined stills: the site loads assets/js/assets.js instead, which
#     also carries the video paths. Leaving both in would let the inline copy
#     (parsed later) win and silently disable the real clips. ----------------
m2 = re.search(r"<script>/\* Inlined stills.*?</script>\s*", frag, re.S)
if not m2:
    sys.exit("inline stills block not found — check splice.py output")
frag = frag[:m2.start()] + frag[m2.end():]

TITLE = "Jihang Li — 3D cell lineage reconstruction & full-stack AI systems"
DESC = ("Jihang Li — MS Computer Science at UC Irvine. 3D cell-lineage reconstruction "
        "in C++ on the CellUniverse project, and production AI systems full-stack.")

# Every social URL must be absolute. Facebook, LinkedIn, Slack, Discord and
# iMessage all fetch the page from their own servers and do not resolve
# relative paths, so a relative og:image simply yields no preview image.
SITE_URL = "https://jihangli1121.github.io/"
OG_IMAGE = SITE_URL + "assets/media/og-card.jpg"
OG_ALT = "Jihang Li — 3D cell-lineage reconstruction in C++, and production AI systems full-stack."

head = (
'<!doctype html>\n<html lang="en">\n<head>\n'
'<meta charset="utf-8">\n'
'<meta name="viewport" content="width=device-width, initial-scale=1">\n'
'<title>' + TITLE + '</title>\n'
'<meta name="description" content="' + DESC + '">\n'
'<meta name="author" content="Jihang Li">\n'
'<meta name="theme-color" content="#05090B">\n'
'<link rel="canonical" href="' + SITE_URL + '">\n'
'<meta property="og:type" content="website">\n'
'<meta property="og:site_name" content="Jihang Li">\n'
'<meta property="og:locale" content="en_US">\n'
'<meta property="og:url" content="' + SITE_URL + '">\n'
'<meta property="og:title" content="' + TITLE + '">\n'
'<meta property="og:description" content="' + DESC + '">\n'
'<meta property="og:image" content="' + OG_IMAGE + '">\n'
'<meta property="og:image:secure_url" content="' + OG_IMAGE + '">\n'
'<meta property="og:image:type" content="image/jpeg">\n'
'<meta property="og:image:width" content="1200">\n'
'<meta property="og:image:height" content="630">\n'
'<meta property="og:image:alt" content="' + OG_ALT + '">\n'
'<meta name="twitter:card" content="summary_large_image">\n'
'<meta name="twitter:title" content="' + TITLE + '">\n'
'<meta name="twitter:description" content="' + DESC + '">\n'
'<meta name="twitter:image" content="' + OG_IMAGE + '">\n'
'<meta name="twitter:image:alt" content="' + OG_ALT + '">\n'
'<link rel="icon" href="data:image/svg+xml,'
  '%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E'
  '%3Crect width=\'32\' height=\'32\' fill=\'%2305090B\'/%3E'
  '%3Ccircle cx=\'16\' cy=\'16\' r=\'8\' fill=\'none\' stroke=\'%236BF2B0\' stroke-width=\'2\'/%3E'
  '%3Ccircle cx=\'16\' cy=\'16\' r=\'2.5\' fill=\'%236BF2B0\'/%3E%3C/svg%3E">\n'
'<script src="assets/js/lineage.js"></script>\n'
'<script src="assets/js/assets.js"></script>\n'
'</head>\n<body>\n'
)

io.open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(head + frag + "\n</body>\n</html>\n")
io.open(os.path.join(SITE, ".nojekyll"), "w").write("")

idx = os.path.getsize(os.path.join(SITE, "index.html"))
lin = os.path.getsize(os.path.join(SITE, "assets", "js", "lineage.js"))
print("index.html      %6.0f KB" % (idx / 1024))
print("lineage.js      %6.0f KB" % (lin / 1024))
tot = 0
for r, d, fs in os.walk(SITE):
    for f in fs:
        tot += os.path.getsize(os.path.join(r, f))
print("site total      %6.1f MB" % (tot / 1048576))
