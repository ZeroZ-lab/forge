# stats — 统计面板

> 依赖: robot.js (RobotState)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 跟踪每个机器人的行驶距离
- F2: 跟踪碰撞次数
- F3: 在控制面板显示统计数据

## 验收条件

- AC1: 距离 = 每帧位移的累加（欧几里得距离）
- AC2: 碰撞计数 = colliding 从 false → true 时 +1
- AC3: 统计在控制面板的机器人卡片中显示

## 数据模型

```
RobotStats {
  distance: number          // 累计行驶距离 (cell)
  collisionCount: number    // 碰撞次数
  wasColliding: boolean     // 上一帧碰撞状态
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
createStats(): RobotStats
  → 创建初始统计（distance=0, collisionCount=0, wasColliding=false）

updateStats(stats: RobotStats, robot: RobotState, prevX: number, prevY: number): void
  → 累加位移（sqrt((x-prevX)² + (y-prevY)²)）
  → 检测碰撞状态变化（false→true 时 collisionCount++）
```

## 依赖关系

```
无外部 import（数据通过参数传入）
```

## 文件映射

```
src/entities/stats.js
```
