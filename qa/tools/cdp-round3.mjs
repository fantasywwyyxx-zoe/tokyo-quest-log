#!/usr/bin/env node
// QA round 3 (2026-10-28, target commit 1ce937c) — retests:
//  Q-102/Q-103 EN SONIC detail @390x844 + true 390x667
//  Q-105 EN list @390 (SONIC two-line name, LEGEND rows)
//  Filter bar fold: folded strip contents, expanded chip bbox vs r2,
//    FULL MAP fold, fold-state persistence across view switches
//  LEGEND route current-checkpoint meta wrap (Sumida sample)
// Shots + probes.json -> qa/shots/2026-10-28-r3/
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const PORT = 9500 + Math.floor(Math.random() * 300);
const TAG = '2026-10-28-r3';
const outDir = resolve(ROOT, `qa/shots/${TAG}`);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probes = [];
const note = (name, data) => { probes.push({ name, ...data }); console.log('[probe]', name, JSON.stringify(data).slice(0, 500)); };

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
const udd = `/tmp/tsq-r3-profile-${PORT}`;
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
const CHIPS = `(() => [...document.querySelectorAll('#mapFilters [data-mf]')].map(c => { const r = c.getBoundingClientRect(); return { mf: c.getAttribute('data-mf'), text: c.textContent.trim(), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], visible: r.width > 0 && getComputedStyle(c).display !== 'none' }; }))()`;
const FOLD = `(() => { const box = document.getElementById('mapBox'); const tab = document.getElementById('mfFoldTab'); const bar = document.getElementById('mapFilters'); const br = bar.getBoundingClientRect(); return { folded: box.classList.contains('filters-folded'), tabText: tab ? tab.textContent : '', ariaExpanded: tab ? tab.getAttribute('aria-expanded') : '', barRect: [Math.round(br.left), Math.round(br.top), Math.round(br.width), Math.round(br.height)], sideTag: document.getElementById('mapSideTag') ? document.getElementById('mapSideTag').textContent.trim() : '', count: document.getElementById('mapCount') ? document.getElementById('mapCount').textContent.trim() : '', barText: bar.innerText.replace(/\\s+/g, ' ').slice(0, 120) }; })()`;

// ---------- A) EN @390x844 ----------
await setVp(390, 844);
await boot('en');
await shot('en-map-expanded-390x844');
note('chips-expanded-initial', { chips: await cdp.eval(CHIPS) });
note('fold-initial', await cdp.eval(FOLD));
console.log(' fold tab click:', await click('#mfFoldTab'));
await shot('en-map-folded-390x844');
note('fold-after-fold', await cdp.eval(FOLD));
// tap the folded strip itself to expand (not the tab)
const stripTap = await cdp.eval(`(() => { const mark = document.querySelector('#mapFilters .mf-mark'); const strip = mark ? (mark.closest('[class*=strip]') || mark.parentElement) : null; if (!strip) return 'no-strip'; strip.click(); return 'clicked-strip:' + strip.className; })()`);
console.log(' strip tap:', stripTap);
await waitStable();
note('fold-after-strip-tap', await cdp.eval(FOLD));
note('chips-expanded-after-unfold', { chips: await cdp.eval(CHIPS) });
// persistence: fold again, switch to list, back to map
await click('#mfFoldTab');
await click('#tab-list');
await waitStable();
await click('#tab-map');
await waitStable();
note('fold-after-view-roundtrip', await cdp.eval(FOLD));
await shot('en-map-folded-after-roundtrip-390x844');
await click('#mfFoldTab'); // expand again
// FULL MAP fold
console.log(' expand big map:', await click('#mapExpandBtn'));
await waitStable();
await shot('en-bigmap-expanded-390x844');
note('fold-bigmap-expanded', await cdp.eval(FOLD));
console.log(' bigmap fold tab:', await click('#mfFoldTab'));
await shot('en-bigmap-folded-390x844');
note('fold-bigmap-folded', await cdp.eval(FOLD));
console.log(' close big map:', await click('#bigMapClose'));
await waitStable();
note('fold-after-bigmap-close', await cdp.eval(FOLD));
await click('#mfFoldTab').catch(() => {}); // restore expanded if left folded

// Q-105 list
await click('#tab-list');
await shot('en-list-390x844');
note('list-names-en', await cdp.eval(`(() => { const rows = [...document.querySelectorAll('#view-list .ms-row')]; const sample = rows.slice(0, 8).map(r => { const s = r.querySelector('.ms-name-t'); if (!s) return null; const sr = s.getBoundingClientRect(); return { cls: r.className.replace('ms-row ', ''), text: s.textContent.trim().slice(0, 34), sw: s.scrollWidth, cw: s.clientWidth, h: Math.round(sr.height), lines: Math.round(sr.height / parseFloat(getComputedStyle(s).lineHeight || 18)) }; }); return { total: rows.length, sample }; })()`));
// SONIC detail Q-102/Q-103 @844
const sonic = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('SONIC')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' sonic:', sonic);
await shot('en-detail-sonic-390x844');
note('sonic-detail-844', await cdp.eval(`(() => { const card = document.querySelector('#detail .win, #detail .detail-win'); const cr = card ? card.getBoundingClientRect() : null; const mood = [...document.querySelectorAll('#detail *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('#')); const b = document.getElementById('detailBlurb'); return { cardRight: cr ? Math.round(cr.right) : null, moodChips: mood.map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], insideCard: cr ? (r.right <= cr.right + 1 && r.left >= cr.left - 1) : null, insideViewport: r.right <= innerWidth + 1 }; }), blurbSh: b.scrollHeight, blurbCh: b.clientHeight, blurbClipped: b.scrollHeight > b.clientHeight + 2, blurbTail: b.textContent.slice(-26) }; })()`));
await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d.open) d.close(); document.getElementById('detailClose')?.click(); return 'ok'; })()`);
await waitStable();
// Sumida legend meta wrap
const sumida = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('Sumida')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' sumida:', sumida);
await shot('en-legend-sumida-390x844');
note('sumida-meta', await cdp.eval(`(() => { const metas = [...document.querySelectorAll('[class*=lg-meta]')].filter(e => e.getBoundingClientRect().width > 0); return metas.slice(0, 5).map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent.trim().slice(0, 44), sw: e.scrollWidth, cw: e.clientWidth, h: Math.round(r.height), clipped: e.scrollWidth > e.clientWidth + 2 }; }); })()`));
await click('#legendClose').catch(() => {});
await waitStable();

// ---------- B) EN @390x667 SONIC detail (true-height judgment) ----------
await setVp(390, 667);
await boot('en');
await click('#tab-list');
const sonic2 = await cdp.eval(`(() => { const row = [...document.querySelectorAll('#view-list .ms-row')].find(r => r.textContent.includes('SONIC')); if (!row) return 'no-row'; row.scrollIntoView({ block: 'center' }); row.click(); return 'ok'; })()`);
console.log(' sonic667:', sonic2);
await shot('en-detail-sonic-390x667');
note('sonic-detail-667', await cdp.eval(`(() => { const mood = [...document.querySelectorAll('#detail *')].filter(e => e.children.length === 0 && e.textContent.trim().startsWith('#')); const b = document.getElementById('detailBlurb'); const br = b.getBoundingClientRect(); const btn = document.getElementById('btnQuest'); const bb = btn ? btn.getBoundingClientRect() : null; const banner = document.querySelector('#detailBanner'); const bnr = banner ? banner.getBoundingClientRect() : null; return { vh: innerHeight, moodChips: mood.map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), right: Math.round(r.right), insideViewport: r.right <= innerWidth + 1 }; }), blurbSh: b.scrollHeight, blurbCh: b.clientHeight, blurbClipped: b.scrollHeight > b.clientHeight + 2, blurbRect: [Math.round(br.top), Math.round(br.bottom)], bannerH: bnr ? Math.round(bnr.height) : null, acceptBtn: bb ? [Math.round(bb.top), Math.round(bb.bottom)] : null }; })()`));

// ---------- C) JA @390x844 folded strip ----------
await setVp(390, 844);
await boot('ja');
await click('#mfFoldTab');
await shot('ja-map-folded-390x844');
note('fold-ja', await cdp.eval(FOLD));

writeFileSync(resolve(outDir, 'probes.json'), JSON.stringify({ tag: TAG, generatedAt: new Date().toISOString(), probes }, null, 2));
try { proc.kill('SIGKILL'); } catch { /* noop */ }
console.log('Done ->', outDir);
