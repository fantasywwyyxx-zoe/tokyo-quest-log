#!/usr/bin/env python3
"""Q-418 (Zoe, 2026-11-24 17:59): the home scene strip goes.
She circled the whole strip on her device — hero, speech
bubble, Lv/ticket HUD — "这个不需要感觉占地方": not needed,
and it eats the first screen. The home now starts straight
at the quick picks. The guarded HUD/scene/canvas paints in
renderHome stay (they no-op); the unguarded bubble paints go
with the markup. STR bubble strings stay in the dicts, inert.
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

rep('''          <div class="home-scene" id="homeScene" data-phase="day">
            <span class="home-hud" id="homeHud"></span>
            <canvas id="homeHeroCanvas" width="16" height="16" aria-hidden="true"></canvas>
            <div class="home-bubble"><div class="hb-1" id="homeAsk1"></div><div class="hb-2" id="homeAsk2"></div></div>
          </div>
''', '')
rep('''        document.getElementById("homeAsk1").textContent = t.homeAsk1;
        document.getElementById("homeAsk2").textContent = t.homeAsk2;
''', '')

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q418-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q418 BUILD OK', tok)
