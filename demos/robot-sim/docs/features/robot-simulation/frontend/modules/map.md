# map — 地图与网格

> 无依赖（底层模块）

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, pathfinder.js

## 需求

- F1: 创建网格配置（行列数、单元格大小）
- F2: 在指定位置放置障碍物
- F3: 移除障碍物
- F4: 查询某个网格位置是否被占据
- F5: 随机生成障碍物布局

## 验收条件

- AC1: 网格坐标从 (0,0) 到 (cols-1, rows-1)
- AC2: 障碍物占据整数网格坐标
- AC3: 同一位置不能放置多个障碍物
- AC4: 机器人初始位置不能有障碍物
- AC5: 随机生成时避开机器人起始位置（网格中心 ± 2 格）

## 数据模型

```
Obstacle {
  id: string                // 唯一标识 "obs-1"
  x: number                 // 网格 x 坐标 (整数)
  y: number                 // 网格 y 坐标 (整数)
  width: number             // 宽度 (格数, 默认 1)
  height: number            // 高度 (格数, 默认 1)
}

GridConfig {
  cols: number              // 列数
  rows: number              // 行数
  cellSize: number          // 单元格像素大小
}
```

## 公共接口

> 被其他模块调用的函数。

```
createGrid(cols: number = 20, rows: number = 15, cellSize: number = 40): GridConfig
  → 创建网格配置

placeObstacle(obstacles: Obstacle[], x: number, y: number, w: number = 1, h: number = 1): Obstacle | null
  → 放置障碍物，位置冲突返回 null

removeObstacle(obstacles: Obstacle[], id: string): Obstacle[]
  → 移除障碍物，返回更新后列表

isOccupied(x: number, y: number, obstacles: Obstacle[]): boolean
  → 查询位置是否被占据

isInBounds(x: number, y: number, grid: GridConfig): boolean
  → 查询坐标是否在网格范围内

generateRandomObstacles(count: number, grid: GridConfig, excludeCenter: number = 2): Obstacle[]
  → 随机生成障碍物，避开中心区域
```

## 依赖关系

```
无外部 import（底层模块）
```

## 文件映射

```
src/entities/map.js
```
