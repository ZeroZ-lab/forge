# Robot Simulation — Changelog

## v1.5 — 2026-05-24 (Round 15)

- **新增**: 数据导出 (exporter.js) — 导出仿真状态（机器人、统计、轨迹）为 JSON 文件
- **决策**: 使用 Blob + URL.createObjectURL 触发下载，下载后自动释放
- **影响**: +exporter.js, sim-engine.js (onExport callback), controls.js (export button)

## v1.4 — 2026-05-24 (Round 14)

- **新增**: 粒子特效 (particles.js) — 碰撞红色火花 + 航点到达青色爆炸
- **决策**: 粒子上限 200，FIFO 丢弃最老的，世界坐标绘制（受相机变换影响）
- **决策**: 粒子位置和机器人位置使用相同坐标系（grid * cellSize），保持一致性
- **影响**: +particles.js, renderer.js (drawParticles in world space), sim-engine.js (spawn + update)

## v1.3 — 2026-05-24 (Round 13)

- **新增**: 音效系统 (sound.js) — Web Audio API 合成音效，碰撞 beep + 航点到达双音
- **决策**: 默认静音（需用户主动开启），AudioContext 延迟初始化，碰撞音效 100ms 节流
- **影响**: +sound.js, sim-engine.js (collision/waypoint sound triggers), controls.js (sound button)

## v1.2 — 2026-05-24 (Round 12)

- **新增**: 缩略地图 (minimap.js) — Canvas 右上角总览，显示机器人、航点、视口框
- **决策**: 固定尺寸 160×120px，世界坐标按比例缩放，点击缩略图可跳转相机位置
- **决策**: 缩略图点击优先级高于航点设置（避免误设航点）
- **影响**: +minimap.js, renderer.js (drawMinimap at end), sim-engine.js (minimapConfig + click handler)

## v1.1 — 2026-05-24 (Round 11)

- **新增**: 相机视口 (camera.js) — 滚轮缩放 + 中键拖拽平移
- **决策**: 屏幕坐标与世界坐标分离，renderFrame 应用相机变换后绘制世界，HUD 在重置变换后绘制
- **决策**: canvasClickToGrid 接受 camera 参数，点击坐标先转世界坐标再转网格坐标
- **影响**: +camera.js, renderer.js (applyCameraTransform), sim-engine.js (setupCameraControls), waypoints.js (camera param)

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
