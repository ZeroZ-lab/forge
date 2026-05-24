# minimap — 缩略地图

> 依赖: camera.js (CameraState), map.js (GridConfig)

## 入口

- 非项目入口
- 被 import 方：renderer.js

## 需求

- F1: 在 Canvas 右上角绘制缩略地图
- F2: 显示所有机器人位置（彩色点）
- F3: 显示当前航点（青色点）
- F4: 显示当前视口矩形框（当缩放 ≠ 1 时）
- F5: 点击缩略地图可跳转到对应位置

## 验收条件

- AC1: 缩略地图尺寸固定 160×120px，padding 8px，位于右上角
- AC2: 背景半透明 (--bg-primary + opacity 0.8)
- AC3: 机器人用对应颜色圆点表示（2px）
- AC4: 视口矩形用白色虚线框表示
- AC5: 点击缩略地图区域设置相机中心到对应世界坐标

## 数据模型

```
MinimapConfig {
  width: number              // 缩略图宽度 (160)
  height: number             // 缩略图高度 (120)
  padding: number            // 内边距 (8)
  margin: number             // 距右上角间距 (10)
}
```

## 公共接口

> 被 renderer.js 调用。

```
createMinimapConfig(): MinimapConfig
  → 创建默认配置

drawMinimap(config: RenderConfig, minimap: MinimapConfig, state: SimState, grid: GridConfig, camera: CameraState): void
  → 绘制缩略地图：背景 → 障碍物 → 机器人 → 航点 → 视口框

minimapClickToCamera(event: MouseEvent, canvas: HTMLCanvasElement, minimap: MinimapConfig, grid: GridConfig, camera: CameraState, renderConfig: RenderConfig): boolean
  → 判断点击是否在缩略地图内，是则更新相机偏移并返回 true
```

## 内部函数

> 由 drawMinimap() 调用，不导出。

```
isInMinimap(x: number, y: number, minimap: MinimapConfig, renderConfig: RenderConfig): boolean
  → 判断坐标是否在缩略地图区域内

worldToMinimap(worldX: number, worldY: number, grid: GridConfig, minimap: MinimapConfig, renderConfig: RenderConfig): { x: number, y: number }
  → 世界坐标转缩略地图坐标

minimapToWorld(mx: number, my: number, grid: GridConfig, minimap: MinimapConfig, renderConfig: RenderConfig): { x: number, y: number }
  → 缩略地图坐标转世界坐标
```

## 依赖关系

```
无外部 import（数据模型通过参数传入）
```

## 文件映射

```
src/rendering/minimap.js
```
