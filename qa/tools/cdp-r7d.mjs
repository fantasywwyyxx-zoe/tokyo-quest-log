import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r7/';
mkdirSync(SHOTS, { recursive: true });
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const SDK_B64 = readFileSync('/tmp/supabase.min.js').toString('base64');
const OLD_B64 = readFileSync('/tmp/old-auth.html').toString('base64');
const NEW_B64 = readFileSync(ROOT + '/index.html').toString('base64');
const PAGE_URL = 'http://tql.test:8977/index.html';
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = { docReqs: 0, checkReqs: 0, authorizeNav: '' };
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-r7d-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7d-${PORT}`, '--window-size=1440,900', '--host-resolver-rules=MAP tql.test 127.0.0.1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
const fulfill = (requestId, code, bodyB64, headers) => cdp.send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: headers || [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: bodyB64 });
cdp.handlers.push(async m => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request, resourceType } = m.params; const url = request.url;
  try {
    if (request.method === 'OPTIONS') return void (await fulfill(requestId, 200, '', [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }]));
    if (url.includes('supabase-js')) return void (await fulfill(requestId, 200, SDK_B64, [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }]));
    if (url.includes('/auth/v1/authorize')) { state.authorizeNav = url; return void (await fulfill(requestId, 200, Buffer.from('<title>stub</title>').toString('base64'), [{ name: 'Content-Type', value: 'text/html' }])); }
    if (url.includes('supabase.co')) return void (await fulfill(requestId, 200, Buffer.from('{}').toString('base64')));
    if (url.includes('tql.test:8977')) {
      if (resourceType === 'Document') { state.docReqs++; return void (await fulfill(requestId, 200, OLD_B64, [{ name: 'Content-Type', value: 'text/html' }])); }
      if (resourceType === 'Fetch' || resourceType === 'XHR') { state.checkReqs++; return void (await fulfill(requestId, 200, NEW_B64, [{ name: 'Content-Type', value: 'text/html' }])); }
      return void (await fulfill(requestId, 404, Buffer.from('').toString('base64')));
    }
    await cdp.send('Fetch.continueRequest', { requestId });
  } catch { try { await cdp.send('Fetch.continueRequest', { requestId }); } catch {} }
});
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*supabase*', requestStage: 'Request' }, { urlPattern: '*supabase-js*', requestStage: 'Request' }, { urlPattern: '*tql.test*', requestStage: 'Request' }] });
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'], origin: 'http://tql.test:8977' }); } catch {}
async function waitStable(t = 9000) { const t0 = Date.now(); let last = '', same = 0; while (Date.now() - t0 < t) { const sig = await cdp.eval(`(() => { const f = document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length : 0; return [document.readyState, f, document.body ? document.body.innerText.length : 0].join('#'); })()`).catch(() => 'x'); if (sig === last && Number(sig.split('#')[1]) === 0) { if (++same >= 3) return; } else { same = 0; last = sig; } await sleep(300); } }
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 1, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
// ---- banner rig: OLD client served as document; its version check fetch gets NEW bytes
await cdp.send('Page.navigate', { url: PAGE_URL });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
state.checkReqs = 0;
await cdp.send('Page.reload', {});
await waitStable(); await sleep(4000);
console.log('BANNER STATE:', JSON.stringify({ state, banner: await cdp.eval(`(() => { const b = document.getElementById('verBanner'); return b ? { hidden: b.hidden, text: (document.getElementById('verBannerText') || {}).textContent || '' } : 'absent'; })()`), clientBuild: await cdp.eval(`(() => { const m = document.documentElement.innerHTML.match(/TQL v[0-9.]+-auth/) || document.body.innerText.match(/TQL v\\S+/); return 'page stamp check via buildVerLine: ' + ((document.getElementById('buildVerLine') || {}).textContent || 'nf'); })()`) }));
const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
writeFileSync(SHOTS + 'r7-ver-banner-fired-390.png', Buffer.from(d.data, 'base64'));
console.log('BANNER CLICK -> reload?', JSON.stringify(await cdp.eval(`(() => { const b = document.getElementById('verBanner'); if (b && !b.hidden) { b.click(); return 'clicked'; } return 'not visible'; })()`)));
await sleep(2500);
console.log('AFTER CLICK docReqs:', state.docReqs, '(expect +1 if reload happened)');
// ---- Google routine re-confirm on the NEW build (same rig, document swap not needed: reload page is OLD; instead navigate data check skipped — do it on file:// new build with stub)
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
