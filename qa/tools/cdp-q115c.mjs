// Q-115 static-finding verification: live session + cloud save that beats local -> does applyCloud's unconditional reload loop?
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const SDK_B64 = readFileSync('/tmp/supabase.min.js').toString('base64');
const DOC_B64 = readFileSync(ROOT + '/index.html').toString('base64');
const PAGE = 'http://tql.test:8977/index.html';
const REF = 'amanohlkajnilhsbofun';
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let docCount = 0, savesGets = 0;
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-q115c-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-q115c-${PORT}`, '--window-size=1440,900', '--host-resolver-rules=MAP tql.test 127.0.0.1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'qa@example.com', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z' };
const SESSION = { access_token: 'qa-access-token', refresh_token: 'qa-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: USER };
const CLOUD_SAVE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 99999, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 30, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 0, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } }, savedAt: Date.now() };
const fulfillJson = (requestId, code, obj) => cdp.send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(obj)).toString('base64') });
cdp.handlers.push(async m => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request, resourceType } = m.params; const url = request.url;
  try {
    if (request.method === 'OPTIONS') return void (await fulfillJson(requestId, 200, {}));
    if (url.includes('supabase-js')) return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: SDK_B64 }));
    if (url.includes('/auth/v1/user')) return void (await fulfillJson(requestId, 200, USER));
    if (url.includes('/auth/v1/token')) return void (await fulfillJson(requestId, 200, SESSION));
    if (url.includes('/rest/v1/saves')) { savesGets++; return void (await fulfillJson(requestId, 200, { user_id: USER.id, data: CLOUD_SAVE, updated_at: '2026-10-29T00:00:00Z' })); }
    if (url.includes('supabase.co')) return void (await fulfillJson(requestId, 200, {}));
    if (url.includes('tql.test:8977')) {
      if (resourceType === 'Document') { docCount++; return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: DOC_B64 })); }
      return void (await fulfillJson(requestId, 404, {}));
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
// seed: local save (low EXP) + live supabase session in storage
await cdp.send('Page.navigate', { url: PAGE });
await sleep(3000);
await cdp.eval(`(() => { localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify(SESSION))}); return 'seeded'; })()`);
docCount = 0; savesGets = 0;
await cdp.send('Page.navigate', { url: PAGE });
const t0 = Date.now(); let last = 0;
while (Date.now() - t0 < 30000) { await sleep(1000); if (docCount !== last) { console.log('docCount ->', docCount, 'savesGets', savesGets, 'at', Math.round((Date.now() - t0) / 1000) + 's'); last = docCount; } }
console.log('FINAL', JSON.stringify({ docCount, savesGets }));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
