# Robot Simulation — Changelog

## v1.0 — 2026-05-24 (Round 10)

- **新增**: 帮助面板 (help.js)，H 键打开
- **影响**: +help.js, sim-engine.js (H/Esc 键监听)

## v0.9 — 2026-05-24 (Round 9)

- **新增**: 暗色/亮色主题切换 (theme.js)
- **决策**: CSS 变量动态切换，localStorage 持久化
- **影响**: +theme.js, style.css (light theme vars), controls.js (theme button)

## v0.8 — 2026-05-24 (Round 8)

- **新增**: 轨迹录制回放 (recorder.js)
- **决策**: 每帧快照所有机器人状态，回放时逐帧恢复
- **影响**: +recorder.js, sim-engine.js (record/playback in loop), controls.js

## v0.7 — 2026-05-24 (Round 7)

- **新增**: 统计面板 (stats.js) — 距离、碰撞次数
- **决策**: 每帧累加位移，碰撞状态 false→true 计数
- **影响**: +stats.js, sim-engine.js, controls.js (robot card)

## v0.6 — 2026-05-24 (Round 6)

- **新增**: 多机器人避障 (flock.js)
- **决策**: O(n²) 两两检测，碰撞时沿连线推开
- **影响**: +flock.js, sim-engine.js (post-loop collision resolve)

## v0.5 — 2026-05-24 (Round 5)

- **新增**: A* 寻路 (pathfinder.js)
- **决策**: 8 方向移动，曼哈顿距离启发式，对角线检查防穿墙
- **影响**: +pathfinder.js, renderer.js (path layer), sim-engine.js

## v0.4 — 2026-05-24 (Round 4)

- **新增**: 轨迹尾迹 (trail.js)
- **决策**: 每 3 帧记录，最多 200 点，渐变透明度
- **影响**: +trail.js, renderer.js (trail layer), sim-engine.js

## v0.3 — 2026-05-24 (Round 3)

- **新增**: 航点系统 (waypoints.js)
- **决策**: 点击 Canvas 设置，FIFO 队列，到达后自动切换
- **影响**: +waypoints.js, renderer.js, sim-engine.js (canvas click + steering)

## v0.2 — 2026-05-24 (Round 2)

- **新增**: 自主漫游 (autopilot.js)
- **决策**: lidar 驱动避障，前方 2 格内有障碍则转向，随机方向变化
- **影响**: +autopilot.js, sim-engine.js, controls.js (autopilot button)

## v0.15 — 2026-05-24 (Round 1)

- **新增**: 激光雷达传感器 (lidar.js)
- **决策**: 12 条射线 360°，最大 5 格，slab method 射线交叉
- **影响**: +lidar.js, renderer.js (lidar layer), sim-engine.js

## v0.1 — 2026-05-24

- **新增**: 项目初始化
- **决策**: Canvas 2D + Vanilla JS（零依赖，重建友好）
- **决策**: 游戏循环架构（update → render → input）
- **决策**: 暗色实验室主题 + 青绿强调
- **影响**: project.md, DESIGN.md, frontend/contract + 5 modules, plan.md
