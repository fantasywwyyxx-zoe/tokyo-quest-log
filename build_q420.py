#!/usr/bin/env python3
"""Q-420 (Zoe, 2026-11-25): three device rulings in one pass.
1) Detail save: the 保存済み pill in the head AND the wide save
   button in the action grid both go — save becomes ONE icon
   FAB beside the share FAB on the photo (bookmark; lemon when
   saved). stateBadgeOnly keeps only the CLEAR badge.
2) Home fold: the lone 別の3件 chip floated on its own row
   (an orphaned control row — her layout-discipline rule);
   it moves BELOW the cards, paired with See-all in one foot
   row of twin buttons.
3) My List: the 行きたい section head labels the only section
   there is — "这个也是没用" — removed with its paint.
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

# ---------- 1a: save FAB beside the share FAB ----------
rep('''"</span>" + '<button class="poster-fab" id="btnPoster"''',
    '''"</span>" + '<button class="poster-fab save-fab" id="btnSaveFab" type="button" aria-label="' + esc(t.mineSave) + '">' + ICONS.bookmark + '</button>' + '<button class="poster-fab" id="btnPoster"''')
rep('''          var _fb = dp.querySelector("#btnPoster");
          if (_fb) _fb.addEventListener("click", function (ev) { ev.stopPropagation(); sfx("accept"); shareQuestPoster(); });''',
    '''          var _fb = dp.querySelector("#btnPoster");
          if (_fb) _fb.addEventListener("click", function (ev) { ev.stopPropagation(); sfx("accept"); shareQuestPoster(); });
          var _sb = dp.querySelector("#btnSaveFab");
          if (_sb) _sb.addEventListener("click", function (ev) { ev.stopPropagation(); toggleSave(id); refreshDetailButtons(); });''')

# ---------- 1b: refreshDetailButtons paints the FAB, not the wide button ----------
rep('''        var svEl = document.getElementById("btnSave");
        if (svEl) { var svd = isSaved(currentId); svEl.innerHTML = ICONS.bookmark + "<span>" + esc(svd ? t.mineSavedDone : t.mineSave) + "</span>"; svEl.classList.toggle("is-on", svd); svEl.hidden = clr; }''',
    '''        var svEl = document.getElementById("btnSaveFab");
        if (svEl) { var svd = isSaved(currentId); svEl.innerHTML = ICONS.bookmark; svEl.classList.toggle("is-on", svd); svEl.hidden = clr; svEl.setAttribute("aria-pressed", String(svd)); }''')

# ---------- 1c: the head pill keeps CLEAR only ----------
rep('''        if (isSaved(e.id)) return '<span class="state-badge">' + L().accepted + "</span>";
''', '')

# ---------- 1d: the wide save button leaves the action grid ----------
rep('''          <button class="rpg-btn btn-save wide" id="btnSave" type="button"></button>
''', '')

# ---------- 2: shuffle pairs with see-all under the cards ----------
rep('''          <div class="home-rec-body" id="homeRecBody" hidden><div class="home-rec-head"><button class="home-shuffle" id="homeShuffle" type="button"></button></div>
          <div class="home-rec-list" id="homeRecList"></div>
          <button class="home-all" id="homeAll" type="button"></button></div>''',
    '''          <div class="home-rec-body" id="homeRecBody" hidden>
          <div class="home-rec-list" id="homeRecList"></div>
          <div class="home-rec-foot"><button class="home-shuffle" id="homeShuffle" type="button"></button><button class="home-all" id="homeAll" type="button"></button></div></div>''')

# ---------- 3: My List's only section loses its label ----------
rep('''          <div class="mine-sec is-saved"><span id="mineSavedHead"></span></div>
''', '')
rep('''        document.getElementById("mineSavedHead").textContent = t.mineSaved;
''', '')

# ---------- CSS ----------
css = '''
/* Q-420: save FAB beside the share FAB; home rec foot pair */
dialog#detail .save-fab { right: 58px; color: #f5f0dc; }
dialog#detail .save-fab svg { width: 19px; height: 19px; }
dialog#detail .save-fab.is-on { background: #ffd83d; color: #22303c; }
#view-home .home-rec-foot { display: flex; gap: 10px; }
#view-home .home-rec-foot .home-shuffle { flex: 1 1 0; margin-left: 0; background: #fffdf4; border: 3px solid var(--line-c); border-radius: 12px; box-shadow: 0 4px 0 rgba(34, 48, 60, .4); color: #22303c; font-size: 15px; font-weight: 900; padding: 13px 10px; }
#view-home .home-rec-foot .home-all { flex: 1 1 0; align-self: auto; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q420-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q420 BUILD OK', tok)
