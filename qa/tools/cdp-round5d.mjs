#!/usr/bin/env node
// QA round 5d — true WEST extreme (correct drag direction) + Takao pin click-through.
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
const udd = `/tmp/tsq-r5d-profile-${PORT}`;
rmSync(udd, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch { /* noop */ }
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
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const mouse = (type, x, y, extra = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });
async function drag(x0, y0, x1, y1, steps = 10) {
  await mouse('mousePressed', x0, y0, { buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), { buttons: 1 }); await sleep(25); }
  await mouse('mouseReleased', x1, y1, { buttons: 0, clickCount: 1 });
  await sleep(300);
}
const BASE = { lang: 'en', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'QA', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#tab-map');
await waitStable();
await click('#mapZoomHome');
await waitStable();
const svgRect = () => cdp.eval(`(() => { const svg = document.querySelector('#mapBox .osm-map'); const box = document.getElementById('mapBox'); const r = svg.getBoundingClientRect(), b = box.getBoundingClientRect(); return { l: Math.round(r.left - b.left), t: Math.round(r.top - b.top), r: Math.round(r.right - b.left), b: Math.round(r.bottom - b.top), w: Math.round(r.width) }; })()`);
note('home-state', await svgRect());
// pan WEST: finger moves RIGHT (content follows finger, view travels west)
let last = '', stable = 0;
for (let i = 0; i < 30 && stable < 3; i++) {
  await drag(45, 420, 345, 420);
  const z = await svgRect();
  const sig = z.l + ',' + z.t;
  if (sig === last) stable++; else { stable = 0; last = sig; }
  if (z.l >= -2) break;
}
note('west-extreme-final', await svgRect());
await shot('map-west-final-390x844');
note('takao-at-west', await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); if (!p) return 'absent'; const r = p.getBoundingClientRect(); return { display: getComputedStyle(p).display, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; })()`));
// zoom in twice to decluster, re-pan west to edge
await click('#mapZoomIn'); await sleep(400);
await click('#mapZoomIn'); await sleep(400);
last = ''; stable = 0;
for (let i = 0; i < 30 && stable < 3; i++) {
  await drag(45, 420, 345, 420);
  const z = await svgRect();
  const sig = z.l + ',' + z.t;
  if (sig === last) stable++; else { stable = 0; last = sig; }
  if (z.l >= -2) break;
}
note('west-extreme-zoomin', await svgRect());
note('takao-after-zoom', await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); if (!p) return 'absent'; const r = p.getBoundingClientRect(); return { display: getComputedStyle(p).display, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; })()`));
await shot('map-west-zoomin-390x844');
const tp = await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); if (!p || getComputedStyle(p).display === 'none') return null; const r = p.getBoundingClientRect(); if (r.width === 0 || r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) return null; return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; })()`);
if (tp) {
  await mouse('mousePressed', tp.cx, tp.cy, { buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', tp.cx, tp.cy, { buttons: 0, clickCount: 1 });
  await waitStable();
  note('takao-click', await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`));
  await shot('map-pin-takao-390x844');
} else {
  note('takao-click', { result: 'pin still not clickable-visible after zoom-in at west edge' });
}
writeFileSync(resolve(outDir, 'probes5d.json'), JSON.stringify({ tag: TAG + 'd', generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done 5d');
