# renderer — Canvas 渲染器

> 编排层（contract.md ## 编排）控制绘制顺序

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 初始化 Canvas（设置尺寸、DPR 缩放）
- F2: 绘制网格（线条 + 坐标标记）
- F3: 绘制机器人（带朝向指示的三角形 + 发光效果）
- F4: 绘制障碍物（实心方块）
- F5: 绘制 HUD（帧率、坐标覆盖层）

## 验收条件

- AC1: Canvas 尺寸 = 网格 cols × cellSize，rows × cellSize
- AC2: 处理高 DPR 屏幕（devicePixelRatio 缩放）
- AC3: 每帧先 clearRect 再逐层绘制（网格 → 障碍物 → 机器人 → HUD）
- AC4: 机器人绘制为三角形，顶点朝向 heading 方向
- AC5: 碰撞时机器人颜色变红 (--accent-danger)

## 数据模型

```
RenderConfig {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number             // 逻辑宽度 (cols * cellSize)
  height: number            // 逻辑高度 (rows * cellSize)
  dpr: number               // devicePixelRatio
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
initRenderer(canvas: HTMLCanvasElement, grid: GridConfig): RenderConfig
  → 设置 Canvas 尺寸和 DPR 缩放

renderFrame(config: RenderConfig, state: SimState, grid: GridConfig, camera: CameraState, minimapConfig: MinimapConfig): void
  → 完整渲染一帧：reset transform → clear → apply camera → world → reset transform → HUD → minimap
```

## 内部函数

> 由 renderFrame() 按顺序调用，不导出。

```
clear(config: RenderConfig): void
  → clearRect 整个画布，填充 --bg-primary

drawGrid(config: RenderConfig, grid: GridConfig): void
  → 绘制网格线 (--bg-tertiary) + 坐标数字

drawRobot(config: RenderConfig, robot: RobotState, cellSize: number): void
  → 绘制三角形机器人 + 方向线 + 发光效果
  → colliding 时颜色切换为 --accent-danger

drawObstacle(config: RenderConfig, obstacle: Obstacle, cellSize: number): void
  → 绘制带圆角的实心方块 (--text-muted)

drawHUD(config: RenderConfig, state: SimState): void
  → 左下角绘制 FPS、tick 数、机器人数量
```

## 依赖关系

```
from lidar.js:     castRays, drawLidar
from waypoints.js: drawWaypoints
from trail.js:     drawTrail
from pathfinder.js: drawPath
from camera.js:    applyCameraTransform
from minimap.js:   drawMinimap
from particles.js: drawParticles
```

## 绘制层级（从底到顶，renderFrame 内顺序）

1. 背景色 (--bg-primary)
2. 网格线 (--bg-tertiary, 1px)
3. 坐标数字 (--text-muted, 10px)
4. 障碍物 (--text-muted, 实心)
5. 航点 (waypoints, 菱形 + 虚线)
6. A* 路径 (pathfinder, 黄色虚线)
7. 轨迹尾迹 (trail, 渐变透明)
8. 激光雷达 (lidar, 射线 + 端点)
9. 机器人 (--accent-primary, 三角形 + 发光)
10. HUD (--text-secondary, 左下角)

## 文件映射

```
src/rendering/renderer.js
```
