# trail — 轨迹尾迹

> 依赖: robot.js (RobotState)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 每隔 N 帧记录机器人位置
- F2: 在 Canvas 上绘制历史轨迹（渐变透明度）
- F3: 轨迹有最大长度限制
- F4: 可通过开关显示/隐藏

## 验收条件

- AC1: 每 3 帧记录一个位置点
- AC2: 最多保留 200 个点，超出后 FIFO 移除
- AC3: 轨迹线从新到旧渐变透明（alpha 0.1 → 0.6）
- AC4: 重置时清空轨迹

## 数据模型

```
TrailState {
  points: Array<{ x: number, y: number }>  // 位置历史
  maxPoints: number          // 最大点数 (默认 200)
  recordInterval: number     // 记录间隔 (默认 3 帧)
  enabled: boolean           // 是否启用
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
createTrail(maxPoints: number = 200, recordInterval: number = 3): TrailState
  → 创建轨迹状态

recordPosition(trail: TrailState, robot: RobotState, tick: number): void
  → 按间隔记录位置，超出上限 FIFO 移除

drawTrail(config: RenderConfig, trail: TrailState, cellSize: number): void
  → 绘制渐变透明轨迹线

clearTrail(trail: TrailState): void
  → 清空所有记录点
```

## 依赖关系

```
无外部 import（数据通过参数传入）
```

## 文件映射

```
src/rendering/trail.js
```
