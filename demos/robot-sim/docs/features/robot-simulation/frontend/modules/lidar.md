# lidar — 激光雷达传感器

> 依赖: robot.js (RobotState), map.js (GridConfig, Obstacle)

## 入口

- 非项目入口
- 被 import 方：renderer.js

## 需求

- F1: 从机器人位置向多个方向发射射线
- F2: 射线碰到障碍物或边界时停止
- F3: 在 Canvas 上可视化射线（青绿色线条）
- F4: 返回每个方向的距离数据

## 验收条件

- AC1: 默认 12 条射线，均匀分布 360°（每 30° 一条）
- AC2: 射线最大长度 = 5 个网格单元
- AC3: 射线碰到障碍物时停止并显示红色端点
- AC4: 射线未碰到物体时显示为半透明青绿色

## 数据模型

```
LidarConfig {
  rayCount: number          // 射线数量 (默认 12)
  maxRange: number          // 最大探测距离 (cell, 默认 5)
}

LidarReading {
  angle: number             // 射线角度 (degree)
  distance: number          // 探测距离 (cell)
  hit: boolean              // 是否击中障碍物
}
```

## 公共接口

> 被 renderer.js 调用。

```
castRays(robot: RobotState, obstacles: Obstacle[], grid: GridConfig, config?: LidarConfig): LidarReading[]
  → 从机器人位置发射射线，返回距离数据

drawLidar(config: RenderConfig, robot: RobotState, readings: LidarReading[], cellSize: number): void
  → 在 Canvas 上绘制射线（击中=红色端点，未击中=半透明青绿）
```

## 内部函数

> 模块内部使用，不导出。

```
rayRectIntersect(ox: number, oy: number, dx: number, dy: number, rect: Obstacle): number
  → 射线-矩形交叉检测（slab method），返回距离或 Infinity

rayBoundaryIntersect(ox: number, oy: number, dx: number, dy: number, grid: GridConfig): number
  → 射线-边界交叉，返回距离
```

## 依赖关系

```
无外部 import（数据模型通过参数传入）
```

## 文件映射

```
src/entities/lidar.js
```
