#!/usr/bin/env python3
"""Q-435: merged home feed + alignment pass + street-level
map default. Zoe approved the rev4 prototype 2026-11-28
(「就按这个建」) after her corrections: not thinness —
alignment and too-plain labels.
- Seasonal shelf + recommendations merge into ONE swipe
  feed: one heading (homeRecTitle), one See-all (feedAll),
  shelf cards carry a feedLimited label + day chip, rec
  cards a short reason chip; every card keeps a save button
  (photo corner, ICONS.bookmark) so home saving survives.
  Recs exclude shelf ids (no duplicates). Shuffle retired.
- Alignment/composed labels: quick chips get their icons
  back (icon+label centred as a group, fixed 36px height,
  content sized to the cell so nothing clips); feed head is
  one centred row with a fixed-height 30px See-all; the
  card meta is a flex row whose limited-time label is a
  bordered mini-tag on the same baseline as the area.
- Map: goHomeView zoom s = 8 — the app's street level
  (photo-pin NEAR band), per Zoe's device screenshot; the
  RESET button returns to the same view.
Ships together with Q-434 (font weights). Token bump."""
import subprocess

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
orig_len = len(src)

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

def cut(start_marker, end_marker):
    global src
    i = src.find(start_marker)
    assert i >= 0, 'cut start missing: ' + start_marker[:60]
    j = src.find(end_marker, i)
    assert j >= 0, 'cut end missing: ' + end_marker[:60]
    j += len(end_marker)
    src = src[:i] + src[j:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD']).decode().strip()
import datetime
jst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
PFX = ''.join(map(chr, [116, 113, 108, 45]))
token = '%s%s-q435-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# ---- STR keys for the feed chips (after homeRecTitle in each dict)
rep('homeRecTitle: "Picked for you",', 'homeRecTitle: "Picked for you", feedLimited: "Limited time", feedPick: "For you",')
rep('homeRecTitle: "あなたへのおすすめ",', 'homeRecTitle: "あなたへのおすすめ", feedLimited: "期間限定", feedPick: "おすすめ",')
rep('homeRecTitle: "为你推荐",', 'homeRecTitle: "为你推荐", feedLimited: "限时", feedPick: "为你推荐",')

# ---- 1. markup: shelf + rec head/list/foot -> one feed section
i = src.find('<div class="home-shelf" id="homeShelf"')
j = src.find('<div class="home-areas" id="homeAreas"')
assert 0 < i < j
slice_ = src[i:j]
assert 'homeRecList' in slice_ and 'homeShuffle' in slice_ and 'hsRow' in slice_
FEED = ('<section class="home-feed" id="homeFeed"><div class="feed-head"><span id="feedTitle"></span>'
        '<button class="hs-all" id="feedAll" type="button"></button></div>'
        '<div class="hs-row" id="feedRow"></div><div class="hs-dots" id="feedDots"></div></section>\n          ')
src = src[:i] + FEED + src[j:]

# ---- 2. renderHome: call renderFeed, drop removed-element paints
rep('        renderShelf();\n', '        renderFeed();\n')
rep('        document.getElementById("homeRecTitle").textContent = t.homeRecTitle;\n', '')
rep('        document.getElementById("homeShuffle").textContent = t.homeShuffle;\n', '')
rep('        document.getElementById("homeAll").textContent = t.homeAll.replace("{N}", String(EVENTS.length)) + " \\u2192";\n', '')
cut('        var pool = homePool();', 'esc(t.homeEmpty) + "</div>";')

# ---- 3. renderFeed implementation, before renderHome
FEED_JS = '''      function feedChipText(e, isShelf) {
        var t = L();
        if (!e.evergreen && e.end) {
          var de = daysBetween(TODAY, e.end);
          if (de === 0) return t.shelfToday;
          if (de > 0 && de <= 14) return t.shelfDays.replace("{D}", String(de));
        }
        if (isShelf) return t.feedLimited;
        if (e.free) return t.chipFree;
        return t.feedPick;
      }
      function feedCardHTML(e, isShelf) {
        var t = L();
        var meta = isShelf
          ? '<span class="feed-tag">' + esc(t.feedLimited) + "</span>" + esc(e.area)
          : esc(homeMeta(e));
        return '<article class="hs-card" data-feed-open="' + e.id + '"><div class="hs-media"><img class="hs-img" src="' + esc(e.img) + '" alt="" loading="lazy">'
          + '<span class="hs-chip">' + esc(feedChipText(e, isShelf)) + "</span>"
          + '<button class="feed-save' + (isSaved(e.id) ? " is-on" : "") + '" data-feed-save="' + e.id + '" aria-label="save">' + ICONS.bookmark + "</button></div>"
          + '<div class="hs-name">' + esc(evName(e)) + '</div><div class="hs-meta">' + meta + "</div></article>";
      }
      function renderFeed() {
        var t = L();
        var sec = document.getElementById("homeFeed");
        if (!sec) return;
        document.getElementById("feedTitle").textContent = t.homeRecTitle;
        document.getElementById("feedAll").textContent = t.homeAll.replace("{N}", String(EVENTS.length)) + " \\u2192";
        var cards = [];
        var shelfIds = {};
        shelfEvents().forEach(function (e) { shelfIds[e.id] = 1; cards.push(feedCardHTML(e, true)); });
        homePool().filter(function (e) { return !shelfIds[e.id]; }).slice(0, 3).forEach(function (e) { cards.push(feedCardHTML(e, false)); });
        var row = document.getElementById("feedRow");
        row.innerHTML = cards.join("");
        row.scrollLeft = 0;
        document.getElementById("feedDots").innerHTML = cards.length > 1
          ? cards.map(function (_, i) { return '<span class="hs-dot' + (i === 0 ? " is-on" : "") + '"></span>'; }).join("")
          : "";
        row.querySelectorAll(".hs-name").forEach(function (el) {
          el.style.fontSize = "11.5px";
          var guard = 0;
          while (el.scrollHeight > 30 && guard < 12) {
            var fs = parseFloat(el.style.fontSize) - 0.5;
            if (fs < 8.5) break;
            el.style.fontSize = fs + "px";
            guard++;
          }
        });
      }
'''
rep('      function renderHome() {', FEED_JS + '      function renderHome() {')

# ---- 4. wiring: shelf/rec listeners -> feed listeners
cut('      document.getElementById("hsAllBtn").addEventListener',
    'document.getElementById("homeAll").addEventListener("click", function () { switchView("list"); });')
cut('      document.getElementById("homeRecList").addEventListener',
    'if (card) openDetail(card.getAttribute("data-home-open"));\n      });')
FEED_WIRE = '''      document.getElementById("feedAll").addEventListener("click", function () { switchView("list"); });
      document.getElementById("feedRow").addEventListener("scroll", function () {
        var row = this;
        var card = row.querySelector(".hs-card");
        if (!card) return;
        var idx = Math.round(row.scrollLeft / (card.offsetWidth + 10));
        document.querySelectorAll("#feedDots .hs-dot").forEach(function (d, i) { d.classList.toggle("is-on", i === idx); });
      }, { passive: true });
      document.getElementById("feedRow").addEventListener("click", function (ev) {
        var sv = ev.target.closest("[data-feed-save]");
        if (sv) { saveFlow(sv.getAttribute("data-feed-save"), function () { renderFeed(); }); return; }
        var c = ev.target.closest("[data-feed-open]");
        if (c) openDetail(c.getAttribute("data-feed-open"));
      });
'''
rep('      document.getElementById("homeQuick").addEventListener("click", function (ev) {',
    FEED_WIRE + '      document.getElementById("homeQuick").addEventListener("click", function (ev) {')

# ---- 5. map default zoom: street level
rep('        s = Math.min(2.9, Math.max(1, s) * 2);', '        s = 8;')

# ---- 6. CSS (consolidated final values from proto rev2-4)
CSS = '''
/* Q-435: merged home feed + alignment pass. One heading,
   one See-all; chips carry icons again, composed as a
   centred group in fixed-height cells sized to fit. */
.home-feed { display: flex; flex-direction: column; gap: 8px; }
.feed-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 15px; font-weight: 700; padding: 2px 2px 0; }
#view-home #feedAll { height: 30px; padding: 0 12px; font-size: 12px; display: inline-flex; align-items: center; }
#feedRow { padding: 2px 10px 4px; }
#view-home .hs-meta { display: flex; align-items: center; }
.feed-tag { display: inline-block; border: 1px solid rgba(226, 72, 58, .55); color: var(--primary); border-radius: 5px; padding: 0 5px; font-size: 10px; font-weight: 700; line-height: 16px; letter-spacing: .04em; margin-right: 6px; }
.feed-save { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(34, 48, 60, .25); background: var(--paper); box-shadow: 0 1px 4px rgba(34, 48, 60, .18); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.feed-save svg { width: 16px; height: 16px; }
.feed-save.is-on { background: var(--lemon); border-color: rgba(34, 48, 60, .4); }
#view-home #homeQuick .hq-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 36px; padding: 0 2px; font-size: 11px; letter-spacing: 0; overflow: hidden; }
#view-home #homeQuick .hq-btn .hq-label { white-space: nowrap; line-height: 1; }
#view-home #homeQuick .hq-btn .hq-ico { display: inline-flex; align-items: center; width: 13px; height: 13px; }
#view-home #homeQuick .hq-btn .hq-ico svg { width: 13px; height: 13px; }
'''
k = src.rfind('</style>')
assert k > 0
src = src[:k] + CSS + src[k:]

assert src.count('id="homeFeed"') == 1 and 'id="homeShelf"' not in src and 'id="homeRecList"' not in src
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q435 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
