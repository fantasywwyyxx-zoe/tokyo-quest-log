#!/usr/bin/env python3
"""Q-429: homepage refinement deltas from Zoe's 2026-11-26
redesign brief (the rest of the brief already shipped as Q-426):
- brand subtitle under the tagline (the approved poster line in
  all three languages);
- search placeholder aligned to the brief
  (イベント・スポットを探す);
- the seasonal shelf leaves its bordered box (brief spacing
  rule: not every section is a container) — plain section head
  with the season as muted text;
- shelf gains a See-all button: lands on the list with the
  timed filter on (existing navigation, no new logic).
Token bump included."""
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
token = '%s%s-q429-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# ---------- STR: homeSub + shelfAll, placeholder swap ----------
rep('homeTagline: "Let\'s play Tokyo.",',
    'homeTagline: "Let\'s play Tokyo.", homeSub: "Tokyo\'s sights and hidden gems, as quests.", shelfAll: "See all",')
rep('homeTagline: "東京を、もっと遊ぼう。",',
    'homeTagline: "東京を、もっと遊ぼう。", homeSub: "東京の名所と穴場をクエストにした街歩きゲーム。", shelfAll: "すべて見る",')
rep('homeTagline: "把东京，玩尽兴。",',
    'homeTagline: "把东京，玩尽兴。", homeSub: "把东京各处的宝藏地点，做成任务的冒险游戏。", shelfAll: "查看全部",')
rep('searchPh: "Search title, area, category, mood…"', 'searchPh: "Search events & spots"')
rep('searchPh: "タイトル・エリア・雰囲気で検索"', 'searchPh: "イベント・スポットを探す"')
rep('searchPh: "按标题、区域、氛围搜索…"', 'searchPh: "搜索活动、景点"')

# ---------- markup: subtitle + shelf see-all ----------
rep('<div class="home-tagline" id="homeTagline"></div>',
    '<div class="home-tagline" id="homeTagline"></div>\n            <p class="home-sub" id="homeSub"></p>')
rep('<span class="hs-season" id="hsSeason"></span>',
    '<span class="hs-right"><span class="hs-season" id="hsSeason"></span><button class="hs-all" id="hsAllBtn" type="button"></button></span>')

# ---------- JS: paints + see-all wiring ----------
rep('        document.getElementById("homeTagline").textContent = t.homeTagline;',
    '''        document.getElementById("homeTagline").textContent = t.homeTagline;
        document.getElementById("homeSub").textContent = t.homeSub;''')
rep('        document.getElementById("hsSeason").textContent = (mo === 12 || mo <= 2) ? t.seasonWinter : mo <= 5 ? t.seasonSpring : mo <= 8 ? t.seasonSummer : t.seasonAutumn;',
    '''        document.getElementById("hsSeason").textContent = (mo === 12 || mo <= 2) ? t.seasonWinter : mo <= 5 ? t.seasonSpring : mo <= 8 ? t.seasonSummer : t.seasonAutumn;
        document.getElementById("hsAllBtn").textContent = t.shelfAll;''')
rep('''      document.getElementById("homeSearchForm").addEventListener("submit", function (ev) {
        ev.preventDefault();
        msQuery = document.getElementById("homeSearchInput").value.trim();
        sfx("accept");
        switchView("list");
      });''',
    '''      document.getElementById("homeSearchForm").addEventListener("submit", function (ev) {
        ev.preventDefault();
        msQuery = document.getElementById("homeSearchInput").value.trim();
        sfx("accept");
        switchView("list");
      });
      document.getElementById("hsAllBtn").addEventListener("click", function () {
        filterKind = "timed";
        sfx("accept");
        switchView("list");
      });''')

# ---------- CSS ----------
CSS = '''
/* Q-429: the shelf leaves its box (plain section head, season
   as muted text, See-all as a small real pill button) and the
   home header gains the brand subtitle line. */
#view-home .home-shelf { border: 0; background: transparent; border-radius: 0; overflow: visible; }
#view-home .hs-head { background: transparent; padding: 2px 2px 8px; align-items: center; }
#view-home .hs-season { color: var(--ink-dim); font-size: 12.5px; font-weight: 700; }
.hs-right { display: inline-flex; align-items: center; gap: 10px; }
.hs-all { font: inherit; font-size: 12.5px; font-weight: 800; color: var(--ink); background: var(--paper); border: 2px solid var(--line-c); border-radius: 999px; padding: 4px 11px; cursor: pointer; box-shadow: 0 2px 0 rgba(34, 48, 60, .3); }
.home-sub { margin: 3px 2px 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-dim); }
#view-home .home-search { margin-top: 0; }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q429 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
