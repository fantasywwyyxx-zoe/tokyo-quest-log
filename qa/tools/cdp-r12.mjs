import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r12/';
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
rmSync(`/tmp/tsq-r12-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r12-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 120)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function setH(h) { await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: h }); }
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(h) {
  await setH(h);
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
  await click('#tab-hero'); await waitStable();
}
const CAB = `(() => {
  const all = [...document.querySelectorAll('*')].filter(e => /DASH RUN/.test(e.innerText || '') && e.children.length <= 6);
  const cab = all.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width).find(e => e.getBoundingClientRect().width > 200);
  const startBtn = [...document.querySelectorAll('button')].find(b => b.offsetParent && /START|スタート/.test(b.innerText || '') && b.closest('[class*=dash], [class*=run], section, div'));
  const out = { cabCls: cab ? (cab.className || '').toString().slice(0, 30) : null };
  if (cab) { const r = cab.getBoundingClientRect(); out.cab = { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; }
  const sb = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /スタート|START/.test(b.innerText || ''));
  out.startBtns = sb.map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim().slice(0, 14), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; }).slice(0, 3);
  out.canvasInCab = cab ? cab.querySelectorAll('canvas').length : 0;
  return out;
})()`;
// ---- @844 first impression
await boot(844);
console.log('CAB @844:', JSON.stringify(await cdp.eval(CAB)));
await shot('r12-hero-844.png');
// ---- @600 position/depth (fresh boot, no scrolling)
await boot(600);
console.log('CAB @600:', JSON.stringify(await cdp.eval(CAB)));
await shot('r12-hero-600.png');
// ---- touch lane response @844
await boot(844);
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /スタート|START/.test(x.innerText || '')); if (b) b.click(); return !!b; })()`);
await sleep(700);
const FRAME = `(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.getBoundingClientRect().width > 200).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]; if (!cv) return null; const r = cv.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })()`;
const frame = await cdp.eval(FRAME);
console.log('FRAME:', JSON.stringify(frame));
await shot('r12-run-start.png');
async function tap(x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
if (frame) {
  const clip = { x: frame.x, y: frame.y, width: frame.w, height: frame.h, scale: 1 };
  const snapHero = async () => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip }); writeFileSync('/tmp/tsq-dash-frame.png', Buffer.from(d.data, 'base64')); };
  await snapHero();
  console.log('SNAP0 saved');
  // tap RIGHT half, then LEFT half x2, sampling distance + crash state
  for (const [label, fx] of [['RIGHT', 0.78], ['LEFT', 0.22], ['LEFT', 0.22], ['RIGHT', 0.78]]) {
    await tap(frame.x + frame.w * fx, frame.y + frame.h * 0.6);
    await sleep(120);
    const d = await cdp.eval(`(() => { const els = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0); const m = els.map(e => (e.innerText || '').match(/(\\d{1,4})\\s*m(?!s)/)).find(Boolean); return m ? Number(m[1]) : null; })()`);
    await snapHero();
    console.log('TAP', label, 'dist:', d, 'snap saved /tmp/tsq-dash-frame.png (overwrite)');
    writeFileSync(SHOTS + 'frame-after-' + label + '-' + Date.now() % 100000 + '.png', Buffer.from(await (await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip })).data, 'base64'));
    await sleep(500);
  }
}
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
