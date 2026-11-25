#!/usr/bin/env python3
"""Q-421 (Zoe, 2026-11-25, approved from mock v2): My List becomes
multiple named lists, GMaps-collections style.
- state.lists: [{id, name, items}]; the default list id "want"
  （行きたい) always exists first and receives every quick save
  (home card / detail FAB via toggleSave). state.saved stays the
  union — isSaved, filters, badges untouched.
- ensureLists() enforces the invariants: want exists, every
  saved id lives in exactly one list, orphans land in want.
- Mine view: chips row (name + count, active = lemon) + ＋新規；
  cards gain a 移動 action opening a list picker sheet; custom
  lists get a slim manage row （改名/删除 — delete returns the
  quests to 行きたい, nothing is ever lost); 友達に送る shares
  the ACTIVE list under its name.
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

# ---------- state defaults ----------
rep('accepted: [], saved: [],', 'accepted: [], saved: [], lists: [],')

# ---------- STR (anchor: mineEmptyA in each dict) ----------
rep('mineEmptyA: "No quests in progress yet',
    'mineMove: "Move", mineMoveTo: "Move to which list?", mineNewList: "+ New list", mineListCreate: "Create", mineRename: "Rename", mineDeleteList: "Delete list", mineListEmpty: "Nothing in this list yet.", mineListNamePh: "List name", mineEmptyA: "No quests in progress yet')
rep('mineEmptyA: "進行中のクエストはまだありません"',
    'mineMove: "移動", mineMoveTo: "どのリストへ移動？", mineNewList: "＋ 新規リスト", mineListCreate: "作成", mineRename: "名前を変更", mineDeleteList: "リストを削除", mineListEmpty: "このリストはまだ空です", mineListNamePh: "リスト名", mineEmptyA: "進行中のクエストはまだありません"')
rep('mineEmptyA: "还没有进行中的任务',
    'mineMove: "移动", mineMoveTo: "移动到哪个列表？", mineNewList: "＋ 新建列表", mineListCreate: "创建", mineRename: "改名", mineDeleteList: "删除列表", mineListEmpty: "这个列表还空着", mineListNamePh: "列表名", mineEmptyA: "还没有进行中的任务')

# ---------- Mine markup: chips row + manage row ----------
rep('''          <div class="mine-list" id="mineSavedList"></div>''',
    '''          <div class="mine-lists" id="mineLists"></div>
          <div class="mine-manage" id="mineManage" hidden><button class="mine-manage-btn" id="mineRenameBtn" type="button"></button><button class="mine-manage-btn is-danger" id="mineDeleteBtn" type="button"></button></div>
          <div class="mine-list" id="mineSavedList"></div>''')

# ---------- sheets markup (before the detail dialog comment) ----------
rep('''    <!-- Quest detail -->''',
    '''    <div class="map-pick" id="listPick" hidden>
        <div class="map-pick-panel">
          <p class="map-pick-title" id="listPickTitle"></p>
          <div class="list-pick-rows" id="listPickRows"></div>
          <button class="map-pick-cancel" type="button" id="listPickCancel"></button>
        </div>
      </div>
      <div class="map-pick" id="listForm" hidden>
        <div class="map-pick-panel">
          <p class="map-pick-title" id="listFormTitle"></p>
          <input class="list-form-input" id="listFormInput" type="text" maxlength="20" autocomplete="off">
          <button class="rpg-btn map-pick-btn" type="button" id="listFormOk"></button>
          <button class="map-pick-cancel" type="button" id="listFormCancel"></button>
        </div>
      </div>

    <!-- Quest detail -->''')

# ---------- list helpers + toggleSave keeps the invariant ----------
rep('''      function isSaved(id) { return (state.saved || []).indexOf(id) !== -1; }
      function toggleSave(id) {
        if (!byId(id)) return;
        var i = state.saved.indexOf(id);
        if (i === -1) { state.saved.push(id); sfx("accept"); }
        else { state.saved.splice(i, 1); sfx("back"); }
        save(); syncMineBadge();
      }''',
    '''      var mineActiveList = "want";
      function listName(l) { return l.id === "want" ? L().mineSaved : l.name; }
      function ensureLists() {
        if (!Array.isArray(state.lists)) state.lists = [];
        state.lists = state.lists.filter(function (l) { return l && typeof l.id === "string" && Array.isArray(l.items); });
        var want = null;
        for (var i = 0; i < state.lists.length; i++) if (state.lists[i].id === "want") want = state.lists[i];
        if (!want) { want = { id: "want", name: "", items: [] }; state.lists.unshift(want); }
        var inSaved = {};
        (state.saved || []).forEach(function (id) { inSaved[id] = 1; });
        var seen = {};
        state.lists.forEach(function (l) {
          l.items = l.items.filter(function (id) { if (!inSaved[id] || seen[id]) return false; seen[id] = 1; return true; });
        });
        (state.saved || []).forEach(function (id) { if (!seen[id]) { want.items.push(id); seen[id] = 1; } });
        var ok = false;
        state.lists.forEach(function (l) { if (l.id === mineActiveList) ok = true; });
        if (!ok) mineActiveList = "want";
      }
      function activeList() { ensureLists(); for (var i = 0; i < state.lists.length; i++) if (state.lists[i].id === mineActiveList) return state.lists[i]; return state.lists[0]; }
      function listOf(id) { ensureLists(); for (var i = 0; i < state.lists.length; i++) if (state.lists[i].items.indexOf(id) !== -1) return state.lists[i]; return null; }
      function isSaved(id) { return (state.saved || []).indexOf(id) !== -1; }
      function toggleSave(id) {
        if (!byId(id)) return;
        ensureLists();
        var i = state.saved.indexOf(id);
        if (i === -1) { state.saved.push(id); state.lists[0].items.push(id); sfx("accept"); }
        else { state.saved.splice(i, 1); state.lists.forEach(function (l) { var j = l.items.indexOf(id); if (j !== -1) l.items.splice(j, 1); }); sfx("back"); }
        save(); syncMineBadge();
      }''')

# ---------- card gains the move action ----------
rep('''<span class="mine-act" data-mine-nav="' + e.id + '">' + esc(t.mineNav) + '</span><span class="mine-act is-lemon" data-mine-invite="''',
    '''<span class="mine-act" data-mine-nav="' + e.id + '">' + esc(t.mineNav) + '</span><span class="mine-act" data-mine-move="' + e.id + '">' + esc(t.mineMove) + '</span><span class="mine-act is-lemon" data-mine-invite="''')

# ---------- renderMine: chips + active list ----------
rep('''      function renderMine() {
        var title = document.getElementById("mineTitle");
        if (!title) return;
        var t = L();
        title.textContent = t.mineTitle;
        document.getElementById("mineShareBtn").textContent = t.mineFriend;
        var sav = (state.saved || []).map(function (id) { return byId(id); }).filter(function (e) { return e && !isCleared(e.id); }).reverse();
        document.getElementById("mineSavedList").innerHTML = sav.length ? sav.map(function (e) { return mineCardHTML(e); }).join("") : '<p class="mine-empty">' + esc(t.mineEmptyS) + "</p>";
      }''',
    '''      function renderMine() {
        var title = document.getElementById("mineTitle");
        if (!title) return;
        var t = L();
        ensureLists();
        title.textContent = t.mineTitle;
        document.getElementById("mineShareBtn").textContent = t.mineFriend;
        var chips = document.getElementById("mineLists");
        if (chips) {
          chips.innerHTML = state.lists.map(function (l) {
            var n = l.items.filter(function (id) { var e = byId(id); return e && !isCleared(id); }).length;
            return '<button class="mine-chip' + (l.id === mineActiveList ? " is-on" : "") + '" type="button" data-list-chip="' + l.id + '">' + esc(listName(l)) + " " + n + "</button>";
          }).join("") + '<button class="mine-chip is-new" type="button" id="mineNewList">' + esc(t.mineNewList) + "</button>";
        }
        var act = activeList();
        var mg = document.getElementById("mineManage");
        if (mg) {
          mg.hidden = act.id === "want";
          document.getElementById("mineRenameBtn").textContent = t.mineRename;
          document.getElementById("mineDeleteBtn").textContent = t.mineDeleteList;
        }
        var sav = act.items.map(function (id) { return byId(id); }).filter(function (e) { return e && !isCleared(e.id); }).reverse();
        document.getElementById("mineSavedList").innerHTML = sav.length ? sav.map(function (e) { return mineCardHTML(e); }).join("") : '<p class="mine-empty">' + esc(act.id === "want" ? t.mineEmptyS : t.mineListEmpty) + "</p>";
      }''')

# ---------- shareMineList shares the ACTIVE list ----------
rep('''        var names = [];
        (state.saved || []).forEach(function (id) { var e = byId(id); if (e && !isCleared(id)) names.push(evName(e)); });''',
    '''        var actL = activeList();
        var names = [];
        actL.items.forEach(function (id) { var e = byId(id); if (e && !isCleared(id)) names.push(evName(e)); });''')
rep('''        g.fillText(t.mineTitle, 450, 96);''',
    '''        var hdr = actL.id === "want" ? t.mineTitle : actL.name;
        var hfs = 54;
        g.font = '800 ' + hfs + 'px "M PLUS Rounded 1c", sans-serif';
        while (g.measureText(hdr).width > 800 && hfs > 28) { hfs -= 4; g.font = '800 ' + hfs + 'px "M PLUS Rounded 1c", sans-serif'; }
        g.fillText(hdr, 450, 96);''')
rep('''          g.fillText(t.mineEmptyS, 70, 260);''',
    '''          g.fillText(actL.id === "want" ? t.mineEmptyS : t.mineListEmpty, 70, 260);''')
rep('''openSharePick({ cv: cv, text: t.mineTitle + " \\u2014 Tokyo Quest Log", url: shareUrl(), fileName: "tql-list.png",''',
    '''openSharePick({ cv: cv, text: hdr + " \\u2014 Tokyo Quest Log", url: shareUrl(), fileName: "tql-list.png",''')

# ---------- sheet logic (before focusQuestOnMap) ----------
rep('''      function focusQuestOnMap(id) {''',
    '''      var listPickId = null;
      function openListPick(id) {
        ensureLists();
        listPickId = id;
        var t = L();
        var cur = listOf(id);
        document.getElementById("listPickTitle").textContent = t.mineMoveTo;
        document.getElementById("listPickCancel").textContent = t.mapPickCancel;
        document.getElementById("listPickRows").innerHTML = state.lists.map(function (l) {
          var n = l.items.filter(function (x) { var e = byId(x); return e && !isCleared(x); }).length;
          return '<button class="rpg-btn map-pick-btn" type="button" data-listpick="' + l.id + '">' + esc(listName(l)) + " (" + n + ")" + (cur && cur.id === l.id ? " \\u2713" : "") + "</button>";
        }).join("");
        document.getElementById("listPick").hidden = false;
      }
      function closeListPick() { document.getElementById("listPick").hidden = true; listPickId = null; }
      function pickList(targetId) {
        if (!listPickId) { closeListPick(); return; }
        ensureLists();
        var id = listPickId;
        state.lists.forEach(function (l) { var j = l.items.indexOf(id); if (j !== -1) l.items.splice(j, 1); });
        for (var i = 0; i < state.lists.length; i++) if (state.lists[i].id === targetId) state.lists[i].items.push(id);
        save(); sfx("accept");
        closeListPick(); renderMine();
      }
      var listFormMode = "new";
      function openListForm(mode) {
        ensureLists();
        listFormMode = mode;
        var t = L();
        var act = activeList();
        document.getElementById("listFormTitle").textContent = mode === "new" ? t.mineNewList : t.mineRename;
        var inp = document.getElementById("listFormInput");
        inp.placeholder = t.mineListNamePh;
        inp.value = mode === "new" ? "" : (act.id === "want" ? "" : act.name);
        document.getElementById("listFormOk").textContent = mode === "new" ? t.mineListCreate : t.mineSave;
        document.getElementById("listFormCancel").textContent = t.mapPickCancel;
        document.getElementById("listForm").hidden = false;
        setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
      }
      function closeListForm() { document.getElementById("listForm").hidden = true; }
      function submitListForm() {
        var name = document.getElementById("listFormInput").value.replace(/\\s+/g, " ").trim().slice(0, 20);
        if (!name) return;
        ensureLists();
        if (listFormMode === "new") {
          var nl = { id: "l" + Date.now().toString(36), name: name, items: [] };
          state.lists.push(nl);
          mineActiveList = nl.id;
        } else {
          var act = activeList();
          if (act.id !== "want") act.name = name;
        }
        save(); sfx("accept");
        closeListForm(); renderMine();
      }
      function deleteActiveList() {
        ensureLists();
        var act = activeList();
        if (act.id === "want") return;
        var want = state.lists[0];
        act.items.forEach(function (id) { if (want.items.indexOf(id) === -1) want.items.push(id); });
        state.lists = state.lists.filter(function (l) { return l.id !== act.id; });
        mineActiveList = "want";
        save(); sfx("back"); renderMine();
      }
      function focusQuestOnMap(id) {''')

# ---------- delegation: move / chips / new ----------
rep('''        var iv = ev.target.closest("[data-mine-invite]");
        if (iv) { ev.stopPropagation(); shareQuestPosterById(iv.getAttribute("data-mine-invite")); return; }''',
    '''        var iv = ev.target.closest("[data-mine-invite]");
        if (iv) { ev.stopPropagation(); shareQuestPosterById(iv.getAttribute("data-mine-invite")); return; }
        var mv = ev.target.closest("[data-mine-move]");
        if (mv) { ev.stopPropagation(); openListPick(mv.getAttribute("data-mine-move")); return; }
        var lc = ev.target.closest("[data-list-chip]");
        if (lc) { ev.stopPropagation(); mineActiveList = lc.getAttribute("data-list-chip"); sfx("move"); renderMine(); return; }
        if (ev.target.closest && ev.target.closest("#mineNewList")) { ev.stopPropagation(); openListForm("new"); return; }''')

# ---------- sheet listeners ----------
rep('''      document.getElementById("mineShareBtn").addEventListener("click", function () { shareMineList(); });''',
    '''      document.getElementById("mineShareBtn").addEventListener("click", function () { shareMineList(); });
      document.getElementById("mineRenameBtn").addEventListener("click", function () { openListForm("rename"); });
      document.getElementById("mineDeleteBtn").addEventListener("click", function () { deleteActiveList(); });
      var lpBind = document.getElementById("listPick");
      if (lpBind) lpBind.addEventListener("click", function (ev) {
        if (ev.target === lpBind) { closeListPick(); return; }
        var pb = ev.target.closest ? ev.target.closest("[data-listpick]") : null;
        if (pb) { pickList(pb.getAttribute("data-listpick")); return; }
        if (ev.target.closest && ev.target.closest("#listPickCancel")) closeListPick();
      });
      var lfBind = document.getElementById("listForm");
      if (lfBind) lfBind.addEventListener("click", function (ev) {
        if (ev.target === lfBind) { closeListForm(); return; }
        if (ev.target.closest && ev.target.closest("#listFormOk")) { submitListForm(); return; }
        if (ev.target.closest && ev.target.closest("#listFormCancel")) closeListForm();
      });
      var lfInp = document.getElementById("listFormInput");
      if (lfInp) lfInp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); submitListForm(); } });''')

# ---------- CSS ----------
css = '''
/* Q-421: My List collections — chips row, manage row, list sheets */
.mine-lists { display: flex; flex-wrap: wrap; gap: 8px; }
.mine-chip { background: #fffdf4; color: var(--ink); border: 2.5px solid var(--line-c); border-radius: 999px; padding: 7px 14px; font: inherit; font-weight: 800; font-size: 13.5px; cursor: pointer; }
.mine-chip.is-on { background: #ffd83d; }
.mine-chip.is-new { color: #7a8494; border-style: dashed; border-color: #9aa3b2; }
.mine-manage { display: flex; gap: 16px; justify-content: flex-end; }
.mine-manage[hidden] { display: none; }
.mine-manage-btn { background: none; border: none; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--gold-deep); cursor: pointer; padding: 2px 4px; }
.mine-manage-btn.is-danger { color: #c23b3b; }
.list-pick-rows { display: grid; gap: 9px; }
.list-form-input { font: inherit; font-weight: 700; font-size: 16px; padding: 11px 12px; border: 3px solid var(--line-c); border-radius: 10px; background: #fffdf4; color: var(--ink); width: 100%; box-sizing: border-box; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q421-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q421 BUILD OK', tok)
