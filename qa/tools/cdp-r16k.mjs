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
await cdp.eval(`(() => { const b = document.querySelector('#startBtn'); if (b && b.offsetParent) b.click(); })()`);
await sleep(1500);
console.log('gear:', await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(e => e.offsetParent && (e.innerText || '').includes('表示設定')); if (!b) return 'missing: ' + [...document.querySelectorAll('button')].filter(x => x.offsetParent).map(x => (x.innerText || '').trim().slice(0, 8)).join('/'); b.click(); return 'ok'; })()`));
await sleep(1500);
console.log('BETA privacy scan:', await cdp.eval(`(() => {
  const sheet = [...document.querySelectorAll('*')].filter(e => e.offsetParent && /表示設定|データの引き継ぎ/.test(e.textContent || '')).pop();
  const root = sheet || document.body;
  const tc = root.textContent || '';
  const i = tc.indexOf('ベータテスト');
  const w = i >= 0 ? tc.slice(i, i + 2400) : '';
  return JSON.stringify({ sheetFound: !!sheet, betaFound: i >= 0, adInBetaWindow: w.includes('広告'), trackingFreeInBeta: w.includes('トラッキングなし'), adAnywhereInSheet: tc.includes('広告'), snippet: w.replace(/\\s+/g, ' ').slice(0, 500) });
})()`));
// manifest icons decode (from the document)
console.log('ICONS:', await cdp.eval(`(async () => {
  const out = {};
  const at = document.querySelector('link[rel="apple-touch-icon"]');
  out.appleTouch = at ? (at.href.startsWith('data:') ? 'data ' + at.href.length : at.href.slice(0, 60)) : 'absent';
  const man = document.querySelector('link[rel="manifest"]');
  if (man) {
    try {
      let j;
      if (man.href.startsWith('data:')) j = JSON.parse(decodeURIComponent(man.href.split(',')[1]));
      else { const r = await fetch(man.href); j = await r.json(); }
      out.manifestIcons = (j.icons || []).map(ic => ic.sizes + ' ' + (ic.src.startsWith('data:') ? 'data' : 'file') + ' ' + (ic.purpose || ''));
    } catch (e) { out.manifestErr = String(e).slice(0, 60); }
  } else out.manifest = 'absent';
  const fav = document.querySelector('link[rel="icon"]');
  out.favicon = fav ? (fav.href.startsWith('data:') ? 'data ' + fav.href.length : fav.href.slice(0, 60)) : 'absent';
  return JSON.stringify(out);
})()`));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
