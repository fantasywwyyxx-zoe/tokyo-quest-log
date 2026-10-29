import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, appendFileSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/';
const LOG = ROOT + '/qa/shots/q135-log.txt';
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = m => { appendFileSync(LOG, m + '\n'); console.log(m); };
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-q135b-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q135b-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'zh', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: ['eg6-mikado'], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(3000);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(4500);
log('state after boot: ' + await cdp.eval(`JSON.stringify({ startBtn: !!document.querySelector('#startBtn'), tabs: [...document.querySelectorAll('[id^=tab-]')].map(e => e.id), bodyHead: (document.body.innerText || '').slice(0, 40) })`));
await cdp.eval(`(() => { const b = document.querySelector('#startBtn'); if (b && b.offsetParent) b.click(); })()`);
await sleep(1200);
log('list tab: ' + await cdp.eval(`(() => { const t = document.querySelector('#tab-list') || [...document.querySelectorAll('button')].find(b => b.offsetParent && (b.innerText || '').trim() === '一览'); if (!t) return 'missing'; t.click(); return 'ok'; })()`));
await sleep(2000);
log('rows: ' + await cdp.eval(`document.querySelectorAll('.ms-row').length`));
log('LIST TEXT: ' + await cdp.eval(`(document.body.innerText || '').split(String.fromCharCode(10)).join('/').slice(0, 220)`));
log('open detail: ' + await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; let row = rows.find(e => ((e.querySelector('.ms-name-t') || {}).innerText || '').includes('ゲーセンミカド')); if (!row) { const leaf = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && (e.innerText || '').includes('ゲーセンミカド'))[0]; row = leaf ? (leaf.closest('button, a, [class*=row], [class*=card], [class*=item]') || leaf) : null; } if (!row) return 'missing'; row.scrollIntoView({ block: 'center' }); row.click(); return 'clicked via ' + (row.className || row.tagName); })()`));
await sleep(1500);
log('abandon link: ' + await cdp.eval(`(() => { const a = [...document.querySelectorAll('a, button, [class*=abandon]')].find(e => e.offsetParent && /放弃这个任务/.test(e.innerText || '')); if (!a) return 'missing'; a.click(); return 'clicked'; })()`));
await sleep(1100);
await shot('q135-confirm-844.png');
log('DIALOG: ' + await cdp.eval(`(() => {
  const dlg = [...document.querySelectorAll('*')].filter(e => e.offsetParent && /要放弃/.test(e.textContent || '') && e.querySelectorAll('button').length >= 2).pop();
  if (!dlg) return 'not found';
  const dr = dlg.getBoundingClientRect();
  const above = [...dlg.querySelectorAll('*')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 30), txt: e.children.length === 0 ? (e.innerText || '').trim().slice(0, 12) : '', top: Math.round(r.top), h: Math.round(r.height) }; }).filter(k => k.top < dr.top + 4 && k.h > 0);
  const cs = getComputedStyle(dlg);
  return JSON.stringify({ cls: String(dlg.className).slice(0, 40), top: Math.round(dr.top), h: Math.round(dr.height), overflow: cs.overflow, above });
})()`));
try { proc.kill('SIGKILL'); } catch {}
log('Done');
