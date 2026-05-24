# flock — 多机器人避障

> 依赖: robot.js (RobotState)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 检测机器人之间的碰撞
- F2: 碰撞时推开（简单排斥力）
- F3: 近距离时减速

## 验收条件

- AC1: 两个机器人距离 < 两者 radius 之和时视为碰撞
- AC2: 碰撞时双方沿连线方向推开
- AC3: 距离 < 2 cell 时速度减半

## 公共接口

> 被 sim-engine.js 调用。

```
resolveRobotCollisions(robots: RobotState[]): void
  → O(n²) 两两检测，碰撞时沿连线方向推开（AC1, AC2）
```

## 内部函数

```
（无，逻辑全在 resolveRobotCollisions 内）
```

## 依赖关系

```
无外部 import（数据通过参数传入）
```

## 文件映射

```
src/entities/flock.js
```
