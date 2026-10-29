import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r13/';
mkdirSync(SHOTS, { recursive: true });
const ADDED = JSON.parse(readFileSync(ROOT + '/qa/tools/added50.json', 'utf8'));
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
rmSync(`/tmp/tsq-b2-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-b2-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 100)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2400);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3000);
await click('#startBtn'); await sleep(1200);
await click('#tab-list'); await sleep(1500);
await click('#tab-list'); await sleep(1500);
await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; const r = rows.find(e => (e.querySelector('.ms-name-t') || {}).innerText === 'カキモリ'); if (r) r.click(); return !!r; })()`);
await sleep(900);
console.log('FULL DETAIL TEXT:', JSON.stringify(await cdp.eval(`(() => { const ov = [...document.querySelectorAll('*')].filter(e => e.offsetParent && /公式ページ/.test(e.innerText || '')).sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0]; let root = ov; for (let i = 0; i < 5 && root && root.parentElement; i++) root = root.parentElement; return root ? root.innerText.replace(/\s+/g, ' ').slice(0, 420) : 'overlay not found'; })()`)));
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); return !!b; })()`);
await sleep(600);
await click('#tab-hero'); await sleep(1000);
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '記録'); if (b) b.click(); return !!b; })()`);
await sleep(1200);
console.log('RECORDS 184:', JSON.stringify(await cdp.eval(`(() => { const m = document.body.innerText.match(/[^ ]*\s*\d+\s*\/\s*184|184[^ ]*/g); return m ? m.slice(0, 3) : 'none'; })()`)));
console.log('LIST HEADER:', JSON.stringify(await cdp.eval(`(() => { const h = [...document.querySelectorAll('*')].find(e => e.offsetParent && /冒険クエストログ/.test(e.innerText || '') && e.children.length <= 3); return h ? h.innerText.replace(/\s+/g, ' ').slice(0, 80) : 'n/a'; })()`)));
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
