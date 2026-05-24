# exporter — 数据导出

> 无外部依赖（浏览器原生 API）

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 导出当前统计数据（所有机器人的距离、碰撞次数）为 JSON
- F2: 导出轨迹数据为 JSON
- F3: 触发浏览器下载文件

## 验收条件

- AC1: 导出文件名格式 `robot-sim-{timestamp}.json`
- AC2: JSON 包含 tick、robots、stats、trails 数据
- AC3: 使用 Blob + URL.createObjectURL + <a> 点击下载
- AC4: 导出后自动释放 Object URL

## 数据模型

```
ExportData {
  version: string            // 数据版本 ("1.0")
  exportedAt: string         // ISO 时间戳
  tick: number               // 当前帧数
  grid: { cols, rows, cellSize }
  robots: Array<{ id, x, y, heading, colliding }>
  stats: Array<{ distance, collisionCount }>
  trails: Array<Array<{ x, y, tick }>>
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
exportSimulationData(state: SimState, grid: GridConfig): void
  → 收集当前状态并触发 JSON 文件下载

buildExportData(state: SimState, grid: GridConfig): ExportData
  → 构建导出数据对象（纯函数，可测试）

downloadJSON(data: object, filename: string): void
  → 将对象序列化为 JSON 并触发浏览器下载
```

## 内部函数

> 无（所有函数都是公共接口）

## 依赖关系

```
无外部 import（数据模型通过参数传入，浏览器 Blob/URL API 为原生）
```

## 文件映射

```
src/engine/exporter.js
```
