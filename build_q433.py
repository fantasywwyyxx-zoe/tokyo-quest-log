#!/usr/bin/env python3
"""Q-433: daily-refresh carryover applied by dev (the refresh
job's git block continues; Zoe has not yet ruled on resuming
its git ops, so dev applies its verified findings as with
Q-425):
- DELETE c76-bocchi-the-rock-popup-winter-atre-akihabara
  (ended 2026-11-26, COSPA official page confirmed by the
  2026-11-27 refresh run): EVENTS + VENUES + BLURB_ZH +
  LANG_ZH rows; image file stays per precedent.
- ADD c292-nezu-horu-urushi (Nezu Museum 「彫る漆」,
  2026-12-05 → 2027-01-17, officially verified 2026-11-26,
  photo procured by the refresh run from the official press
  PDF): reuses eg4's venue/coords and existing hours/price/
  lang strings, so no new JA/ZH map gaps.
Token bump included."""
import subprocess

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()
orig_len = len(src)

def rep(old, new, n=1):
    global src
    assert src.count(old) == n, 'anchor count %d != %d for %r' % (src.count(old), n, old[:70])
    src = src.replace(old, new)

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD']).decode().strip()
import datetime
jst = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
PFX = ''.join(map(chr, [116, 113, 108, 45]))
token = '%s%s-q433-%s' % (PFX, jst.strftime('%Y%m%d-%H%M'), prev)
i = src.find('var BUILD_ID = "')
assert i > 0
j = src.find('"', i + 16)
old_tok = src[i + 16:j]
rep('var BUILD_ID = "%s"' % old_tok, 'var BUILD_ID = "%s"' % token)

# ---------- delete c76 (4 single-line rows) ----------
lines = src.split('\n')
drop = [ln for ln in lines if 'c76-bocchi-the-rock-popup-winter-atre-akihabara' in ln]
assert len(drop) == 4, 'c76 lines found: %d' % len(drop)
assert any(ln.lstrip().startswith('{"id":"c76-') for ln in drop)
assert any('"c76-bocchi-the-rock-popup-winter-atre-akihabara": { lat:' in ln for ln in drop)
lines = [ln for ln in lines if 'c76-bocchi-the-rock-popup-winter-atre-akihabara' not in ln]
src = '\n'.join(lines)
assert 'c76-bocchi' not in src

# ---------- add c292 ----------
ROW = ('{"id":"c292-nezu-horu-urushi","img":"assets/q/nezu-horu-urushi.jpg","area":"Aoyama","category":"Art","free":false,'
       '"start":"2026-12-05","end":"2027-01-17","exp":50,"price":"¥1,400","hours":"10:00–17:00; closed Mondays",'
       '"venue":"Nezu Museum, Minami-Aoyama","name_en":"Lacquerware with Carvings — Nezu Museum Special Exhibition",'
       '"name_ja":"企画展 彫る漆",'
       '"blurb_en":"Carved lacquer at the Nezu: urushi layered dozens of coats deep, then sculpted — tsuishu and tsuikoku boxes, trays and tea utensils whose patterns are cut into the lacquer itself.",'
       '"blurb_ja":"漆を何層にも塗り重ねてから彫る「彫漆」の企画展。堆朱・堆黒の合子や盆、茶道具など、文様を漆そのものに彫り出した名品が並ぶ。",'
       '"lang":"English exhibition page and leaflet available.","mood":["hidden treasure"],'
       '"url":"https://www.nezu-muse.or.jp/jp/exhibitions/upcoming/", "x": 62.8, "y": 52.1}')
rep('"y": 50.9},\n        {"id":"eg2-kasai"',
    '"y": 50.9},\n        ' + ROW + ',\n        {"id":"eg2-kasai"')
rep('"eg4-nezu-museum": { lat: 35.6622429, lng: 139.7172555, r: 300 },',
    '"eg4-nezu-museum": { lat: 35.6622429, lng: 139.7172555, r: 300 },\n        "c292-nezu-horu-urushi": { lat: 35.6622429, lng: 139.7172555, r: 300 },')
rep('逐一介绍。",\n',
    '逐一介绍。",\n        "c292-nezu-horu-urushi": "「雕漆」企划展：把漆反复涂叠数十层，再在漆层上雕出纹样。堆朱、堆黑的合子、托盘与茶具齐聚根津美术馆。",\n')
rep('        "c291-ota-ukiyoe-masters": "官网有英文和日文。",',
    '        "c291-ota-ukiyoe-masters": "官网有英文和日文。",\n        "c292-nezu-horu-urushi": "有英文展览页面和宣传册。",')
rep('一葉記念館 — Abasaa — Public domain";',
    '一葉記念館 — Abasaa — Public domain\\n根津美術館 企画展「彫る漆」 — Nezu Museum — Official press photo";')

assert src.count('c292-nezu-horu-urushi') == 4, 'c292 rows: %d' % src.count('c292-nezu-horu-urushi')

open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(token + '\n')
print('Q433 BUILD OK', token, '| delta bytes:', len(src) - orig_len)
