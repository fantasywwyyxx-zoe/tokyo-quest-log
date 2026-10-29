// Round 16b: redo of r16 phases polluted by the first-run creator (proper BASE seed this time)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const port = 9850 + Math.floor(Math.random() * 90);
const chrome = spawn('/opt/meta-chromium/chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const log = (...a) => R.push(a.join(' '));
const SHOT = '/home/hatch/workspace/tsq-live/qa/shots/';
const BASE = lang => ({ lang, muted: true, theme: 'emerald', font: 'rounded', hero: 'aoi', custom: null, name: 'Zoe', started: true, tutored: true, accepted: [], clears: [], dailyExp: 0, dailyTotal: 0, daily: { date: '', done: [], bonus: false }, exp: 120, bonusExp: 0 });
try {
  let wsUrl;
  for (let i = 0; i < 40; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); wsUrl = j.webSocketDebuggerUrl; break; } catch { await sleep(250); } }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pend = new Map(); const errs = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push('EXC'); });
  const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 }, sessionId);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r?.exceptionDetails) return 'ERR:' + (r.exceptionDetails.exception?.description || '').slice(0, 130); return r?.result?.value; };
  const shot = async name => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(SHOT + name, Buffer.from(data, 'base64')); };
  const setVP = async h => { await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: h }, sessionId); await sleep(650); };
  const seed = async lang => { await ev(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE(lang)))}); location.reload()`); await sleep(2400); await ev(`document.querySelector('#startBtn')?.click()`); await sleep(1200); };
  await send('Page.navigate', { url: 'file:///home/hatch/workspace/tsq-live/index.html' }, sessionId);
  await sleep(2600);
  await setVP(844);

  // ---------- P1c settings sheet via gear button ----------
  await seed('ja');
  try {
    const g = await ev(`(() => { const b = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(el => /表示設定/.test(el.textContent)); if (b) { b.click(); return 'gear clicked'; } return 'NF'; })()`);
    log('P1c gear:', String(g));
    await sleep(1300);
    const s1 = await ev(`(() => { const sh = [...document.querySelectorAll('[class*=sheet], [class*=win], [role=dialog]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 200 && /フィードバック/.test(el.innerText || '')).pop(); if (!sh) return { found: false, bodyHas: /プライバシーについて/.test(document.body.innerText) }; const t = sh.innerText; return { found: true, hasPrivacyFold: /プライバシーについて/.test(t), bulletsAtOpen: /メールアドレスはログイン専用/.test(t), hasCreditsFold: /写真クレジット/.test(t), feedback: /フィードバック（ベータテスト）/.test(t) }; })()`);
    log('P1c sheet:', JSON.stringify(s1));
    await shot('r16c-gear-sheet.png');
    const clickRow = async label => { const pt = await ev(`(() => { const rows = [...document.querySelectorAll('div, summary, button')].filter(el => el.offsetParent && el.innerText && el.innerText.trim().startsWith('${label}') && el.getBoundingClientRect().width > 200); const row = rows[rows.length - 1]; if (!row) return null; const r = row.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`); if (!pt) { log('row NF', label); return; } await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }, sessionId); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }, sessionId); await sleep(900); };
    await clickRow('プライバシーについて');
    const a1 = await ev(`(() => { const t = document.body.innerText; return { bulletsNow: /メールアドレスはログイン専用/.test(t), policyLink: /プライバシーポリシー全文/.test(t) }; })()`);
    log('P1d privacy after 1 click:', JSON.stringify(a1));
    await shot('r16d-privacy-open.png');
    await clickRow('写真クレジット');
    const a2 = await ev(`(() => { const t = document.body.innerText; return { ccCount: (t.match(/CC BY/g) || []).length, wikimedia: /Wikimedia/.test(t), sample: (t.split('\\n').find(l => /CC BY/.test(l)) || '').slice(0, 60) }; })()`);
    log('P1d credits after 1 click:', JSON.stringify(a2));
    await shot('r16d-credits-open.png');
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('P1c FAIL', String(e).slice(0, 120)); }

  log('js exceptions:', errs.length ? errs.length : 'none');
  console.log(R.join('\n'));
  ws.close();
} finally { chrome.kill(); }
