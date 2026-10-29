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

  // ---------- P1b settings sheet ----------
  await seed('ja');
  try {
    await ev(`document.querySelector('#tab-settings')?.click()`); await sleep(1200);
    const s1 = await ev(`(() => { const sheets = [...document.querySelectorAll('[class*=sheet], [class*=win], [role=dialog]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 200); const sh = sheets[sheets.length - 1]; const t = sh ? sh.innerText : document.body.innerText; return { inSheet: !!sh, hasPrivacyFold: /プライバシーについて/.test(t), bulletsVisibleAtOpen: /メールアドレスはログイン専用/.test(t), hasCreditsFold: /写真クレジット/.test(t), feedback: ([...document.querySelectorAll('button, a')].find(b => /フィードバック/.test(b.textContent)) || {}).textContent?.trim() || 'NF' }; })()`);
    log('P1b settings@open:', JSON.stringify(s1));
    await shot('r16b-settings.png');
    const op = await ev(`(() => { const hdrs = [...document.querySelectorAll('summary, button, [role=button], [class*=fold-h], [class*=foldHead]')].filter(el => el.offsetParent && /プライバシーについて|写真クレジット/.test(el.textContent)); hdrs.forEach(h => h.click()); return hdrs.map(h => h.textContent.trim().slice(0, 20)); })()`);
    log('P1b folds clicked:', JSON.stringify(op));
    await sleep(900);
    const s2 = await ev(`(() => { const t = document.body.innerText; return { bulletsNow: /メールアドレスはログイン専用/.test(t), ccCount: (t.match(/CC BY/g) || []).length, wikimedia: /Wikimedia/.test(t) }; })()`);
    log('P1b after open:', JSON.stringify(s2));
    await shot('r16b-settings-open.png');
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('P1b FAIL', String(e).slice(0, 120)); }

  // ---------- P4b daily @600/@480 ----------
  try {
    await setVP(600);
    await ev(`document.querySelector('#tab-daily')?.click()`); await sleep(1300);
    const d1 = await ev(`(() => { const w = [...document.querySelectorAll('[class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 150 && /デイリー|DAILY/.test(el.innerText || '')).pop() || [...document.querySelectorAll('[class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 150).pop(); if (!w) return 'no win'; const r = w.getBoundingClientRect(); const rows = w.querySelector('[class*=rows], .win-scroller'); const lastRow = rows ? rows.lastElementChild?.getBoundingClientRect() : null; return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, fits: r.bottom <= innerHeight + 1, scroller: rows ? { clientH: rows.clientHeight, scrollH: rows.scrollHeight } : null, items: (w.innerText.match(/EXP/g) || []).length }; })()`);
    log('P4b daily@600:', JSON.stringify(d1));
    await shot('r16b-daily-600.png');
    await setVP(480);
    const d2 = await ev(`(() => { const w = [...document.querySelectorAll('[class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 100).pop(); if (!w) return 'no win'; const r = w.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, fits: r.bottom <= innerHeight + 1 }; })()`);
    log('P4b daily@480:', JSON.stringify(d2));
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('P4b FAIL', String(e).slice(0, 120)); }

  // ---------- P3b Q-122 cabinet + run + settlement ----------
  try {
    await setVP(600);
    await ev(`document.querySelector('#tab-hero')?.click()`); await sleep(1300);
    const cab = await ev(`(() => { const start = [...document.querySelectorAll('button, [role=button], [class*=btn]')].find(b => b.offsetParent && /START RUN|▶ START/.test(b.textContent)); const strip = start ? start.closest('[class*=cab], [class*=win], [class*=strip], section, div') : null; const R = el => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom) }; }; let cabEl = null; if (start) { let p = start.parentElement; while (p && p.getBoundingClientRect().height < 130) { cabEl = p; p = p.parentElement; } } return { startBtn: start ? R(start) : 'NF', cabinet: cabEl ? R(cabEl) : 'NF', inFirstScreen: start ? start.getBoundingClientRect().bottom <= innerHeight : false, docScrollH: document.documentElement.scrollHeight }; })()`);
    log('P3b cabinet@600:', JSON.stringify(cab));
    await shot('r16b-hero-600.png');
    await ev(`[...document.querySelectorAll('button, [role=button], [class*=btn]')].find(b => b.offsetParent && /START RUN|▶ START/.test(b.textContent))?.click()`);
    await sleep(2400);
    const lanes = await ev(`(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return 'no canvas'; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const band = (x0, x1) => { const d = ctx.getImageData(x0, Math.round(H * 0.55), x1 - x0, Math.round(H * 0.08)).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 16) { s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } return Math.round(s / n); }; return { W, H, left: band(Math.round(W * 0.18), Math.round(W * 0.30)), center: band(Math.round(W * 0.44), Math.round(W * 0.56)), right: band(Math.round(W * 0.70), Math.round(W * 0.82)) }; })()`);
    log('P3b lane brightness:', JSON.stringify(lanes));
    await shot('r16b-run-mid.png');
    let settled = false;
    for (let k = 0; k < 46 && !settled; k++) {
      const st = await ev(`(() => { if (/RUN AGAIN|もう一度/.test(document.body.innerText)) return { settled: true }; const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return { settled: false, dens: [0, 0, 0] }; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const dens = [0.22, 0.5, 0.78].map(cx => { const x = Math.round(W * cx); const d = ctx.getImageData(Math.max(0, x - 14), Math.round(H * 0.38), 28, Math.round(H * 0.3)).data; let g = 0; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > 90 && v < 150) g++; } return g; }); return { settled: false, dens }; })()`);
      if (st && st.settled) { settled = true; break; }
      if (st && Array.isArray(st.dens)) { const t = st.dens.indexOf(Math.max(...st.dens)); const key = t === 0 ? 'ArrowLeft' : t === 2 ? 'ArrowRight' : null; if (key) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }, sessionId); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }, sessionId); } }
      await sleep(420);
    }
    log('P3b settled:', String(settled));
    await sleep(800);
    const rw = await ev(`(() => { const w = document.querySelector('.run-win'); if (!w) return 'no run-win'; const r = w.getBoundingClientRect(); const btns = [...w.querySelectorAll('button')].filter(b => b.offsetParent).map(b => { const br = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 12), y: Math.round(br.y), bottom: Math.round(br.bottom), inView: br.bottom <= innerHeight && br.y >= 0 }; }); return { winY: Math.round(r.y), winH: Math.round(r.height), winBottom: Math.round(r.bottom), vh: innerHeight, btns }; })()`);
    log('P3b run-win@600:', JSON.stringify(rw));
    await shot('r16b-runwin-600.png');
    await ev(`[...document.querySelectorAll('.run-win button')].find(b => /QUIT|やめる/.test(b.textContent))?.click()`); await sleep(700);
  } catch (e) { log('P3b FAIL', String(e).slice(0, 140)); }

  // ---------- P6b ZH detail sideLine ----------
  try {
    await setVP(844);
    await seed('zh');
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1200);
    const clk = await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li')].filter(el => el.offsetParent && /すみだ水族館/.test(el.textContent))[0] || [...document.querySelectorAll('*')].filter(el => el.offsetParent && el.children.length < 4 && /すみだ水族館/.test(el.textContent))[0]; if (row) { row.click(); return 'clicked'; } return 'row NF'; })()`);
    log('P6b row click:', String(clk));
    await sleep(1400);
    const zh = await ev(`(() => { const t = document.body.innerText; const line = t.split('\\n').map(x => x.trim()).find(l => /日常生活是你的主线/.test(l)); const el = [...document.querySelectorAll('*')].find(e => e.offsetParent && /日常生活是你的主线/.test(e.textContent) && e.children.length < 2); let fit = null; if (el) { const r = el.getBoundingClientRect(); fit = { w: Math.round(r.width), h: Math.round(r.height), scrollW: el.scrollWidth, clientW: el.clientWidth, clippedX: el.scrollWidth > el.clientWidth + 1 }; } return { sideLine: line || 'NF', fit }; })()`);
    log('P6b zh sideLine:', JSON.stringify(zh));
    await shot('r16b-zh-detail.png');
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
  } catch (e) { log('P6b FAIL', String(e).slice(0, 140)); }

  // ---------- P7b LEGEND detail counting (state diff) ----------
  try {
    await seed('ja');
    const snap = () => ev(`localStorage.getItem('tql_state_v1')`);
    const s0 = await snap();
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1100);
    await ev(`(() => { const chip = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(b => /LEGEND/.test(b.textContent)); chip?.click(); return !!chip; })()`);
    await sleep(900);
    const rowName = await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 24 && el.getBoundingClientRect().y > 100)[0]; if (row) { row.click(); return row.textContent.trim().slice(0, 30); } return 'NF'; })()`);
    log('P7b route row:', String(rowName));
    await sleep(1500);
    await shot('r16b-route-detail.png');
    const s1 = await snap();
    const diff = (a, b) => { const A = JSON.parse(a || '{}'), B = JSON.parse(b || '{}'); const out = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) out[k] = { from: JSON.stringify(A[k]).slice(0, 120), to: JSON.stringify(B[k]).slice(0, 120) }; } return out; };
    log('P7b state diff after LEGEND detail:', JSON.stringify(diff(s0, s1)).slice(0, 500));
    const dailyInfo = await ev(`(() => { const s = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return JSON.stringify(s.daily) + ' prog keys: ' + Object.keys(s).filter(k => /prog|view|detail/i.test(k)).join(','); })()`);
    log('P7b daily info:', String(dailyInfo));
  } catch (e) { log('P7b FAIL', String(e).slice(0, 140)); }

  log('js exceptions:', errs.length ? errs.length : 'none');
  console.log(R.join('\n'));
  ws.close();
} finally { chrome.kill(); }
