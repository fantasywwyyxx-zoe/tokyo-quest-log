#!/usr/bin/env python3
"""Q-419 (Zoe, 2026-11-24 18:00): "あなたのおすすめ可不可以做成
按钮，按一下然后再蹦出来这种" — the recommendations fold behind
one chunky toggle button; tapping pops the cards out (recPop).
Picking a quick mode auto-opens them (the pick's result must
be visible); the shuffle chip and See-all move inside the
fold. Default state is folded: the home's first screen is
quick picks + shelf + the one button."""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

# ---------- markup: head+list+all fold behind a toggle ----------
rep('''          <div class="home-rec-head"><span id="homeRecTitle"></span><button class="home-shuffle" id="homeShuffle" type="button"></button></div>
          <div class="home-rec-list" id="homeRecList"></div>
          <button class="home-all" id="homeAll" type="button"></button>''',
    '''          <button class="home-rec-toggle" id="homeRecToggle" type="button" aria-expanded="false"><span id="homeRecTitle"></span><span class="hrt-chev" aria-hidden="true">▼</span></button>
          <div class="home-rec-body" id="homeRecBody" hidden><div class="home-rec-head"><button class="home-shuffle" id="homeShuffle" type="button"></button></div>
          <div class="home-rec-list" id="homeRecList"></div>
          <button class="home-all" id="homeAll" type="button"></button></div>''')

# ---------- state ----------
rep('''      var homeQuick = null;''',
    '''      var homeQuick = null;
      var homeRecOpen = false;''')

# ---------- renderHome syncs the fold ----------
rep('''        document.getElementById("homeShuffle").textContent = t.homeShuffle;''',
    '''        document.getElementById("homeShuffle").textContent = t.homeShuffle;
        var rtb = document.getElementById("homeRecBody");
        if (rtb) rtb.hidden = !homeRecOpen;
        var rtt = document.getElementById("homeRecToggle");
        if (rtt) { rtt.classList.toggle("is-on", homeRecOpen); rtt.setAttribute("aria-expanded", String(homeRecOpen)); }''')

# ---------- quick picks auto-open the fold ----------
rep('''        homeQuick = homeQuick === k ? null : k;
        homePage = 0;''',
    '''        homeQuick = homeQuick === k ? null : k;
        if (homeQuick) homeRecOpen = true;
        homePage = 0;''')

# ---------- toggle wiring ----------
rep('''      document.getElementById("hsRow").addEventListener("click", function (ev) {''',
    '''      document.getElementById("homeRecToggle").addEventListener("click", function () {
        homeRecOpen = !homeRecOpen;
        sfx(homeRecOpen ? "open" : "back");
        renderHome();
        if (homeRecOpen) {
          var rb = document.getElementById("homeRecBody");
          if (rb) { rb.classList.remove("pop"); void rb.offsetWidth; rb.classList.add("pop"); }
        }
      });
      document.getElementById("hsRow").addEventListener("click", function (ev) {''')

# ---------- CSS ----------
css = '''
/* Q-419: recommendations fold behind one toggle button */
#view-home .home-rec-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 13px; border: 2.5px solid #22303c; border-radius: 12px; background: #fffdf4; color: #22303c; font: inherit; font-weight: 800; font-size: 15px; text-align: left; cursor: pointer; box-shadow: 0 2px 0 rgba(20, 24, 60, 0.18); }
#view-home .home-rec-toggle.is-on { background: #ffd83d; }
#view-home .home-rec-toggle .hrt-chev { flex: none; font-size: 12px; color: #5b6a7d; transition: transform .18s; }
#view-home .home-rec-toggle.is-on .hrt-chev { transform: rotate(180deg); }
#view-home .home-rec-body { display: flex; flex-direction: column; gap: 10px; }
#view-home .home-rec-body[hidden] { display: none; }
#view-home .home-rec-body.pop { animation: recPop .22s ease-out; }
@keyframes recPop { 0% { opacity: 0; transform: translateY(10px) scale(.97); } 55% { opacity: 1; transform: translateY(-2px) scale(1.006); } 100% { opacity: 1; transform: none; } }
#view-home .home-rec-head { justify-content: flex-end; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q419-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q419 BUILD OK', tok)
