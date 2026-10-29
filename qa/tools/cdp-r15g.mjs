import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r15/';
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
rmSync(`/tmp/tsq-r15g-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15g-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3200);
await click('#startBtn'); await sleep(1200);
// ---- kusama detail title check
await click('#tab-list'); await sleep(1600);
await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; const r = rows.find(e => ((e.querySelector('.ms-name-t') || {}).innerText || '').includes('草間彌生')); if (r) r.click(); })()`);
await sleep(1000);
console.log('KUSAMA detail head:', await cdp.eval(`(() => { const b = document.querySelector('.detail-body'); if (!b) return 'NO DETAIL'; const heads = [...b.querySelectorAll('h1,h2,h3,[class*=title],[class*=name]')].map(e => e.tagName + '.' + e.className.slice(0, 24) + '=' + (e.innerText || '').slice(0, 40)); return { firstText: b.innerText.replace(/\\s+/g, ' ').slice(0, 120), heads }; })()`));
await shot('r15-detail-kusama.png');
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
await sleep(500);
// ---- far pins with zoom-in first
await click('#tab-map'); await sleep(2000);
console.log('zoom-in clicks:', await cdp.eval(`(() => { const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^[＋+]$/.test((b.innerText || '').trim())); if (!btns.length) return 'none found'; for (let i = 0; i < 3; i++) btns[0].click(); return 'clicked x3'; })()`));
await sleep(1500);
console.log('mapZoom now:', await cdp.eval(`String(window.mapZoom)`));
async function dragStep(dx, dy) {
  const cx = 195, cy = 430;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  const steps = 8;
  for (let s = 1; s <= steps; s++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(cx + dx * s / steps), y: Math.round(cy + dy * s / steps), button: 'left' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(cx + dx), y: Math.round(cy + dy), button: 'left', clickCount: 1 });
  await sleep(450);
}
const pinRect = fid => cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="${fid}"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) }; })()`);
for (const fid of ['eg6-shinagawa-aqua', 'eg6-shitamachi']) {
  let pos = await pinRect(fid);
  let ok = false, g = 0;
  while (pos && pos.w >= 8 && g < 20) {
    if (pos.x > 45 && pos.x < 345 && pos.y > 140 && pos.y < 750) { ok = true; break; }
    const dx = Math.max(-130, Math.min(130, 195 - pos.x));
    const dy = Math.max(-130, Math.min(130, 430 - pos.y));
    if (dx === 0 && dy === 0) break;
    await dragStep(dx, dy);
    pos = await pinRect(fid);
    g++;
  }
  console.log('FAR-Z', fid, 'pos:', JSON.stringify(pos), 'reached:', ok, 'gestures:', g);
  if (ok) {
    await cdp.eval(`document.querySelector('.pin[data-qid="${fid}"]').click()`);
    await sleep(1100);
    console.log('FAR-Z', fid, 'detail:', await cdp.eval(`(() => { const b = document.querySelector('.detail-body'); return b && b.offsetParent ? b.innerText.replace(/\\s+/g, ' ').slice(0, 56) : 'no detail'; })()`));
    await shot('r15-far-' + fid.replace('eg6-', '') + '.png');
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
    await sleep(500);
  }
}
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
