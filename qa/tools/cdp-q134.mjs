import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/';
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
rmSync(`/tmp/tsq-q134-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q134-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'zh', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0, wishText: '啊' };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3200);
await sleep(1500);
await cdp.eval(`(() => { const b = document.querySelector('#startBtn'); if (b && b.offsetParent) b.click(); })()`); await sleep(1200);
await click('#tab-hero'); await sleep(1500);
// open the wish editor: click the flag plaque / wish button on the hero screen
console.log('wish open:', await cdp.eval(`(() => { const cands = [...document.querySelectorAll('button, [role=button], [class*=wish], [class*=flag]')].filter(e => e.offsetParent); const b = cands.find(e => /心愿|願い|wish/i.test(e.className + ' ' + (e.innerText || ''))) || cands.find(e => (e.innerText || '').trim() === '啊'); if (b) { b.click(); return (b.className + '|' + (b.innerText || '')).slice(0, 50); } return 'not found: ' + cands.map(c => (c.innerText || '').slice(0, 10)).join('/').slice(0, 120); })()`));
await sleep(1300);
const measure = label => cdp.eval(`(() => {
  const inp = [...document.querySelectorAll('input, textarea')].find(e => e.offsetParent);
  if (!inp) return { label: ${JSON.stringify(label)}, found: false };
  const ir = inp.getBoundingClientRect();
  const all = [...document.querySelectorAll('button')].filter(b => b.offsetParent);
  const clear = all.find(b => /清空/.test(b.innerText || ''));
  const go = all.find(b => /立起旗子/.test(b.innerText || ''));
  const cr = clear ? clear.getBoundingClientRect() : null;
  let w = inp; while (w && !(w.classList && [...w.classList].some(c => /win|modal|sheet|dlg|card/i.test(c))) && w.parentElement) w = w.parentElement;
  const wr = w ? w.getBoundingClientRect() : null;
  const note = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && /只是展示/.test(e.innerText || ''))[0];
  const nr = note ? note.getBoundingClientRect() : null;
  return { label: ${JSON.stringify(label)}, found: true, winTop: wr ? Math.round(wr.top) : null, winBottom: wr ? Math.round(wr.bottom) : null, winCls: w ? String(w.className).slice(0, 40) : null, input: { top: Math.round(ir.top), bottom: Math.round(ir.bottom), h: Math.round(ir.height) }, note: nr ? { top: Math.round(nr.top), bottom: Math.round(nr.bottom), h: Math.round(nr.height) } : 'absent', clearTop: cr ? Math.round(cr.top) : null, gapInputToClear: cr ? Math.round(cr.top - ir.bottom) : null };
})()`).then(r => console.log(JSON.stringify(r)));
await measure('390x844');
for (const h of [600, 500, 460]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: h });
  await sleep(650);
  await measure('390x' + h);
  if (h === 460) await shot('q134-wish-editor-460.png'); if (h === 600) await shot('q134-wish-editor-600.png');
}
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
