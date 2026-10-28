import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r7/';
mkdirSync(SHOTS, { recursive: true });
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
rmSync(`/tmp/tsq-r7a3-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7a3-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 12000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 0, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(seed) {
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(seed))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
}
// ---------- Q-108 trace with text-located tabs
await boot({ ...BASE, bonusExp: 1200 });
await click('#tab-hero'); await waitStable();
await cdp.eval(`document.querySelector('[data-openwin="records"]').click()`);
await waitStable();
const FINDTABS = `(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^(称号|バッジ|サイドクエス)/.test((b.innerText || '').trim()));
  return btns.map(b => ({ text: (b.innerText || '').trim().slice(0, 12), top: Math.round(b.getBoundingClientRect().top), parentCls: (b.parentElement.className || '').toString().slice(0, 40), parentTop: Math.round(b.parentElement.getBoundingClientRect().top) }));
})()`;
console.log('Q108 TABS:', JSON.stringify(await cdp.eval(FINDTABS)));
const traceByText = pat => cdp.eval(`(() => new Promise(res => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^(称号|バッジ|サイドクエス)/.test((b.innerText || '').trim()));
  const tab = btns.find(b => (b.innerText || '').trim().includes(${JSON.stringify(pat)}));
  if (!tab) return res('tab not found');
  const bar = tab.parentElement;
  const win = bar.parentElement;
  const tops = [], winTops = [];
  const t0 = performance.now();
  tab.click();
  const iv = setInterval(() => { tops.push(Math.round(bar.getBoundingClientRect().top * 10) / 10); winTops.push(Math.round(win.getBoundingClientRect().top * 10) / 10); if (performance.now() - t0 > 1000) { clearInterval(iv); const s = tops[tops.length - 1]; const sw = winTops[winTops.length - 1]; res(JSON.stringify({ barSettled: s, barMaxDev: Math.max(...tops.map(t => Math.abs(t - s))), winSettled: sw, winMaxDev: Math.max(...winTops.map(t => Math.abs(t - sw))) })); } }, 16);
}))()`);
console.log('Q108 ->badges', await traceByText('バッジ'));
console.log('Q108 ->log', await traceByText('サイドクエス'));
console.log('Q108 ->titles', await traceByText('称号'));
await shot('r7-q108-records-titles-390.png');
// close records sheet
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
await sleep(600); await waitStable();
// ---------- Q-110 zero-ticket leg (same Lv10 seed session, tickets remain)
await click('#tab-hero'); await waitStable();
await cdp.eval(`document.querySelector('[data-openwin="gacha"]').click()`);
await waitStable();
console.log('GACHA TEXT:', JSON.stringify(await cdp.eval(`(() => { const w = [...document.querySelectorAll('div, section')].find(e => e.offsetParent && /ガチャ|GACHA/.test(e.innerText || '') && /チケット|TICKET/.test(e.innerText || '')); return w ? w.innerText.replace(/\\s+/g, ' ').slice(0, 150) : 'win not located'; })()`)));
let pulls = 0;
for (let i = 0; i < 40; i++) {
  const st = await cdp.eval(`(() => { const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /PULL|引く/.test(b.innerText || '')); const b = btns[0]; return b ? { text: b.innerText.replace(/\\s+/g, ' ').trim().slice(0, 24), disabled: !!b.disabled } : { text: 'none' }; })()`);
  if (!st.text || st.disabled || st.text === 'none') { console.log('Q110 stop:', JSON.stringify(st)); break; }
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /PULL|引く/.test(x.innerText || '') && !x.disabled); if (b) b.click(); return !!b; })()`);
  pulls++; await sleep(2800);
}
console.log('Q110 pulls:', pulls);
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
await sleep(600); await waitStable();
console.log('Q110 AFTER 0:', JSON.stringify(await cdp.eval(`(() => {
  const gb = document.querySelector('[data-openwin="gacha"]');
  const ht = document.querySelector('#tab-hero');
  const dots = r => r ? [...r.querySelectorAll('*')].filter(e => /dot/i.test((e.className || '').toString()) && e.getBoundingClientRect().width > 0).length : 'noroot';
  return { gachaDotCount: dots(gb), heroTabDotCount: dots(ht) };
})()`)));
await shot('r7-q110-dots-off-390.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
