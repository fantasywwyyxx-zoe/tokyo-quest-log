// Round 16 (push 4 = fdd3313): window contract sweep + Edit B checks. Fixed sleeps only.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const port = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn('/opt/meta-chromium/chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', '--host-resolver-rules=MAP tql.test 127.0.0.1', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const log = (...a) => { R.push(a.join(' ')); };
const SHOT = '/home/hatch/workspace/tsq-live/qa/shots/';
try {
  let wsUrl;
  for (let i = 0; i < 40; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); wsUrl = j.webSocketDebuggerUrl; break; } catch { await sleep(250); } }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pend = new Map(); const errs = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errs.push('EXC'); if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') errs.push('LOGERR:' + (m.params.entry.text || '').slice(0, 80)); });
  const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId); await send('Log.enable', {}, sessionId);
  await send('Emulation.setGeolocationOverride', { latitude: 35.6812, longitude: 139.7671, accuracy: 20 }, sessionId);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); if (r?.exceptionDetails) return 'ERR:' + (r.exceptionDetails.exception?.description || '').slice(0, 120); return r?.result?.value; };
  const shot = async name => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(SHOT + name, Buffer.from(data, 'base64')); };
  const setVP = async h => { await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: h }, sessionId); await sleep(650); };
  const seed = async lang => { await ev(`localStorage.setItem('tql_state_v1', JSON.stringify({lang:'${lang}', theme:'emerald', hero:'aoi', displayName:'ZoeQA', accepted:[], cleared:[], exp:120, bonusExp:0})); location.reload()`); await sleep(2400); await ev(`document.querySelector('#startBtn')?.click()`); await sleep(1300); };

  await send('Page.navigate', { url: 'file:///home/hatch/workspace/tsq-live/index.html' }, sessionId);
  await sleep(2600);
  await setVP(844);
  await seed('ja');

  // ---------- Phase 1: settings sheet folds + Q-126 (JA) ----------
  try {
    await ev(`document.querySelector('#tab-settings')?.click()`); await sleep(1100);
    const s1 = await ev(`(() => { const txt = document.body.innerText; const folds = [...document.querySelectorAll('details, [class*=fold], [class*=accord]')].filter(el => el.offsetParent).map(el => (el.querySelector('summary')?.textContent || el.textContent).trim().slice(0, 30)); const fb = [...document.querySelectorAll('button, a')].find(b => /フィードバック/.test(b.textContent)); return { hasPrivacyFoldText: /プライバシーについて/.test(txt), bulletsSprawled: (txt.match(/メールアドレスはログイン専用/g) || []).length, foldsSeen: folds.slice(0, 8), feedbackLabel: fb ? fb.textContent.trim() : 'NOT FOUND' }; })()`);
    log('P1 settings@open:', JSON.stringify(s1));
    await shot('r16-settings-closed.png');
    // open the privacy fold + credits fold by clicking their headers
    const opened = await ev(`(() => { const hdrs = [...document.querySelectorAll('summary, [class*=fold] > *, button, [role=button]')].filter(el => el.offsetParent && /プライバシーについて|写真クレジット/.test(el.textContent)); hdrs.forEach(h => h.click()); return hdrs.map(h => h.textContent.trim().slice(0, 24)); })()`);
    log('P1 fold headers clicked:', JSON.stringify(opened));
    await sleep(900);
    const s2 = await ev(`(() => { const txt = document.body.innerText; return { bulletsNowVisible: /メールアドレスはログイン専用/.test(txt), creditsVisible: /Wikimedia|CC BY/.test(txt), creditsCount: (txt.match(/CC BY/g) || []).length }; })()`);
    log('P1 after open:', JSON.stringify(s2));
    await shot('r16-settings-folds-open.png');
    await ev(`[...document.querySelectorAll('button')].find(b => b.offsetParent && (b.textContent.trim() === '✕' || /閉じる|とじる/.test(b.textContent)))?.click()`); await sleep(800);
  } catch (e) { log('P1 FAIL', String(e).slice(0, 120)); }

  // ---------- Phase 2: BETA window (folds + stamps at the bottom) ----------
  try {
    // close settings sheet if still open; go to title via map tab then find BETA plaque
    await ev(`document.querySelector('#tab-map')?.click()`); await sleep(900);
    const b = await ev(`(() => { const cand = [...document.querySelectorAll('button, [role=button], div, span')].filter(el => el.offsetParent && /BETA|ベータ|お知らせ|NEWS/.test(el.textContent) && el.textContent.length < 60); const hit = cand[0]; if (hit) { hit.click(); return 'clicked: ' + hit.textContent.trim().slice(0, 40); } return 'NO BETA ENTRY; title texts: ' + [...document.querySelectorAll('button')].filter(x => x.offsetParent).map(x => x.textContent.trim().slice(0, 16)).join('|'); })()`);
    log('P2 beta entry:', String(b));
    await sleep(1400);
    const bw = await ev(`(() => { const wins = [...document.querySelectorAll('[class*=win], [role=dialog]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 200); const w = wins[wins.length - 1]; if (!w) return 'no window'; const r = w.getBoundingClientRect(); const imgs = [...w.querySelectorAll('img')].map(i => (i.src || '').split('/').pop()); return { winRect: { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom) }, imgs: imgs.slice(0, 12), hasLottery: /抽選/.test(w.innerText), hasPrivacyFold: /プライバシー/.test(w.innerText) }; })()`);
    log('P2 beta window:', JSON.stringify(bw));
    // scroll the beta scroller to the bottom in steps, then screenshot
    await ev(`(() => { const sc = [...document.querySelectorAll('.win-scroller, [class*=scroll]')].filter(el => el.offsetParent && el.scrollHeight > el.clientHeight).sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; if (sc) sc.scrollTop = sc.scrollHeight; return sc ? 'scrolled ' + sc.className : 'no scroller'; })()`);
    await sleep(900);
    await shot('r16-beta-bottom.png');
    const bw2 = await ev(`(() => { const txt = document.body.innerText; return { sparkleNearLottery: /抽選/.test(txt), bugNote: /バグ|不具合/.test(txt) }; })()`);
    log('P2 beta bottom texts:', JSON.stringify(bw2));
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(800);
  } catch (e) { log('P2 FAIL', String(e).slice(0, 120)); }

  // ---------- Phase 3: Q-122 cabinet @600 + run + crash settlement @600 ----------
  try {
    await setVP(600);
    await ev(`document.querySelector('#tab-hero')?.click()`); await sleep(1300);
    const cab = await ev(`(() => { const all = [...document.querySelectorAll('*')]; const cabEl = all.find(el => el.offsetParent && /DASH RUN/.test(el.textContent) && el.getBoundingClientRect().height > 40 && el.getBoundingClientRect().height < 260); const start = [...document.querySelectorAll('button, [role=button]')].find(b => b.offsetParent && /START RUN/.test(b.textContent)); const R = el => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom) }; }; return { cabinet: cabEl ? R(cabEl) : 'not found', startBtn: start ? R(start) : 'not found', docScrollH: document.documentElement.scrollHeight, vh: innerHeight }; })()`);
    log('P3 cabinet@600:', JSON.stringify(cab));
    await shot('r16-hero-600.png');
    await ev(`[...document.querySelectorAll('button, [role=button]')].find(b => b.offsetParent && /START RUN/.test(b.textContent))?.click()`);
    await sleep(2600);
    // sample lane brightness from the run canvas
    const lanes = await ev(`(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return 'no canvas'; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const band = (x0, x1, y0, y1) => { const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 16) { s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } return Math.round(s / n); }; const yA = Math.round(H * 0.55), yB = Math.round(H * 0.62); return { W, H, left: band(Math.round(W * 0.18), Math.round(W * 0.30), yA, yB), center: band(Math.round(W * 0.44), Math.round(W * 0.56), yA, yB), right: band(Math.round(W * 0.70), Math.round(W * 0.82), yA, yB) }; })()`);
    log('P3 lane brightness:', JSON.stringify(lanes));
    await shot('r16-run-mid.png');
    // steer INTO obstacles to crash fast: read densities, pick max lane, press toward it
    for (let k = 0; k < 40; k++) {
      const st = await ev(`(() => { const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent && c.width > 200).sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!cv) return { gone: true }; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const heroX = (() => { const d = ctx.getImageData(0, Math.round(H * 0.78), W, Math.round(H * 0.1)).data; return 0; })(); const dens = [0.22, 0.5, 0.78].map(cx => { const x = Math.round(W * cx); const d = ctx.getImageData(Math.max(0, x - 14), Math.round(H * 0.4), 28, Math.round(H * 0.3)).data; let g = 0; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > 90 && v < 150) g++; } return g; }); const settled = /RUN AGAIN|もう一度/.test(document.body.innerText); return { dens, settled }; })()`);
      if (typeof st !== 'object' || !st) { await sleep(400); continue; }
      if (st.settled) { log('P3 settled detected'); break; }
      const target = st.dens.indexOf(Math.max(...st.dens));
      const key = target === 0 ? 'ArrowLeft' : target === 2 ? 'ArrowRight' : null;
      // estimate hero lane from last key state is unreliable; just alternate toward max-density side
      if (key) await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }, sessionId), await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }, sessionId);
      await sleep(450);
    }
    await sleep(900);
    const rw = await ev(`(() => { const w = document.querySelector('.run-win'); if (!w) return 'no run-win'; const r = w.getBoundingClientRect(); const btns = [...w.querySelectorAll('button')].filter(b => b.offsetParent).map(b => { const br = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 14), y: Math.round(br.y), bottom: Math.round(br.bottom), inView: br.bottom <= innerHeight && br.y >= 0 }; }); return { winY: Math.round(r.y), winH: Math.round(r.height), winBottom: Math.round(r.bottom), vh: innerHeight, btns }; })()`);
    log('P3 run-win@600:', JSON.stringify(rw));
    await shot('r16-runwin-600.png');
    await ev(`[...document.querySelectorAll('.run-win button')].find(b => /QUIT|やめる/.test(b.textContent))?.click()`); await sleep(800);
  } catch (e) { log('P3 FAIL', String(e).slice(0, 140)); }

  // ---------- Phase 4: daily window @600 and @480 ----------
  try {
    await setVP(600);
    await ev(`document.querySelector('#tab-daily')?.click()`); await sleep(1300);
    const d1 = await ev(`(() => { const w = [...document.querySelectorAll('[class*=daily-win], [class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 150).pop(); if (!w) return 'no daily win'; const r = w.getBoundingClientRect(); const sc = w.querySelector('.win-scroller, [class*=scroll]'); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, fits: r.bottom <= innerHeight + 1, scroller: sc ? { clientH: sc.clientHeight, scrollH: sc.scrollHeight } : null }; })()`);
    log('P4 daily@600:', JSON.stringify(d1));
    await shot('r16-daily-600.png');
    await setVP(480);
    const d2 = await ev(`(() => { const w = [...document.querySelectorAll('[class*=daily-win], [class*=win]')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 150).pop(); if (!w) return 'no daily win'; const r = w.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, fits: r.bottom <= innerHeight + 1 }; })()`);
    log('P4 daily@480:', JSON.stringify(d2));
  } catch (e) { log('P4 FAIL', String(e).slice(0, 120)); }

  // ---------- Phase 5: Q-128 creator retest @844/750/664/600 ----------
  try {
    for (const H of [844, 750, 664, 600]) {
      await setVP(H);
      await ev(`if (typeof openCreator === 'function') openCreator();`);
      await sleep(800);
      const m = await ev(`(() => { const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), bottom: Math.round(r.bottom), inView: r.y >= 0 && r.bottom <= innerHeight }; }; const w = document.querySelector('.creator-win'); const wr = w ? w.getBoundingClientRect() : null; const sc = document.querySelector('#creatorScroll'); return { vh: innerHeight, win: wr ? { y: Math.round(wr.y), h: Math.round(wr.height), bottom: Math.round(wr.bottom) } : null, go: R(document.querySelector('#creatorGo')), back: R(document.querySelector('#creatorBack')), scroll: sc ? { clientH: sc.clientHeight, scrollH: sc.scrollHeight } : null }; })()`);
      log(`P5 creator@${H}:`, JSON.stringify(m));
      if (H === 844) await shot('r16-creator-844.png');
      await ev(`document.getElementById('creatorScreen').hidden = true;`);
    }
  } catch (e) { log('P5 FAIL', String(e).slice(0, 120)); }

  // ---------- Phase 6: ZH sideLine (Q-127) + ZH feedback label; EN singular (R11a) ----------
  try {
    await setVP(844);
    await seed('zh');
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1200);
    await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li, button')].filter(el => el.offsetParent && el.textContent.length > 2 && el.getBoundingClientRect().height > 20)[2]; row?.click(); return row ? row.textContent.trim().slice(0, 20) : 'no row'; })()`);
    await sleep(1300);
    const zh = await ev(`(() => { const t = document.body.innerText; const line = t.split('\\n').find(l => /冒险任务/.test(l) && /主线|支线|日常生活/.test(l)); const hdr = [...document.querySelectorAll('*')].find(el => el.offsetParent && /日常生活是你的主线/.test(el.textContent) && el.children.length < 3); let fit = null; if (hdr) { const r = hdr.getBoundingClientRect(); fit = { w: Math.round(r.width), h: Math.round(r.height), scrollW: hdr.scrollWidth, clipped: hdr.scrollWidth > hdr.clientWidth + 1 }; } return { sideLine: line || 'NOT FOUND', fit }; })()`);
    log('P6 zh sideLine:', JSON.stringify(zh));
    await shot('r16-zh-detail.png');
    await ev(`[...document.querySelectorAll('button')].filter(b => b.offsetParent).find(b => b.textContent.trim() === '✕')?.click()`); await sleep(700);
    await ev(`document.querySelector('#tab-settings')?.click()`); await sleep(1000);
    const zhFb = await ev(`(() => { const fb = [...document.querySelectorAll('button, a')].find(b => /反馈|フィードバック/.test(b.textContent)); return fb ? fb.textContent.trim() : 'NOT FOUND'; })()`);
    log('P6 zh feedback label:', String(zhFb));
    await seed('en');
    const en = await ev(`(() => { const t = document.body.innerText; return { pluralHits: (t.match(/ADVENTURE QUESTS/g) || []).length, singularHits: (t.match(/ADVENTURE QUEST(?!S)/g) || []).length }; })()`);
    log('P6 en labels on title/map:', JSON.stringify(en));
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1100);
    const en2 = await ev(`(() => { const t = document.body.innerText; return { pluralHits: (t.match(/ADVENTURE QUESTS/g) || []).length, sample: (t.split('\\n').find(l => /ADVENTURE QUEST/.test(l)) || '').slice(0, 60) }; })()`);
    log('P6 en list:', JSON.stringify(en2));
  } catch (e) { log('P6 FAIL', String(e).slice(0, 140)); }

  // ---------- Phase 7: R11(b) LEGEND detail counts toward view-3 daily ----------
  try {
    await seed('ja');
    const before = await ev(`(() => { const s = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return JSON.stringify(s.daily || s.dailies || null).slice(0, 400); })()`);
    log('P7 daily state before:', String(before));
    await ev(`document.querySelector('#tab-list')?.click()`); await sleep(1100);
    // switch list filter to LEGEND and open first route
    await ev(`(() => { const chip = [...document.querySelectorAll('button, [role=button]')].filter(el => el.offsetParent).find(b => /LEGEND/.test(b.textContent)); chip?.click(); return !!chip; })()`);
    await sleep(900);
    await ev(`(() => { const row = [...document.querySelectorAll('[class*=row], [class*=item], li, button')].filter(el => el.offsetParent && el.getBoundingClientRect().height > 24 && el.getBoundingClientRect().y > 120)[0]; row?.click(); return row ? row.textContent.trim().slice(0, 24) : 'no row'; })()`);
    await sleep(1400);
    const after = await ev(`(() => { const s = JSON.parse(localStorage.getItem('tql_state_v1') || '{}'); return JSON.stringify(s.daily || s.dailies || null).slice(0, 400); })()`);
    log('P7 daily state after LEGEND detail:', String(after));
    await shot('r16-legend-detail.png');
  } catch (e) { log('P7 FAIL', String(e).slice(0, 140)); }

  log('console errors:', errs.length ? errs.slice(0, 5).join(' ; ') : 'none');
  console.log(R.join('\n'));
  ws.close();
} finally { chrome.kill(); }
