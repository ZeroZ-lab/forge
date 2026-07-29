---
name: guide
description: Advises whether to act directly or use optional Forge capabilities, including an explicit pinned legacy-chain preset, without executing work.
disable-model-invocation: true
---

# Guide — 路由建议

## 职责

把用户任务映射为 direct action 或最小可选能力集合。只推荐，不调用其他 skill、不修改文件、不创建阶段产物、不写 Change Unit；不得把 Skill 选择变成完成条件。

## 判断顺序

1. 识别目标、非目标、风险、完成条件和是否改变目标语义。
2. 选择 D10 复杂度：
   - L0：局部、低风险、目标明确，直接 patch。
   - L1：单 feature 的 bugfix 或小功能；允许 direct action，按缺口加载能力。
   - L2：跨模块、存在依赖或中风险决策；提高验证地板并要求独立复核。
   - L3：新项目、核心架构、安全、迁移、部署或完整治理；必须独立复核。
3. 选择调用深度：
   - lens：只分析或 review。
   - patch：局部修正并验证。
   - stage：显式执行完整阶段并维护产物。
4. 先判断 direct action 是否足够；仅当能力的边际价值高于上下文、产物和协调成本时推荐 Skill。描述子 skill 时只引用职责和出口，不复制 child methodology，不猜 bug 根因。
5. 上下文重或高风险时引用 delegation matrix：多文件/长日志派调查，P0/P1/安全/迁移/发布只派分析或审查，最终判断不外包。

## 路由基线

| 场景 | 推荐动作 |
|------|----------|
| 不改变目标语义的简单修正 | `direct action`：最小 patch → verification → self-check |
| 报告运行时 bug | `direct action` 或可选 `codegen(bugfix lens)`；P0/P1 再独立 review |
| 需求明确的小功能 | 直接实现；只有共享合同不清才加 `detail` |
| 边界不清的小功能 | 可选 `define` / `detail`，澄清后由 Chain Owner 自主实现 |
| 跨模块且有依赖 | 可选 `detail` / `plan`；L2/L3 完成前独立 review |
| 新项目或完整治理 | 可选 `init` 与必要领域能力，不要求完整生命周期 |
| 用户明确要求旧行为 | `legacy-chain: detail → codegen → review (Forge 0.52.0)` |

`research`、`design`、`test`、`deploy`、`think` 只在任务信号明确且边际价值为正时加入，不为流程完整而加入。选择一个 Skill 不自动要求后继。

## 输出

执行中先发一条非 JSON evidence line，使用这些固定标签：`L0/L1/L2/L3`、`direct action` 或可选能力、`legacy-chain`（仅显式要求时）、`跳过 Skill`、`只推荐不执行`。

Legacy capability benchmark 需要时使用精确兼容标签：`detail -> codegen -> review`、`可选 init`、`可选 detail / plan`；这些标签不定义生产默认。

```md
复杂度：L#
调用深度：lens / patch / stage
推荐动作：direct action / 可选能力集合 / 显式 legacy-chain
推进条件：按目标状态、风险和验证结果重新判断；Skill 出口不自动触发后继。
启用理由：...
跳过 Skill：Skill — 边际价值不足的原因
边界：只推荐不执行；零 Skill 合法；只引用职责，不复制子 skill 方法；不创建/修改文件。
关键风险：...
开始前需要的人类决策：无 / ...
```

若任务信息不足以安全区分两条链路，只提出一个会改变执行范围的关键问题。
