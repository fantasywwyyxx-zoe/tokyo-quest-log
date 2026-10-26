# Tokyo Side Quests

把东京小众、艺术向的真实活动变成 GBA 像素 RPG 支线任务的网页游戏（PWA）。
公开版：https://fantasywwyyxx-zoe.github.io/tokyo-side-quests/

## 给所有协作者（人或 AI）：先读这里
开工顺序：`COMPANY.md` → `ROADMAP.md` → `TASKS.md` → `DECISIONS.md` → `HANDOFF.md`（最新一条）。
收工前更新 `HANDOFF.md` 和 `TASKS.md` 状态。拍板人是 Zoe；文件里没写的事不要猜，列成问题。

## 目录
- `index.html`（根目录）：**线上发布版**，GitHub Pages 直接serve 这个文件。不要手动改它——它是从源码构建导出的；改游戏请改 `src/`，再走发布流程。
- `src/`：游戏源码快照（单页 `index.html` + `assets/` + `space.json`）。注：源码的主维护环境是 Muse 的 artifact 工作区（见 `src/AGENTS.md` 的构建说明），这里的快照用于版本记录和外部审查；TSQ 侧的最新修改会持续同步进来。
- `COMPANY.md` / `ROADMAP.md` / `TASKS.md` / `DECISIONS.md` / `HANDOFF.md`：共享真相源（公司大脑）。
