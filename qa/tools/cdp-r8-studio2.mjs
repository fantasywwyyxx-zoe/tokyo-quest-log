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
rmSync(`/tmp/tsq-r8s-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r8s-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 600 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="studio"]'); if (b) b.click(); return !!b; })()`);
await waitStable();
console.log('STUDIO PROG SCROLL:', JSON.stringify(await cdp.eval(`(() => { const s = document.getElementById('hsegStudio'); s.scrollTop = 800; return { top: s.scrollTop, oy: getComputedStyle(s).overflowY, ta: getComputedStyle(s).touchAction }; })()`)));
await cdp.eval(`document.getElementById('hsegStudio').scrollTop = 0; 'reset'`);
async function drag(x, yFrom, dy) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yFrom, id: 1 }] });
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(yFrom + (dy * i) / 12), id: 1 }] }); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(500);
}
console.log('NAV TOP:', JSON.stringify(await cdp.eval(`(() => { const e = document.getElementById('tab-map'); const r = e ? e.getBoundingClientRect() : null; return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : 'nf'; })()`)));
let prev = -1;
for (let i = 0; i < 16; i++) {
  const top = await cdp.eval(`document.getElementById('hsegStudio').scrollTop`);
  const max = await cdp.eval(`(() => { const s = document.getElementById('hsegStudio'); return s.scrollHeight - s.clientHeight; })()`);
  if (Math.abs(top - max) <= 2) { console.log('AT BOTTOM after', i, 'drags'); break; }
  if (top === prev) { console.log('STUCK at', top, 'max', max); break; }
  prev = top;
  await drag(195, 500, -320);
}
console.log('STUDIO FINAL:', JSON.stringify(await cdp.eval(`(() => { const s = document.getElementById('hsegStudio'); const kids = [...s.querySelectorAll('*')].filter(k => k.children.length === 0 && k.getBoundingClientRect().height > 0); const last = kids[kids.length - 1]; const lr = last.getBoundingClientRect(); const nav = document.getElementById('tab-map').getBoundingClientRect(); return { scrollTop: Math.round(s.scrollTop), maxTop: s.scrollHeight - s.clientHeight, lastBottom: Math.round(lr.bottom), navTop: Math.round(nav.top), lastAboveNav: lr.bottom <= nav.top + 1, lastText: (last.innerText || '').trim().slice(0, 16) }; })()`)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
