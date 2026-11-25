#!/usr/bin/env python3
"""Q-423 (Zoe, 2026-11-25): "open the recommendations and you
still have to scroll." Measured: the open fold overflows the
home view by ~277px at phone size, so the cards + foot buttons
sit below the fold. Fix: when the fold opens (toggle tap or a
quick pick engaging), the view auto-scrolls the toggle to the
top — the whole block (toggle + 3 cards + foot pair, ~498px)
then fits the ~605px view with room to spare. No visual
changes; closing the fold leaves the scroll alone.
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

rep('''        homeQuick = homeQuick === k ? null : k;
        if (homeQuick) homeRecOpen = true;
        homePage = 0;
        sfx("move");
        renderHome();
      });''',
    '''        homeQuick = homeQuick === k ? null : k;
        if (homeQuick) homeRecOpen = true;
        homePage = 0;
        sfx("move");
        renderHome();
        if (homeRecOpen) homeRecAnchor();
      });
      function homeRecAnchor() {
        var tg = document.getElementById("homeRecToggle");
        if (!tg) return;
        setTimeout(function () { try { tg.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }, 40);
      }''')

rep('''        if (homeRecOpen) {
          var rb = document.getElementById("homeRecBody");
          if (rb) { rb.classList.remove("pop"); void rb.offsetWidth; rb.classList.add("pop"); }
        }''',
    '''        if (homeRecOpen) {
          var rb = document.getElementById("homeRecBody");
          if (rb) { rb.classList.remove("pop"); void rb.offsetWidth; rb.classList.add("pop"); }
          homeRecAnchor();
        }''')

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q423-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q423 BUILD OK', tok)
