---
name: guide
description: Recommends the shortest Forge skill chain, D10 level, and invocation depth for a task without executing lifecycle stages.
disable-model-invocation: true
---

# Guide — 路由建议

## 职责

把用户任务映射为最短 Forge 链路。只推荐，不调用其他 skill、不修改文件、不创建阶段产物。

## 判断顺序

1. 识别目标、非目标、风险和是否改变目标语义。
2. 选择 D10 复杂度：
   - L0：局部、低风险、目标明确，直接 patch。
   - L1：单 feature 的 bugfix 或小功能，需要轻量 detail/codegen/review。
   - L2：跨模块、存在依赖或中风险决策，需要标准链路。
   - L3：新项目、核心架构、安全、迁移、部署或完整治理。
3. 选择调用深度：
   - lens：只分析或 review。
   - patch：局部修正并验证。
   - stage：显式执行完整阶段并维护产物。
4. 推荐最短链路，并逐项说明为什么启用或跳过。

## 路由基线

| 场景 | 推荐链路 |
|------|----------|
| 不改变目标语义的简单修正 | `codegen(patch)` |
| 报告运行时 bug | `codegen(patch, bugfix protocol) → review(lens)` |
| 需求明确的小功能 | `detail(patch) → codegen(patch) → review(lens)` |
| 边界不清的小功能 | `define(patch) → detail(patch) → codegen(patch) → review(lens)` |
| 跨模块且有依赖 | `detail(stage) → plan(stage) → codegen(stage) → review(stage)` |
| 新项目或完整治理 | 按 Forge 完整生命周期选择必要阶段 |

`research`、`design`、`test`、`deploy`、`think` 只在任务信号明确时加入，不为流程完整而加入。

## 输出

```md
复杂度：L#
调用深度：lens / patch / stage
推荐链路：...
启用理由：...
跳过阶段：阶段 — 原因
关键风险：...
开始前需要的人类决策：无 / ...
```

若任务信息不足以安全区分两条链路，只提出一个会改变执行范围的关键问题。

