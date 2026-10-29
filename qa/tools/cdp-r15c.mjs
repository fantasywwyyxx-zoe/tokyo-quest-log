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
rmSync(`/tmp/tsq-r15c-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15c-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
await click('#startBtn'); await sleep(1000);
console.log('OBJ:', await cdp.eval(`(() => { const e = EVENTS.find(x => x.id === 'eg6-kusama'); const o = {}; for (const k of Object.keys(e)) o[k] = k === 'img' ? '<img>' : e[k]; return JSON.stringify(o).slice(0, 500); })()`));
await click('#tab-list'); await sleep(1600);
console.log('folded before:', await cdp.eval(`window.mapFiltersFolded`), 'rows:', await cdp.eval(`document.querySelectorAll('.ms-row').length`));
console.log('chips initial:', JSON.stringify(await cdp.eval(`[...document.querySelectorAll('.mf-chip')].map(c => c.innerText.replace(/\\s+/g, '').slice(0, 10) + (c.offsetParent ? ':V' : ':h'))`)));
await cdp.eval(`(() => { const c = [...document.querySelectorAll('.mf-chip')].find(x => x.offsetParent && /史詩|EPIC/.test(x.innerText)); if (c) { c.click(); return 'clicked'; } return 'not found'; })()`).then(r => console.log('epic click:', r));
await sleep(1200);
console.log('rows after EPIC-by-text:', await cdp.eval(`document.querySelectorAll('.ms-row').length`), 'mapFilter:', await cdp.eval(`JSON.stringify(window.mapFilter)`));
await cdp.eval(`(() => { const c = [...document.querySelectorAll('.mf-chip')].find(x => x.offsetParent && /すべて/.test(x.innerText)); if (c) c.click(); })()`);
await sleep(1000);
console.log('rows after ALL reset:', await cdp.eval(`document.querySelectorAll('.ms-row').length`));
// map drag probe with a visible cluster
await click('#tab-map'); await sleep(1800);
const probeEl = () => cdp.eval(`(() => { const els = [...document.querySelectorAll('.pin, [class*=cluster]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 10 && r.x > 0 && r.x < 390 && r.y > 100 && r.y < 800; }); if (!els.length) return null; const r = els[0].getBoundingClientRect(); return { cls: els[0].className.slice(0, 40), x: Math.round(r.x), y: Math.round(r.y) }; })()`);
console.log('map probe el before:', await probeEl());
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 430, id: 1 }] });
for (let s = 1; s <= 10; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 - s * 9, y: 430, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(800);
console.log('map probe el after TOUCH drag left:', await probeEl());
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
