# QA 立案 Q-114 · 2026-10-29 · S1（Zoe 实机回归：多窗滑到一半滑不动）

## 实机证据（Zoe，iPhone / Muse app webview，构建 422af00）
- 主人公カスタム窗：滑到表情行停住，下半截够不到（Zoe 注解截图，经开发部转达）。
- Zoe 原话补充：「很多界面都是滑到下面滑不动了」——共用窗容器一族，非单窗。

## QA 结构量测（CDP，390×600，422af00）
- 窗族结构：主人公页各窗为整屏 section 自滚——#hsegCustom（カスタム）/#hsegGacha/#hsegStudio/#hsegStatus/#hsegBadges/#hsegCollection/#hsegAdvlog，均为 overflow-y:auto 的满视口滚动区；另加首次创建器 #creatorScroll 与详情页 .detail-body。
- 例：#hsegStudio 在 390×600 下 scrollHeight 3400 / clientHeight 600，内容远超一屏，靠 section 自身滚动。
- 根元素上 --vvh 已生效（实测 600px）——即 qa2 的 J 项（Q-111)visualViewport 变量在全局运行，与开发部怀疑方向一致（是否泄漏进窗族高度链由开发部诊断，QA 不动代码）。
- **CDP 与实机的差（如实记录）**：Chromium 里程序化滚动该族一直可达（第 5 轮曾在 390×600 量测 creator 可滚），与 Zoe 手指滚动中途卡死不一致——此分歧本身就是本件的核心事实：实验室通过≠实机通过，本件**最终裁定以 Zoe 实机为准**，QA 复测只做几何回归对照。

## 复测矩阵（修复 commit 到达即开轮）
窗族逐窗 × 390×667/390×600：开窗→滚到底→末元素完整可见量测（scrollHeight/clientHeight/最末子元素底边 vs 容器底边），并与本文件基线对照；详情页复带 Q-111 三档余量不回归。
