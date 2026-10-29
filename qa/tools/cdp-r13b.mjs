import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r13/';
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
rmSync(`/tmp/tsq-r13-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r13-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 120)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function setH(h) { await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: h }); }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(h) {
  await setH(h);
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await sleep(2200);
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(2800);
  await click('#startBtn'); await sleep(1200);
}
const DAILYGEO = `(() => {
  const cards = [...document.querySelectorAll('.drow')].filter(e => e.offsetParent);
  if (!cards.length) return 'no cards';
  const last = cards[cards.length - 1];
  const lr = last.getBoundingClientRect();
  const chain = [];
  let el = last;
  for (let i = 0; i < 7 && el; i++) { el = el.parentElement; if (!el) break; const r = el.getBoundingClientRect(); chain.push({ cls: (el.className || '').toString().slice(0, 22), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), oy: getComputedStyle(el).overflowY, sh: el.scrollHeight, ch: el.clientHeight }); }
  return { vh: innerHeight, cards: cards.length, lastCard: { top: Math.round(lr.top), bottom: Math.round(lr.bottom) }, chain };
})()`;
async function dailyGeo(tag) {
  await click('#tab-daily'); await sleep(1500);
  console.log('DAILY', tag, JSON.stringify(await cdp.eval(DAILYGEO)));
  await shot('r13-daily-' + tag + '.png');
}
async function dashCrash(tag) {
  await click('#tab-hero'); await sleep(1200);
  const st = await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '▶ スタート'); if (b) { b.click(); return 'cabinet start'; } return 'no cabinet btn'; })()`);
  await sleep(1500);
  // if a ready screen needs its own start, press any visible run start
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /スタート|START/.test(x.innerText || '') && !/主人公/.test(x.innerText || '')); if (b && !/DASH RUN —/.test(document.body.innerText.slice(0, 0))) { b.click(); return 'ready start'; } return 'skip'; })()`).catch(() => 'x');
  let crashed = false;
  for (let i = 0; i < 70; i++) {
    await sleep(600);
    const t = await cdp.eval(`(() => { const m = document.body.innerText.match(/クラッシュ/); return !!m; })()`).catch(() => false);
    if (t) { crashed = true; break; }
    if (i === 4) { // mid-run canvas clip for lane shading
      const fr = await cdp.eval(`(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.getBoundingClientRect().width > 280).sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]; if (!cv) return null; const r = cv.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      if (fr) { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: fr.x, y: fr.y, width: fr.w, height: fr.h, scale: 1 } }); writeFileSync(SHOTS + 'r13-lanes-' + tag + '.png', Buffer.from(d.data, 'base64')); console.log('LANE CLIP', tag, JSON.stringify(fr)); }
    }
  }
  console.log('DASH', tag, 'start:', st, 'crashed:', crashed);
  await sleep(600);
  console.log('CRASHGEO', tag, JSON.stringify(await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /もう一度|やめる/.test(b.innerText || ''));
    const out = { vh: innerHeight, btns: btns.map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim().slice(0, 8), top: Math.round(r.top), bottom: Math.round(r.bottom), below: Math.round(r.bottom - innerHeight) }; }) };
    const b0 = btns[0];
    if (b0) { let el = b0; for (let i = 0; i < 6 && el; i++) { el = el.parentElement; if (!el) break; const r = el.getBoundingClientRect(); if (r.height > 300) { out.modal = { cls: (el.className || '').toString().slice(0, 22), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), oy: getComputedStyle(el).overflowY, sh: el.scrollHeight, ch: el.clientHeight }; break; } } }
    const banner = [...document.querySelectorAll('*')].find(e => e.offsetParent && /クラッシュ/.test(e.innerText || '') && e.children.length <= 2);
    if (banner) { const r = banner.getBoundingClientRect(); out.banner = { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }
    return out;
  })()`)));
  await shot('r13-crash-' + tag + '.png');
}
// Daily-only threshold probe at 480 and 600 (longer waits)
for (const h of [480, 600]) {
  await boot(h);
  await click('#tab-daily');
  let geo = 'no cards';
  for (let k = 0; k < 10; k++) { await sleep(600); geo = await cdp.eval(DAILYGEO); if (geo !== 'no cards') break; }
  console.log('DAILY-TH', h, JSON.stringify(geo));
  await shot('r13-daily-' + h + '.png');
}
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
