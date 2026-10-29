// R16 · Q-125 state matrix on the auth rig (tql.test, stubbed Supabase).
// States: (A) logged-in + local save, (B) logged-in + NO local save (Zoe's failing state).
import { spawn } from 'node:child_process';
const SDK = readFileSync('/home/hatch/workspace/tsq-live/qa/tools/supabase.min.js', 'utf8');
import { readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SHOTS = ROOT + '/qa/shots/2026-10-29-r16/';
mkdirSync(SHOTS, { recursive: true });
const HS = '/opt/hatch/assets/artifacts/headless-shell/chrome-headless-shell';
const CHROME = existsSync(HS) ? HS : '/opt/meta-chromium/chrome';
const EXTRA = CHROME === HS ? [] : ['--headless=new'];
const SDK_B64 = readFileSync(ROOT + '/qa/tools/supabase.min.js').toString('base64');
const DOC_B64 = readFileSync(ROOT + '/index.html').toString('base64');
const PAGE = 'http://tql.test:8977/index.html';
const PORT = 9700 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const net = { token: 0 };
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
}
rmSync(`/tmp/tsq-r16a-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r16a-${PORT}`, '--window-size=1440,900', '--host-resolver-rules=MAP tql.test 127.0.0.1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'qa@example.com', app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: { full_name: 'QA Tester' }, created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z' };
const QA_JWT = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url') + '.' + Buffer.from(JSON.stringify({sub:'11111111-1111-1111-1111-111111111111',email:'qa@example.com',aud:'authenticated',role:'authenticated',exp:1999999999,iat:1700000000})).toString('base64url') + '.c2ln';
const SESSION = { access_token: QA_JWT, refresh_token: 'qa-rt', token_type: 'bearer', expires_in: 3600, expires_at: 1999999999, user: USER };
const fulfillJson = (requestId, code, obj) => cdp.send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(obj)).toString('base64') });
cdp.handlers.push(async m => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request, resourceType } = m.params; const url = request.url;
  try {
    if (request.method === 'OPTIONS') return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }], body: '' }));
    if (url.includes('supabase-js')) return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: SDK_B64 }));
    if (url.includes('/auth/v1/authorize')) return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from('<title>google stub</title>').toString('base64') }));
    if (url.includes('/auth/v1/token')) { net.token++; return void (await fulfillJson(requestId, 200, SESSION)); }
    if (url.includes('/auth/v1/user')) return void (await fulfillJson(requestId, 200, USER));
    if (url.includes('/rest/v1/saves')) { if (request.method !== 'GET') return void (await fulfillJson(requestId, 200, {})); return void (await fulfillJson(requestId, 200, { user_id: USER.id, data: null, updated_at: '2026-10-29T00:00:00Z' })); }
    if (url.includes('supabase.co')) return void (await fulfillJson(requestId, 200, {}));
    if (url.includes('tql.test:8977')) {
      if (resourceType === 'Document') return void (await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: DOC_B64 }));
      return void (await fulfillJson(requestId, 404, {}));
    }
    await cdp.send('Fetch.continueRequest', { requestId });
  } catch { try { await cdp.send('Fetch.continueRequest', { requestId }); } catch {} }
});
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*supabase*', requestStage: 'Request' }, { urlPattern: '*tql.test*', requestStage: 'Request' }] });
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await cdp.send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 });
const shot = async name => { const d = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }); writeFileSync(SHOTS + name, Buffer.from(d.data, 'base64')); };
const surfaces = label => cdp.eval(`(() => {
  const btn = document.querySelector('.auth-mini-btn');
  const head = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length <= 3 && /おかえり|ようこそ|冒険者を作|作成|はじめよう/.test(e.innerText || '')).map(e => (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 44)).slice(0, 2);
  const t = document.body.innerText;
  return { label: ${JSON.stringify(label)}, authBtn: btn ? btn.innerText.trim().slice(0, 30) : 'none', head, hasZoeQA: t.includes('ZoeQA'), genericHero: /おかえり、冒険者|冒険者を作ろう|冒険者を作成/.test(t) };
})()`).then(r => console.log(JSON.stringify(r)));
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: PAGE });
await sleep(3000);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', {});
await sleep(3500);
// login flow (as r16d)
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.offsetParent && /ログイン/.test(x.innerText || '') && !/Google/.test(x.innerText || '')); if (b) b.click(); })()`);
await sleep(1800);
await cdp.eval(`document.getElementById('authGoogleBtn').click()`);
await sleep(3000);
await cdp.send('Page.navigate', { url: PAGE + '?code=qa-test-code' });
await sleep(5000);
// name prompt -> ZoeQA
await cdp.eval(`(() => { const inp = [...document.querySelectorAll('input')].filter(i => i.offsetParent)[0]; if (inp) { const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value').set; setter.call(inp, 'ZoeQA'); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); } })()`);
await sleep(400);
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /決定|保存|はじめる|OK|登録/.test(x.innerText || '') && !/Google/.test(x.innerText || '')); if (b) b.click(); })()`);
await sleep(3000);
console.log('AUTH WINDOW GREETING:', JSON.stringify(await cdp.eval(`(() => { const t = document.body.innerText; const m = t.match(/おかえりなさい[^。！]{0,20}|ようこそ[^。！]{0,20}|ログインしました[^。]{0,16}/); return m ? m[0] : 'no greeting found'; })()`)));
await sleep(1500);
await surfaces('A logged-in + local save');
await shot('r16auth-a-title.png');
// ---- state B: wipe local game save, keep the sb session
await cdp.eval(`(() => { const keep = {}; Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => keep[k] = localStorage.getItem(k)); localStorage.clear(); Object.entries(keep).forEach(([k, v]) => localStorage.setItem(k, v)); return Object.keys(keep); })()`).then(k => console.log('kept session keys:', JSON.stringify(k)));
await cdp.send('Page.reload', {});
await sleep(5000);
await surfaces('B logged-in + NO local save');
await shot('r16auth-b-title.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
