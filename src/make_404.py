#!/usr/bin/env python3
"""Emit site/404.html — GitHub Pages serves this for any path that misses.

Kept in the page's own language: a plane with nothing acquired on it. No
scripts, no data payload, so it loads instantly even from a bad deep link.
"""
import io, os

_HERE = os.path.dirname(os.path.abspath(__file__))
BASE = _HERE
SITE = os.path.dirname(_HERE)
SITE_URL = "https://jihangli1121.github.io/"

CSS = """
:root{
  --ground:#070B0D;--panel:#0E1518;--line:#1C2A2E;--line-2:#26383D;
  --text:#DCE8E5;--muted:#93A5A3;--muted-2:#6C7E7C;--accent:#4FF0C1;--accent-rgb:79,240,193;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  --display:"Avenir Next Condensed","Futura","Trebuchet MS",system-ui,sans-serif;
  --body:"Avenir Next",Avenir,"Segoe UI",system-ui,sans-serif;
  color-scheme:dark;
}
:root[data-theme="light"],
:root:not([data-theme="dark"]){}
@media (prefers-color-scheme:light){
  :root:not([data-theme="dark"]){
    --ground:#EFF2ED;--panel:#E4E9E3;--line:#C7D2CA;--line-2:#AEBDB2;
    --text:#101A18;--muted:#4A5C57;--muted-2:#6C7E7C;--accent:#0B7F63;--accent-rgb:11,127,99;
    color-scheme:light;
  }
}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--ground);color:var(--text);
  font-family:var(--body);display:grid;place-items:center;padding:2rem;
  -webkit-font-smoothing:antialiased;position:relative;overflow-x:hidden}
/* the empty plane: a reticle with nothing in it */
.field{position:fixed;inset:clamp(1rem,4vw,3rem);border:1px solid var(--line);
  pointer-events:none;opacity:.7}
.field::before,.field::after{content:"";position:absolute;background:var(--line)}
.field::before{left:0;right:0;top:50%;height:1px}
.field::after{top:0;bottom:0;left:50%;width:1px}
.noise{position:fixed;inset:0;pointer-events:none;opacity:.5;
  background:
    radial-gradient(1.5px 1.5px at 18% 32%, rgba(var(--accent-rgb),.35), transparent 60%),
    radial-gradient(1.5px 1.5px at 72% 21%, rgba(var(--accent-rgb),.22), transparent 60%),
    radial-gradient(2px 2px   at 44% 74%, rgba(var(--accent-rgb),.28), transparent 60%),
    radial-gradient(1px 1px   at 87% 63%, rgba(var(--accent-rgb),.30), transparent 60%),
    radial-gradient(1px 1px   at 29% 88%, rgba(var(--accent-rgb),.20), transparent 60%);
}
main{position:relative;max-width:44rem;width:100%}
.stamp{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;
  color:var(--muted-2);display:flex;gap:.7rem;align-items:center;margin-bottom:1.4rem}
.stamp::after{content:"";flex:1 1 auto;height:1px;background:var(--line)}
.code{font-family:var(--display);font-size:clamp(5rem,20vw,11rem);line-height:.84;
  letter-spacing:-.03em;font-weight:600;margin:0 0 .6rem}
.code em{font-style:normal;color:var(--accent)}
h1{font-family:var(--display);font-size:clamp(1.6rem,4vw,2.4rem);font-weight:600;
  letter-spacing:-.015em;margin:0 0 .8rem}
p{color:var(--muted);max-width:44ch;margin:0 0 2rem;font-size:1.05rem;line-height:1.6}
.links{display:flex;flex-wrap:wrap;gap:.6rem}
.links a{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  text-decoration:none;padding:.72rem 1.05rem;border:1px solid var(--line);color:var(--muted);
  transition:color .25s,border-color .25s,background-color .25s}
.links a:hover{color:var(--text);border-color:var(--line-2)}
.links a.solid{background:var(--accent);color:#04120E;border-color:var(--accent);font-weight:600}
.links a.solid:hover{filter:brightness(1.08)}
.meta{margin-top:2.6rem;font-family:var(--mono);font-size:11px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted-2)}
@media (prefers-reduced-motion:no-preference){
  main{animation:in .6s cubic-bezier(.22,1,.36,1) both}
  @keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
}
"""

html = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — nothing on this plane · Jihang Li</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#05090B">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2305090B'/%3E%3Ccircle cx='16' cy='16' r='8' fill='none' stroke='%236BF2B0' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2.5' fill='%236BF2B0'/%3E%3C/svg%3E">
<style>__CSS__</style>
</head>
<body>
<div class="field" aria-hidden="true"></div>
<div class="noise" aria-hidden="true"></div>
<main>
  <p class="stamp">Focal plane · not acquired</p>
  <p class="code">4<em>0</em>4</p>
  <h1>Nothing was imaged at this address.</h1>
  <p>The link points at a plane that does not exist — mistyped, renamed, or
     never acquired in the first place. The specimens are all still on the stage.</p>
  <div class="links">
    <a class="solid" href="./">Back to the field</a>
    <a href="./#projects">View the specimens</a>
    <a href="./resume.html">Résumé</a>
  </div>
  <p class="meta">Jihang Li · MCS · UC Irvine</p>
</main>
</body>
</html>
"""

out = os.path.join(SITE, "404.html")
io.open(out, "w", encoding="utf-8").write(html.replace("__CSS__", CSS))
print("wrote %s  %.0f KB" % (out, os.path.getsize(out) / 1024))
