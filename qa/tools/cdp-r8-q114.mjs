// R8 retest driver: Q-114 (touch-gesture scroll), Q-112 (title @600), Q-113 (tab label), Q-108/Q-111 spot regression.
// Run AFTER dev's fix commit lands. Gesture scrolling uses real CDP touch events, NOT programmatic scrollTop.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r8/';
mkdirSync(SHOTS, { recursive: true });
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-r8-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r8-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(H) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: H });
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
}
// One finger drag upward (scroll content up) starting at (x, yFrom) moving dy px in steps.
async function fingerDrag(x, yFrom, dy) {
  const steps = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yFrom, id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(yFrom + (dy * i) / steps), id: 1 }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(450); // momentum / settle
}
// The visible scroll section of the currently open window (hseg* with live height), or a fallback scroller.
const SCROLLER_EXPR = `(window.__qaScroller = (() => {
  const hs = [...document.querySelectorAll('[id^="hseg"], #creatorScroll, .detail-body')].filter(e => e.clientHeight > 100 && e.scrollHeight > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
  hs.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
  return hs[0] || null;
})())`;
const MEASURE_SCROLL = `(() => {
  const s = window.__qaScroller; if (!s) return 'no scroller';
  const r = s.getBoundingClientRect();
  const kids = [...s.querySelectorAll('*')].filter(k => k.children.length === 0 && k.getBoundingClientRect().height > 0);
  const last = kids[kids.length - 1];
  const lr = last ? last.getBoundingClientRect() : null;
  return { id: s.id || s.className, sh: s.scrollHeight, ch: s.clientHeight, scrollTop: Math.round(s.scrollTop), maxTop: s.scrollHeight - s.clientHeight,
    atBottom: Math.abs(s.scrollTop - (s.scrollHeight - s.clientHeight)) <= 2,
    lastKidBottom: lr ? Math.round(lr.bottom) : null, contBottom: Math.round(r.bottom), lastVisible: lr ? lr.bottom <= r.bottom + 1 && lr.top >= r.top - 1 : null };
})()`;
async function gestureScrollToBottom(label) {
  await cdp.eval(SCROLLER_EXPR + '; "set"');
  const geo = await cdp.eval(`(() => { const s = window.__qaScroller; if (!s) return null; const r = s.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), yTop: Math.round(r.top + 40), yBottom: Math.round(r.bottom - 40) }; })()`);
  if (!geo) { console.log(label, 'NO SCROLLER'); return; }
  let prev = -1;
  for (let i = 0; i < 14; i++) {
    const m = await cdp.eval(MEASURE_SCROLL);
    if (m.atBottom) break;
    if (m.scrollTop === prev) { console.log(label, 'STUCK at drag', i, JSON.stringify(m)); break; }
    prev = m.scrollTop;
    await fingerDrag(geo.x, geo.yBottom, -(geo.yBottom - geo.yTop));
  }
  console.log(label, 'FINAL', JSON.stringify(await cdp.eval(MEASURE_SCROLL)));
}
// ---------- Q-112: title plaques @600 (existing-save title), then boot into game
await boot(600);
console.log('Q112 TITLE@600:', JSON.stringify(await cdp.eval(`(() => {
  const els = [...document.querySelectorAll('button, a')].filter(b => b.offsetParent && /ログイン|応援/.test(b.innerText || ''));
  return els.map(b => { const r = b.getBoundingClientRect(); return { text: b.innerText.replace(/\\s+/g, ' ').trim().slice(0, 10), top: Math.round(r.top), bottom: Math.round(r.bottom), visible: r.bottom <= innerHeight && r.top >= 0 }; });
})()`)));
await shot('r8-q112-title-600.png');
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
// ---------- Q-114: window family gesture scroll @600
for (const w of ['studio', 'gacha', 'records', 'collection']) {
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="${w}"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  await gestureScrollToBottom('Q114@600 ' + w);
  if (w === 'studio') await shot('r8-q114-studio-600-bottom.png');
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
  await sleep(500);
}
// customize window: opened from hero page edit entry — probe common openers
console.log('Q114 CUSTOMIZE OPEN:', JSON.stringify(await cdp.eval(`(() => {
  const cand = [...document.querySelectorAll('button, [data-openwin], a')].filter(b => b.offsetParent && /カスタム|きせかえ|編集/.test(b.innerText || ''));
  return cand.map(b => (b.innerText || '').trim().slice(0, 14));
})()`)));
// ---------- Q-113: records tab third label rendering @844 JA
await boot(844);
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (b) b.click(); return !!b; })()`);
await waitStable();
console.log('Q113 TAB LABELS:', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('.rec-tabs button')].map(b => ({ dom: b.innerText.trim(), sw: b.scrollWidth, cw: b.clientWidth, overflow: b.scrollWidth > b.clientWidth + 1 })))()`)));
await shot('r8-q113-records-tabs.png');
// ---------- Q-111 spot regression @600: sheep detail margins
await click('#tab-list'); await waitStable();
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 600 });
await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.q-row, [data-qid], li, div')].filter(e => e.offsetParent && /羊フェスタ/.test(e.innerText || '') && e.getBoundingClientRect().height > 20 && e.getBoundingClientRect().height < 140); if (rows.length) rows[rows.length - 1].click(); return rows.length; })()`);
await waitStable();
console.log('Q111@600 MARGIN:', JSON.stringify(await cdp.eval(`(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.offsetParent && /公式ページ/.test(x.innerText || '')); if (!b) return 'nf'; const r = b.getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight, margin: innerHeight - Math.round(r.bottom), visible: r.bottom <= innerHeight }; })()`)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
