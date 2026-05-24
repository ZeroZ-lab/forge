# recorder — 轨迹录制回放

> 依赖: robot.js (RobotState), sim-engine.js (SimState)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 录制模式下每帧保存所有机器人状态快照
- F2: 回放模式下按时间顺序播放快照
- F3: 回放时禁止用户操作，仅显示
- F4: 录制按钮 + 回放按钮

## 验收条件

- AC1: 录制按钮切换录制状态（红点闪烁）
- AC2: 快照包含所有机器人的 {id, x, y, heading, colliding}
- AC3: 回放时从第一帧开始，每帧恢复快照到 state.robots
- AC4: 回放结束后自动停止（playIndex >= frames.length）

## 数据模型

```
RecorderState {
  recording: boolean
  playing: boolean
  frames: FrameSnapshot[]
  playIndex: number
}

FrameSnapshot {
  tick: number
  robots: Array<{ id: string, x: number, y: number, heading: number, colliding: boolean }>
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
createRecorder(): RecorderState
  → 创建初始录制状态（recording=false, playing=false, frames=[], playIndex=0）

recordFrame(recorder: RecorderState, state: SimState): void
  → recording=true 时保存当前帧快照

startPlayback(recorder: RecorderState): boolean
  → 有录制帧时开始回放，返回是否成功

stopPlayback(recorder: RecorderState): void
  → 停止回放，重置 playIndex

advancePlayback(recorder: RecorderState, state: SimState): boolean
  → 恢复当前帧快照到 state.robots，playIndex++
  → 返回是否还有下一帧
```

## 依赖关系

```
无外部 import（SimState 和 RobotState 通过参数传入）
```

## 文件映射

```
src/engine/recorder.js
```
