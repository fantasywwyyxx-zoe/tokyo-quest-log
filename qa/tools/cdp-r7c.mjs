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
rmSync(`/tmp/tsq-r7c-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7c-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const MEASURE = `(() => {
  const btns = [...document.querySelectorAll('button, a')].filter(b => b.offsetParent && /公式ページ|あと9日|受注する/.test(b.innerText || ''));
  const scrollers = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 150 && e.offsetParent).map(e => ({ id: e.id || '', cls: (e.className || '').toString().slice(0, 30), sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY }));
  return { vh: innerHeight, vvh: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    btns: btns.map(b => { const r = b.getBoundingClientRect(); return { text: b.innerText.replace(/\\s+/g, ' ').trim().slice(0, 12), top: Math.round(r.top), bottom: Math.round(r.bottom), fullyVisible: r.bottom <= innerHeight && r.top >= 0 }; }),
    detailScrollers: scrollers.slice(0, 3) };
})()`;
async function openSheep(H) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: H });
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
  await click('#tab-list'); await waitStable();
  await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.q-row, [data-qid], li, div')].filter(e => e.offsetParent && /羊フェスタ/.test(e.innerText || '') && e.getBoundingClientRect().height > 20 && e.getBoundingClientRect().height < 140); if (rows.length) rows[rows.length - 1].click(); return rows.length; })()`);
  await waitStable();
}
for (const H of [844, 760, 667, 583, 600, 516]) {
  await openSheep(H);
  console.log('Q111 H=' + H, JSON.stringify(await cdp.eval(MEASURE)));
  if ([844, 760, 600, 516].includes(H)) await shot(`r7-q111-sheep-${H}.png`);
}
// if a detail scroller exists at 516, scroll it and re-measure
console.log('Q111 516 SCROLL TEST:', JSON.stringify(await cdp.eval(`(() => {
  const s = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 150 && e.offsetParent).sort((a, b) => b.clientHeight - a.clientHeight)[0];
  if (!s) return 'no scroller';
  s.scrollTop = s.scrollHeight;
  const btns = [...document.querySelectorAll('button, a')].filter(b => b.offsetParent && /公式ページ/.test(b.innerText || ''));
  return { scrolledTo: s.scrollTop, btns: btns.map(b => { const r = b.getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight, visible: r.bottom <= innerHeight && r.top >= 0 }; }) };
})()`)));
await shot('r7-q111-sheep-516-scrolled.png');
// ---------- Q-106 audit on list screen
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
await sleep(600);
await click('#tab-list'); await waitStable();
console.log('Q106 HUD DUMP:', JSON.stringify(await cdp.eval(`(() => {
  const toggles = [...document.querySelectorAll('[class*=status-toggle], [class*=expand], #statusCard, [class*=status-card]')].map(e => ({ cls: (e.className || '').toString().slice(0, 40), disp: getComputedStyle(e).display, vis: !!e.offsetParent }));
  const pill = [...document.querySelectorAll('*')].find(e => e.offsetParent && /^×\\s?1$/.test((e.innerText || '').trim()) && e.getBoundingClientRect().top < 120);
  const nameEl = [...document.querySelectorAll('*')].find(e => e.offsetParent && /Zoe/.test(e.innerText || '') && e.getBoundingClientRect().top < 120 && e.children.length <= 2);
  return { toggles, pillRect: pill ? [Math.round(pill.getBoundingClientRect().left), Math.round(pill.getBoundingClientRect().top), Math.round(pill.getBoundingClientRect().right)] : 'nf',
    bodyHasTitleText: /見習いウォーカー/.test(document.body.innerText.slice(0, 400)) };
})()`)));
// try clicking the header/status area to expand anything
console.log('Q106 CLICK HEADER:', JSON.stringify(await cdp.eval(`(() => {
  const before = document.body.innerText.length;
  const hdr = [...document.querySelectorAll('*')].find(e => e.offsetParent && /Zoe/.test(e.innerText || '') && e.getBoundingClientRect().top < 80 && e.getBoundingClientRect().height < 90);
  if (hdr) hdr.click();
  return { clicked: !!hdr };
})()`)));
await sleep(900);
console.log('Q106 AFTER CLICK:', JSON.stringify(await cdp.eval(`(() => {
  const expanded = [...document.querySelectorAll('*')].filter(e => e.offsetParent && /見習いウォーカー/.test(e.innerText || '') && e.getBoundingClientRect().top < 200 && e.getBoundingClientRect().height > 30 && e.getBoundingClientRect().height < 160);
  return { expandedCardLike: expanded.length, buildVer: (document.getElementById('buildVerLine') || {}).textContent || 'nf' };
})()`)));
await shot('r7-q106-list-header-844.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
