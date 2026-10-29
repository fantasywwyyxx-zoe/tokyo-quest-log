import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/';
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
rmSync(`/tmp/tsq-q130b-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q130b-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
// Zoe's exact equip set from her device screenshot: hat 雷門はちまき / outfit 森のレンジャー服 / scarf 炎柄マフラー
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 1450, bonusExp: 0, gacha: { pulls: 3, owned: ['ep-sensoji', 'forest-ranger', 'flame-scarf'], dupes: {}, equipped: { hat: 'ep-sensoji', outfit: 'forest-ranger', scarf: 'flame-scarf' } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3200);
await click('#startBtn'); await sleep(1200);
await click('#tab-hero'); await sleep(1800);
const geo = await cdp.eval(`(() => {
  const out = {};
  const stage = document.querySelector('canvas') || document.querySelector('[class*=stage], [class*=scene]');
  const cards = [...document.querySelectorAll('button, [class*=card], [class*=equip], [class*=slot]')].filter(e => e.offsetParent && /主人公|帽子|服|スカーフ/.test(e.innerText || ''));
  out.cards = cards.map(e => { const r = e.getBoundingClientRect(); return { label: (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 26), cls: e.className.slice(0, 30), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), h: Math.round(r.height) }; });
  // scene frame: the big bordered stage container — find the canvas wrapper
  const wrap = stage ? stage.parentElement : null;
  if (wrap) { const r = wrap.getBoundingClientRect(); out.stageWrap = { cls: wrap.className.slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; }
  return out;
})()`);
console.log(JSON.stringify(geo, null, 1));
await shot('q130b-hero-lv11-844.png');
// identify the sliver under the hat card: sample elements at the circled area (left, just below hat card bottom)
const hat = geo.cards.find(c => /帽子/.test(c.label));
if (hat) {
  const probe = await cdp.eval(`(() => {
    const els = document.elementsFromPoint(${Math.round(hat.left + 40)}, ${Math.round(hat.bottom + 6)});
    return els.slice(0, 5).map(e => e.tagName + '.' + String(e.className).slice(0, 40) + ' h=' + Math.round(e.getBoundingClientRect().height));
  })()`);
  console.log('below hat card:', JSON.stringify(probe));
}
// also at 600 height
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 600 });
await sleep(1200);
console.log('at 600:', JSON.stringify(await cdp.eval(`(() => { const cards = [...document.querySelectorAll('button, [class*=card], [class*=equip], [class*=slot]')].filter(e => e.offsetParent && /主人公|帽子|服|スカーフ/.test(e.innerText || '')); return cards.map(e => { const r = e.getBoundingClientRect(); return { label: (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 14), bottom: Math.round(r.bottom) }; }); })()`)));
await shot('q130b-hero-lv11-600.png');

// ---- prop overlap enumeration (Lv.11)
const overlap = await cdp.eval(`(() => {
  const hat = [...document.querySelectorAll('.slot')].find(e => e.offsetParent && /帽子/.test(e.innerText || ''));
  if (!hat) return { hat: null };
  const hr = hat.getBoundingClientRect();
  const props = [...document.querySelectorAll('#sceneProps .sp')].map(e => { const r = e.getBoundingClientRect(); return { id: e.className, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });
  const hits = props.filter(p => p.right > hr.left && p.left < hr.right && p.bottom > hr.top && p.top < hr.bottom);
  const below = props.filter(p => p.left < hr.right && p.right > hr.left && p.top >= hr.bottom - 4 && p.top < hr.bottom + 30);
  return { hatRect: { left: Math.round(hr.left), top: Math.round(hr.top), right: Math.round(hr.right), bottom: Math.round(hr.bottom) }, props, hits, below };
})()`);
console.log('PROP OVERLAP:', JSON.stringify(overlap, null, 1));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
