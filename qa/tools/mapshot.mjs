// Clean map backdrop: seed old save, enter map, screenshot 390x844
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn('/opt/meta-chromium/chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  let wsUrl;
  for (let i = 0; i < 40; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); wsUrl = j.webSocketDebuggerUrl; break; } catch { await sleep(250); } }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pend = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 }, sessionId);
  await send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 }, sessionId);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); return r?.result?.value; };
  await send('Page.navigate', { url: 'file:///home/hatch/workspace/tsq-live/index.html' }, sessionId);
  await sleep(2500);
  await ev(`localStorage.setItem('tql_state_v1', JSON.stringify({lang:'ja', theme:'emerald', hero:'aoi', accepted:[], cleared:[], exp:120, bonusExp:0})); location.reload()`);
  await sleep(2500);
  await ev(`document.querySelector('#startBtn')?.click()`);
  await sleep(1200);
  await ev(`document.querySelector('#tab-map')?.click()`);
  await sleep(2500);
  // dismiss the locate toast if present
  await ev(`[...document.querySelectorAll('button, .toast-x, [class*=close]')].find(b => b.textContent.trim() === '✕' || b.textContent.trim() === '×')?.click()`);
  await sleep(600);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('/tmp/mapfull.png', Buffer.from(data, 'base64'));
  console.log('mapshot ok');
  ws.close();
} finally { chrome.kill(); }
