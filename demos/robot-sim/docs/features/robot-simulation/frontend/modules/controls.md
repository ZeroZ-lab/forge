# controls — 控制面板

> 依赖: contract.md ## 编排 > 事件绑定

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 播放/暂停/重置按钮
- F2: 速度滑块（1x-10x）
- F3: 机器人数量滑块（1-10）
- F4: 实时数据面板（位置、朝向、状态、距离、碰撞次数）
- F5: 键盘快捷键绑定
- F6: 地图大小配置（行 × 列）
- F7: 自动驾驶开关
- F8: 录制/回放按钮
- F9: 主题切换按钮

## 验收条件

- AC1: 播放按钮切换状态文字（▶ 播放 ↔ ⏸ 暂停）
- AC2: 速度滑块拖动后仿真速度实时变化
- AC3: 数据面板显示所有机器人的坐标、朝向、距离、碰撞次数，每帧更新
- AC4: 空格键切换播放/暂停，R 键重置
- AC5: 运行中状态指示灯绿色，暂停黄色，停止灰色
- AC6: 修改地图大小后重置仿真

## 数据模型

```
ControlPanel {
  container: HTMLElement
  btnPlay: HTMLButtonElement
  cleanupKeyboard: () => void
  setPlaying: (playing: boolean) => void
}

ControlCallbacks {
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onStep: () => void
  onSpeedChange: (speed: number) => void
  onRobotCountChange: (count: number) => void
  onGridChange: (cols: number, rows: number) => void
  onAutopilotToggle: (enabled: boolean) => void
  onRecordToggle: (recording: boolean) => void
  onPlayback: () => void
  onThemeToggle: () => void
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
createControlPanel(container: HTMLElement, callbacks: ControlCallbacks): ControlPanel
  → 创建控制面板 DOM 并绑定所有按钮和滑块事件

updateControlPanel(panel: ControlPanel, state: SimState): void
  → 根据仿真状态更新 UI（按钮状态、机器人信息卡片数据）

bindKeyboard(callbacks: { onPlay, onPause, onReset, onStep }): () => void
  → 绑定键盘快捷键，返回清理函数
```

## 内部函数

```
（无，所有逻辑在 createControlPanel 闭包内）
```

## 依赖关系

```
无外部 import（纯 DOM 操作，通过 callbacks 回调通知引擎）
```

## DOM 结构

```html
<div class="control-panel">
  <div class="control-group">  <!-- 控制按钮 -->
    <button id="btn-play">▶ 播放</button>
    <button id="btn-step">⏭ 单步</button>
    <button id="btn-reset">↺ 重置</button>
    <button id="btn-autopilot">🤖 自动驾驶</button>
    <button id="btn-record">⏺ 录制</button>
    <button id="btn-playback">⏮ 回放</button>
  </div>
  <div class="control-group">  <!-- 参数滑块 -->
    <label>速度</label><input type="range" id="speed-slider">
    <label>机器人数</label><input type="range" id="robot-count">
  </div>
  <div class="control-group">  <!-- 地图配置 -->
    <input type="number" id="grid-cols"> × <input type="number" id="grid-rows">
    <button id="btn-apply-grid">应用</button>
  </div>
  <div class="control-group">  <!-- 主题 -->
    <button id="btn-theme">🌓 切换主题</button>
  </div>
  <div class="control-group">  <!-- 机器人信息（动态） -->
    <div id="robot-info"></div>
  </div>
</div>
```

## 文件映射

```
src/ui/controls.js
```
