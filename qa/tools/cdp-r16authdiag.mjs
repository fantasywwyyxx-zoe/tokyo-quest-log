import { spawn } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
const ROOT = '/home/hatch/workspace/tsq-live';
const SDK = readFileSync(ROOT + '/qa/tools/supabase.min.js', 'utf8');
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
rmSync(`/tmp/tsq-diag-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-diag-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let page = null;
for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); page = t.find(x => x.type === 'page'); if (page) break; } catch { await sleep(250); } }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
const BASE = { lang: 'ja', muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 };
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await sleep(2500);
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await sleep(3000);
console.log('app supabase global:', await cdp.eval(`typeof window.supabase`));
console.log('inject local sdk:', await cdp.eval(`(() => { const s = document.createElement('script'); s.textContent = ${JSON.stringify(SDK)}; document.head.appendChild(s); return typeof window.supabase; })()`));
const now = Math.floor(Date.now() / 1000);
const payload = { sub: '11111111-1111-1111-1111-111111111111', email: 'qa@example.com', aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now, user_metadata: { display_name: 'ZoeQA' }, app_metadata: {} };
const jwt = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.c2ln';
console.log('setSession:', await cdp.eval(`(async () => { const SB = supabase.createClient('https://amanohlkajnilhsbofun.supabase.co', 'dummy-anon-key'); const { data, error } = await SB.auth.setSession({ access_token: ${JSON.stringify(jwt)}, refresh_token: 'dummy-refresh' }); return error ? 'ERR ' + error.message : 'set for ' + (data.user ? data.user.email : '?'); })()`));
console.log('ls keys right after:', await cdp.eval(`JSON.stringify(Object.keys(localStorage))`));
await sleep(3000);
console.log('auth btn after 3s:', await cdp.eval(`(document.getElementById('titleLoginBtn') || {}).innerText || 'none'`));
console.log('ls keys after 3s:', await cdp.eval(`JSON.stringify(Object.keys(localStorage))`));
console.log('fresh client getSession:', await cdp.eval(`(async () => { const SB = supabase.createClient('https://amanohlkajnilhsbofun.supabase.co', 'dummy-anon-key'); const { data } = await SB.auth.getSession(); return data.session ? data.session.user.email : 'no session'; })()`));
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
