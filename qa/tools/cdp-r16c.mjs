// Round 16c mop-up: settings sheet via title pill, cabinet/run/settlement, LEGEND diff, support heart
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const port = 9750 + Math.floor(Math.random() * 90);
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
  await send('Page.navigate', { url: 'file:///home/hatch/workspace/tsq-live/index.html' }, sessionId);
  await sleep(2600);
  await setVP(844);
  await ev(`localStorage.setItem('tql_state_v1', ${JSON.stringify(JSON.stringify(BASE('ja')))}); location.reload()`);
  await sleep(2400);

  // ---------- S1: title screen -> account/settings sheet ----------
  try {
    const dump = await ev(`(() => [...document.querySelectorAll('button, [role=button]')].filter(b => b.offsetParent).map(b => b.textContent.trim().replace(/\\s+/g, ' ').slice(0, 34)))()`);
    log('S1 title clickables:', JSON.stringify(dump).slice(0, 420));
    const clk = await ev(`(() => { const b = [...document.querySelectorAll('button, [role=button], [class*=pill], [class*=acct]')].filter(el => el.offsetParent).find(el => /ログイン|LOG IN|ゲスト|Guest|アカウント/.test(el.textContent)); if (b) { b.click(); return 'clicked: ' + b.textContent.trim().slice(0, 30); } return 'NF'; })()`);
    log('S1 acct click:', String(clk));
    await sleep(1300);
    const sh = await ev(`(() => { const t = document.body.innerText; const sheet = [...document.querySelectorAll('[class*=sheet], [class*=win]')].filter(el => el.offsetParent && /アカウント/.test(el.innerText || '')).pop(); return { sheetFound: !!sheet, privacyFoldHeader: (t.match(/プライバシー[^\\n]{0,14}/) || [])[0] || 'NF', bulletsAtOpen: /メールアドレスはログイン専用/.test(sheet ? sheet.innerText : ''), creditsHeader: /写真クレジット/.test(t) }; })()`);
    log('S1 sheet:', JSON.stringify(sh));
    await shot('r16c-sheet.png');
    const op = await ev(`(() => { const hdrs = [...document.querySelectorAll('summary, button, [role=button], div, span')].filter(el => el.offsetParent && el.children.length < 3 && /プライバシー|写真クレジット/.test(el.textContent) && el.textContent.length < 26); const seen = []; hdrs.forEach(h => { h.click(); seen.push(h.textContent.trim().slice(0, 20)); }); return seen; })()`);
    log('S1 fold headers clicked:', JSON.stringify(op));
    await sleep(900);
    const sh2 = await ev(`(() => { const t = document.body.innerText; return { bulletsNow: /メールアドレスはログイン専用/.test(t), ccCount: (t.match(/CC BY/g) || []).length, wikimedia: /Wikimedia/.test(t) }; })()`);
    log('S1 after open:', JSON.stringify(sh2));
    await shot('r16c-sheet-open.png');
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('S1 FAIL', String(e).slice(0, 130)); }

  // enter game
  await ev(`document.querySelector('#startBtn')?.click()`); await sleep(1200);

  // ---------- S2: support window heart stamp ----------
  try {
    const sc = await ev(`(() => { const b = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(el => /SUPPORT|応援/.test(el.textContent)); if (b) { b.click(); return 'clicked ' + b.textContent.trim().slice(0, 20); } return 'NF'; })()`);
    log('S2 support entry:', String(sc));
    await sleep(1300);
    await shot('r16c-support.png');
    const sw = await ev(`(() => { const w = [...document.querySelectorAll('[class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 200).pop(); if (!w) return 'no win'; const r = w.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), fits: r.bottom <= innerHeight + 1, imgs: [...w.querySelectorAll('img')].length }; })()`);
    log('S2 support window:', JSON.stringify(sw));
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('S2 FAIL', String(e).slice(0, 130)); }

  // ---------- S3: cabinet + run + settlement @600 ----------
  try {
    await setVP(600);
    await ev(`document.querySelector('#tab-hero')?.click()`); await sleep(1300);
    const cab = await ev(`(() => { const btn = [...document.querySelectorAll('button, [role=button]')].filter(b => b.offsetParent).find(b => /スタート/.test(b.textContent) && b.closest('body')); let strip = btn; while (strip && !(strip.textContent || '').includes('DASH RUN')) strip = strip.parentElement; const R = el => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom) }; }; return { btn: btn ? R(btn) : 'NF', strip: strip ? R(strip) : 'NF', btnInView: btn ? btn.getBoundingClientRect().bottom <= innerHeight : false }; })()`);
    log('S3 cabinet@600:', JSON.stringify(cab));
    await ev(`[...document.querySelectorAll('button, [role=button]')].filter(b => b.offsetParent).find(b => /スタート/.test(b.textContent))?.click()`);
    await sleep(2400);
    const lanes = await ev(`(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return 'no canvas'; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const band = (x0, x1) => { const d = ctx.getImageData(x0, Math.round(H * 0.55), x1 - x0, Math.round(H * 0.08)).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 16) { s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } return Math.round(s / n); }; const colVar = x => { const d = ctx.getImageData(x, Math.round(H * 0.45), 2, Math.round(H * 0.4)).data; let mx = 0, mn = 255; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > mx) mx = v; if (v < mn) mn = v; } return Math.round(mx - mn); }; return { W, H, left: band(Math.round(W * 0.18), Math.round(W * 0.30)), center: band(Math.round(W * 0.44), Math.round(W * 0.56)), right: band(Math.round(W * 0.70), Math.round(W * 0.82)), boundaryVarL: colVar(Math.round(W * 0.365)), boundaryVarR: colVar(Math.round(W * 0.635)), midLaneVar: colVar(Math.round(W * 0.5)) }; })()`);
    log('S3 lanes:', JSON.stringify(lanes));
    await shot('r16c-run-mid.png');
    let settled = false;
    for (let k = 0; k < 46 && !settled; k++) {
      const st = await ev(`(() => { if (/RUN AGAIN|もう一度/.test(document.body.innerText)) return { settled: true }; const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return { settled: false, dens: [0, 0, 0] }; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const dens = [0.22, 0.5, 0.78].map(cx => { const x = Math.round(W * cx); const d = ctx.getImageData(Math.max(0, x - 14), Math.round(H * 0.38), 28, Math.round(H * 0.3)).data; let g = 0; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > 90 && v < 150) g++; } return g; }); return { settled: false, dens }; })()`);
      if (st && st.settled) { settled = true; break; }
      if (st && Array.isArray(st.dens)) { const t = st.dens.indexOf(Math.max(...st.dens)); const key = t === 0 ? 'ArrowLeft' : t === 2 ? 'ArrowRight' : null; if (key) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }, sessionId); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }, sessionId); } }
      await sleep(420);
    }
    log('S3 settled:', String(settled));
    await sleep(800);
    const rw = await ev(`(() => { const w = document.querySelector('.run-win'); if (!w) return 'no run-win'; const r = w.getBoundingClientRect(); const btns = [...w.querySelectorAll('button')].filter(b => b.offsetParent).map(b => { const br = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 12), y: Math.round(br.y), bottom: Math.round(br.bottom), inView: br.bottom <= innerHeight && br.y >= 0 }; }); return { winY: Math.round(r.y), winH: Math.round(r.height), winBottom: Math.round(r.bottom), vh: innerHeight, btns }; })()`);
    log('S3 run-win@600:', JSON.stringify(rw));
    await shot('r16c-runwin-600.png');
    await ev(`[...document.querySelectorAll('.run-win button')].find(b => /QUIT|やめる/.test(b.textContent))?.click()`); await sleep(700);
  } catch (e) { log('S3 FAIL', String(e).slice(0, 140)); }

  // ---------- S4: LEGEND counting (fixed diff) + today's daily texts ----------
  try {
    await setVP(844);
    await ev(`document.querySelector('#tab-daily')?.click()`); await sleep(1200);
    const dt = await ev(`(() => { const w = [...document.querySelectorAll('[class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 150).pop(); return w ? w.innerText.replace(/\\n+/g, ' | ').slice(0, 340) : 'no daily win'; })()`);
    log('S4 daily texts:', String(dt));
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
    const snap = () => ev(`localStorage.getItem('tql_state_v1')`);
    const s0 = await snap();
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1100);
    await ev(`(() => { const chip = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(b => /LEGEND/.test(b.textContent)); chip?.click(); return !!chip; })()`);
    await sleep(900);
    await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 24 && el.getBoundingClientRect().y > 100)[0]; row?.click(); return row ? row.textContent.trim().slice(0, 20) : 'NF'; })()`);
    await sleep(1500);
    const s1 = await snap();
    const diff = (a, b) => { const A = JSON.parse(a || '{}'), B = JSON.parse(b || '{}'); const out = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { const ja = JSON.stringify(A[k]) ?? 'undef', jb = JSON.stringify(B[k]) ?? 'undef'; if (ja !== jb) out[k] = { from: ja.slice(0, 140), to: jb.slice(0, 140) }; } return out; };
    log('S4 diff after LEGEND detail:', JSON.stringify(diff(s0, s1)).slice(0, 560));
    // also open one regular detail for comparison
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
    await ev(`(() => { const chip = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(b => /すべて|ALL|全部/.test(b.textContent)); chip?.click(); return !!chip; })()`);
    await sleep(900);
    await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 24 && el.getBoundingClientRect().y > 100)[0]; row?.click(); return row ? 'ok' : 'NF'; })()`);
    await sleep(1500);
    const s2 = await snap();
    log('S4 diff after regular detail:', JSON.stringify(diff(s1, s2)).slice(0, 560));
  } catch (e) { log('S4 FAIL', String(e).slice(0, 140)); }

  log('js exceptions:', errs.length || 'none');
  console.log(R.join('\n'));
  ws.close();
} finally { chrome.kill(); }
