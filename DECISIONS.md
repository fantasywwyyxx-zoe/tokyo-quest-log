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
