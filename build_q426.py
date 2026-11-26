#!/usr/bin/env python3
"""Q-426 (Zoe's homepage redesign brief, 2026-11-26): rebuild the
home hierarchy per the brief while keeping the GBA identity.
  A. Compact header: tagline + a search bar. The bar reuses the
     EXISTING keyword engine (msQuery + questMatchesQuery): on
     submit it sets msQuery and lands on the browse list, where
     the summary shows the quoted query and the sheet reset
     clears it. (No new search code.)
  B. Quick actions: same four, slimmer (padding/border/shadow
     down), each with a subtle tint; JA labels naturalised
     (無料イベント / 近くで探す).
  C. Seasonal shelf: 3-up grid -> horizontal scroll-snap
     carousel, cards 63% wide so the next one peeks; bigger
     16:10 images; the day chip rides on the photo.
  D. Recommendations: the Q-419 fold is retired per the brief —
     the section is always open, headed by title + すべて見る
     link; shuffle stays as a centred pill below the cards.
     homeRecOpen / homeRecAnchor / the toggle are removed.
  E. New エリアから探す section: six area tiles with live
     counts (Asakusa/Shibuya/Ikebukuro/Ueno/Shinjuku/Akihabara —
     Shimokitazawa from the brief has only 1 quest in the data,
     swapped for Akihabara). A tap sets the district filter +
     msQuery to the area and opens the browse list.
  F. Bottom nav: the centre tab's lemon outline softens
     (3px offset ring -> 2px flush ring); the My List count
     badge shrinks a step.
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

# ---------- STR ----------
rep('homeAll: "See all {N} quests",',
    'homeTagline: "Let\'s play Tokyo.", homeSearchGo: "Search", homeAreasTitle: "Browse by area", homeAreaUnit: " quests", homeAll: "See all {N} quests",')
rep('homeAll: "全{N}件のクエストを見る",',
    'homeTagline: "東京を、もっと遊ぼう。", homeSearchGo: "検索", homeAreasTitle: "エリアから探す", homeAreaUnit: "件", homeAll: "全{N}件のクエストを見る",')
rep('homeAll: "看全部 {N} 个任务",',
    'homeTagline: "把东京，玩尽兴。", homeSearchGo: "搜索", homeAreasTitle: "按区域找", homeAreaUnit: " 个", homeAll: "看全部 {N} 个任务",')
rep('quickFree: "Free only", quickNear: "Nearby area"', 'quickFree: "Free events", quickNear: "Search nearby"')
rep('quickFree: "無料だけ", quickNear: "近くのエリア"', 'quickFree: "無料イベント", quickNear: "近くで探す"')
rep('quickFree: "只看免费", quickNear: "附近区域"', 'quickFree: "免费活动", quickNear: "找附近"')

# ---------- robustness: three batch-600 events (c249/c253/c263)
# carry mood as a comma STRING, not an array; (e.mood||[]).join /
# .forEach throws on them. That path was unreachable while no UI
# set a keyword query — the new search bar exercises it, and a
# mood-chip filter would hit it too. Normalise in one helper.
rep('''      function evBuckets(e) {
        var out = [];
        (e.mood || []).forEach(function (m) { var b = MOOD_BUCKET_OF[m]; if (b && out.indexOf(b) === -1) out.push(b); });
        return out;
      }''',
    '''      function moodList(e) { return Array.isArray(e.mood) ? e.mood : String(e.mood || "").split(/,\\s*/).filter(Boolean); }
      function evBuckets(e) {
        var out = [];
        moodList(e).forEach(function (m) { var b = MOOD_BUCKET_OF[m]; if (b && out.indexOf(b) === -1) out.push(b); });
        return out;
      }''')
rep('''          (e.mood || []).join(" "), evBuckets(e).map(moodBucketLabel).join(" ")]''',
    '''          moodList(e).join(" "), evBuckets(e).map(moodBucketLabel).join(" ")]''')

# ---------- markup: header + rec head + areas ----------
rep('''        <div class="home-panel">
          <div class="home-quick" id="homeQuick">''',
    '''        <div class="home-panel">
          <div class="home-head">
            <div class="home-tagline" id="homeTagline"></div>
            <form class="home-search" id="homeSearchForm" role="search"><span class="hsearch-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#22303c" stroke-width="2.4"/><path d="M15.5 15.5 L21 21" stroke="#22303c" stroke-width="2.4" stroke-linecap="round"/></svg></span><input id="homeSearchInput" type="search" autocomplete="off" enterkeyhint="search"><button class="hsearch-go" id="homeSearchGo" type="submit"></button></form>
          </div>
          <div class="home-quick" id="homeQuick">''')
rep('''          <button class="home-rec-toggle" id="homeRecToggle" type="button" aria-expanded="false"><span id="homeRecTitle"></span><span class="hrt-chev" aria-hidden="true">▼</span></button>
          <div class="home-rec-body" id="homeRecBody" hidden>
          <div class="home-rec-list" id="homeRecList"></div>
          <div class="home-rec-foot"><button class="home-shuffle" id="homeShuffle" type="button"></button><button class="home-all" id="homeAll" type="button"></button></div></div>''',
    '''          <div class="home-rec-head"><span class="home-rec-title" id="homeRecTitle"></span><button class="home-all" id="homeAll" type="button"></button></div>
          <div class="home-rec-list" id="homeRecList"></div>
          <div class="home-rec-foot"><button class="home-shuffle" id="homeShuffle" type="button"></button></div>
          <div class="home-areas" id="homeAreas"><div class="ha-title" id="homeAreasTitle"></div><div class="ha-row" id="homeAreasRow"></div></div>''')

# ---------- renderShelf: chip rides on the photo ----------
rep('''return '<div class="hs-card" data-shelf-open="' + e.id + '"><img class="hs-img" src="' + e.img + '" alt="" loading="lazy"><span class="hs-name">' + esc(evName(e)) + '</span><span class="hs-chip">' + esc(chip) + "</span></div>";''',
    '''return '<div class="hs-card" data-shelf-open="' + e.id + '"><span class="hs-media"><img class="hs-img" src="' + e.img + '" alt="" loading="lazy"><span class="hs-chip">' + esc(chip) + '</span></span><span class="hs-name">' + esc(evName(e)) + "</span></div>";''')

# ---------- areas renderer (inserted before renderHome) ----------
rep('''      function renderHome() {''',
    '''      var HOME_AREAS = ["Asakusa", "Shibuya", "Ikebukuro", "Ueno", "Shinjuku", "Akihabara"];
      function renderAreas() {
        var row = document.getElementById("homeAreasRow");
        if (!row) return;
        var t = L();
        document.getElementById("homeAreasTitle").textContent = t.homeAreasTitle;
        row.innerHTML = HOME_AREAS.map(function (a) {
          var n = EVENTS.filter(function (e) { return e.area === a && !isCleared(e.id); }).length;
          var label = state.lang === "ja" ? (AREA_JA[a] || a) : state.lang === "zh" ? (AREA_ZH[a] || a) : a;
          return '<button class="ha-tile" type="button" data-area-tile="' + a + '"><span class="ha-name">' + esc(label) + '</span><span class="ha-count">' + n + esc(t.homeAreaUnit) + "</span></button>";
        }).join("");
      }
      function renderHome() {''')

# ---------- renderHome: paint the new chrome, drop the fold state ----------
rep('''        renderShelf();
        document.getElementById("homeRecTitle").textContent = t.homeRecTitle;
        document.getElementById("homeShuffle").textContent = t.homeShuffle;
        var rtb = document.getElementById("homeRecBody");
        if (rtb) rtb.hidden = !homeRecOpen;
        var rtt = document.getElementById("homeRecToggle");
        if (rtt) { rtt.classList.toggle("is-on", homeRecOpen); rtt.setAttribute("aria-expanded", String(homeRecOpen)); }''',
    '''        renderShelf();
        renderAreas();
        document.getElementById("homeTagline").textContent = t.homeTagline;
        document.getElementById("homeSearchInput").placeholder = t.searchPh;
        document.getElementById("homeSearchGo").textContent = t.homeSearchGo;
        document.getElementById("homeRecTitle").textContent = t.homeRecTitle;
        document.getElementById("homeShuffle").textContent = t.homeShuffle;''')

# ---------- quick handler + fold machinery removal ----------
rep('''        homeQuick = homeQuick === k ? null : k;
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
      }
      document.getElementById("homeRecToggle").addEventListener("click", function () {
        homeRecOpen = !homeRecOpen;
        sfx(homeRecOpen ? "open" : "back");
        renderHome();
        if (homeRecOpen) {
          var rb = document.getElementById("homeRecBody");
          if (rb) { rb.classList.remove("pop"); void rb.offsetWidth; rb.classList.add("pop"); }
          homeRecAnchor();
        }
      });''',
    '''        homeQuick = homeQuick === k ? null : k;
        homePage = 0;
        sfx("move");
        renderHome();
      });
      document.getElementById("homeAreasRow").addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-area-tile]");
        if (!b) return;
        var a = b.getAttribute("data-area-tile");
        filterArea = DISTRICT_OF[a] || "All";
        msQuery = a;
        sfx("accept");
        switchView("list");
      });
      document.getElementById("homeSearchForm").addEventListener("submit", function (ev) {
        ev.preventDefault();
        msQuery = document.getElementById("homeSearchInput").value.trim();
        sfx("accept");
        switchView("list");
      });''')
rep('''      var homeRecOpen = false;
''', '')

# ---------- CSS ----------
css = '''
/* Q-426: homepage redesign (brief 2026-11-26) */
.home-head { display: flex; flex-direction: column; gap: 8px; }
.home-tagline { font-size: 19px; font-weight: 800; color: #22303c; padding: 2px 2px 0; }
.home-search { display: flex; align-items: center; gap: 8px; margin: 0; background: #fffdf4; border: 2px solid #22303c; border-radius: 999px; padding: 5px 6px 5px 13px; box-shadow: 0 2px 0 rgba(20, 24, 60, 0.14); }
.home-search .hsearch-ico { display: inline-flex; flex: 0 0 auto; }
.home-search .hsearch-ico svg { width: 17px; height: 17px; display: block; }
.home-search input { flex: 1; min-width: 0; border: none; background: none; font: inherit; font-size: 14.5px; font-weight: 700; color: #22303c; outline: none; padding: 4px 0; }
.home-search input::placeholder { color: rgba(34, 48, 60, 0.45); font-weight: 700; }
.hsearch-go { flex: 0 0 auto; border: 2px solid #22303c; background: var(--primary); color: #fff; font: inherit; font-weight: 800; font-size: 13px; border-radius: 999px; padding: 5px 14px; cursor: pointer; }
#view-home .hq-btn { padding: 9px 11px; border-width: 2px; font-size: 13.5px; box-shadow: 0 1px 0 rgba(20, 24, 60, 0.16); gap: 8px; }
#view-home .hq-btn[data-hq="ending"] { background: #ffe9e2; }
#view-home .hq-btn[data-hq="free"] { background: #e6f1ff; }
#view-home .hq-btn[data-hq="near"] { background: #fff3cf; }
#view-home .hq-btn[data-hq="random"] { background: #efeaff; }
#view-home .hq-btn.is-on { background: #ffd83d; }
#view-home .hs-row { display: flex; grid-template-columns: none; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
#view-home .hs-row::-webkit-scrollbar { display: none; }
#view-home .hs-card { flex: 0 0 63%; scroll-snap-align: start; }
#view-home .hs-media { position: relative; display: block; }
#view-home .hs-img { aspect-ratio: 16 / 10; }
#view-home .hs-chip { position: absolute; left: 6px; bottom: 6px; box-shadow: 0 1px 0 rgba(20, 24, 60, 0.25); }
.home-rec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 2px 0; }
.home-rec-title { font-size: 16.5px; font-weight: 800; color: #22303c; white-space: nowrap; }
#view-home .home-all { align-self: auto; font-size: 12.5px; white-space: nowrap; padding: 4px 2px; }
#view-home .home-rec-foot { display: flex; justify-content: center; }
#view-home .home-shuffle { margin-left: 0; padding: 8px 22px; font-size: 13.5px; border: 2.5px solid var(--line-c); background: #fffdf4; box-shadow: 0 2px 0 rgba(20, 24, 60, 0.16); }
.home-areas { display: flex; flex-direction: column; gap: 8px; }
.ha-title { font-size: 16.5px; font-weight: 800; color: #22303c; padding: 2px 2px 0; }
.ha-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.ha-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 9px 11px; background: #fffdf4; border: 2px solid #22303c; border-radius: 12px; font: inherit; cursor: pointer; box-shadow: 0 1px 0 rgba(20, 24, 60, 0.14); text-align: left; }
.ha-name { font-weight: 800; font-size: 14.5px; color: #22303c; }
.ha-count { font-size: 11.5px; font-weight: 700; color: rgba(34, 48, 60, 0.55); }
.tabs .tab-start[aria-selected="true"] { outline: 2px solid var(--highlight); outline-offset: 0; }
.tab .count { font-size: 10.5px; padding: 1px 6px; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q426-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q426 BUILD OK', tok)
