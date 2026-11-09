#!/usr/bin/env python3
"""Stamp every script, stylesheet and data file with one release version (?v=...), so a browser can never mix an
old cached file with new ones. Run before each release: python3 scripts/version.py"""
import re, pathlib, time
V = time.strftime('%Y%m%d%H%M')
root = pathlib.Path(__file__).resolve().parent.parent
tag = lambda m: f"{m.group(1)}?v={V}{m.group(3)}"
n = 0
# module imports: from './x.js' and import('../x.js')
for f in (root / 'assets/js').rglob('*.js'):
    s = f.read_text()
    t = re.sub(r"((?:from |import\()'\.{1,2}/[\w/.-]+?\.js)(\?v=\w+)?(')", tag, s)
    # data files fetched by the app
    t = re.sub(r"(fetch\(['`]data/[\w/${}.-]+?\.json)(\?v=\w+)?(['`])", tag, t)
    t = re.sub(r"(soft\('data/[\w.-]+?\.json)(\?v=\w+)?(')", tag, t)
    if t != s:
        f.write_text(t); n += 1
# the page: stylesheets and the entry script
p = root / 'index.html'
s = p.read_text()
t = re.sub(r'((?:href|src)="assets/(?:css|js)/[\w.-]+?\.(?:css|js))(\?v=\w+)?(")', tag, s)
p.write_text(t)
print('version', V, 'files changed', n + (t != s))
