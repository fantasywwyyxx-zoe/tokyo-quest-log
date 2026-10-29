import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
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
rmSync(`/tmp/tsq-r14-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r14-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const click = sel => cdp.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.click(); return 'ok'; })()`);
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 60, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 2, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2200);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(2800);
await click('#startBtn'); await sleep(1000);
await click('#tab-hero'); await sleep(1200);
const stateBefore = await cdp.eval(`localStorage.getItem('tql_state_v1')`);
// in-page sampler: hero lane + per-lane obstacle pixel counts in the near zone
const SAMPLE = `(() => {
  const win = document.querySelector('.run-win');
  const cv = win ? [...win.querySelectorAll('canvas')].filter(c => c.offsetParent).sort((a, b) => b.width * b.height - a.width * a.height)[0] : null;
  const hud = win ? win.innerText.replace(/\\s+/g, ' ') : '';
  const dm = hud.match(/(\\d{1,4})\\s*m(?!s)/);
  const out = { dist: dm ? Number(dm[1]) : null, crashed: /クラッシュ/.test(hud), goal: /300m達成|券をゲット|ゲット|おめでとう/.test(hud), cv: null };
  if (!cv) return out;
  const W = cv.width, H = cv.height;
  const ctx = cv.getContext('2d');
  let img; try { img = ctx.getImageData(0, 0, W, H).data; } catch (e) { out.cv = 'tainted'; return out; }
  const HOR = Math.round(H * 0.34);
  const HX = [164, 180, 196].map(v => v / 360 * W), BX = [64, 180, 296].map(v => v / 360 * W);
  // hero: cap-blue centroid in bottom strip
  let sx = 0, sn = 0;
  for (let y = Math.round(H * 0.72); y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4, r = img[i], g = img[i + 1], b = img[i + 2]; if (b > 115 && b - r > 55 && r < 95 && g < 150) { sx += x; sn++; } }
  const heroX = sn > 8 ? sx / sn : null;
  out.heroLane = heroX === null ? null : BX.reduce((bi, bx, i) => Math.abs(bx - heroX) < Math.abs(BX[bi] - heroX) ? i : bi, 0);
  out.blocked = [0, 0, 0];
  for (let y = Math.round(H * 0.60); y < Math.round(H * 0.93); y += 2) {
    const t = Math.min(1, Math.max(0, (y - HOR) / (H - HOR))), p = Math.sqrt(t);
    for (let L = 0; L < 3; L++) {
      const cx = HX[L] + (BX[L] - HX[L]) * p, half = 8 + p * 20;
      for (let x = Math.round(cx - half); x < cx + half; x += 2) {
        if (x < 0 || x >= W) continue;
        const i = (y * W + x) * 4, r = img[i], g = img[i + 1], b = img[i + 2];
        const orange = r > 175 && g > 70 && g < 180 && b < 110;
        const gray = r > 103 && r < 178 && Math.abs(r - g) < 26 && Math.abs(g - b) < 26;
        if (orange || gray) out.blocked[L]++;
      }
    }
  }
  out.cv = { W, H };
  return out;
})()`;
async function key(dir) {
  const k = dir < 0 ? 'ArrowLeft' : 'ArrowRight';
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: dir < 0 ? 37 : 39 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: dir < 0 ? 37 : 39 });
}
let finalResult = null;
for (let attempt = 1; attempt <= 2 && !finalResult; attempt++) {
  if (attempt === 1) {
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.innerText || '').trim() === '▶ スタート'); if (b) b.click(); return !!b; })()`);
  } else {
    await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /もう一度/.test(x.innerText || '')); if (b) b.click(); return !!b; })()`);
  }
  await sleep(900);
  const t0 = Date.now();
  let lastDist = 0, samples = 0, steerLog = [];
  while (Date.now() - t0 < 80000) {
    const s = await cdp.eval(SAMPLE).catch(() => null);
    if (!s) { await sleep(200); continue; }
    samples++;
    if (s.dist !== null) lastDist = Math.max(lastDist, s.dist);
    if (samples <= 3 || samples % 25 === 0) steerLog.push(JSON.stringify({ d: s.dist, hero: s.heroLane, blocked: s.blocked, cv: s.cv }));
    if (s.goal || (s.dist !== null && s.dist >= 300)) { finalResult = { outcome: 'GOAL', dist: lastDist, attempt }; break; }
    if (s.crashed) { finalResult = lastDist >= 300 ? { outcome: 'GOAL', dist: lastDist, attempt } : null; console.log('ATTEMPT', attempt, 'CRASHED at', lastDist, 'm'); break; }
    if (s.heroLane !== null && s.blocked) {
      const cur = s.blocked[s.heroLane];
      if (cur > 26) {
        const order = [0, 1, 2].filter(l => l !== s.heroLane).sort((a, b) => s.blocked[a] - s.blocked[b]);
        const target = order[0];
        if (s.blocked[target] < cur - 6) await key(Math.sign(target - s.heroLane));
      }
    }
    await sleep(130);
  }
  console.log('ATTEMPT', attempt, 'samples:', steerLog.slice(0, 8).join(' | '));
  if (!finalResult && lastDist > 0) console.log('ATTEMPT', attempt, 'ended without crash flag, lastDist', lastDist);
}
console.log('RESULT:', JSON.stringify(finalResult));
const stateAfter = await cdp.eval(`localStorage.getItem('tql_state_v1')`);
const diff = {};
try {
  const a = JSON.parse(stateBefore), b = JSON.parse(stateAfter);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff[k] = { from: a[k], to: b[k] };
} catch (e) { diff.error = String(e); }
console.log('STATE DIFF:', JSON.stringify(diff).slice(0, 600));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
