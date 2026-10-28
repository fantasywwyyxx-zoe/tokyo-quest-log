// Q-115 addendum rig: reload counting under (S1) code return, (S2) error return, (S3) version mismatch, (S4) return-URL replay.
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const SDK_B64 = readFileSync('/tmp/supabase.min.js').toString('base64');
const NEW_B64 = readFileSync(ROOT + '/index.html').toString('base64');
const OLD_B64 = readFileSync('/tmp/old-auth.html').toString('base64');
const PAGE = 'http://tql.test:8977/index.html';
const REF = 'amanohlkajnilhsbofun';
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let docBytes = NEW_B64, docCount = 0, checkCount = 0, tokenCount = 0;
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-q115b-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q115b-${PORT}`, '--window-size=1440,900', '--host-resolver-rules=MAP tql.test 127.0.0.1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'qa@example.com', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z' };
const SESSION = { access_token: 'qa-access-token', refresh_token: 'qa-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: USER };
const fulfillJson = (requestId, code, obj) => cdp.send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(obj)).toString('base64') });
cdp.handlers.push(async m => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request, resourceType } = m.params; const url = request.url;
  try {
    if (request.method === 'OPTIONS') return void (await fulfillJson(requestId, 200, {}));
    if (url.includes('supabase-js')) return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: SDK_B64 }));
    if (url.includes('/auth/v1/token')) { tokenCount++; return void (await fulfillJson(requestId, 200, SESSION)); }
    if (url.includes('/auth/v1/user')) return void (await fulfillJson(requestId, 200, USER));
    if (url.includes('supabase.co')) return void (await fulfillJson(requestId, 200, url.includes('/rest/') ? [] : {}));
    if (url.includes('tql.test:8977')) {
      if (resourceType === 'Document') { docCount++; return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: docBytes })); }
      checkCount++; return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: NEW_B64 }));
    }
    await cdp.send('Fetch.continueRequest', { requestId });
  } catch { try { await cdp.send('Fetch.continueRequest', { requestId }); } catch {} }
});
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*supabase*', requestStage: 'Request' }, { urlPattern: '*tql.test*', requestStage: 'Request' }] });
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
try { await cdp.send('Browser.grantPermissions', { permissions: ['geolocation'], origin: 'http://tql.test:8977' }); } catch {}
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 0, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 1, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
async function seedAndGo(url, verifier) {
  docCount = 0; checkCount = 0; tokenCount = 0;
  await cdp.send('Page.navigate', { url: PAGE });
  await sleep(2500);
  await cdp.eval(`(() => { localStorage.clear(); localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); ${verifier ? `localStorage.setItem('sb-${REF}-auth-token-code-verifier', 'qa-verifier-123');` : ''} return 'ok'; })()`).catch(() => 'eval raced a reload');
  docCount = 0; checkCount = 0; tokenCount = 0;
  await cdp.send('Page.navigate', { url });
}
async function observe(label, ms) {
  const t0 = Date.now(); let last = docCount;
  while (Date.now() - t0 < ms) { await sleep(1000); if (docCount !== last) { console.log(' ', label, 'docCount ->', docCount, 'at', Math.round((Date.now() - t0) / 1000) + 's'); last = docCount; } }
  console.log(label, JSON.stringify({ docCount, checkCount, tokenCount, finalUrl: await cdp.eval(`location.href.slice(0, 70)`).catch(() => '?') }));
}
// S1 code return
docBytes = NEW_B64;
await seedAndGo(PAGE + '?code=qa-test-code', true);
await observe('S1 code-return', 15000);
// S4 replay of the same return URL (Safari restoring it)
docCount = 0; tokenCount = 0;
await cdp.send('Page.navigate', { url: PAGE + '?code=qa-test-code' });
await observe('S4 code-replay', 10000);
// S2 error return
await seedAndGo(PAGE + '?error=access_denied&error_code=oauth_error&error_description=QA+simulated', false);
await observe('S2 error-return', 15000);
// S3 version mismatch: OLD client document, its check gets NEW bytes, no clicks
docBytes = OLD_B64;
await seedAndGo(PAGE, false);
await observe('S3 version-mismatch', 20000);
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
