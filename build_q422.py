#!/usr/bin/env python3
"""Q-422 (Zoe, 2026-11-25 device): two fixes.
1) The near quick-pick icon: ICONS.pin was a pushpin silhouette
   that reads as a black blob at 20px (she circled it). It
   becomes a location pin with a punched centre hole (evenodd,
   same language as target/tag). Both consumers win: the home
   quick pick and the check-in button.
2) Map default view: she said the default range is too big,
   twice ("默认的这个太大了" / "再范围缩小"). Measured default
   span was 0.350 deg lng; goHomeView now doubles the fit
   scale, halving the default span to ~0.175 deg — the Yamanote
   core framed, still the far dot band.
"""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

rep('''pin: ico('<path d="M8 0h3v2h1v5H9l-1 4-3-4H3V2h2z"/>'),''',
    '''pin: ico('<path fill-rule="evenodd" d="M8 15.5C6.5 13.4 3 10.6 3 6.7a5 5 0 1 1 10 0c0 3.9-3.5 6.7-5 8.8zM8 4.8a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z"/>'),''')

rep('''        var s = Math.min(g.w / g.pw, g.h / g.ph);
        s = Math.min(2.9, Math.max(1, s));''',
    '''        var s = Math.min(g.w / g.pw, g.h / g.ph);
        s = Math.min(2.9, Math.max(1, s) * 2);''')

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q422-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q422 BUILD OK', tok)
