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
rmSync(`/tmp/tsq-r7a2-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7a2-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'] }); } catch {}
async function waitStable(t = 12000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 0, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function boot(seed) {
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(seed))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
}
// ---------- Q-107: dump hero screen structure first
await boot({ ...BASE, theme: 'emerald', sceneSeen: 1 });
await click('#tab-hero'); await waitStable();
console.log('SCENE DUMP', JSON.stringify(await cdp.eval(`(() => {
  const scr = document.querySelector('#heroScreen') || [...document.querySelectorAll('section, div')].find(e => e.id && /hero/i.test(e.id));
  const root = scr || document.body;
  const items = [...root.querySelectorAll('*')].map(e => { const r = e.getBoundingClientRect(); return { e, r }; }).filter(x => x.r.width >= 24 && x.r.height >= 16 && x.r.top > 250 && x.r.bottom < 720);
  return items.slice(0, 26).map(x => ({ tag: x.e.tagName, id: x.e.id || '', cls: (x.e.className || '').toString().slice(0, 36), dp: x.e.getAttribute && (x.e.getAttribute('data-prop') || x.e.getAttribute('alt') || ''), rect: [Math.round(x.r.left), Math.round(x.r.top), Math.round(x.r.width), Math.round(x.r.height)] }));
})()`)));
await shot('r7-q107-hero-lv1-390.png');
// ---------- Q-108: discover records tabs then trace
console.log('RECORDS OPEN:', await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (!b) return 'missing'; b.click(); return 'ok'; })()`));
await waitStable();
console.log('REC TABS DUMP', JSON.stringify(await cdp.eval(`(() => {
  const w = document.getElementById('hsegRecords');
  if (!w) return 'no win';
  const tabs = [...w.querySelectorAll('button, [role=tab], [class*=tab]')].map(e => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 40), attrs: [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join(' '), text: (e.innerText || '').trim().slice(0, 14), rect: [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)] }));
  return { winRect: [Math.round(w.getBoundingClientRect().top), Math.round(w.getBoundingClientRect().height)], tabs: tabs.slice(0, 10) };
})()`)));
const traceTab = idx => cdp.eval(`(() => new Promise(res => {
  const w = document.getElementById('hsegRecords') || document.querySelector('[id*=Records], [id*=records]');
  if (!w) return res('no records win');
  const tabs = [...w.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 40 && b.getBoundingClientRect().top < w.getBoundingClientRect().top + 130);
  if (!tabs[${idx}]) return res('no tab idx ${idx} of ' + tabs.length);
  const bar = tabs[0].parentElement;
  const tops = []; const t0 = performance.now();
  tabs[${idx}].click();
  const iv = setInterval(() => { tops.push(Math.round(bar.getBoundingClientRect().top * 10) / 10); if (performance.now() - t0 > 900) { clearInterval(iv); const settled = tops[tops.length - 1]; res(JSON.stringify({ n: tops.length, min: Math.min(...tops), max: Math.max(...tops), settled, maxDev: Math.max(...tops.map(t => Math.abs(t - settled))) })); } }, 16);
}))()`);
for (const [name, idx] of [['to-badges', 1], ['to-log', 2], ['to-titles', 0]]) console.log('Q108 ' + name, await traceTab(idx));
await shot('r7-q108-records-390.png');
await cdp.eval(`(() => { const w = document.getElementById('hsegRecords'); const c = w && w.querySelector('button'); return false; })()`);
// close via ✕ text button in window
await cdp.eval(`(() => { const w = document.getElementById('hsegRecords'); const c = [...w.querySelectorAll('button')].find(b => (b.innerText || '').trim() === '✕'); if (c) c.click(); return !!c; })()`);
await sleep(500);
// ---------- Q-110 with JA-aware ticket reads
await boot({ ...BASE, bonusExp: 1200 });
await click('#tab-hero'); await waitStable();
const DOTPROBE = `(() => {
  const out = {};
  const gb = document.querySelector('[data-openwin="gacha"]');
  out.gachaDot = gb ? [...gb.querySelectorAll('*')].filter(e => /dot/i.test((e.className || '').toString())).map(e => [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().width)]) : 'nobtn';
  const ht = document.querySelector('#tab-hero');
  out.heroTabHTML = ht ? ht.innerHTML.slice(0, 300) : 'notab';
  out.heroTabDots = ht ? [...ht.querySelectorAll('*')].filter(e => /dot|badge|pip/i.test((e.className || '').toString())).map(e => (e.className || '').toString().slice(0, 40)) : [];
  return out;
})()`;
console.log('Q110 ON:', JSON.stringify(await cdp.eval(DOTPROBE)));
await shot('r7-q110-dots-on-390.png');
await cdp.eval(`document.querySelector('[data-openwin="gacha"]').click()`);
await waitStable();
console.log('GACHA WIN TEXT:', JSON.stringify(await cdp.eval(`document.getElementById('hsegGacha').innerText.replace(/\\s+/g, ' ').slice(0, 130)`)));
let pulls = 0;
for (let i = 0; i < 40; i++) {
  const st = await cdp.eval(`(() => { const w = document.getElementById('hsegGacha'); const pullBtn = [...w.querySelectorAll('button')].find(b => /PULL|引く|つかう/.test(b.innerText || '') && !b.disabled); const dis = [...w.querySelectorAll('button')].find(b => /PULL|引く/.test(b.innerText || '')); return { canPull: !!pullBtn, anyPull: dis ? { text: dis.innerText.trim().slice(0, 20), disabled: !!dis.disabled } : null, win: w.innerText.replace(/\\s+/g, ' ').slice(0, 60) }; })()`);
  if (!st.canPull) { console.log('Q110 pull stop:', JSON.stringify(st)); break; }
  await cdp.eval(`(() => { const w = document.getElementById('hsegGacha'); const b = [...w.querySelectorAll('button')].find(x => /PULL|引く|つかう/.test(x.innerText || '') && !x.disabled); if (b) b.click(); return !!b; })()`);
  pulls++; await sleep(2800);
}
console.log('Q110 pulls:', pulls);
await cdp.eval(`(() => { const w = document.getElementById('hsegGacha'); const c = [...w.querySelectorAll('button')].find(b => (b.innerText || '').trim() === '✕'); if (c) c.click(); return !!c; })()`);
await sleep(600); await waitStable();
console.log('Q110 OFF:', JSON.stringify(await cdp.eval(DOTPROBE)));
await shot('r7-q110-dots-off-390.png');
// ---------- Q-109 visual on real map screen
await click('#tab-map'); await waitStable();
const BAR = `(() => { const bar = document.getElementById('mapFilters'); const box = document.getElementById('mapBox'); return { folded: box.classList.contains('filters-folded'), barH: Math.round(bar.getBoundingClientRect().height), strip: box.classList.contains('filters-folded') ? bar.innerText.replace(/\\n/g, ' ').trim() : '', stripHTML: bar.innerHTML.slice(0, 260) }; })()`;
console.log('Q109 ON MAP:', JSON.stringify(await cdp.eval(BAR)));
await shot('r7-q109-map-default-390.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
