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
rmSync(`/tmp/tsq-r15b-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15b-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
console.log('EG6 object (no img):', await cdp.eval(`(() => { const e = EVENTS.find(x => x.id === 'eg6-kusama'); const o = {}; for (const k of Object.keys(e)) o[k] = k === 'img' ? '<img>' : e[k]; return JSON.stringify(o).slice(0, 700); })()`));
console.log('ROW sample (list):', await (async () => { await click('#tab-list'); await sleep(1600); return cdp.eval(`document.querySelector('.ms-row') ? document.querySelector('.ms-row').outerHTML.slice(0, 220) : 'none'`); })());
// ---- filter diagnostics on list
console.log('rows before:', await cdp.eval(`document.querySelectorAll('.ms-row').length`), 'mapFilter:', await cdp.eval(`JSON.stringify(window.mapFilter)`));
await cdp.eval(`document.getElementById('mapFilters').click()`); await sleep(800);
console.log('chips visible:', await cdp.eval(`[...document.querySelectorAll('.mf-chip')].map(c => ({ t: c.innerText.replace(/\\s+/g, ' ').slice(0, 22), vis: !!c.offsetParent }))`));
await cdp.eval(`(() => { const chips = [...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent); if (chips[2]) chips[2].click(); })()`); await sleep(1200);
console.log('after EPIC chip: rows:', await cdp.eval(`document.querySelectorAll('.ms-row').length`), 'mapFilter:', await cdp.eval(`JSON.stringify(window.mapFilter)`));
// ---- drag diagnostics on map
await click('#tab-map'); await sleep(1800);
const pinPos = () => cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="tokyo-atlas"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; })()`);
console.log('pin before:', await pinPos());
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 430, button: 'left', clickCount: 1 });
for (let s = 1; s <= 10; s++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 195 - s * 10, y: 430, button: 'left' });
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 95, y: 430, button: 'left', clickCount: 1 });
await sleep(700);
console.log('pin after MOUSE drag:', await pinPos());
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 430, id: 1 }] });
for (let s = 1; s <= 10; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 + s * 10, y: 430, bits: 1, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(700);
console.log('pin after TOUCH drag:', await pinPos());
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
