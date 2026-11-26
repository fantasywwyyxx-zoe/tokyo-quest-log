#!/usr/bin/env python3
"""Q-432: home subtraction pass (Zoe's own list, 2026-11-26):
- quick picks become ONE row of light chips (fills/borders
  weakened, pastel tints retired; selected = red accent only);
- border diet: search, cards, tiles, browse bar, tab bar go
  to 1.5px soft borders + soft/no shadows;
- colour discipline: red is the one accent (search GO, chip
  selected, centre tab), everything else neutral;
- type hierarchy: tagline 22px, section titles 15px, card
  names 14/700, meta/labels lighter;
- shelf becomes full-card paging (one whole card per page,
  photo 16/10 with the day chip, name, then an area line in
  a fixed position); dots from Q-431 stay as page dots;
- nav slimming: centre tab shorter/less raised, lemon
  outline (the double highlight) removed, selected block
  inset by margins; home gains bottom cushion so the last
  card clears the bar. Token bump included."""
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
token = '%s%s-q432-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# shelf card gains the area line under the name
rep('''esc(evName(e)) + "</span></div>"''',
    '''esc(evName(e)) + '</span><span class="hs-meta">' + esc(e.area) + "</span></div>"''')

CSS = '''
/* Q-432: home subtraction pass — light chips, thin borders,
   one accent, lighter type, paging shelf, slim nav. */
#view-home #homeQuick { display: flex; grid-template-columns: none; gap: 6px; }
#view-home #homeQuick .hq-btn { flex: 1 1 0; min-width: 0; height: auto; padding: 7px 3px; font-size: 11.5px; font-weight: 700; white-space: nowrap; background: var(--paper); border: 1.5px solid rgba(34, 48, 60, .38); border-radius: 999px; box-shadow: none; }
#view-home #homeQuick .hq-btn .hq-ico { display: none; }
#view-home #homeQuick .hq-btn.is-on { background: #ffe9e5; border-color: var(--primary); color: var(--primary); }
#view-home .home-search { border: 1.5px solid rgba(34, 48, 60, .55); box-shadow: none; }
#view-home .home-card { border: 1.5px solid rgba(34, 48, 60, .45); box-shadow: 0 1px 3px rgba(34, 48, 60, .07); }
#view-home .hc-name { font-size: 14px; font-weight: 700; }
#view-home .hc-savebtn { border-width: 1.5px; box-shadow: none; }
#view-home .area-tile { border: 1.5px solid rgba(34, 48, 60, .45); box-shadow: none; }
#view-home .home-tagline { font-size: 22px; }
#view-home .home-sub { font-size: 12px; font-weight: 600; }
#view-home .hs-head { font-size: 15px; }
#view-home .home-rec-head { font-size: 15px; }
#view-home .home-areas h3, #homeAreasTitle { font-size: 15px; }
#view-home .hs-card { flex-basis: calc(100% - 2px); background: var(--paper); border: 1.5px solid rgba(34, 48, 60, .45); border-radius: 14px; overflow: hidden; gap: 0; padding-bottom: 8px; box-shadow: 0 1px 3px rgba(34, 48, 60, .07); }
#view-home .hs-img { border: 0; border-radius: 0; }
#view-home .hs-name { padding: 7px 10px 0; }
#view-home .hs-meta { padding: 1px 10px 0; font-size: 11px; font-weight: 600; color: var(--ink-dim); }
#view-home .home-panel { padding-bottom: 30px; }
#msResults .ms-row { border: 1.5px solid rgba(34, 48, 60, .45); box-shadow: 0 1px 3px rgba(34, 48, 60, .07); }
#view-mine .mine-card { border: 1.5px solid rgba(34, 48, 60, .45); box-shadow: 0 1px 3px rgba(34, 48, 60, .07); }
body[data-view] #browseBar { border-width: 1.5px; box-shadow: 0 2px 8px rgba(34, 48, 60, .10); }
body[data-view] .tabs { border-width: 1.5px; box-shadow: 0 4px 14px rgba(34, 48, 60, .13); }
body[data-view] .tabs .tab { font-size: 10.5px; font-weight: 700; }
.tabs .tab-start { height: 58px; min-height: 58px; margin-top: -7px; padding-top: 11px; font-size: 11.5px; box-shadow: 0 2px 8px rgba(34, 48, 60, .18); }
.tabs .tab-start[aria-selected="true"] { outline: none; margin-left: 3px; margin-right: 3px; }
.tab[aria-selected="true"] span:not(.count)::before { content: none; }
.tabs .tab[aria-selected="true"] > span:first-of-type:not(.count)::before { content: none; }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q432 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
