#!/usr/bin/env node
// QA round 4 (2026-10-28, target commit 78b2e85) —
//  Q-105R: full-catalog (134 rows) meta truncation measurement + SONIC/Solo samples
//  Scene props: Lv1 (new) / Lv10 / Lv30 day+night inventories vs unlock tables,
//    walking-lane check, night-dimming consistency
//  Regression spot-check: filter fold + SONIC detail
// Shots + probes.json -> qa/shots/2026-10-28-r4/
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const PORT = 9600 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-r4';
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
const udd = `/tmp/tsq-r4-profile-${PORT}`;
rmSync(udd, { recursive: true, force: true });
const proc = spawn(CHROME, ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const BASE = { lang: 'en', muted: true, theme: 'auto', font: 'rounded', hero: 'aoi', custom: null, name: 'QA', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 0, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function bootSeed(extra) {
  await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
  await waitStable();
  const st = { ...BASE, ...extra };
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(st))}); localStorage.removeItem('tsq_state_v1'); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await cdp.eval(`document.getElementById('startBtn').click(); 'ok'`);
  await waitStable();
}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' }); e.click(); return 'ok'; })()`);
const INVENTORY = `(() => { const layer = document.getElementById('sceneProps'); const all = [...document.querySelectorAll('#view-hero .sp')]; const ids = all.map(e => { const m = String(e.className).match(/sp-([a-z0-9-]+)/); return m ? m[1] : e.className; }); const counts = {}; ids.forEach(i => counts[i] = (counts[i] || 0) + 1); const stage = document.getElementById('hsScene'); const sr = stage ? stage.getBoundingClientRect() : null; const hero = document.getElementById('walkCanvas'); const hr = hero ? hero.getBoundingClientRect() : null; const lvEl = document.getElementById('advLv') || document.getElementById('heroLv'); return { lvText: lvEl ? lvEl.textContent.trim() : '', uniqueSp: Object.keys(counts).sort(), counts, totalSpEls: all.length, stageRect: sr ? [Math.round(sr.top), Math.round(sr.bottom), Math.round(sr.height)] : null, heroRect: hr ? [Math.round(hr.left), Math.round(hr.top), Math.round(hr.width), Math.round(hr.height)] : null, layerFilter: layer ? getComputedStyle(layer).filter : '', layerOpacity: layer ? getComputedStyle(layer).opacity : '' }; })()`;
async function heroScene(name, waitMs = 3500) {
  await click('#tab-hero');
  await waitStable();
  await sleep(waitMs); // let the runner stream settle into a representative arrangement
  const inv = await cdp.eval(INVENTORY);
  note('inventory-' + name, inv);
  await shot('hero-' + name + '-390x844');
  return inv;
}

// ---------- Lv30 day: full street (also used for meta + regression) ----------
await bootSeed({ bonusExp: 19500, sceneSeen: 30, theme: 'emerald' });
const inv30d = await heroScene('lv30-day');
// ---------- Lv30 night ----------
await bootSeed({ bonusExp: 19500, sceneSeen: 30, theme: 'midnight' });
const inv30n = await heroScene('lv30-night');
note('night-dimming-compare', await cdp.eval(`(() => { const pick = id => { const e = document.querySelector('#view-hero .sp-' + id); return e ? { filter: getComputedStyle(e).filter, opacity: getComputedStyle(e).opacity } : 'absent'; }; const scene = document.getElementById('hsScene'); return { sceneFilter: scene ? getComputedStyle(scene).filter : '', konbini: pick('konbini'), skytree: pick('skytree'), planter: pick('planter') }; })()`));
// ---------- Lv10 ----------
await bootSeed({ bonusExp: 1200, sceneSeen: 10, theme: 'emerald' });
await heroScene('lv10-day');
// ---------- Lv1 new profile ----------
await cdp.send('Page.navigate', { url: 'file://' + resolve(ROOT, 'index.html') });
await waitStable();
await cdp.eval(`localStorage.removeItem('tql_state_v1'); localStorage.removeItem('tsq_state_v1'); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn');
await waitStable();
await click('#creatorGo');
await sleep(2800);
await cdp.eval(`(() => { const t = document.getElementById('tutorial'); const s = document.getElementById('tutSkip'); if (t && !t.hidden && s) s.click(); return 'ok'; })()`);
await waitStable();
await heroScene('lv1-new');
// ---------- Q-105R full catalog meta measurement (Lv1 seed fine) ----------
await click('#tab-list');
await waitStable();
note('meta-full-catalog', await cdp.eval(`(() => { const rows = [...document.querySelectorAll('#view-list .ms-row')]; const res = rows.map(r => { const meta = r.querySelector('.ms-meta'); const name = r.querySelector('.ms-name-t'); if (!meta) return null; const lh = parseFloat(getComputedStyle(meta).lineHeight) || 15; const lines = Math.round(meta.getBoundingClientRect().height / lh); return { name: name ? name.textContent.trim().slice(0, 26) : '', metaLines: lines, metaClipped: meta.scrollHeight > meta.clientHeight + 2, metaFont: getComputedStyle(meta).fontSize, rowH: Math.round(r.getBoundingClientRect().height) }; }).filter(Boolean); const clipped = res.filter(x => x.metaClipped); const threePlus = res.filter(x => x.metaLines >= 3); const heights = res.map(x => x.rowH).sort((a, b) => a - b); return { rows: res.length, clippedCount: clipped.length, clipped: clipped.slice(0, 5), threeLineCount: threePlus.length, threeLine: threePlus, rowHMin: heights[0], rowHMedian: heights[Math.floor(heights.length / 2)], rowHMax: heights[heights.length - 1] }; })()`));
for (const q of ['SONIC', 'Solo Leveling']) {
  const r = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(x => x.textContent.includes(${JSON.stringify(q)})); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  console.log(' sample', q, r);
  await waitStable();
  await shot(`list-sample-${q === 'SONIC' ? 'sonic' : 'solo'}-390x844`);
  note('meta-sample-' + q, await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(x => x.textContent.includes(${JSON.stringify(q)})); const meta = row.querySelector('.ms-meta'); const lh = parseFloat(getComputedStyle(meta).lineHeight) || 15; return { metaText: meta.textContent.trim(), lines: Math.round(meta.getBoundingClientRect().height / lh), font: getComputedStyle(meta).fontSize, clipped: meta.scrollHeight > meta.clientHeight + 2, rowH: Math.round(row.getBoundingClientRect().height) }; })()`));
}
// ---------- Regression: fold bar + SONIC detail ----------
await click('#tab-map');
await waitStable();
note('regression-fold', await cdp.eval(`(() => { const before = document.getElementById('mapBox').classList.contains('filters-folded'); document.getElementById('mfFoldTab').click(); return { before: before }; })()`));
await waitStable();
note('regression-fold-after', await cdp.eval(`(() => ({ folded: document.getElementById('mapBox').classList.contains('filters-folded'), chipsVisible: [...document.querySelectorAll('#mapFilters [data-mf]')].filter(c => c.getBoundingClientRect().width > 0).length }))()`));
await click('#tab-list');
const sonic = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('SONIC')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' regression sonic detail:', sonic);
await waitStable();
note('regression-sonic-detail', await cdp.eval(`(() => { const mood = [...document.querySelectorAll('#detail *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('#')); const b = document.getElementById('detailBlurb'); return { chipsMaxRight: Math.max(...mood.map(e => Math.round(e.getBoundingClientRect().right))), blurbClipped: b.scrollHeight > b.clientHeight + 2 }; })()`));

writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done ->', outDir);
