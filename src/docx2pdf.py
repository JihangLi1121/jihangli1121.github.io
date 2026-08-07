#!/usr/bin/env python3
"""Render a .docx résumé to PDF without Word or LibreOffice.

Neither is usable on this machine — Word's AppleScript `save as` is refused and
the Homebrew LibreOffice cask is broken — and Pages silently drops the tab stops
this document's layout depends on, running labels into values and dates into the
text before them.

So the formatting is read out of the docx itself and rewritten as CSS, then
printed by headless Chrome, which emits real vector text with embedded fonts:
as sharp as any word processor's export, and still selectable.

Tabs are the part Pages got wrong, and this document expresses them two ways —
as <w:tab/> elements *and* as literal tab characters inside <w:t> — so both are
treated as column breaks. The two stop patterns then map onto flexbox:

  * a left stop with a hanging indent (the skills rows) -> fixed-width label
    column, so values line up;
  * a right stop at the margin (the entry headers) -> space-between, so dates
    sit against the right edge.

Everything else — page size, margins, indents, spacing, borders, bullet glyph,
font sizes, bold and italic — is read from the file rather than hardcoded, so
editing the docx and re-running this preserves the layout.

Usage: docx2pdf.py <in.docx> <out.pdf>
"""
import html
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TWIP = 1440.0     # twips per inch
HALFPT = 2.0      # w:sz is in half-points
TWENTIETH = 20.0  # w:spacing is in twentieths of a point
TAB = "\x00TAB\x00"


def inch(tw):
    return float(tw) / TWIP


def pt20(v):
    return float(v) / TWENTIETH


def attr(el, name, default=None):
    return el.get(W + name, default) if el is not None else default


class Doc:
    def __init__(self, path):
        z = zipfile.ZipFile(path)
        self.root = ET.fromstring(z.read("word/document.xml"))
        self.body = self.root.find(W + "body")
        self.rels = {r.get("Id"): r.get("Target")
                     for r in ET.fromstring(z.read("word/_rels/document.xml.rels"))}

        num = ET.fromstring(z.read("word/numbering.xml"))
        lvl = num.find(".//" + W + "lvl")
        self.bullet = attr(lvl.find(W + "lvlText"), "val", "•")
        bi = lvl.find(W + "pPr/" + W + "ind")
        self.bullet_left = inch(attr(bi, "left", 720))
        self.bullet_hang = inch(attr(bi, "hanging", 360))

        sect = self.body.find(W + "sectPr")
        sz, mar = sect.find(W + "pgSz"), sect.find(W + "pgMar")
        self.pw, self.ph = inch(attr(sz, "w", 12240)), inch(attr(sz, "h", 15840))
        self.m = {k: inch(attr(mar, k, 720)) for k in ("top", "right", "bottom", "left")}

        st = ET.fromstring(z.read("word/styles.xml"))
        dsz = st.find(".//" + W + "docDefaults/" + W + "rPrDefault/" + W + "rPr/" + W + "sz")
        self.base_pt = float(attr(dsz, "val", 19)) / HALFPT


def run_style(rPr, doc):
    styles = []
    if rPr is not None:
        if rPr.find(W + "b") is not None:
            styles.append("font-weight:700")
        if rPr.find(W + "i") is not None:
            styles.append("font-style:italic")
        sz = rPr.find(W + "sz")
        if sz is not None:
            pt = float(attr(sz, "val", 19)) / HALFPT
            if abs(pt - doc.base_pt) > 0.01:
                styles.append("font-size:%gpt" % pt)
        col = rPr.find(W + "color")
        if col is not None and attr(col, "val", "auto") not in ("auto", "000000"):
            styles.append("color:#" + attr(col, "val"))
    return ";".join(styles)


def run_pieces(r, doc):
    """A run as HTML fragments, with TAB sentinels wherever a column breaks."""
    style = run_style(r.find(W + "rPr"), doc)
    out = []
    for child in r:
        if child.tag == W + "tab":
            out.append(TAB)
        elif child.tag == W + "t":
            # leading/trailing spaces matter here, and runs of two spaces are
            # used as separators in the contact line, so they must not collapse
            for i, part in enumerate((child.text or "").split("\t")):
                if i:
                    out.append(TAB)
                if part:
                    esc = html.escape(part).replace("  ", "&nbsp; ")
                    out.append('<span style="%s">%s</span>' % (style, esc) if style else esc)
    return out


def columns(p, doc):
    """Every run flattened, then split into the columns the tabs separate."""
    pieces = []
    for child in p:
        if child.tag == W + "hyperlink":
            target = doc.rels.get(child.get(R + "id"), "")
            inner = []
            for r in child.findall(W + "r"):
                inner += [x for x in run_pieces(r, doc) if x != TAB]
            if inner:
                pieces.append('<a href="%s">%s</a>' % (html.escape(target), "".join(inner)))
        elif child.tag == W + "r":
            pieces += run_pieces(child, doc)

    cols, cur = [], []
    for piece in pieces:
        if piece == TAB:
            cols.append("".join(cur))
            cur = []
        else:
            cur.append(piece)
    cols.append("".join(cur))
    return cols


def para_html(p, doc):
    pPr = p.find(W + "pPr")
    css = []

    sp = pPr.find(W + "spacing") if pPr is not None else None
    css.append("margin-top:%gpt" % pt20(attr(sp, "before", 0)))
    css.append("margin-bottom:%gpt" % pt20(attr(sp, "after", 0)))
    line = attr(sp, "line")
    # w:line under the default "auto" rule counts 240ths of one line
    css.append("line-height:%g" % (1.15 * float(line) / 240.0 if line else 1.15))

    jc = attr(pPr.find(W + "jc") if pPr is not None else None, "val")
    if jc:
        css.append("text-align:" + {"both": "justify"}.get(jc, jc))

    bdr = pPr.find(W + "pBdr") if pPr is not None else None
    if bdr is not None and bdr.find(W + "bottom") is not None:
        b = bdr.find(W + "bottom")
        css.append("border-bottom:%gpt solid #%s"
                   % (float(attr(b, "sz", 6)) / 8.0, attr(b, "color", "000000")))
        css.append("padding-bottom:%gpt" % float(attr(b, "space", 0)))

    ind = pPr.find(W + "ind") if pPr is not None else None
    left = inch(attr(ind, "left", 0))
    hang = inch(attr(ind, "hanging", 0))

    cols = columns(p, doc)

    # --- bullets: a fixed glyph column, exactly as the numbering defines it ---
    if pPr is not None and pPr.find(W + "numPr") is not None:
        css.append("display:flex")
        css.append("padding-left:%gin" % (doc.bullet_left - doc.bullet_hang))
        return ('<p style="%s"><span style="flex:0 0 %gin">%s</span>'
                '<span style="flex:1 1 auto">%s</span></p>'
                % (";".join(css), doc.bullet_hang, doc.bullet, "".join(cols)))

    tabs = pPr.find(W + "tabs") if pPr is not None else None
    stops = tabs.findall(W + "tab") if tabs is not None else []

    if len(cols) > 1 and stops:
        stop = stops[0]
        pos = inch(attr(stop, "pos", 0))
        if attr(stop, "val") == "right":
            css.append("display:flex")
            css.append("justify-content:space-between")
            css.append("gap:0.15in")
            if left:
                css.append("padding-left:%gin" % left)
            return ('<p style="%s"><span>%s</span><span style="white-space:nowrap">%s</span></p>'
                    % (";".join(css), "".join(cols[:-1]), cols[-1]))
        label_x = left - hang
        css.append("display:flex")
        css.append("padding-left:%gin" % label_x)
        return ('<p style="%s"><span style="flex:0 0 %gin">%s</span>'
                '<span style="flex:1 1 auto">%s</span></p>'
                % (";".join(css), pos - label_x, cols[0], "".join(cols[1:])))

    if left:
        css.append("padding-left:%gin" % left)
    return '<p style="%s">%s</p>' % (";".join(css), "".join(cols))


def build(docx, out_pdf):
    doc = Doc(docx)
    body = "\n".join(para_html(p, doc) for p in doc.body.findall(W + "p"))

    page = """<!doctype html><html><head><meta charset="utf-8">
<title>Jihang Li &mdash; R&eacute;sum&eacute;</title>
<style>
  @page { size: %(pw)gin %(ph)gin; margin: %(mt)gin %(mr)gin %(mb)gin %(ml)gin; }
  html, body { margin:0; padding:0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: %(base)gpt;
    color: #000;
  }
  p { margin:0; }
  a { color:#0000EE; text-decoration:underline; }
</style></head><body>
%(body)s
</body></html>
""" % {"pw": doc.pw, "ph": doc.ph, "mt": doc.m["top"], "mr": doc.m["right"],
       "mb": doc.m["bottom"], "ml": doc.m["left"], "base": doc.base_pt, "body": body}

    tmp = os.path.join(os.path.dirname(os.path.abspath(out_pdf)), "_resume_render.html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(page)

    subprocess.run([CHROME, "--headless=new", "--disable-gpu",
                    "--force-prefers-reduced-motion", "--no-pdf-header-footer",
                    "--print-to-pdf=" + out_pdf, "file://" + tmp],
                   check=True, capture_output=True)
    os.remove(tmp)
    print("%s  %.0f KB" % (out_pdf, os.path.getsize(out_pdf) / 1024))


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
