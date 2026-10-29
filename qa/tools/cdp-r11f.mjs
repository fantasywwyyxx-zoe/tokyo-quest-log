import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r11/';
mkdirSync(SHOTS, { recursive: true });
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
rmSync(`/tmp/tsq-r11f-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r11f-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 120)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
// ============ DASH
console.log('TICKETS BEFORE:', await cdp.eval(`(() => { const m = document.body.innerText.match(/チケット\\s*[×x]\\s*(\\d+)/); return m ? m[1] : '?'; })()`));
console.log('DASH ENTRY:', await cdp.eval(`(() => { const e = [...document.querySelectorAll('*')].find(x => x.offsetParent && /DASH RUN/.test(x.innerText || '') && x.getBoundingClientRect().width > 200 && x.children.length <= 4); if (e) { e.click(); return (e.className || '').toString().slice(0, 24); } return 'none'; })()`));
await sleep(1200);
await shot('r11-dash-open.png');
console.log('DASH SCREEN:', JSON.stringify(await cdp.eval(`(() => { const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.innerText.trim().slice(0, 16)).filter(Boolean).slice(0, 10); const texts = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && /m$|START|スタート|よけ/.test(e.innerText || '')).map(e => e.innerText.trim().slice(0, 24)).slice(0, 8); return { btns, texts }; })()`)));
// press start if present
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /START|スタート|はじめる/.test(x.innerText || '')); if (b) b.click(); return !!b; })()`);
await sleep(500);
const DIST = `(() => { const els = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0); const m = els.map(e => (e.innerText || '').match(/(\\d{1,4})\\s*m(?!s)/)).find(Boolean); return m ? Number(m[1]) : null; })()`;
let lastDist = null; const samples = [];
for (let i = 0; i < 40; i++) {
  const d = await cdp.eval(DIST).catch(() => null);
  if (d !== null) { lastDist = d; if (samples.length === 0 || samples[samples.length - 1] !== d) samples.push(d); }
  // alternate lane inputs: keys + side taps
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: i % 2 ? 'ArrowRight' : 'ArrowLeft', code: i % 2 ? 'ArrowRight' : 'ArrowLeft' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: i % 2 ? 'ArrowRight' : 'ArrowLeft', code: i % 2 ? 'ArrowRight' : 'ArrowLeft' });
  await sleep(450);
  if (i === 10) await shot('r11-dash-mid.png');
  const over = await cdp.eval(`(() => /GAME OVER|おつかれ|結果|リザルト/.test(document.body.innerText) && !!document.querySelector('canvas, [class*=dash]'))()`).catch(() => false);
  if (over && i > 12) { console.log('GAME OVER at sample', i); break; }
}
console.log('DASH DIST SAMPLES:', JSON.stringify(samples.slice(0, 24)), 'last:', lastDist);
await shot('r11-dash-end.png');
console.log('DASH END TEXT:', JSON.stringify(await cdp.eval(`(() => { const t = document.body.innerText; const m = t.match(/.{0,18}(GAME OVER|チケット|券|300m).{0,26}/g); return (m || []).slice(0, 4); })()`)));
// exit game if a close/back exists
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /^(✕|とじる|戻る|やめる)$/.test((x.innerText || '').trim())); if (b) b.click(); return !!b; })()`);
await sleep(800);
// ============ HOME DAILIES
console.log('TAB-DAILY:', await click('#tab-daily'));
await waitStable();
console.log('DAILY LIST:', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('[class*=daily] [class*=item], [class*=dq], li')].filter(e => e.offsetParent && (e.innerText || '').trim().length > 4).slice(0, 8).map(e => e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 44)))()`)));
await shot('r11-daily.png');
const before = await cdp.eval(`(() => { const st = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return { done: (st.daily && st.daily.done || []).length, exp: (st.bonusExp || 0) + (st.dailyExp || 0) }; })()`);
console.log('HOME DAILY TRY:', JSON.stringify(await cdp.eval(`(() => {
  const items = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /やった|できた|完了|やる|作る|読む/.test(b.innerText || '') && b.getBoundingClientRect().width > 40);
  if (!items.length) return 'no action buttons';
  items[0].click(); return items[0].innerText.trim().slice(0, 20);
})()`)));
await sleep(900);
const after = await cdp.eval(`(() => { const st = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return { done: (st.daily && st.daily.done || []).length, exp: (st.bonusExp || 0) + (st.dailyExp || 0) }; })()`);
console.log('DAILY BEFORE/AFTER:', JSON.stringify({ before, after }));
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
