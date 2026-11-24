#!/usr/bin/env python3
"""Q-415 hotfix (Zoe device report, 2026-11-24 17:12): the Q-414
browse bar leaked onto the TITLE screen — at boot data-view is
"map" and renderStaticText's syncBrowseBar() un-hid the bar while
the start screen was still up (it paints over the title art).
The bar may only show once the start screen is gone."""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()

old = '''        var on = v === "map" || v === "list";
        bar.hidden = !on;'''
new = '''        var ss = document.getElementById("startScreen");
        var on = (v === "map" || v === "list") && !!ss && ss.hidden;
        bar.hidden = !on;'''
assert src.count(old) == 1
src = src.replace(old, new)

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q415-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q415 BUILD OK', tok)
