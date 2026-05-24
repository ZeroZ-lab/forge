# Robot Simulation — Frontend Contract

> 纯前端 Canvas 仿真，组件驱动

## 前端决策

### F1: 框架 — 无框架

- **选择**: Vanilla JS + ES Modules
- **理由**: Canvas 渲染不需要虚拟 DOM，仿真逻辑用纯函数即可
- **拒绝**: React（Canvas 应用不需要 JSX/reconciliation）; Svelte（引入构建步骤）

### F2: 状态管理 — 单一可变对象 + 事件回调

- **选择**: 引擎持有 SimState 对象，UI 通过回调函数订阅变化
- **理由**: 状态变化频率高（每帧），不适合响应式框架。回调足够通知 UI 更新
- **拒绝**: Redux（过重）; Proxy 响应式（无必要复杂度）

### F3: 样式 — 纯 CSS + CSS Variables

- **选择**: 原生 CSS 文件，设计系统的 token 用 CSS 自定义属性定义
- **理由**: 设计系统已用 CSS 变量定义，Canvas 部分不用 CSS 样式，控制面板元素少
- **拒绝**: Tailwind（无构建步骤）; CSS-in-JS（无 JS 框架）; SCSS（无构建步骤）

### F4: 数据获取 — 不适用

- **选择**: 无数据获取，全部状态在本地
- **理由**: 纯前端仿真应用

### F5: 表单 — HTML input 元素直接绑定

- **选择**: 滑块用 `<input type="range">`，数字用 `<input type="number">`，直接监听 input 事件
- **理由**: 参数少（<5个），无需表单库
- **拒绝**: Formik/Yup（无表单验证需求）

## 共享约束

- 渲染帧率 ≥ 60fps
- Canvas 自适应窗口大小（resize 事件重绘）
- 键盘快捷键（空格=播放/暂停，R=重置）
- 窄屏（<768px）控制面板折叠为底部栏

## 技术选型表

| 类别 | 选择 | 理由 |
|------|------|------|
| 渲染 | Canvas 2D | 2D 仿真标准 |
| 框架 | 无 | Canvas 应用不需要 |
| 状态 | 可变对象 + 回调 | 高频更新场景 |
| 样式 | CSS Variables | 设计系统 token |
| 控件 | HTML input | 参数少，直接绑定 |

## 模块索引

| 模块 | 文件 | 职责 |
|------|------|------|
| sim-engine | modules/sim-engine.md | **入口** — 游戏循环、编排、事件绑定 |
| robot | modules/robot.md | 机器人状态、移动、碰撞 |
| renderer | modules/renderer.md | Canvas 绘制（编排调用顺序见 contract.md） |
| map | modules/map.md | 网格、障碍物 |
| controls | modules/controls.md | 控制面板 UI + DOM 事件 |
| lidar | modules/lidar.md | 激光雷达传感器 |
| autopilot | modules/autopilot.md | 自主漫游 AI |
| waypoints | modules/waypoints.md | 航点系统 |
| trail | modules/trail.md | 轨迹尾迹 |
| pathfinder | modules/pathfinder.md | A* 寻路 |
| flock | modules/flock.md | 多机器人避障 |
| stats | modules/stats.md | 行驶距离 + 碰撞统计 |
| recorder | modules/recorder.md | 轨迹录制回放 |
| theme | modules/theme.md | 暗色/亮色主题切换 |
| help | modules/help.md | 帮助面板 |

## 模块依赖图

```
                    sim-engine.js (入口)
                    ├── map.js
                    ├── robot.js
                    ├── autopilot.js
                    ├── waypoints.js
                    ├── pathfinder.js
                    ├── flock.js
                    ├── stats.js
                    ├── trail.js
                    ├── recorder.js
                    ├── renderer.js ──→ lidar.js, waypoints.js, trail.js, pathfinder.js
                    ├── controls.js
                    ├── theme.js
                    └── help.js
```

## 代码映射

```
engine/       → sim-engine.js（游戏循环 + 物理）
entities/     → robot.js（机器人）
rendering/    → renderer.js（Canvas 绘制）+ map.js（网格/障碍物）
ui/           → controls.js（控制面板）
styles/       → style.css（全局样式 + 设计 token）
```
