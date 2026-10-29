import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-q117/';
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
rmSync(`/tmp/tsq-q117-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q117-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text || '').slice(0, 160)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn'); await waitStable();
await click('#tab-list'); await waitStable();
// expand filter bar + LEGEND chip
await cdp.eval(`(() => { const strip = document.querySelector('.mf-fold-tab, #mfFoldTab, [class*=fold]'); if (strip) strip.click(); return !!strip; })()`);
await sleep(700);
console.log('LEGEND CHIP:', await cdp.eval(`(() => { const c = [...document.querySelectorAll('button, span, div')].find(e => e.offsetParent && (e.innerText || '').trim() === 'レジェンド' && e.getBoundingClientRect().width < 90); if (c) { c.click(); return 'clicked'; } return 'not found'; })()`));
await waitStable();
console.log('LEGEND ROWS:', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('[data-legend-open]')].map(e => e.getAttribute('data-legend-open')))()`)));
await cdp.eval(`(() => { const r = document.querySelector('[data-legend-open]'); if (r) r.click(); return !!r; })()`);
await waitStable();
console.log('MAP BTN:', JSON.stringify(await cdp.eval(`(() => { const b = document.getElementById('legendMapBtn'); return b ? { text: b.innerText.trim(), vis: !!b.offsetParent } : 'absent'; })()`)));
await shot('q117-legend-detail.png');
// record map state before click
const before = await cdp.eval(`(() => { const mb = document.getElementById('mapBox'); return { view: (document.querySelector('.view.active, [id^=view-]:not([hidden])') || {}).id || '?', mapHidden: mb ? mb.offsetParent === null : 'nf' }; })()`);
await cdp.eval(`document.getElementById('legendMapBtn').click()`);
await sleep(1800);
console.log('AFTER CLICK:', JSON.stringify(await cdp.eval(`(() => {
  const views = [...document.querySelectorAll('[id^="view-"]')].filter(v => v.offsetParent).map(v => v.id);
  const routeEls = [...document.querySelectorAll('canvas, svg, [class*=route], [id*=route]')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 30).map(e => ({ tag: e.tagName, id: e.id || '', cls: (e.className || '').toString().slice(0, 26), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })).slice(0, 6);
  const detailOpen = !!document.getElementById('legendMapBtn');
  return { visibleViews: views, routeEls, legendDetailStillThere: detailOpen };
})()`)), 'errors:', JSON.stringify(errors.slice(0, 3)));
console.log('ROUTE INTERNALS:', JSON.stringify(await cdp.eval(`(() => {
  const rl = document.getElementById('routeLayer');
  if (!rl) return 'absent';
  const kids = [...rl.querySelectorAll('*')];
  const vis = kids.filter(k => k.getBoundingClientRect().width > 0);
  return { childCount: kids.length, visibleKids: vis.length, rlRect: [Math.round(rl.getBoundingClientRect().left), Math.round(rl.getBoundingClientRect().top), Math.round(rl.getBoundingClientRect().width), Math.round(rl.getBoundingClientRect().height)], z: getComputedStyle(rl).zIndex, opacity: getComputedStyle(rl).opacity,
    kidSample: vis.slice(0, 5).map(k => ({ cls: (k.className.baseVal !== undefined ? k.className.baseVal : k.className || '').toString().slice(0, 24), x: Math.round(k.getBoundingClientRect().left), y: Math.round(k.getBoundingClientRect().top), w: Math.round(k.getBoundingClientRect().width) })) };
})()`)));
await shot('q117-after-mapbtn.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
