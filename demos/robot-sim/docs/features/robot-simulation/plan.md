# Robot Simulation — Plan

> MVP 执行计划，从文档到可运行代码

## 模块依赖图

```
map.js ─────────┐
                 ├──→ renderer.js ──→ controls.js
robot.js ───────┘          │
                 sim-engine.js (编排层)
```

- map.js, robot.js: 无依赖，可并行
- renderer.js: 依赖 map.js + robot.js 的数据模型
- controls.js: 依赖 sim-engine.js 的接口
- sim-engine.js: 编排层，依赖所有模块

## 任务列表

### T1: 骨架 — HTML + CSS 布局
- **目标**: 搭建页面骨架，Canvas 区域 + 控制面板 + 状态栏
- **文件**: `src/index.html`, `src/styles/style.css`
- **步骤**:
  1. 创建 index.html，包含 canvas、control-panel、status-bar 三个区域
  2. 创建 style.css，定义 CSS 变量（从 DESIGN.md token 映射）
  3. 实现布局：Canvas flex:1 + 控制面板 280px 右侧 + 状态栏底部 32px
  4. 加载 Google Fonts (Inter + JetBrains Mono)
- **验证**: 浏览器打开，看到正确的三栏布局和设计系统颜色
- **文件数**: 2

### T2: 网格渲染
- **目标**: 在 Canvas 上绘制网格地图
- **文件**: `src/rendering/renderer.js`, `src/entities/map.js`
- **步骤**:
  1. 实现 map.js: createGrid(), isInBounds()
  2. 实现 renderer.js: initRenderer()（Canvas 初始化 + DPR 处理）
  3. 实现 drawGrid(): 绘制网格线 + 坐标标记
  4. 在 index.html 中 import 并调用，显示 20×15 网格
- **验证**: 浏览器看到 20 列 × 15 行的网格，有坐标标记
- **文件数**: 2

### T3: 机器人渲染
- **目标**: 在网格中心绘制一个静态机器人
- **文件**: `src/entities/robot.js`, `src/rendering/renderer.js`
- **步骤**:
  1. 实现 robot.js: createRobot()，默认位置 (10, 7) heading 0°
  2. 实现 renderer.js: drawRobot()，三角形 + 方向线 + 发光
  3. 在 Canvas 上渲染一个静态机器人
- **验证**: 网格中心看到青绿色三角形机器人
- **文件数**: 2

### T4: 游戏循环 + 移动
- **目标**: 实现游戏循环，机器人自动前进
- **文件**: `src/engine/sim-engine.js`, `src/entities/robot.js`
- **步骤**:
  1. 实现 sim-engine.js: initSimState(), startLoop(), stopLoop(), update()
  2. 实现 robot.js: moveForward()，使用 heading 和 speed 计算位移
  3. 默认行为：机器人持续前进
  4. 边界检测：碰到边界停止（isInBounds 检查）
- **验证**: 点击开始后机器人沿 heading 方向移动，到边界停止
- **文件数**: 2

### T5: 控制面板 + 键盘
- **目标**: 控制面板按钮和键盘控制机器人
- **文件**: `src/ui/controls.js`
- **步骤**:
  1. 实现 controls.js: createControlPanel()，生成 DOM 结构
  2. 绑定按钮事件：播放/暂停/重置/单步
  3. 绑定键盘：空格=播放/暂停，R=重置
  4. 实现速度滑块：setSpeed() 影响 update 频率
  5. 实现 updateControlPanel()：每帧更新状态显示
- **验证**: 按钮和键盘都能控制仿真，速度滑块有效
- **文件数**: 1

### T6: 障碍物 + 碰撞
- **目标**: 放置障碍物，机器人碰到后停止
- **文件**: `src/entities/map.js`, `src/rendering/renderer.js`, `src/entities/robot.js`
- **步骤**:
  1. 实现 map.js: placeObstacle(), isOccupied(), generateRandomObstacles()
  2. 实现 renderer.js: drawObstacle()，绘制障碍物方块
  3. 实现 robot.js: checkCollision()，检测与障碍物碰撞
  4. 初始状态随机生成 10 个障碍物
  5. 碰撞时机器人变红 (colliding = true)
- **验证**: 地图上有障碍物，机器人碰到后停止并变红
- **文件数**: 3

### T7: 数据面板 + 多机器人
- **目标**: 实时显示机器人信息，支持多个机器人
- **文件**: `src/ui/controls.js`, `src/engine/sim-engine.js`, `src/entities/robot.js`
- **步骤**:
  1. 实现机器人数滑块：动态添加/移除机器人
  2. 新机器人随机分布在空闲位置
  3. 控制面板显示每个机器人的坐标和朝向（每帧更新）
  4. 实现地图大小配置：修改行列数后重置
- **验证**: 可以添加多个机器人，信息面板实时更新
- **文件数**: 3

### T8: 收尾打磨
- **目标**: HUD、状态栏、响应式、细节优化
- **文件**: `src/rendering/renderer.js`, `src/styles/style.css`, `src/index.html`
- **步骤**:
  1. 实现 drawHUD(): Canvas 左上角显示 FPS + tick
  2. 状态栏显示当前状态（运行中/暂停/停止）
  3. 响应式：窄屏（<768px）控制面板折叠为底部栏
  4. 窗口 resize 时重绘 Canvas
- **验证**: HUD 显示帧率，状态栏正确，缩窄窗口时布局切换
- **文件数**: 3

## 并行化矩阵

| 任务 | 可并行 | 原因 |
|------|--------|------|
| T1 | 无 | 基础骨架 |
| T2, T3 | 并行 | 无共享文件（T2 改 renderer + map，T3 改 robot）— 但 T3 需要 renderer.drawRobot，实际串行更安全 |
| T6 | T6 的三个文件与 T4/T5 无冲突 | 可以提前开始 |

## 关键路径

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

所有任务有渲染依赖链，关键路径为全串行。

## 检查点

- **T4 完成后**: 人工确认 — 机器人能移动，游戏循环正常
- **T6 完成后**: 人工确认 — 障碍物和碰撞检测正确
- **T8 完成后**: 最终验收

## 验证方法

所有任务: 浏览器直接打开验证（纯前端，无自动化测试）
