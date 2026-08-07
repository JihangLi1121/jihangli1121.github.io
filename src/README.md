# src — how the deployed files are built

Everything at the repo root that is *generated* comes from here. The site has no
build step at serve time: these scripts run on a laptop, and the output is
committed.

```bash
python3 src/splice.py       # parts/*.js + viewer.css -> design-a-confocal.html
python3 src/build_site.py   # -> ../index.html and ../assets/js/lineage.js
python3 src/make_resume.py  # -> ../resume.html and ../assets/media/resume-preview.svg
python3 src/make_404.py     # -> ../404.html
```

`splice.py` always reads `design-a-confocal.bak.html`, the pristine export, and
writes `design-a-confocal.html`. Running it twice is safe; editing the spliced
file is not — put changes in `parts/` or in the `.bak`.

| File | What it makes |
| --- | --- |
| `splice.py` + `parts/` | the page fragment: WebGL viewer, hero, case studies, charts |
| `build_site.py` | wraps the fragment in a document, splits out the 300 KB lineage payload, writes the social meta |
| `make_resume.py` → `make_resume_svg.py` | `resume.html` and the vector conversion of `resume.pdf` |
| `make_404.py` | the 404 page |
| `make_ogcard.py` | the 1200×630 social card |
| `extract_lineage.py` | packs a CellUniverse solver run into `lineage_data.js` (14 bytes per cell-frame) |
| `make_mip.py` | maximum-intensity projections from the confocal TIFF stack |
| `lm_mock.py` | a mock API that lets LaunchMail render with synthetic data for screenshots |

`extract_lineage.py` and `make_mip.py` read data that lives outside this repo
(the CellUniverse output directory) and only need re-running if that data
changes. They need PIL and numpy; nothing else here does.

## The résumé is the exception

`.github/workflows/resume-preview.yml` runs `make_resume_svg.py` in CI, so
pushing a new PDF to the repo root refreshes the site on its own — see the
comments at the top of that file.
