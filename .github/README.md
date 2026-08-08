# Jihang Li — personal site

Static site. No build step, no dependencies, no framework — open `index.html`
and it runs.

## Layout

    index.html                 the whole page (markup + CSS + JS inline)
    assets/js/lineage.js       packed CellUniverse solver output (300 KB)
    assets/js/assets.js        manifest pointing at the real media
    assets/media/              videos, posters, stills
    .nojekyll                  stops GitHub Pages running Jekyll

`assets/js/assets.js` is optional. Without it every image and video slot falls
back to a generated on-theme placeholder, so the page still works standalone.

## The 3D viewer

`assets/js/lineage.js` holds a real run: 171 frames, 15,798 fitted cells, 611
lineage nodes, quantised to 14 bytes per cell-frame. Regenerate it with
`extract_lineage.py` pointed at a `FinalLineageTree.csv` — that script, and the
rest of the build tooling, lives in `../website-build`, deliberately outside
this repo so only what the site serves is tracked here.

Cells are ray-traced ellipsoids — the quad is only a bounding box and the
surface is solved analytically per fragment, reproducing the solver's own
`R = Rz·Ry·Rx` convention. Needs WebGL2; falls back to 2D canvas without it.

## Deploying to GitHub Pages

This is a GitHub user site — the repo is named `jihangli1121.github.io`, so
Pages serves it at the root of that domain. Push to `main` and it is live at
https://jihangli1121.github.io/ in about a minute.

Updating the résumé: drop the PDF in the repo root under any name containing
"resume" and push. `.github/workflows/resume-preview.yml` renames it to
`resume.pdf`, re-renders `assets/media/resume-preview.svg` from every page,
and commits both.

Limits that matter: 100 MB per file, 1 GB per site, 100 GB/month soft
bandwidth. This site is ~21 MB. Git LFS files are NOT served by Pages — keep
the videos as normal git objects.

## Re-encoding video

Videos use `preload="none"` with a poster, so nothing downloads until play is
pressed. To add another clip:

    ffmpeg -i in.mp4 -vf "scale=1440:-2" -c:v libx264 -crf 27 -preset slow \
           -pix_fmt yuv420p -an -movflags +faststart out.mp4

Then add it to `assets/js/assets.js`.
