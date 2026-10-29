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
rmSync(`/tmp/tsq-r16k-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r16k-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(3000);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(4500);
console.log('beta entry:', await cdp.eval(`(() => { const b = [...document.querySelectorAll('button, a')].find(e => e.offsetParent && /ベータ|お知らせ/.test(e.innerText || '')); if (!b) return 'missing: ' + [...document.querySelectorAll('button')].filter(x => x.offsetParent).map(x => (x.innerText || '').trim().slice(0, 12)).join('/'); b.click(); return 'clicked: ' + (b.innerText || '').trim().slice(0, 20); })()`));
await sleep(1600);
console.log('fold click:', await cdp.eval(`(() => { const leaf = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes('プライバシー（かんたん説明）'))[0]; if (!leaf) return 'leaf missing'; let t = leaf; for (let i = 0; i < 4 && t; i++) { if (t.tagName === 'BUTTON' || t.getAttribute('role') === 'button' || getComputedStyle(t).cursor === 'pointer') break; t = t.parentElement; } (t || leaf).scrollIntoView({ block: 'center' }); (t || leaf).click(); return 'clicked ' + (t ? t.tagName + '.' + String(t.className).slice(0, 20) : 'leaf'); })()`));
await sleep(1100);
console.log('fold state:', await cdp.eval(`(() => { const leaf = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes('プライバシー（かんたん説明）'))[0]; let sec = leaf; for (let i = 0; i < 5 && sec; i++) sec = sec.parentElement; const t = sec ? (sec.innerText || '') : ''; const k = t.indexOf('プライバシー'); return JSON.stringify({ ad: t.includes('広告'), trackingFree: t.includes('トラッキングなし'), body: k >= 0 ? t.slice(k, k + 400).split(String.fromCharCode(10)).join(' / ') : 'section not found' }); })()`));
const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + 'r16-beta-privacy-fold.png', Buffer.from(d.data, 'base64'));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
