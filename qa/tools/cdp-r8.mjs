// R8 retest on 487f61e: Q-114 gesture scroll (family x 600/667), Q-112 title, Q-113 tabs 3-lang + Q-108 shift, feedback entry, Q-111 spot.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r8/';
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
rmSync(`/tmp/tsq-r8f-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r8f-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const seed = lang => ({ lang, muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } });
async function boot(H, lang = 'ja') {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: H });
  await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
  await waitStable();
  await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(seed(lang)))}); 'ok'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitStable();
}
async function fingerDrag(x, yFrom, dy) {
  const steps = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yFrom, id: 1 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(yFrom + (dy * i) / steps), id: 1 }] }); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(500);
}
// find the real scroller inside the currently-open hero window (panel itself or inner .cust-panel style descendant)
const FIND_SCROLLER = `(() => {
  const panels = [...document.querySelectorAll('[id^="hseg"], #creatorScroll')].filter(p => !p.hidden && p.getBoundingClientRect().height > 100);
  const panel = panels[panels.length - 1];
  if (!panel) return null;
  const cands = [panel, ...panel.querySelectorAll('*')].filter(e => { const oy = getComputedStyle(e).overflowY; return (oy === 'auto' || oy === 'scroll') && e.clientHeight > 80; });
  cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
  const s = cands[0] || panel;
  window.__qaS = s;
  const r = s.getBoundingClientRect();
  return { panel: panel.id, scroller: s.id || s.className.toString().slice(0, 30), sh: s.scrollHeight, ch: s.clientHeight, x: Math.round(r.left + r.width / 2), yT: Math.round(r.top + 30), yB: Math.round(r.bottom - 30) };
})()`;
const MEASURE = `(() => { const s = window.__qaS; if (!s) return 'none'; const r = s.getBoundingClientRect();
  const kids = [...s.querySelectorAll('*')].filter(k => k.children.length === 0 && k.getBoundingClientRect().height > 0 && getComputedStyle(k).visibility !== 'hidden');
  const last = kids[kids.length - 1]; const lr = last ? last.getBoundingClientRect() : null;
  return { scrollTop: Math.round(s.scrollTop), maxTop: s.scrollHeight - s.clientHeight, atBottom: Math.abs(s.scrollTop - (s.scrollHeight - s.clientHeight)) <= 2, lastBottom: lr ? Math.round(lr.bottom) : null, contBottom: Math.round(r.bottom), lastVisible: lr ? lr.bottom <= r.bottom + 1 : null }; })()`;
async function gestureBottom(label) {
  const info = await cdp.eval(FIND_SCROLLER);
  if (!info) { console.log(label, 'NO PANEL'); return; }
  let prev = -1, stuck = false;
  for (let i = 0; i < 16; i++) {
    const m = await cdp.eval(MEASURE);
    if (m.atBottom) break;
    if (m.scrollTop === prev) { stuck = true; break; }
    prev = m.scrollTop;
    await fingerDrag(info.x, info.yB, -(info.yB - info.yT));
  }
  console.log(label, JSON.stringify({ ...info, stuck, final: await cdp.eval(MEASURE) }));
}
const closeWin = () => cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
// ============ Q-112 title @600 + @667
for (const H of [600, 667]) {
  await boot(H);
  console.log('Q112 TITLE@' + H + ':', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('button, a')].filter(b => b.offsetParent && /ログイン|応援/.test(b.innerText || '')).map(b => { const r = b.getBoundingClientRect(); return { text: b.innerText.replace(/\\s+/g, ' ').trim().slice(0, 8), bottom: Math.round(r.bottom), margin: innerHeight - Math.round(r.bottom), visible: r.bottom <= innerHeight && r.top >= 0 }; }))()`)));
  if (H === 600) await shot('r8-q112-title-600.png');
}
// ============ Q-114 family gesture scroll @600 and @667
for (const H of [600, 667]) {
  await boot(H);
  await click('#startBtn'); await waitStable();
  await click('#tab-hero'); await waitStable();
  for (const w of ['studio', 'gacha', 'records', 'collection']) {
    await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="${w}"]'); if (b) b.click(); return !!b; })()`);
    await waitStable();
    await gestureBottom('Q114@' + H + ' ' + w);
    if (w === 'studio' && H === 600) await shot('r8-q114-studio-600-bottom.png');
    await closeWin(); await sleep(400);
  }
  // customize: discover opener — click hero slot / edit candidates until #hsegCustom unhides
  const opened = await cdp.eval(`(() => {
    const cands = [...document.querySelectorAll('button, div, span')].filter(e => e.offsetParent && e.getBoundingClientRect().top < 330 && e.getBoundingClientRect().width > 30 && e.getBoundingClientRect().width < 190);
    window.__qaCands = cands; return cands.length;
  })()`);
  let customOk = false;
  const n = Math.min(opened, 14);
  for (let i = 0; i < n && !customOk; i++) {
    await cdp.eval(`(() => { const e = window.__qaCands[${i}]; if (e) e.click(); return !!e; })()`);
    await sleep(450);
    customOk = await cdp.eval(`(() => { const p = document.getElementById('hsegCustom'); return !!p && !p.hidden; })()`);
  }
  console.log('Q114@' + H + ' CUSTOM OPENER:', customOk ? 'found' : 'NOT FOUND');
  if (customOk) { await gestureBottom('Q114@' + H + ' custom'); await shot(`r8-q114-custom-${H}-bottom.png`); await closeWin(); await sleep(400); }
}
// ============ Q-113 tabs in 3 languages + Q-108 shift re-trace (JA)
for (const lang of ['ja', 'en', 'zh']) {
  await boot(844, lang);
  await click('#startBtn'); await waitStable();
  await click('#tab-hero'); await waitStable();
  await cdp.eval(`(() => { const b = document.querySelector('[data-openwin="records"]'); if (b) b.click(); return !!b; })()`);
  await waitStable();
  console.log('Q113 TABS ' + lang + ':', JSON.stringify(await cdp.eval(`(() => [...document.querySelectorAll('.rec-tabs button')].map(b => ({ label: b.innerText.trim(), sw: b.scrollWidth, cw: b.clientWidth, overflowX: b.scrollWidth > b.clientWidth + 1, lines: Math.round(b.getBoundingClientRect().height) })))()`)));
  if (lang === 'ja') await shot('r8-q113-tabs-ja.png');
  if (lang === 'ja') {
    for (const idx of [1, 2, 0]) {
      const trace = await cdp.eval(`(() => new Promise(res => {
        const bar = document.querySelector('.rec-tabs'); const win = bar ? bar.closest('[id^="hseg"]') || bar.parentElement.parentElement : null;
        const tops = []; const wTops = []; let n = 0;
        const btns = document.querySelectorAll('.rec-tabs button');
        function fr() { tops.push(bar.getBoundingClientRect().top); if (win) wTops.push(win.getBoundingClientRect().top); if (++n < 22) requestAnimationFrame(fr); else { const dev = a => Math.max(...a) - Math.min(...a); res({ barDev: dev(tops), winDev: dev(wTops) }); } }
        requestAnimationFrame(fr); btns[${idx}].click();
      }))()`);
      console.log('Q108 RETRACE to tab', idx, JSON.stringify(trace));
      await sleep(600);
    }
  }
  await closeWin(); await sleep(400);
}
// ============ Feedback entry in settings sheet
await boot(844);
await click('#startBtn'); await waitStable();
console.log('FEEDBACK:', JSON.stringify(await cdp.eval(`(() => {
  const tabs = [...document.querySelectorAll('button, div')].filter(e => e.offsetParent && /表示設定|設定/.test(e.innerText || '') && e.getBoundingClientRect().top > 700);
  if (tabs.length) tabs[tabs.length - 1].click();
  return 'tab clicked: ' + tabs.length;
})()`)));
await waitStable();
console.log('FEEDBACK BTN:', JSON.stringify(await cdp.eval(`(() => {
  const b = [...document.querySelectorAll('a, button')].find(e => e.offsetParent && /フィードバック/.test(e.innerText || ''));
  return b ? { text: b.innerText.trim().slice(0, 20), href: b.getAttribute('href') || b.href || '(button)' } : 'NOT FOUND';
})()`)));
await shot('r8-feedback-settings.png');
// ============ Q-111 spot @600
await click('#tab-list'); await waitStable();
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 600, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 600 });
await cdp.eval(`(() => { const rows = [...document.querySelectorAll('.q-row, [data-qid], li, div')].filter(e => e.offsetParent && /羊フェスタ/.test(e.innerText || '') && e.getBoundingClientRect().height > 20 && e.getBoundingClientRect().height < 140); if (rows.length) rows[rows.length - 1].click(); return rows.length; })()`);
await waitStable();
console.log('Q111@600:', JSON.stringify(await cdp.eval(`(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.offsetParent && /公式ページ/.test(x.innerText || '')); if (!b) return 'nf'; const r = b.getBoundingClientRect(); return { margin: innerHeight - Math.round(r.bottom), visible: r.bottom <= innerHeight }; })()`)));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
