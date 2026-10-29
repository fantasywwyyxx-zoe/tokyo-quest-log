import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r16/';
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
rmSync(`/tmp/tsq-r16m-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r16m-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(4500);
await cdp.eval(`(() => { const b = document.querySelector('#startBtn'); if (b && b.offsetParent) b.click(); })()`);
await sleep(2000);
const plaque = label => cdp.eval(`(() => {
  const p = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /▾|つづき|MORE|スクロール/.test(e.textContent || '') && e.getBoundingClientRect().height > 0 && /scroller|win|creator|sheet/i.test(String((e.closest('[class*=win],[class*=sheet],[class*=creator]') || {}).className || '')))[0] || [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /▾/.test(e.textContent || '') && e.getBoundingClientRect().height > 0)[0];
  const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /決定する|もどる|START ADVENTURE|BACK TO TITLE/.test(b.innerText || '')).map(b => { const r = b.getBoundingClientRect(); return (b.innerText || '').trim() + '@top' + Math.round(r.top); });
  const scr = document.querySelector('.win-scroller');
  if (!p) return JSON.stringify({ label: ${JSON.stringify(label)}, plaque: 'absent', btns, scr: scr ? [scr.scrollTop, scr.scrollHeight, scr.clientHeight] : null });
  const pr = p.getBoundingClientRect();
  let host = p; for (let i = 0; i < 6 && host; i++) { if (host.classList && [...host.classList].some(c => /win|sheet/.test(c))) break; host = host.parentElement; }
  const labels = host ? [...host.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim().length > 1 && e.getBoundingClientRect().height > 0) : [];
  const last = labels[labels.length - 1]; const lr = last ? last.getBoundingClientRect() : null;
  return JSON.stringify({ label: ${JSON.stringify(label)}, plaque: [Math.round(pr.top), Math.round(pr.bottom)], btns, scr: scr ? [scr.scrollTop, scr.scrollHeight, scr.clientHeight] : null, lastLabel: last ? (last.textContent || '').trim().slice(0, 14) : null, lastRect: lr ? [Math.round(lr.top), Math.round(lr.bottom)] : null, plaqueOverLast: lr ? Math.round(lr.bottom - pr.top) : null });
})()`).then(r => console.log(r));
console.log('creator state:', await cdp.eval(`JSON.stringify({ hasNameInput: !!document.querySelector('input'), bodyHead: (document.body.innerText || '').split(String.fromCharCode(10)).slice(0, 4).join('/') })`));
await plaque('at open');
await cdp.eval(`(() => { const scr = document.querySelector('.win-scroller'); if (scr) scr.scrollTop = scr.scrollHeight; })()`);
await sleep(700);
await plaque('scrolled to bottom');
const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + 'r16-creator-bottom-plaque.png', Buffer.from(d.data, 'base64'));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
