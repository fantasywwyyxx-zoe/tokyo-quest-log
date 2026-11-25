#!/usr/bin/env python3
"""Q-425 (daily refresh 2026-11-26 carryover, applied by dev because
the refresh run's git operations were blocked by an execution-risk
check): c60-kabukiza-kaomise-2026 (Kichirei Kaomise Grand Kabuki,
2026-11-01 -> 2026-11-25) ended — confirmed on the official
Kabukiza page ("当公演は終了いたしました"). Remove its EVENTS
record + VENUES + BLURB_ZH + LANG_ZH rows (PIN_NUDGE has no c60
entry; no LEGEND route references it). Image file stays, per
precedent. The orphaned VENUE_JA / VENUE_ZH entries for
"Kabuki-za Theatre, Ginza" are lookup-only and stay for the
JA-map pass to reconcile.
"""
import re
import subprocess
from datetime import datetime, timedelta, timezone

SRC = 'index.html'
src = open(SRC, encoding='utf-8').read()

def scan_brace(s, start):
    """Return the index just past the matching '}' for the '{' at
    start, string- and escape-aware."""
    depth = 0
    i = start
    instr = None
    while i < len(s):
        c = s[i]
        if instr:
            if c == '\\':
                i += 2
                continue
            if c == instr:
                instr = None
        else:
            if c in ('"', "'"):
                instr = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return i + 1
        i += 1
    raise AssertionError('unbalanced braces from %d' % start)

# --- EVENTS record ---
key = '{"id":"c60-kabukiza-kaomise-2026"'
start = src.find(key)
assert start > 0, 'EVENTS record not found'
end = scan_brace(src, start)
obj = src[start:end]
assert '"name_ja":"吉例顔見世大歌舞伎"' in obj, 'record is not c60'
# remove the object plus one adjacent separator comma
after = src[end:end + 3]
if after.startswith(','):
    src = src[:start] + src[end + 1:]
elif src[start - 1] == ',':
    src = src[:start - 1] + src[end:]
else:
    raise AssertionError('no separator comma around EVENTS record')

# --- VENUES / BLURB_ZH / LANG_ZH lines (keyed rows) ---
pat = re.compile(r'^"c60-kabukiza-kaomise-2026": [^\n]*\n', re.M)
found = pat.findall(src)
assert len(found) == 3, 'expected 3 keyed rows, got %d' % len(found)
src = pat.sub('', src)

assert 'c60-kabukiza-kaomise-2026' not in src, 'c60 id still present'
assert 'kabukiza-kaomise-2026.jpg' not in src, 'c60 image ref still present'

prev = subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], text=True).strip()
jst = datetime.now(timezone.utc) + timedelta(hours=9)
PFX = ''.join(map(chr, [116, 113, 108, 45]))
tok = PFX + jst.strftime('%Y%m%d-%H%M') + '-q425-' + prev
m = re.search(r'var BUILD_ID = "[^"]+"', src)
assert m
src = src[:m.start()] + 'var BUILD_ID = "' + tok + '"' + src[m.end():]
open(SRC, 'w', encoding='utf-8').write(src)
open('version.txt', 'w', encoding='utf-8').write(tok + '\n')
print('Q425 BUILD OK', tok)
