# Robot Simulation — Feature Contract

> 2D 俯视机器人仿真，可视化运动、感知和控制

## 共享约束

- 渲染帧率 ≥ 60fps（见 project.md 性能指标）
- Canvas 自适应窗口大小
- 键盘快捷键：空格=播放/暂停，R=重置
- 暗色主题 + 青绿强调（见 DESIGN.md）

## 领域索引

| 领域 | 目录 | 状态 | 模块数 |
|------|------|------|--------|
| Frontend | frontend/ | v1.0 | 5 |

## 仿真核心概念

- **Grid**: 二维网格地图，由可配置的行数和列数定义
- **Robot**: 有位置 (x,y)、朝向 (heading)、速度的实体，在地图上移动
- **Obstacle**: 占据一个或多个网格单元的静态物体
- **SimState**: 全局仿真状态，包含所有实体和运行参数
- **Game Loop**: requestAnimationFrame 驱动的 update → render 循环

## 编排

> 模块间的调用顺序和事件绑定。模块文档只记"这个模块做什么"，这里记"谁在什么时机调用谁"。

### 入口文件

`src/engine/sim-engine.js` — 唯一的 `<script>` 入口，负责初始化所有模块并启动游戏循环。

### 启动序列 (boot)

```
1. initTheme()                          // 主题初始化 (theme.js)
2. createGrid(cols, rows, cellSize)     // 创建网格 (map.js)
3. initSimState(grid, robotCount)       // 创建全局状态 (sim-engine.js 内部)
   ├── generateRandomObstacles()        //   随机障碍物 (map.js)
   └── createRobot() × N               //   创建机器人 (robot.js)
       ├── createAutopilot()            //     每个机器人挂 autopilot (autopilot.js)
       └── createStats()               //     每个机器人挂统计 (stats.js)
4. initRenderer(canvas, grid)           // Canvas 初始化 + DPR (renderer.js)
5. renderFrame(config, state, grid)     // 首帧渲染 (renderer.js)
6. createControlPanel(container, callbacks)  // 控制面板 DOM (controls.js)
7. setupRobotKeyboard()                 // 键盘事件 (sim-engine.js 内部)
8. createHelpOverlay()                  // 帮助面板 (help.js)
```

### 帧循环 (loop) — 每帧执行

```
requestAnimationFrame(loop)
  │
  ├── 计算 delta + FPS
  │
  ├── 判断模式
  │   ├── recorder.playing → advancePlayback()    // 回放模式 (recorder.js)
  │   └── 否则 → update(dt)                       // 正常模式
  │
  ├── update(dt):
  │   ├── 计算 A* 路径 (pathfinder.js)            // 有航点时
  │   ├── for each robot:
  │   │   ├── 记录 prevX/prevY                   // 统计用
  │   │   ├── 决策移动命令 (优先级从高到低):
  │   │   │   ├── waypoints.current → 航点转向    // 航点导航 (waypoints.js)
  │   │   │   ├── autopilot → getAutopilotCommand() // 自主漫游 (autopilot.js)
  │   │   │   ├── activeCommands → applyCommand()  // 键盘控制 (robot.js)
  │   │   │   └── 默认 → moveForward()             // 自动前进 (robot.js)
  │   │   ├── checkCollision()                    // 碰撞检测 (robot.js)
  │   │   ├── clampToBounds()                     // 越界修正 (robot.js)
  │   │   ├── recordPosition()                    // 轨迹记录 (trail.js)
  │   │   └── updateStats()                       // 统计更新 (stats.js)
  │   ├── resolveRobotCollisions()                // 多机器人避障 (flock.js)
  │   └── state.tick++
  │
  ├── renderFrame(config, state, grid):           // 渲染 (renderer.js)
  │   ├── clear()                                 // 清屏
  │   ├── drawGrid()                              // 网格层
  │   ├── drawWaypoints()                         // 航点层 (waypoints.js)
  │   ├── drawPath()                              // A* 路径层 (pathfinder.js)
  │   ├── drawTrail() × N                         // 轨迹层 (trail.js)
  │   ├── for each robot:
  │   │   ├── castRays() + drawLidar()            //   激光雷达 (lidar.js)
  │   │   └── drawRobot()                         //   机器人
  │   ├── for each obstacle: drawObstacle()        // 障碍物
  │   └── drawHUD()                               // HUD
  │
  ├── updateControlPanel(panel, state)             // UI 更新 (controls.js)
  └── updateStatusBar()                            // 状态栏 (sim-engine.js)
```

### 事件绑定

| 事件源 | 触发条件 | 调用 | 所在模块 |
|--------|---------|------|---------|
| btn-play click | 用户点击播放/暂停 | startLoop() / pauseLoop() | sim-engine.js |
| btn-step click | 用户点击单步 | stepOnce() → update(dt) 一次 | sim-engine.js |
| btn-reset click | 用户点击重置 | resetSim() → initSimState() | sim-engine.js |
| btn-autopilot click | 切换自动驾驶 | state.autopilotEnabled + robot.autopilot.enabled | sim-engine.js |
| btn-record click | 切换录制 | state.recorder.recording | sim-engine.js |
| btn-playback click | 开始/停止回放 | startPlayback() / stopPlayback() | recorder.js |
| btn-theme click | 切换主题 | toggleTheme() | theme.js |
| speed-slider input | 拖动速度 | state.speed = value | sim-engine.js |
| robot-count input | 拖动机器人数 | setRobotCount() | sim-engine.js |
| btn-apply-grid click | 应用地图大小 | changeGrid() → initSimState() | sim-engine.js |
| canvas click | 点击地图 | canvasClickToGrid() → addWaypoint() | waypoints.js |
| Space 键 | 播放/暂停 | 等同 btn-play click | sim-engine.js |
| R 键 | 重置 | 等同 btn-reset click | sim-engine.js |
| WASD/方向键 | 控制机器人 | state.activeCommands.add/remove | sim-engine.js |
| H 键 | 帮助面板 | toggleHelp() | help.js |
| Esc 键 | 关闭帮助 | toggleHelp() | help.js |
| window resize | 窗口大小变化 | renderFrame() 重绘 | sim-engine.js |

### 模式优先级

当多个控制源同时存在时，优先级从高到低：

```
回放模式 > 航点导航 > 自动驾驶 > 键盘控制 > 默认前进
```

## 边界

- 纯前端，无后端通信
- 纯视觉仿真，不涉及真实机器人控制协议
- 单页面，无路由
