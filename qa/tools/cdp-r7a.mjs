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
rmSync(`/tmp/tsq-r7a-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7a-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
}
// ---------- Q-107 konbini gap (Lv1 day + Lv30 day)
for (const [label, seed] of [['lv1', { ...BASE, theme: 'emerald' }], ['lv30', { ...BASE, theme: 'emerald', bonusExp: 19500, sceneSeen: 30 }]]) {
  await boot(seed);
  await click('#tab-hero'); await waitStable();
  console.log('Q107 ' + label, JSON.stringify(await cdp.eval(`(() => {
    const hero = [...document.querySelectorAll('#heroScreen *')].find(e => /hero/i.test(e.className || '') && e.getBoundingClientRect().width > 40 && e.getBoundingClientRect().width < 140);
    const cand = [...document.querySelectorAll('#heroScreen *')].map(e => ({ e, r: e.getBoundingClientRect() })).filter(x => x.r.width >= 30 && x.r.height >= 20 && x.r.top > 300 && x.r.top < 700);
    return { heroRect: hero ? [Math.round(hero.getBoundingClientRect().left), Math.round(hero.getBoundingClientRect().right)] : 'nf',
      sceneKids: cand.slice(0, 18).map(x => ({ tag: x.e.tagName, cls: (x.e.className || '').toString().slice(0, 34), alt: x.e.getAttribute && (x.e.getAttribute('alt') || x.e.getAttribute('data-prop') || ''), rect: [Math.round(x.r.left), Math.round(x.r.top), Math.round(x.r.width), Math.round(x.r.height)] })) };
  })()`)));
  await shot(`r7-q107-hero-${label}-390.png`);
}
// ---------- Q-108 records tab trace (JA midnight Lv1)
await boot(BASE);
await click('#tab-hero'); await waitStable();
console.log('RECORDS OPEN:', await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"], [data-openwin="status"]'); if (!b) return 'missing: ' + [...document.querySelectorAll('[data-openwin]')].map(x => x.getAttribute('data-openwin')).join(','); b.click(); return 'ok ' + b.getAttribute('data-openwin'); })()`));
await waitStable();
const TRACE = `((tabSel) => new Promise(res => {
  const tab = document.querySelector(tabSel);
  if (!tab) return res('tab missing ' + tabSel);
  const tops = []; const t0 = performance.now();
  tab.click();
  const iv = setInterval(() => {
    const b2 = document.querySelector('.rec-tabs, [class*=rec-tab]');
    const target = b2 ? b2.getBoundingClientRect().top : 0;
    tops.push(Math.round(target * 10) / 10);
    if (performance.now() - t0 > 900) { clearInterval(iv); res(JSON.stringify({ n: tops.length, min: Math.min(...tops), max: Math.max(...tops), first: tops[0], last: tops[tops.length - 1] })); }
  }, 16);
}))`;
for (const [name, sel] of [['titles->badges', '[data-rectab="badges"]'], ['badges->log', '[data-rectab="log"]'], ['log->titles', '[data-rectab="titles"]']]) {
  console.log('Q108 ' + name, await cdp.eval(TRACE + `(${JSON.stringify(sel)})`));
}
await shot('r7-q108-records-390.png');
await cdp.eval(`(() => { const c = document.querySelector('#hsegRecords .win-close, [data-closewin], .win-x'); if (c) c.click(); return !!c; })()`);
await sleep(500);
// ---------- Q-110 gacha dots (Lv10 seed: tickets > 0)
await boot({ ...BASE, bonusExp: 1200 });
await click('#tab-hero'); await waitStable();
const DOTPROBE = `(() => {
  const gachaBtn = document.querySelector('[data-openwin="gacha"]');
  const heroTab = document.querySelector('#tab-hero');
  const find = root => root ? [...root.querySelectorAll('*')].filter(e => /dot|badge|pip/i.test((e.className || '').toString()) && e.getBoundingClientRect().width >= 4 && e.getBoundingClientRect().width <= 16).map(e => ({ cls: (e.className || '').toString().slice(0, 40), rect: [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().width)] })) : 'noroot';
  return { ticketsText: (document.body.innerText.match(/×\\s?\\d+/) || [''])[0], gachaDots: find(gachaBtn), tabDots: find(heroTab) };
})()`;
console.log('Q110 dots WITH tickets:', JSON.stringify(await cdp.eval(DOTPROBE)));
await shot('r7-q110-dots-on-390.png');
await cdp.eval(`document.querySelector('[data-openwin="gacha"]').click()`);
await waitStable();
let pulls = 0;
for (let i = 0; i < 40; i++) {
  const t = await cdp.eval(`(() => { const w = document.getElementById('hsegGacha'); const m = w ? w.innerText.match(/TICKET × (\\d+)/) : null; return m ? Number(m[1]) : -1; })()`);
  if (t <= 0) break;
  await cdp.eval(`(() => { const w = document.getElementById('hsegGacha'); const els = [...w.querySelectorAll('button, [role=button], div, span')].filter(e => /PULL/.test(e.innerText || '') && e.children.length <= 2); if (els.length) els[els.length - 1].click(); return els.length; })()`);
  pulls++; await sleep(2600);
}
console.log('Q110 pulls done:', pulls);
await cdp.eval(`(() => { const c = document.querySelector('#hsegGacha .win-close, [data-closewin]'); if (c) c.click(); return !!c; })()`);
await sleep(600); await waitStable();
console.log('Q110 dots AFTER 0 tickets:', JSON.stringify(await cdp.eval(DOTPROBE)));
await shot('r7-q110-dots-off-390.png');
// ---------- Q-109 map filter default (seed has no fold key)
await click('#tab-map'); await waitStable();
const BAR = `(() => { const bar = document.getElementById('mapFilters'); const box = document.getElementById('mapBox'); const chips = [...document.querySelectorAll('#mapFilters [data-mf]')].map(c => { const r = c.getBoundingClientRect(); return { label: c.textContent.trim(), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; }); return { folded: box.classList.contains('filters-folded'), barH: Math.round(bar.getBoundingClientRect().height), strip: box.classList.contains('filters-folded') ? bar.innerText.replace(/\\n/g, ' ').trim() : '', chips }; })()`;
console.log('Q109 DEFAULT STATE:', JSON.stringify(await cdp.eval(BAR)));
await shot('r7-q109-default-390.png');
await click('#mfFoldTab'); await waitStable();
console.log('Q109 AFTER FOLDTAB CLICK:', JSON.stringify(await cdp.eval(BAR)));
await shot('r7-q109-aftertab-390.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
