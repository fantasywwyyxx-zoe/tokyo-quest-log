import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r10/';
mkdirSync(SHOTS, { recursive: true });
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-r10-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r10-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 120)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const GEOM = `(() => {
  const bar = document.getElementById('mapFilters'), tab = document.getElementById('mfFoldTab');
  if (!bar || !tab) return { bar: !!bar, tab: !!tab };
  const b = bar.getBoundingClientRect(), t = tab.getBoundingClientRect();
  const chips = [...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent);
  const tops = [...new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)))];
  const inBig = document.getElementById('mapBox').classList.contains('in-big');
  const pin = document.querySelector('.map-pin, .pin-cluster, [class*=cluster]');
  const pr = pin ? pin.getBoundingClientRect() : null;
  return { inBig, expanded: tab.getAttribute('aria-expanded'),
    bar: { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) },
    tab: { top: Math.round(t.top), bottom: Math.round(t.bottom), w: Math.round(t.width), h: Math.round(t.height) },
    attachGap: Math.round(t.top - b.bottom),
    chips: chips.length, chipRows: tops.length, chipMaxRight: chips.length ? Math.round(Math.max(...chips.map(c => c.getBoundingClientRect().right))) : null,
    chipEllipsis: chips.filter(c => c.scrollWidth > c.clientWidth + 1).length,
    pinAt: pr ? [Math.round(pr.left + pr.width / 2), Math.round(pr.top + pr.height / 2)] : null };
})()`;
function seed(lang) { return { lang, muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } }; }
async function boot(lang) {
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(seed(lang)))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
  console.log('TAB-MAP:', await click('#tab-map'));
  await waitStable();
}
// ---- JA four states @844
await boot('ja');
console.log('A small/folded :', JSON.stringify(await cdp.eval(GEOM)));
await shot('r10-a-small-folded.png');
await click('#mfFoldTab'); await sleep(600);
console.log('B small/expand :', JSON.stringify(await cdp.eval(GEOM)));
await shot('r10-b-small-expanded.png');
// pan-swallow: touch drag starting on the bar, pin must not move
const pinBefore = await cdp.eval(`(() => { const p = document.querySelector('.map-pin, .pin-cluster, [class*=cluster]'); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()`);
const barC = await cdp.eval(`(() => { const b = document.getElementById('mapFilters').getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; })()`);
if (pinBefore && barC) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: barC[0], y: barC[1], id: 1 }] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: barC[0] - i * 14, y: barC[1] + i * 8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(500);
  const pinAfter = await cdp.eval(`(() => { const p = document.querySelector('.map-pin, .pin-cluster, [class*=cluster]'); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()`);
  console.log('PAN-SWALLOW    : pin', JSON.stringify(pinBefore), '->', JSON.stringify(pinAfter));
}
// big map
console.log('BIG BTN:', await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /大きな地図|⤢/.test(x.innerText || '') && x.id !== 'mfFoldTab'); if (b) { b.click(); return b.id || b.innerText.trim().slice(0, 10); } return 'none'; })()`));
await waitStable();
console.log('C big/folded?  :', JSON.stringify(await cdp.eval(GEOM)));
await shot('r10-c-big.png');
await click('#mfFoldTab'); await sleep(600);
console.log('D big/other    :', JSON.stringify(await cdp.eval(GEOM)));
await shot('r10-d-big-toggled.png');
// ---- EN chips pass
await boot('en');
await click('#mfFoldTab'); await sleep(600);
console.log('EN expanded    :', JSON.stringify(await cdp.eval(GEOM)));
await shot('r10-en-expanded.png');
// ---- ZH chips pass
await boot('zh');
await click('#mfFoldTab'); await sleep(600);
console.log('ZH expanded    :', JSON.stringify(await cdp.eval(GEOM)));
console.log('ERRORS:', JSON.stringify(errors.slice(0, 3)), 'count', errors.length);
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
