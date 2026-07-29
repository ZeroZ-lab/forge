---
name: codegen
description: Optional implementation and bugfix playbook with contract tracing, red-capable feedback, and execution evidence.
when_to_use: Use for an explicit Forge build, disciplined bug reproduction, or contract tracing; direct implementation remains legal.
---

# Codegen — 构建阶段

从用户目标和可用权威事实生成最小可运行 `src/ + tests/`；存在 goal/modules 时消费它们，不为清晰 patch 强造文档，也不重做产品/技术决策。它是可选实现能力，不是写代码的许可门。Refs: `references/bugfix-protocol.md`, `../shared/concepts/adaptive-runtime.md`, `../shared/concepts/evidence-policy.md`, `../shared/concepts/artifact-policy.md`.

## Use / skip / no-op

需要 AC/决策追溯或 bugfix red loop 时使用；清晰低风险任务可跳过。无反馈、目标冲突或权限不足时 no-op/safe stop，返回缺失证据，不强制 review。

## 硬门

- D4/D5：只改必要文件；不加未要求抽象/依赖。
- D7/D9：完成前必须有命令 + 真实输出；无法运行写 `⚠️ 未验证` + 阻塞原因。
- D8：同类问题 ≥2 次交给 Chain Owner 重审目标/合同；只有发现持久合同缺口时才选择 detail。

## 读→生→验→修

**读**：先读用户任务、代码、测试和历史风险；存在相关 project/goal/modules 时按指针读取并识别 PD#/FD#/DB#/AC。忽略已有权威事实直接写 = 目标漂移。

**生**：无任务序列则从用户目标、goal（若有）和代码事实推最小顺序并声明。goal 可推 routes/schemas/db/tests；modules 可推 services/unit tests；关键逻辑按项目约定关联 FD#/PD#/DB#/AC#。Bugfix 先建 red-capable 复现；无反馈循环不改实现，是否独立复核由 Chain Owner 按风险决定。

**验**：先运行验证，再目标对照。查编译/语法、核心入口、相关测试、goal/modules 对照。运行验证失败或无命令回执，不得完成。

**修**：失败归因代码、文档歧义、文档未同步、范围蔓延；修后回到验证；3 轮不收敛交用户。摘要：`自动修正 N · 中止 M · 待确认 K · 归因：skill / 文档 / 代码 / 范围`。

## 红旗/出口

红旗：未读目标改代码；无运行验证却完成；代码与 goal/modules 不一致；测试不覆盖 AC；bugfix 无 red seam 或使用错误 seam；关键逻辑无编号；新增 goal 外功能/依赖。

出口：代码/测试已生成；运行验证、相关测试、目标对照通过；每个验证项有命令回执；未验证和阻塞项显式交给 Chain Owner。下一动作是建议，不自动调用 review。历史遵循 `../shared/concepts/history-maintenance.md`，Chain Owner 将证据汇总进唯一 CU，不生成 trace。
