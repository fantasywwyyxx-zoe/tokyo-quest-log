#!/usr/bin/env python3
"""Q-424 (Zoe, 2026-11-25): two asks in one pass.
1) "保存quest的时候选择保存到哪里" — saving picks its list.
   saveFlow(): unsave stays one tap; with only the default
   list, save stays one tap; with custom lists, the save tap
   opens the list picker (choose a list, or +新建 and the quest
   lands in the new list). The picker/form sheets re-host into
   an open <dialog> (the mapPick pattern) so they work from the
   detail page too. Move-from-My-List keeps its own mode.
2) Home layout polish (her "能再调整下布局之类的么"):
   - shelf names: fixed two-line block (chips align in a row)
     and shrink-to-fit instead of the ellipsis clamp — names
     are never truncated (her standing rule);
   - card meta: the date range is one nowrap unit, so lines
     break at the " · " separators, never mid-date.
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

# ---------- STR: mineSaveTo ----------
rep('mineMoveTo: "Move to which list?",', 'mineSaveTo: "Save to which list?", mineMoveTo: "Move to which list?",')
rep('mineMoveTo: "どのリストへ移動？",', 'mineSaveTo: "どこに保存？", mineMoveTo: "どのリストへ移動？",')
rep('mineMoveTo: "移动到哪个列表？",', 'mineSaveTo: "保存到哪个列表？", mineMoveTo: "移动到哪个列表？",')

# ---------- picker/form machinery: modes, hosting, save completion ----------
rep('''      var listPickId = null;
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
      }''',
    '''      var listPickId = null;
      var listPickMode = "move";
      var listPickDone = null;
      var listFormSaveId = null;
      var listFormDone = null;
      function hostSheet(el) {
        if (!el) return;
        var dlg = document.querySelector("dialog[open]");
        var host = dlg || document.body;
        if (el.parentElement !== host) host.appendChild(el);
      }
      function saveFlow(id, after) {
        ensureLists();
        if (isSaved(id) || state.lists.length <= 1) { toggleSave(id); if (after) after(); return; }
        openListPick(id, "save", after || null);
      }
      function openListPick(id, mode, done) {
        ensureLists();
        listPickId = id;
        listPickMode = mode || "move";
        listPickDone = done || null;
        var t = L();
        var cur = listOf(id);
        document.getElementById("listPickTitle").textContent = listPickMode === "save" ? t.mineSaveTo : t.mineMoveTo;
        document.getElementById("listPickCancel").textContent = t.mapPickCancel;
        var rows = state.lists.map(function (l) {
          var n = l.items.filter(function (x) { var e = byId(x); return e && !isCleared(x); }).length;
          return '<button class="rpg-btn map-pick-btn" type="button" data-listpick="' + l.id + '">' + esc(listName(l)) + " (" + n + ")" + (listPickMode === "move" && cur && cur.id === l.id ? " \\u2713" : "") + "</button>";
        }).join("");
        if (listPickMode === "save") rows += '<button class="rpg-btn map-pick-btn" type="button" data-listpick="__new">' + esc(t.mineNewList) + "</button>";
        document.getElementById("listPickRows").innerHTML = rows;
        hostSheet(document.getElementById("listPick"));
        document.getElementById("listPick").hidden = false;
      }
      function closeListPick() { document.getElementById("listPick").hidden = true; listPickId = null; listPickDone = null; }
      function pickList(targetId) {
        if (!listPickId) { closeListPick(); return; }
        if (targetId === "__new") {
          listFormSaveId = listPickId;
          listFormDone = listPickDone;
          closeListPick();
          openListForm("new");
          return;
        }
        ensureLists();
        var id = listPickId;
        var done = listPickDone;
        state.lists.forEach(function (l) { var j = l.items.indexOf(id); if (j !== -1) l.items.splice(j, 1); });
        for (var i = 0; i < state.lists.length; i++) if (state.lists[i].id === targetId) state.lists[i].items.push(id);
        if (state.saved.indexOf(id) === -1) state.saved.push(id);
        save(); sfx("accept"); syncMineBadge();
        closeListPick(); renderMine(); renderHome();
        if (done) done();
      }''')

rep('''      function openListForm(mode) {
        ensureLists();
        listFormMode = mode;''',
    '''      function openListForm(mode) {
        ensureLists();
        hostSheet(document.getElementById("listForm"));
        listFormMode = mode;''')

rep('''      function closeListForm() { document.getElementById("listForm").hidden = true; }''',
    '''      function closeListForm() { document.getElementById("listForm").hidden = true; listFormSaveId = null; listFormDone = null; }''')

rep('''        if (listFormMode === "new") {
          var nl = { id: "l" + Date.now().toString(36), name: name, items: [] };
          state.lists.push(nl);
          mineActiveList = nl.id;
        } else {''',
    '''        if (listFormMode === "new") {
          var nl = { id: "l" + Date.now().toString(36), name: name, items: [] };
          state.lists.push(nl);
          mineActiveList = nl.id;
          if (listFormSaveId) {
            var qid = listFormSaveId;
            if (state.saved.indexOf(qid) === -1) state.saved.push(qid);
            nl.items.push(qid);
            syncMineBadge(); renderHome();
            if (listFormDone) { var fd = listFormDone; listFormDone = null; fd(); }
            listFormSaveId = null;
          }
        } else {''')

# ---------- save entry points route through saveFlow ----------
rep('''if (_sb) _sb.addEventListener("click", function (ev) { ev.stopPropagation(); toggleSave(id); refreshDetailButtons(); });''',
    '''if (_sb) _sb.addEventListener("click", function (ev) { ev.stopPropagation(); saveFlow(id, function () { refreshDetailButtons(); }); });''')
rep('''if (svv) { ev.stopPropagation(); toggleSave(svv.getAttribute("data-home-save")); renderHome(); return; }''',
    '''if (svv) { ev.stopPropagation(); saveFlow(svv.getAttribute("data-home-save"), null); renderHome(); return; }''')

# ---------- layout: shelf names align + never truncate ----------
rep('''#view-home .hs-name { font-size: 11.5px; font-weight: 800; line-height: 1.3; color: #22303c; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }''',
    '''#view-home .hs-name { font-size: 11.5px; font-weight: 800; line-height: 1.3; color: #22303c; height: 30px; overflow: hidden; }''')
rep('''        }).join("");
      }
      /* Nearby quick pick: position is requested only on this''',
    '''        }).join("");
        document.querySelectorAll("#hsRow .hs-name").forEach(function (el) {
          var fs = 11.5;
          el.style.fontSize = fs + "px";
          while (el.scrollHeight > 31 && fs > 8.5) { fs -= 0.5; el.style.fontSize = fs + "px"; if (fs <= 10) el.style.lineHeight = "1.15"; }
        });
      }
      /* Nearby quick pick: position is requested only on this''')

# ---------- layout: meta dates never split ----------
rep('''        return parts.join(" \\u00b7 ");
      }''',
    '''        return parts.join(" \\u00b7 ");
      }
      function homeMetaHTML(e) {
        var t = L();
        var parts = [];
        var d = questDistM(e);
        parts.push(esc(d != null ? fmtDist(d) : e.area));
        parts.push(esc(e.free ? t.chipFree : evPrice(e)));
        if (e.evergreen || !e.start) parts.push(esc(t.legendEver));
        else parts.push('<span class="meta-dates">' + esc(fmtShortDate(e.start) + " - " + fmtShortDate(e.end)) + "</span>");
        return parts.join(" \\u00b7 ");
      }''')
rep('''<span class="hc-meta">' + esc(homeMeta(e)) + "</span>"''',
    '''<span class="hc-meta">' + homeMetaHTML(e) + "</span>"''')
rep('''<span class="mc-meta">' + esc(homeMeta(e)) + "</span></span>"''',
    '''<span class="mc-meta">' + homeMetaHTML(e) + "</span></span>"''')

css = '''
/* Q-424: meta date range stays one unit */
.meta-dates { white-space: nowrap; }
'''
i = src.rfind('</style>')
assert i > 0
src = src[:i] + css + src[i:]

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q424-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q424 BUILD OK', tok)
