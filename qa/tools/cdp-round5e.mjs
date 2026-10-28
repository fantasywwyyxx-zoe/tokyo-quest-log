#!/usr/bin/env node
// QA round 5e — far-west cluster path + Takao pin click-through at zoom.
// At fit zoom clustered pins are display:none by design (.pin.is-clustered);
// the cluster badge opens the group's first quest preview. Zooming in
// (.is-zoomed) declusters: individual pins become tappable.
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
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 600)); };

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
const udd = `/tmp/tsq-r5e-profile-${PORT}`;
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
async function panUntil(axis, pred, max = 30) {
  const rect = () => cdp.eval(`(() => { const svg = document.querySelector('#mapBox .osm-map'); const box = document.getElementById('mapBox'); const r = svg.getBoundingClientRect(), b = box.getBoundingClientRect(); return { l: Math.round(r.left - b.left), b: Math.round(r.bottom - b.top) }; })()`);
  let last = '', stable = 0;
  for (let i = 0; i < max && stable < 3; i++) {
    if (axis === 'west') await drag(45, 420, 345, 420); else await drag(195, 640, 195, 240);
    const z = await rect();
    if (pred(z)) return z;
    const sig = axis === 'west' ? '' + z.l : '' + z.b;
    if (sig === last) stable++; else { stable = 0; last = sig; }
  }
  return rect();
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
await panUntil('west', z => z.l >= -2);
await panUntil('south', () => false);
note('sw-view-clusters', await cdp.eval(`(() => { const tak = document.querySelector('#mapBox [data-qid="eg4-takao"]'); const cls = [...document.querySelectorAll('#mapBox .cluster-pin')].map(c => { const r = c.getBoundingClientRect(); return { label: c.getAttribute('aria-label'), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width)], inView: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }); return { takaoClass: tak ? tak.className : 'absent', takaoDisplay: tak ? getComputedStyle(tak).display : null, clusters: cls }; })()`));
await shot('map-sw-clusters-390x844');
// click the westernmost in-view cluster
const cl = await cdp.eval(`(() => { const cs = [...document.querySelectorAll('#mapBox .cluster-pin')].map(c => { const r = c.getBoundingClientRect(); return { c, r }; }).filter(x => x.r.width > 0 && x.r.left >= 0 && x.r.top >= 0 && x.r.right <= innerWidth && x.r.bottom <= innerHeight).sort((a, b) => a.r.left - b.r.left); if (!cs.length) return null; const { r } = cs[0]; return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; })()`);
if (cl) {
  await mouse('mousePressed', cl.cx, cl.cy, { buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', cl.cx, cl.cy, { buttons: 0, clickCount: 1 });
  await waitStable();
  note('west-cluster-click', await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`));
  await cdp.eval(`document.getElementById('pinPreview').hidden = true; 'ok'`);
}
// zoom in to decluster, then center Takao
await click('#mapZoomIn'); await sleep(450);
await click('#mapZoomIn'); await sleep(450);
let done = null;
for (let i = 0; i < 24; i++) {
  const pos = await cdp.eval(`(() => { const p = document.querySelector('#mapBox [data-qid="eg4-takao"]'); if (!p) return 'absent'; const r = p.getBoundingClientRect(); const box = document.getElementById('mapBox').getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), disp: getComputedStyle(p).display, zoomed: document.getElementById('mapBox').classList.contains('is-zoomed'), inside: r.width > 0 && r.left >= box.left + 2 && r.right <= box.right - 2 && r.top >= box.top + 2 && r.bottom <= box.bottom - 2 }; })()`);
  if (pos === 'absent') { done = 'pin absent'; break; }
  if (i % 6 === 0 || pos.inside) console.log(' iter', i, JSON.stringify(pos));
  if (pos.disp !== 'none' && pos.inside) {
    await mouse('mousePressed', pos.cx, pos.cy, { buttons: 1, clickCount: 1 });
    await mouse('mouseReleased', pos.cx, pos.cy, { buttons: 0, clickCount: 1 });
    await waitStable();
    done = await cdp.eval(`(() => { const pv = document.getElementById('pinPreview'); return { previewHidden: pv.hidden, name: document.getElementById('ppName').textContent.trim() }; })()`);
    await shot('map-pin-takao-390x844');
    break;
  }
  const dx = Math.max(-240, Math.min(240, 195 - pos.cx));
  const dy = Math.max(-240, Math.min(240, 422 - pos.cy));
  const sx = dx > 0 ? 45 : 345, sy = dy > 0 ? 220 : 620;
  await drag(sx, sy, sx + dx, sy + dy);
  if (i === 23) done = 'not centered: ' + JSON.stringify(pos);
}
note('takao-click-final', { result: done });
writeFileSync(resolve(outDir, 'probes5e.json'), JSON.stringify({ tag: TAG + 'e', generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done 5e');
