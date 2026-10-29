import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r15/';
mkdirSync(SHOTS, { recursive: true });
const ADDED = JSON.parse(readFileSync(ROOT + '/qa/tools/added50-r2.json', 'utf8'));
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
rmSync(`/tmp/tsq-r15d-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15d-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
cdp.handlers.push(m => { if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || '').slice(0, 100)); });
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3200);
await click('#startBtn'); await sleep(1200);
const NAMES = await cdp.eval(`(() => { const o = {}; EVENTS.filter(e => e.id.startsWith('eg6-')).forEach(e => { o[e.id] = e.name_ja; }); return o; })()`);
console.log('names resolved:', Object.keys(NAMES).length);
// ---------- filters via toggle tab + chip by text ----------
await click('#tab-list'); await sleep(1800);
const rowsCount = () => cdp.eval(`document.querySelectorAll('.ms-row').length`);
console.log('rows unfiltered:', await rowsCount());
console.log('toggle click:', await cdp.eval(`(() => { const bar = document.getElementById('mapFilters'); const btns = [...bar.querySelectorAll('button')]; const tab = btns.find(b => /[▼▲▾▴]/.test(b.innerText || '')) || btns[btns.length - 1]; if (tab) { tab.click(); return 'tab:' + (tab.innerText || tab.className).slice(0, 20); } return 'no tab'; })()`));
await sleep(900);
console.log('folded now:', await cdp.eval(`window.mapFiltersFolded`), 'chips vis:', await cdp.eval(`[...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent).length`));
for (const label of ['期間限定', '史詩', 'レジェンド', 'すべて']) {
  await cdp.eval(`(() => { const c = [...document.querySelectorAll('.mf-chip')].find(x => x.offsetParent && x.innerText.replace(/\\s+/g, '').startsWith(${JSON.stringify(label)})); if (c) c.click(); })()`);
  await sleep(1100);
  console.log('FILTER', label, 'rows:', await rowsCount());
}
// ---------- detail loop by name_ja ----------
const NOTE_IDS = { 'eg6-kusama': /予約/, 'eg6-kirby': /予約/, 'eg6-pokemon-cafe': /予約/, 'eg6-tokiwaso': /予約/, 'eg6-forum': /休館|改修|クローズ/ };
const fails = [];
let gearSeen = 0;
const noteResults = {};
for (let i = 0; i < ADDED.length; i++) {
  const q = ADDED[i];
  const nm = NAMES[q.id] || '';
  const opened = await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; const r = rows.find(e => (e.querySelector('.ms-name-t') || {}).innerText === ${JSON.stringify(nm)}) || rows.find(e => e.innerText.includes(${JSON.stringify(nm.slice(0, 7))})); if (!r) return 'no row'; r.click(); return 'ok'; })()`);
  if (opened !== 'ok') { fails.push(q.id + ':no-row(' + nm + ')'); continue; }
  await sleep(600);
  const chk = await cdp.eval(`(() => {
    const body = document.querySelector('.detail-body');
    if (!body || !body.offsetParent) return { detail: false };
    const img = body.querySelector('img');
    const txt = body.innerText.replace(/\\s+/g, ' ');
    return { detail: true, photo: img ? (img.complete && img.naturalWidth > 0) : false, nw: img ? img.naturalWidth : 0, hasGear: /限定装備/.test(txt), titleOk: txt.includes(${JSON.stringify(nm.slice(0, 5))}), txt: txt.slice(0, 1000) };
  })()`);
  if (!chk.detail || !chk.photo || !chk.titleOk) fails.push(q.id + ':' + JSON.stringify({ d: chk.detail, p: chk.photo, t: chk.titleOk }));
  if (chk.hasGear) gearSeen++;
  if (NOTE_IDS[q.id]) noteResults[q.id] = { match: NOTE_IDS[q.id].test(chk.txt || ''), snippet: (chk.txt || '').slice(0, 500) };
  if ((i + 1) % 10 === 0) console.log('... progress', i + 1, '/50 fails:', fails.length);
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
  await sleep(320);
}
console.log('DETAIL LOOP fails:', JSON.stringify(fails));
console.log('GEAR line seen:', gearSeen, '/50');
for (const [id, r] of Object.entries(noteResults)) console.log('NOTE', id, 'match:', r.match, '|', r.snippet.slice(0, 260));
// ---------- far pins ----------
await click('#tab-map'); await sleep(2000);
async function touchDrag(dx, dy) {
  const cx = 195, cy = 430;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  const steps = 10;
  for (let s = 1; s <= steps; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(cx + dx * s / steps), y: Math.round(cy + dy * s / steps), id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(600);
}
const pinRect = fid => cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="${fid}"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) }; })()`);
const FAR = ['eg6-shinagawa-aqua', 'eg6-shitamachi', 'eg6-kirby', 'eg6-nintendo', 'eg6-fukagawa-edo'];
for (const fid of FAR) {
  let pos = await pinRect(fid);
  let zooms = 0;
  while ((!pos || pos.w < 8) && zooms < 4) {
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '＋' || (x.innerText || '').trim() === '+'); if (b) b.click(); })()`);
    await sleep(900);
    pos = await pinRect(fid);
    zooms++;
  }
  let ok = false, tries = 0;
  while (pos && pos.w >= 8 && tries < 6) {
    if (pos.x > 40 && pos.x < 350 && pos.y > 130 && pos.y < 770) { ok = true; break; }
    await touchDrag(195 - pos.x, 430 - pos.y);
    pos = await pinRect(fid);
    tries++;
  }
  console.log('FAR', fid, 'pos:', JSON.stringify(pos), 'reached:', ok);
  if (ok) {
    await cdp.eval(`document.querySelector('.pin[data-qid="${fid}"]').click()`);
    await sleep(1100);
    const det = await cdp.eval(`(() => { const b = document.querySelector('.detail-body'); return b && b.offsetParent ? b.innerText.replace(/\\s+/g, ' ').slice(0, 50) : 'no detail'; })()`);
    console.log('FAR', fid, 'detail:', det);
    await shot('r15-far-' + fid.replace('eg6-', '') + '.png');
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
    await sleep(500);
  }
}
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
