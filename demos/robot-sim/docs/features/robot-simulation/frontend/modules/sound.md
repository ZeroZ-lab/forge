# sound — 音效系统

> 无外部依赖（Web Audio API）

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 碰撞时播放短促音效
- F2: 到达航点时播放提示音
- F3: 全局音效开关（默认关闭）
- F4: 音量控制

## 验收条件

- AC1: 碰撞音效为短促方波 beep（200Hz, 50ms）
- AC2: 航点到达音效为上行双音（400Hz→600Hz, 各 80ms）
- AC3: 默认静音，需用户交互后才能播放（Web Audio API 限制）
- AC4: 音量范围 0~1，默认 0.3
- AC5: 同帧多次碰撞只播放一次（throttle）

## 数据模型

```
SoundState {
  enabled: boolean           // 是否启用
  volume: number             // 音量 (0~1)
  ctx: AudioContext | null   // Web Audio 上下文（用户交互后初始化）
  lastCollisionTime: number  // 上次碰撞音效时间戳（节流）
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
createSoundState(): SoundState
  → 创建默认音效状态（enabled false, volume 0.3）

initAudioContext(sound: SoundState): void
  → 初始化 AudioContext（需在用户交互回调中调用）

playCollisionSound(sound: SoundState): void
  → 播放碰撞 beep（节流 100ms）

playWaypointSound(sound: SoundState): void
  → 播放航点到达双音

setSoundEnabled(sound: SoundState, enabled: boolean): void
  → 开关音效

setSoundVolume(sound: SoundState, volume: number): void
  → 设置音量
```

## 内部函数

> 模块内部使用，不导出。

```
playTone(sound: SoundState, freq: number, duration: number, startTime: number, type: string): void
  → 播放单个音符（OscillatorNode + GainNode）
```

## 依赖关系

```
无外部 import（Web Audio API 为浏览器原生）
```

## 文件映射

```
src/engine/sound.js
```
