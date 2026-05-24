# waypoints — 航点系统

> 依赖: robot.js (RobotState), map.js (GridConfig)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 点击 Canvas 设置目标航点
- F2: 航点队列管理（FIFO）
- F3: 到达航点后自动切换下一个
- F4: 在 Canvas 上绘制航点标记和路径线

## 验收条件

- AC1: 点击 Canvas 位置转换为网格坐标，加入航点队列
- AC2: 机器人距离航点 < 0.5 cell 视为到达
- AC3: 航点标记为青色菱形 + 序号
- AC4: 航点间用虚线连接

## 数据模型

```
Waypoint {
  x: number                 // 网格 x
  y: number                 // 网格 y
  id: number                // 序号
}

WaypointState {
  queue: Waypoint[]         // 航点队列
  current: Waypoint | null  // 当前目标
  nextId: number            // 下一个 id
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
createWaypointState(): WaypointState
  → 创建空航点状态

addWaypoint(state: WaypointState, x: number, y: number): void
  → 加入队列，若 current 为空则自动设置

removeWaypoint(state: WaypointState, id: number): void
  → 移除指定航点

clearWaypoints(state: WaypointState): void
  → 清空所有航点

getCurrentWaypoint(state: WaypointState): Waypoint | null
  → 返回当前目标航点

advanceWaypoint(state: WaypointState, robot: RobotState): boolean
  → 检查是否到达当前航点（距离 < 0.5），到达则切换到下一个

canvasClickToGrid(event: MouseEvent, canvas: HTMLCanvasElement, grid: GridConfig): { x: number, y: number }
  → Canvas 点击坐标转网格坐标（取单元格中心）

drawWaypoints(config: RenderConfig, waypointState: WaypointState, cellSize: number): void
  → 绘制航点菱形 + 序号 + 虚线路径
```

## 依赖关系

```
无外部 import（数据模型通过参数传入）
```

## 文件映射

```
src/entities/waypoints.js
```
