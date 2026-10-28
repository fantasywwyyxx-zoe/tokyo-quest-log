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
rmSync(`/tmp/tsq-r7a4-${PORT}`, { recursive: true, force: true });
const proc = spawn(CHROME, [...EXTRA, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/tsq-r7a4-${PORT}`, '--window-size=1440,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
const BASE = { lang: 'ja', muted: true, theme: 'midnight', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, bonusExp: 1200, bgmDay: 'brave-c', bgmNight: 'farm-night', sceneSeen: 10, remoteDate: '', puzzle: [], puzzleDone: false, ticketBonus: 0, sharedEver: false, shareDate: '', dayLog: {}, diary: {}, zoneBonus: [], gacha: { pulls: 24, owned: [], dupes: {}, equipped: { hat: null, outfit: null, scarf: null } } };
// seed with pulls=24 of 25 tickets -> exactly 1 left, so one pull zeroes it
await cdp.send('Page.navigate', { url: 'file://' + ROOT + '/index.html' });
await waitStable();
await cdp.eval(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE))}); 'ok'`);
await cdp.send('Page.reload', { ignoreCache: true });
await waitStable();
await click('#startBtn'); await waitStable();
await click('#tab-hero'); await waitStable();
await cdp.eval(`document.querySelector('[data-openwin="gacha"]').click()`);
await waitStable();
console.log('WIN DUMP:', JSON.stringify(await cdp.eval(`(() => {
  const els = [...document.querySelectorAll('button, [role=button], [class*=btn], [class*=pull]')].filter(e => e.offsetParent && /ガチャ|チケット/.test((e.closest('div') || {}).innerText || ''));
  const all = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length <= 1 && /まわす|引く|PULL|つかう|1回/.test(e.innerText || '')).map(e => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 36), text: (e.innerText || '').trim().slice(0, 24) }));
  return all.slice(0, 10);
})()`)));
console.log('TICKETS READ:', JSON.stringify(await cdp.eval(`(() => { const m = document.body.innerText.match(/チケット × (\\d+)/); return m ? m[1] : 'nf'; })()`)));
console.log('PULL CLICK:', JSON.stringify(await cdp.eval(`(() => { const els = [...document.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length <= 1 && /まわす|引く|PULL|つかう|1回/.test(e.innerText || '')); if (!els.length) return 'none'; els[els.length - 1].click(); return 'clicked ' + (els[els.length - 1].innerText || '').trim().slice(0, 20); })()`)));
await sleep(4500); await waitStable();
console.log('TICKETS AFTER:', JSON.stringify(await cdp.eval(`(() => { const m = document.body.innerText.match(/チケット × (\\d+)/); return m ? m[1] : 'nf'; })()`)));
await cdp.eval(`(() => { const b = [...document.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '✕' && x.offsetParent); if (b) b.click(); return !!b; })()`);
await sleep(600); await waitStable();
console.log('DOTS AFTER ZERO:', JSON.stringify(await cdp.eval(`(() => {
  const gb = document.querySelector('[data-openwin="gacha"]');
  const ht = document.querySelector('#tab-hero');
  const dots = r => r ? [...r.querySelectorAll('*')].filter(e => /dot/i.test((e.className || '').toString()) && e.getBoundingClientRect().width > 0).length : 'noroot';
  return { gachaDotCount: dots(gb), heroTabDotCount: dots(ht) };
})()`)));
await shot('r7-q110-dots-off-390.png');
try { proc.kill('SIGKILL'); } catch {}
console.log('Done');
