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
rmSync(`/tmp/tsq-r7b2-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7b2-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 1, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
// ---- title @600 deep probe
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 600 });
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
console.log('TITLE600 PROBE:', JSON.stringify(await cdp.eval(`(() => {
  const all = [...document.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { text: (b.innerText || '').trim().slice(0, 12), vis: !!b.offsetParent, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; }).filter(x => x.text);
  const scroller = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 200).map(e => ({ id: e.id || '', cls: (e.className || '').toString().slice(0, 30), sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY }));
  return { docScroll: [document.documentElement.scrollHeight, document.documentElement.clientHeight], winScrollY: scrollY, buttons: all, scrollers: scroller.slice(0, 4) };
})()`)));
await shot('r7-title-600.png');
// try scrolling the start screen down
await cdp.eval(`(() => { const s = [...document.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 200); if (s) { s.scrollTop = s.scrollHeight; return 'scrolled ' + (s.id || s.className); } window.scrollTo(0, 9999); return 'win-scroll'; })()`);
await sleep(800);
console.log('TITLE600 AFTER SCROLL plaques:', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent && /ログイン|応援/.test(x.innerText || '')).map(x => { const r = x.getBoundingClientRect(); return { text: x.innerText.trim().slice(0, 8), rect: [Math.round(r.top), Math.round(r.bottom)] }; }))()`)));
await shot('r7-title-600-scrolled.png');
// ---- remainders at 844: switcher, flame, map strip
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
console.log('HERO SLOT:', JSON.stringify(await cdp.eval(`(() => { const s = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return { hero: s.hero }; })()`)));
console.log('SWITCH CLICK:', await cdp.eval(`(() => { const els = [...document.querySelectorAll('*')].filter(e => e.offsetParent && (e.innerText || '').trim() === '主人公'); if (!els.length) return 'nf'; els[0].click(); return 'ok'; })()`));
await waitStable();
console.log('SWITCHER DUMP:', JSON.stringify(await cdp.eval(`(() => { const vis = [...document.querySelectorAll('[data-hero], [class*=preset]')].filter(e => e.offsetParent).map(e => ({ cls: (e.className || '').toString().slice(0, 30), dh: e.getAttribute('data-hero'), text: (e.innerText || '').trim().slice(0, 12) })); return vis.slice(0, 14); })()`)));
await shot('r7-hero-slot-844.png');
await click('#tab-daily'); await waitStable();
console.log('FLAME DUMP:', JSON.stringify(await cdp.eval(`(() => {
  const els = [...document.querySelectorAll('img, svg, [class*=flame], [class*=streak], [class*=icon]')].filter(e => e.offsetParent && e.getBoundingClientRect().width <= 40 && e.getBoundingClientRect().width >= 8);
  return els.slice(0, 10).map(e => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 36), rect: [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)] }));
})()`)));
await shot('r7-daily-844.png');
await click('#tab-map'); await waitStable();
await shot('r7-q109-map-strip-844.png');
const clip = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 40, width: 390, height: 90, scale: 2 } });
writeFileSync(SHOTS + 'r7-q109-strip-closeup.png', Buffer.from(clip.data, 'base64'));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
