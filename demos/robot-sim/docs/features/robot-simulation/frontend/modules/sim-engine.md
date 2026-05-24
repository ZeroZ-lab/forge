# sim-engine — 仿真引擎

> **项目入口文件** — boot() 初始化所有模块并启动游戏循环
> 编排逻辑见 contract.md ## 编排

## 入口

- **是项目入口**。index.html 通过 `<script type="module" src="engine/sim-engine.js">` 加载
- 被 import 方：无（顶层入口）

## 需求

- F1: 启动仿真循环
- F2: 停止/暂停仿真
- F3: 单步执行（暂停时按一次前进一步）
- F4: 重置到初始状态
- F5: 调节仿真速度倍率（1x-10x）

## 验收条件

- AC1: 调用 start() 后 requestAnimationFrame 循环运行，每帧调用 update + render
- AC2: 暂停时停止 update 但保留当前状态，恢复后继续
- AC3: 速度倍率影响 update 频率（2x = 每帧两次 update）
- AC4: 重置后机器人回到初始位置和朝向
- AC5: 帧率稳定在 60fps

## 数据模型

```
SimState {
  running: boolean          // 是否在运行
  paused: boolean           // 是否暂停
  tick: number              // 当前帧数
  speed: number             // 速度倍率 (1-10)
  dt: number                // 固定时间步长 (1/60)
  robots: RobotState[]      // 机器人列表
  obstacles: Obstacle[]     // 障碍物列表
  grid: GridConfig          // 网格配置
  robotCount: number        // 当前机器人数量
  fps: number               // 当前帧率
  lidarEnabled: boolean     // 激光雷达开关
  autopilotEnabled: boolean // 自动驾驶开关
  waypoints: WaypointState  // 航点状态
  trails: TrailState[]      // 轨迹（每机器人一条）
  currentPath: Array        // A* 路径
  recorder: RecorderState   // 录制回放
  activeCommands: Set       // 当前按下的键盘命令
}
```

## 公共接口

> 无外部调用方（入口文件，不被其他模块 import）

## 内部函数

> 模块内部使用，驱动整个仿真。

```
initSimState(grid: GridConfig, robotCount: number): SimState
  → 创建全局状态，生成障碍物和机器人

boot(): void
  → 入口函数：初始化所有模块，创建控制面板，绑定事件

loop(timestamp: number): void
  → requestAnimationFrame 回调，驱动每帧逻辑

update(dt: number): void
  → 一帧物理更新（编排逻辑见 contract.md ## 编排 > 帧循环）

startLoop(): void           // 启动循环
stopLoop(): void            // 停止循环
pauseLoop(): void           // 暂停
resumeLoop(): void          // 恢复
stepOnce(): void            // 单步
resetSim(): void            // 重置
setSpeed(speed: number): void
setRobotCount(count: number): void
changeGrid(cols: number, rows: number): void
updateStatusBar(): void
setupRobotKeyboard(): void
```

## 依赖关系

```
from map.js:        createGrid, generateRandomObstacles, isOccupied
from robot.js:      createRobot, moveForward, checkCollision, clampToBounds, applyCommand
from autopilot.js:  createAutopilot, getAutopilotCommand
from waypoints.js:  createWaypointState, addWaypoint, canvasClickToGrid, advanceWaypoint
from pathfinder.js: findPath
from flock.js:      resolveRobotCollisions
from stats.js:      createStats, updateStats
from trail.js:      createTrail, recordPosition
from recorder.js:   createRecorder, recordFrame, startPlayback, advancePlayback, stopPlayback
from lidar.js:      (通过 renderer.js 间接调用)
from renderer.js:   initRenderer, renderFrame
from controls.js:   createControlPanel, updateControlPanel
from theme.js:      initTheme, toggleTheme
from help.js:       createHelpOverlay, toggleHelp
```

## 文件映射

```
src/engine/sim-engine.js
```
