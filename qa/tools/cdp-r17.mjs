import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const DIR = ROOT + '/qa/shots/2026-10-29-r17/';
mkdirSync(DIR, { recursive: true });
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
rmSync(`/tmp/tsq-r17-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r17-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 600 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(DIR + name, Buffer.from(d.data, 'base64')); };
const mouse = async (type, x, y) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
const tapXY = async (x, y) => { await mouse('mousePressed', x, y); await sleep(60); await mouse('mouseReleased', x, y); await sleep(120); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(3000);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(4500);
await cdp.eval(`(() => { const b = document.querySelector('#startBtn'); if (b && b.offsetParent) b.click(); })()`);
await sleep(1200);
console.log('continue:', await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getBoundingClientRect().width > 0 && /つづける|冒険を/.test(x.innerText || '')); if (!b) return 'missing'; b.click(); return 'ok'; })()`));
await sleep(1800);
await cdp.eval(`(() => { const t = document.querySelector('#tab-map'); if (t) t.click(); })()`);
await sleep(2500);
// 1) folded state discovery @390x600
console.log('FOLDED DUMP:', await cdp.eval(`(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => { const r = b.getBoundingClientRect(); return { cls: String(b.className).slice(0, 34), txt: (b.innerText || '').trim().slice(0, 10), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  const rightEdge = btns.filter(b => b.x > 300);
  const bars = [...document.querySelectorAll('[class*=filter], [class*=fold]')].filter(e => e.getBoundingClientRect().height > 0).map(e => String(e.className).slice(0, 30) + ' h' + Math.round(e.getBoundingClientRect().height));
  return JSON.stringify({ rightEdge, bars });
})()`));
await shot('r17-folded-600.png');
// find the round filter button: roughly square, right side, not the zoom/fullscreen controls (identify by funnel-ish class or position mid-right)
const btnCenter = await cdp.eval(`(() => {
  const cands = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 30 && Math.abs(r.width - r.height) < 8 && r.left > 290 && r.top > 60 && r.top < 480 && !/全画面|現在地|＋|−|\\+/.test(b.innerText || ''); });
  const b = cands[0];
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), cls: String(b.className).slice(0, 40), bg: getComputedStyle(b).backgroundColor };
})()`);
console.log('ROUND BTN:', JSON.stringify(btnCenter));
// 2) open sheet with mid-frame sampling
if (btnCenter) {
  await mouse('mousePressed', btnCenter.x, btnCenter.y); await mouse('mouseReleased', btnCenter.x, btnCenter.y);
  await shot('r17-anim-t0.png');
  await sleep(110); await shot('r17-anim-t110.png');
  await sleep(130); await shot('r17-anim-t240.png');
  await sleep(320); await shot('r17-sheet-open.png');
  console.log('SHEET:', await cdp.eval(`(() => {
    const sheet = [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().height > 0 && /絞り込み/.test(e.textContent || '') && e.querySelectorAll('button').length >= 5).pop();
    const dock = document.querySelector('#tab-list') ? document.querySelector('#tab-list').closest('nav, [class*=dock], [class*=bar]') : null;
    const dr = dock ? dock.getBoundingClientRect() : null;
    return JSON.stringify({ sheetCls: sheet ? String(sheet.className).slice(0, 40) : 'not found', sheetText: sheet ? (sheet.innerText || '').split(String.fromCharCode(10)).slice(0, 8).join('/') : '', dockRect: dr ? [Math.round(dr.top), Math.round(dr.height)] : null, dockVisible: dr ? dr.height > 0 && dr.top < 600 : null });
  })()`));
  // 3) choose a non-default filter chip （期間限定）, then close via scrim tap (above sheet)
  console.log('chip:', await cdp.eval(`(() => { const c = [...document.querySelectorAll('button')].find(b => b.getBoundingClientRect().height > 0 && (b.innerText || '').trim() === '期間限定'); if (!c) return 'missing'; c.click(); return 'ok'; })()`));
  await sleep(500);
  await shot('r17-sheet-filter-chosen.png');
  await tapXY(195, 90); // scrim area above the sheet
  await sleep(600);
  console.log('AFTER SCRIM:', await cdp.eval(`(() => {
    const sheetStill = [...document.querySelectorAll('*')].some(e => e.getBoundingClientRect().height > 40 && /気分でさがす|ムード/.test(e.textContent || '') && e.querySelectorAll('button').length >= 5 && e.getBoundingClientRect().top > 100);
    const preview = [...document.querySelectorAll('*')].some(e => e.getBoundingClientRect().height > 0 && /詳細をひらく/.test(e.textContent || ''));
    return JSON.stringify({ sheetStillOpen: sheetStill, previewOpenedByScrimTap: preview });
  })()`));
  await shot('r17-after-scrim.png');
  console.log('BADGE STATE:', await cdp.eval(`(() => {
    const b = document.querySelector('.mf-fab'); if (!b) return 'gone';
    const badge = b.querySelector('[class*=badge], [class*=count]') || b;
    return JSON.stringify({ fabCls: String(b.className).slice(0, 50), fabBg: getComputedStyle(b).backgroundColor, badgeBg: getComputedStyle(badge).backgroundColor, txt: (b.innerText || '').trim().slice(0, 12) });
  })()`));
}
// 4) drag A/B: measure a pin displacement after incremental drags
const pinBefore = await cdp.eval(`(() => { const p = [...document.querySelectorAll('button.pin')].find(x => { const r = x.getBoundingClientRect(); return r.left > 30 && r.left < 340 && r.top > 80 && r.top < 520; }); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; })()`);
console.log('pin before:', JSON.stringify(pinBefore));
await mouse('mousePressed', 195, 320);
for (let i = 1; i <= 4; i++) { await mouse('mouseMoved', 195 - i * 30, 320); await sleep(50); }
await mouse('mouseReleased', 75, 320);
await sleep(700);
const pinAfter = await cdp.eval(`(() => { const p = [...document.querySelectorAll('button.pin')].find(x => { const r = x.getBoundingClientRect(); return r.left > 30 && r.left < 340 && r.top > 80 && r.top < 520; }); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; })()`);
console.log('pin after drag (expect ~+120 x if pan follows):', JSON.stringify(pinAfter));
// 5) full map: 2-button stack
console.log('fullmap btn:', await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getBoundingClientRect().width > 0 && /全画面|⤢/.test(x.innerText || x.getAttribute('aria-label') || '')); if (!b) return 'missing'; b.click(); return 'ok'; })()`));
await sleep(900);
await shot('r17-fullmap.png');
console.log('FULLMAP right-edge buttons:', await cdp.eval(`(() => { const btns = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left > 290; }).map(b => { const r = b.getBoundingClientRect(); return (b.innerText || '').trim().slice(0, 8) + '@' + Math.round(r.top); }); return JSON.stringify(btns); })()`));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
