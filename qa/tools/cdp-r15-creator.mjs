// Q-128 probe: hero creator window geometry on a NEW save at 3 heights
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn('/opt/meta-chromium/chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
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
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r?.exceptionDetails) return 'ERR:' + (r.exceptionDetails.text || ''); return r?.result?.value; };
  await send('Page.navigate', { url: 'file:///home/hatch/workspace/tsq-live/index.html' }, sessionId);
  await sleep(2600);
  await ev(`localStorage.clear(); sessionStorage.clear(); location.reload()`);
  await sleep(2600);
  const opened = await ev(`(() => { const el = document.getElementById('creatorScreen'); if (!el) return 'no creatorScreen'; if (typeof openCreator === 'function') { openCreator(); return 'openCreator() called'; } el.hidden = false; return 'fallback unhide'; })()`);
  out.push(String(opened));
  await sleep(900);
  for (const H of [844, 750, 664]) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: H, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: H }, sessionId);
    await sleep(700);
    const m = await ev(`(() => { const q = s => document.querySelector(s); const R = el => el ? (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; })() : null; const win = q('.creator-win'); const scr = q('#creatorScroll') || q('.creator-scroll'); const back = q('#creatorBack'); const go = q('#creatorGo'); return { vh: innerHeight, win: R(win), winVisible: win ? !!(win.offsetParent) : false, back: R(back), go: R(go), scroll: scr ? { clientH: scr.clientHeight, scrollH: scr.scrollHeight, canScroll: scr.scrollHeight > scr.clientHeight + 2 } : null, docScrollH: document.documentElement.scrollHeight }; })()`);
    out.push(`H=${H} ` + JSON.stringify(m));
    if (H === 844) { const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync('/home/hatch/workspace/tsq-live/qa/shots/q128-creator-844.png', Buffer.from(data, 'base64')); }
  }
  console.log(out.join('\n'));
  ws.close();
} finally { chrome.kill(); }
