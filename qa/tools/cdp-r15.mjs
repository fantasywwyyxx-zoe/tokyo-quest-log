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
rmSync(`/tmp/tsq-r15-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r15-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
console.log('EVENTS count:', await cdp.eval(`EVENTS.length`));
const NAMES = await cdp.eval(`(() => { const o = {}; EVENTS.filter(e => e.id.startsWith('eg6-')).forEach(e => { o[e.id] = e.name || e.venue || e.title || JSON.stringify(Object.keys(e)); }); return o; })()`);
console.log('EG6 names sample:', JSON.stringify(Object.entries(NAMES).slice(0, 3)));
// ---------- list counts ----------
await click('#tab-list'); await sleep(1800);
const rowsCount = () => cdp.eval(`document.querySelectorAll('.ms-row').length`);
console.log('LIST rows (all):', await rowsCount());
await cdp.eval(`document.getElementById('mapFilters').click()`);
await sleep(700);
for (const [label, idx] of [['TIMED', 1], ['EPIC', 2], ['LEGEND', 3], ['ALL', 0]]) {
  await cdp.eval(`(() => { const chips = [...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent); if (chips[${idx}]) chips[${idx}].click(); })()`);
  await sleep(900);
  console.log('FILTER', label, 'rows:', await rowsCount());
}
// ---------- detail loop ----------
const NOTE_IDS = { 'eg6-kusama': /予約/, 'eg6-kirby': /予約/, 'eg6-pokemon-cafe': /予約/, 'eg6-tokiwaso': /予約/, 'eg6-forum': /休館|改修/ };
const fails = [];
let gearSeen = 0;
const noteResults = {};
for (let i = 0; i < ADDED.length; i++) {
  const q = ADDED[i];
  const nm = NAMES[q.id] || '';
  const opened = await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.ms-row')]; const r = rows.find(e => (e.querySelector('.ms-name-t') || {}).innerText === ${JSON.stringify(nm)}) || rows.find(e => e.innerText.includes(${JSON.stringify(nm.slice(0, 8))})); if (!r) return 'no row'; r.click(); return 'ok'; })()`);
  if (opened !== 'ok') { fails.push(q.id + ':no-row(name=' + nm + ')'); continue; }
  await sleep(600);
  const chk = await cdp.eval(`(() => {
    const body = document.querySelector('.detail-body');
    if (!body || !body.offsetParent) return { detail: false };
    const img = body.querySelector('img');
    const txt = body.innerText.replace(/\\s+/g, ' ');
    return { detail: true, photo: img ? (img.complete && img.naturalWidth > 0) : false, nw: img ? img.naturalWidth : 0, hasGear: /限定装備/.test(txt), txt: txt.slice(0, 900) };
  })()`);
  if (!chk.detail || !chk.photo) fails.push(q.id + ':' + JSON.stringify({ d: chk.detail, p: chk.photo, nw: chk.nw }));
  if (chk.hasGear) gearSeen++;
  if (NOTE_IDS[q.id]) {
    noteResults[q.id] = { match: NOTE_IDS[q.id].test(chk.txt || ''), snippet: (chk.txt || '').slice(0, 400) };
  }
  if ((i + 1) % 10 === 0) console.log('... progress', i + 1, '/50 fails:', fails.length);
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
  await sleep(320);
}
console.log('DETAIL LOOP fails:', JSON.stringify(fails));
console.log('GEAR line seen:', gearSeen, '/50');
for (const [id, r] of Object.entries(noteResults)) console.log('NOTE', id, 'match:', r.match, '|', r.snippet.replace(/\n/g, ' ').slice(0, 220));
// ---------- credits fold ----------
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /表示設定|⚙/.test(x.innerText || '')); if (b) b.click(); })()`);
await sleep(1200);
const credits = await cdp.eval(`(() => {
  const heads = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && /写真クレジット/.test(e.innerText || ''));
  if (!heads.length) return { found: false };
  let h = heads[heads.length - 1];
  let hdr = h; while (hdr && !(hdr.getAttribute && hdr.getAttribute('style') && /pointer/.test(hdr.getAttribute('style') || '')) && hdr.parentElement && hdr.parentElement !== document.body) { if (getComputedStyle(hdr).cursor === 'pointer') break; hdr = hdr.parentElement; }
  hdr.click();
  return { found: true };
})()`);
await sleep(900);
console.log('CREDITS fold:', JSON.stringify(credits), await cdp.eval(`(() => {
  const all = document.body.innerText;
  const seg = all.split('写真クレジット')[1] || '';
  const lines = seg.split('\\n').map(x => x.trim()).filter(x => /CC BY|CC0|パブリックドメイン|Public Domain/i.test(x));
  return { ccLines: lines.length, first: lines[0] || '', last: lines[lines.length - 1] || '' };
})()`));
await shot('r15-credits-fold.png');
// ---------- map: bar + far pins ----------
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
await click('#tab-map'); await sleep(2000);
console.log('MAP shown count:', await cdp.eval(`mapShownCount`), 'bar text:', await cdp.eval(`(() => { const b = document.getElementById('mapFilters'); return b ? b.innerText.replace(/\\s+/g, ' ').slice(0, 60) : 'none'; })()`));
async function dragBy(dx, dy) {
  const cx = 195, cy = 430;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  const steps = 12;
  for (let s = 1; s <= steps; s++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + dx * s / steps, y: cy + dy * s / steps, button: 'left' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + dx, y: cy + dy, button: 'left', clickCount: 1 });
  await sleep(500);
}
const FAR = ['eg6-shinagawa-aqua', 'eg6-shitamachi', 'eg6-kirby', 'eg6-nintendo', 'eg6-fukagawa-edo'];
for (const fid of FAR) {
  let ok = false, tries = 0;
  while (!ok && tries < 5) {
    const pos = await cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="${fid}"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; })()`);
    if (!pos) { console.log('FAR', fid, 'PIN NOT FOUND'); break; }
    if (pos.x > 30 && pos.x < 360 && pos.y > 120 && pos.y < 780) { ok = true; break; }
    await dragBy(Math.round(195 - pos.x), Math.round(430 - pos.y));
    tries++;
  }
  if (ok) {
    const tap = await cdp.eval(`(() => { const p = document.querySelector('.pin[data-qid="${fid}"]'); if (!p) return 'gone'; p.click(); return 'clicked'; })()`);
    await sleep(1100);
    const det = await cdp.eval(`(() => { const b = document.querySelector('.detail-body'); return b && b.offsetParent ? (b.innerText.replace(/\\s+/g, ' ').slice(0, 60)) : 'no detail'; })()`);
    console.log('FAR', fid, 'tap:', tap, '| detail:', det);
    await shot('r15-far-' + fid.replace('eg6-', '') + '.png');
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '✕'); if (b) b.click(); })()`);
    await sleep(500);
  } else console.log('FAR', fid, 'NOT REACHED after drags');
}
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
