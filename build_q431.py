#!/usr/bin/env python3
"""Q-431: the seasonal carousel gains pagination dots so it
reads as swipeable (Zoe 2026-11-26: users would not realise
it scrolls sideways). Dots are painted by renderShelf (one per
shelf event, hidden when fewer than 2), and a passive scroll
listener on the row moves the active dot. Token bump."""
import subprocess

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
orig_len = len(src)

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD']).decode().strip()
import datetime
jst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
PFX = ''.join(map(chr, [116, 113, 108, 45]))
token = '%s%s-q431-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# markup: dots container after the row (the shelf markup is one
# long line; anchor on the row div + the shelf close)
rep('<div class="hs-row" id="hsRow"></div></div>',
    '<div class="hs-row" id="hsRow"></div><div class="hs-dots" id="hsDots"></div></div>')

# renderShelf: paint the dots right after the row is painted
rep('        document.getElementById("hsRow").innerHTML = evs.map(function (e) {',
    '''        document.getElementById("hsDots").innerHTML = evs.length > 1 ? evs.map(function (_, di) { return '<span class="hs-dot' + (di === 0 ? " is-on" : "") + '"></span>'; }).join("") : "";
        document.getElementById("hsRow").scrollLeft = 0;
        document.getElementById("hsRow").innerHTML = evs.map(function (e) {''')

# wiring: scroll listener beside the row's click delegation
rep('''      document.getElementById("hsRow").addEventListener("click", function (ev) {''',
    '''      document.getElementById("hsRow").addEventListener("scroll", function () {
        var row = document.getElementById("hsRow");
        var card = row.querySelector(".hs-card");
        var dots = document.getElementById("hsDots");
        if (!card || !dots || !dots.children.length) return;
        var w = card.getBoundingClientRect().width + 10;
        var idx = Math.max(0, Math.min(dots.children.length - 1, Math.round(row.scrollLeft / w)));
        for (var di = 0; di < dots.children.length; di++) dots.children[di].classList.toggle("is-on", di === idx);
      }, { passive: true });
      document.getElementById("hsRow").addEventListener("click", function (ev) {''')

CSS = '''
/* Q-431: carousel pagination dots (active = ink, rest faint). */
.hs-dots { display: flex; justify-content: center; gap: 6px; padding-top: 8px; }
.hs-dots:empty { display: none; }
.hs-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(34, 48, 60, .22); }
.hs-dot.is-on { background: var(--ink); }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q431 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
