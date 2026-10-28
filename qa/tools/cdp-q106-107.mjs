#!/usr/bin/env node
// QA filing probes for Zoe's device reports 2026-10-28 22:49/22:50 —
//  Q-106: list header — player title line overlapped by the ticket pill
//  Q-107: hero street — konbini sits immediately beside the hero (gap measure)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9600 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-q106';
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
const udd = `/tmp/tsq-q106-profile-${PORT}`;
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
async function shot(name, clip) {
  await waitStable(); await sleep(250);
  const params = { format: 'png', fromSurface: true };
  if (clip) params.clip = { x: clip[0], y: clip[1], width: clip[2], height: clip[3], scale: 2 };
  const { data } = await cdp.send('Page.captureScreenshot', params);
  writeFileSync(resolve(outDir, `${TAG}-${name}.png`), Buffer.from(data, 'base64'));
  console.log('[shot]', name);
}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const BASE = { muted: true, font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 30, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(extra) {
  await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
  await waitStable();
  const st = { ...BASE, ...extra };
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(st))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn');
  await waitStable();
}
const HDR = `(() => { const pill = document.querySelector('#view-list .ticket-pill'); const cand = [...document.querySelectorAll('#view-list *')].filter(e => e.children.length === 0 && e.getBoundingClientRect().top < 200 && e.textContent.trim().length > 3 && !e.closest('button')); const titleEl = cand.map(e => ({ e, r: e.getBoundingClientRect() })).filter(x => x.r.width > 60 && x.r.top > 30).sort((a, b) => a.r.top - b.r.top)[1] || cand.map(e => ({ e, r: e.getBoundingClientRect() }))[0]; if (!pill) return { pill: 'absent' }; const pr = pill.getBoundingClientRect(); const out = { pillRect: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.right), Math.round(pr.bottom)] }; if (titleEl) { const tr = titleEl.e.getBoundingClientRect(); out.titleText = titleEl.e.textContent.trim(); out.titleRect = [Math.round(tr.left), Math.round(tr.top), Math.round(tr.right), Math.round(tr.bottom)]; out.titleSw = titleEl.e.scrollWidth; out.titleCw = titleEl.e.clientWidth; out.overlapPx = Math.max(0, Math.min(out.titleRect[2], out.pillRect[2]) - Math.max(out.titleRect[0], out.pillRect[0])); out.sameRow = Math.abs(out.titleRect[1] - out.pillRect[1]) < 26; } return out; })()`;

// Q-106 matrix
for (const [lang, theme, xp, tag] of [['ja', 'midnight', 0, 'ja-night-lv1'], ['ja', 'emerald', 0, 'ja-day-lv1'], ['en', 'midnight', 0, 'en-night-lv1'], ['zh', 'midnight', 0, 'zh-night-lv1'], ['ja', 'midnight', 19500, 'ja-night-lv30']]) {
  await boot({ lang, theme, bonusExp: xp });
  await click('#tab-list');
  await waitStable();
  note('hdr-' + tag, await cdp.eval(HDR));
  if (tag === 'ja-night-lv1') await shot('hdr-ja-night-lv1', [0, 0, 390, 200]);
}
// Q-107 konbini gap
for (const [theme, xp, tag] of [['midnight', 1200, 'night-lv10'], ['emerald', 1200, 'day-lv10'], ['emerald', 0, 'day-lv1'], ['emerald', 19500, 'day-lv30']]) {
  await boot({ lang: 'ja', theme, bonusExp: xp });
  await click('#tab-hero');
  await waitStable();
  await sleep(2500);
  note('konbini-' + tag, await cdp.eval(`(() => { const k = document.querySelector('#view-hero .sp-konbini'); const h = document.getElementById('walkCanvas'); if (!k || !h) return { found: !!k }; const kr = k.getBoundingClientRect(), hr = h.getBoundingClientRect(); return { konbini: [Math.round(kr.left), Math.round(kr.top), Math.round(kr.right), Math.round(kr.bottom)], hero: [Math.round(hr.left), Math.round(hr.top), Math.round(hr.right), Math.round(hr.bottom)], gapPx: Math.round(hr.left - kr.right), konbiniW: Math.round(kr.width), heroW: Math.round(hr.width) }; })()`));
  if (tag === 'night-lv10') await shot('street-night-lv10');
}
writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done');
