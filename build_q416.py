#!/usr/bin/env python3
"""Q-416 (Zoe, 2026-11-24): two device rulings.
1) "今日推荐可以不要了" — the Daily Picks capsule (#recMapBtn)
   leaves the map. The deck code/data stay inert (preservation
   rule); every reference was already existence-guarded.
2) "怎么还有史诗的说法" — the EPIC tier stops being a user-facing
   concept: detail tier badge, detail purple epic theme, pin gold,
   list/advlog EPIC tags, the filter sheet's EPIC kind, and the
   epic share text all retire. The reward band stays, titled by
   its content alone （限定装備）. Mechanics unchanged: the ten
   quests still grant their limited gear and stay GPS-only —
   they are simply ordinary quests now.
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

# ---------- 1: Daily Picks capsule off the map ----------
i0 = src.find('<button class="mg-map-btn" id="recMapBtn"')
assert i0 >= 0
i1 = src.find('</button>', i0) + len('</button>')
span = src[i0:i1]
assert 'recMapName' in span and 'recMapTicket' in span
src = src[:i0] + src[i1:]

# ---------- 2a: detail tier badge ----------
rep('''      function stateBadges(e) {
        /* dedup (Zoe, 2026-11-02): the free mark lives only in
           the price row and the ending-soon countdown only in
           the period row -- the band keeps the EPIC tier mark,
           which stands apart from the status slot. */
        var s = "";
        if (isEpicQuest(e)) s += '<span class="epic-badge">' + L().epicBadge + "</span>";
        return s;
      }''',
    '''      function stateBadges(e) {
        /* Q-416 (Zoe, 2026-11-24): no tier badge — the EPIC
           label retired from the detail head entirely. */
        return "";
      }''')

# ---------- 2b: reward band titled by its content alone ----------
rep('''esc(t.epicBadge) + " · " + esc(t.epicRewardK)''', '''esc(t.epicRewardK)''')

# ---------- 2c: pins lose the epic class (gold dots / purple pins) ----------
rep('''b.className = "pin" + (e.evergreen ? " is-ever" : " is-timed") + (isCleared(e.id) ? " is-cleared" : "") + (isEpicQuest(e) ? " is-epic" : "");''',
    '''b.className = "pin" + (e.evergreen ? " is-ever" : " is-timed") + (isCleared(e.id) ? " is-cleared" : "");''')

# ---------- 2d: list rows lose the epic class + tag ----------
rep('''<div class="ms-row' + (clr ? " is-cleared" : "") + (e.evergreen ? " is-ever" : " is-timed") + (isEpicQuest(e) ? " is-epic" : "") + (e.id === selQid ? " is-sel" : "") + '"''',
    '''<div class="ms-row' + (clr ? " is-cleared" : "") + (e.evergreen ? " is-ever" : " is-timed") + (e.id === selQid ? " is-sel" : "") + '"''')
rep(''' + (isEpicQuest(e) ? '<span class="epic-tag">EPIC</span>' : "") + '</span>' +''',
    ''' + '</span>' +''')

# ---------- 2e: adventure log rows lose the tag ----------
rep(''' + (isEpicQuest(o.e) ? '<span class="epic-tag">EPIC</span>' : "") + '</span>' +''',
    ''' + '</span>' +''')

# ---------- 2f: detail loses the epic theme class ----------
rep('''        detail.classList.toggle("is-epic", isEpicQuest(e));
''', '')

# ---------- 2g: the filter sheet loses the EPIC kind ----------
rep('''{ key: "ever", label: L().legendEver }, { key: "epic", label: "EPIC" }];''',
    '''{ key: "ever", label: L().legendEver }];''')

# ---------- 2h: share text is the plain quest text for everyone ----------
rep('''shareText: isEpicQuest(e) ? L().shareEpic(evName(e)) : L().shareQuest(evName(e)),''',
    '''shareText: L().shareQuest(evName(e)),''')

# ---------- token ----------
prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q416-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q416 BUILD OK', tok)
