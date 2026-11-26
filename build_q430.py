#!/usr/bin/env python3
"""Q-430: small fix from the UI/UX audit triage — the My List
share button is disabled (dimmed) when the active list has
nothing shareable, instead of opening an empty share.
Token bump included."""
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
token = '%s%s-q430-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

rep('''        var sav = act.items.map(function (id) { return byId(id); }).filter(function (e) { return e && !isCleared(e.id); }).reverse();''',
    '''        var sav = act.items.map(function (id) { return byId(id); }).filter(function (e) { return e && !isCleared(e.id); }).reverse();
        var shb = document.getElementById("mineShareBtn");
        if (shb) { var noShare = !sav.length; shb.disabled = noShare; shb.classList.toggle("is-disabled", noShare); }''')

CSS = '''
/* Q-430: empty-list share button rests dimmed + disabled. */
.mine-share.is-disabled { opacity: .45; box-shadow: none; }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q430 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
