#!/usr/bin/env node
// QA round 5b (follow-up probes for f1e44f5) —
//  1. Studio window @390x600 via [data-openwin="studio"]
//  2. Pin census: true-projection out-of-extent pins + clamped render positions
//  3. True map extremes tracked on the .osm-map svg rect (not the backdrop)
//  4. Peripheral clicks done right: Takao (west edge) + Kasai (south-east)
//  5. FULL MAP fit: RESET/min-zoom -> whole extent in one screen?
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9600 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-r5';
const outDir = resolve(ROOT, `qa/shots/${TAG}`);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probes = [];
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 800)); };

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
const udd = `/tmp/tsq-r5b-profile-${PORT}`;
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
async function drag(x0, y0, x1, y1, steps = 12) {
  await mouse('mousePressed', x0, y0, { buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), { buttons: 1 }); await sleep(30); }
  await mouse('mouseReleased', x1, y1, { buttons: 0, clickCount: 1 });
  await sleep(350);
}
const BASE = { lang: 'en', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'QA', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await viewport(390, 600);
await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();

// ---- 1. Studio @600 ----
await click('#tab-hero');
await waitStable();
await click('[data-openwin="studio"]');
await waitStable();
const WINPROBE = `((rootSel) => { const root = document.querySelector(rootSel); const sc = root ? (root.classList.contains('win-scroller') ? root : root.querySelector('.win-scroller')) : null; const more = root ? root.querySelector('.win-more') : null; const moreVis = more ? (getComputedStyle(more).display !== 'none' && Number(getComputedStyle(more).opacity) > 0 && more.getBoundingClientRect().height > 0) : null; return { hidden: root ? root.hidden : null, sh: sc ? sc.scrollHeight : null, ch: sc ? sc.clientHeight : null, top: sc ? sc.scrollTop : null, moreVisible: moreVis, pageScrollY: window.scrollY }; })`;
note('studio-initial-600', await cdp.eval(`${WINPROBE}('#hsegStudio')`));
await shot('studio-top-390x600');
for (let i = 0; i < 4; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 300, deltaX: 0, deltaY: 500 }); await sleep(220); }
await waitStable();
note('studio-after-wheel-600', await cdp.eval(`${WINPROBE}('#hsegStudio')`));
await shot('studio-bottom-390x600');
await click('#hsegStudio [data-closewin]');
await waitStable();

// ---- Map @844 ----
await viewport(390, 844);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#tab-map');
await waitStable();
// ---- 2. Pin census ----
note('pin-census', await cdp.eval(`(() => { const pins = [...document.querySelectorAll('#mapBox [data-qid]')].filter(p => p._ll); const rows = pins.map(p => { const x = (p._ll[0] - 139.425) * 196.08, y = (35.810 - p._ll[1]) * 434.78; return { qid: p.dataset.qid, label: (p.getAttribute('aria-label') || '').replace('Quest: ', ''), x: +x.toFixed(1), y: +y.toFixed(1), styleL: p.style.left, styleT: p.style.top }; }); const out = rows.filter(r => r.x < 0 || r.x > 100 || r.y < 0 || r.y > 100); const inside = rows.filter(r => !(r.x < 0 || r.x > 100 || r.y < 0 || r.y > 100)); const mIn = { l: Math.min(...inside.map(r => r.x)), r: 100 - Math.max(...inside.map(r => r.x)), t: Math.min(...inside.map(r => r.y)), b: 100 - Math.max(...inside.map(r => r.y)) }; return { total: rows.length, outCount: out.length, out: out, insideMarginsPct: { left: +mIn.l.toFixed(1), right: +mIn.r.toFixed(1), top: +mIn.t.toFixed(1), bottom: +mIn.b.toFixed(1) } }; })()`));
// ---- 3. True extremes via osm svg rect ----
const svgSig = () => cdp.eval(`(() => { const svg = document.querySelector('#mapBox .osm-map'); const box = document.getElementById('mapBox'); if (!svg || !box) return ''; const r = svg.getBoundingClientRect(), b = box.getBoundingClientRect(); return [Math.round(r.left - b.left), Math.round(r.top - b.top), Math.round(r.right - b.left), Math.round(r.bottom - b.top)].join(','); })()`);
async function panExtreme(name, dx, dy) {
  let last = '', stable = 0;
  for (let i = 0; i < 22 && stable < 2; i++) {
    await drag(195, 420, 195 + dx, 420 + dy);
    const sig = await svgSig();
    if (sig === last) stable++; else { stable = 0; last = sig; }
  }
  note('true-extreme-' + name, { svgRel: last });
  await shot('map-true-extreme-' + name + '-390x844');
}
await panExtreme('west', 280, 0);
// ---- 4a. Takao click at west edge ----
note('takao-pin-state', await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); if (!p) return 'absent'; const r = p.getBoundingClientRect(); return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], display: getComputedStyle(p).display, visibility: getComputedStyle(p).visibility }; })()`));
const tak = await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); const r = p.getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; })()`);
if (tak.cx > 0 && tak.cy > 0) {
  await mouse('mousePressed', tak.cx, tak.cy, { buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', tak.cx, tak.cy, { buttons: 0, clickCount: 1 });
  await waitStable();
  note('takao-click', await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`));
  await shot('map-pin-takao-390x844');
  await cdp.eval(`document.getElementById('pinPreview').hidden = true; 'ok'`);
}
await panExtreme('east', -280, 0);
await panExtreme('north', 0, 280);
await panExtreme('south', 0, -280);
// ---- 4b. Kasai click ----
note('kasai-pin-find', await cdp.eval(`(() => { const ps = [...document.querySelectorAll('#mapBox [data-qid]')].filter(p => (p.getAttribute('aria-label') || '').includes('Kasai')); return ps.map(p => ({ qid: p.dataset.qid, label: p.getAttribute('aria-label') })); })()`));
for (let i = 0; i < 16; i++) {
  const pos = await cdp.eval(`(() => { const p = [...document.querySelectorAll('#mapBox [data-qid]')].find(p => (p.getAttribute('aria-label') || '').includes('Kasai Rinkai')); if (!p) return 'absent'; const r = p.getBoundingClientRect(); const box = document.getElementById('mapBox').getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), w: Math.round(r.width), inside: r.width > 0 && r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom, boxCx: Math.round(box.left + box.width / 2), boxCy: Math.round(box.top + box.height / 2) }; })()`);
  if (pos === 'absent') { note('kasai-click', { result: 'pin absent' }); break; }
  if (pos.inside) {
    await mouse('mousePressed', pos.cx, pos.cy, { buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', pos.cx, pos.cy, { buttons: 0, clickCount: 1 });
    await waitStable();
    note('kasai-click', await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`));
    await shot('map-pin-kasai-390x844');
    break;
  }
  const dx = Math.max(-260, Math.min(260, pos.boxCx - pos.cx));
  const dy = Math.max(-260, Math.min(260, pos.boxCy - pos.cy));
  await drag(pos.boxCx, pos.boxCy, pos.boxCx + dx, pos.boxCy + dy);
  if (i === 15) note('kasai-click', { result: 'never entered viewport' });
}
// ---- 5. FULL MAP fit ----
await cdp.eval(`document.getElementById('pinPreview').hidden = true; 'ok'`).catch(() => {});
await click('#fullMapBtn').catch(() => {});
await waitStable();
note('fullmap-open-state', await cdp.eval(`(() => ({ bodyLocked: document.body.classList.contains('map-locked'), zoomLabel: (document.querySelector('.map-frame [data-zoomlabel], #bigMapZoom, .zoom-label') || {}).textContent || '', btns: [...document.querySelectorAll('button')].filter(b => /RESET|FULL MAP/i.test(b.textContent)).map(b => ({ id: b.id, text: b.textContent.trim().slice(0, 20), visible: b.getBoundingClientRect().width > 0 })) }))()`));
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /RESET/i.test(b.textContent) && b.getBoundingClientRect().width > 0); if (b) b.click(); return b ? 'reset-clicked' : 'no-reset'; })()`);
await waitStable();
note('fullmap-after-reset', await cdp.eval(`(() => { const svg = document.querySelector('.osm-map'); const r = svg.getBoundingClientRect(); return { svgRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], viewport: [window.innerWidth, window.innerHeight], fitsWidth: r.left >= -2 && r.right <= window.innerWidth + 2, fitsHeight: r.top >= -2 && r.bottom <= window.innerHeight + 2 }; })()`));
await shot('map-full-fit-390x844');

writeFileSync(resolve(outDir, 'probes5b.json'), JSON.stringify({ tag: TAG + 'b', generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done 5b');
