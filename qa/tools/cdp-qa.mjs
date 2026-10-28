#!/usr/bin/env node
// QA部 Q-001 — CDP driver for Tokyo Quest Log render-level checks.
// Launches chrome-headless-shell, drives the real game via CDP:
// seed save (old) or clear (new) -> title -> creator/map -> tabs
// (map/list/daily/hero) -> detail -> records calendar -> settings.
// Per screen: wait for a STABLE state (finite animations finished +
// layout signature unchanged x3), then screenshot + overflow metrics.
// Usage:
//   node qa/tools/cdp-qa.mjs [--profile old|new|both] [--viewports 390x844,390x667,1440x900]
//                            [--screens title,creator,map,list,detail,daily,records,hero,settings]
//                            [--out qa/shots/<dir>] [--tag 2026-10-28-q001]
// Exit code 0 = driver ran (findings live in metrics.json, not exit code).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const PORT = 9333 + Math.floor(Math.random() * 400);

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const profiles = opt('profile', 'both').split(',').filter(p => p !== 'both' ? true : false);
const profileList = opt('profile', 'both') === 'both' ? ['old', 'new'] : opt('profile', 'both').split(',');
const viewports = opt('viewports', '390x844,390x667,1440x900').split(',').map(s => {
  const [w, h] = s.split('x').map(Number);
  return { w, h, mobile: w < 600 };
});
const wantScreens = new Set(opt('screens', 'title,creator,map,list,detail,daily,records,hero,settings').split(','));
const tag = opt('tag', new Date().toISOString().slice(0, 10) + '-q001');
const outDir = resolve(ROOT, opt('out', `qa/shots/${tag}`));
mkdirSync(outDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- CDP plumbing (Node >=22 global WebSocket) ----------
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expr, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + ' :: ' + expr.slice(0, 120));
    return r.result.value;
  }
}

async function launch() {
  const udd = `/tmp/tsq-qa-profile-${PORT}`;
  rmSync(udd, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`,
    '--window-size=1440,900', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ver = null;
  for (let i = 0; i < 60; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; }
    catch { await sleep(250); }
  }
  if (!ver) throw new Error('chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
  try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch { /* older shells: override alone is enough */ }
  return { proc, cdp };
}

// ---------- stable-state wait ----------
// Stable = document ready + no FINITE animation running (infinite
// walk/idle loops are ignored) + layout signature identical 3 polls
// in a row. Mid-transition frames are never screenshotted (charter).
async function waitStable(cdp, label, timeoutMs = 10000) {
  const t0 = Date.now(); let lastSig = '', same = 0;
  while (Date.now() - t0 < timeoutMs) {
    const sig = await cdp.eval(`(() => {
      const finite = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length;
      const vis = ['startScreen','creatorScreen','calScreen','tutorial','detail','stylePanel'].map(id => { const e = document.getElementById(id); return e && !e.hidden && (e.open || e.tagName !== 'DIALOG') && getComputedStyle(e).display !== 'none' ? id : ''; }).join('|');
      const intro = document.getElementById('mapIntro'); const introOn = intro && !intro.hidden ? 'intro' : '';
      const txtLen = document.body ? document.body.innerText.length : 0; // catches the detail typewriter (JS interval, not a CSS animation)
      return [document.readyState, (document.body && document.body.dataset.view) || '', vis, introOn, finite, document.documentElement ? document.documentElement.scrollHeight : 0, txtLen].join('#');
    })()`);
    const finite = Number(sig.split('#')[4]);
    if (sig === lastSig && finite === 0) { if (++same >= 3) return { label, stableMs: Date.now() - t0 }; }
    else { same = 0; lastSig = sig; }
    await sleep(300);
  }
  return { label, stableMs: timeoutMs, timedOut: true, lastSig };
}

// ---------- per-screen metrics ----------
const METRICS_JS = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const offenders = [];
  document.querySelectorAll('body *').forEach(e => {
    if (!vis(e)) return;
    if (e.closest('#mapBox')) return; // map world is intentionally larger than its clip window
    if (e.namespaceURI && e.namespaceURI.includes('svg')) return;
    if (String(e.className).includes('sr-')) return; // screen-reader-only 1x1 clips are by design
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const hClip = e.scrollWidth > e.clientWidth + 2 && cs.overflowX === 'hidden';
    const outR = r.right > vw + 2, outL = r.left < -2;
    if ((hClip || outR || outL) && offenders.length < 24) offenders.push({ tag: e.tagName, id: e.id || '', cls: (e.className.baseVal !== undefined ? '' : String(e.className)).slice(0, 60), text: (e.textContent || '').trim().slice(0, 40), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], sw: e.scrollWidth, cw: e.clientWidth });
  });
  const dialogs = [...document.querySelectorAll('dialog')].filter(d => d.open).map(d => d.id);
  const openLayers = ['startScreen','creatorScreen','calScreen','tutorial','stylePanel','searchModal','bigMap'].filter(id => { const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none'; });
  return { view: document.body.dataset.view || '', titleOn: document.body.classList.contains('title-on'),
    docScrollW: document.documentElement.scrollWidth, docScrollH: document.documentElement.scrollHeight,
    vw, vh, pageCanScrollY: document.documentElement.scrollHeight > vh + 1, dialogs, openLayers, offenders };
})()`;

async function shot(cdp, results, profile, vp, screen) {
  if (!wantScreens.has(screen)) return null;
  const st = await waitStable(cdp, screen);
  await sleep(250);
  const metrics = await cdp.eval(METRICS_JS);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const name = `${tag}-${profile}-${screen}-${vp.w}x${vp.h}.png`;
  writeFileSync(resolve(outDir, name), Buffer.from(data, 'base64'));
  const rec = { profile, screen, viewport: `${vp.w}x${vp.h}`, file: name, stableMs: st.stableMs, timedOut: !!st.timedOut, ...metrics };
  results.push(rec);
  console.log(`[shot] ${name} view=${metrics.view} layers=${metrics.openLayers.join(',') || '-'} scrollY=${metrics.pageCanScrollY} offenders=${metrics.offenders.length}${st.timedOut ? ' STABLE-TIMEOUT' : ''}`);
  return rec;
}

const click = (cdp, sel) => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing:' + ${JSON.stringify(sel)}; e.scrollIntoView({block:'center'}); e.click(); return 'clicked:' + ${JSON.stringify(sel)}; })()`);
const existsVisible = (cdp, sel) => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && !e.hidden; })()`);

const OLD_SAVE = {
  lang: 'en', muted: true, theme: 'auto', font: 'rounded', hero: 'aoi',
  custom: null,
  name: 'QA', started: true, tutored: true, accepted: [], clears: [],
  dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false },
  bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 1,
  remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0,
  sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [],
  gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } },
};

async function runProfile(cdp, results, profile, vp) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.mobile, screenWidth: vp.w, screenHeight: vp.h });
  if (vp.mobile) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const url = 'file://' + resolve(ROOT, 'index.html');
  await cdp.send('Page.navigate', { url });
  await waitStable(cdp, 'boot');
  // Seed BEFORE the run's real navigation: set/clear storage, reload.
  if (profile === 'old') {
    await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(OLD_SAVE))}); localStorage.removeItem('tsq_state_v1'); 'seeded'`);
  } else {
    await cdp.eval(`localStorage.removeItem('tql_state_v1'); localStorage.removeItem('tsq_state_v1'); 'cleared'`);
  }
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable(cdp, 'boot2');

  await shot(cdp, results, profile, vp, 'title');

  if (profile === 'new') {
    console.log(' start(new):', await click(cdp, '#startBtn'));
    await shot(cdp, results, profile, vp, 'creator');
    console.log(' creatorGo:', await click(cdp, '#creatorGo'));
    await sleep(2600); // entry intro + tutorial auto-open window (fresh profile only)
    if (await existsVisible(cdp, '#tutorial')) {
      results.push({ profile, screen: 'tutorial', viewport: `${vp.w}x${vp.h}`, note: 'auto-opened on fresh profile; shot as extra' });
      const keep = wantScreens.has('creator'); // tutorial shot reuses capture path below
      const st = await waitStable(cdp, 'tutorial');
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const name = `${tag}-${profile}-tutorial-${vp.w}x${vp.h}.png`;
      writeFileSync(resolve(outDir, name), Buffer.from(data, 'base64'));
      results[results.length - 1].file = name;
      console.log(' tutSkip:', await click(cdp, '#tutSkip'));
    }
  } else {
    console.log(' start(old):', await click(cdp, '#startBtn'));
  }
  await shot(cdp, results, profile, vp, 'map');

  console.log(' tab-list:', await click(cdp, '#tab-list'));
  await shot(cdp, results, profile, vp, 'list');

  // detail: first quest row in the list (search results rows carry data-open)
  const detailTry = await cdp.eval(`(() => {
    const cand = document.querySelector('#view-list [data-open], #view-list [data-row-open], #view-list .ms-row, #view-list .quest-row, #view-list .qrow');
    if (!cand) return 'no-row';
    (cand.closest('[data-open],[data-row-open]') || cand).click();
    return 'clicked-row:' + (cand.getAttribute('data-open') || cand.className);
  })()`);
  console.log(' detail open:', detailTry);
  if (detailTry.startsWith('clicked')) {
    await shot(cdp, results, profile, vp, 'detail');
    console.log(' detail close:', await click(cdp, '#detailClose'));
    await cdp.eval(`(() => { const d = document.getElementById('detail'); if (d && d.open) d.close(); return 'ok'; })()`);
  } else {
    results.push({ profile, screen: 'detail', viewport: `${vp.w}x${vp.h}`, error: detailTry });
  }

  console.log(' tab-daily:', await click(cdp, '#tab-daily'));
  await shot(cdp, results, profile, vp, 'daily');

  // records = daily record calendar (calOpenBtn on daily) — settings follows after closing it
  console.log(' calOpen:', await click(cdp, '#calOpenBtn'));
  await shot(cdp, results, profile, vp, 'records');
  console.log(' calClose:', await click(cdp, '#calClose'));

  console.log(' tab-hero:', await click(cdp, '#tab-hero'));
  await shot(cdp, results, profile, vp, 'hero');

  // settings sheet: #styleBtn lives in the status bar (visible on hero/list/daily)
  const setTry = await click(cdp, '#styleBtn');
  console.log(' styleBtn:', setTry);
  if (!String(setTry).startsWith('missing')) {
    await shot(cdp, results, profile, vp, 'settings');
    await click(cdp, '#styleClose').catch(() => {});
    await cdp.eval(`(() => { const p = document.getElementById('stylePanel'); if (p) p.hidden = true; const b = document.getElementById('styleBackdrop'); if (b) b.hidden = true; return 'ok'; })()`).catch(() => {});
  } else {
    results.push({ profile, screen: 'settings', viewport: `${vp.w}x${vp.h}`, error: setTry });
  }
}

const { proc, cdp } = await launch();
const results = [];
try {
  for (const vp of viewports) for (const profile of profileList) {
    console.log(`\n=== ${profile} @ ${vp.w}x${vp.h} ===`);
    try { await runProfile(cdp, results, profile, vp); }
    catch (e) { console.error(`run failed ${profile}@${vp.w}x${vp.h}:`, e.message); results.push({ profile, viewport: `${vp.w}x${vp.h}`, error: e.message }); }
  }
} finally {
  // Merge into an existing metrics.json for the same tag so partial
  // re-runs (one viewport/profile) never erase earlier records.
  const mPath = resolve(outDir, 'metrics.json');
  let merged = results;
  try {
    const prev = JSON.parse((await import('node:fs')).readFileSync(mPath, 'utf8'));
    if (prev.tag === tag) {
      const key = r => `${r.profile}|${r.screen}|${r.viewport}`;
      const fresh = new Set(results.map(key));
      merged = [...prev.results.filter(r => !fresh.has(key(r))), ...results];
    }
  } catch { /* first run for this tag */ }
  writeFileSync(mPath, JSON.stringify({ tag, generatedAt: new Date().toISOString(), results: merged }, null, 2));
  try { proc.kill('SIGKILL'); } catch { /* noop */ }
}
console.log(`\nDone. ${results.length} records -> ${outDir}/metrics.json`);
