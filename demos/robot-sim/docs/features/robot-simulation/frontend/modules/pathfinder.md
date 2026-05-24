# pathfinder — A* 寻路

> 依赖: map.js (GridConfig, Obstacle)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 在网格上用 A* 算法计算起点到终点的最短路径
- F2: 避开障碍物占据的网格
- F3: 返回路径坐标数组
- F4: 在 Canvas 上绘制计算出的路径

## 验收条件

- AC1: 路径不穿过障碍物
- AC2: 路径为网格坐标数组 [{x, y}, ...]
- AC3: 无可行路径时返回空数组
- AC4: 路径用黄色虚线绘制（--accent-warning），与航点虚线区分

## 数据模型

```
PathNode {
  x: number
  y: number
  g: number                 // 从起点到此的代价
  h: number                 // 启发式（曼哈顿距离）
  f: number                 // g + h
  parent: PathNode | null
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
findPath(startX: number, startY: number, goalX: number, goalY: number, obstacles: Obstacle[], grid: GridConfig): Array<{ x: number, y: number }>
  → A* 寻路，8 方向移动，对角线需检查防穿墙
  → 启发式：曼哈顿距离
  → 返回路径数组（含起点和终点），无路径返回 []

drawPath(config: RenderConfig, path: Array<{ x: number, y: number }>, cellSize: number): void
  → 绘制黄色虚线路径 (--accent-warning)
```

## 依赖关系

```
无外部 import（数据模型通过参数传入）
```

## 文件映射

```
src/engine/pathfinder.js
```
