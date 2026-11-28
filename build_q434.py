#!/usr/bin/env python3
"""Q-434: font + chip refinement (Zoe via ops, 2026-11-28:
「这种字体有问题。标签可以更精细化更好看一点」 on the search /
quick-chip / shelf-head area).
Root cause found: the Google Fonts request only ever loaded
M PLUS Rounded 1c 700/800 (Baloo 700/800, Noto Sans SC
700/900), so every 400/500/600 request in the UI silently
snapped to 700 — the Q-432 "lighter hierarchy" never existed
on device, and small text rendered in a heavy rounded face.
The search input is even set to 700 explicitly, so its
placeholder renders bold.
Fix: load the real 400/500 (Baloo 500/600, Noto 400/500)
weights; placeholder/input to 500; chips to hairline 1px
borders + weight 500 with a quiet red selected state; the
shelf See-all pill likewise; section heads to a real 700;
sub/meta/season text to a real 500; antialiased smoothing
for iOS. Token bump included."""
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
token = '%s%s-q434-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

rep('family=Baloo+2:wght@700;800&family=M+PLUS+Rounded+1c:wght@700;800&family=Noto+Sans+SC:wght@700;900',
    'family=Baloo+2:wght@500;600;700;800&family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Noto+Sans+SC:wght@400;500;700;900')

CSS = '''
/* Q-434: real light weights + delicate chips (hairline
   borders, weight 500, quiet selected state). */
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
#view-home .home-search { border: 1px solid rgba(34, 48, 60, .30); box-shadow: 0 1px 4px rgba(34, 48, 60, .05); }
#view-home .home-search input { font-weight: 500; }
#view-home .home-search input::placeholder { color: rgba(34, 48, 60, .40); }
#view-home #homeQuick .hq-btn { border: 1px solid rgba(34, 48, 60, .26); font-weight: 500; font-size: 12px; letter-spacing: .02em; padding: 6px 3px; }
#view-home #homeQuick .hq-btn.is-on { background: #fff6f4; border-color: var(--primary); color: var(--primary); font-weight: 600; }
#view-home .hs-all { border: 1px solid rgba(34, 48, 60, .30); box-shadow: none; font-weight: 600; padding: 5px 12px; }
#view-home .hs-head { font-weight: 700; }
#view-home .home-rec-head { font-weight: 700; }
#view-home #homeAreasTitle { font-weight: 700; }
#view-home .home-sub { font-weight: 500; }
#view-home .hs-season { font-weight: 500; }
#view-home .hs-meta { font-weight: 500; }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q434 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
