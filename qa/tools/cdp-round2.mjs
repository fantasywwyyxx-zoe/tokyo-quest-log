#!/usr/bin/env node
// QA round 2 (2026-10-28, target commit 6aca302) — targeted retests:
//  (1) map filter bar: 6 chips geometry + LEGEND filter result (ja/en/zh)
//  (2) confirm dialog (abandon-quest sample, ja): tab vs body overlap, name visible
//  (3) detail schedule row (PIGMENT TOKYO sample, ja): monthly label appears once
//  (4) catalog spot-checks: SONIC detail (Q-102/Q-103 retest), EPIC reward + photo,
//      LEGEND route detail page
// Writes shots + probes.json into qa/shots/2026-10-28-r2/.
// Usage: node qa/tools/cdp-round2.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const PORT = 9400 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-r2';
const outDir = resolve(ROOT, `qa/shots/${TAG}`);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probes = [];
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 400)); };

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    });
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
}

const udd = `/tmp/tsq-r2-profile-${PORT}`;
rmSync(udd, { recursive: true, force: true });
const proc = spawn(CHROME, ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch { /* noop */ }

async function waitStable(timeoutMs = 12000) {
  const t0 = Date.now(); let last = '', same = 0;
  while (Date.now() - t0 < timeoutMs) {
    const sig = await cdp.eval(`(() => { const finite = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, finite, document.body ? document.body.innerText.length : 0, document.documentElement ? document.documentElement.scrollHeight : 0].join('#'); })()`);
    if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; }
    await sleep(300);
  }
}
async function shot(name) {
  await waitStable(); await sleep(250);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(resolve(outDir, `${TAG}-${name}.png`), Buffer.from(data, 'base64'));
  console.log('[shot]', name);
}
async function setVp(w, h) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600, screenWidth: w, screenHeight: h });
  if (w < 600) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
}
const OLD = lang => ({ lang, muted: true, theme: 'auto', font: 'rounded', hero: 'aoi', custom: null, name: 'QA', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 1, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } });
async function boot(lang) {
  await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(OLD(lang)))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await cdp.eval(`document.getElementById('startBtn').click(); 'ok'`);
  await waitStable();
}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; })()`);

const CHIP_PROBE = `(() => { const chips = [...document.querySelectorAll('#mapFilters [data-mf]')]; const rs = chips.map(c => { const r = c.getBoundingClientRect(); return { mf: c.getAttribute('data-mf'), text: c.textContent.trim(), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], pressed: c.getAttribute('aria-pressed'), cls: c.className }; }); const gaps = rs.slice(1).map((r, i) => r.rect[0] - (rs[i].rect[0] + rs[i].rect[2])); const count = document.getElementById('mapCount'); return { chips: rs, gaps, countText: count ? count.textContent.trim() : '' }; })()`;

// ---------- A) JA @390x844: filter bar, LEGEND, PIGMENT, confirm, EPIC, LEGEND detail ----------
await setVp(390, 844);
await boot('ja');
await shot('ja-map-filterbar-390x844');
note('filterbar-ja-390x844', await cdp.eval(CHIP_PROBE));
note('catalog-ja', await cdp.eval(`(() => { const mc = document.getElementById('mapCount'); return { mapCount: mc ? mc.textContent.trim() : '' }; })()`));
console.log(' click LEGEND:', await click('[data-mf="legend"]'));
await shot('ja-map-legend-390x844');
note('legend-filter-ja', await cdp.eval(`(() => { const mc = document.getElementById('mapCount'); const pins = [...document.querySelectorAll('#mapBox .pin')].filter(p => { const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); return cs.display !== 'none' && r.width > 0; }); return { mapCount: mc ? mc.textContent.trim() : '', visiblePins: pins.length, chipState: (() => { const c = document.querySelector('[data-mf="legend"]'); const r = c.getBoundingClientRect(); return { rect: [Math.round(r.left), Math.round(r.width)], pressed: c.getAttribute('aria-pressed'), cls: c.className }; })() }; })()`));
console.log(' click ALL:', await click('[data-mf="all"]'));
await waitStable();

// list: catalog count + PIGMENT detail
await click('#tab-list');
await shot('ja-list-390x844');
note('list-ja', await cdp.eval(`(() => { const rows = document.querySelectorAll('#view-list .ms-row'); const cnt = [...document.querySelectorAll('#view-list *')].find(e => e.children.length === 0 && /クエスト|quests/i.test(e.textContent) && /\\d+/.test(e.textContent)); return { rows: rows.length, countLabel: cnt ? cnt.textContent.trim().slice(0, 40) : '' }; })()`));
const pig = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('PIGMENT')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' pigment row:', pig);
if (pig === 'ok') {
  await shot('ja-detail-pigment-390x844');
  note('pigment-detail-ja', await cdp.eval(`(() => { const d = document.getElementById('detail'); const txt = d.innerText; const when = document.getElementById('dpWhen'); const range = document.getElementById('dpRange'); const img = document.querySelector('#detailBanner img, #detailPreview img, #detail img'); return { name: document.getElementById('detailName').textContent, monthlyOccurrences: (txt.match(/毎月開催/g) || []).length, dpWhen: when ? when.textContent.trim() : '(none)', dpRange: range ? range.textContent.trim() : '(none)', bannerImg: img ? { nw: img.naturalWidth, nh: img.naturalHeight } : 'no-img-el' }; })()`));
  await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d.open) d.close(); document.getElementById('detailClose')?.click(); return 'ok'; })()`);
  await waitStable();
}

// SONIC detail (Q-102/Q-103 retest, JA fine: chips/blurb geometry is language-independent enough; EN retest runs in the matrix pass)
const sonic = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('SONIC')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' sonic row:', sonic);
if (sonic === 'ok') {
  await shot('ja-detail-sonic-390x844');
  note('sonic-detail-retest', await cdp.eval(`(() => { const mood = [...document.querySelectorAll('#detail *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('#')); const b = document.getElementById('detailBlurb'); return { moodChips: mood.map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), right: Math.round(r.right), clipped: r.right > innerWidth + 1 }; }), blurbSh: b.scrollHeight, blurbCh: b.clientHeight, blurbClipped: b.scrollHeight > b.clientHeight + 2 }; })()`));
  // accept this quest, then abandon -> confirm dialog (fix 2 sample)
  console.log(' accept:', await click('#btnQuest'));
  await waitStable();
  console.log(' undo(abandon):', await click('#btnUndo'));
  await shot('ja-confirm-abandon-390x844');
  note('confirm-dialog-ja', await cdp.eval(`(() => { const box = document.getElementById('gbConfirm'); const tab = document.getElementById('gcTab'); const q = document.getElementById('gcQ'); const tr = tab.getBoundingClientRect(); const qr = q.getBoundingClientRect(); return { open: !box.hidden, tabText: tab.textContent, qText: q.textContent, tabRect: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.width), Math.round(tr.height)], qRect: [Math.round(qr.left), Math.round(qr.top), Math.round(qr.width), Math.round(qr.height)], tabOverlapsQ: tr.bottom > qr.top + 1, qClipped: q.scrollWidth > q.clientWidth + 1 || q.scrollHeight > q.clientHeight + 1 }; })()`));
  console.log(' confirm NO:', await click('#gcNo'));
  await waitStable();
  await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d.open) d.close(); document.getElementById('detailClose')?.click(); return 'ok'; })()`);
  await waitStable();
}

// EPIC sample: open details until an epicReward shows; record photo + reward
note('epic-sample', await cdp.eval(`'skip'`));
for (let i = 0; i < 12; i++) {
  const r = await cdp.eval(`(() => { const rows = document.querySelectorAll('#view-list .ms-row'); if (${i} >= rows.length) return 'end'; rows[${i}].scrollIntoView({ block: 'center' }); rows[${i}].click(); return 'ok'; })()`);
  if (r !== 'ok') break;
  await waitStable();
  const info = await cdp.eval(`(() => { const rw = document.getElementById('epicReward'); const img = document.querySelector('#detailBanner img, #detailPreview img, #detail img'); const chips = document.getElementById('detailChips'); return { name: document.getElementById('detailName').textContent.slice(0, 40), chips: chips ? chips.textContent.trim().slice(0, 60) : '', rewardVisible: rw ? (!rw.hidden && getComputedStyle(rw).display !== 'none' && rw.textContent.trim().length > 0) : false, rewardText: rw ? rw.textContent.trim().slice(0, 60) : '', bannerImg: img ? { nw: img.naturalWidth } : 'no-img-el' }; })()`);
  note(`detail-sample-${i}`, info);
  if (info.rewardVisible) { await shot('ja-detail-epic-390x844'); }
  await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d.open) d.close(); document.getElementById('detailClose')?.click(); return 'ok'; })()`);
  await waitStable();
  if (info.rewardVisible) break;
}

// LEGEND route detail: map -> LEGEND filter -> first visible pin -> preview -> open
await click('#tab-map');
await waitStable();
console.log(' legend chip:', await click('[data-mf="legend"]'));
await waitStable();
const pinClick = await cdp.eval(`(() => { const pins = [...document.querySelectorAll('#mapBox .pin')].filter(p => { const r = p.getBoundingClientRect(); return getComputedStyle(p).display !== 'none' && r.width > 0 && r.left > 0 && r.right < innerWidth && r.top > 80 && r.bottom < innerHeight - 90; }); if (!pins.length) return 'no-visible-pin'; pins[0].click(); return 'clicked'; })()`);
console.log(' legend pin:', pinClick);
await shot('ja-map-legend-pinpreview-390x844');
note('legend-pin-preview', await cdp.eval(`(() => { const pp = document.getElementById('pinPreview'); return { visible: pp && !pp.hidden && getComputedStyle(pp).display !== 'none', name: document.getElementById('ppName') ? document.getElementById('ppName').textContent : '' }; })()`));
console.log(' ppOpen:', await click('#ppOpen'));
await shot('ja-legend-route-detail-390x844');
note('legend-route-detail', await cdp.eval(`(() => { const d = document.getElementById('detail'); const txt = (d.open ? d.innerText : document.body.innerText); return { detailOpen: d.open, name: document.getElementById('detailName').textContent.slice(0, 50), textLen: txt.length, checkpointMentions: (txt.match(/チェックポイント|checkpoint/gi) || []).length, bodySnippet: txt.replace(/\\s+/g, ' ').slice(0, 220) }; })()`));
await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d.open) d.close(); document.getElementById('detailClose')?.click(); return 'ok'; })()`);

// ---------- B) JA @390x667 filter bar ----------
await setVp(390, 667);
await boot('ja');
await shot('ja-map-filterbar-390x667');
note('filterbar-ja-390x667', await cdp.eval(CHIP_PROBE));

// ---------- C) ZH @390x844 + 390x667 filter bar (dev request: ZH 390 real shot) ----------
await setVp(390, 844);
await boot('zh');
await shot('zh-map-filterbar-390x844');
note('filterbar-zh-390x844', await cdp.eval(CHIP_PROBE));
await setVp(390, 667);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await cdp.eval(`(() => { if (!document.getElementById('startScreen').hidden) document.getElementById('startBtn').click(); return 'ok'; })()`);
await waitStable();
await shot('zh-map-filterbar-390x667');
note('filterbar-zh-390x667', await cdp.eval(CHIP_PROBE));

// ---------- D) EN @1440 filter bar ----------
await setVp(1440, 900);
await boot('en');
await shot('en-map-filterbar-1440x900');
note('filterbar-en-1440x900', await cdp.eval(CHIP_PROBE));

writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done ->', outDir);
