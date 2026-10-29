import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
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
rmSync(`/tmp/tsq-r15e-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15e-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3200);
await click('#startBtn'); await sleep(1200);
// ---- tokiwaso full check
console.log('TOKIWASO fields:', await cdp.eval(`(() => { const e = EVENTS.find(x => x.id === 'eg6-tokiwaso'); const o = {}; for (const k of Object.keys(e)) o[k] = k === 'img' ? '<img>' : String(e[k]).slice(0, 130); return JSON.stringify(o); })()`));
await click('#tab-list'); await sleep(1600);
await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; const r = rows.find(e => (e.querySelector('.ms-name-t') || {}).innerText === 'トキワ荘マンガミュージアム'); if (r) r.click(); })()`);
await sleep(900);
console.log('TOKIWASO detail full text has 予約:', await cdp.eval(`/予約/.test((document.querySelector('.detail-body') || {}).innerText || '')`), '| len:', await cdp.eval(`((document.querySelector('.detail-body') || {}).innerText || '').length`));
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
// ---- map pan diagnosis
await click('#tab-map'); await sleep(2000);
console.log('fromPoint(195,430):', await cdp.eval(`document.elementsFromPoint(195, 430).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30)).join(' | ')`));
const probeQid = await cdp.eval(`(() => { const pins = [...document.querySelectorAll('.pin[data-qid]')].filter(p => { const r = p.getBoundingClientRect(); return r.width > 10 && r.x > 60 && r.x < 320 && r.y > 150 && r.y < 700; }); return pins.length ? pins[0].dataset.qid : null; })()`);
console.log('probe pin:', probeQid);
const rectOf = q => cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="${q}"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; })()`);
if (probeQid) {
  console.log('before:', await rectOf(probeQid), 'mapBox:', await cdp.eval(`typeof mapBox === 'object' ? JSON.stringify(mapBox).slice(0, 120) : typeof mapBox`));
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 430, button: 'left', clickCount: 1 });
  for (let s = 1; s <= 10; s++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 195 - s * 8, y: 430, button: 'left' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 115, y: 430, button: 'left', clickCount: 1 });
  await sleep(700);
  console.log('after MOUSE drag:', await rectOf(probeQid));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 430, id: 1 }] });
  for (let s = 1; s <= 10; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 + s * 8, y: 430, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
  console.log('after TOUCH drag:', await rectOf(probeQid));
  await cdp.eval(`(() => { const el = document.elementsFromPoint(195, 430)[0]; const opts = t => ({ bubbles: true, cancelable: true, pointerId: 7, clientX: 195, clientY: 430, buttons: 1, isPrimary: true }); el.dispatchEvent(new PointerEvent('pointerdown', opts())); for (let s = 1; s <= 8; s++) el.dispatchEvent(new PointerEvent('pointermove', { ...opts(), clientX: 195 - s * 10 })); el.dispatchEvent(new PointerEvent('pointerup', { ...opts(), buttons: 0 })); })()`);
  await sleep(700);
  console.log('after JS PointerEvent drag:', await rectOf(probeQid));
}
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
