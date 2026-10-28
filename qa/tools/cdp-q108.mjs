#!/usr/bin/env node
// QA filing probe Q-108 (Zoe device report 2026-10-28 22:53) —
// Records window tab switching (titles / badges / adventure log) "feels strange":
// sample layout over time during switches: panel rect, tab-bar position, content
// scroll, opacity/transform — look for jumps, flashes, reflow.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9700 + Math.floor(Math.random() * 200);
const TAG = '2026-10-28-q108';
const outDir = resolve(ROOT, `qa/shots/${TAG}`);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probes = [];
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 900)); };

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
const udd = `/tmp/tsq-q108-profile-${PORT}`;
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
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(resolve(outDir, `${TAG}-${name}.png`), Buffer.from(data, 'base64'));
  console.log('[shot]', name);
}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 0, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#tab-hero');
await waitStable();
await click('[data-openwin="records"]');
await waitStable();
note('records-structure', await cdp.eval(`(() => { const panel = document.querySelector('#view-hero .hero-win:not([hidden])'); const tabs = [...document.querySelectorAll('.rec-tab')].map(t => ({ key: t.getAttribute('data-rectab') || t.textContent.trim(), label: t.textContent.trim(), active: t.classList.contains('is-active') || t.getAttribute('aria-pressed') })); return { panelId: panel ? panel.id : null, tabs }; })()`));
// install a rAF sampler recording layout every frame for the next switches
await cdp.eval(`(() => { window.__q108 = []; const panel = document.querySelector('#view-hero .hero-win:not([hidden])'); const bar = document.querySelector('.rec-tabs'); const body = panel ? panel.querySelector('.rec-body') || panel : null; let t0 = performance.now(); function frame() { const pr = panel.getBoundingClientRect(); const br = bar ? bar.getBoundingClientRect() : null; const first = body && body.children.length ? body.querySelector(':scope > *:not(.rec-tabs)') : null; const fr = first ? first.getBoundingClientRect() : null; window.__q108.push({ t: Math.round(performance.now() - t0), panelTop: Math.round(pr.top), panelH: Math.round(pr.height), barTop: br ? Math.round(br.top) : null, panelScroll: panel.scrollTop, bodyScrollH: panel.scrollHeight, firstTop: fr ? Math.round(fr.top) : null, firstOpacity: first ? getComputedStyle(first).opacity : null, textLen: panel.innerText.length }); if (performance.now() - t0 < 2600) requestAnimationFrame(frame); } requestAnimationFrame(frame); return 'sampling'; })()`);
await sleep(150);
for (const key of ['badges', 'advlog', 'status']) {
  const r = await cdp.eval(`(() => { const t = [...document.querySelectorAll('.rec-tab')].find(x => (x.getAttribute('data-rectab') || '') === ${JSON.stringify(key)} || x.textContent.trim().length > 0 && ${JSON.stringify(key)} === 'x'); if (t) { t.click(); return 'clicked-' + (t.getAttribute('data-rectab') || t.textContent.trim()); } return 'tab-missing'; })()`);
  console.log(' switch->', key, r);
  await sleep(700);
  await shot('tab-' + key);
}
await sleep(600);
note('switch-trace', await cdp.eval(`(() => { const s = window.__q108 || []; const jumps = []; for (let i = 1; i < s.length; i++) { const dBar = Math.abs((s[i].barTop ?? 0) - (s[i - 1].barTop ?? 0)); const dFirst = Math.abs((s[i].firstTop ?? 0) - (s[i - 1].firstTop ?? 0)); const dH = Math.abs(s[i].bodyScrollH - s[i - 1].bodyScrollH); if (dBar > 2 || dFirst > 30 || dH > 40) jumps.push({ t: s[i].t, dBar, dFirst, dH, textLen: s[i].textLen }); } return { frames: s.length, jumpEvents: jumps.slice(0, 14), firstFrame: s[0], lastFrame: s[s.length - 1] }; })()`));
note('per-tab-geometry', await cdp.eval(`(() => { const panel = document.querySelector('#view-hero .hero-win:not([hidden])'); return { panelRect: (() => { const r = panel.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; })(), scrollH: panel.scrollHeight, clientH: panel.clientHeight }; })()`));
writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done');
