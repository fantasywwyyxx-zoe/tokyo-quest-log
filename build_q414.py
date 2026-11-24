#!/usr/bin/env python3
"""Q-414 (Zoe, 2026-11-24): merge MAP + LIST into ONE browse view.

Approved logic (mock v3, Airbnb/SUUMO pattern — one condition
system, one header, views carry no filters of their own):
- ONE fixed browse bar (#browseBar) shown in both browse modes:
  funnel + shared filter summary (the #searchSummary span moves
  here) + [map|list] mode toggle.
- ONE filter system: mapFilterMatch now runs boardMatch with the
  shared filter vars, so pins and list rows always agree. The
  map's own sheet/FAB/legend retire; the list's kind segs, saved
  chip and search button retire; the list keeps only its sort row.
- The bottom bar loses the LIST tab (back to five slots); tab-map
  reads selected in both browse modes.
- homeFilterDone (the shared sheet's close hook) now also
  re-renders whichever browse mode is up.
"""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
orig = src

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

def cut_span(start_marker, end_after, must_contain, must_not_contain, label):
    """Remove src[start of start_marker .. end of end_after]."""
    global src
    i0 = src.find(start_marker)
    assert i0 >= 0, label + ': start not found'
    i1 = src.find(end_after, i0)
    assert i1 >= 0, label + ': end not found'
    i1 += len(end_after)
    span = src[i0:i1]
    for m in must_contain:
        assert m in span, label + ': span missing ' + m
    for m in must_not_contain:
        assert m not in span, label + ': span wrongly contains ' + m
    src = src[:i0] + src[i1:]
    return span

def div_end(start_idx):
    """Index just past the </div> closing the <div> at start_idx
    (string-aware enough for this markup: no <div inside strings
    or comments in the mf sheet block — verified by assertions)."""
    depth = 0
    i = start_idx
    while True:
        nxt_open = src.find('<div', i)
        nxt_close = src.find('</div>', i)
        assert nxt_close >= 0, 'div scanner ran off the file'
        if nxt_open >= 0 and nxt_open < nxt_close:
            depth += 1
            i = nxt_open + 4
        else:
            depth -= 1
            i = nxt_close + 6
            if depth == 0:
                return i

# ---------- M1: bottom bar loses the LIST tab ----------
rep('        <button class="tab" id="tab-list" role="tab" aria-selected="false" data-view="list" type="button"></button>\n', '')

# ---------- M2: list view is labelled by the browse tab now ----------
rep('<section id="view-list" role="tabpanel" aria-labelledby="tab-list" hidden data-seg="index">',
    '<section id="view-list" role="tabpanel" aria-labelledby="tab-map" hidden data-seg="index">')

# ---------- M3: list header -> one slim sort row ----------
i0 = src.find('<div class="list-bar">')
assert i0 >= 0
i1 = src.find('<p class="sort-msg"', i0)
assert i1 > i0
span = src[i0:i1]
for m in ('searchSummary', 'searchOpenBtn', 'data-kindmode', 'acceptedChip', 'sortBtn'):
    assert m in span, 'M3 span missing ' + m
src = src[:i0] + ('<div class="list-sortrow">\n'
                  '          <button class="sort-btn" type="button" id="sortBtn"><span id="sortBtnLabel"></span><span class="sort-tri" aria-hidden="true"></span></button>\n'
                  '        </div>\n        ') + src[i1:]

# ---------- M4: map filter FAB retires ----------
i0 = src.find('<button class="mf-fab" id="mfFilterBtn"')
assert i0 >= 0
i1 = src.find('</button>', i0) + len('</button>')
span = src[i0:i1]
assert 'mfBadge' in span
src = src[:i0] + src[i1:]

# ---------- M5: map filter scrim + sheet retire ----------
i0 = src.find('<div class="mf-scrim" id="mfScrim"')
assert i0 >= 0
i_sheet = src.find('<div class="mf-sheet" id="mfFilterSheet"', i0)
assert i_sheet > i0
i1 = div_end(i_sheet)
span = src[i0:i1]
for m in ('mfSheetChips', 'mfSheetStates', 'mfSheetMoods', 'mfSheetAreas'):
    assert m in span, 'M5 span missing ' + m
for m in ('mapLegend', 'mapZoom', 'id="view-list"'):
    assert m not in span, 'M5 span wrongly contains ' + m
src = src[:i0] + src[i1:]

# ---------- M6: map legend chip retires (dots explained in the sheet) ----------
i0 = src.find('<div class="map-legend" id="mapLegend"')
assert i0 >= 0
i1 = src.find('</div>', i0) + len('</div>')
src = src[:i0] + src[i1:]

# ---------- M7: the browse bar markup (hosts #searchSummary now) ----------
BAR = '''      <!-- Q-414 (Zoe, 2026-11-24): ONE browse bar for the merged
           map/list view — funnel + the shared filter summary +
           the mode toggle. Shown only in the two browse modes. -->
      <div class="browse-bar" id="browseBar" hidden>
        <button class="browse-filter-btn" id="browseFilterBtn" type="button" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v3l-5.5 6v5.5L9.5 21v-8L4 7z" fill="#2e7fb8" stroke="#22303c" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="search-summary" id="searchSummary"></span></button>
        <span class="browse-toggle" role="group" aria-label="View"><button id="browseModeMap" type="button" aria-pressed="false"></button><button id="browseModeList" type="button" aria-pressed="false"></button></span>
      </div>
'''
rep('      <nav class="tabs" role="tablist" aria-label="Views">', BAR + '      <nav class="tabs" role="tablist" aria-label="Views">')

# ---------- J1: switchView — guard the gone tab, browse tab covers both modes, sync the bar ----------
rep('          document.getElementById("tab-" + v).setAttribute("aria-selected", String(v === name));',
    '          var tb = document.getElementById("tab-" + v); if (tb) tb.setAttribute("aria-selected", String(v === name || (v === "map" && name === "list")));')
rep('        document.body.setAttribute("data-view", name);',
    '        document.body.setAttribute("data-view", name);\n        syncBrowseBar(name);')

# ---------- J2: updateLogTab — the LIST tab is gone; its count lives on tab-mine ----------
rep('''      function updateLogTab() {
        var n = (state.saved || []).filter(function (id) { return !isCleared(id) && byId(id); }).length;
        document.getElementById("tab-list").innerHTML = ICONS.scroll + "<span>" + L().tabList + "</span>" +
          (n > 0 ? '<span class="count">' + n + "</span>" : "");
      }''',
    '''      function updateLogTab() {
        /* Q-414: the LIST tab retired with the browse merge — the
           saved count lives on the MY LIST tab badge alone now. */
        return;
      }''')

# ---------- J3: ONE filter predicate for pins and rows ----------
rep('''      function mapFilterMatch(e) {
        if (!mapFilterMatchAs(e, mapFilter)) return false;
        if (mapState === "accepted" && !(isSaved(e.id) && !isCleared(e.id))) return false;
        if (mapState === "cleared" && !isCleared(e.id)) return false;
        if (mapMood && mapFilter !== "legend" && evBuckets(e).indexOf(mapMood) === -1) return false;
        if (mapArea && mapFilter !== "legend" && districtOf(e) !== mapArea) return false;
        return true;
      }''',
    '''      function mapFilterMatch(e) {
        /* Q-414 (Zoe, 2026-11-24): ONE filter logic — the map runs
           the shared board predicate, so pins and list rows can
           never disagree. The map's own filter vars/sheet retired. */
        return boardMatch(e, filterArea, filterMood, "");
      }''')
rep('''      function mapShownCount() {
        if (mapFilter === "legend") return LEGENDS.length;
        return VISIBLE.filter(mapFilterMatch).length;
      }''',
    '''      function mapShownCount() {
        return VISIBLE.filter(mapFilterMatch).length;
      }''')

# ---------- J4: renderStaticText — the old search button is gone; sync the bar instead ----------
rep('        document.getElementById("searchOpenBtn").innerHTML = "🔍 " + esc(t.searchBtn);',
    '        syncBrowseBar();')

# ---------- J5: the sheet now opens from the browse bar's filter button ----------
rep('''      var searchModal = document.getElementById("searchModal");
      document.getElementById("searchOpenBtn").addEventListener("click", function () {''',
    '''      var searchModal = document.getElementById("searchModal");
      document.getElementById("browseFilterBtn").addEventListener("click", function () {''')

# ---------- J6: keyboard/focus fallback for the list view ----------
rep('fb: "#searchOpenBtn"', 'fb: "#browseFilterBtn"')

# ---------- J7: guard the retired mf sheet wiring (elements are gone) ----------
for mid in ('mfFilterBtn', 'mfSheetClose', 'mfScrim', 'mfSheetChips', 'mfSheetStates', 'mfSheetAreas', 'mfSheetMoods'):
    rep('document.getElementById("%s").addEventListener(' % mid,
        'var _mfW = document.getElementById("%s"); if (_mfW) _mfW.addEventListener(' % mid)

# ---------- J8: closing the shared sheet re-renders the browse mode in use ----------
rep('''        var v = document.getElementById("view-home");
        if (v && !v.hidden) { homePage = 0; renderHome(); }
      }''',
    '''        var v = document.getElementById("view-home");
        if (v && !v.hidden) { homePage = 0; renderHome(); }
        /* Q-414: the same sheet serves the browse views — closing
           it re-renders whichever browse mode is up, then the bar */
        var vm = document.getElementById("view-map");
        if (vm && !vm.hidden) renderMap();
        var vl = document.getElementById("view-list");
        if (vl && !vl.hidden) renderSearch();
        syncBrowseBar();
      }''')

# ---------- J9: syncBrowseBar + toggle wiring ----------
rep('      function switchView(name) {',
    '''      /* ============ Q-414: the merged browse bar ============
         Map and list are ONE browse view with two renderings:
         one header (filter summary + mode toggle), one filter
         sheet, one result set. The bar exists only in browse. */
      function syncBrowseBar(viewName) {
        var bar = document.getElementById("browseBar");
        if (!bar) return;
        var v = viewName || document.body.getAttribute("data-view");
        var on = v === "map" || v === "list";
        bar.hidden = !on;
        if (!on) return;
        var t = L();
        var bm = document.getElementById("browseModeMap");
        if (bm) { bm.textContent = t.tabMap; bm.classList.toggle("is-on", v === "map"); bm.setAttribute("aria-pressed", String(v === "map")); }
        var bl = document.getElementById("browseModeList");
        if (bl) { bl.textContent = t.tabList; bl.classList.toggle("is-on", v === "list"); bl.setAttribute("aria-pressed", String(v === "list")); }
      }
      function switchView(name) {''')
rep('''      document.getElementById("navGear").addEventListener("click", function () {
        document.getElementById("styleBtn").click();
      });''',
    '''      var bmm = document.getElementById("browseModeMap");
      if (bmm) bmm.addEventListener("click", function () { if (document.body.getAttribute("data-view") !== "map") { sfx("move"); switchView("map"); } });
      var bml = document.getElementById("browseModeList");
      if (bml) bml.addEventListener("click", function () { if (document.body.getAttribute("data-view") !== "list") { sfx("move"); switchView("list"); } });
      document.getElementById("navGear").addEventListener("click", function () {
        document.getElementById("styleBtn").click();
      });''')

# ---------- CSS: the bar + list clearance + sort row (LAST style element) ----------
CSS = '''
      /* ============ Q-414 browse bar (merged map/list) ============ */
      #browseBar { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 8px); left: 8px; right: 8px; z-index: 120; display: flex; align-items: center; gap: 8px; background: var(--paper); border: 3px solid var(--ink); border-radius: 16px; padding: 6px 8px; box-shadow: 0 3px 0 rgba(20, 26, 48, 0.35); }
      #browseBar[hidden] { display: none; }
      #browseFilterBtn { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 7px; background: none; border: none; padding: 6px 2px; font: inherit; font-weight: 800; color: var(--ink); cursor: pointer; text-align: left; }
      #browseFilterBtn svg { flex: none; width: 20px; height: 20px; }
      #browseFilterBtn .search-summary { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .browse-toggle { flex: none; display: flex; border: 3px solid var(--ink); border-radius: 12px; overflow: hidden; background: var(--paper); }
      .browse-toggle button { font: inherit; font-weight: 800; border: none; background: transparent; color: var(--ink); padding: 7px 13px; cursor: pointer; }
      .browse-toggle button.is-on { background: var(--primary); color: #fff; }
      .browse-toggle button + button { border-left: 3px solid var(--ink); }
      #view-list { padding-top: calc(env(safe-area-inset-top, 0px) + 68px); }
      .list-sortrow { display: flex; align-items: center; padding: 0 2px 8px; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + CSS + src[i:]

# ---------- token ----------
prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q414-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m, 'BUILD_ID not found'
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q414 BUILD OK', tok, 'delta', len(src) - len(orig))
