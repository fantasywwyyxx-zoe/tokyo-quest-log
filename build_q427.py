#!/usr/bin/env python3
"""Q-427: desktop layout (Zoe 2026-11-26, approving the audit
triage scope "桌面版也要，一起规划"). CSS only, appended to the
last <style> element inside a >=900px media query, so the phone
layout is untouched by construction:
- the map already runs full-viewport at every size;
- the content column (.wrap) widens 440 -> 780px;
- home: quick picks go 4-in-a-row, shelf cards cap at 300px,
  recommendations and area tiles use the width;
- list + my-list results become two-column grids (legend route
  cards span the full row);
- the browse bar centres over the content column;
- the quest detail becomes a centred sheet (680x880 max)
  instead of a full-screen takeover;
- the bottom tab bar widens 424 -> 560px.
Token bump included; no JS changes."""
import subprocess

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
orig_len = len(src)

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

# ---------- token ----------
prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD']).decode().strip()
import datetime
jst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
PFX = ''.join(map(chr, [116, 113, 108, 45]))
token = '%s%s-q427-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
old_tok = None
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# ---------- desktop CSS ----------
CSS = '''
/* Q-427: desktop layout. Phone rules are untouched; everything
   below lives inside the >=900px media query. The map already
   runs full-viewport, so this widens the content column, puts
   independent cards two-up, and turns the quest detail from a
   full-screen takeover into a centred sheet. */
@media (min-width: 900px) {
  .wrap { max-width: 780px; }
  #view-home #homeQuick { grid-template-columns: repeat(4, 1fr); }
  #view-home .hs-card { flex-basis: 300px; }
  #view-home #homeRecList { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  #homeAreasRow { grid-template-columns: repeat(6, 1fr); }
  #msResults { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-content: start; }
  #msResults .ms-row.is-legend { grid-column: 1 / -1; }
  #mineSavedList { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-content: start; }
  #browseBar { left: 50%; right: auto; transform: translateX(-50%); width: min(756px, calc(100vw - 24px)); }
  dialog#detail { inset: 0; margin: auto; width: min(680px, 94vw); max-width: 94vw; height: min(880px, 94dvh); max-height: 94dvh; border-radius: 18px; box-shadow: 0 18px 60px rgba(10, 16, 40, .45); }
  dialog#detail .detail-win { width: 100%; height: 100%; max-height: 100%; border-left: 0; border-right: 0; }
  body[data-view] .tabs { width: min(560px, calc(100vw - 16px)); }
}
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q427 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
