#!/usr/bin/env node
// QA round 5 (2026-10-28, target commit f1e44f5) —
//  A. Creator internal scroll @390x600 (primary) + @390x667: page locked, window
//     scrolls to bottom, lemon marker shows/hides, confirm button reachable
//  B. Studio window (#hsegStudio) same-container scroll @390x600
//  C. Expanded map: pin margin data (dataset.qid/_ll), pan to 4 extremes (no blank),
//     peripheral pin click-through, FULL MAP whole extent
//  D. Regression: fold bar, SONIC detail, Lv10 street
// Shots + probes.json -> qa/shots/2026-10-28-r5/
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
import { existsSync } from 'node:fs';
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9600 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-r5';
const outDir = resolve(ROOT, `qa/shots/${TAG}`);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probes = [];
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 700)); };

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
const udd = `/tmp/tsq-r5-profile-${PORT}`;
rmSync(udd, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch { /* noop */ }
async function viewport(w, h) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: w, screenHeight: h });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
}
await viewport(390, 600);
async function waitStable(timeoutMs = 12000) {
  const t0 = Date.now(); let last = '', same = 0;
  while (Date.now() - t0 < timeoutMs) {
    const sig = await cdp.eval(`(() => { const finite = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, finite, document.body ? document.body.innerText.length : 0].join('#'); })()`);
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
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; })()`);
const mouse = (type, x, y, extra = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });
async function wheelOver(x, y, dy, times = 3) {
  for (let i = 0; i < times; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); await sleep(220); }
}
async function drag(x0, y0, x1, y1, steps = 12) {
  await mouse('mousePressed', x0, y0, { buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), { buttons: 1 }); await sleep(30); }
  await mouse('mouseReleased', x1, y1, { buttons: 0, clickCount: 1 });
  await sleep(350);
}
const WINPROBE = `((rootSel) => { const root = document.querySelector(rootSel); const sc = root ? (root.classList.contains('win-scroller') ? root : root.querySelector('.win-scroller')) : null; const more = root ? root.querySelector('.win-more') : null; const moreVis = more ? (getComputedStyle(more).display !== 'none' && getComputedStyle(more).visibility !== 'hidden' && Number(getComputedStyle(more).opacity) > 0 && more.getBoundingClientRect().height > 0) : null; return { rootFound: !!root, scFound: !!sc, sh: sc ? sc.scrollHeight : null, ch: sc ? sc.clientHeight : null, top: sc ? sc.scrollTop : null, morePresent: !!more, moreVisible: moreVis, pageScrollY: window.scrollY, docSh: document.documentElement.scrollHeight, innerH: window.innerHeight }; })`;

// ---------- A. Creator @600 then @667 (fresh profile) ----------
for (const H of [600, 667]) {
  await viewport(390, H);
  await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
  await waitStable();
  await cdp.eval(`localStorage.removeItem('tql_state_v1'); localStorage.removeItem('tsq_state_v1'); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn');
  await waitStable();
  note(`creator-initial-${H}`, await cdp.eval(`${WINPROBE}('#creatorScreen')`));
  await shot(`creator-top-390x${H}`);
  // try to scroll the PAGE itself (should be locked)
  await cdp.eval(`window.scrollTo(0, 600); 'ok'`);
  await sleep(300);
  // wheel over the creator window to scroll its content
  await wheelOver(195, 300, 500, 4);
  await waitStable();
  note(`creator-after-wheel-${H}`, await cdp.eval(`${WINPROBE}('#creatorScreen')`));
  await shot(`creator-bottom-390x${H}`);
  note(`creator-confirm-${H}`, await cdp.eval(`(() => { const b = document.getElementById('creatorGo'); const r = b.getBoundingClientRect(); const sc = document.getElementById('creatorScroll'); const atBottom = sc ? (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) : null; return { goRect: [Math.round(r.top), Math.round(r.bottom)], withinViewport: r.top >= 0 && r.bottom <= window.innerHeight, atBottom, pageScrollY: window.scrollY }; })()`));
}
await cdp.eval(`document.getElementById('creatorGo').click(); 'clicked'`);
await waitStable();
note('creator-confirm-click-result', await cdp.eval(`(() => ({ creatorHidden: document.getElementById('creatorScreen').hidden, tutorialVisible: !document.getElementById('tutorial').hidden }))()`));

// ---------- B. Studio window @600 (seeded Lv10) ----------
const BASE = { lang: 'en', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'QA', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await viewport(390, 600);
await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#tab-hero');
await waitStable();
await click('[data-hseg="studio"]');
await waitStable().catch(() => {});
note('studio-open-attempt', await cdp.eval(`(() => { const p = document.getElementById('hsegStudio'); return { exists: !!p, hidden: p ? p.hidden : null, segBtns: [...document.querySelectorAll('[data-hseg]')].map(b => b.getAttribute('data-hseg')) }; })()`));
note('studio-initial-600', await cdp.eval(`${WINPROBE}('#hsegStudio')`));
await shot('studio-top-390x600');
await wheelOver(195, 300, 500, 4);
await waitStable();
note('studio-after-wheel-600', await cdp.eval(`${WINPROBE}('#hsegStudio')`));
await shot('studio-bottom-390x600');

// ---------- C. Map @844 ----------
await viewport(390, 844);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#tab-map');
await waitStable();
note('map-world-discovery', await cdp.eval(`(() => { const box = document.getElementById('mapBox'); const br = box.getBoundingClientRect(); const kids = [...box.querySelectorAll('*')].map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(k => k.w > 380 || k.h > 500).slice(0, 8); return { box: [Math.round(br.left), Math.round(br.top), Math.round(br.width), Math.round(br.height)], bigKids: kids }; })()`));
note('pins-margins', await cdp.eval(`(() => { const pins = [...document.querySelectorAll('#mapBox [data-qid]')].filter(p => p._ll); const rows = pins.map(p => ({ qid: p.dataset.qid, label: (p.getAttribute('aria-label') || '').slice(0, 44), lng: p._ll[0], lat: p._ll[1], xPct: (p._ll[0] - 139.425) * 196.08 / 1, yPct: (35.810 - p._ll[1]) * 434.78 / 1 })); const xs = rows.map(r => (r.lng - 139.425) * 1.9608); const ys = rows.map(r => (35.810 - r.lat) * 4.3478); const by = (k, dir) => rows.slice().sort((a, b) => dir * (a[k] - b[k]))[0]; return { pinCount: rows.length, marginLeftPct: Math.min(...xs).toFixed(1), marginRightPct: (100 - Math.max(...xs)).toFixed(1), marginTopPct: Math.min(...ys).toFixed(1), marginBottomPct: (100 - Math.max(...ys)).toFixed(1), westMost: by('lng', 1), eastMost: by('lng', -1), northMost: by('lat', -1), southMost: by('lat', 1) }; })()`));
await shot('map-default-390x844');
const worldSig = () => cdp.eval(`(() => { const box = document.getElementById('mapBox'); const br = box.getBoundingClientRect(); const els = [...box.querySelectorAll('*')]; let best = null; for (const e of els) { const r = e.getBoundingClientRect(); if (!best || r.width * r.height > best[2] * best[3]) best = [r.left - br.left, r.top - br.top, r.width, r.height]; } return best ? best.map(Math.round).join(',') : ''; })()`);
async function panExtreme(name, dx, dy) {
  let last = '', stable = 0;
  for (let i = 0; i < 16 && stable < 2; i++) {
    await drag(195, 420, 195 + dx, 420 + dy);
    const sig = await worldSig();
    if (sig === last) stable++; else { stable = 0; last = sig; }
  }
  note('pan-' + name, await cdp.eval(`(() => { const box = document.getElementById('mapBox'); const br = box.getBoundingClientRect(); const els = [...box.querySelectorAll('*')]; let best = null; for (const e of els) { const r = e.getBoundingClientRect(); if (!best || r.width * r.height > best.a) best = { l: r.left - br.left, t: r.top - br.top, r: r.right - br.left, b: r.bottom - br.top, a: r.width * r.height }; } return { worldRel: best ? [Math.round(best.l), Math.round(best.t), Math.round(best.r), Math.round(best.b)] : null, boxSize: [Math.round(br.width), Math.round(br.height)] }; })()`));
  await shot('map-extreme-' + name + '-390x844');
}
await panExtreme('west', 260, 0);
await panExtreme('east', -260, 0);
await panExtreme('north', 0, 260);
await panExtreme('south', 0, -260);
// recenter via LOCATE then peripheral click test: east-most pin
await click('#locateBtn').catch(() => {});
await waitStable();
async function clickPin(which) {
  const info = await cdp.eval(`(() => { const pins = [...document.querySelectorAll('#mapBox [data-qid]')].filter(p => p._ll); const sorted = pins.slice().sort((a, b) => (${which === 'east' ? 'b._ll[0]-a._ll[0]' : 'a._ll[0]-b._ll[0]'})); const p = sorted[0]; return { qid: p.dataset.qid, label: (p.getAttribute('aria-label') || '').slice(0, 44) }; })()`);
  // pan until pin center inside mapBox
  for (let i = 0; i < 14; i++) {
    const pos = await cdp.eval(`(() => { const pins = [...document.querySelectorAll('#mapBox [data-qid]')].filter(p => p._ll); const sorted = pins.slice().sort((a, b) => (${which === 'east' ? 'b._ll[0]-a._ll[0]' : 'a._ll[0]-b._ll[0]'})); const p = sorted[0]; const r = p.getBoundingClientRect(); const box = document.getElementById('mapBox').getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), inside: r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom, boxCx: Math.round(box.left + box.width / 2), boxCy: Math.round(box.top + box.height / 2) }; })()`);
    if (pos.inside) {
      await mouse('mousePressed', pos.cx, pos.cy, { buttons: 1, clickCount: 1 });
      await mouse('mouseReleased', pos.cx, pos.cy, { buttons: 0, clickCount: 1 });
      await waitStable();
      const prev = await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`);
      note('pin-click-' + which, { target: info, at: pos, result: prev });
      await shot(`map-pin-${which}-390x844`);
      await cdp.eval(`document.getElementById('pinPreview').hidden = true; 'ok'`).catch(() => {});
      return;
    }
    const dx = Math.max(-240, Math.min(240, pos.boxCx - pos.cx));
    const dy = Math.max(-240, Math.min(240, pos.boxCy - pos.cy));
    await drag(pos.boxCx, pos.boxCy, pos.boxCx + dx, pos.boxCy + dy);
  }
  note('pin-click-' + which, { target: info, result: 'pin never entered viewport after 14 pans' });
}
await clickPin('east');
await clickPin('west');
// FULL MAP
await click('#bigMapBtn').catch(() => click('[data-bigmap]'));
await waitStable();
note('fullmap', await cdp.eval(`(() => { const frame = document.querySelector('.map-frame.expanded') || document.getElementById('mapBox'); const pins = [...document.querySelectorAll('[data-qid]')].filter(p => { const r = p.getBoundingClientRect(); return r.width > 0; }); const clusters = [...document.querySelectorAll('#mapBox .cluster, .map-frame .cluster')]; return { expanded: !!document.querySelector('.map-frame.expanded'), visiblePins: pins.length, bodyLocked: document.body.classList.contains('map-locked') }; })()`));
await shot('map-full-390x844');
// ---------- D. Regression ----------
await cdp.eval(`(() => { const f = document.querySelector('.map-frame.expanded'); if (f) f.classList.remove('expanded'); document.body.classList.remove('map-locked'); const x = document.getElementById('bigMapClose'); if (x) x.click(); return 'ok'; })()`).catch(() => {});
await waitStable();
note('regression-fold', await cdp.eval(`(() => { document.getElementById('mfFoldTab').click(); return { folded: document.getElementById('mapBox').classList.contains('filters-folded') }; })()`));
await click('#tab-list');
await waitStable();
await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('SONIC')); row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
await waitStable();
note('regression-sonic-detail', await cdp.eval(`(() => { const mood = [...document.querySelectorAll('#detail *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('#')); const b = document.getElementById('detailBlurb'); return { chipsMaxRight: Math.max(...mood.map(e => Math.round(e.getBoundingClientRect().right))), blurbClipped: b.scrollHeight > b.clientHeight + 2 }; })()`));
await cdp.eval(`(() => { const x = document.querySelector('#detail .d-close, #detailClose'); if (x) x.click(); return 'ok'; })()`).catch(() => {});
await click('#tab-hero');
await waitStable();
await sleep(2500);
await shot('hero-lv10-street-390x844');

writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done ->', outDir);
