import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r11/';
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
rmSync(`/tmp/tsq-r11-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r11-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
function seed(lang) { return { lang, muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } }; }
async function boot(lang, h = 844) {
  await setH(h);
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(seed(lang)))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
  await click('#startBtn'); await waitStable();
}
// ============ 1) Q-116 gap (records titles) @844/@600
for (const H of [844, 600]) {
  await boot('ja', H);
  await click('#tab-hero'); await waitStable();
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  console.log('Q116 @' + H + ':', JSON.stringify(await cdp.eval(`(() => {
    const vis = e => !!e.offsetParent;
    const expBar = [...document.querySelectorAll('*')].find(e => vis(e) && /つぎのLvまで/.test(e.innerText || '') && e.children.length <= 3 && e.getBoundingClientRect().height < 60);
    const pg = [...document.querySelectorAll('*')].find(e => vis(e) && /^\\d+ \\/ \\d+$/.test((e.innerText || '').trim()) && e.getBoundingClientRect().width < 90);
    if (!expBar || !pg) return { expBar: !!expBar, pg: !!pg };
    const pr = pg.getBoundingClientRect(), er = expBar.getBoundingClientRect();
    let row = pr; let n = pg;
    for (let i = 0; i < 3 && n.parentElement; i++) { n = n.parentElement; const r = n.getBoundingClientRect(); if (r.width > 200) { row = r; break; } }
    return { vh: innerHeight, pagerBottom: Math.round(row.bottom), expTop: Math.round(er.top), gap: Math.round(er.top - row.bottom) };
  })()`)));
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
  await sleep(400);
}
// ============ 2) Q-118 filter bar (new design)
await boot('ja');
await click('#tab-map'); await waitStable();
const FB = `(() => {
  const bar = document.getElementById('mapFilters');
  const tab = document.getElementById('mfFoldTab');
  const b = bar.getBoundingClientRect();
  const glyphs = [...bar.querySelectorAll('*')].filter(e => /[▸▾▴▾]/.test(e.innerText || '') && e.children.length === 0).length;
  const chips = [...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent);
  const tops = [...new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)))];
  const side = document.getElementById('mapSideTag');
  const cur = document.getElementById('mapFilterCur');
  return { barTop: Math.round(b.top), barBottom: Math.round(b.bottom), foldTabExists: !!tab, chevronsInBar: glyphs,
    sideText: side ? side.innerText.trim() : null, summaryMid: cur ? cur.innerText.trim() : null,
    chips: chips.length, chipRows: tops.length, chipMaxRight: chips.length ? Math.round(Math.max(...chips.map(c => c.getBoundingClientRect().right))) : null,
    inBig: document.getElementById('mapBox').classList.contains('in-big') };
})()`;
console.log('FB folded small :', JSON.stringify(await cdp.eval(FB)));
await shot('r11-fb-folded.png');
// click the BAR BODY (left-center, on the summary area) to expand
await cdp.eval(`(() => { const b = document.getElementById('mapFilters'); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 60, r.top + r.height / 2); (el || b).click(); return el ? el.className.toString().slice(0, 20) : 'bar'; })()`);
await sleep(600);
console.log('FB expanded     :', JSON.stringify(await cdp.eval(FB)));
await shot('r11-fb-expanded.png');
// pan swallow: drag on bar vs map, plane proxy
const PLANE = `(() => { const els = [...document.querySelectorAll('#mapBox *')].filter(e => e.offsetParent && getComputedStyle(e).transform !== 'none' && e.getBoundingClientRect().width > 800); if (!els.length) return null; const r = els[0].getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; })()`;
await cdp.eval(`document.getElementById('mapExpandBtn').click()`);
await waitStable();
async function drag(x, y, dx, dy) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 5, y: y + dy * i / 5, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(600);
}
const pl0 = await cdp.eval(PLANE);
await drag(195, 420, -70, 40);
const pl1 = await cdp.eval(PLANE);
const barC = await cdp.eval(`(() => { const b = document.getElementById('mapFilters').getBoundingClientRect(); return [Math.round(b.left + 40), Math.round(b.top + b.height / 2)]; })()`);
await drag(barC[0], barC[1], -70, 40);
const pl2 = await cdp.eval(PLANE);
console.log('FB PAN A/B      : plane', JSON.stringify(pl0), '->map drag->', JSON.stringify(pl1), '->bar drag->', JSON.stringify(pl2));
console.log('FB big state    :', JSON.stringify(await cdp.eval(FB)));
// ============ 3) rename widths x3 + Q-119 pager x3
for (const lang of ['ja', 'en', 'zh']) {
  await boot(lang);
  await click('#tab-map'); await waitStable();
  await cdp.eval(`(() => { const b = document.getElementById('mapFilters'); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 60, r.top + r.height / 2); (el || b).click(); return 1; })()`);
  await sleep(500);
  const ren = await cdp.eval(`(() => {
    const side = document.getElementById('mapSideTag');
    const chips = [...document.querySelectorAll('.mf-chip')].filter(c => c.offsetParent);
    return { side: side ? side.innerText.trim() : null, sideEllipsis: side ? side.scrollWidth > side.clientWidth + 1 : null,
      chipsEllipsis: chips.filter(c => c.scrollWidth > c.clientWidth + 1).length, chipRows: [...new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)))].length };
  })()`);
  await click('#tab-hero'); await waitStable();
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  const tabs = await cdp.eval(`(() => [...document.querySelectorAll('.rec-tabs button')].map(b => ({ t: b.innerText.trim(), ell: b.scrollWidth > b.clientWidth + 1 })))()`);
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
  await sleep(300);
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="collection"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  const pager = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('.book-btn')].map(b => { const r = b.getBoundingClientRect(); return { text: JSON.stringify(b.innerText.trim()), w: Math.round(r.width), h: Math.round(r.height) }; });
    const pg = document.querySelector('.book-pg');
    const dots = [...document.querySelectorAll('.book-nav *')].filter(e => /●|・|dot/i.test((e.className || '').toString() + ' ' + (e.innerText || ''))).length;
    return { btns, pg: pg ? pg.innerText.trim().slice(0, 34) : null, pgH: pg ? Math.round(pg.getBoundingClientRect().height) : null, dotsHint: dots };
  })()`);
  console.log('LANG ' + lang + ':', JSON.stringify({ ren, tabs, pager }));
  await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
  await sleep(300);
}
// ============ 4) wish flag @844/@600
for (const H of [844, 600]) {
  await boot('ja', H);
  await click('#tab-hero'); await waitStable();
  console.log('FLAG @' + H + ':', JSON.stringify(await cdp.eval(`(() => {
    const wf = document.querySelector('[class*=wf-], [id*=wish], [class*=wish]');
    const hero = document.querySelector('.walk-hero');
    const all = [...document.querySelectorAll('[class*=wf-]')].map(e => ({ cls: e.className.toString().slice(0, 24), text: (e.innerText || '').trim().slice(0, 20), x: Math.round(e.getBoundingClientRect().left), y: Math.round(e.getBoundingClientRect().top), w: Math.round(e.getBoundingClientRect().width) }));
    const hr = hero ? hero.getBoundingClientRect() : null;
    return { wfEls: all.slice(0, 5), heroAt: hr ? [Math.round(hr.left), Math.round(hr.top)] : null };
  })()`)));
  await shot('r11-flag-' + H + '.png');
}
// flag edit flow @844
await boot('ja', 844);
await click('#tab-hero'); await waitStable();
console.log('FLAG TAP:', JSON.stringify(await cdp.eval(`(() => { const e = document.querySelector('.wf-text, [class*=wf-]'); if (!e) return 'none'; e.click(); return e.className.toString().slice(0, 24); })()`)));
await sleep(800);
console.log('FLAG EDITOR:', JSON.stringify(await cdp.eval(`(() => { const inp = document.querySelector('input[type=text], textarea'); const dlg = [...document.querySelectorAll('*')].filter(e => e.offsetParent && /願い|心愿|wish/i.test(e.innerText || '') && e.getBoundingClientRect().width > 200 && e.getBoundingClientRect().width < 390).length; return { input: !!inp, dlgLike: dlg }; })()`)));
await cdp.eval(`(() => { const inp = document.querySelector('input[type=text], textarea'); if (inp) { inp.focus(); inp.value = '本を12冊読む'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } return !!inp; })()`);
await sleep(300);
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /保存|決定|OK|はい/.test(x.innerText || '')); if (b) b.click(); return !!b; })()`);
await sleep(800);
console.log('FLAG AFTER EDIT:', JSON.stringify(await cdp.eval(`(() => { const e = document.querySelector('.wf-text'); const st = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return { flagText: e ? e.innerText.trim().slice(0, 24) : null, wishInSave: st.wishText || null }; })()`)));
await shot('r11-flag-edited.png');
console.log('ERRORS:', errors.length, JSON.stringify(errors.slice(0, 2)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
