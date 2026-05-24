# robot — 机器人实体

> 依赖共享约束: 碰撞检测, 边界限制

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 创建机器人（指定位置和朝向）
- F2: 机器人前进（沿朝向移动）
- F3: 机器人转向（左转/右转）
- F4: 碰撞检测（与障碍物和边界）

## 验收条件

- AC1: 前进时位置按 heading 方向 + moveSpeed 更新
- AC2: 转向时 heading 在 [0, 360) 范围内循环
- AC3: 碰到网格边界时停止移动，不越界
- AC4: 碰到障碍物时停止移动，标记碰撞状态
- AC5: heading 用角度表示，0=右，90=下，180=左，270=上

## 数据模型

```
RobotState {
  id: string                // 唯一标识 "robot-1"
  x: number                 // 网格坐标 x (cell)
  y: number                 // 网格坐标 y (cell)
  heading: number           // 朝向角度 (0-360, 0=右, 90=下)
  speed: number             // 当前速度 (cell/s)
  radius: number            // 碰撞半径 (cell, 默认 0.4)
  colliding: boolean        // 是否正在碰撞
  color: string             // 显示颜色 (默认 --accent-primary)
}

RobotCommand = "forward" | "backward" | "left" | "right" | "stop"

PhysicsConfig {
  moveSpeed: number         // 移动速度 (默认 2, cell/s)
  turnSpeed: number         // 转向速度 (默认 90, degree/s)
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
createRobot(id: string, x: number, y: number, heading: number = 0): RobotState
  → 创建机器人实例

moveForward(robot: RobotState, dt: number, physics: PhysicsConfig): void
  → 沿 heading 方向移动 speed * dt 距离

moveBackward(robot: RobotState, dt: number, physics: PhysicsConfig): void
  → 反方向移动

turnLeft(robot: RobotState, dt: number, physics: PhysicsConfig): void
  → heading 减少 turnSpeed * dt

turnRight(robot: RobotState, dt: number, physics: PhysicsConfig): void
  → heading 增加 turnSpeed * dt

checkCollision(robot: RobotState, obstacles: Obstacle[], grid: GridConfig): boolean
  → 检测机器人是否与障碍物或边界碰撞，设置 robot.colliding

applyCommand(robot: RobotState, command: RobotCommand, dt: number, physics: PhysicsConfig): void
  → 根据命令类型调用对应的移动/转向函数

clampToBounds(robot: RobotState, grid: GridConfig): void
  → 将机器人位置钳位到网格边界内
```

## 内部函数

> 模块内部使用，不导出。

```
degToRad(deg: number): number
  → 角度转弧度

normalizeAngle(angle: number): number
  → 规范化角度到 [0, 360)
```

## 依赖关系

```
无外部 import（底层模块，数据模型由 map.js 提供但通过参数传入）
```

## 角度约定

```
       270° (上)
        ↑
  180° ← · → 0° (右)
        ↓
       90° (下)
```

## 文件映射

```
src/entities/robot.js
```
