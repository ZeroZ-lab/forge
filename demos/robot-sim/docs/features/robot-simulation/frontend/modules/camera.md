# camera — 相机视口

> 无外部依赖（纯数学变换）

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 鼠标滚轮缩放（以光标为中心）
- F2: 鼠标中键拖拽平移
- F3: 限制相机范围，不超出世界边界
- F4: 屏幕坐标转世界坐标（用于点击选航点）
- F5: 世界坐标转屏幕坐标（用于 HUD 标注）

## 验收条件

- AC1: 缩放范围 0.5x ~ 3x
- AC2: 缩放以鼠标位置为中心点
- AC3: 平移不超出世界边界（offsetX/Y clamped）
- AC4: 屏幕→世界坐标转换精度 < 1px
- AC5: 重置后回到默认视图 (offset 0,0, zoom 1)

## 数据模型

```
CameraState {
  offsetX: number            // 视口左上角在世界坐标中的 X (px)
  offsetY: number            // 视口左上角在世界坐标中的 Y (px)
  zoom: number               // 缩放倍率 (0.5 ~ 3)
  minZoom: number            // 最小缩放
  maxZoom: number            // 最大缩放
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
createCamera(): CameraState
  → 创建默认相机（offset 0,0, zoom 1, min 0.5, max 3）

screenToWorld(screenX: number, screenY: number, camera: CameraState): { x: number, y: number }
  → 屏幕坐标转世界坐标：(screen + offset) / zoom

worldToScreen(worldX: number, worldY: number, camera: CameraState): { x: number, y: number }
  → 世界坐标转屏幕坐标：world * zoom - offset

panCamera(camera: CameraState, dx: number, dy: number, worldWidth: number, worldHeight: number, viewWidth: number, viewHeight: number): void
  → 平移相机（屏幕像素增量），自动 clamp 到世界边界

zoomCamera(camera: CameraState, factor: number, pivotX: number, pivotY: number, worldWidth: number, worldHeight: number, viewWidth: number, viewHeight: number): void
  → 以 pivot（屏幕坐标）为中心缩放，自动 clamp

resetCamera(camera: CameraState): void
  → 重置到默认视图

applyCameraTransform(ctx: CanvasRenderingContext2D, camera: CameraState): void
  → 在 ctx 上执行 translate(-offsetX, -offsetY) + scale(zoom, zoom)

clampOffset(camera: CameraState, worldWidth: number, worldHeight: number, viewWidth: number, viewHeight: number): void
  → 限制 offset 不超出世界边界
```

## 内部函数

> 无（所有函数都是公共接口）

## 依赖关系

```
无外部 import（纯数学运算）
```

## 文件映射

```
src/rendering/camera.js
```
