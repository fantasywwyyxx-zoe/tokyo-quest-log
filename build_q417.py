#!/usr/bin/env python3
"""Q-417 (Zoe, 2026-11-24): home, streamlined. She approved the
mock ("可以试试看") with two cuts: the top filter bar "好像用不到"
and "尽量精简画面". So: the home filter bar and the separate
surprise button leave; in their place a 2x2 quick-pick grid
(ending soon / free only / nearby / random) and the seasonal
shelf (placement A, as decided) above the recommendations.
Quick picks are the home's only filter now — homePool no longer
reads the browse sheet's filter globals (they stay the browse
view's own). Random replaces the old surprise button exactly.
Nearby reuses the sort position (sortPos), requested on tap
only, never stored — the check-in privacy rule."""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
assert 'function showCoinMsg(' in src
assert 'sortPos = null' in src

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

# ---------- STR additions (3 dicts) ----------
rep('''homeSurprise: "No idea? Tap here - surprise me",''',
    '''homeSurprise: "No idea? Tap here - surprise me", quickEnding: "Ending soon", quickFree: "Free only", quickNear: "Nearby area", quickRandom: "Surprise me", shelfTitle: "Seasonal picks", shelfDays: "{D}d left", shelfToday: "Last day", seasonSpring: "Spring in Tokyo", seasonSummer: "Summer in Tokyo", seasonAutumn: "Autumn in Tokyo", seasonWinter: "Winter in Tokyo",''')
rep('''homeSurprise: "迷ったらタップ。おまかせで1つ",''',
    '''homeSurprise: "迷ったらタップ。おまかせで1つ", quickEnding: "もうすぐ終了", quickFree: "無料だけ", quickNear: "近くのエリア", quickRandom: "おまかせ", shelfTitle: "季節の特集", shelfDays: "あと{D}日", shelfToday: "最終日", seasonSpring: "春の東京", seasonSummer: "夏の東京", seasonAutumn: "秋の東京", seasonWinter: "冬の東京",''')
rep('''homeSurprise: "不知道去哪？点这里，随便给我一个",''',
    '''homeSurprise: "不知道去哪？点这里，随便给我一个", quickEnding: "即将结束", quickFree: "只看免费", quickNear: "附近区域", quickRandom: "随机一个", shelfTitle: "季节特集", shelfDays: "还剩{D}天", shelfToday: "最后一天", seasonSpring: "东京之春", seasonSummer: "东京之夏", seasonAutumn: "东京之秋", seasonWinter: "东京之冬",''')

# ---------- markup: filter bar out, quick grid + shelf in ----------
rep('''          <button class="home-filter" id="homeFilterBtn" type="button"><span class="hf-ico" id="homeFilterIco"></span><span class="hf-txt" id="homeFilterTxt"></span><span class="hf-go" aria-hidden="true">▶</span></button>''',
    '''          <div class="home-quick" id="homeQuick"><button class="hq-btn" type="button" data-hq="ending"><span class="hq-ico"></span><span class="hq-label"></span></button><button class="hq-btn" type="button" data-hq="free"><span class="hq-ico"></span><span class="hq-label"></span></button><button class="hq-btn" type="button" data-hq="near"><span class="hq-ico"></span><span class="hq-label"></span></button><button class="hq-btn" type="button" data-hq="random"><span class="hq-ico"></span><span class="hq-label"></span></button></div>
          <div class="home-shelf" id="homeShelf" hidden><div class="hs-head"><span id="hsTitle"></span><span class="hs-season" id="hsSeason"></span></div><div class="hs-row" id="hsRow"></div></div>''')
rep('''          <button class="home-surprise" id="homeSurprise" type="button"></button>
''', '')

# ---------- homePool: decoupled from the sheet + quick modes ----------
rep('''        var savedState = filterState;
        filterState = "all";
        var pool = EVENTS.filter(function (e) {
          if (isCleared(e.id) || isSaved(e.id)) return false;
          return boardMatch(e, filterArea, filterMood, "");
        });
        filterState = savedState;''',
    '''        /* Q-417: the home answers to its quick picks alone —
           every shared filter global is neutralized for the
           duration of this call (the browse views keep theirs). */
        var savedState = filterState, savedKind = filterKind, savedCat = filterCat, savedFree = filterFree;
        filterState = "all"; filterKind = "all"; filterCat = "All"; filterFree = false;
        var pool = EVENTS.filter(function (e) {
          if (isCleared(e.id) || isSaved(e.id)) return false;
          return boardMatch(e, "All", "", "");
        });
        filterState = savedState; filterKind = savedKind; filterCat = savedCat; filterFree = savedFree;''')
rep('''          return a.id < b.id ? -1 : 1;
        });
        return pool;
      }''',
    '''          return a.id < b.id ? -1 : 1;
        });
        if (homeQuick === "ending") {
          pool = pool.filter(function (e) {
            if (e.evergreen || !e.end) return false;
            var d = daysBetween(TODAY, e.end);
            return d >= 0 && d <= 7;
          });
          pool.sort(function (a, b) { return a.end < b.end ? -1 : a.end > b.end ? 1 : 0; });
        } else if (homeQuick === "free") {
          pool = pool.filter(function (e) { return !!e.free; });
        } else if (homeQuick === "near") {
          pool = pool.filter(function (e) { return questDistM(e) != null; });
          pool.sort(function (a, b) { return questDistM(a) - questDistM(b); });
        }
        return pool;
      }''')
rep('''      var homePage = 0;''',
    '''      var homePage = 0;
      var homeQuick = null;''')

# ---------- shelf + geo helpers, before renderHome ----------
rep('''      function renderHome() {''',
    '''      /* Q-417: the seasonal shelf — the three soonest-ending
         timed quests (within a fortnight), straight off the
         catalog; hidden when nothing is ending. */
      function shelfEvents() {
        return EVENTS.filter(function (e) {
          if (e.evergreen || !e.end || isCleared(e.id)) return false;
          var d = daysBetween(TODAY, e.end);
          return d >= 0 && d <= 14;
        }).sort(function (a, b) { return a.end < b.end ? -1 : a.end > b.end ? 1 : 0; }).slice(0, 3);
      }
      function renderShelf() {
        var box = document.getElementById("homeShelf");
        if (!box) return;
        var t = L();
        var evs = shelfEvents();
        if (!evs.length) { box.hidden = true; return; }
        box.hidden = false;
        document.getElementById("hsTitle").textContent = t.shelfTitle;
        var mo = Number(TODAY.slice(5, 7));
        document.getElementById("hsSeason").textContent = (mo === 12 || mo <= 2) ? t.seasonWinter : mo <= 5 ? t.seasonSpring : mo <= 8 ? t.seasonSummer : t.seasonAutumn;
        document.getElementById("hsRow").innerHTML = evs.map(function (e) {
          var d = daysBetween(TODAY, e.end);
          var chip = d === 0 ? t.shelfToday : t.shelfDays.replace("{D}", String(d));
          return '<div class="hs-card" data-shelf-open="' + e.id + '"><img class="hs-img" src="' + e.img + '" alt="" loading="lazy"><span class="hs-name">' + esc(evName(e)) + '</span><span class="hs-chip">' + esc(chip) + "</span></div>";
        }).join("");
      }
      /* Nearby quick pick: position is requested only on this
         tap and kept in memory as sortPos (never saved) — the
         same privacy shape as the list's nearest sort. */
      function homeRequestPos() {
        var t = L();
        if (!navigator.geolocation) { showCoinMsg(t.sortNoGeo); sfx("back"); return; }
        navigator.geolocation.getCurrentPosition(function (pos) {
          sortPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          homeQuick = "near"; homePage = 0; sfx("accept"); renderHome();
        }, function (err) {
          showCoinMsg(err && err.code === 1 ? t.sortDenied : t.sortFailed); sfx("back");
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      }
      function renderHome() {''')

# ---------- renderHome: paint quick + shelf, drop filter/surprise paints ----------
rep('''        document.getElementById("homeFilterIco").innerHTML = ICONS.funnel;
        var fparts = [];
        if (filterKind !== "all") fparts.push(filterKind === "ever" ? t.legendEver : filterKind === "epic" ? "EPIC" : t.legendTimed);
        if (filterCat !== "All") fparts.push(filterCat);
        if (filterArea !== "All") fparts.push(districtLabel(filterArea));
        if (filterMood) fparts.push(moodBucketLabel(filterMood));
        if (filterFree) fparts.push(t.freeOnly);
        document.getElementById("homeFilterTxt").textContent = fparts.length ? fparts.join(" · ") : t.homeFilterAll;''',
    '''        var hqLabels = { ending: t.quickEnding, free: t.quickFree, near: t.quickNear, random: t.quickRandom };
        var hqIcons = { ending: ICONS.cal, free: ICONS.tag, near: ICONS.pin, random: ICONS.dice };
        document.querySelectorAll("#homeQuick [data-hq]").forEach(function (b) {
          var k = b.getAttribute("data-hq");
          b.querySelector(".hq-ico").innerHTML = hqIcons[k];
          b.querySelector(".hq-label").textContent = hqLabels[k];
          b.classList.toggle("is-on", homeQuick === k);
          b.setAttribute("aria-pressed", String(homeQuick === k));
        });
        renderShelf();''')
rep('''        document.getElementById("homeSurprise").textContent = t.homeSurprise;
''', '')

# ---------- wiring: filter-bar listener out, quick + shelf listeners in ----------
rep('''      document.getElementById("homeFilterBtn").addEventListener("click", function () {
        sfx("open");
        var m = document.getElementById("searchModal");
        m.classList.add("from-home");
        if (typeof m.showModal === "function") m.showModal();
        else m.setAttribute("open", "");
      });''',
    '''      document.getElementById("homeQuick").addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-hq]");
        if (!b) return;
        var k = b.getAttribute("data-hq");
        if (k === "random") {
          sfx("open");
          var pool = homePool();
          if (!pool.length) pool = EVENTS.filter(function (e) { return !isCleared(e.id) && !isSaved(e.id); });
          if (!pool.length) return;
          var e = pool[Math.floor(Math.random() * Math.min(pool.length, 12))];
          openDetail(e.id);
          return;
        }
        if (k === "near" && !sortPos) { homeRequestPos(); return; }
        homeQuick = homeQuick === k ? null : k;
        homePage = 0;
        sfx("move");
        renderHome();
      });
      document.getElementById("hsRow").addEventListener("click", function (ev) {
        var c = ev.target.closest("[data-shelf-open]");
        if (c) openDetail(c.getAttribute("data-shelf-open"));
      });''')
rep('''      document.getElementById("homeSurprise").addEventListener("click", function () {
        var pool = homePool();
        if (!pool.length) pool = EVENTS.filter(function (e) { return !isCleared(e.id) && !isSaved(e.id); });
        if (!pool.length) return;
        var e = pool[Math.floor(Math.random() * Math.min(pool.length, 12))];
        openDetail(e.id);
      });
''', '')

# ---------- CSS (last style element, ID-scoped to win) ----------
css = '''
/* Q-417: home quick picks + seasonal shelf */
#view-home .home-quick { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
#view-home .hq-btn { display: flex; align-items: center; gap: 9px; padding: 12px 13px; border: 2.5px solid #22303c; border-radius: 12px; background: #fffdf4; color: #22303c; font: inherit; font-weight: 800; font-size: 14.5px; text-align: left; cursor: pointer; box-shadow: 0 2px 0 rgba(20, 24, 60, 0.18); }
#view-home .hq-btn .hq-ico { flex: none; width: 20px; height: 20px; display: inline-flex; }
#view-home .hq-btn .hq-ico svg { width: 20px; height: 20px; }
#view-home .hq-btn.is-on { background: #ffd83d; }
#view-home .home-shelf { border: 2.5px solid #22303c; border-radius: 14px; background: #fff6dd; overflow: hidden; }
#view-home .hs-head { display: flex; align-items: baseline; justify-content: space-between; padding: 8px 13px; background: #ffd83d; color: #22303c; font-weight: 800; font-size: 16px; }
#view-home .hs-season { font-size: 12.5px; }
#view-home .hs-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 10px; }
#view-home .hs-card { display: flex; flex-direction: column; gap: 5px; cursor: pointer; min-width: 0; }
#view-home .hs-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 2px solid #22303c; border-radius: 9px; }
#view-home .hs-name { font-size: 11.5px; font-weight: 800; line-height: 1.3; color: #22303c; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
#view-home .hs-chip { align-self: flex-start; background: #e5484d; color: #ffffff; font-size: 10.5px; font-weight: 800; border-radius: 999px; padding: 2px 8px; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

# ---------- token ----------
prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q417-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q417 BUILD OK', tok)
