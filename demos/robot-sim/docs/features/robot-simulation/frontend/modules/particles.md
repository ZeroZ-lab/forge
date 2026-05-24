# particles — 粒子特效

> 无外部依赖（数据通过参数传入）

## 入口

- 非项目入口
- 被 import 方：sim-engine.js, renderer.js

## 需求

- F1: 碰撞时产生红色火花粒子
- F2: 到达航点时产生青色爆炸粒子
- F3: 粒子有位置、速度、生命周期、颜色
- F4: 粒子渐隐消失

## 验收条件

- AC1: 碰撞产生 8 个红色粒子（#ff3366），速度 30~80 px/s，寿命 0.5s
- AC2: 航点到达产生 12 个青色粒子（#00d4ff），速度 40~100 px/s，寿命 0.8s
- AC3: 粒子大小从 3px 渐变到 0px
- AC4: 粒子 alpha 从 1 渐变到 0
- AC5: 粒子数量上限 200（超出时丢弃最早的）

## 数据模型

```
Particle {
  x: number                  // 世界坐标 x (px)
  y: number                  // 世界坐标 y (px)
  vx: number                 // x 速度 (px/s)
  vy: number                 // y 速度 (px/s)
  life: number               // 剩余寿命 (s)
  maxLife: number            // 初始寿命 (s)
  color: string              // 颜色 (hex)
  size: number               // 初始大小 (px)
}

ParticleState {
  particles: Particle[]      // 活跃粒子列表
  maxParticles: number       // 上限 (200)
}
```

## 公共接口

> 被 sim-engine.js 和 renderer.js 调用。

```
createParticleState(): ParticleState
  → 创建空粒子状态

spawnCollisionParticles(state: ParticleState, worldX: number, worldY: number): void
  → 在指定世界坐标产生 8 个红色碰撞粒子

spawnWaypointParticles(state: ParticleState, worldX: number, worldY: number): void
  → 在指定世界坐标产生 12 个青色航点粒子

updateParticles(state: ParticleState, dt: number): void
  → 更新所有粒子位置，移除寿命到期的粒子

drawParticles(config: RenderConfig, state: ParticleState): void
  → 绘制所有活跃粒子（圆形 + alpha 渐变）
```

## 内部函数

> 模块内部使用，不导出。

```
spawnParticles(state: ParticleState, x: number, y: number, count: number, color: string, speedMin: number, speedMax: number, life: number, size: number): void
  → 通用粒子生成（随机方向速度）
```

## 依赖关系

```
无外部 import（数据模型通过参数传入）
```

## 文件映射

```
src/rendering/particles.js
```
