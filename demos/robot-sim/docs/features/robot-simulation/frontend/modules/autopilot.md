# autopilot — 自主漫游

> 依赖: robot.js (RobotState), lidar.js (LidarReading)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 前方无障碍时直行
- F2: 检测到近距离障碍物时转向避障
- F3: 随机改变方向增加探索覆盖率
- F4: 可通过开关切换手动/自动模式

## 验收条件

- AC1: 前方 2 格内有障碍物 → 转向避开（选择距离更远的方向）
- AC2: 每 3-5 秒随机改变方向（±30°-60°）
- AC3: 自动模式下忽略键盘输入
- AC4: 手动模式下 autopilot 不生效

## 数据模型

```
AutopilotState {
  enabled: boolean          // 是否启用
  nextTurnTime: number      // 下次随机转向的时间 (tick)
  turnDirection: 1 | -1     // 当前转向方向
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
createAutopilot(): AutopilotState
  → 创建初始 autopilot 状态

getAutopilotCommand(robot: RobotState, autopilot: AutopilotState, tick: number): RobotCommand
  → 根据 lidar 读数（robot.lidarReadings）和当前状态返回控制命令
  → 分析前方 60°、左侧、右侧的最小距离来决定转向
```

## 内部函数

> 模块内部使用，不导出。

```
randomTurnTime(currentTick: number): number
  → 随机下次转向时间（180-300 ticks ≈ 3-5 秒）
```

## 依赖关系

```
无外部 import（lidar 读数通过 robot.lidarReadings 属性传入）
```

## 文件映射

```
src/entities/autopilot.js
```
