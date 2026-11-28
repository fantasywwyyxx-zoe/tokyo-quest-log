# DECISIONS.md — 决策记录（公司大脑 · 4/5）

> 只记已拍板的。最新决定覆盖旧决定时，旧条目标注「已被 YYYY-MM-DD 决定取代」，不要删。

## Q-413 — Detail fits one screen at short viewports + a real scroll hint (2026-11-24)
Zoe on the c165 detail (her screenshot quest): 「又开始这种需要滑动屏幕了 而且也没有提示要往下滑」. Measured first (402 wide, JA): at her 695px Chrome viewport c165 overflowed 80px, Senso-ji 30px; at 844px both fit. Compression therefore lives in a `@media (max-height: 740px)` tier with dialog-scoped selectors, two passes: photo 118→76px, body gap 8→5, head padding, kv line-heights/margins, blurb padding + line-height 1.6→1.5, action-button padding, note size. The hint: a sticky lemon ▼ pill (`#detailMore`) as the sheet's last element, shown only while content remains below (synced on open, on scroll, on every refreshDetailButtons, and on timers while the typewriter blurb grows). One trap caught by measuring PAINT, not state: the sheet is a flex column whose children carry explicit `order` values, so the pill (default order 0) first rendered under the header — it now carries `order: 99` (probe-measured at the sheet's foot, screenshot-verified). Gates: syntax x6, bootprobe zero+phone, fits/share suites, q413 CDP probe 7/7 (c165 + Senso-ji fit at 695 with no hint, forced-overflow at 560 shows the pill and hides it at the bottom, 844 unchanged, zero console errors). The check-in icon half of her complaint (pin→target) shipped in Q-411.

## Q-412 — Hut and coin shop removed (2026-11-24)
Zoe, minutes after the Q-411 decision: 「小屋也没什么用删了吧」「小屋，shop 这都没什么用」. Both surfaces are gone: the hero dock is now records + gacha only (shop/hut buttons deleted); the #hsegShop and #hsegHut panels are removed from the markup; openHeroWin's panel family no longer lists shop/hut; the collection overview loses its hut shelf row. Save data is preserved in the schema (hutOwned/hutPlaced/hutWall/coins/frames/owned gear — puzzle/daily precedent); renderHut already self-guarded on its missing panel and renderCoinWin gained the same guard, so the remaining JS is inert, not broken. Coins stay as an earn-only counter: the balance still paints in the hero stats strip and the status tab (#hstCoinVal), but tapping it no longer opens anything (the two openCoinWin chip listeners are removed; openCoinWin itself is now caller-less). Owned portrait frames still apply (status portrait + share card) and owned street props still render on the hero street — only the buying surfaces died. This closes the hut-redesign proposal and the hut P2 ticket-issuance plan, unbuilt. Gates: syntax x6, bootprobe zero+phone, fits/share/hut suites, q412 CDP probe 8/8 (dock contents, panels absent, coin counter displays 250 and opens nothing, records + collection (no hut row) + gacha all open, save data intact, zero console errors).

## Q-411 — ACCEPT retired: the quest model is SAVE + CHECK-IN only (2026-11-24)
Zoe, testing Q-409 on device: the home bookmark chip overlapped the accept button, the two states felt like the same thing (「受注和保存是不是一个意思的感觉」「功能重了吧」), her own list was 18 accepted vs 0 saved — then her ruling: 「要不就取消受注这个功能 就是打卡 和保存 着两个」. Accept is gone everywhere. What shipped: (1) **Migration at load** — every accepted quest (string or legacy object form) moves into `state.saved`, deduped, cleared quests excluded; `state.accepted` stays in the schema, permanently empty; `isAccepted` keeps its definition but has zero call sites. (2) **Predicates** — every filter/map/pin/list-badge "accepted" test now reads `isSaved`; the internal filter VALUE `"accepted"` is unchanged (no save churn), only its labels moved: 受注中→保存済み / "ON QUEST"→"SAVED" / 进行中→已收藏； `acceptedOnly`→保存済みのみ etc.; `mfAccepted` likewise. (3) **Detail** — #btnQuest is check-in directly (cleared/not-started states unchanged); the GPS note and the manual-clear rescue no longer require an accepted state (remote clear's once-a-day cap + 30% EXP inside doClear are untouched); #btnUndo is undo-clear only (the cancel-accept branch is deleted); doClear no longer auto-accepts. The check-in button's icon changes pin→target per Zoe's same-burst 「打卡图标有问题换一个」. (4) **Home** — the floating bookmark chip AND the accept span are both deleted; each card carries ONE action, the save toggle (bookmark + 保存/保存済み， blue tint when on), in the old accept slot; the surprise button just opens the detail; pool excludes saved instead of accepted. (5) **My List** — the accepted section is removed (markup + renderer); saved cards carry the map/nav/invite trio; section heads drop their counts (Zoe circled 「進行中・18」: 「这个是不是没用了」 — the number lives on the tab badge only); share-list poster draws saved only. (6) **Daily Picks** — Want now saves (narration reworded to 保存した/已收藏/SAVED). (7) **Tab badges** — the LIST tab badge and the list's saved-only chip count saved-not-cleared; doClear/undoClear now call renderMine + syncMineBadge (a Q-409 gap: the badge went stale after a clear — the q411 probe caught badge 4 vs 3 rendered cards). (8) **Share junk-file fix** — `sysShare`/`textShare` no longer send a separate `url` payload item (WeChat delivered it as a mystery 107-byte file beside the poster); the link rides inside the text. LINE/X/Threads rows already inlined it and are untouched. Gates: syntax x6, bootprobe zero+phone, fits/share/hut suites, q411 CDP probe 14/14 (migration incl. the legacy object entry and a deleted-catalog id, home save toggle, direct check-in + GPS clear with no accept step, one-section list with badge/cards/chip all agreeing, share payload has no url key and the link inside the text, zero console errors). Device-final = Zoe, incl. one WeChat re-share to confirm the junk file is gone.

## Q-410 — LIST tab restored as a permanent bar slot; home see-all becomes a real button (2026-11-24)
Zoe on device, minutes after Q-409: circled the home's 「全581件のクエストを見る →」 text link and asked 「全quest一览页面怎么没了 底下常驻按钮没了？」 — the Q-405 demotion of the list to a text-link-only entry reads as "the page is gone". The list tab is back in the bottom bar (second slot, after MAP; bar is now MAP | LIST | HERO | HOME raised centre | MINE | gear, 56px per tab at 402 wide), and the home's see-all row is restyled from a web-style text link into a chunky cream button in the .home-surprise family recipe. The Q-405 comment claiming the tab stays hidden is corrected. Gates: syntax x6, bootprobe zero+phone, q410 CDP probe 7/7 (bar geometry, list opens from the tab, rows render, see-all measures 378x55 with a 3px border, zero console errors).

## Q-409 — Daily page removed; freed tab becomes MY LIST (2026-11-24)
Zoe cancelled the Daily page wholesale (2026-11-23 23:37) and approved the positioning proposal + page mock next morning (「就按这个做，开始建」): the game is a Tokyo outing-decision game — recommend → save/accept → send to a friend → go check in → grow. The ex-daily bottom-bar slot is now 清单 (My List): 进行中 (accepted quests; actions 地图 = jump to the pin + preview, 导航 = the ask-every-time map-app chooser, 约TA = quest-poster share) over 想去 (a NEW bookmark state `state.saved`, distinct from accept; actions 发给朋友 = poster share, 接任务 = accept, which also unsaves). Bookmark toggles live on the detail page (#btnSave) and on home cards (corner chip). The tab carries a count badge (accepted + saved, counted with the same predicates the page renders). The page header's 发给朋友 shares a simple list poster (names + URL band). Save data for dailies stays in the schema (puzzle precedent); renderDaily() is view-guarded and inert; the site footer that lived inside the daily section moved to the list page. Two build lessons banked: (1) #mapPick moved out of the detail <dialog> for the list page, but a modal dialog paints in the top layer above body-level fixed elements — openMapPick now re-hosts the chooser inside whichever dialog is open (Q-376 pattern); (2) absolutely-positioned chips need their card to be position:relative, verified by hit-test, not by class assertions. Gates: syntax x6, bootprobe zero+phone, fits/share/hut suites, q409 CDP probe 21/21 with physical taps (sections, badge, accept-move, nav chooser from both pages, map jump + preview, detail/home save toggles, list share sheet, zero console errors).

## Q-408 — Catalog expansion batch toward 600 (2026-11-24)
Zoe's order (2026-11-23): 「Quest继续扩张 活动和地点都来 目标600个」. Three research waves (A west/north evergreen, B central/east + Yokohama evergreen, C timed Nov 2026–Mar 2027) plus a parent-run top-up from wave A's verified-but-rate-limited holds delivered 128 candidates. 114 inserted as c172–c285 → catalog 474 → **588**. All quality gates held (official-source facts, real photo of the actual venue, dedupe vs the 474 + across waves); insertions used the Q-400 discipline (string-aware brace scanner + in-map membership gates for EVENTS/VENUES/BLURB_ZH/LANG_ZH). 18 new area strings joined existing DISTRICTS lists so the district filter covers all 588. Also fixed: c20 is Comic Market **109** (2026-12-29→31, 3 days) per the official site — wave C caught the stale 107 entry; id unchanged.
HELD, with records preserved in the wave candidate files: (1) **14 off-map venues** whose pins cannot render at true positions on the current baked sheet (west: Gyokudo Art Museum, Hossawa Falls, Musashi Mitake Shrine, Nippara Cave, Akigawa Valley; south: Sea Paradise, Kanazawa Bunko, Kanazawa Zoo; Enoshima Sea Candle illumination, Miura Kaigan sakura; Makuhari: Tokyo Comic Con, Jump Festa, Wonder Festival, hololive Expo) — they ship with the greater-Tokyo map re-bake Zoe ordered in principle 2026-10-29. (2) **Photo-429 holds**: Nanushi-no-Taki Park is the designated #600 (facts verified, photo fetch hit a Wikimedia 429 hard stop); further verified holds (Shiofune Kannonji, Ome Art Museum, Tamarokuto Science Center, Joyful Minowa, Eko-in, Otori Shrine, Kawasaki Sky Deck, Rainbow Bridge Promenade, Asakusa New Year Kabuki) complete via later refresh runs — 588 + these + the daily ≥3 mandate crosses 600 within days without lowering any gate.
Gates: syntax x6 (one seam comma fixed pre-commit), bootprobe zero+phone, fits/share/hut suites, batch600 CDP probe (588 count, wave A/C/topup details render in zh, Comiket 109 + Dec 29 start in data, 600 pin-layer children, zero console errors).

## Q-407 — Home uses the shared filter system (2026-11-23)
Zoe: "这里直接引入我们的筛选系统，在複数OK那里直接换成筛选系统". The Q-405 chip row + "可多选" note are gone. In their place one filter bar (#homeFilterBtn) showing the active filter summary (same parts as the list header) or "全部任务 · 点这里筛选"; tapping it opens the SAME #searchModal sheet with a from-home class that hides the STATE label+row (recommendations are always for quests you can still take). homePool now runs through the ONE predicate boardMatch with filterState explicitly neutralized (saved/restored around the filter call); sort unchanged (distance-first when located, else ending-soon). Closing the sheet by any path (done / close / backdrop / Esc via the dialog close event) calls homeFilterDone(): clears from-home and re-renders the home from page 0. New STR homeFilterAll x3; homeEmpty reworded from chips to filters x3; new ICONS.funnel. Q-406's target/tag chip glyphs remain in ICONS (unused by chips now). Gates: syntax x6, bootprobe zero+phone, fits/share/hut suites, q407 probe ALL PASS with physical taps (bar/sheet/state-hide/free-apply/reset/list-sheet-untouched).

## Q-406 — Zoe's device pass over Q-405 + daily page (2026-11-23)
Five fixes from Zoe's screenshots/messages in the dev chat:
1. Daily layout (「布局有问题」): the panel no longer stretches a void — `#view-daily .daily-panel { flex: 0 1 auto }` + `#recDailyBtn { margin-top: 10px }` (last style block; probe: window→rec gap 15px, rec→mg gap 10px, panel hugs at 462px).
2. Title BGM (「BGM在最开始页面也换一下」): `bgmWantedId()` returns `bgmPick()` always — the start screen plays Town by day / Chill by night; the old title theme no longer plays on the front page.
3. Chip icons (「图标有问题」): new ICONS.target (ring + dot) and ICONS.tag (price tag with punched hole) replace pin/sword on the home chips only.
4. Editorial reasons (「不难的话可以做」): `homeReason` v2 — urgency facts (last day / ends ≤3 days) first, else the quest's own blurb first line via `homeBlurbLine` (clause-break trim, 26 chars CJK / 64 EN), nearest card prefixed with the near fact when it fits; fact fallbacks unchanged.
5. Scrollbar (「滑动条太丑」): #view-home is now its own scroller with the bar hidden, mirroring #view-daily.
Gates: syntax x6, bootprobe zero+phone, fits/share/hut suites, q406 probe ALL PASS.

## 产品与方向
- **2026-10-25** 公开方式 = GitHub Pages（仓库 `fantasywwyyxx-zoe/tokyo-side-quests`），因为 Muse 分享链接在 iOS 主屏幕模式下有登录墙，不能当 app 用。
- **2026-10-25** 収益化搁置，增长优先；App Store 必须用屋号/组织名义，绝不用实名（屋号未定）。

## 视觉系统
- **2026-10-25** 日间 D1 Pearl White：奶油底、**红色为主色**（主操作/警告）、蓝色辅助；夜间 Y3：蓝黑 + 亮黄；柠檬黄 #FFD83D 只用于 EXP、徽章、CLEAR 印、升级/扭蛋标记。
- **2026-10-25** 活动图只用真实照片；AI 横幅插画退役；无图活动用干净空窗（不写字）。
- **2026-10-25** 详情页：接取和签到是同一个状态按钮（接取→签到→CLEAR）；无期间进度条；必须像 GBA 游戏画面，不像记事本。
- **2026-10-26** 页面构图规则：游戏画面式（一块像素场景 + 一个粗框窗口），一屏不滚动；堆叠网页卡片式排版否决。
- **2026-10-26** 字体定案（试样页经 Zoe 批准，方案 A）：日文 Kiwi Maru + M PLUS Rounded 1c；拉丁/数字 Baloo 2；简体中文 Noto Sans SC（900/700）。字体切换器已废除；细字重一律视为缺陷。改字体必须先出试样页给 Zoe 批准。**（其中 Kiwi Maru 部分已被 2026-10-27 决定取代，见「审查分诊五项拍板」。）**

## 地图
- **2026-10-25** 地图 = 真实地理烘焙矢量图（OSM 数据在构建时写进文件），放弃运行时瓷砖加载（预览环境验证不了、比例和清晰度反复出问题）。
- **2026-10-25** 地图画风目标 = 初代手绘游戏地图感（标注画进地图美术里），在同一套真实地理上做表现层；第一版 RPG 化重绘被否决（太丑、漂浮英文牌匾）。
- **2026-10-26** 地图页布局最终版：地图贴边铺满至底部导航之上，浮动 chips + 宝可梦/MOTHER 风菜单窗（带 EXP/票小窗）；进地图要有进游戏地图的过渡感，并立即请求定位、自动居中。

## 导航与结构
- **2026-10-26** 全局底部 GBA 命令栏（常显、不自动隐藏）：一覧 | 主人公 | 中央凸起 START（=地图；在地图页打开经典双列 GBA 菜单）| デイリー（带徽标）| ⚙。地图在栏下全幅铺展。
- **2026-10-26** 四大区：マップ / 一覧（可搜索的任务索引 + 整页详情；搜索是打开筛选窗的按钮，心情筛选 ≤8 个本地化分类；活动名永不翻译）/ デイリー（日常「小确幸」任务，文案要明确区别于真实活动冒险）/ しゅじんこう（换装、等级/称号/徽章、扭蛋；上部可折叠、默认折起）。
- **2026-10-26** 收集印章系统整体删除（完成任务的 CLEAR 印效果保留为反馈）。设置（语言 EN/JP/中文 / 主题 / BGM / 声音 / 教程重播）在每页右上角的全局折叠面板里；教程是聚光灯引导式。

## 系统与内容（2026-10-27 凌晨连轮拍板，此前只记在 HANDOFF，现补记）
- **2026-10-27** 新档从「捏人」开始，4 个预设勇者退役为起始选项（旧档保留自己的勇者）。
- **2026-10-27** 常驻名所升级为 EPIC tier（紫+金样式）：首通给该地点专属限定装备；EPIC 通关只能 GPS 到场签到，不许手动/远距离完成。
- **2026-10-27** EXP 分级：到场 GPS 完成 = 100%；远距离/手动完成 = 30%，且每天最多 1 次。16 片东京像素全景拼图只从到场/EPIC 完成掉落（重复片 +10 EXP，集齐给限定奖励）。
- **2026-10-27** 拍照系统整体删除（Zoe 01:07 推翻同日早前的拍照方案）：EPIC 签到照、デイリー拍照证明都删；デイリー回到点按完成（连击/休息卡/全清 +30 EXP 为动力层），原拍照日记改为无照片的记录日历。
- **2026-10-27** 目录扩至 75 件（常驻 39 + 期间限定 36），区域 11 个；徽章 12 → 36 枚；新设收集图鉴（收集 hub + 区域达成度）与冒险日志（完成记录带日期、到场/远距离标记、EPIC 标记）。
- **2026-10-27** 无社群/社交系统（现在和计划都没有）；分享只限自动生成的像素成就卡（通关/升级/拼图完成），不含任何个人照片或日常内容。
- **2026-10-27** 适配目标改为 Zoe 实机短高度（约 667px）：说明文字块默认折叠为一行，任何按钮不许独占整排（紧凑宽度、同排并列）。

## 审查分诊五项拍板（2026-10-27，Zoe：「5点都按你的建议定」）
- **字体**：Kiwi Maru 正式退役（代码已于 2026-10-26 FINAL PASS 移除加载）。日文字体 = M PLUS Rounded 1c 一套（标题正文同）；拉丁/数字 Baloo 2；简体中文 Noto Sans SC。
- **活动图口径**：官方主视觉/海报算「官方物料」，可用；有真实照片时优先真实照片。授权核查列为屋号/上架前必做项（`ev-*` 物料逐个核来源），个人自用阶段先行标记。
- **签到精度门槛**：GPS 签到新增精度门槛 — 定位精度粗于 100m 时不通过，提示等 GPS 稳定后重试（三语提示已落地）；签到半径不变（场馆自定 r，默认 400m）。
- **无图占位**：无图活动的「彩色横条 + 分类图标」占位废止 — 一览缩略图与详情横幅一律改为干净空窗（无横条、无图标、无文字），与既有「干净空窗」决定统一。
- **名字隐私**：代码注释里的真名已删除（2026-10-27 落地）；GitHub 用户名（含 zoe）暂时保留，等屋号定案时一并处理（改名会断现有链接）。

## BGM
- **2026-10-26** 日间主 BGM = 「バトルロード」（BPM 144，4 首候选里 Zoe 选的 C）；日间另保留「午後のロード2号線」「出発の町・改」可切换（共 3 首）；夜间 2 首不变（「夜の牧場子守唄」「夜のポケタウン」）。
- 注：BGM 整体仍在打磨中，Zoe 认为还不够耐听。

## 标题画面
- **2026-10-26** 主标语（Zoe 本人定的句子）：中文「生活不止主线，开启你的东京冒险」/ 日文「メインクエストだけじゃない。東京の冒険をはじめよう。」/ 英文 "Life isn't just the main quest — start your Tokyo adventure."，像素打字机效果 + 闪烁方块光标。Logo 必须是设计过的像素字（日夜两版），标题背景用精致生成像素插画（Zoe 已批准该标准）。

## 活动详情弹层重做（2026-11-02，Zoe 结构化指令 → 诊断 → A 案拍板）
- **流程**：先诊断+方案、Zoe 确认后才改代码（本次特例，覆盖 ship-first 常规流程）。根因：底部按钮区约占 1/4–1/3 屏 + 头图/标题带不滚动；简介并未被裁切（▼ 是折叠时代的残留符号 + 打字机中途帧），打字机效果按 Zoe 11:12 裁定保留。
- **字阶 5 档（rem，根 16px）**：标题 1.25rem / 字段值・简介 1rem / 主按钮・期限倒计时 0.9375rem / 字段名・全部标签 0.8125rem / 辅助 0.75rem。全文 700（A 案试样拍板），靠字号与颜色分层，不用细字重。标题最多 2 行，超长自动缩字、下限 16px。
- **布局**：标题带 + 头图随内容一起滚动（回收空间）；弹层只有一个滚动区；底部渐隐提示可滚动；期限从信息卡里独立成行，置于标签带之前；顺序统一为 标题带 → 头图 → 期限 → 标签带 → 简介 → 信息卡 → 按钮页脚。
- **去重**：同一信息只出现一处（無料 chip 与料金行、即将结束 chip 与倒计时、头图地点标签与场所行、未开始倒计时 ×3）。未开始主按钮文字只写「開催前」，提醒/收藏记入 ROADMAP 将来機能。头图标签只留区域名 + 最大宽度。
- **数据不动、界面兜底**：字段无有效内容整行不渲染（时间行须含时钟时刻、料金行须含金额/免费）；多档料金按 / 或 ／ 拆成列表（括号内容不拆）。「時間」字段里的非时间内容靠此规则自然隐藏，不改数据。
- **颜色与按钮**：分类头色按白字对比度 4.5:1 整体加深一档（默认蓝 #57b6e8 → #3b7b9d 等 8 色 + Tech/Experience，第二张旧色表 CAT_COLOR 同步统一）；按钮全部去渐变、同材质；关闭按钮改中性深色圆盘（原来的红圈是设计红盘 + 打开时 autofocus 的 focus 环叠加）；打开弹层时焦点给弹层容器，:focus-visible 保留给键盘用户。
- **日语断行**：word-break: auto-phrase 先行，Zoe 在 iPhone 实机验证，不生效再评估 BudouX。
- **中文字段值**：中文 UI 下 hours/price/venue 走 HOURS_ZH/PRICE_ZH/VENUE_ZH 映射（镜像 Q-231 的日语方案，含补齐日语侧原缺的 8 条），覆盖率三语 100%。
- **v17b 边界修正（2026-11-02，QA R109 指摘）**：料金ゲートに「有料／收费／Ticketed／Paid」を追加 — 金額が無くても「有料」という事実は有効な料金情報として行を表示する（対象は三語とも約26–30件、東京タワー・ジブリ等）。金額も無料表示も無い純粋な注記だけが行ごと落ちる。
- **v18 实机修正（2026-11-02，Zoe 看了 v17 实机后）**：字阶整体小一档（标题 1.1875rem／字段值・简介 0.9375rem／按钮・期限 0.875rem；字段名・标签 0.8125rem、辅助 0.75rem 不变，标题自动缩字阶梯同步下移）；滚动改为「覆盖式」：标题带先滚走，头图粘在滚动区顶部，下方内容做成一整张不透明的 sheet（与头图同宽满幅）上滑把头图盖住。
- **v19 合并版（2026-11-02，Zoe 选定 3:1 后开工）**：详情顺序改为 头图 → 标签行 → 简介 → 信息卡 → 按钮；期限并入信息卡作第一行（常設紧凑单行、含倒计时），营业时间/场所/料金同卡，行间细分隔线，卡框比简介的粗框淡一档（2px 半透明线色、无阴影），无效行不渲染（沿用 v17 判定）；头图比例 2:1 → 3:1（390 宽下 195→130px），object-position 50% 30% 偏上裁切；数据结构无裁切焦点字段（只报告、未加）；地图按钮三语文案缩短为「地図で開く / Open in Maps / 在地图中打开」保证半宽一行；标题叠图方案只评估未采用。

## 2026-11-02 Q-255 — share chooser (X / Instagram)
Zoe: the quest poster and the clear-record share should post the generated image to X / Instagram in one tap. Platform reality: neither X nor Instagram accepts image posts from a web page directly — the OS share sheet is the only channel that carries the image itself into those apps. Both poster flows (shareQuestPoster, doShareClear) now open ONE chooser, #sharePick (popover, re-parented into an open dialog per the Q-249 lesson; closeDetail dismisses it with the confirm). Rows: system share (image file via Web Share; falls back to text+URL share, then the flow's original fallback — poster: download, clear: clipboard), X (image saved first, then the X composer opens with text + link ready), Instagram (image saved first, then Instagram opens; the note tells the player to attach the picture). Reward semantics unchanged: quest poster stays reward-free (Q-176), the clear share still grants via shareReward. Trilingual [News] entry shipped with it.

## 2026-11-02 Q-256 — evergreen +50 (eg10 batch) & Q-257 alignment fixes
Zoe ordered the next evergreen expansion ("今天继续推常驻 扩大追加50个"). The eg10 pack (50 quests: Machida/Fuchu/Kawagoe/Saitama, Yokohama/Kawasaki, Nerima/Itabashi/Edogawa/Katsushika, central Tokyo) was produced against the candidate pools with full vetting — official-site checks, dedup against the 309 catalog, in-sheet coordinates only, real photos with per-photo licences (PHOTO-CREDITS.md), BLURB_ZH/LANG_ZH per quest, VENUES rows, and JA/ZH field-map additions (hours 36 / price 7 / venue 50 / lang 31 / areas 6: Kokubunji, Hamura, Sagamihara, Edogawa, Mejirodai, Ota). Post-Q-254 these are regular evergreens: no gear rows. Catalog is now 359 + 4 LEGEND. Dev rulings on the pack's open points: Saitama MOMAT keeps the Omiya area key (consistent with its Saitama-city siblings); reservation-first venues (Fujiko F. Fujio, WB Studio Tour, Hara Railway) are accepted on the Ghibli Museum precedent, with the copy stating the reservation terms; Seikado and Eisei Bunko are exhibition-period venues — the daily refresh watches their calendars. Nogeyama Zoo, the Horse Museum and the Taro Okamoto Museum were dropped mid-vetting (long renovation closures) and replaced. Q-257 rides along: the detail head's text wrapper now flexes to the full row so the state badge reaches the right end of the No. row, and the daily-record calendar's month nav loses the one-sided 42px offset on its next button (Zoe's two circled screenshots). Build-process note: the first integration attempt mis-scanned the EVENTS array (bracket counting without braces) and nested the batch inside the first entry's mood array; the pre-ship data gates (count, prefix integrity, coverage) caught it before commit and the corrected build re-verified clean — the gates are the reason it never shipped.

## 2026-11-02 Q-255b — Instagram route fixed; share chooser hardened
Zoe's device verdict on Q-255: the Instagram row "doesn't work". She was right — that row saved the image and opened instagram.com, but Instagram's mobile web cannot create photo posts at all, so the route dead-ended. The Instagram row now goes through the OS share sheet carrying the image file (the app appears as a destination there — the only working door from the web); the save+open route remains only as the degraded fallback when file sharing is unavailable. The X row is unchanged (its web composer is real). Same build, QA R112 hardening: the clear-share path now guarantees the chooser appears — buildClearPoster rejection AND a 2.5s hang both fall back to the chooser holding the generic share card (never the invisible legacy direct-share); openSharePick is wrapped so an internal failure drops to the system share directly; the chooser's backdrop close now triggers on any tap outside the panel, not only exactly on the container element.

## 2026-11-02 Q-258 — accepted-only filter in the search window
Zoe: the search window needs a filter for "only the quests I have accepted" — there was no way to see her accepted set at a glance. The map filter sheet already had an accepted chip; the LIST search window did not. Added a toggle beside FREE only (#msAccepted, same control family): filterAccepted narrows currentBoardList with the map chip's exact semantics (isAccepted && !isCleared), joins the summary line, and clears on reset. Session-only state, like the other list filters.

## 2026-11-02 Q-259 — quest index sorting: NEAREST by default, START / END orders
Zoe's polish package for the search window (with Q-258): (1) add start-time and end-time sorts; (2) the DEFAULT order is nearest-first — the board opens distance-sorted; (3) EPIC quests must not sit pinned at the top as a block (they read as "can't make sense of it") — under distance order they mix in by distance. Implementation: the single NEAREST toggle became a 3-way segmented control (NEAREST / BY START / BY END) in the list subbar; listSortMode defaults to "near". Dev decisions (hers to reverse on device): with no position yet or location denied, the board keeps the end-date order and the existing one-line sortMsg explains (the position is requested once, when the list screen is first opened, memory-only as before); evergreens sit LAST in both date sorts via the board's existing 9999 sentinel (they neither start nor end); the sort no longer counts as a summary "filter part", so the LEGEND lead cards still head the unfiltered board. EPIC has no term in any comparator.

## 2026-11-02 Q-260 — posters carry a one-line game intro
Zoe: the share posters only said "beta now on" — a stranger seeing one could not tell what the game is. Both poster builders (quest poster, clear poster) now print a one-line intro (posterIntro, per UI language) as the first row of the bottom band: JA「東京の名所と穴場をクエストにした街歩きゲーム。」/ EN "Tokyo's sights and hidden gems, as quests." / ZH「把东京各处的宝藏地点，做成任务的冒险游戏。」(measured with the brand fonts to clear the QR zone). The band re-stacked inside its 216px (intro 30px, CTA 48px, scan 32px, URL 28px); the beta CTA itself stays until the post-beta copy pass (tracked for 2026-11-06).

## 2026-11-02 Q-261 — scene props: wide ambient pieces move to the far plane
Zoe (Lv.12): the train crossed right behind the hero's head. QA's placement audit (qa/reports/2026-11-02-scene-prop-placement-audit.md) confirmed the train and found the same latent defect in two not-yet-unlocked pieces. Fix: all three wide ambient props leave the hero's body zone for the far plane — train: a shorter distant line starting around the flag and running right (left:44%, bottom:128px, strip 20px, car 84×15 animated by left), rainbow: an arc in the sky (top:5%, 62%×48px), bridge: a small distant silhouette on the left horizon (left:52px — clear of the Skytree — bottom:130px, 40%×20px). Same pass: the dead fixed-position declarations on the six runner-carried landmarks (sakura/vending/hachiko/torii/tower/monument) are stripped to size-only — carriers set position inline every frame, so the old rules were inert but misleading (QA secondary note). Runner grounded set, crossing, skytree, fireworks, lanterns and the creatures are unchanged (audit PASS).

## 2026-11-02 Q-262 — share chooser round 3: settlement guarantees + document backdrop
R113: Q-257 LAB-CLOSED (both legs PASS). F1 still failed in QA's env — the celebration share button produced nothing, not even the 2.5s fallback, while the detail FAB opened the same chooser in the same panel session. Code audit: the wiring and doShareClear are sound IF the click lands; the silent links were (a) a draw throw inside a poster builder's start() (called from img.onload / a fonts .then) leaves its promise unsettled forever, and (b) the fallback's payload, buildShareCard(), was built inline as openWith's argument — a throw there kills the rescue itself. Hardening: both poster builders wrap every start() call site (throw → resolve(null)); doShareClear's openWith is null-tolerant (safeCard() in its own try/catch; the chooser opens even with no canvas, rows degrade gracefully). F2 (backdrop): the chooser's popover box does not cover the screen, so outside taps never reached its listener and edge taps fell through to the detail dialog, closing both — now a document-level capture listener is armed only while the chooser is open: any tap outside the panel closes the chooser and is swallowed. If F1 still fails in QA's env after this, the tap is not reaching the button there (their synthetic taps on popover surfaces vs the dialog-hosted FAB is the remaining difference) — the path is then provably armed and Zoe's device is the court for that leg.

## 2026-11-02 Q-263 — photo backfill for the 8 photo-less quests + refresh photo gate
QA's photo-coverage investigation found exactly 8 quests with no photo (all daily-refresh additions c26–c33). A sourcing pass found a合格 real photo for all 8 (official sources first; one CC BY 2.0 Commons photo of the actual venue, now in EXT_CREDITS). Dev rulings on the pack's flags: c30/c33 use the organizers' own official reference/press photos of the actual exhibited works (Tokyo venue shots do not exist until the exhibitions open — replace opportunistically after opening); c28 uses the same event's previous-edition venue photo (this edition opens 2026-11-21); c26's official source is small (458×282 — accepted per the eg10 precedent, flagged for replacement). Deep-diff gate: the ONLY catalog change is the 8 img fields. Separately, the daily-refresh job now carries a PHOTO GATE: a new event whose real photo cannot be sourced is held back that run （写真未調達のため保留）, logged and reported, instead of being published photo-less.

## 2026-11-02 Q-264 — map pins: type frames + legend
Zoe approved plan 2 (frame colour-coding; corner badges and motion effects rejected as messy). Evergreen pins wear a BLUE frame, limited-period pins a RED frame — implemented as the pin body's own border colour (#2d77cd / #e5484d): the same element carries the photo, so frame and photo are one box under zoom/pan/clustering and structurally cannot drift apart (her hard condition). EPIC pins keep their inset gold ring inside the blue frame; cleared pins keep the green ✓ badge at the corner; clusters stay neutral (no frame); LEGEND route pins (★) are untouched. A small legend pill overlays the map's top-left corner (blue swatch 常設 / red swatch 期間限定， labels follow UI language; pointer-events: none, no existing layout moved).

## 2026-11-02 Q-265 — train: into the sky (Zoe's device verdict on Q-261)
Zoe at Lv.12: the relocated train still read as part of the road — its rail line visually merges with the road's edge lines. Her instruction: put it by the blue sky behind, farther away (fallback she authorised: drop the train for a grounded runner prop instead). The strip now sits in the sky band (top:19%, right segment, 14px tall) with a smaller, slower car (64×11, 19s cycle) — a distant elevated crossing clearly separated from the road geometry. If it still fails her eye, the authorised fallback is removal + a runner-carried street prop.

## 2026-11-02 Q-266 — sign-in sync: the cloud save always wins (Zoe's ruling)
After the 2026-11-02 save scare (server-verified no-loss: the cloud record had in fact won and been applied, then echo-pushed), Zoe ruled: at sign-in the cloud save ALWAYS wins. syncOnce no longer compares records: when a cloud row exists it is applied unconditionally (the S1 ownership guard's fail-safe is unchanged for the foreign-local + no-cloud-row case, and a first-ever sign-in with no cloud row still uploads the local record to seed it). The one-shot apply marker (tqlCloudAppliedVer) is cleared in this path so a previously-applied cloud version can still rule a local record that changed since — the marker guarded the retired reload-apply; applies are in-place now. compareSaves is retired from the sign-in path (kept for reference). Cost, stated to Zoe before she chose: progress made while signed out is discarded at sign-in when a cloud save exists.

## 2026-11-02 Q-267 — LEGEND cards: no head-pinning either (Zoe's correction)
Zoe, on the live list: "这些传说级怎么还是置顶，我都说的不需要置頂他们" — her no-pinning ruling covers LEGEND route cards too, superseding the Q-259 design decision that kept them leading the unfiltered board (and QA's R115 pass on that basis). The four route cards now sort with everything else: by their current anchor's distance in NEAREST order; dateless (the evergreen tail block) in the date orders and the no-position fallback. They still appear only on the unfiltered board, as before.

## 2026-11-02 Q-268 — mini-game poster share
Zoe: mini-games get the poster treatment too — capture the current game screen into the poster layout, same share entry as the quest poster. All five games: a SHARE POSTER button in the result row; the poster is the shared 1080×1350 frame (brand header, capture zone, game name + SCORE + BEST, the Q-260 intro band + QR). Canvas games (dash/jump/catch/whack) draw the live canvas at tap time, pixel-crisp; memory has no canvas, so its board is drawn as it stands (face-up/matched cards shown, matched ringed in lemon). Sharing runs through the same #sharePick chooser; reward-free like the quest poster (Q-176). Also removes a dead line left by Q-267.

## 2026-11-02 Q-269 — share chooser: Instagram row out, Threads row in (Zoe's ruling)
Zoe's device verdict on the Q-255b Instagram row: it only downloaded the poster and never reached Instagram. Her ruling: "直接 Instagram に投稿できないなら、Instagram は取消。Threads に換えてもいい". Platform fact (QA-verified): Instagram offers no web intent/API to open a composer with an image — for any website; the OS share sheet was the only door and it degraded to a download on her device. Threads has an official web intent (threads.net/intent/post, text + url prefilled; no image attachment, same constraint as X). The chooser's third row is now Threads (save image → open intent → saved-note), igShare is removed, and the Q-255/Q-268 announcement entries are rewritten to match. The system share-sheet row is unchanged (it still carries the image itself to any app, Instagram included). Her device tap is the final verdict.

## 2026-11-02 Q-270 — mini-game share buttons: label hardening
QA's R121 walk found the result-screen share buttons working in all five games, but reading as unnamed white buttons in their a11y tree. The label IS set by design (STR mgShareBtn ×3, applied in renderStaticText); as belt-and-braces the label is now set as aria-label too, and also at wiring/init time in addition to renderStaticText. No behaviour change. QA rechecks the accessible name; the visual label is Zoe-device territory like the poster look.

## 2026-11-02 Q-271 — precautionary rollback of Q-270
QA escalation (16:03): on the Q-270 build, two QA profiles froze at the title screen (title renders, START unresponsive; syntax checks pass — a runtime failure, not parse). No fresh boot on Q-270 has succeeded anywhere yet; real-player impact could not be excluded, so the live build is rolled back to the Q-269 code (last build with successful QA walks, R121) under a fresh token so every client reloads onto known-good code. Q-270's change (aria-label + init-time label on the mg share buttons) is inert-looking; diagnosis of the Q-270 artifact continues offline before anything from it re-ships.

## 2026-11-02 Q-270 ROOT CAUSE + Q-272 — eval-time STR access froze the title
Root cause (code-verified): X() reads EXT_STR, a var assigned at line ~31913 of block 3. Q-270 added a label set inside the mini-game share wiring forEach at line ~27795 — top-level eval-time code running ~4,000 lines BEFORE EXT_STR exists. X() threw TypeError, the exception killed the rest of block 3's evaluation, and every later wiring (including the START button's listener at ~30476) never attached: title rendered, START dead, while the separate auth script (block 4) kept the login dialog working. Q-269 was safe because its wiring only added listeners; X() was called solely from renderStaticText/handlers (post-init). Live window: 15:36–16:04 JST; the Q-271 rollback (Q-269 code, fresh token) self-healed clients via the version check, and QA confirmed both frozen profiles boot on Q-271 (R124a/b). Saves were never touched (the throw precedes any save write path in effect). Q-272 re-ships the harmless half only: aria-label set inside renderStaticText. STANDING RULE: never call L()/X()/A() or read STR/EXT_STR/AUTH_STR from top-level eval-time code — accessors only inside functions invoked after full script evaluation.

## 2026-11-02 Q-273 — selected-pin ring: red → lemon
Zoe, from her device: the selection highlight is also red, and since Q-264 made red the TIMED frame color, the two reds are easy to mistake (her screenshot: a selected evergreen pin wearing the red selection ring next to red-framed timed pins). The .pin.sel outline and its pulse are now lemon #ffd83d — the game's highlight color — which collides with neither frame color (blue evergreen / red timed) nor the green cleared tick.

## 2026-11-02 Q-274 — train: back on the ground (Zoe overruled the sky)
Zoe's verdict on Q-265: the train does not belong in the sky — put it on the ground, properly, and don't let it cover the wish flag. The strip is full-width again but sits on the far horizon (base bottom:116px, under the Q-261 position), with a smaller distant car (56×10). Layering does the flag requirement: the wish-flag button and the hero paint above the props layer, so the train passes BEHIND them and never covers the flag. If she vetoes this too, the standing fallback is removal in favour of a grounded runner-carried street prop.

## 2026-11-02 Q-275 — map legend pill: above the pin layer (Zoe's device screenshot via QA)
Zoe's 18:06 screenshot: a blue-frame pin paints over the top-left legend pill, hiding the red swatch and the 「期間限定」 label. Root cause is stacking, exactly as QA presumed: the Q-264 pill was placed at z-index 6, but #pinLayer stacks at z-index 25 — every pin (and cluster, and the selected pin at z 40 inside the layer's context) paints above the pill whenever one wanders under the top-left corner. QA's R118 pass did not contradict this: no pin overlapped the pill in that walk's framing. The pill is display-only (pointer-events: none), so it now rides the operation-overlay layer — z-index 30, the same layer as .map-chips and .osm-attrib — above the whole pin layer, still below sheets and dialogs. One value changed; nothing else moves. For the 2026-11-03 announcement digest: include Q-275 in the Q-264 line's scope.

## 2026-11-02 Q-276 — train deleted; Lv.12 slot is now a street clock (Zoe's ruling via QA)
Zoe, without waiting for Q-274's device verdict: 「电车你直接删了吧换别的」 — the authorised fallback fires. The train element is gone entirely (SCENE_PROPS entry, TRAIN_SVG, .sp-train/.train-car CSS, train-pass keyframes, the reduced-motion reference). The Lv.12 slot (same index, count stays 30, level sequence untouched, so sceneSeen bookkeeping is unaffected) is now a street clock （街角時計 / Street Clock / 街角时钟）: a new grounded prop in RUNNER_GROUNDED (inserted in level order), riding the side carriers like the vending machine and stone lantern, with the standard contact shadow — the centre lane stays structurally empty, as always. sceneNames index 11 updated in all three languages. Data gates: 30 props, unique ids, lv = index+1 across the board, grounded list 23 and every grounded id exists. The clock art was render-checked before shipping. For the 2026-11-03 announcement digest: the train lines (Q-261/Q-265) resolve to "the Yamanote train prop was retired at Zoe's word and the Lv.12 slot became a street clock".

## 2026-11-02 Q-277 — mini-game share button: result screen only (QA filed it as their Q-276; Zoe's device screenshot)
Zoe, mid-game in Coin Catch: the poster-share button is sitting under the ◀▶ controls during play. Her ruling: 「小游戏玩儿的过程中不要Share」 — share belongs to the result screen only, which is also what Q-268 specified. The leak: the five buttons were placed statically in each game's start-button row with no state handling at all, so they showed in every state (window open, playing, result). Fix: the buttons now follow the start button's own state machine via mgShareVisible(id, show) — hidden at window open, hidden at play start, shown at the result state (the moment the start button returns labelled "again"), for all five games (dash/jump/catch/memory/whack); the markup also carries `hidden` so no path can show one early. Numbering: QA first filed this as their Q-276, but dev's Q-276 (train → street clock) had already shipped when the report arrived, so both ledgers settled on Q-277 for this fix (QA unified their record the same evening).

## 2026-11-02 Q-278 — hero sprite: D proportions ported atomically (Zoe picked D)
Zoe picked direction D (big head, 4-row face) from Art's round-2 proportion sheet, accepting the full gear redraw. Art delivered in three verified batches (base+hair+faces / equipment shapes / side view + runner); dev verified every batch pixel-for-pixel against the sprite JSON renders using the CURRENT production helpers, and re-verified the ported file the same way before shipping: 18 base combos + 49 equipment probes + her real combo + 11 side/runner frames all identical to Art's references, and all 342 items render through the new equipped path with zero errors and zero out-of-bounds paints. The port is a pure swap of the sprite layer under the existing function names (HERO_ROWS, drawBaseSprite, drawHairStyle, drawFace, drawYushaJacket + YUSHA_JACKET cells, drawHatShape, drawNeckShape, drawOutfitFx, drawSideSprite, drawRunnerFrame) — drawHeroEquipped, palettes, item data and save format are untouched, so every existing customisation and wardrobe carries over. D anchor rows: hair 1–4, brows 5, eyes 6–7, mouth 8, neck 9, shoulders 10, torso 11, belt 12, legs 13–14, shoes 15; the runner clears only rows 13–15 (belt row 12 is never erased); the side view keeps production structure on the new geometry. Two design notes that ride along: (1) brows now live on their own row 5, so they are drawn under the cap style too (supersedes the Q-237 candidate's no-brows-under-cap rule); (2) a sixth expression, "heart" (red heart eyes + mouth, from Art's Q-237 transposition), joins FACES with labels in all three languages (/ハート/爱心眼） — flagged to Zoe explicitly in the ship report since she never individually approved that one expression. Player-facing [News] entries in all three languages ship in the same build per the announcement-board rule.

## 2026-11-02 Q-280 — zone stamps: refined + centred motifs, frame B wavy petals (Zoe's two complaints; she picked frame B)
Zoe's complaints: stamp motifs were not centred, and the plain circle frame looked crude. Art's delivery (15-zone-stamps/): ZONE_ART_D2 (all 11 zones refined with the extended a/l/d palette and every motif re-centred optically — the old art sat 2–3 cells high) + frame B spec (border circle replaced by a CSS mask: 20 petals + an inner hairline ring, hollow centre, 1.8KB data URI). Port: ZONE_ART data swapped to D2 verbatim under the production name; drawZoneStamp takes the extended-palette version (locked greys included); .stamp-ring loses its border and gains the ::before mask layer coloured by the existing --stamp variable (red by day, lemon under midnight — the variable already existed for other stamp-coloured elements). Two small judgement calls where the spec was silent: the COMPLETE state's old hard-red square-ish halo becomes a round tint disc inside the ring's hollow centre via color-mix(var(--stamp) 16%) with border-radius 50% clipping (no complete zone exists in Zoe's 7/11 mock, so no mock conflict), and .stamp-mark colour moves from hardcoded #b3402f to var(--stamp) so the ✓/★ follows the frame at night. Locked frame follows the spec exactly (#9aa4ae at 0.55 on ::before). Gates: all 22 reference renders (11 zones × got/locked) pixel-identical from the ported file, data gates 16 rows × 16 chars per zone, mask URI embedded byte-identical from the spec. Trilingual [News] entries in the same build.

## 2026-11-02 Q-281 — customize panel: plan B slim stage, engineered to one screen (closes Q-279)
Zoe's device verdict on the Q-230 two-pane customize: the right column still scrolled (measured ~850px of content in a ~560px frame) and the 42% left stage column was mostly blank. She picked plan B (keep the two-pane layout, slim the left column) from dev's two mocked plans, with a hard addendum: "one screen, no scrolling — figure it a way." Implementation (CSS only, all scoped to #hsegCustom; the creator screen is untouched): stage column 42% → 24%, content vertically centred instead of bottom-pinned, stage canvas 104px → 72px (64px under the ≤740px tier, 56px under a new ≤620px tier). The reclaimed width funds denser option grids: presets 2-col → 4-col mini cards (canvas 42px → 30px, 7 presets in 2 rows instead of 4), style/face chips 2-col → 3-col with slimmer padding, swatches 40px → 30px, group margins 12px → 8px, scroll bottom padding 48px → 10px. Height budget at her ~667px viewport: ~522px of content against the ~560px frame; the ≤620px tier trims a further ~30px. The column keeps overflow-y:auto purely as a safety net for extreme viewports; at target sizes nothing scrolls and the ▾ continuation plaque stays hidden. win-more anchor recentred to the new column split (62%).

## 2026-11-02 Q-282 — heart expression redrawn (Q-278 residual, Zoe's device verdict)
Zoe on the Q-278 heart: 「爱心眼好像不是爱心」 — the 2×2 red block with a white dot never formed a heart glyph at device size. Art redrew the heart branch only (V3 of 4 candidates): a 3×4 plump heart per eye at x4–6 / x9–11, rows 5–8 — lobes with a skin notch on row 5, full rows 6–7, point at row 8. Two deliberate absences: brows() is not called (brow pixels would fill the notch), and there is no mouth (row 8 already carries both cheeks and both heart points). The white dot — the main reason the old glyph read as a sparkly eye — is gone. Dev gate: the d1 reference suite against the ported file shows the other 17 renders pixel-identical and only face-heart changed; dev's own render of the ported branch confirms two readable hearts. QA retest (48px + real size, "reads as a heart") joins R130; Zoe's device is final.

## 2026-11-02 Q-283 — wink expression redrawn (Zoe via art dept)
Zoe: the wink "feels wrong too". Art's diagnosis: the closed eye was a flat dash on the bottom eye row (row 7), reading tired/glitchy next to the tall open eye, plus a stray cheek dot at (4,7) merging into the dash. Redraw (V1 of 3): the closed eye becomes a happy dip arc — (4,6)/(6,6) high, (5,7) low, using one pixel outward; the open eye is smile's eye verbatim (highlight position included); the (4,7) dot is removed, standard cheeks stay; mouth and brows unchanged. Dev gate: d1 reference suite shows 16 renders identical, face-wink changed, face-heart differing only by the already-shipped Q-282 redraw. QA retest joins the R133 face pass; Zoe's device is final.

## 2026-11-02 Q-284 — third gear category renamed: 围巾 → 颈饰
Zoe's pick from dev's options: the third slot holds far more than scarves (necklaces, pendants, brooches, bowties, bells), so the category label changes in all three languages — ZH 围巾→颈饰, JA マフラー/スカーフ→首まわり, EN Scarves/Scarf→Neckwear (colScarves + kindNames.scarf). Item NAMES are untouched (an item actually named …围巾 keeps its name). This rename opens her wider order the same hour: refine the whole neck category (audit + de-duplication + polish) — tracked as the neck refinement programme below.

## 2026-11-02 Q-285 — face slot: wink REPLACED by shy (Zoe's call, supersedes Q-283)
Zoe dropped wink entirely — not even the Q-283 arc redraw — and picked candidate D "shy side-glance" from art's swap sheet. Changes: FACES entry wink→shy; faceNames ×3 (Shy / 照れ / 害羞); the drawFace branch now draws the shy glyph (pupils shifted right with white at their left, extra blush pixels at (4,7)/(11,7) above the standard cheeks, one-dot mouth at (7,8)). Save compatibility (dev's call, as art requested): the boot sanitizer maps a saved face="wink" to "shy", and the drawFace condition keeps a "wink" alias so a cloud save still carrying the old value renders as shy everywhere (verified: the wink and shy renders are pixel-identical). The same sanitizer line's face list also gains "heart" — it had been missing since Q-278, which would have bounced a saved heart face back to smile at boot. Gates: d1 suite 16 identical + face-heart (Q-282 only); alias equality proven. QA R133 now judges heart + shy; Zoe's device is final. Q-283's wink arc is retired after ~7 minutes live.

## 2026-11-02 Q-286 — neck category refinement ported (Zoe: 道具一定要精致)
Art dept's differentiation spec ported in full: production drawNeckShape replaced by their v2 (per-family variants via new item field v, pendant glyphs via g — star/coin/koban/crescent/comet-with-tail/gem-cut/butterfly/crest/book/lotus etc. matching each item's name, per-item accent signatures via a2), and all 89 neck items received their spec data (v/g/a2 plus the table's c2 swaps; scarf base colours untouched, no type changes). Structural causes fixed in the renderer: the rainbow and pearls families ignored the item colour fields entirely (the single biggest duplication source), and the feather band was a fixed brown. Dev gates on the ported file: data deep-compare vs HEAD — every neck row matches the spec exactly and no other field of any of the 342 items changed; render sweep — 0 non-neck renders changed, 86/89 neck renders changed; re-audit with the same harness as the original audit — pixel-identical pairs 11 groups → 0, same-family near-dupes (≤10px) 412 pairs → 0 (3 cross-family pairs remain within 10px; different shapes, not visual duplicates). QA re-audits before/after; Zoe's device is final.

## 2026-11-02 Q-287 — item previews crop-zoomed per slot (Zoe)
Zoe's verdict on the refined neck items at full-body preview size: "看起来几乎都一样" — correct, and structural: a neck item occupies ~8x4 px of a 16x16 sprite, so pixel-distinct designs still blur together when the whole hero is shown. drawItemPreview now renders the equipped hero offscreen and blits a square crop zoomed on the slot — hats: head crop (x2, rows 0-11), neck items: chest crop (x2, rows 4-15); outfits keep the full body. One change covers every preview surface (wardrobe, collection shelf, gacha, celebration portrait). Dev gate: all 340 non-hero previews pixel-match the specified crop/full render exactly. QA spot-checks the surfaces; Zoe's device is final.

## 2026-11-02 Q-288 — customize screen switches to plan A (Zoe's device verdict)
Q-281's compressed plan B still did not fit one screen on Zoe's phone ("不行 还是放不下 那还是按照A布局吧"). Plan A, CSS only in a late-cascade #hsegCustom block: the panel becomes a column — the stage is a slim horizontal band across the top (64px hero + name side by side, ground strip removed) and the options take the full width below: presets one row of seven (28px canvases), hair colours one row of twelve (22px swatches, no wrap), hairstyle and face chips three across as before. Overflow scrolling remains only as an extreme-viewport safety net. QA re-tests structure (R132 points); the one-screen verdict is Zoe's device again.

## 2026-11-02 Q-289 — Q-288 cascade defeat fixed (QA R136, S2)
Q-288's plan-A block was inserted before the FIRST </style> in the file, but the Q-230/Q-281 customize rules live in a LATER style element (~390KB further on) at equal specificity — they overrode plan A everywhere, so devices kept rendering plan B. QA caught it by file audit after their env walk still showed the left column. Fix: the block (renumbered Q-289) moved into the last style element that carries #hsegCustom rules, after all Q-230/Q-281 blocks; a document-order cascade audit now confirms plan A wins for the panel direction, the presets grid and the colour row. Lesson recorded in AGENTS.md: this file has multiple style elements — a "late cascade" block must be placed relative to the LAST element carrying the target selectors, and the win must be audited, not assumed.

## 2026-11-02 Q-290 — plan A compressed further (Zoe's device: still overflowing)
Q-289's plan A rendered correctly on Zoe's phone but overflowed by roughly the faces group (heading cut at the bottom edge, the scroll plaque overlapping the hair-colour row). Same late block, tighter values: stage canvas 64→48px and band padding halved, panel padding/gap trimmed, group margins 8→5px, label margins 4→2px, chips slimmer, preset canvases 28→24px, skin swatches 30→26px, and the six face chips go one row of six instead of two rows of three. Estimated saving ~105px against the ~85px overflow. QA re-checks structure; Zoe's device remains the final court.

## 2026-11-02 Q-291 — "My Street" prop-list card removed from the titles tab (Zoe)
Zoe circled the info box at the top of the titles tab — tickets readout plus the MY STREET owned-prop text list — with "不要这个不要这个". The whole info box is removed. The street summary render (hsScene) is deleted with it; the street itself and the unlock narration are untouched (the props still appear on the hero page and in the scene). The ticket count is not lost: its readout moves into the EXP footer strip at the bottom of the same tab (same element id, render code unchanged), per QA's sanctioned "fold into an existing display" path. The now-dead .hstat-box/.hstat-scene CSS rules are left in place (inert). QA re-checks the tab; Zoe's device is final.

## 2026-11-02 Q-292 — boot watchdog: self-healing against poisoned cache (QA S2, Zoe's device)
Zoe's Safari held a broken cached copy: the title screen's static shell rendered but every dynamic part was dead — the same silhouette as the Q-270 freeze. The Q-145 freshness check cannot catch a same-version-but-corrupt copy (its token matches), and a build whose main script dies before signalling cannot heal itself. Q-292 adds a small watchdog as the first script in <head>, independent of all other scripts: the main script calls window.__tqlBootOk() as the last step of its boot sequence; if the document completes (or sits parsed-idle at interactive for 3s) without that call, the watchdog reloads once per try (max 2, sessionStorage count) to the same URL plus a fresh upd= query — the Q-145 convention. Same origin/path, so localStorage guest saves are untouched; site-data clearing remains unnecessary and is NOT the recommended recovery (it would wipe guest saves). While the document is still loading, the watchdog only waits — a slow connection is never interrupted. Logic verified in node across 5 scenarios (healthy / dead-at-complete / dead-at-interactive / slow-load / retries-exhausted). Honest limit, told to Zoe: the watchdog ships inside the document, so a copy cached from BEFORE Q-292 (like her current one) cannot heal itself — her current state still needs the one-time ?upd= link QA sent; every copy from Q-292 on carries the guard.

## 2026-11-02 Q-293 — fail-soft boot: corrupt-save quarantine + watchdog stage-2 guidance (QA S2 follow-up)
QA's second hypothesis for Zoe's dead title screen: not (only) cache — a malformed local guest save detonating during boot. Audit result: the save LOADER is already try/catch-wrapped with a field-by-field sanitizer, so a syntactically corrupt JSON cannot kill boot; the unguarded surface is the boot RENDER sequence consuming sanitized state (a malformed nested value can still throw there, before the title wires up). Q-293 therefore hardens the whole sequence instead of one parse point: (1) the boot tail (renderAll → showStart → boot-ok) now runs in try/catch — on any exception it backs the raw save up under tql_state_backup_<ts> (nothing is lost), sets a recovery-note flag, clears the live keys and reloads ONCE (sessionStorage-guarded) into a fresh boot; after a successful fresh boot the player gets one narration line (recoveryNote ×3) explaining what happened and that signing in restores cloud progress. (2) The Q-292 watchdog gains stage 2: if its reloads are exhausted and boot still never signals, it injects its own trilingual guidance panel (navigator.language) with [Reload] and [Back up save & start fresh] — the backup button performs the same quarantine manually. Guard logic re-verified in node (healthy / dead-first-visit / retries-exhausted→panel incl. button wiring / slow-load). If Zoe's ?v=2026 test boots fine, tonight's case was cache and these layers are pure insurance.

## 2026-11-02 Q-294 — S1: watchdog/Q-145 retry caps moved into the URL (storage-independent)
On Zoe's device the Q-292 watchdog reloaded FOREVER: her in-app browser context does not preserve sessionStorage across reloads, so the max-2 counter reset every time and stage 2 was never reached. Both reload guards now carry their state in the upd= query value itself, which always persists: the watchdog writes upd=<count>.<ts> and reads the count back from the URL (storage kept only as a secondary signal, larger count wins); at the cap it shows the guidance panel in place instead of reloading. The Q-145 freshness check likewise encodes the tried marker as upd=v<marker-tail> and refuses to reload again for a marker already in the URL (an older marker in the URL still retries for a newer one). On a successful boot, __tqlBootOk quietly strips upd= from the address bar via replaceState, and the panel buttons navigate to the stripped URL (a user-initiated fresh budget, never an automatic loop). Verified in node WITH STORAGE FULLY BROKEN: visit chain upd=1 → upd=2 → panel, no third navigation; healthy boot cleans the URL; Q-145's three marker cases all correct. (The logic test also caught a build error — the TEXTS table had been clobbered by an edit — before it could ship; the panel path is now test-covered.) Zoe's own recovery stays QA's guidance: close the tab fully, delete the site's website data, reopen on the current build.

## 2026-11-02 Q-295 — watchdog v3: heartbeat, so slow boots are never shot (R140)
QA reproduced the false-fire in their own environment: on a 13MB document, healthy boots in a constrained browser finish AFTER the Q-292/Q-294 deadline (document complete / interactive+3s), so the watchdog bounced good boots, consumed the retry budget, and finally blocked an innocent save behind the "damaged" panel. Redesign: the main script starts a 1s heartbeat (window.__tqlBeat) the moment it begins evaluating; the watchdog fires ONLY after 25 continuous seconds with no beat and a non-loading document — a slow boot is never interrupted, however long it takes; a truly dead boot (eval death, truncation) still recovers, just later. Stage-2 copy softened per QA: it no longer asserts damage ("couldn't finish starting — the save data may be damaged, or loading may just be very slow"). URL-carried caps from Q-294 unchanged. Node-verified with a controllable clock: beats-for-60s boot untouched; dead-from-start reloads at ~26s; beats stopping mid-boot reloads after 25s of silence; still-loading never fires. Also logged from R140 (not chased here): on one successful QA boot the guest panel's red pill label was empty — the same empty-label silhouette as Zoe's original screenshot; a render-order race to investigate separately.

## 2026-11-02 Q-296 — S1 emergency rollback: watchdog auto-reload WITHDRAWN
Decisive evidence: after Zoe deleted the site's website data (fresh storage island), the auto-refresh loop CONTINUED on the then-current build — so the loop was never cache or save; the watchdog itself false-fires on real devices, matching QA's R140 environment reproduction (fires on nearly every boot, healthy saves included). Two generations of countermeasures failed in the field: the sessionStorage cap (not preserved across reloads in her in-app browser) and the heartbeat (invisible when timers are starved/throttled during the long main-thread boot of a 13MB document). Per QA's recommendation, the watchdog's automatic reload is now DISABLED ENTIRELY — the head script is an inert stub keeping only the __tqlBootOk hook. The Q-145 freshness check stays (live since 2026-10-29 without incident; its Q-294 URL-carried marker guard stands). The Q-293 boot-tail quarantine reload is hardened in the same build: its once-only guard now rides in the URL (qz=1) instead of sessionStorage, so it cannot loop either. The heartbeat interval in the main script is left in place (self-cleared at boot, ~zero cost) pending the offline redesign. Diagnosis and any future redesign happen OFFLINE, with real-device verification as a hard gate before anything like this ships again. Zoe's screenshot at the height of the incident shows the half-dead title (wide red button label empty, small empty square under the title pill) on a plain URL.

## 2026-11-02 Q-297 — the title pill carries a static label from first paint
Root-cause synthesis for the S1's "half-dead title": dev ran the full main script in a node harness on a virgin guest state — with a standards-complete DOM it boots CLEAN (boot-ok signalled, #startBtn = "▶ START ADVENTURE", hero cell and footer filled; the only throws encountered were gaps in the harness's own stubs). So the fresh-guest boot code is sound; what Zoe (and QA's R142) photographed is the title DURING a slow boot: the panel is static HTML whose labels only fill when the 6.5MB main script finishes its first render — on 4G and a cold device that window is tens of seconds, the pill sits empty and the hero cell blank, and the page reads as dead. (The Q-292 watchdog then reloaded inside exactly that window, again and again — the loop she reported.) With the watchdog withdrawn the boot can finish, but the window still looks broken. Q-297 therefore puts the pill's label in the markup itself ("▶ START ADVENTURE", the EN startBtnNew text; showStart overwrites it per state/language as soon as boot lands) so the title reads as alive from the first paint. Deeper boot-latency work (showStart before the heavy first render) is a separate, carefully verified change — not an incident-time edit.

## 2026-11-02 Q-298 — boot errors are recorded and painted, not swallowed (S1 diagnosis)
Zoe's address bar shows ?qz=1: the Q-293 quarantine fired, proving the boot SEQUENCE throws in her real Safari on a virgin save with a fresh download — cache and eval-death theories are dead; it is a runtime exception inside the boot sequence that neither QA's environment nor dev's full-script node harness reproduces (both boot a fresh EN guest cleanly). The fail-soft catch was swallowing the only evidence, so Q-298 makes the catch leave it where it can be read: the error message is painted into the title's start pill (the surface every device report photographs) and recorded to localStorage (tql_boot_error: message + stack head); if the next boot succeeds, the recorded message is shown once in the title's foot line and cleared. All diagnostics are best-effort wrapped and cannot affect the boot itself (healthy path re-verified in the harness). Her next title screenshot should name the exception verbatim.

## 2026-11-02 Q-299 — ROOT CAUSE of the dead-title S1: renderStaticText called X() before X exists
Found by running the boot against a DOM parsed from the real markup (stub harnesses could not see it: their querySelectorAll returned empty lists). renderStaticText() — the FIRST call inside the boot tail's renderAll() — labels the five static .mg-share-btn elements with X().mgShareBtn. X and EXT_STR live in script block 5, which is evaluated only AFTER block 3's boot tail has run, so on every cold boot the line threw "ReferenceError: X is not defined", the tail died before applyTheme/showStart, the title kept its static (empty) labels with all listeners already wired (hence "buttons respond but the game looks dead"), and the Q-293 quarantine fired once (?qz=1 — the URL in Zoe's screenshot). Warm sessions were unaffected because renders after full evaluation find X defined — which is why daytime use looked flawless and only cold opens died, in her Safari and silently in QA's tap-through walks alike (R142's label-less pill on a "completed" boot was this, in plain sight). The line entered with Q-272's "safe half" of the Q-270 fix — the same cross-block eval-order disease as Q-270 itself. FIX: STR carries mgShareBtn in all three languages (same copy as EXT_STR) and renderStaticText labels from L(), its own block's table. Gate: the real-DOM harness boots a fresh EN guest to boot-ok with zero navigations in both zero-geometry and phone-geometry modes. STANDING RULE EXTENDED: block 3's boot path (eval + tail + everything renderAll reaches) may only call identifiers defined in block 3 itself or earlier blocks — cross-block accessors (X(), A()) are for post-load handlers only.

## 2026-11-02 Q-300 — LOG OUT button in the account dialog's signed-in view (Zoe's direct order)
Her device screenshot of the LOG IN dialog's signed-in step showed only CHANGE NAME and CLOSE — the existing log-out lived only in the settings account row. Q-300 adds #authLogoutBtn (ghost button) to #authStepDone between CHANGE NAME and CLOSE, labelled from AUTH_STR's existing logout string (LOG OUT / ログアウト / 退出登录） via both label paths (the block-4 done-step population and block 5's refreshExtTexts through A()), and wired to the EXISTING doLogout() — which signs out with Supabase, refreshes the account UI and returns the open dialog to the sign-in step. No new sign-out machinery and no save-semantics change: as with the settings-row log-out, the on-device record stays on the device and the cloud record is untouched. Account DELETION was not built — she wrote 注销/登出； the shipped option is log-out, and full deletion remains a separate decision for her.

## 2026-11-02 Q-301 — default language is Japanese (Zoe's order)
She noticed a fresh open of the site comes up in English: there was no navigator detection at all — the default state literal was lang:"en", so every virgin island booted EN. Q-301 makes the default Japanese: the state literal starts lang:"ja", and the loader's fallback for an invalid/missing saved lang is "ja" too. All three valid saved languages are now honoured verbatim by the loader (previously the ternary coerced anything non-ja/zh to "en"), and an explicit device choice (tql_lang_choice) still outranks everything — so existing players keep their language; only a first-ever visit with nothing saved or chosen now lands in Japanese. Verified in the real-DOM harness across four seeds: fresh → JA title; explicit EN choice → EN; saved en → EN; saved zh → ZH; all boots clean.

## 2026-11-02 Q-302 — the ⚙ button is SETTINGS / 設定 / 设置 (Zoe's order, via QA ticket "Q-299")
Her word: the title's ⚙ STYLE button opens the settings sheet, so STYLE misleads — rename it to SETTINGS / 設定 / 设置. The label is the single STR key styleBtn (EN "STYLE" / JA 「表示設定」 / ZH 「显示设置」) and every consumer is the settings sheet or an opener of it — the title's #startStyleBtn, the bottom-bar #navGear, #styleBtn (+aria-label), the sheet's own #styleTitle heading, and the map menu's settings row — so the one key rename covers all surfaces, as she scoped it. The hero page's appearance segment (segStyle) is a different key about character style, not settings, and is deliberately untouched. QA re-verifies in three languages.

## 2026-11-02 Q-303 — language switch on the title screen (Zoe's order, via QA ticket "Q-300")
Her word: put a simple language switch at the bottom of the title too — a globe-style icon, minimal text — because tonight a fresh island landed in English and the switch was buried in the settings sheet where she could not find it. Q-303 adds #titleLangBtn to the bottom of the title panel (globe SVG + the current language's own name, labelled from STR langLabel), opening #langPick — a chooser cloned from the existing map-pick/share-pick pattern (three rows in their own names: 日本語 / English / 中文， plus cancel) — whose rows call the existing setLang(), so the choice persists through the standing tql_lang_choice path and re-renders everything. All new code is block-3-internal (L() only). Harness-verified: fresh boot shows globe + 日本語， an explicit EN choice shows globe + English, boots clean.

## 2026-11-02 Q-304 — a second account no longer inherits the first account's local record (S2)
Zoe signed in with a different Google account and the title kept showing the first account's save ("Welcome back, Zokidoki"). Code-confirmed in syncOnce: the S1 guard's branch (foreign-owned local record + no cloud row for the signed-in account) correctly refused the UPLOAD, but left the foreign record on screen — and pushCloud's owner check then refused to persist anything the second account did, stranding it. Q-304 completes the guard with a quarantine in the same branch: the foreign record is stashed verbatim under tql_state_foreign_<ownerUid> (insurance only, never auto-restored; its owner's cloud row remains the source of truth and applies at their next sign-in), the live record is replaced with an empty object (the loader expands it to a fresh default — harness-proven), the pending push timer is cleared, ownership is tagged to the signed-in account, and the page reloads once to start that account clean; an acct= URL flag makes the reload single-shot even if storage writes do not stick (flagged, the branch falls back to the old fail-safe stasis). Post-reload, the empty-local branch creates the new account's own cloud row on first push, and signing back into the first account applies its cloud as before. Auth flows cannot be staged in the lab — final confirmation is Zoe's device (QA retest points: second account reaches the creator flow, its play persists, first account's cloud restores on return).

## 2026-11-03 Q-305 — language switches now refresh the extension/auth-owned title labels too
QA R151 observation (code-confirmed by dev before their R152 discrimination finished): switching language from the title control (Q-303) re-rendered the base game via setLang → renderAll, but the title's extension/auth-owned labels — survey, beta bar, support, the account row — stayed in the previous language until reload. Cause: those labels belong to blocks 4/5 (refreshAcctUI / refreshExtTexts), and the only language-change bridge to them was a click listener keyed to the SETTINGS sheet's [data-lang-opt] buttons; the title control's [data-langpick] rows had no bridge, and refreshAcctUI never ran on any language switch. Fix, in block 5 beside the existing refreshAuthTexts wrapper (same house pattern): setLang is wrapped so every switch path schedules refreshExtTexts() + refreshAcctUI() 120ms later. The fix sits at the setLang level, so the upcoming v5 segment form inherits it automatically. Verification: syntax gates + QA's R152 verbatim-read protocol re-purposed as the post-fix check (switch → immediately-after reads of the account row / LOG IN·SUPPORT·SURVEY / BETA bar in the new language, no reload).

## 2026-11-03 Q-306 — the three owed announcement digests posted
The daily-digest entries owed for 2026-10-30, 2026-11-01 and 2026-11-02 were posted to the in-game Beta board (ANNOUNCE, ×3 languages, dated 2026-10-31 / 2026-11-02 / 2026-11-03, guts roundup format, newest first). The Nov-2 roundup consolidates that day's ships (Q-253–Q-304): catalog and photo coverage, list filters/sorts, pin frames, share/poster changes, the hero-and-gear glow-up (incl. the Neckwear rename/refinement and preview zoom), the street clock, and the account/language batch (cloud-always-wins, log-out button, Q-304 second-account quarantine, Japanese default, SETTINGS rename, title language switch) with one plain stability line for the boot fix — no incident details, and the retired wink arc is not mentioned. Gates: per-language counts 17→20, every pre-existing entry preserved verbatim and in order, dates non-increasing. QA board-checks the render.

## 2026-11-03 Q-307 — JA/ZH price-map follow-up to the Nov-3 refresh
The daily refresh (commit 8351587, on top of Q-306) published the Feel the Sound price as a new distinct EN string and flagged it "JAマップ未収録". Q-307 adds that exact string to PRICE_JA （一般 ¥2,500 / 25歳以下 ¥1,100 / 小中学生 ¥550（前売 ¥2,300 / ¥900 / ¥350）) and PRICE_ZH （普通 ¥2,500 / 25岁以下 ¥1,100 / 中小学生 ¥550（预售 ¥2,300 / ¥900 / ¥350）) so the detail view localizes it in both UIs instead of falling back to raw English. Gates: both maps 175→176 entries, all pre-existing entries identical. (Build note: the maps' final entries carry no trailing comma — the first insertion attempt broke syntax for exactly that reason; the fix added the missing comma to the preceding line, and the syntax gate caught it before shipping.)

## 2026-11-03 Q-308 — photo-gate hold #2 released: Hibiya Art Park 2026 published
The Nov-3 refresh held Hibiya Art Park 2026 for lack of a photo-ingestion route; dev sourced one the same day: the organizer's official page (Tokyo Metropolitan Park Association) carries real photos of the exhibited works, and the game now uses Kuribayashi's 'Oya Genkiro No. 6' (mirrored installation, verified by eye as a real photograph, processed to catalog spec 721×1000 JPEG ~165KB, credited in PHOTO-CREDITS.md). Added c34-hibiya-art-park-2026 (Nov 13–29, free, 9:00–21:00, Hibiya Park, pin/coords reused from eg6-hibiya-park, exp 60, moods illumination/installation/immersive) with VENUES, BLURB_ZH, LANG_ZH entries, HOURS_JA/HOURS_ZH for the new "9:00–21:00" string, and — as a gap fill in the same ship — the missing LANG_ZH entry for c33 (same bilingual note). Gates: EVENTS 358→359, ids unique, minus-c34 deep-equal to the pre-build catalog, syntax ×6. The Muttoni hold (hold #1) stays held: the museum's official site carries banners only, and the circulating press photos may depict other editions' works with unverified licensing — it retries on later refresh runs, ideally once the show opens Nov 14 and official photos appear.

## 2026-11-03 Q-309 — first-run creator takes plan A (one screen, no scrolling)
Zoe's device screenshot (22:48) showed the first-run creator still forcing a scroll: it had kept the Q-196 two-pane layout (42% stage column + 2-column option grids in a narrow scrolling column) while the hero-page customize panel moved to plan A in Q-289/Q-290 — the creator was explicitly out of that scope and never got the same treatment. Q-309 ports plan A to #creatorScreen, mirroring the customize values: the body becomes a column, the stage is a slim horizontal band (48px canvas + name, ground strip off), presets run one row of seven (28px canvases), skins one row, hairstyle/face chips go 3-column, hair colours one nowrap row of 22px swatches, and the scroller's legacy 112px bottom padding is reclaimed. The pinned footer (Q-128) and the window contract are untouched; the scroller remains only as an extreme-viewport safety net, with a ≤700px-height shrink tier. Lab gates: syntax ×6, and a media-aware document-order cascade audit confirming the Q-309 declarations win for the creator's body direction, stage direction, preset/chip grids and canvas sizes. Device-final = Zoe (her fresh-profile creator walk).

## 2026-11-03 Q-310 — celebration share chooser was opening UNDER the panel (R157, S2)
Zoe's real-device clear (Kameari No.52, remote 30%) proved the F1 surface dead: tapping the celebration panel's share button did nothing at all. Wiring was intact (celebrate() attaches the listener every render; doShareClear → openSharePick was reached in design) — the failure was hosting: the celebration panel rides the popover top layer above the modal detail dialog, while openSharePickInner always re-parented the chooser INTO the open dialog, so the chooser opened inside the dialog's layer, hidden beneath the panel. The detail poster flow (R116 LAB-CLOSED) worked only because no popover sits above it there. Fix, two parts: (1) openSharePickInner now hosts the chooser in the topmost open surface — the celebration panel itself while it is showing (popover-open, or .show with content for the R34 dialog-hosted fallback), else the open dialog, else body as before, so the chooser shows as a nested popover above the panel; (2) endCelebrateQuiet closes and re-homes the chooser before wiping the panel's innerHTML, so a hosted chooser can never be destroyed by the wipe. Detail and mini-game share hosting unchanged. QA retests the env-reachable paths (incl. the 2.5s card fallback); device-final = Zoe's next clear.

## 2026-11-03 Q-311 — titles tab: pager + EXP pinned to the bottom, ladder page fits the panel height
Zoe's marked screenshot (23:25) showed the titles (称号) tab wasting its lower half: five ladder rows, then the pager and the EXP strip, then a large blank down to the command bar. The ladder container was already a filling flex column (s36-era rule), but the pager kept a fixed 7px top margin, so it hugged the rows, and LADDER_PAGE_SIZE was hard-coded to 5 (the short-viewport fit). Fix, two parts: (1) CSS — `#hsegStatus .ladder-pager { margin-top: auto; }` in the last style element, so the pager rides the ladder's bottom edge and the pager + EXP strip sit at the panel's very bottom as a unit; (2) JS — a guarded fit pass at the end of renderLadder (ladderFitPass) measures the panel's real leftover height (panel clientHeight minus the chrome above the ladder minus the EXP strip), divides by the live row pitch, and grows LADDER_PAGE_SIZE within [5, 14] with a single guarded re-render; a resize listener re-fits while the status tab is open. Stub-verified arithmetic on the extracted function: 800px panel → 7 rows/page, 667px → stays 5, 950px → 9, hidden panel → no-op, recursion guard holds. Gates: syntax ×6, document-order cascade audit (Q-311 declarations win). QA R159-file checks queued in the QA chat; one-screen device-final = Zoe.

## 2026-11-03 Q-312 — R159 S3: ladder page re-anchors when the fit changes the page size
QA's R159 retest passed Q-311's three observation points but code-confirmed a display defect in the new fit pass: when LADDER_PAGE_SIZE changes mid-session (their env grew 13→14 between renders), ladderPage is not re-anchored, so page boundaries shift under the user — with size 13 page 1 = Lv.1–13, then size 14 page 2 starts at index 14, and Lv.14 (index 13) appears on no page at all (49/50 rows shown). Fix: inside ladderFitPass, when the size actually changes, the page is re-anchored on the first currently visible row (oldStart = ladderPage × old size; new page = floor(oldStart / new size)); the −1 follow-current sentinel passes through and resolves in the re-render as before. Stub-verified against the extracted function: the exact R159 sequence keeps index 13 visible, shrink 14→7 keeps its boundary row visible, deep pages re-anchor, same-size renders are untouched, and a full 50-row paging walk at the new size has no missing or duplicated rows. Gates: syntax ×6. QA retest queued (their walk protocol); device exposure is minimal (a size change mid-session needs a resize/rotation or a font-load shift) and display-only either way.

## 2026-11-04 Q-313 — +50 timed events batch (c35–c84), catalog 359→409
Zoe's explicit order (2026-11-03 23:28, via ops): add 50 timed events tonight, widen the scope beyond anime/games toward seasonal/festival/real-life Tokyo, grow the database's coverage. Built fresh from newly verified official sources (NOT the withdrawn noon-batch line). 60 candidates researched across 4 clusters (seasonal/illumination, festivals/food/markets, exhibitions/stage, anime/games/pop), every name/venue/dates/price/hours confirmed on official organizer/venue pages. Photo gate applied strictly: candidates whose only visuals were key-art illustrations or logos were dropped (11: cheese festa, Katsushika food festa, Tokyo Revengers pop-up, Aikatsu live, FNAF pop-up, Guilty Crown×Kabaneri, Pokémon Legend Research, Cowboy Bebop, Hachioji Ginkgo, Haikyu NAMJATOWN, Green Grown Marché) and backfilled from verified reserves (Tokyo Tower Christmas Market; Ota Memorial Ōei; TOP Museum Okada Atsushi; Eisei Bunko Hakuin; Fuchu botanical art). Final 50 photos are all real photographs/artwork images: official-site photos first, Wikimedia Commons venue photos (CC/PD, credited in PHOTO-CREDITS.md) where official pages led with graphics. The batch also closes the long-standing photo-gate hold on Muttoni World VI (Hachioji) — official credited artwork photos sourced. Data: rows c35–c84 appended to EVENTS, VENUES +50, BLURB_ZH/LANG_ZH +50, and 118 new price/hours/venue/lang/area strings given JA+ZH entries (coverage zero-miss over all 409 events). Gates (the rebuilt-trust set): syntax ×6; extraction deep-equal (minus-the-50 == HEAD catalog exactly, order and content); JA/ZH coverage zero-miss; all pre-existing map entries preserved verbatim; photo files valid ≤250KB, no duplicates; rebuilt real-DOM boot harness fresh-guest PASS (zero + phone profiles) on the built file. Token tql-20261104-0013-q313-f9efa7d3, SHA-verified live. The batch is written up in player language in the 2026-11-04 morning announcement digest.

## 2026-11-05 Q-314 — gear refinement: every hat and outfit gets its own mark; hero shine
Zoe's order (dev chat, 2026-11-05 14:51 「继续优化角色像素和道具」, scope confirmed 15:16 as hats + outfits + hero body, sample approved 18:24 「按这个方向，全量做」). A render audit on the shipped draw code (all 342 items rendered singly, same ruler as the Q-286 neck audit; the scarf control group reproduced its known-good state) found the clone problem was literal: hats had 12 pixel-identical pairs and outfits 8 — the EP reward rows were data clones of gacha originals (same shape + colours, e.g. ep5-baseball≡ep6-kusama≡ep6-nintendo, spacesuit≡ep-gundam≡ep4-science), and 172 hat pairs differed by ≤10px. Fix follows the neck playbook: hats gain per-item v/g/a2 fields drawn by a new drawHatDetail inside drawHatShape (themed glyph emblems — paw for Hachikō, flame for GAS Museum, polka dots for Kusama, ball for the baseball cap — plus panel/stripe/dots/pin/patch variants per shape family); outfits gain od/g/a2 drawn by a new drawOutfitDetail after the fx pass in drawHeroEquipped (buttons, sash, collar, pocket, stripes, chest emblem, zip, vest, tie, hem, belt). 117 hats and 80 outfits carry new fields; gacha originals keep their look unless they sat in a clone pair. Hero base polish is 6 pixels exactly (hair shine at (8,1)/(8,2), a shaped cowlick tuft in the short style, collar light at (7,10)/(8,10)) — silhouette and gear anchors unmoved, side sprite untouched (it draws its own profile body). Gates: syntax ×6; data deep-compare vs HEAD (all 342 rows: pre-existing fields identical, only the new fields added, exactly per the assignment table); render audit on the built file — identical pairs 0 for hats, outfits and scarves, every assigned item changed, no unassigned item changed, ported detail code pixel-identical to the pre-audited harness design modulo the 6 base cells; fresh-guest boot harness PASS (zero + phone). A [News] entry ×3 languages ships in the same release. Device-final = Zoe (wardrobe / gacha / celebration portrait surfaces; QA retest queued).

## 2026-11-05 Q-315 — the two owed announcement digests posted (Nov 3 + Nov 4)
The board's daily digests owed for 2026-11-03 and 2026-11-04 are now posted (×3 languages, guts roundup format): the entry dated 2026-11-04 covers Nov 3 (creator plan A, titles-ladder fit + re-anchor, celebration-share fix, Hibiya Art Park quest), and the entry dated 2026-11-05 covers Nov 4 (the Q-313 +50 batch, catalog 409) and sits under the same-day Q-314 [News] per the board's same-date ordering (News first, digest after). Gates: counts 21→23 per language, every pre-existing entry preserved verbatim and in order, dates non-increasing; syntax ×6; boot harness PASS. QA board-checks the render. (Q-313's entry said the batch would be written up in the "2026-11-04 morning digest" — on the board that write-up is the Nov-4-coverage roundup, dated 2026-11-05 by the board's posting-date convention.)

## 2026-11-06 Q-316 — poster beta copy retired: official copy live, QR lands on the homepage
Zoe's standing order (2026-11-02 14:04): once the beta ends, the poster's beta text must change. Draft presented in the dev chat on the morning of 2026-11-06; Zoe confirmed 「可以，就这么改」 (11:36) and the change shipped the same hour. posterCta ×3: EN "Public beta now on!" → "Start your quest now!" / JA「公開βテスト開催中！」→「今すぐクエスト開始！」/ ZH「公测进行中！」→「现在就开始冒险！」; posterScan ×3: "Scan the code to join / スキャンして参加 / 扫码参加" → "Scan the code to play / スキャンしてプレイ / 扫码开始冒险". posterIntro (Q-260) untouched — it never carried beta wording. POSTER_URL → https://tokyoquestlog.com/ (was /beta/, the ended beta hub; /support/ rejected as an entry point — it is the support/tip page), and the URL printed on the poster band follows in all three poster builders. beta/index.html is now a zero-delay redirect to the homepage, so posters already shared keep landing somewhere live. Gates: anchor-asserted replacements (each old string count 1, printed URL count 3; the one remaining /beta/ string is a code comment), syntax ×6, fresh-guest boot harness PASS (zero + phone); pushed 5b257a0, served version token and SHA verified live, /beta/ redirect confirmed served. Tracked item goal_781cb490ca7c closed on ship.

## 2026-11-06 Q-317 — coin system phase 1: earn gateway, balance chip, coin shop (frames + exclusive gear)
Zoe's decisions: coins first, decoration later (2026-11-05 19:04); phase-1 scope locked as a small shop with portrait frames + shop-exclusive gear (2026-11-06 11:36); mock approved 「可以的」 (11:44). Economy: a single gateway earnCoins(n, src) with a 60/day cap (welcome +50 and level-up +20 ride the same gateway but level-ups are event-driven; mini-games carry a 6/day sub-cap) — GPS clear +10 / remote clear +3 (mirrors the EXP graduation), legend checkpoint +5 (+20 route completion = 25 total on the finishing tap), daily quest +3 (both completion paths), Guess +2, counted mini-game win +2 via mgAward, level-up +20 checked at the doClear / legend / daily sites that already bracket EXP grants with prevInfo. Coins are spend-only: never sold, never exchangeable for EXP or tickets, never buy titles. Save: new fields coins / coinDay {d,total,mg} / coinWelcome / framesOwned / frame added to the default literal AND the loader sanitizer (round-trip stub-verified); they ride the existing jsonb cloud path. UI: the hero status foot gains a coin chip beside the ticket count (tap opens the coin window); the window follows the mock — earn list, shop band, 4 portrait frames (gold 400 / sakura 250 / starry 250 / sea 150) and 3 shop-only gear pieces (star cap 350 / cat beret 300 / café apron DX 480). Buys are two-tap (arm → confirm label) and auto-equip; owned gear equips through the same state.gacha.equipped path as the wardrobe. SHOP_ITEMS is a separate array concatenated into ALL_ITEMS (gacha pool reads GACHA_ITEMS only — 3,000-roll stub test never drops a shop item; wardrobe/collection see them normally). Frames render as CSS (mat + border + corner marks, data-frame on a runtime wrapper around #heroBigCanvas; the pip previews in the shop reuse the same classes), so they apply at every size tier without touching the sprite pipeline. Feedback: celebration panel gains a coin line (quest clears + legend finishes), a small toast covers daily/guess/mini-game/legend-checkpoint gains, and the one-time welcome +50 toasts at first settled boot. Announcements in the same release: coins [News] ×3 at the board head, plus the owed digest dated 2026-11-06 covering Nov 5 (gear refinement, TIFF quest end, board catch-up). Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); 22-check stub suite on the real built functions (caps, mg sub-cap, welcome once-only, arm/buy/insufficient/equip flows for frames and gear, gacha exclusion, save payload, status chip, portrait wrapper, board heads); sanitizer round-trip with a seeded coin save; data deep-compare vs HEAD (GACHA_ITEMS / REWARD_ITEMS / EVENTS identical, ALL_ITEMS 342→345 unique); gear render audit — identical pairs still 0 across hats/outfits/scarves with the shop items included. Known v1 limits: the level-up bonus is granted at clear/legend/daily sites (a level gained purely from Guess EXP settles its coin on the next covered grant check); a pre-launch cloud save applied after the welcome grant can re-arm the welcome once (fields are absent from old saves; the grant re-fires at most once and then persists). Device-final = Zoe (window layout, frame look on her portrait, toast feel).

## 2026-11-06 Q-318 — freshness check gains foreground triggers (Zoe stuck on a stale build)
Device report (Zoe, 2026-11-06 ~11:58): after Q-317 shipped, her game showed no trace of the coin system — "ゲーム里一概看不到" — and even after fully closing and reopening the app it stayed on the old build ("怎么总是旧版本"). Server side was verified fresh (version.txt + SHA from the CDN edge), so the device was holding a stale document. Root mechanism: Q-145's freshness check ran at boot only, but a home-screen (standalone) app can be RESUMED from an iOS snapshot without re-parsing the document — the boot check then never executes, and since the snapshot can survive an app-switcher kill, the stale build feels immortal. Fix (script block 2 only): the identical Q-145 check — same cache-busted version.txt fetch, same dual loop guards (sessionStorage marker + upd= URL marker) — is factored into one function that now also runs on visibilitychange (to visible) and pageshow, throttled to one fetch per 20 seconds. It reloads at most once per newer build and only when a newer build actually exists; failures stay silent. This deliberately extends the proven Q-145 pattern instead of reviving any watchdog shape (Q-292–Q-296 stay dead). Gates: syntax ×6; 9-scenario stub suite on the real block (match/no-op, newer→one reload, guard-blocks, upd-URL-blocks, fetch-failure silent, throttle+guard on foreground return, hidden→no fetch, listeners registered); fresh-guest boot harness PASS (zero + phone); pushed a98ef96, served token + SHA verified live. Device-final = Zoe: this once she still needs a fresh entry (direct link) because her current build predates the trigger; from Q-318 onward, updates should self-heal when she returns to the app.

## 2026-11-06 Q-319 — ladder fit convergence (QA R162 S2: Q-311 device FAIL)
Zoe's device (Instagram in-app browser, Lv.4 save) still showed 5 ladder rows over a large blank: the Q-311 fit measured ONCE at first render, when the device geometry had not settled (in-app chrome, font swap, panel mid-open — the measured "above"/viewport was ~2 rows short), and nothing ever re-measured; the environment could not reproduce it because its geometry differs by class. Fix (block 3, ladder code only): (1) pitch is now the true row-top-to-row-top distance when 2+ rows are rendered; (2) the unexplained constants shrink (−26 → −12, −7 → −3); (3) every renderLadder schedules a deferred refit — requestAnimationFrame plus a 450ms timer — that re-measures the settled geometry and re-renders ONLY when the size actually changes (converges: settled geometry recomputes the same size; the R159 re-anchor keeps rows from duplicating/vanishing across the change); (4) a visibilitychange refit joins the existing resize listener. Gates: syntax ×6; stub suite driving the REAL renderLadder/ladderFitPass through fake geometry — unsettled geometry reproduces the R162 signature (stuck at 5), rAF refit converges to the settled 7, the timer refit is then a no-op (no oscillation, ≤3 renders); fresh-guest boot harness PASS (zero + phone); pushed 2d3d509, served token + SHA verified live. QA to re-check the R160 invariant (every row exactly once) in env; device-final = Zoe's next look at the titles tab.

## 2026-11-06 Q-320 — stats strip, records/logbook merge, shop page, background furniture (Zoe's orders 12:03–12:12)
Zoe's sequence: the hero page must show EXP / gacha tickets / item count / coins at a glance (she circled the name banner); "另外做商城页面"; the RECORDS and LOGBOOK tiles "几乎功能一样，想办法整合" with the freed slot going to the shop; decorations are NOT a separate house — "装饰这个主人公背景这里". Shipped in one release: (1) Stats strip — a slim pill bar under the name banner (EXP + progress + value, tickets, item count, coin button), filled by renderStatus alongside the status foot; tapping the coin opens the shop. (2) Merge — the collection panel （手帳/LOGBOOK) joins the records tab family as a 4th shared tab (private anchor bar added, openHeroWin family/dock-toggle/recNames wired; renderCollection unchanged), so ONE dock tile （記録） now reaches 称号/徽章/冒険ログ/手帳. (3) Shop page — the freed 4th dock slot is ショップ (new ICONS.shop + segShop ×3); the Q-317 coin overlay is RETIRED and its content (same element ids, renderCoinWin/wireCoinWin unchanged in shape) now lives in the #hsegShop hero panel, opened via openHeroWin("shop") from the dock, the status-foot coin chip, or the strip coin button. (4) Furniture — 6 items (plant 150 / chair 120 / lamp 180 / table 260 / shelf 320 / cat tree 450) sold in the shop (two-tap buy, state.furnitureOwned in the save sanitizer + cloud jsonb), rendered by renderFurniture() as static pixel-SVG decorations slotted along both sides of the hero scene background (deliberately NOT in the runner stream — furniture stays put; zero runner surgery). Board: [News] ×3 in the same release (26 entries/language). Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); EVENTS/ALL_ITEMS deep-equal to HEAD; coin suite 22/22 (incl. shop-panel visibility through the real open path); furniture stub 6/6 (arm/buy/insufficient/scene span/slots). Known harness note: sanitize_test.js fails identically on the pre-Q-320 HEAD file (harness drift, pre-existing — not a regression; the real loader carries furnitureOwned beside framesOwned). Device-final = Zoe: strip position under the banner, shop panel feel, furniture size/placement in the scene, the 4-tab records bar.

## 2026-11-06 Q-321 — list rows show the active sort key (QA R164, S3)
Zoe (via QA, 12:00): sorted by start/end time, the rows showed no dates at all — unlike near mode, whose rows all carry their distance — so the order could not be verified. searchRowHTML only appended the key in near mode. Fix: a keyTxt suffix in the same position with the same " · " separator — start mode: compact date (fmtShortDate, new: 月/日 without year, "Nov 13" in EN) + startsIn(days) from the detail view's vocabulary, or nowOn when already running; end mode: compact end date + endsIn(days), date only when the end has already passed (no negative counts). Evergreen and recurring rows get no suffix (no fake dates); LEGEND cards use a separate builder and are untouched. Gates: syntax ×6; stub suite on the real searchRowHTML (future/running/past-end in both modes, evergreen + recurring exclusion, near-mode unchanged) 8/8; fresh-guest boot harness PASS (zero + phone); pushed 62542a1, served token + SHA verified live. Note: the pending list-redesign mock (slim rows with area · period) remains Zoe's call; this fix stands on its own in the current rows and the redesign, if approved, keeps the same behavior. Device-final = Zoe.

## 2026-11-06 Q-322 — list colour language + one-tap kind toggle (QA R165, S3)
Zoe (via QA, 12:01): "这里也和地图一样，红色蓝色区分常驻和限时，一键直接切换" — the list should match the map. (1) Colour: rows now carry the Q-264 pin assignment as their frame colour — `.ms-row.is-ever { border-color: #2d77cd }` / `.is-timed { #e5484d }`, with the same is-ever/is-timed classes and the same `e.evergreen` condition the pins use (recurring counts as timed, as on the map). EPIC and selected rows re-assert their stronger frames after the new rules in the same appended block, so neither is overridden. (2) Toggle: a 全部/常駐/限時 segmented control (labels reuse all/legendEver/legendTimed) sits beside the sort segments in the list subbar (which now wraps); one tap sets filterKind and re-renders via renderSearch — currentBoardList applies it ahead of the existing filters; no trip through the filter window. Labels/pressed state sync in the same pass that syncs the sort segments. Gates: syntax ×6; stub suite on the real searchRowHTML + currentBoardList (row classes for evergreen/timed/recurring; filter results 3/1/2 across all/ever/timed) 6/6; fresh-guest boot harness PASS (zero + phone — the sync loop runs on the boot path); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-323 — ladder pager regression fixed: page-stable pitch (QA R167, S2)
QA found the Q-319 build's titles pager dead in their environment (fit converged, NEXT never advanced). Root cause, reproduced A/B on the real renderLadder/ladderFitPass with faithful geometry: the fit pitch was read from the first two rows only. The page holding the player's current title has a taller first row (flavor line), so page 1 measures a large pitch (fit 6) while uniform pages measure the true pitch (fit 7). A NEXT click renders page 2, the synchronous fit pass recomputes fit 7, and the Q-312 re-anchor maps the click straight back (floor(1×6/7) = 0) — the pager can never leave page 1, in ANY environment where the current row is taller, including the device. Fix: pitch = the MINIMUM adjacent row-top difference on the page — the pair starting at the tall row is the only polluted one and the minimum excludes it; pages without the current row are uniform, so every page now measures the same pitch. A/B stub: old code open 6/0 → NEXT → 7/0 (click eaten, R167 signature); new code open 7/0 → NEXT 7/1 → NEXT 7/2 → PREV 7/1, size never flips. (Process note: the first repro run used a stub whose row closures shared one `top` variable, which reproduced the same signature through the offsetHeight fallback path instead; the harness was fixed and the A/B re-run under per-row geometry before shipping.) Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe (the R162 fill verdict and normal paging on her phone).

## 2026-11-06 Q-324 — LOGBOOK tab gate fixed (QA R168, S2)
QA's Q-320 retest passed everything except the merged tab itself: the 手帳 tab never switched. Root cause (QA pinpointed it in the shipped source; dev confirmed): setRecTab's whitelist still named only the old trio, so a collection click was corrected to "status" before reaching openHeroWin — the one family enumeration Q-320's recon missed (its sweep had covered openHeroWin, the dock, and the shared tab bar, but not the tab click's entry gate). Fix: "collection" joins the whitelist. A full sweep of every records-family enumeration in the file confirms all others (openHeroWin recTab assignment, panel list, shared-bar isRec, dock aria/isOpen) already include collection. Gates: syntax ×6; stub on the real setRecTab (collection passes + recTab follows; badges unaffected; unknown keys still fall back to status) 3/3; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. The collection surface's own verification （清单・収蔵統計） and the dock-toggle check now unblock for QA; device-final = Zoe.

## 2026-11-06 Q-325 — list summary follows the kind toggle (QA R170 memo)
QA's Q-322 retest passed the toggle and colours but flagged a confirmation memo: no count display could be found and the list banner kept reading "Showing every quest" in all three kind states. Located: the count element is #msCount in the search window and it already follows the filtered list (searchCount(list.length) in renderSearch). The actual gap was the list-view summary line — renderSearch builds its parts from the older filters only, so with just the kind toggle active, parts stayed empty and the line fell back to searchAll ("Showing every quest") while 121 of 414 rows were shown. Dev's Q-322 note to QA had overstated this as already linked; corrected here: the kind label (legendEver/legendTimed) now joins the parts when filterKind is active, so the summary reads e.g. "121 quests · 限时" like every other filter state. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone — renderSearch runs on the boot path); pushed (see below), served token + SHA verified live.

## 2026-11-06 Q-326 — shop gear previews readable + logbook pager to the bottom (QA R174/R176, S3)
R174 (Zoe device): the shop's three limited-gear previews rendered as a ~16px sprite in the card's top-left. Root cause: drawItemPreview paints in a raw 16×16 grid — it was built for canvases with 16px attributes that CSS upscales (the wardrobe convention) — but Q-317's shop gear template used a 48×48 attribute canvas, so the drawing occupied only the corner. Frames were unaffected (drawHeroBust scales via drawImage to the canvas size). Fix: gear canvas attribute 48→16 and a CSS upscale (.coin-gear-cv canvas { width/height 56px, image-rendering: pixelated }) inside its 62px box, matching the furniture icons' presence. R176 (Zoe device): the collection panel's pager sat at the top while its records-family siblings paginate at the bottom — renderCollection now emits .book-nav after the page content, margin flipped for the bottom position; indicator + dots + arrows move together. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); file asserts (gear canvas converted, frames canvas untouched, nav after page in the emitted HTML); pushed (see below), served token + SHA verified live. Device-final = Zoe for both.

## 2026-11-06 Q-327 — header cluster nudge + gold coin icon (QA R177/R178, S3)
R177 (Zoe device): the name banner + stats strip cluster sat too high (banner crowding the panel's top edge, strip hugging the banner). Both nudged down 6px via last-style overrides (banner top 10→16, strip 56→62; their relative gap unchanged). R178 (Zoe device): the coin buttons on the strip and the records footer chip used the 🪙 emoji, which her browser renders as a silver/grey disc — reading as a different currency against the game's gold language. The emoji is gone from the file (all 4 occurrences); both buttons now carry the shop's own gold disc (.coin-ico — lemon fill, gold rim) set via innerHTML in renderStatus, placeholders updated to match. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); coin suite still green (chip balance check included); commit d8ece68 pushed, served token + SHA verified live (tql-20261106-1754-q327-f3fd8b8e). Device-final = Zoe.

## 2026-11-06 Q-328 — ladder made robust by construction (QA R175, S2)
Zoe's device showed the titles ladder broken two different ways on consecutive pages (page 1: uniform rows at ~55% width, pager and footer overlapping rows, fit 9; page 2: a narrowing staircase) while the lab stayed clean. Two structural causes: (1) Row width was content-driven — .ladder-track is a grid with NO column template, so its implicit column sizes to the widest row's max-content and short-title pages render a narrow track. The track now carries an explicit minmax(0, 1fr) column at full width. (2) ladderFitPass measured `above` and pitch with getBoundingClientRect, which reports TRANSFORMED geometry — during the panel's opening transition the measurements are scaled/shifted, the fit locks in wrong (9 vs the lab's 14), and the too-tall track overflows the flex box onto the pager and footer. The fit pass now uses layout metrics only (el.offsetTop for above — its offsetParent is the fixed panel; row offsetTop differences for the Q-323 minimum pitch; offsetHeight/clientHeight as before) and NO rect reads remain in the function (stub-proven: rect accessors rigged to throw, fit still converges). The deferred refit gains a 1000ms settle pass beside the 450ms one. Gates: syntax ×6; stub suite 4/4 (rect-immunity, fit 7 via layout metrics, paging, both timers armed); fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe — this is the third ladder build aimed at her geometry (Q-319 fit, Q-323 pitch); the lab can verify invariants, only her phone can verify the look.

## 2026-11-06 Q-329 — list status bar retired (QA R179, Zoe's direct order)
Zoe: 「这个不要了吧，主人公页已经有了」 — the shell status bar (avatar, name + Lv pill, clears/EXP stats, ticket pill, gear/dress shortcuts) is removed entirely; the list now starts at its section bar. It was the bar's last surface (hero and daily retired theirs; the map is full-bleed) and everything it showed lives on the hero page since Q-320's strip. Completeness sweep before editing: the whole <section id="statusbar"> markup is deleted; unguarded boot-path writers deleted with their elements (renderStatus stat/progress/advLv/advSub/exp/miniStats writes, the text refreshes' advSub/tagline/lbl* writes, the avatarBtn aria-label line, renderMinBtns' statusToggle half); unguarded wiring deleted (statusToggle, avatarBtn, hudTicket, dressBtn listeners); setStatusMin keeps its state minus the statusbar DOM line. #styleBtn SURVIVES as a hidden shell button — it is the settings hub: seven proxy sites click it (bottom-bar gear, START menu, title settings, backdrop, sheet close, tutorial replay, Escape handler) and its handler toggles the settings sheet; deleting it would have broken settings everywhere. Guarded remnants that no-op safely stay (drawAvatar, the hudTicket label write, the second exp updater). Dead .statusbar CSS remains, inert. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone — renderStatus/refresh/setStatusMin all execute at boot); file audit (no getElementById path to any removed element remains unguarded; 7 styleBtn proxies intact); pushed (see below), served token + SHA verified live. Device-final = Zoe (list top, settings sheet from every entry).

## 2026-11-06 Q-330 — list sort logic follows the kind filter (QA R180, Zoe's direct order)
Zoe: 「重新构筑逻辑，如果是常驻就不应该有开始时间结束时间了吧？离我最近应该一直有 / UI混乱没有逻辑」. The sort row now obeys the kind filter: NEAREST is always offered; BY START / BY END are hidden in the EVERGREEN kind view (evergreens have no dates), and if a date sort is active when the kind becomes evergreen, renderSearch falls back to NEAREST before computing the list (single choke point at its head). In ALL/TIMED the date sorts remain; dateless items already sink to the end of date sorts via the "9999-12-31" comparator tail, which is her mixed-set principle. The summary line also drops its "tap Search to filter" guidance (searchAll): it always renders the Q-325 state form — count plus active filter parts, count-only when unfiltered. Gates: syntax ×6; stub suite on the real renderSearch/currentBoardList 8/8 (fallback + button hiding + summary forms in ever/all/timed, end-order with evergreens last); fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-331 — title-screen leftovers retired (QA R173, Zoe's rulings)
Three rulings from Zoe's circled title screenshot. (1) 「Beta可以不要了」: BETA branding is off — the title board bar and the list board button now read ★ NEWS & NOTES / ★ お知らせ / ★ 公告 (EXT_STR betaBtn), the board header reads NEWS BOARD / お知らせボード / 公告板 (betaTitle), and the board's beta-period row is deleted. The board itself (news, bug door, privacy note) stays a living feature. (2) 「问卷也不要了」: the questionnaire apparatus is removed — the title's survey anchor, plus inside the board the survey button and the feedback-lottery explainer that existed only to drive it (the round closed 2026-11-05 and is settled); renderBeta's unguarded writes to those elements were deleted with them. The title button's guarded label refreshes remain and no-op. (3) 「中文那个放在继续冒险旁边吧 / 和应援并排」: the language pill moves into the account row directly after the ♥ support button, in the vacated survey slot, with a row-margin override; the pill's FORM is unchanged (the v5 segment question remains open, deliberately not bundled). Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); file audits (removed ids and their renderBeta references at zero, pill inside the row after support, guarded survey refs = 2); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-332 — the freshness self-heal learns to converge
Zoe: 「主页beta还在，又是旧缓存？？怎么解决这问题」. Root cause of the recurring stale builds: tonight five builds shipped in twenty minutes and GitHub Pages served them OUT OF ORDER (the q326 build briefly re-appeared after q327 had verified live), and the Q-145/Q-318 check recorded its target marker BEFORE reloading — when a reload landed on a mismatched artifact (version.txt from one build, the document from another, since the two are not served atomically), the fresh document saw the marker as already tried and never retried. The check now keeps an attempt ledger keyed by the marker ({m, n, t} in sessionStorage, the attempt number also riding in the upd= URL so storage-less in-app browsers still bound themselves): on mismatch it reloads to a DISTINCT cache-busted URL, up to 3 attempts per marker per 10 minutes, and convergence is judged by the loaded document's own BUILD_ID. It never chases an older build (token prefixes compare by date/time/round), so a flapping version.txt cannot downgrade anyone. Boot + foreground triggers unchanged; all failures silent. Verified by a six-scenario stub against the real block (converge / retry .1→.2 / exhaust / no-downgrade / window expiry / ledger clear). Rider under the same 「Beta可以不要了」 ruling: the settings feedback row's label drops its beta wording in all three languages (FEEDBACK (BETA TEST) → FEEDBACK etc.). Pushed (see below), served token + SHA verified live. Note: her title-screen BETA sighting this evening was the pre-Q-331 snapshot; her own 18:15 list screenshot already shows the ★ 公告 bar of the new build.

## 2026-11-06 Q-333 — ladder pager made structural (R175 follow-on, Zoe device)
Q-328 fixed the ladder's widths on Zoe's phone (her 18:12 screenshot: every row full width, no overlaps, gold coin) — but the pager had vanished on the current-title page. It was built inside #ladder's innerHTML, so whenever the rendered track ran taller than the ladder box (the flavor page is the tallest), the pager was pushed out of the overflow-hidden panel. The pager is now STATIC markup in the panel's flex column (ladder / pager / EXP foot), where content height cannot displace it; renderLadder only refreshes its label and button states; the click delegation moved from #ladder to the panel. Belt-and-braces: ladderFitPass verifies the rendered track against the real box height (layout metrics) and shrinks the page until it fits, and the ladder box clips any residual overflow itself. Gates: syntax ×6; stub suite 5/5 on the real functions (formula-9 vs box-5 convergence, static pager label/states/aria); fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-334 — shop page rebuilt to scheme B (Zoe's pick, QA R182)
Zoe picked scheme B （页签式） of the three presented mocks. The flat scrolling stack — header, five-row earn list, a DUPLICATE navy title band, three titled sections — becomes: ONE header (coin disc + title + balance attached), a chunky three-tab row （头像框 / 限定装扮 / 街景装饰）, exactly one category page visible at a time (frames 4 / gear 3 / decor 6, the decor note riding its page), and the earn list as a fold at the bottom, closed by default. The third category is renamed from 家具 in all three languages (Street Decor / 街の飾り / 街景装饰） — Zoe: the hero scene is an open street, not a room; its note is reworded to match. Buy/equip/arm logic untouched; tab + fold state are in-memory (frames tab and folded are the defaults on open). Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); coin suite all green; file audit (old section-title/band ids at zero, 3 tabs + 3 pages); pushed (see below), served token + SHA verified live. Device-final = Zoe （一屏 fit of the decor page is hers to judge).

## 2026-11-06 Q-335 — list header, one-row edition (Zoe approved mock v3)
The header stack she circled （丑） and then refined twice: the full-width navy board slab shrinks to a small chip inside the section bar beside 検索 (same label and action; hidden in the log segment like the rest of the index furniture); the kind choices become ONE joined segmented control; the three sort pills become ONE sort button showing the current sort, its CSS triangle given real clearance from the label (v3's fix — the v2 mock's triangle crowded the text), tapping cycles 最近 → 开始 → 结束 with the same per-mode steps as the old pills (near re-requests position; in the evergreen view the button hides, 最近 being the only sort there per Q-330); the count is plain small text at the row's right end; the transient sort-message line moves out of the row to its own line under the header. Sort logic, kind filtering and summary text are unchanged (Q-330 semantics preserved). Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone — renderSearch's new sync block runs at boot); file audit (no data-sortmode JS readers remain, single sortBtn/listBetaBtn/searchSummary); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-336 — board archive tidy (QA R187 observation)
Q-331's removal of the lottery explainer left the 2026-10-29 opening entries (all languages) pointing at it ("see the lottery note below") and still inviting survey answers and draw entries for a closed round; the 2026-10-30 digests still invited readers to join the beta via the poster QR. The entries remain as the dated record they are — only the live invitations and dangling references are trimmed, ×3 languages each. (The settings feedback label QA flagged in the same note was already cleaned by Q-332.) Gates: syntax ×6; ANNOUNCE extraction sanity (26/26/26 entries, edited bodies verified); fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live.

## 2026-11-06 Q-337 — board chip leaves the list header (Zoe's direct order)
Circling the new chip on her device, Zoe: 「公告不要了」. The #listBetaBtn chip is removed from the list bar (markup only — its label write and openBeta wiring were already guarded and go inert; the board itself stays, reachable from the title screen's ★ bar per her Q-331 ruling). The search button takes back its auto margin. Rider from the same screenshot: the count was ellipsized ("410件の…") in the one-row header, so the kind segments, sort button and summary get small trims (padding/font) for the unfiltered count to read in full. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-338 — hero stats strip becomes a banner-tap popup (Zoe's direct order)
Circling the strip, Zoe: 「这个改成点最上面的主人公banner 再弹出来吧」. The Q-320 stats strip (EXP bar, tickets, items, coin button) no longer sits permanently under the name banner: it starts hidden (opacity/transform, pointer-events off) and pops in when the name banner (#heroNameLine) is tapped, auto-hides after ~4.2s, and a second tap dismisses it; the banner gains a press effect and pointer cursor. Values keep flowing through renderStatus unchanged; the coin button inside still opens the shop while popped. Gates: syntax ×6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe (pop feel + whether the banner reads as tappable).

## 2026-11-06 Q-339 — ladder fit oscillation freeze fixed (QA R188, S1 candidate)
Root cause, reproduced by driving the REAL renderLadder + ladderFitPass + scheduleLadderRefit in a layout-faithful stub (~/workspace/ladder_chain_test.js): the fit pass had two authorities for the page size. The formula budgets pitch x N and never sees the current title row's flavor surplus, so on the current-title page the track can overflow the box; Q-333's box-check shrinks the page — then the next deferred refit recomputes the formula, grows it back, and the box-check shrinks it again. In box geometries tighter than the formula's estimate the chain never settles (stub: 8<->7 forever, 600-900 renders in 300 refit pumps, queue never drains — QA's environment froze exactly like this, page_busy 20+ min; looser geometry settled only by drifting off the current page). Q-333's own stub missed it because it ran a single pass, never the refit chain. Fix: the box-check records its proven size as a cap keyed to the panel height and the formula defers to it (a height change re-proves); the previously unguarded rAF refit gains a pending flag so refits coalesce. Gates: the chain test now SETTLES in 3-4 renders at all four box heights tested (380/360/340/320, two of which oscillated pre-fix); syntax x6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. QA retest requested in their environment; device-final = Zoe.

## 2026-11-06 Q-340 — detail period row font unification (QA R192)
Zoe circled the period row on her device: inside the info card, the date range and its red relative label rendered at 11px while hours/venue/price values read at 0.9375rem bold. Cause: a legacy .kv .detail-period rule at 11px carries higher specificity than the later .detail-period-row rules, so it silently won the cascade. Fix: final rules in the last style element at matching specificity set the row and its label to 0.9375rem/700 (the dd value size), calendar icon nudged to 16px; position and layout unchanged. Gates: document-order cascade audit (the last font-size declared for both the row and .dp-when is now 0.9375rem); syntax x6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-341 — detail info card, scheme C (Zoe's pick)
Zoe asked for the info card rearranged （「更直观一屏就看完那种」); of the three mocks she picked C, the icon-led rows. Period / hours / venue / price are now four compact icon-led rows (calendar, clock, pin, coin) with dashed separators and no text labels; values keep the unified 0.9375rem (Q-340) and price tiers keep stacking as lines. Every writer and visibility toggle is preserved by construction: all element ids survive, the venue/price wrappers keep .kv-col (the fill code toggles via closest(".kv-col")), the hours row keeps .kv-time-head (toggled via querySelector), the dt label elements stay in the tree hidden so their STR writers keep working, and the whole-card hide rule is untouched. Gates: post-build id census (each exactly once); the dl subtree parses clean; syntax x6; fresh-guest boot harness PASS (zero + phone); pushed (see below), served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-342 — period size: specificity, not order (R192 hold closed on dev side)
QA's walk showed Q-340's fix never rendered: style-55 rules scoped `dialog#detail …` (ID + classes) beat the class-only `.kv .detail-period-row` (0,2,0) at any document position — Q-340's audit compared same-selector order only. Q-342 restates 0.9375rem/700 under the full original selectors in the last style element, plus a direct rule on `.dp-range`. Lesson recorded in AGENTS.md: cascade audits must be specificity-aware. Gates: syntax x6; boot harness PASS; served token + SHA verified. Device/QA-walk final.

## 2026-11-06 Q-343 — hero page: GBA finish + cream sky + scene polish
Zoe approved the GBA-button mock （「就按这个GBA风做」), then added: no light-blue background （「有点土」), polish the hero animation, and the scene still felt too plain to decorate. (1) The four dock tiles get the new 16×16 pixel icons from the approved mock grids (DOCK_PIX, generated rects, injected through the existing dockIcons wiring) at 30px; dock buttons, equipment slots and the account row take the GBA finish — ink outline, 6px corners, inner hairline frame via stacked inset shadows, bottom shade band, hard ledge; the support button keeps its red face with the same ledge. (2) The stage sky stops borrowing --map-water-2: new --sky-1/--sky-2 vars — the default theme gets two flat Pearl-cream bands by day and deep navy by night (media query), emerald/midnight keep their water tone through the fallback; map water is untouched. (3) Scene/animation: three pixel clouds drift slowly in a new .scene-clouds layer (parallax vs the runner; off under prefers-reduced-motion), a pixel-fleck tile textures the grass bands, the walk shadow squashes on the passing pose in walkDraw, and all six furniture SVGs gain a ground shadow so pieces sit IN the scene. (4) Rider for R193: `dialog#detail .kv-icon .kv-row` pinned to nowrap flex so a wrapped hours value cannot strand the clock icon. Gates: build post-conditions (DOCK_PIX wired, clouds in, 6 furniture shadows, squash line); syntax x6; boot harness PASS (zero + phone); coin suite PASS; served token + SHA verified live (below). Device-final = Zoe — above all the cream sky and whether the scene now invites decorating.

## 2026-11-06 Q-344 — map location banner to the top (R194)
Zoe circled the bottom location banner on her device, drew a line to the top of the map and wrote 「这个房上面」 (read as 放 — put it on top; QA's interpretation, correctable by her). The .loc-chip now anchors to the map box's top edge (safe-area aware), and its left:66px inset — a leftover clearance for the retired floating MENU button — resets to the standard 10px. The winning bottom offsets (style 25) are overridden with equal-or-higher specificity selectors in the last style element, for both the normal and legacy in-big forms. Content, close button and z-order unchanged. Gates: syntax x6; boot harness PASS (zero); served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-345 — ladder blank pool removed (R197-2)
Zoe's device: the titles ladder settles at 6 rows/page with a large blank pooled between the last row and the bottom-pinned pager. The panel was in fact full — the track's rows sat at natural height inside the flex-grown #ladder box and the slack pooled under the track. The track now fills the box (flex:1) and its grid rows share the height (grid-auto-rows: 1fr), so every page fills evenly and rows gain tap height. Because the fit pass reads pitch from row geometry, ladderFitPass now measures with a .ladder-measuring class on the box that collapses rows to natural height for the pass (added after the early-out guard, removed on both exits, synchronous so nothing paints mid-pass) — stretched pitch can never feed back into the fit (the Q-339 failure shape). Gates: chain harness SETTLES in 3–4 renders at BOX_H 380/360/340/320 with final sizes 7/7/6/6, identical to the Q-339 baseline; syntax x6; boot harness PASS; served token + SHA verified live. Device-final = Zoe (esp. whether the pool is gone at her 6-row geometry).

## 2026-11-06 Q-347 — list: one logic (R195 + Zoe's tab ruling)
Zoe approved the header v4 mock, then rejected the premise it kept: the 一覧/手帳 segment tabs are logic neither she nor players can read （「这个逻辑咱俩看不懂」「玩家」). The list is now ONE list. Removed: the #listSegs tabs, the whole #lisegLog segment (accepted/cleared sub-tabs), renderLog/logRow/setListSeg/setLogSeg, both tab listeners, the refreshTexts label loops, the four static-text writers for the retired panel, and all five renderLog() call sites — completeness-asserted in the build (zero live references; only inert CSS for the retired panel remains). Accepted quests stay reachable via the search sheet's accepted filter. New: a 状態 cycle button in the subbar （全部 → 行った → まだ) driving filterState in currentBoardList (cleared = isCleared); LEGEND cards auto-hide while it is active since they join only the unfiltered board. The count (#searchSummary) moved into the list bar, where it reads in full at phone width (R195-2). Build history: the first attempt's regex listener cut swallowed neighbouring listeners (btnQuest et al.) and was reverted unshipped; the shipped cut uses the string-aware brace scanner for every removal, plus a boot-harness catch of the retired panel's static-text writers. Gates: syntax x6; boot harness PASS (zero + phone); neighbours verified intact; served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-348 — all pagers, GBA finish (R197-1)
Zoe: 「所有游戏里的翻页按钮能不能重新设计 真的太丑了」 — approved from the mock the same evening. CSS-only: the three pager families (ladder + adventure-log .ladder-pg-btn/.ladder-pg-num, photo-preview + badges .pp-pg-btn/.pp-pg-pos, collection book .book-btn/.book-pg) take the hero page's GBA finish — ink outline, 6px corners, inner hairline via stacked inset shadows, bottom shade band, hard ledge — and the page numbers sit in a matching framed window. Sizes, press travel and the disabled dimming are unchanged. Gates: syntax x6; boot harness PASS (zero); served token + SHA verified live. Device-final = Zoe.

## 2026-11-06 Q-349 — badges tab blank (R198 S3)
QA's R198 walk found the same "weird blank" family on the badges tab: the grid sat at natural height and the panel's leftover pooled as cream dead space under the pager. The badge grid now flexes to fill the panel with rows sharing the height (the Q-345 pattern), badge content centred vertically; scoped to #hsegBadges. Gates: syntax x6; boot harness PASS (zero); served token + SHA verified live. Device-final = Zoe. (R198 also LAB-passed Q-345/Q-347/Q-348; its note that the QA-env ladder settled at 5/page is env geometry — the chain harness at phone boxes settles 6–7 as before, and Zoe's device remains the court on page size.)

## 2026-11-07 Q-346 — board digest for Nov 6
The Nov 6 roundup (hero GBA finish + cream sky, scene polish, compact detail card, tabbed coin shop, slimmer list header, map banner on top, ladder fill, Records freeze fix) posted to the announcement board as the 2026-11-07 guts entry, EN/JA/ZH, board now 27 entries/language. Gates: syntax x6; ANNOUNCE extraction (27/27/27, heads 2026-11-07 guts); boot harness PASS (zero); served token + SHA verified live.

## 2026-11-07 Q-350 — map capsules no longer yield to the locate banner (Zoe device report)
Zoe: 「小游戏和当月游戏为什么每次都是通知出来后点掉才会出现」. Root cause: entering the game auto-runs locate() once (entrySequence, +850ms); the locate banner stays up (sticky while searching, then 9–16s), and mgYieldSync hid BOTH map capsules for the whole time — a Q-209 rule from when the banner sat at the bottom in the capsules' own band. Q-344 moved the banner to the top of the map, so the contention no longer exists, but the yield was never revisited. mgYieldSync now yields only to the pin preview, which still shares the capsules' bottom band (Q-206). The banner itself is unchanged (it is the locate feature's only feedback channel). Gates: targeted node test of the real extracted mgYieldSync (chip up + no preview → capsules visible; preview up → hidden; 4/4 PASS); syntax x6; boot harness PASS (zero + phone); served token + SHA verified live. Device-final = Zoe.

## Q-351 — Records panel fits the phone's real visible height (R203)

Zoe's device (in-app browser, screenshots 2026-11-07 09:40): on the
records window the titles ladder's last row was sliced by the pager,
the badges pager painted over the third-row cards, and the adventure
log's fourth card was clipped — one disease on three tabs: content
sized against a bigger box than the phone actually renders.

Structural fix (her word: rework the layout, not the numbers):
- Ladder fit now reads the ladder box's own rendered height. The old
  panel-minus-parts estimate over-read by the panel's top padding /
  safe-area (clientHeight includes it, offsetTop is measured from the
  padding edge) and bought one row too many.
- Ladder convergence reads the last row's real bottom vs the box
  (track.offsetHeight went blind once rows stretched).
- Badges (was fixed 9/page) and adventure log (was fixed 4/page) get
  ladder-style fits against their region boxes: measured pitch,
  re-anchor on change, proven-size cap per box height, shrink-until-
  fits convergence. Badges page 6/9/12 by height; log page 3–5.
- CSS hard bounds: the ladder track can shrink (min-height 0), the
  badge grid and cards clip inside themselves — content can never
  paint over a pager again, whatever the fit decides.
- One refit scheduler for all records tabs, hooked to
  visualViewport resize + window resize + panel open: host-browser
  chrome settling after opening no longer leaves a stale page size.

Gates: syntax ×6; boot zero + phone PASS; new targeted fit harness
(test_q351_fits.js) 6/6 on the real badge/adv fit code; ladder chain
harness SETTLED at box heights 300/380/460/560/700 (sizes 5/6/8/10/13).
Device-final = Zoe (R203 retest).

## Q-352 — Gacha page rebuild: the machine IS the page

Zoe's order (2026-11-07): redo the gacha interface, nicer animation,
the whole page may be used. Mock approved by Zoe the same morning
(full-page machine + 4-beat storyboard), then built:

- The panel is now a full-height stage (cream sky bands + grass,
  hero-page language): a big glass dome machine filled with 14
  capsules stands centre stage, the hero stands at stage left, and
  the PULL bar runs full width under the stage with a 🎟×1 cost chip.
- The machine body carries the preview plate (hero canvas + next
  ticket line) and a crank; the prize capsule lands in the tray at
  the burst, coloured by rarity, and stays there until the next pull.
- Views are shop-style tabs （ガチャ / コレクション) replacing the
  owned-only toggle button; the collection view hides stage + PULL.
- Ceremony (approved storyboard): CHARGE 1.18s — machine shake
  swells, dome capsules bounce, crank spins a full turn, hero hops,
  preview slot-cycles → one-frame white flash → BURST — capsule
  cracks with rays + pixel confetti/stars, tray capsule lands →
  result lands as a big centred overlay (104px item portrait);
  tap dismisses it (the wear button still equips). Reduced-motion
  path unchanged.
- Roll/dupe/wear/owned logic untouched; dead .gm-side/.gacha-viewbar
  CSS remains but matches nothing.

Gates: syntax ×6; boot zero + phone PASS; cascade by specificity
(new block at (2,x,0) over the (1,1,0) gacha generations); coin_test
unchanged vs Q-351 (its "announce heads" failure pre-exists Q-352 —
harness drift after the Q-346 digest, not a regression).
Device-final = Zoe.

## Q-353 — EPIC alignment (R205), frames answer (R207), list header (R208)

R205: the item-side epic flag still marked all 239 evergreen rewards
from before the tier model. Audit: every epic:true row is a
reward.type "epic" row; grants were already gated by isEpicQuest
(epicItemFor runs only for the 10). Fix: epic:true now survives only
on the 10 EPIC quests' rewards (eg6-kiseichu / eg6-mikado / eg5-paper
/ eg4-super-potato / eg5-tabashio / eg6-tokiwaso / eg3-kisho-jinja /
eg5-shirohige / eg6-gasmuseum / eg9-itabashi-nettaikan). All 246
REWARD rows retained; ownership untouched (Zoe's 16 stay hers — the
collection EPIC shelf now honestly reads owned/10). The shelf's
duplicated label (heading + identical inner row) is gone: the count
lives in the heading. Known residue, recorded not hidden: the 229
items' flavour descriptions still read "EPIC reward — clear X" in
the wardrobe grid; rewriting 687 localised strings was judged
riskier than the inconsistency — revisit if Zoe wants it.

R207 answer (Zoe's question, via QA): coin-shop frames DO render —
exactly one place: applyPortraitFrame() puts data-frame on the
status portrait's wrap (records/status tab); the CSS draws corner
ornaments + border for fr-gold/sakura/hoshi/umi. The big hero is
frameless by Zoe's own 2026-10-26 ruling, so a 400-coin frame shows
only as small corners on a small portrait — weak visibility is a
fair complaint. Proposal (not built, her call): also frame the
achievement share-card portrait and enlarge the status portrait's
frame ornaments.

R208: the list subbar (kind segments + sort + state) overflowed her
phone's width and cut the state button. Per her follow-up in the QA
chat, the state button moves into the list bar beside the quest
count; the subbar keeps kind + sort; the bar wraps rather than
overflows. S3 (blank row thumbnails): list/log rows use native lazy
images, which the in-app browser can leave unloaded inside the
scroll panel — renderSearch/renderAdvLog now run a wake pass that
force-loads lazy thumbs near the viewport once per render.

Gates: syntax ×6; boot zero + phone PASS; data audit: REWARD 246
rows, epic:true exactly the EPIC_SET 10. Device-final = Zoe.

## Q-354 — Self marker unmissable (R209); Q-344 device-confirmed

R209 (Zoe at Tokyo Station): the locate banner said "found, nearest
quest 80 m" but she could not find herself on the map. Two causes:
(1) stacking — cluster badges render at z-index 34 inside #pinLayer
while the hero self-marker sat at z 5, so in any dense area the
marker is painted UNDER the clusters; (2) landing zoom — locate()
clamped its glide to s >= 1.2, so from her wide Ueno–Odaiba view it
barely moved. Fixes: the marker now rides at z-index 60 (above pins
and clusters), wears two expanding sonar rings so it reads from
across the map (reduced-motion gets a static ring), and a
successful locate — LOCATE tap or the once-per-session entry
auto-locate, same flow — centres on the player at zoom.s = 8, the
zoom system's own ceiling. Also recorded from the same screenshot:
Q-344 (locate banner at the map's top, correct wording/distance)
is DEVICE-CONFIRMED by Zoe.

Gates: syntax ×6; boot zero + phone PASS. Device-final = Zoe
(verify at a station: marker visible over clusters, map lands on
her at max zoom).

## Q-355 — Dock tab: one cursor, centred labels (R211)

Zoe: the hero tab showed TWO yellow arrows and an off-centre label.
Root cause of the phantom arrow: the gacha-availability dot on the
hero tab is a <span class="gacha-dot">, and the selected-tab cursor
rule (.tab[aria-selected] span:not(.count)::before) painted a lemon
▶ inside the 11px dot at the tab's top-right, where the raised
START tab clipped it. The real cursor also sat in flow before the
label, pushing every selected label right of centre. Fix (CSS):
the dot never grows a cursor (content: none), the label span becomes
the positioning context, and the cursor floats absolutely at the
label's left — one marker system, label centred on the tile, as she
specified. Device-final = Zoe.

## Q-356 — Celebration share rebuilt for the in-app browser (R210)

Zoe's device verdict closed Q-255/Q-310 as FAIL: on her phone
(Muse-app WKWebView all day) the celebration's 実績カードをシェア
tap does nothing, twice, while stub verification passed. The exact
breaking link cannot be proven from the lab — no WKWebView here —
so the rebuild removes every fragile link in the chain at once:
(1) the chooser no longer waits for the async poster build
(fonts + photo + a 2.5s fallback timer that raced the panel's
tap-to-dismiss): it opens synchronously inside the tap with the
simple card, and the poster canvas swaps into the same share
context when ready; (2) hosted inside the celebration, the chooser
now displays by CSS class instead of a nested showPopover inside
the celebration popover; (3) both canvas.toBlob waits (system
share, and the older direct card share) get a 1.6s watchdog that
falls through to a text share instead of dying silently.
A Chromium end-to-end drive of the live build confirmed the daily
celebration carries no share button by design (shareText exists
only on quest clears) — the failing surface is the quest-clear
panel only. Device-final = Zoe: next on-site clear, tap share —
the chooser must appear instantly.

## Q-357 — Share: the celebration leaves the chain entirely (R210, Zoe device verdict on Q-356)

Zoe retested on device 2026-11-07 11:48 (Mitsubishi Ichigokan
remote clear, in-app browser): the celebration's share tap STILL
did nothing the first time; it worked only after she closed the
quest page and tapped again — with the celebration layer gone,
the same flow worked, and the poster download completed. Three
builds (Q-310 nested hosting inside the panel, Q-356 class-only
display inside the panel) kept the chooser inside the celebration
popover and kept failing intermittently in her WKWebView, while
the dialog/body-hosted share paths have always worked on her
phone. Q-357 therefore removes the celebration from the chain:
(1) the panel's share tap ends the celebration FIRST (the wear
button's long-standing pattern), then runs the unchanged flow;
(2) openSharePick hosts only in the open dialog or the body —
the celebration branch is deleted; (3) #sharePick is no longer
a popover element (attribute removed): display is plain CSS in
every hosting, no top-layer promotion anywhere; (4) the reward
note lived in the dismissed panel, so grant() narrates its
message when the note span is detached. No CSS rules changed.
Verified by a targeted harness driving the real sliced
openSharePickInner/hideSharePick (11/11: dialog hosting, body
hosting, never inside #celebrate, zero popover calls, clean
hide/re-home) + syntax x6 + boot zero/phone. Device-final = Zoe:
on the next clear, ONE tap on the share button — panel closes,
chooser appears immediately.

## Q-358 — LINE row in the share chooser (Zoe's order)

Zoe (2026-11-07, after the LINE how-to): 「分享先加上 LINE 一行」.
The chooser gains a LINE row between system and X (system / LINE /
X / Threads); both chooser flows get it at once — the quest-clear
(check-in) share and the detail poster share share #sharePick.
lineShare follows the X/Threads pattern: save the poster image
first, then open LINE's composer with the message (share text +
link) prefilled via https://line.me/R/msg/text/?…, and the reward
grant uses the same saved-note (the note now narrates when the
panel is gone, per Q-357). Labels: EN "Send to LINE" / JA
「LINE で送る」 / ZH 「发送到 LINE」. Gates: syntax x6, the Q-357
hosting harness (stub rows extended with the LINE row), boot
zero/phone. Device-final = Zoe. LINE LOGIN is a separate track:
Zoe is creating the LINE Login channel herself (provider name
"Tokyo Quest Log" — no real name), callback
https://amanohlkajnilhsbofun.supabase.co/auth/v1/callback;
wiring starts when she hands over the Channel ID/Secret via the
secure card. V1 scope: no email permission (LINE review), LINE
userId as the account key, no auto-merge with existing accounts.

## Q-359 — LINE sign-in (Zoe's order; channel + provider hers/ours as noted)

Zoe created the LINE Login channel herself (provider "Tokyo
Quest Log" — no real name; region Japan; privacy/terms URLs
filled) and registered the callback
https://amanohlkajnilhsbofun.supabase.co/auth/v1/callback.
Supabase side: custom OIDC provider "custom:line" created and
ENABLED (issuer https://access.line.me via discovery, scopes
openid profile), and "Allow users without email" turned ON —
the channel takes no email scope, so LINE returns user ID /
display name / profile image only, and GoTrue would otherwise
reject the sign-in. Channel ID/Secret live only in the Supabase
provider config (handed over in chat, deliberately not recorded
anywhere else). Client side in this build: a LINE button in the
single auth window under the Google button (LINE green #06C755
in the same GBA frame; .auth-btn.line (0,2,0) audited to win,
placed after every base .auth-btn background rule), lineLogin()
mirroring googleLogin() with provider "custom:line", labels in
EN/JA/ZH, the shared OAuth return copy reworded provider-neutral
(it said "Google" for what is now a two-provider handler), and
a privacy-page bullet (JP+EN) for the LINE data received, dates
bumped to 2026-11-07. Existing accounts do NOT auto-merge with
a LINE identity (v1, per the plan Zoe approved). Device-final =
Zoe: sign out, tap 「LINEでログイン」 — the LINE consent screen
must show "Tokyo Quest Log", and approving returns her signed
in. Note: the channel is still in LINE "developing" status, so
for now only Zoe's own LINE account can complete the flow;
publishing the channel opens it to everyone (her tap, at launch).

## Q-360 — LINE sign-in via bridge function (Q-359 device test failed)

Zoe's first LINE login (2026-11-07 14:23) returned to the game
with "server_error". The Supabase Auth log names it exactly:
"failed to verify ID token: oidc: malformed jwt: unexpected
signature algorithm HS256; expected [ES256]". LINE's docs
confirm web login ALWAYS issues HS256 ID tokens (channel-secret
signed; ES256 is native-SDK/LIFF only), and Supabase's custom
OIDC provider verifies against the JWKS only — symmetric tokens
unsupported — and force-adds the openid scope (the dashboard
would not even keep a profile-only scope), so the generic
provider route is structurally impossible for LINE web login.
The custom:line provider stays enabled but dormant; nothing
links to it after this build.
Fix: a Supabase Edge Function "line-login" (deployed
2026-11-07, JWT verification off, secrets LINE_CHANNEL_ID /
LINE_CHANNEL_SECRET in the function's secret store) runs the
LINE flow itself — authorize redirect with an HMAC-signed
state, code exchange with the channel secret, ID-token check
via LINE's official verify endpoint, find-or-create of the
mapped Supabase user (synthetic email line.<sub>@
line.tokyoquestlog.com, never mailed), a magic-link mint, and
a server-side verify exchange whose session tokens return to
the game as #line_at / #line_rt. Client side in this build:
lineLogin() navigates to the function's /start; at boot a
lineReturn capture reads the handover params (same hands-off
rule as the OAuth params) and setSession() adopts the session
before the normal getSession path runs; cleanAuthUrlNow knows
the new params. /start smoke-tested before shipping: correct
302 to LINE with the bridge callback as redirect_uri.
REMAINING STEP (Zoe's tap): the bridge callback
https://amanohlkajnilhsbofun.supabase.co/functions/v1/line-login/callback
must be added to the channel's callback URLs in the LINE
console, or LINE refuses the authorize step. Device-final =
Zoe's retry after that paste. Existing accounts still do not
auto-merge (v1 rule unchanged).

## Q-361 — Zoe's device-pass fix batch (2026-11-07)
Six findings from Zoe's hands-on pass after the LINE login test,
all fixed in one build:
1. LINE accounts showed the synthetic address
   (line.<sub>@line.tokyoquestlog.com) on the account surfaces.
   Zoe: hide it, show 「LINE 账号」. New AUTH_STR key `lineAccount`
   x3 + `acctMailLabel()` (block 4) swapped into all five display
   sites (auth done x2 paths, name-step finish, account status
   line, hero account line). The address itself is unchanged —
   it remains the account key; only the label changed.
2. List header jumped between one and two rows depending on the
   summary length, and the subbar sort button sat mid-row.
   Zoe: right-align, keep it stable. `.list-bar` no longer wraps;
   the summary flexes and wraps inside its own space; the subbar
   sort button is pinned right (margin-left auto).
3. Shop decor note invisible at night: `.coin-house` hardcodes a
   pale-blue ground but inherited the theme ink. Pinned
   color #23405c. Audit of the same class (fixed light ground +
   inherited ink): `.mg-row.is-duty` pinned #4a3a00; other hits
   are decorative (scene sticky notes, frames, dots) or set their
   own color — no other text-bearing case found.
4. Collection tab flashed on open and its pager was clipped at
   the window's bottom edge, unlike its siblings. The pager is
   now static panel furniture like the ladder's (Q-333 pattern):
   rendered into a pinned `#colFoot` footer, `#colBody` flexes
   and scrolls internally, and openHeroWin renders the collection
   BEFORE unhiding the panel (the status tab already did this).
5. Titles tab: Zoe circled the EXP/ticket/coin footer strip —
   "this doesn't need to appear". `.hstat-foot` removed (all its
   writers were already null-guarded; coin balance still lives
   in the shop header and hero stats). Pager centre pill gets
   line-height/min-height so its digits no longer clip; the
   explainer note is slimmed per the space principle.
   NOTE: coin_test.js "status chip shows balance" now FAILs by
   design — it reads the removed hsCoinVal chip. Test is stale
   against Zoe's explicit order, not a regression. (The other
   coin_test FAIL, announce heads, pre-exists.)
6. Daily view ended at ~60% height with dead space below.
   `.daily-panel` now flexes to the full view height and the
   quest rows stretch evenly through the window.
Gates: syntax x6 OK; bootprobe zero+phone PASS; q351 fits PASS;
ladder chain SETTLED 5/8/13 at BOX_H 300/460/700 (unchanged);
cascade audit: Q-361 block sits after every rival rule.
Also discovered: the Q-360 embedded BUILD_ID carried a mangled
"tq" prefix vs version.txt (runtime redaction artifact in the
build chain). Q-361 assembles its token in-process and embeds
it consistently in both files; the freshness check is whole-
string, so the pair now matches exactly.
Device-final = Zoe.

## Q-362 — Coin-shop street decor swap (2026-11-07)
Zoe, looking at the 街の飾り shelf: "换一批道具，不太像是大街上
会出现的" — the set was indoor furniture (plant/chair/floor
lamp/table/bookshelf/cat tree) decorating a street scene.
Swapped the FURNITURE shelf for six street props in the same
48x26 pixel-SVG style, same slot system, same price ladder:
街路樹 150 / ベンチ 120 / ポスト 180 / 街灯 260 / バス停 320 /
自販機 450 (new ids furn-tree/-bench/-postbox/-streetlamp/
-busstop/-vending; STR keys furnTree/furnBench/furnPostbox/
furnStreetlamp/furnBusstop/furnVending x3 languages).
Old ids leave the shelf only: saves keep their furnitureOwned
lists (retention rule — item data is never deleted); the old
pieces simply stop being sold and rendered. Art verified by
rasterizing the shipped SVG strings to a preview sheet and
reading it (bus-stop timetable board read as a smudge in v1
and was cut before shipping).
Gates: syntax x6 OK; bootprobe zero+phone PASS; FURNITURE
shape test (6 unique ids, price ladder, balanced svg) PASS.
Device-final = Zoe.

## Q-363 — Badge art comprehensive upgrade (2026-11-07)
Zoe: "这种badge太粗糙了，全面升级" — direction mock approved
2026-11-07 (metal medallions, tier frames, bespoke icons;
earned = navy enamel full colour, locked = pale enamel muted
icon). Implemented as badgeMedalSVG(i, got) for the badge GRID:
- 36 bespoke 16x16 icons, positional like badgeProgress()
  (flag/boots/map/compass/crown, feather/bird/wings, pins/
  route/skyline, sprout/sword/shield/helmet/star, clipboard,
  three calendar tiers, doc-check, heart, two flames, gem/
  diamond/trophy, palette/prism, puzzle, backpack/chest,
  envelope, two completion rosettes).
- Icons are bbox-centred and resampled to fill the enamel
  disc; the frame is generated (double ring + 8 rivets) with
  bronze/silver/gold tiers assigned by family ladder height.
- Locked muting is baked into the art (parallel muted
  palette); the legacy CSS saturate filter is lifted for grid
  medals only, and the old thin-circle .b-ico chrome steps
  aside inside .badge-grid.
- Stickers (collection sticker book, adventure-log rows)
  still use badgeIconSVG/BADGE_PIX — different system, not
  medals, deliberately untouched.
Verified: the shipped JS renderer is pixel-identical to the
reviewed PIL prototype (0 diffs on sampled medals 0/4/20/22/
35, both states); icon sheet reviewed at v3 before shipping.
Gates: syntax x6 OK; bootprobe zero+phone PASS; q351 fits PASS.
Device-final = Zoe.

## Q-364 — Map pin size follows zoom (2026-11-07, QA R212)
Zoe circled the Ueno-Akihabara corridor on her device and
asked QA whether the pins are too big; QA agreed (photo pins
~60-70px device px tiling over streets and area names at
district zoom). pinScaleFor re-tuned: 0.60 at fit view,
easing through the district band (0.68 at pxu 3.2), full
size only at street level (pxu >= 6, the locate band).
Screen pin size goes from ~35-41px to ~24-33px across the
fit/district range; street-level size is unchanged. The
old schedule reached full size at pxu 2.9 and shrank again
at deep zoom, leaving the practical band oversized.
Cluster merge schedule deliberately untouched (Zoe's Q-154
verdicts: separated pins stay individual photos); pinD
still derives from curPinScale, so merge radii track the
displayed size. QA also confirmed the self marker (pixel
hero + sonar rings) renders correctly — no action there.
Gates: syntax x6 OK; bootprobe PASS; pinScaleFor unit
(sample values + monotonicity) OK. Device-final = Zoe.

## Q-365 — Number cluster badges banned (2026-11-07, QA R212 correction)
Zoe, right after the R212 GO: "不要数字 / 数字也很乱" — the
earlier-clustering branch is cancelled and number badges are
banned outright. Merged pin groups now render as small plain
markers: a 20px disc (chunky white ring kept), blue for
evergreen groups, red when any member is timed (pin-frame
colours). No count is rendered anywhere on the map. The
merge schedule, group tap (preview + pager cycling members)
and Q-364's zoom-following pin sizes are unchanged. The
aria-label still carries the count for screen readers only.
Gates: syntax x6 OK; bootprobe zero+phone PASS; cascade
audit (Q-365 width rule is last for .cluster-pin) OK.
Device-final = Zoe; QA walk on R212.

## Q-366 — Three-band zoom scheme for map pins (2026-11-07, QA R212)
Zoe approved QA's three-band scheme (16:36 "试试看"):
- FAR (whole city, pxu < 2.2): every pin is a small colour
  dot — blue evergreen / red timed / gold EPIC / green
  cleared (priority cleared > EPIC > timed). No photos, no
  numbers, no clustering; streets and area names readable.
- MID (district, 2.2–5.8): photo pins at half size
  (pinScaleFor now 0.5 through the band, full size only at
  the near threshold). Overlap groups keep ONE photo pin
  (first uncleared non-legend member); the rest drop to
  plain dots — nothing hidden, no markers. Cleared pins
  are always small green dots in this band. Grouping radius
  here is the plain visual overlap of the half-size pins.
- NEAR (street, pxu >= 5.8 incl. locate): current big photo
  pins; genuine overlaps keep Q-365's plain marker.
Bands are .map-box classes (band-far/-mid/-near) set in
applyZoom; buildClusters rebuilds on band change. Legend
anchors are exempt from dot rendering. Supersedes Q-364's
scale curve (pins still grow with zoom, inside the bands);
Q-365's number ban holds in every band.
Gates: syntax x6 OK; bootprobe zero+phone PASS; pinScaleFor
unit OK. Device-final = Zoe; QA walks all three bands.

## Q-367 — Collection tab-switch flash fix (2026-11-08, Zoe via ops)
Zoe: 「手帐页面还是点开以后会闪屏一下」 — the Q-361 render-before-
unhide fix did not cure the collection flash on her device.
Reproduced in a real browser (headless Chromium screencast,
veteran save, frame diffs measured): switching TO the
collection tab painted in 4 stages over ~0.3s (old panel gone,
hero stage visible, new panel ghosting in at partial opacity,
then settled); switching to badges painted in one step, and
switching to collection with the fade disabled also painted
in one step.
Root causes: (1) the records panels are full-screen case
windows carrying `animation: page-in 0.22s steps(4) both`
(from opacity 0) — a tab switch inside the already-open
window re-ran that fade on the freshly rebuilt panel, so the
hero stage showed through a ghost panel; (2) renderCollection
built all three pages' HTML on every render, including one
badgeIconSVG per clear for the hidden sticker page, heating
that first paint; (3) the adventure-log body still rendered
AFTER the panel unhide (the pattern Q-361 removed for the
collection).
Fix: (1) openHeroWin detects a records-to-records move and
marks the incoming panel .no-page-in for that switch (new
rule `#view-hero .hseg-panel.hero-win.no-page-in
{ animation: none; }`, specificity (1,3,0) over the page-in
rule's (1,2,0)); first opens keep the page-in. (2)
renderCollection clamps colPage up front and builds the
stamp-grid / sticker-book strings only when that page is
active. (3) renderAdvLog moves before the unhide loop.
Gates: syntax x6 OK; bootprobe zero+phone PASS;
test_q351_fits ALL PASS; cascade audit (new rule is last in
document order by style block, wins on specificity) OK;
screencast re-probe on the patched build: collection switch
now paints in ONE step (single diff spike 40.5, no staged
ghost frames). Device-final = Zoe.

## Q-368 — The hut （小屋）: decoratable pixel room, P1 (2026-11-09, Zoe)

Zoe named the hero-background decoration system 「小屋」 and ordered
it developed into a decoratable retro-pixel hut, aimed at the game's
target users (Western tourists + women in Japan): cute characters,
plentiful props, plentiful gacha. Structure ruling (Zoe, 2026-11-09):
the sky/street hero scene is NOT replaced — the hut is a separate
room entered from the hero page dock (new dock button, house icon).
Room mock approved by Zoe before the build (hut-room-mock-20261109-v2).

P1 scope shipped here:
- New hero window #hsegHut (added to the openHeroWin panel list):
  a pixel room (pink wall, window, wood floor) with the player's own
  hero standing in it (drawHeroEquipped on #hutHeroCv + contact
  shadow), 2 wall slots + 4 floor slots.
- HUT_ITEMS (8, 48x26 pixel SVGs, art previewed before shipping):
  flower cart 380 / star lights 240 (wall) / cat sofa 520 / cloud
  lamp 460 (wall) / strawberry rug 200 / mini gachapon (Lv.5 GIFT,
  not sold) / bunny lamp 300 / sakura bonsai 420.
- Placement: 摆放 mode — tap a storage chip (or a placed piece),
  then a free slot of the same kind; placed pieces can be put away
  （收起）. Purchases and the gift auto-place into the first free
  slot. State: hutOwned / hutPlaced / hutGift, sanitized like
  furnitureOwned; old saves default cleanly.
- Coin shop gains a 4th tab （小屋家具） reusing the two-tap buy
  (coinArm "h:" prefix, coinTapHut); the hut panel's buttons jump
  straight to that tab and to the gacha window.
- Collection overview gains a 小屋 shelf row (owned/8).
- CSS is #hsegHut-scoped in the last style element; panel ink is
  pinned dark (Q-361 night-contrast lesson).

Gates: syntax x6 OK; bootprobe zero+phone PASS; test_q351_fits ALL
PASS; cascade audit (29 hut rules, all in the last style element, no
strays); CDP phone probes at 390x844 AND 390x667 on the real page
with a seeded veteran save — room renders with placed pieces + hero,
placement flow (chip -> slot) works, shop hut tab shows 8 cells with
correct owned/price states. Device-final = Zoe.
P2 (hut gacha pool + ticket issuance boost) and P3 (sets/seasonal)
remain queued per the approved phasing.

## Q-369 — Hut dock icon + hut window breathing room (2026-11-09, Zoe device)

Two device findings on Q-368, fixed together:
1. The 小屋 dock button showed its label but NO icon. Q-368 added
   DOCK_PIX.hut, but dock icons are applied through a SECOND fixed
   map (dockIcons = {records, gacha, studio, shop}) which never got
   the hut entry. Added `hut: DOCK_PIX.hut`. (Lesson: the dock has
   two maps — dockNames for labels, dockIcons for glyphs; a new dock
   button must be added to both, plus its DOCK_PIX entry.)
2. The hut window read small and its text was pressed against the
   frame: .hut-panel carried no padding, so the title's first glyph
   and the tray label touched/clipped at the window border on her
   device. Appended Q-369 rules (last style element, same selectors,
   later wins): .hut-panel padding 12px 12px 14px + gap 10px, title
   22px, count 13px, room aspect 4/3.35 (taller), tray min-height
   36px, chips 6px 12px/14px, buttons 13px padding/16px.

Gates: syntax x6 OK; CDP phone probe at 390x844 — dock icon innerHTML
renders (house glyph, visually confirmed beside the other four dock
icons), hut panel re-shot with padded title/tray and taller room.
Device-final = Zoe.

## Q-370 — Hut close-in-frame + bigger frame; daily lucky pill; list header (2026-11-09, Zoe device)

Three circled layout findings from Zoe, one build:
1. HUT: "close can go inside the frame; the whole frame can be
   bigger." The hut's .hwin-x moved INSIDE .hut-panel (absolute,
   top-right corner of the card); hut-head gets right padding so the
   title never runs under it. The panel now fills the case window
   (min-height: 100%) and .hut-room flexes to absorb the height
   (aspect-ratio dropped, min-height 300px; slots are flex-end /
   centre anchored so furniture stays grounded in a taller room).
   Scoped to the hut only; other windows keep the family close.
2. DAILY: the lucky pill (in-flow inline-block inside .dr-name)
   wrapped and painted over the description's first line on Zoe's
   WebKit device, and every active quest name carried the full-width
   strike background meant for done rows. .dr-name is now a wrapping
   flex row (pill = flex item, overlap impossible), pill margin
   normalised, strike background only under .drow.done.
3. LIST: the bar is flex-wrap: wrap, so a long summary pushed the
   search button onto its own orphaned row. #searchOpenBtn moved
   into the subbar (segments | sort | search, search right-pinned);
   bar is summary + state, nowrap. Subbar controls trimmed
   (gap 6px, 13px type, tighter padding) after probe measurement
   showed a 16px row overflow at 390px; verified no overflow at
   390x844 and 375x667 (search right edge == subbar right edge).

Gates: syntax x6 OK; bootprobe phone PASS; test_q351_fits ALL PASS;
CDP layout probe screenshots + rect measurements for all three
views at two sizes. Device-final = Zoe.

## Q-371 — Shop balance pill (2026-11-09, Zoe device)

Zoe circled the coin balance in the shop header: bare dark-gold
text ("94"), no chip, low contrast — "hard to see". #coinBal is now
a lemon pill in the price-button language: lemon fill, ink border,
coin dot (::before, CSS-only — JS still writes a plain number),
navy Baloo 800 at 20px, soft shadow. Probe-verified in the shop hut
tab. Device-final = Zoe.

## Q-372 — De-duplication + close buttons inside frames (2026-11-09, Zoe)

Four rulings from Zoe in one pass:
1. The きせかえ dock button is REMOVED — it duplicated the four
   equipment cards above it (each card opens the studio on its own
   slot tab; the hero card opens custom). Hero dock is now
   records / gacha / shop / hut.
2. Map pins, Zoe's pick after seeing the Q-366 mid band mix frames
   and dots: MID BAND IS ALL DOTS. Photo pins exist only in the
   near band; a band never mixes forms. buildClusters returns
   early for mid like far; band-mid CSS dots every non-legend pin
   (12px, same colour language). Probe-verified per band
   (near 306 photos / mid 406 dots, 0 photos / far all dots).
3. The hut's Lv.5 gift furniture (mini gachapon) is now a MOON
   LAMP — "why does the hut have another gacha, the two are
   confusing". Internal id/key stay hut-gacha/hutGacha so saves
   keep the gift with zero migration; art (computed crescent +
   sleeping eye + star on a wood stand), the three name strings
   and the three gift messages changed. (This also kills the
   earlier P2 idea of a hut gacha pool.)
4. Close buttons inside the frame, family-wide (Zoe: no more of
   this layout problem): hero-win top padding 50px -> 12px so each
   window's first row rises beside its close button; the shop x
   moved into the coin-head row after the balance pill; the gacha
   x sits absolute at the gacha-panel card's top-right corner with
   the head padded right (its title+pill row wraps the pill under
   the title — accepted, nothing overlaps); hut already inside
   since Q-370 and its card grew again (y12, h723 at 390x844).

Gates: syntax x6 OK; bootprobe zero+phone PASS; test_q351_fits ALL
PASS; CDP probes — band counts per zoom, panel screenshots
(records tabs + x aligned, shop head row, gacha corner x), hut
room with the moon lamp placed, shop hut tab gift cell renamed,
hero dock at four buttons. Device-final = Zoe.

## Q-373 — Hut gacha button removed (2026-11-09, Zoe clarification)

Zoe clarified her Q-372 point: "why does the hut have a gacha
SYSTEM" — she meant the hut carrying its own gacha entry (the
 hut-btns ガチャ jump button), two gacha entries being confusing.
The button and its label-setter are removed; the hut's row is now
飾る + ショップ, and gacha lives only on the dock. The moon-lamp
gift swap from Q-372 stands unless she asks for the mini gachapon
back (asked in the ship report).

## Q-374 — Sort button stays visible in the evergreen view (2026-11-09, Zoe "近い順没了")

Root cause was a design rule, not a break: Q-330/Q-335 hid #sortBtn
when filterKind === "ever" because nearest is the only sort there.
Zoe opened 常設 and the 近い順 button was simply gone — inconsistent
with the other two kind views and read as a missing feature. Fix:
the button is never hidden now; in the evergreen view it stays and
shows 近い順 (the sort itself still falls back to nearest there, and
the click handler's ever -> ["near"] cycle re-requests position).
Probe-verified at 390x844 in all three kind views: button visible,
80px, label 近い順, no subbar overflow; the evergreen screenshot
reproduces Zoe's exact list (289 items from her location).

## Q-375 — R215 daily mini-game entry / R216 share sheet rebuild / R217 strike (2026-11-09)

R215 (Zoe's order): a mini-game entry box now sits below the Daily
window (#mgDailyBtn: 今日のゲーム / 今日の3ゲーム / ▶), tap opens the
games hub. Labels mirror the hero capsule via renderMgCapsule
(which also fills the box and runs from the renderDaily wrapper, so
they are never stale). No ticket counts on the box — the capsule
stays the single ticket surface (Q-201). Probe-verified at
390x844 and 390x667: box below the window, no page overflow, hub
opens.

R216 (S2 reopened; second device FAIL of the celebration share):
the share chooser is now a share SHEET built on the minimal path.
It displays the actual card canvas in a preview the moment it opens
(first feedback = plain DOM; no toBlob/share-sheet/popover in the
critical path), gains an explicit Save-image row, and STAYS OPEN
after a row tap — every outcome is written to a status line
(shared / saved-note / failed-with-next-step), so a swallowed
window.open or rejected share() in the in-app webview can no
longer masquerade as a dead button. The reward grant is wrapped
once-per-sheet at open. doShareCard (level-up / badge shares, the
block Zoe circled) no longer calls navigator.share directly; it
routes through the same sheet. Gates: test_q375_share (real sliced
code: preview-at-open, stay-open, status, grant-once, doShareCard
reroute) ALL PASS; test_q357 hosting ALL PASS; real-page probe:
sheet opens inside the detail dialog with the 1080x1350 poster in
the preview, all five rows labelled, save tap reports on the
status line (in the file:// probe the save correctly REPORTED its
failure on a tainted canvas instead of dying silently; on the
https origin the photo is same-origin). Final leg is Zoe's next
clear on device, as QA framed it.

R217 (diagnosis CORRECTED — QA please note): the two flagged cards
were in fact completed. The yellow chip QA read as an active
complete button is the done stamp itself (dailyDoneStamp "達成 ✓"
renders only on done rows); zoomed crops of the original show the
lucky pill in its done styling (white/grey, not gold) and the
Daily tab badge at 1 remaining. Card 2's through-title strike is
correct done behaviour. The real defect was card 1 only: after
Q-370 made the name wrap, a done LUCKY row's name box is two lines
(title + pill) and the strike — a background gradient at 54% of
the box — slashed the pill row instead of the title. Fix: the
strike is now text-decoration: line-through on a new .dr-name-t
span wrapping only the title text; the style#11 background painter
and the dead Q-370 :not(.done) guard are removed. By construction
a not-done row can never be struck, and a done row's strike always
lands on the title text. Probe-verified: done lucky row — title
struck, pill decoration "none"; open rows — no decoration. (The
.daily-card.done .dc-name history-card strike uses the same old
trick on a single-line inline name; not flagged, left alone.)

## Q-376 (2026-11-09) — share guards + anytime re-share from detail
Zoe's two orders on Q-375: (1) she re-tested the celebration share on
a fresh guest save (same first clear of Kameari, 19:03) — still dead;
(2) NEW: "已经完成的任务也可以随时分享实绩" — a cleared quest must
re-share its achievement at any time. This SUPERSEDES the 2026-10-30
R32 spec that kept the CLEAR poster celebration-only.
- Celebration share tap: dismiss and share call now run in separate
  try/catch steps; a throw narrates posterFail instead of silence.
- The sheet proves it is on top: 80 ms after opening, a hit-test at
  the panel centre must land inside the sheet; if covered, it closes
  the open dialog and re-hosts on the body (Zoe's own workaround,
  productized as a safety net).
- Detail page: #btnClearShare appears under the cleared line only
  when the quest is cleared (label = shareBtn), wired to
  shareClearAgain() — same CLEAR poster via doShareClear, original
  date/EXP from the stored clear record, shareEpic text for EPIC
  quests, and o.noReward (doShareClear's grant honors it): the
  reward belongs to the original clear's share, re-shares grant
  nothing. Superseded in part by Q-377 (the guards stay; the root
  cause was elsewhere).

## Q-405 - Recommendation-first home (Zoe's simplification ruling, 2026-11-23)

Zoe (after talking with a friend): the app is too complex, new users don't know what to do — principle: "越傻瓜越好，让用户不用学习怎么用这个app，而是直接喂到嘴里". Proposal + mock (~/workspace/home-rec-mock-20261123-v2.png) approved the same evening ("方向对，就按这个做"), including the bottom-bar change. Shipped: a new #view-home is the entry screen — hero scene strip with a speech bubble ("今天想去哪儿？选一个，我直接帮你找。" + Lv/tickets pill), the question "今天想怎么玩？" with three big multi-select chips （离我近 / 免费 / 本周末）, and 3 served quest cards (photo, name, distance-or-area · price · period meta, a FACT-based reason — ending soon / last day / nearest / EPIC / free / weekend — and a one-tap 接任务 that accepts and slides the next card in). 换一批 rotates the pool (session state homeSel/homePage, nothing persisted); 看全部 N 个任务 -> list view; the lemon "随便给我一个" accepts a random pick from the top of the pool and opens its detail. Pool: not cleared, not accepted; timed must be running today (or on the coming Sat/Sun in weekend mode); sort = distance when a position is known, else ending-soon. Not-yet-started weekend picks show a "starts in N days" chip instead of accept (toggleAccept's date gate). Landing: entrySequence switches to home instead of playing the map intro (the intro still plays on first manual map entry); the Lv<2 is-new pulse moved to the home tab. Bottom bar: 地图 | 主人公 | 推荐 (raised centre, dice icon) | 每日 | ⚙ — tab-map's label is now the localized "地图" (was hardcoded START); the list tab button stays in the DOM hidden (.tab-gone) so switchView/updateLogTab keep working, and switchView's view set gained "home". Daily Picks deck/capsule/daily entry are untouched. Gates: syntax x6, bootprobe zero+phone PASS, fits + share + hut suites PASS, CDP probe (zh, Zoe-like save) ALL PASS — lands on home after START, 3 cards served, free chip filters to free-only (pool 191), shuffle rotates, accept removes the card, surprise opens a detail, map/home tab round-trip, list tab hidden. Device-final = Zoe.

## Q-404 - Day BGM swapped to "Town" (Zoe's pick, 2026-11-23)

Zoe approved the day pick an hour after Q-403 ("白天也换吧"). The day-1 slot's audio is replaced with "Town" (Pro Sensory, CC0; Ogg Vorbis q3, 64.0 s, measured seamless loop; base64 953,308 -> 1,071,948 chars). Slot id unchanged — saves (bgmDay defaults to "day-1") keep working; day-2 stays the alternate day option. Display name: EN "Town", JA 「タウン」, ZH "Town" (was "Route No.2" / 「午後のロード2号線」). Both default tracks are now Zoe's audition picks (day Town / night Chill); the two alternates (day-2, night-1) and the title theme are untouched. Gates: syntax x6, bootprobe zero+phone PASS, fits + share + hut suites PASS, CDP probe decoded the embedded day-1 data in-page (803,961 bytes, 64.0 s, stereo) and read the new ZH track name. Device-final = Zoe (daytime listening check).

## Q-403 - Night BGM swapped to "chill" (Zoe's pick, 2026-11-23)

Zoe replied to the 2026-11-18 night audition ("chill" — Pro Sensory, CC0) with "这个BGM吧" on 2026-11-23: the night-2 slot's audio is replaced with the trimmed seamless-loop encode (Ogg Vorbis q3, 95.9 s, 1.27 MB; base64 1,356,576 -> 1,698,776 chars). The slot id is unchanged — every save (bgmNight defaults to "night-2", sanitize admits night-1/night-2) keeps working with no migration; night-1 "Pasture Lullaby" stays as the alternate night option in the picker. Display name follows the music in all three UI languages: EN "Chill", JA 「チル」, ZH "Chill" (was "Night Town" / 「夜のポケタウン」). The BASS sequencer is not the live path — playback is BGM_FILES via fetch + WebAudio decode (bgmPick at ~25160). Day tracks untouched: Zoe has not ruled on the day pick ("Town") yet. Gates: syntax x6, bootprobe zero+phone PASS, fits + share + hut suites PASS, CDP probe decoded the embedded night-2 data in-page (1,274,081 bytes, 95.9 s, stereo) and read the new ZH track name. Device-final = Zoe (night mode listening check).

## Q-402 - Mini-games fill the screen (R220; mock v2 approved by Zoe 2026-11-18)

Zoe approved the full-screen mini-game mock v2 on 2026-11-18 ("可以试试") after her 2026-11-16 complaint that the games were too small to fill the screen. CSS-led build; the draw code's bitmap constants (360x400 dash/jump, 360x340 catch/whack) are untouched and every canvas keeps its contain-fit. (1) .run-win takes the full height (the same formula as its long-standing max-height cap: vvh - bar-clear - 28px) instead of hugging its content, so the window fills the screen on all 5 game screens; the hub/auth/beta/event windows are not .run-win and are untouched. (2) The header becomes the mock's red band flush with the window's top inner edge: the .run-win::before tape strip (7px + 7px margin, a flex item that had been pushing the head down 14px) is display:none in run-win only, the head bleeds -12px/-14px over the win padding, and the title loses its red-chip box (border/background/shadow stripped in run-win scope) so it reads as plain white text on the band; the x becomes the mock's white box. (3) The stage flex-grows inside a framed navy matte (#10162e + edge border + radius) — the bezel is the honest consequence of contain-fit: on a tall phone the canvas is width-bound, so the extra stage height becomes matte, never crop or stretch. The memory grid genuinely grows (slot 384px tall at 844 vs 378 in Q-401; grid 304x384 vs 299x378). (4) Dash + Catch markup: the lane buttons move into the button row flanking the start button (the mock's single control row: left / start / right); wiring is by button id, unchanged; the share button wraps to its own full line when it appears after a win. Gates: syntax x6, bootprobe zero+phone PASS, fits + share + hut suites PASS, CDP probes at 402x844 and 402x695 in zh (all 5 windows measure 713px tall at 844 with stages 426/440/426/384/454; dash start enables the lane buttons and a real tap on left moves the hero lane 1->0; catch start enables its buttons; short-tier dash fits one screen with the canvas height-bound). Device-final = Zoe.

## Q-401 - Hero-feet frame blob removed; search button moves to the title row; Daily Picks entry on the daily page (2026-11-18)

Zoe's 2026-11-18 morning burst, three items. (A) "蓝色的是啥" — a pale-blue oval with a dark rim hanging between the hero's legs at the shoe line. IDENTIFIED by reproduction, not deduction: it is the Q-398 portrait-frame wrapper. applyPortraitFrame() wrapped the retired, permanently display:none #heroBigCanvas in a .hero-portrait div inside the .hero-figure flow; with a frame equipped (fr-umi in the reproduction), the wrapper's [data-frame] border/background/padding plus its four 10px corner dots painted as a 16x16 rounded blob centred exactly at the walker's feet (measured: wrapper rect straddles the walk canvas's bottom edge, sprite rows ~13-16). Q-398 called the wrap "harmless" because the canvas inside is hidden — the wrapper's own box is not. FIX: applyPortraitFrame() no longer wraps the stage canvas at all; the frame's homes stay the records status portrait (sync unchanged, probe-verified data-frame still lands) and the share card. The hero page's big hero stays frameless per Zoe's 2026-10-26 ruling. (C) List header: the subbar row (kind segs + sort + search + accepted chip) overflowed and clipped the chip off the right edge. Per Zoe's instruction ("检索往上放，标题旁边那一行"), #searchOpenBtn moved from .list-subbar into .list-bar beside #searchSummary (existing list-bar rules for it were still in the cascade from its pre-Q-370 home). Residual overflow found by the probe in EN (long labels): the subbar is nowrap since a later block — a Q-401 rule restores flex-wrap:wrap on #view-list .list-subbar under Zoe's standing chip-row rule (a row that cannot fit wraps, never compresses/clips). ZH probe: chip right edge 379 <= 402 viewport, fully visible. (D) Daily page: the daily panel grows (Q-391) but #dailyWin hugs its content, leaving a blank band between the window and the bottom-anchored mini-game box. Per Zoe ("每日推荐放在这儿"), a Daily Picks entry box (#recDailyBtn, mg-daily-btn family, dice icon + name + remaining-count chip) now sits as the last child of #dailyPanel with margin-top:auto — anchored to the panel's lower band exactly where she circled. renderRecEntry() fills it with the map capsule; renderDaily() now calls renderRecEntry(); tap opens the picks overlay (probe-verified). The map capsule stays. Gates: syntax x6, bootprobe zero+phone PASS, fits + share + hut suites PASS, CDP probe at 402x695 in zh with Zoe's equipment and fr-umi equipped (no .hero-portrait in the figure, status frame sync intact, search button in the title row, accepted chip fully on-screen, picks entry at the panel's bottom band, tap opens the overlay). Device-final = Zoe.

## Q-400 - ZH blurbs/lang notes rescued from BASS_PATTERNS (2026-11-18)

Found by the 2026-11-18 daily refresh worker, verified by dev before touching anything. ROOT CAUSE: build_q399.py's insert_map() anchored a map insertion on the first '\n      };' after the map's start. VENUES closes at 6-space indent, so its insert landed correctly - but BLURB_ZH and LANG_ZH close at column 0 ('\n};'), so the anchor overshot both maps and dropped their entries into the next map with a 6-space close: BASS_PATTERNS, the mini-game music sequencer's pattern dict. The Q-399 gate then verified coverage by substring-matching the inserted block text in the file, not by map membership - so it passed while 103 entries sat in the wrong dict. LIVE IMPACT since 2026-11-16: in the Chinese UI, the 50 Q-399 events (c107-c156) showed the Japanese blurb (fallback) and the raw English lang note; LANG c157-c159 also fell back. FIX: the 103 entries moved into the real dicts (50 blurbs -> BLURB_ZH, 53 langs -> LANG_ZH), values verified byte-identical against batch-plus50-candidates.json; BASS_PATTERNS restored to its 6 music patterns byte-identical. VENUES was never affected. LESSONS (standing): (1) a map insertion must find the map's OWN close with a string-aware brace scanner - never anchor on a fixed indent pattern; (2) a coverage gate must assert membership IN THE MAP (key present between the map's braces), never a substring in the file. Gates: syntax x6, bootprobe PASS, share + hut + fits suites PASS, CDP probe in zh mode (c107/c157 blurbs return Chinese, c107/c159 lang notes return Chinese, c20 old entry still resolves, BASS_PATTERNS = exactly the 6 music patterns). The refresh log carries the key-format rule for future runs (ZH dict keys are the full event id). Device-final = Zoe (she plays in the Chinese UI).

## Q-398 - Bought portrait frames get real homes: status portrait + share card (R224) (2026-11-16)

Zoe device-confirmed the defect ("我买了头像边框 根本没有可以用的地方") and picked BOTH remedies. The probe found it was worse than R207 recorded: applyPortraitFrame() wraps #heroBigCanvas, the retired pedestal canvas, display:none since the walking hero arrived - the frame rendered NOWHERE in play (wrap rect 0x0; the status panel had no portrait at all; only the shop's own cells previewed it). Fix: (1) the titles/status window gains a real portrait - a framed hero bust (84px, 100px with the frame) in a head row at the top of the tab, using the existing .hero-portrait/[data-frame] treatment, with the player's name (heroDisplayName()) and an explicit frame line (new STR frameLabel/frameNone x3; the frame's name from its fr* key) beside it. Note the panel's .hh-title/.hh-desc lines are display:none !important by a standing minimal-pass rule ("duplicated readouts leave the TITLES tab") - they were NOT resurrected; the head row carries only the name + frame line. applyPortraitFrame() now also syncs the status portrait, and renderLadder() refreshes it on open. (2) The share card's hero wears the equipped frame: drawShareFrameBg/Trim paint the frame's matting, border, inner line and corner ornaments (gold squares / sakura petals / hoshi lemon stars / umi bubbles) around the bust in buildShareCard, in the frames' own colours; the CLEAR and quest posters carry no hero, so the card is the share surface. The hero page's big hero stays frameless per Zoe's 2026-10-26 ruling (untouched). Gates: syntax x6, bootprobe PASS, share + hut + fits suites PASS, CDP probe at 844 and 667 (frame data-attribute set, bust 100px, panel scrollHeight == clientHeight at both heights, pager inside, name + frame line populated, share card renders the gold frame around the hero). Device-final = Zoe.

## Q-397 - Emoji icons retired for the game's own pixel icon set (R222) (2026-11-16)

Zoe: "不想要这种emoji图标了太掉价了" - no emoji glyphs as UI icons. Every emoji in an icon slot is now the game's own pixel icon set (the ICONS bodies were extracted from the file itself during the build so the swaps cannot drift from the set): the Daily Picks capsule's dice -> ICONS.dice; the mini-game capsule + daily entry gamepad -> ICONS.games; the hub ticket badge, the gacha pull-cost chip and the ticket pill -> ICONS.ticket; the four mini-game progress-bar finish flags -> a pixel flag drawn in the same rect style. ICONS.hero (the bottom-bar 主人公 icon) was a smooth-path face that read as an emoji person despite living in the SVG set - redrawn as pure pixel rects (blocky hair/face/body, crispEdges like the flame). Where the ticket glyph lived inside plain TEXT it becomes the ticket word instead: the Dash goal lines (TICKET / 券） and the four mini-game win messages via one mgTktSuffix() helper (EN "TICKET +1 ✓", JA/ZH "券 +1 ✓"). Checked and deliberately untouched: the streak flame is already a pixel-rect icon (not an emoji); text symbols (★ ✓ ▶ ✕) are not emoji and stay per the ruling's own boundary. Remaining emoji occurrences in the file are comment-only (verified per-occurrence in the build gate). Gates: syntax x6, bootprobe zero+phone PASS, share + hut suites PASS, CDP visual probe (capsule/tab icons render as SVGs at 19px, hub badge carries the SVG, gacha pill + pull cost carry the SVG, zero target emoji left in the map/hub/gacha/daily/tab-bar surfaces). Device-final = Zoe.

## Q-396 - Dash open-only landing, capsules yield to the pin preview, hero tab goes home (2026-11-16)

Three device fixes from QA R219/R221/R223. (1) R219: Tokyo Dash was the only mini-game that auto-started from the hub (mgOpen called openRun + startRun), and startRun hides the start button while running - on Zoe's phone the run evidently stalled with no visible way in. mgOpen now lands Dash on the idle screen like every other game (start button visible; the player taps it), and openRun() cancels any orphaned rAF loop before resetting the run state, so an exit path that bypassed closeRun() can no longer leave a phantom loop driving a fresh screen. The iOS root cause of the stall itself is unproven (the full real path works in Chromium at phone sizes); the fix removes the trap either way. (2) R221: the Q-391 Daily Picks capsule (#recMapBtn) never joined the Q-206 yield - with a pin preview open it overlapped the preview's open button; mgYieldSync() now hides all three map capsules while #pinPreview is open. (3) R223 (Zoe: tapping 主人公 must return to the hero HOME, not the last un-closed window): switchView("hero") now closes any open hero sub-window via openHeroWin(null) before rendering. Scope is the hero tab only, per her words. Gates: syntax x6, bootprobe phone PASS, share + hut suites PASS, q396_probe ALL PASS via the real paths with physical taps (daily -> mg entry -> hub -> Dash row lands idle with the start button, tap starts and distance grows, re-entry lands idle again; pin tap opens the preview and all 3 capsules hide, close restores them; dock shop opens, 主人公 tab closes it back to the plain hero home). Device-final = Zoe.

## Q-399 - Catalog +50 batch (R227): 414 -> 464 (2026-11-16)

Zoe's order via QA R227 ("活动再加50个"). Research pass (official organiser/venue sources only, real-photo gate, dedupe vs the 414) produced 50 ready records c107-c156 (31 evergreen + 19 timed) and 2 photo-gate holds (Japan Traditional Crafts Aoyama Square - no real photo procurable; Meguro River Minna no Illumination - only photo depicts the spring sakura season, not the winter LED event). Highlights: Cup Noodles Museum, Snoopy Museum, Yushukan, Ueno Toshogu, UMUT, Seibuen, Suehirotei + Asakusa Engei Hall, Geidai Art Museum; timed: YORUNOYO, Yokohama Milight, Louvre at NACT, Hokusai Crossover, Odaiba Rainbow Fireworks, Conan Land (starts Dec 25). Applied as purely additive anchored insertions (EVENTS/VENUES/BLURB_ZH/LANG_ZH/EXT_CREDITS + 50 photos + PHOTO-CREDITS.md rows) with a byte-restoration gate proving nothing else moved. The batch's new mood tags were mapped into the existing 8 buckets (history/heritage/hidden-gem/shrine/temple/ukiyo-e/science -> treasure; design -> craft; illumination/night walk -> immersive; original art/photography -> pop; seasonal -> grand) - only tags no existing event uses, so existing filter behaviour is untouched; 'nature' stays descriptive-only (its event is covered by hidden-gem). EXT_CREDITS also backfilled for c104-c106 (refresh adds had only reached PHOTO-CREDITS.md). Flagged for Zoe: c152 Kahaku "Sex of Living Things" is a legitimate science exhibition but sex-themed - included, her call to pull; c126's price comes from a specialist guide (official ticket page fetch failed); c150's photo is 640px native (only licensable shot of the avenue). The batch's JA-map-unrecorded strings (29 hours / 9 price / 45 venue / lang rows) join the standing JA-map backlog. Gates: in-script (byte restoration, deep equality vs candidates, district/mood/date/bounds/photo checks), syntax x6, bootprobe PASS, share/hut suites PASS, CDP probe ALL PASS (EVENTS=464, districts resolve, detail + photo load for evergreen and timed newcomers).

## Q-395 - Route line moved to screen space (2026-11-16)

Zoe's device screenshot (via ops): the active LEGEND route rendered as fat lemon capsules, broken apart, with checkpoint 1 seemingly missing. Pixel check: the slugs are solid #FFD83D - the game's own lemon, i.e. the documented Q-162 fallback failure ("long glowing capsules floating apart") rendering on her iPhone, while Chromium renders the thin dashed line correctly through every code path (all zoom writers call applyZoom, which restyles). The line lived inside the zoom-scaled plane and depended on styleRouteLines() pinning JS-computed, zoom-compensated inline styles (unitless values) over a plane-unit CSS fallback; on her WebKit the compensation evidently does not hold. Structural fix, same pattern as the Q-180 dots: the line now lives in an SVG inside #pinLayer (screen space), its points re-projected in applyZoom with the same formula as the pins (projectRouteLines), and the stroke is plain CSS - 3.2px width, 6.5/5.5px dash, round caps - constant at every zoom by construction, with no compensation left to go stale or be dropped. Both static branches (active route + legend-filter mode) build percent sets via paintRouteLines(); #routeLayer keeps only the GL mode drawing (already screen-space, untouched). Checkpoint 1 was never missing in code: it is the is-next dot (black disc, lemon number) - it read as missing under the fat slug overlap; with the thin line it reads clearly. Gates: syntax x6, bootprobe PASS, route2_probe ALL PASS (line present in pinLayer, no polyline left in the plane layer, computed stroke 3.2px at boot/2.6/8, line points coincide with dot centres to the pixel, line follows a real drag pan, legend mode = 4 lines/21 dots, clearing the route removes the line). Device-final = Zoe.

## Q-394 - Filter unification: one state dimension, aligned list/map sheets (2026-11-16)

Zoe: "筛选逻辑很成问题" + QA R218/R226 audit. The old system had the state family split in two (a header cycle button 全部→行った→まだ that could not jump directly and had no 受注中， while "accepted only" hid as a toggle chip inside the sheet and on the map), an incomplete reset (kind/state/sort survived it), a sort cycle whose options silently changed by kind, and two surfaces (list sheet / map sheet) using different shapes for the same concepts. Now: ONE state dimension everywhere - filterState (list) and mapState (map) in all|todo|accepted|cleared, with a real picker row in both sheets (labels 全部/未受注/受注中/完了）. The header cycle button (#stateBtn) and the sheet's accepted toggle (#msAccepted) are deleted; the list header gains a one-tap #acceptedChip （受注中のみ · N, lemon when on) that toggles accepted<->all. The list sheet gains a TYPE row (all/timed/ever/epic - the EPIC filter Zoe asked QA for), sections ordered TYPE -> STATE -> category -> district -> mood -> free-only; districts replace the ~20 fine zones in BOTH sheets with per-district counts computed through the shared predicate boardMatch() under the other active filters (list and sheet counts can no longer disagree). Moods are single-select on the list too (matching the map). Reset clears EVERYTHING including kind, state and sort. The sort button: ever/epic kinds offer only "near" and a tap there now explains itself (new STR sortNearOnly x3) instead of silently doing nothing. Map sheet gains the same STATE row + TYPE/STATE section labels (mfKindHead/mfStateHead x3); mapCountFor/mapAreaCountFor respect mapState; LEGEND stays exempt from mood and area. Verified: QA's R226 point 6 has no literal code basis - map and list filter variables were always fully independent; nothing carries over. Deliberate deviation from mock v2: no keyword input row (Zoe's 2026-10-26 tap-only ruling stands; msQuery stays vestigial). Gates: syntax x6, bootprobe zero+phone PASS, test_q375_share + test_q380_hut ALL PASS, q394_probe ALL PASS (header chip toggles to the exact accepted count, sheet section order, epic = 10, district counts, mood single-select, full reset, sort explanation, map state row + badge). Probe note: the map sheet's spring transition does not advance in headless Chromium unless frames are pumped (screenshots), which masqueraded as a dead states row - the product was fine. Device-final = Zoe.

## Q-393 - First-run language gate (2026-11-15)

Zoe, with a reference screenshot of a restaurant ordering app: "like this - the first time you enter, you choose the language directly." New #langGate overlay: a cream card over the dimmed title screen - title, three radio rows (Chinese / Japanese / English, the reference's order), one confirm button whose label follows the selection. Shown at boot only when the player has never explicitly chosen a language (!explicitLang() && !state.langTouched); the pre-check follows the browser language. Tapping a row applies the language live via setLang (the title behind re-renders); confirm persists the choice, so the gate never returns. The title segmented control (Q-385) stays for later changes. Implementation notes: the gate markup sits in the markup zone before block 3 (the boot tail wires it, so it must be parsed first), and the gate functions are defined immediately before the boot init sequence - two attempts anchored inside setLang failed (its body runs long and its comments' apostrophes defeat naive brace scanners), which the bootprobe caught as "maybeLangGate is not defined". Also: state.started cannot gate first-run anything - the boot's own save init flips it before the boot tail. Gate probe (fresh profile): shows, pre-check = browser language, zh tap applies live + confirm label follows, confirm persists (tql_lang_choice), reload never re-shows - ALL PASS; bootprobe PASS. Device-final = Zoe (a fresh browser profile or a new device shows it; her current phone already has a stored choice).

## Q-392 - Save-image row shares the file via Web Share API (2026-11-15)

Zoe (via ops): saving a shared image on iOS landed in Files, not Photos - the save row used a plain download (a[download] + data URL). New helper shareCtxImageFile(): canvas -> blob -> File -> navigator.share({files}) when canShare allows, so the iOS sheet's Save Image action files it into Photos; on any non-abort failure, or where file sharing is unavailable, it falls back to the previous download. AbortError (sheet dismissed) reports a distinct "cancel" state: no grant, no error note, status cleared. The save row's success note is a new plain STR key shareSaved x3 (the old shareSavedNote copy - "attach it in the app that opened" - belongs to the composer rows). LINE / X / Threads rows keep their save-first download by design: their flow needs the file on the device to attach, and a share sheet mid-flow would break it. The system row already shared files since Q-375. Gates: test_q375_share ALL PASS (its stub gained the shareSaved key - the one initial FAIL was the stub asserting the old note on the save row), plus a branch test of the helper (resolve / abort / error / no-API / cannot-share) all correct. Device-final = Zoe saving a poster on iOS.

## Q-391 - Zoe device pass: house removed, list header wrap, daily fill, picks = daily set on the map (2026-11-15)

Five rulings from her 12:19-12:25 device burst. (1) The street house is REMOVED - it overlapped the hat equipment card (her circle + "don't want it"); the skyline stays, the hut entrance is the dock button only (again). (2) List header: Q-347's nowrap (1,2,0) had silently beaten Q-361's wrap rule (0,3,0), so long filter summaries overlaid the state button and clipped; wrapping restated at (1,2,0) with overflow-wrap:anywhere - the summary now wraps to two lines inside its slot. (3) The daily page fills the screen again: Q-381's panel hug is reversed (panel flex 1 1 auto at (1,1,0), window fills it); measured gap under the mini-game entry is 6px (was a full void). (4) Daily Picks are just the day's set: recEnsure draws 5 only on a fresh day and never refills; recRemaining is the deck itself (her entry had read "376 left"); the empty state no longer offers the redraw button. (5) The picks entry moves to the MAP home per her words: a #recMapBtn capsule in #mapCaps mirroring the mini-game capsule (dice icon, title, remaining-count chip flipping to a lemon check when done), present from game entry; the Q-388 auto-open on daily entry and the daily-page entry row are removed. Probe: map capsule + count, overlay from map, 5 skips -> empty with no refill and no redraw, capsule done state, daily no-auto-open + fill, list wrap - ALL PASS. Device-final = Zoe.

## Q-390 - Share sheet outranks the mini-game screens (2026-11-15)

Found while filming the share-features promo: from a mini-game result screen, the share sheet opened BEHIND the game window - invisible and untappable. The mg hub/game screens are .auth-screen overlays at z-index 640; the sheet (.map-pick) is z 80 and, the mg screens being plain divs rather than <dialog>, openSharePick hosts it in body. The Q-376 paint-verify's one-time re-host to body could not fix a stacking-level problem. Reproduced headlessly (hit-test at the sheet centre landed on the hub). Fix: #sharePick { z-index: 700 } - above every in-page overlay; native dialog hosts are top-layer and unaffected, and the celebration (200) and Daily Picks overlay (85) correctly stay under the sheet. Stack probe now hits inside the sheet; share unit tests and the poster-FAB probe pass. Device-final = Zoe (any mini-game result -> poster share).

## Q-389 - Title account row wraps: language seg gets its own line (2026-11-15)

Zoe (via ops, red-circled screenshot): on the title panel the login (red) and support (cream) pills were crushed to slivers spilling past the panel's left edge, labels clipped vertically. Cause: Q-385's wide language seg joined .start-acct-btns, a single-line flex row designed around the old small pill (Q-331); the seg claimed the row and the two flex buttons (1.3/1) collapsed. Fix (CSS only): the row wraps - the seg takes its own full-width first line (order -1, also the most prominent spot per her Q-385 intent), login/support share the second line at their designed ratio. Verified by geometry (seg 328 wide on its own line; login 180, support 140, all inside the panel; panel still ends at 830 on the 844 viewport) and a reviewed screenshot. Device-final = Zoe.

## Q-388 - Daily Picks become a full-screen first flow (Zoe Plan A, 2026-11-15)

Zoe's newer案 via the ops relay supersedes Q-386's in-page compact deck: on the day's first entry to the daily view the recommendations open as a FULL-SCREEN overlay (big card restored: photo 302px, stack 470px, blurb 3 lines); the player swipes through, then lands on the daily page, which now holds only the how-to fold, the streak, the daily quests and the mini-game entry plus a slim "Today's Picks" entry row (live remaining count, or a done state) that reopens the overlay. A red close button bails mid-deck. Auto-open fires once per day (state.recAutoDay, stamped in maybeOpenRec, hooked into switchView("daily") only - renderAll does not trigger it); re-entry the same day never auto-opens. Deck logic (pool/ensure/swipe) unchanged; renderRecDeck now also refreshes the entry row and the overlay title. Her Plan B (delete the dailies - scope unconfirmed) was NOT picked and stays untouched. Probes: overlay probe ALL PASS (auto-open with 5 cards, swipes register, close -> entry row with live count 280 -> 278, reopen via entry, exhaustion -> completion state + done entry row), daily_probe DONE, bootprobe + fits + share ALL PASS. The Q-383 rec_probe is superseded by rec_overlay_probe. Device-final = Zoe.

## Q-387 - Area filter in the map filter sheet (2026-11-15)

Zoe via the ops relay (placement corrected by her follow-up: the MAP filter sheet, not the list): the sheet gains a "pick by area" section under the mood row - ten districts grouping nearby neighbourhoods (her examples: Shinjuku/Ikebukuro, Ueno/Akihabara), single-select, tap again to clear, counts per chip, LEGEND exempt - all mirroring the mood row's mechanics (mapArea state, districtOf predicate in mapFilterMatch, mapAreaCountFor under the current type+mood, mapFilterIsDefault extended). Membership (DISTRICTS in block 3) covers all 133 catalog area strings exactly once - asserted by a build-time data gate (413 events). The scheme was presented to Zoe in the dev chat the same day; membership is data-only so regrouping stays a one-line change. Probes: area probe ALL PASS (10 chips with exact counts 64/59/41/54/40/26/27/51/16/35; tapping Ueno narrows the map to exactly 41, second tap restores 413), map probe DONE, bootprobe + fits + share tests ALL PASS. Device-final = Zoe.

## Q-386 - Daily Picks deck compacted so the daily page fits the first view (2026-11-15)

Zoe via the ops relay: the swipe deck takes too much vertical room - the how-to fold, the mini-game entry and the daily rows fall below the first view. Per her direction examples: card photo 178 -> 104px, blurb clamped to one line, tighter deck margins; stack 320 -> 224px. The how-to fold already defaults to folded. Swipe mechanics untouched (rec probe ALL PASS with real drags). Measured on the 844 viewport: deck bottom 371px, the daily window starts at 378px and the mini-game entry ends at 734px - the whole daily page (deck + how-to + streak + daily rows + mini-game entry) is now inside the first view. Device-final = Zoe.

## Q-385 - Title-screen language switch becomes a big segmented control (2026-11-15)

Zoe: the homepage language button is too inconspicuous - first-time visitors assume there is no Chinese/Japanese. The small pale globe pill (which opened the langPick popover) is replaced ON the title screen by a three-way segmented control - Japanese / ENGLISH / Chinese - at 14.5px with the current language in the same gold gradient the settings seg uses. It reuses the existing global [data-lang-opt] click wiring (setLang) and aria-checked refresh, so there are no new handlers; the old pill's label render was already null-guarded and its click listener is now guarded too (langPick itself stays in the DOM). First-run guidance: the seg carries a gentle lemon pulse ring until the visitor first switches language (state.langTouched, set inside setLang) or has a started profile (checked at wiring time). Probes: fresh-profile boot - seg visible, pulse ON, tapping the Chinese segment switches the whole UI (start button label changes), pulse stops; veteran save - no pulse. bootprobe zero/phone PASS, syntax x6 OK, test_q351_fits + test_q375_share ALL PASS. Device-final = Zoe.

## Q-384 - Wallpaper actually paints, share button recolored, hut dock button restored (2026-11-15)

Three Zoe device verdicts from her 2026-11-15 hut/detail screenshots. (1) WALLPAPER: she selected Mint Stripes - label and swatch ring updated - yet the room wall stayed flat pink ("wallpaper is unusable"). Root cause: the base room rule `#hsegHut .hut-room` has specificity (1,1,0); Q-381's theme rules `.hut-room.hut-wall-*` are (0,2,0) - an ID beats classes at any document order, so NO theme ever painted (the Q-381 probe asserted class + label, never pixels; the sakura check "looked right" only because the base is pink - the Q-340 trap again). Fix: all six theme backgrounds restated verbatim under `#hsegHut .hut-room.hut-wall-*` (1,2,0). Verified by PIXEL sampling this time: mint wall = #dff5e4, star = #2e4370, pink = #fbe7f0, exact theme bases. (2) SHARE BUTTON: the anytime re-share button (Q-376) inherited the pale rpg-btn grey and read as disabled (her red circle: "change the color, otherwise it looks un-tappable") - now lemon via `#btnClearShare`. (3) HUT BUTTON: Q-382's house-only entrance is too hard to find (her words) - the dock hut button is restored (records / gacha / shop / hut; dockNames + DOCK_PIX hut entries were still live); the street house remains as a second entrance. Probes: hut pixel probe (dock=4, hut opens from the dock button, per-theme screenshots sampled), street probe ALL PASS (house still opens the hut), hut_probe DONE, celeb_probe2 DONE (re-share leg intact), bootprobe + test_q351_fits + test_q375_share + test_q380_hut ALL PASS. Device-final = Zoe.

## Q-383 - Daily Picks swipe deck replaces the daily scene strip (2026-11-12)

Zoe: the daily view's decorative scene strip "seems useless - what else could it do?" She floated community herself; dev laid out the options against her 2026-10-27 no-community ruling and she PICKED today's-recommendation, then specified the form herself: Meetup/dating-app style left/right SWIPE, fully random, about five (「完全随机 推荐5个左右」, feature name 每日推荐). Mock `~/workspace/daily-swipe-mock-20261112.png` approved same day. Her pool ruling: evergreen and timed MIXED, but a timed quest may only appear while it is currently running. Her flow ruling: "5个画完就没了" - the deck must not dead-end, so it refills as cards are consumed.

- The scene strip `#dailyScene` is hidden (`display: none !important`); its markup/JS stay inert (reversible). The deck section `#dailyDeck` sits in its place inside `.daily-panel`, filled by `renderRecDeck()` at the end of `renderDaily()`. `#view-daily` gets `overflow-y: auto` in the same block so the taller content scrolls instead of clipping.
- Pool (`recPool`): not cleared, not accepted; evergreen always; timed only when start <= TODAY <= end (future/ended excluded). State: `recDay`/`recSeen`/`recDeck` - the deck resets daily; skipped and accepted cards join `recSeen` and do not repeat that day; the deck keeps 5 stacked and refills from the unseen pool; 换一批 (recShuffle) discards the current five into recSeen and redraws. When the unseen pool is exhausted, an empty card offers 再看一遍 (clears recSeen).
- Card: real photo, evergreen lemon tag / timed red tag with its end date, name (evName), category + area chips (+ free chip), 2-line clamped blurb (evBlurb), hours line; the next card peeks beneath (translate/scale only, no tilt). Actions: Skip / Want buttons mirror the swipes; drag is pointer-based with a 72px commit threshold and `touch-action: pan-y` so vertical page scroll survives; a tap (no drag) opens the quest detail. Want goes through the canonical `toggleAccept` (sfx + save + renders) plus an "ACCEPTED: <name>" narration. STR x3: recTitle/recEver/recTimed/recUntil/recFree/recSkip/recWant/recShuffle/recAgain/recEmpty/recLeft(n)/recAccepted(name).
- Verification: syntax x6 OK; bootprobe phone PASS; test_q351_fits + test_q375_share ALL PASS. NEW rec_probe (real CDP drags, not .click()): scene hidden, deck of 5 rendered; drag RIGHT -> accepted +1 and next card; drag LEFT -> no accept, next card; Want button -> accepted +1; tap card -> detail dialog opens. ALL PASS. Deck screenshots reviewed (photo/tag/chips/blurb/hours all inside the card; stack height raised 304->320 after the first shot clipped the hours line). daily_probe still completes DONE 844. Supersedes the unbuilt scene-growing relayout mock of the same day. Device-final = Zoe.

## Q-382 — The hut moves into the street scene + skyline backdrop (2026-11-12, Zoe)

Zoe approved the street mock ("来试试看"): the hut now stands IN the hero
street scene and the street itself is densified (she: "街景可以继续优化么
现在还是太简陋了"). Shipped: (1) a full skyline backdrop layer (.scene-
skyline, generated inline SVG: 12 varied buildings, window grids; day = soft
blue with pale windows, midnight = dark navy with ~38% of windows lit lemon —
the title scene's class-swap pattern; sun/moon repositioned to survive the
slice crop). (2) The house (#sceneHouse, classed .hs-wall/.hs-win SVG: red
stepped roof, star sign over the door, day cream / night slate walls, night
windows glow) stands on the left ground beside the road; tapping it opens the
hut. (3) The dock hut button is RETIRED (dock = records / gacha / shop) so
the hut has exactly one entrance. Two implementation lessons, both caught by
the physical-tap probe: the dock has its OWN click listener (the view-level
delegation does not cover [data-openwin] outside #heroDock), so the house
carries an explicit listener mirroring the dock's toggle semantics; and the
equipment slot columns' container boxes blanket the stage's left strip, so
the house sits BELOW the slot buttons (bottom:16%) with z-index 6 — its
centre hit-tests to the button itself. Probes: street_probe ALL PASS
(3 dock buttons, skyline present, physical tap opens hut, day + midnight
screenshots reviewed), hut probes at 667/844 and the wall probe pass through
the new entrance. Gates: syntax x6, test_q351_fits, test_q375_share,
test_q380_hut ALL PASS.

## Q-381 — Daily dead band removed + hut wallpapers x6 patterned (2026-11-12, Zoe)

Zoe, same burst: (1) her daily screenshot — a large blank band between the daily
window and the mini-game entry, "这中间的空白没什么用啊"; (2) "小屋壁纸没法换
再丰富一些". (1) Cause, measured by probe: #view-daily is a full-height flex
column and .daily-panel is flex:1 1 auto, so the panel grew past its content
and the leftover pooled between the window and #mgDailyBtn (gap measured
142px at 844). Fix: `#view-daily .daily-panel { flex: 0 1 auto; }` — panel
hugs content; post-fix probe gap = 10px (the button's own margin). (2)
Wallpapers: 3 flat gradients -> 6 PATTERNED themes (pink dots / mint stripes /
starry / sakura / cream plaid / lemon dots), painted as layered CSS gradients
over the same wall/floor split (star keeps its dark floor). The wallpaper row
moved ABOVE the storage tray (directly under the room + fill line) and its
label now shows the current wallpaper's name (STR hutWallPink/Mint/Star/
Sakura/Plaid/Lemon x3), so a tap has visible feedback; swatches preview the
real pattern (shared .wp-* classes). Verified with PHYSICAL taps in the hut
wall probe: 6 swatches render, star tap -> room class + label change, sakura
tap likewise (hut_wall_probe.mjs, ALL PASS). Gates: syntax x6, bootprobe,
test_q380_hut 7/7, test_q351_fits, test_q375_share ALL PASS.

## Q-380 — Hut optimization: 10 slots, 8 new furniture pieces (16 total), set/full/collection ticket rewards, wallpapers (2026-11-12, Zoe approved the design)

Built to the approved mock (hut-optimize-mock-20261112-v3). Slots 6 -> 10: wall w3/w4 mid-height at the sides, floor back row f5/f6 (bottom 24%, painted and hit-tested behind the front row — markup order window/w1..w4/f5/f6/f1..f4). Existing f1..f4 positions untouched, so saved placements do not move. Eight new pieces (art in hut_art2.py, preview sheet verified piece by piece): hut-tea Tea Table 340 / hut-cake Cake Stand 300 / hut-clock Wall Clock 220 / hut-frame Photo Frame 180 / hut-shelf Bookshelf 480 / hut-plant Leafy Plant 260 / hut-skyrug Starry Rug 280 / hut-flowerlamp Flower Lamp 260 — the shop hut tab and the collection shelf count pick them up automatically (probe shows 16 cells). Sets: HUT_SETS = tea (hut-tea + hut-cake) and star (hut-stars + the Lv.5 moon lamp hut-gacha); tray chips for set members carry a SET tag. hutCheckRewards() runs at the end of renderHut: set fully placed +1 ticket, all 10 slots filled +1, all 16 owned +2 — each latched once in state (hutSets / hutFullBonus / hutAllBonus) with its own narration (hutSetMsg / hutFullMsg / hutAllMsg, x3 languages). Wallpaper: state.hutWall pink/mint/star, three swatch buttons under the tray; the star theme swaps the wall to indigo and the floor to a darker wood via .hut-room.hut-wall-* overrides. Placement feedback: tapping a wrong-kind slot now shakes it (hut-shake) instead of silently doing nothing. A fill line (hutFill) shows placed n/10 under the room. Known wart: the w3/w4 dashed boxes overlap the f5/f6 boxes in the 46–57% band in edit mode, so a tap on a wall box's lowest strip can land on the back-row floor slot — the wall art itself sits clear of the overlap. Verified: syntax x6; bootprobe PASS; hut probes DONE at 844 and 667 (edit-grid and placed shots reviewed — grid reads as intended); test_q380_hut 7/7 (set/full/collection grants latch exactly once). Device-final = Zoe.

## Q-379 — Share-to-grow referral: card links and poster QRs carry the sharer's code; both sides earn a ticket (2026-11-12, Zoe's pick)

Zoe's diagnosis (2026-11-12): social spread and the tourist side are weak, users are not growing. Of the three product levers offered (referral / English landing page / tourist half-day route packs), she picked referral first. Mechanism: when a signed-in player shares any achievement/quest/mini-game card, the link in every share row AND the QR printed on posters encode https://tokyoquestlog.com/?ref=<their account uid> (new shareUrl() beside SHARE_URL; guests share the plain link — no account id exists to encode, the same logic as cloud saves). A new player landing with ?ref= keeps it on the save (first touch wins, UUID-validated, captured at block-3 eval; `ref` added to the auth URL cleaner's dirty list). On that player's FIRST quest clear, doClear grants +1 ticket once (state.refBonus) and folds the refWelcome line into the clear narration; doClear also pokes the referral sync. Registration and claiming live in block 4's tqlReferralSync() (called from the boot settle, the sign-in settle, and doClear): once the newcomer has an account and at least one clear, it inserts {referrer_id, referred_id} into the new Supabase table `referrals` (created 2026-11-12 via the dashboard SQL editor with RLS: referred inserts own row, referrer reads/updates own rows; referred_id UNIQUE — one credit per new account, first referrer wins; a 23505 answer latches refDone the same as success). The sharer claims at boot/sign-in: uncredited rows for their uid convert to ticketBonus +1 each with the refCredit(n) narration, rows are marked credited, lifetime cap 10 (state.refClaimed). Incidental fixes on the same pass: the quest-poster ctx previously carried NO url field at all (poster shares silently fell back to the bare link in the LINE row and an undefined url in the system share) — it now carries shareUrl(); the Threads and X intents now use ctx.url instead of the hardcoded SHARE_URL. Economy: the game is client-authoritative by design and the standing share rule already pays +10 for the first share ever, so the +1/+1 with a 10-cap and one-credit-per-account sits inside the existing honor system; self-referral registration is blocked (refFrom === uid never inserts). Strings x3: refWelcome, refCredit(n). State: refFrom/refBonus/refDone/refClaimed (defaults added; all reads defensive for old saves). Verified: syntax x6; test_q379_ref 13/13 (shareUrl forms, registration conditions incl. self/no-clear/no-repeat, claim math and the cap) — test_q375_share gained a shareUrl stub for its slices (harness drift, not product); bootprobe phone PASS; test_q375_share / test_q357_hosting / test_q351_fits ALL PASS; share/daily/celebration probes DONE clean. Device-final = Zoe: the end-to-end proof needs two accounts (share a card from one, join and clear from the other).

## Q-377 (2026-11-09) — R216 ROOT CAUSE: the celebration popover took no taps
Reproduced end-to-end in a real browser (celeb_probe2: veteran save,
GPS clear of Tokyo Station): the celebration panel PAINTED on top
of the detail dialog, :popover-open true, pointer-events auto —
yet document.elementsFromPoint at the share button's centre
returned ONLY detail-dialog elements. The open popover was absent
from hit-testing while fully visible; a programmatic click() on
the same button worked perfectly. Every tap, probe or finger, fell
through the visible panel — exactly Zoe's "弹出来的这个就是点不动",
and the reason Q-356/Q-357/Q-375 fixes (all downstream of the tap)
never changed her result: the tap never arrived.
Fix: the celebration no longer uses the popover API at all.
celebrate() always hosts the panel inside the open dialog when one
exists (the R34 fallback, promoted to the only path — dialog
children hit-test normally, as the dialog-hosted share sheet
proves), else as a plain fixed div in the body; a CSS rule raises
#celebrate to z-index 200 so the body form still tops non-dialog
overlays (legend screen, hero windows). endCelebrateQuiet's
celebHome re-homing already covered restoration; popHide no-ops.
Verification (physical CDP taps, not JS clicks): hitAtBtn =
BUTTON.cp-share (was DIV.kv-cols); after a physical tap on the
celebration share button: celebration dismissed AND share sheet
open with the 1080x1350 CLEAR poster preview; the Q-376 re-share
button likewise opens the sheet on a physical tap. Poster-path
share probe, daily probe, bootprobe, hosting/fits/share unit tests
all still pass. Device-final = Zoe, but this is the first build
where the failing leg itself reproduces — and passes — in a lab.

## Q-414 — Map + list merged into ONE browse view (Zoe, 2026-11-24)
Her thread: "Map上有个按钮可以选地图查看也可以选一览查看那种" → mock v1 (top pill) → "Map/一覧 放的位置有问题" → mock v2 (bottom-bar split tab) → she circled the LIST HEADER stack: "这里的设计逻辑我感觉还是有问题" → "你能参考一些别的App想想怎么设计么" → v3 (Airbnb/SUUMO pattern) approved "就按这个逻辑做".
- ONE fixed browse bar (#browseBar, shown only in map/list modes): funnel button (hosts the moved #searchSummary — "581件のクエスト · 上野" format) + [マップ|一覧] toggle (active = var(--primary)). syncBrowseBar() called from switchView, renderStaticText, and the sheet-close hook.
- ONE filter logic: mapFilterMatch(e) now returns boardMatch(e, filterArea, filterMood, "") — pins and rows always agree (probe: ueno 67 == 67). mapShownCount drops its legend branch.
- Retired: map FAB (#mfFilterBtn), map filter sheet + scrim (#mfFilterSheet/#mfScrim), map legend chip (#mapLegend) — legend dots' meaning now lives in the shared sheet's TYPE row labels; the 7 unguarded boot listeners for the sheet were existence-guarded. List header stack (title/search button/kind segs/saved chip) — the list keeps only its sort row (.list-sortrow with #sortBtn). #searchOpenBtn references repointed to #browseFilterBtn (sheet opener + focus fallback) or guarded (renderStaticText line replaced by syncBrowseBar()).
- Bottom bar back to five slots: #tab-list button removed; switchView guards missing tabs and marks tab-map selected in BOTH browse modes. updateLogTab() is now a no-op (saved count lives on tab-mine's badge alone).
- homeFilterDone (shared sheet close hook) now also renderMap()s / renderSearch()es whichever browse mode is up + syncs the bar, so closing the sheet from the map re-renders pins.
- List view gets top clearance for the fixed bar (padding-top: safe-area + 68px); the bar floats over the map (z 120, under coinToast 130).
- Inert-but-kept: mapFilter/mapState/mapMood/mapArea vars, mapFilterMatchAs/mapCountFor/mapStateCountFor/renderMfChrome/openMfSheet/closeMfSheets (all guarded or caller-less); the drawRouteOverlay legend-mode branch never fires (mapFilter stays "all").
- Probe q414 24/24 (real taps; entry via seeded save + Q-393 gate in JA; counts agree in both modes; filter set in list applies to map and vice versa; reset from map restores 581; bar hides off-browse; mine map-jump lands in map mode; EN relabels). Probe lessons banked: the gate's OK button overlays START's centre (a startBtn tap can be a gate tap); sheet chips may sit below the sheet's fold — scrollIntoView before tapping; wake map chrome (pokeMapUi) before tapping the tab bar off the map.

## Q-415 — Browse bar leaked onto the title screen (Zoe device report, 2026-11-24 17:12)
Her screenshot: the Q-414 bar painted over the title art. Cause: at boot data-view="map", and renderStaticText's syncBrowseBar() un-hid the bar while #startScreen was still up (the probe's boot-state note was misjudged as covered — her device is the court). Fix: syncBrowseBar shows the bar only when the start screen is hidden. Probe q415 6/6 (title hidden-state asserted before entry).

## Q-416 — Daily Picks capsule off the map + EPIC label retired (Zoe, 2026-11-24 17:13–17:14)
(1) 「今日推荐可以不要了」 over her map screenshot circling the 今日のおすすめ capsule: #recMapBtn markup removed from #mapCaps; deck code + state.recDeck data stay inert (preservation rule), all references were existence-guarded, maybeOpenRec has no callers. (2) 「怎么还有史诗的说法」 over the Mikado detail circling the ★史詩クエスト chip and the 史詩クエスト・限定装備 band: the EPIC tier stops being user-facing — stateBadges returns "", detail loses the is-epic theme class (normal header; period row shows again), pins lose is-epic (no gold dots/purple pins), list rows + advlog lose the EPIC tag/class, filter sheet kinds are all/timed/ever only, share text is the plain quest text, and the reward band is titled 限定装備 alone. Mechanics untouched: EPIC_SET quests still grant their limited gear and stay GPS-only (probe D4: no manual clear on Mikado). Probe q416 10/10; fits/share/hut suites + boot probes pass.

## Q-417 — Home streamlined: filter bar out, quick picks + seasonal shelf in (Zoe, 2026-11-24 17:39)
She approved the combined mock ("可以试试看") with two cuts: the top filter bar "好像用不到" and "尽量精简画面". Shipped: #homeFilterBtn and #homeSurprise removed (the random quick pick inherits the surprise logic verbatim); a 2x2 #homeQuick grid （もうすぐ終了/無料だけ/近くのエリア/おまかせ， ICONS cal/tag/pin/dice, lemon is-on state, tap-again clears) and the #homeShelf seasonal shelf (placement A as decided 17:12 — three soonest-ending timed quests within 14 days, season name from the month, hidden when nothing is ending). homePool is decoupled: all shared filter globals are neutralized inside the call, so the browse sheet's filters no longer leak into home recommendations; quick modes filter/re-sort on top (ending ≤7d by end date, free, near by distance). Nearby requests the position only on tap into the in-memory sortPos (never saved), failures surface via showCoinMsg with the sort strings. Probe q417 11/11; fits/share/hut suites + boot probes pass.

## Q-418 — Home scene strip removed (Zoe, 2026-11-24 17:59)
She circled the whole strip (hero + bubble + Lv/ticket HUD) on her device: "这个不需要感觉占地方". Markup and the two unguarded bubble paints removed; the guarded HUD/scene/canvas paints in renderHome no-op; bubble STR strings stay inert. The home now opens straight at the quick picks.

## Q-419 — Recommendations fold behind one button (Zoe, 2026-11-24 18:00)
Her words: "あなたのおすすめ可不可以做成按钮，按一下然后再蹦出来这种". The rec head/list/see-all now live in #homeRecBody behind a chunky #homeRecToggle （あなたへのおすすめ ▼, lemon when open, chevron flips); opening plays a recPop keyframe (rise + slight overshoot). Default folded (homeRecOpen=false). Quick picks auto-open the fold when a mode engages; shuffle + see-all moved inside. Probe q419 10/10 (the one initial FAIL was the probe tapping see-all below the scroll fold; scrollIntoView first, then it passed — product was right).
- Q-420 (2026-11-25): Zoe's device burst — detail save becomes ONE icon: the 保存済み head pill's saved branch and the wide action-grid save button are deleted; a bookmark FAB (.save-fab, right:58px) sits beside the share FAB on the photo — navy/off, lemon/on, hidden when cleared; stateBadgeOnly keeps only the CLEAR badge. Home fold: the lone 別の3件 chip row is gone — shuffle now pairs with See-all in a twin-button foot row BELOW the cards (equal height/border/shadow). My List: the 行きたい section head (label of the only section) removed with its paint. Probe q420 10/10. HEAD at build: ac4a2d4.
- Q-421 (2026-11-25): My List collections (Zoe's idea, approved from mock v2) — state.lists [{id,name,items}]; default list "want" （行きたい) always first and receives all quick saves; state.saved stays the union (isSaved/filters/badge untouched); ensureLists() enforces one-home-per-quest with orphans landing in want. Mine view: chips row (name+count, active lemon) + ＋新規リスト； cards gain 移動 → list-picker sheet; custom lists get a manage row （名前を変更/リストを削除 — delete returns quests to 行きたい）; 友達に送る shares the ACTIVE list under its name (poster header shrinks to fit). Probe q421 13/13. HEAD at build: 46de96d.
- Q-422 (2026-11-25): ICONS.pin redrawn — the pushpin silhouette read as a black blob at 20px (Zoe circled it on the near quick-pick); now a location pin with a punched centre hole (evenodd, target/tag language); both consumers (home quick pick, check-in button) inherit it. Map default range halved (Zoe: "默认的这个太大了 / 再范围缩小", echoing her 2026-11-24 "地图默认页再大点儿"): goHomeView fit scale ×2 — measured default span 0.350° → 0.175° lng, s=2, far dot band, Yamanote core framed (Ikebukuro–Shinjuku–Shibuya–Ueno–Ginza), plane still covers. Probe q422 4/4. HEAD at build: 2f59637.
- Q-423 (2026-11-25): rec fold anchors on open (Zoe: "这样还是得往下滑" — the open fold overflowed the home view by ~277px). homeRecAnchor() scrollIntoView(block:start, smooth) fires when the fold opens via the toggle or a quick pick; the scroll clamps at max range, landing the whole block (toggle + 3 cards + foot pair) inside the view with the shelf edge peeking above. Probe q423 4/4 (foot bottom −20px vs view bottom). HEAD at build: 3157e65.
- Q-424 (2026-11-25): save picks its list (Zoe: "保存quest的时候选择保存到哪里") + home layout polish (her "能再调整下布局之类的么"). saveFlow(): unsave = one tap; only-default-list = one tap; custom lists exist -> the save tap opens #listPick in save mode (title mineSaveTo, rows = lists + ＋新規； picking ＋新規 opens the create form and the quest lands in the new list). Sheets re-host into an open <dialog> via hostSheet() (mapPick pattern) so they work from the detail FAB too; pickList also unions state.saved + syncMineBadge + renderHome; completion callbacks repaint the originating context. Move mode unchanged. Polish: .hs-name is a fixed 30px two-line block with shrink-to-fit (floor 8.5px, line-height tightens under 10px) — chips align on one line, names never ellipsis-truncate; homeMetaHTML wraps the date range in .meta-dates (nowrap) so card meta breaks only at " · " separators. Probe q424 11/11. HEAD at build: 41d7863.
- Q-425 (2026-11-26): daily-refresh carryover applied by dev — c60-kabukiza-kaomise-2026 deleted (ended 2026-11-25, official Kabukiza page confirmed). The 2026-11-26 refresh run verified the ending but its git operations were blocked by an execution-risk check, so nothing was published; dev applied the deletion via the normal pipeline. Removed EVENTS + VENUES + BLURB_ZH + LANG_ZH rows (no PIN_NUDGE entry, no LEGEND refs); image file stays per precedent; VENUE_JA/ZH "Kabuki-za Theatre, Ginza" entries left orphaned for the JA-map pass. Catalog 583 -> 582. Gates: node --check, fits suite, share suite, bootprobe zero/phone PASS; extract-events confirms 582, c60 absent. HEAD at build: f71f2b6.
- Q-426 (2026-11-26): homepage redesign per the redesign brief Zoe pasted, built locally first and approved from screenshots ("这一波（首页+桌面）先上线"). Header: tagline + keyword search bar (reuses the msQuery engine; submit lands on the filtered list). Quick picks slimmer with per-button tints, JA labels 無料イベント/近くで探す. Seasonal shelf becomes a horizontal carousel, day chip on the photo. Recommendations always open (the Q-419 fold is retired: homeRecToggle/homeRecOpen/homeRecAnchor removed). New area-tiles section (Asakusa/Shibuya/Ikebukuro/Ueno/Shinjuku/Akihabara with live counts; Shimokitazawa swapped out, only 1 quest). Centre-tab outline 3px -> 2px flush, mine badge smaller. Robustness: moodList() normalises the three batch-600 events (c249/c253/c263) whose mood is a comma string — (e.mood||[]).join threw on them, a path unreachable until the search bar set a query. Probe q426 9/9. HEAD at build: 2edd755.
- Q-427 (2026-11-26): desktop layout >=900px (Zoe approved the UI/UX-audit triage scope "桌面版也要，一起规划"). CSS-only media query appended last: .wrap 440 -> 780px; home quick picks 4-across, shelf cards cap 300px, recommendations two-up, area tiles 6-across; list + mine results two-column grids (legend cards span the row); browse bar centred at 756px; quest detail becomes a centred sheet 680x880 (detail-win fills it, the viewport-height rule overridden); tab bar 424 -> 560px. Two cascade losses caught by probe and restated at winning specificity (#view-home .home-rec-list, body[data-view] .tabs). Phone regression: q426 probe 9/9 + fits suite PASS. Probe q427 9/9. HEAD at build: 748e990.
- Q-428 (2026-11-26): ZH localization backlog filled (audit wave 2, Zoe approved scope 2026-11-26): VENUE_ZH +179, HOURS_ZH +147, PRICE_ZH +64 distinct strings, LANG_ZH +13 events — every venue/hours/price/lang value used by live events now has a Chinese row; gap scan re-run = 0 across all five maps. Conventions matched to existing rows (institution names in Chinese, area suffix dropped, Pokémon→宝可梦， compact hours, 一般/成人/学生 kept in prices). JA value maps still owe the same 179/147/64 (dev backlog, not yet a wave).
- Q-429 (2026-11-26): homepage refinement deltas from Zoe's second redesign brief (the bulk of that brief already shipped as Q-426; the brief also settled the same-day design-system question — preserve the brand, no minimal overhaul): brand subtitle under the tagline (the approved poster line, 3 languages), search placeholder aligned to the brief (イベント・スポットを探す), the seasonal shelf leaves its bordered box (plain section head, season as muted text), shelf See-all pill lands on the list with the timed filter on (170 quests).
- Q-430 (2026-11-26): My List share button is disabled + dimmed when the active list has nothing shareable (audit small-item; renderMine syncs it from the visible-items count).
- Q-431 (2026-11-26): seasonal carousel pagination dots (Zoe: users would not realise it scrolls sideways) — one dot per shelf event under the row, active dot follows the scroll position; hidden when the shelf has fewer than 2 events.
- Q-432 (2026-11-26, shipped 2026-11-27): home subtraction pass on Zoe's own eight-point list — quick picks become ONE row of text-only light chips (pastel tints retired; selected = red border + pale red fill only); border diet to 1.5px soft borders + soft/no shadows across search, cards, area tiles, browse bar and the tab bar; type hierarchy (tagline 22px, section titles 15px, card names 14/700, meta lighter); the seasonal shelf becomes full-card paging (one whole card per page: 16/10 photo, day chip, name, area line in fixed positions; Q-431 dots stay as page dots); nav slimmed (centre tab 65→58px and less raised, lemon outline removed, the ▶ selection cursor before the selected tab label removed at Zoe's word, selected block inset by margins); home bottom cushion so the last card scrolls clear of the bar (probe-verified).
- Q-433 (2026-11-27): daily-refresh carryover applied by dev (refresh job still git-blocked; same pattern as Q-425) — c76-bocchi-the-rock-popup-winter-atre-akihabara deleted (ended 2026-11-26, COSPA official confirmed); c292-nezu-horu-urushi added (Nezu Museum 「彫る漆」, 2026-12-05 → 2027-01-17, officially verified, photo from the official press PDF, eg4 venue/coords and existing hours/price/lang strings reused — ZH gap scan stays 0). Catalog stays 582.
- Q-434 (2026-11-28): font + chip refinement (Zoe via ops: 「这种字体有问题。标签可以更精细化更好看一点」 on the search/chip/shelf-head area). Root cause: the Google Fonts request only loaded M PLUS Rounded 1c 700/800 (Baloo 700/800, Noto Sans SC 700/900), so every 400/500/600 request silently snapped to 700 — the Q-432 lighter hierarchy never existed on device, and the search input was explicitly 700 so its placeholder rendered bold. Fix: load the real 400/500 weights (Baloo 500/600, Noto 400/500); search input/placeholder to 500 with a softer placeholder colour; chips to hairline 1px borders + weight 500 (selected = 1px red border, pale fill, 600); shelf See-all pill the same treatment; section heads to a real 700; sub/season/meta to a real 500; -webkit-font-smoothing: antialiased for iOS.
- Q-435 (2026-11-28, Zoe approved the rev4 prototype 「就按这个建」): seasonal shelf + recommendations merged into ONE swipe feed — one heading, one See-all, shelf cards carry a bordered 期間限定 mini-tag + day chip, rec cards a short reason chip, recs exclude shelf ids, every card keeps a corner save button (ICONS.bookmark); the shuffle pill is retired. Alignment pass per Zoe's correction (not thinness — alignment and too-plain labels): quick chips carry their icons again as a centred icon+label group in fixed 36px cells sized to fit (no clipping), the feed head is one centred row with a fixed 30px See-all, card meta is a flex row with the tag on the area's baseline. Map default zoom is now s=8, the street/photo-pin level from Zoe's own device screenshot (goHomeView; RESET returns to the same view), superseding Q-422's halved range. Ships together with Q-434.
