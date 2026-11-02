# DECISIONS.md — 决策记录（公司大脑 · 4/5）

> 只记已拍板的。最新决定覆盖旧决定时，旧条目标注「已被 YYYY-MM-DD 决定取代」，不要删。

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
