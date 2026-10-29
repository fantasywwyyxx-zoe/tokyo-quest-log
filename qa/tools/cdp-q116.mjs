import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-q116/';
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
rmSync(`/tmp/tsq-q116-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q116-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
const GAP = `(() => {
  const vis = e => !!e.offsetParent;
  const expBar = [...document.querySelectorAll('*')].find(e => vis(e) && /つぎのLvまで/.test(e.innerText || '') && e.children.length <= 3 && e.getBoundingClientRect().height < 60);
  const rows = [...document.querySelectorAll('*')].filter(e => vis(e) && /Lv\.\d+/.test(e.innerText || '') && e.getBoundingClientRect().height > 30 && e.getBoundingClientRect().height < 70);
  if (!expBar || !rows.length) return { expBar: !!expBar, rows: rows.length };
  const lastBottom = Math.max(...rows.map(r => r.getBoundingClientRect().bottom));
  const er = expBar.getBoundingClientRect();
  return { vh: innerHeight, lastRowBottom: Math.round(lastBottom), expTop: Math.round(er.top), gapAfterRows: Math.round(er.top - lastBottom), rowsSeen: rows.length };
})()`;
for (const H of [844, 667, 600]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: H });
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
  await click('#tab-hero'); await waitStable();
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  console.log('H=' + H, 'page1:', JSON.stringify(await cdp.eval(GAP)));
  if (H === 844) { await shot('q116-debug-structure.png'); console.log('STRUCT:', JSON.stringify(await cdp.eval(`(() => { const w = [...document.querySelectorAll('*')].find(e => e.offsetParent && /称号/.test(e.innerText || '') && e.getBoundingClientRect().width > 300); if (!w) return 'win not found'; return [...w.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0).slice(0, 24).map(e => (e.className || '').toString().slice(0, 18) + ' :: ' + (e.innerText || '').trim().slice(0, 24)); })()`))); }
  // page forward x4 via the pager's next button (rightmost small button in the pager row)
  for (let i = 0; i < 4; i++) { await cdp.eval(`(() => { const bs = [...document.querySelectorAll('.rec-pager button, [class*=pager] button')].filter(x => x.offsetParent); const b = bs[bs.length - 1]; if (b) b.click(); return bs.length; })()`); await sleep(500); }
  console.log('H=' + H, 'page5:', JSON.stringify(await cdp.eval(GAP)));
  if (H === 844) await shot('q116-titles-p5-844.png');
  // badges tab for comparison
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('.rec-tabs button')][1]; if (b) b.click(); return !!b; })()`);
  await sleep(700);
  console.log('H=' + H, 'badges:', JSON.stringify(await cdp.eval(GAP)));
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
  await sleep(400);
}
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
