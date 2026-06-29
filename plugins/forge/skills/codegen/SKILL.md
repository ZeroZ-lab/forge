---
name: codegen
description: Implements goals and bugfixes into code and tests with verification.
when_to_use: Use for documented implementation tasks, the Forge build phase, or reported runtime bugs.
---

# Codegen — 构建阶段

从 `goal.md + modules/*.md` 生成最小可运行 `src/ + tests/`；不重做产品/技术决策。Refs: `references/bugfix-protocol.md`, `../shared/concepts/evidence-policy.md`, `../shared/concepts/artifact-policy.md`.

## 硬门

- D4/D5：只改必要文件；不加未要求抽象/依赖。
- D7/D9：完成前必须有命令 + 真实输出；无法运行写 `⚠️ 未验证` + 阻塞原因。
- D8：同类问题 ≥2 次，回 detail 复查目标。

## 读→生→验→修

**读**：先读 project/goal/modules/任务/代码/历史风险；识别 PD#/FD#/DB#/AC，测试和实现报告中保留 `AC-` 追溯；BDD 场景必须回链 AC#；跳读直接写 = 目标漂移。

**生**：无任务序列则从 goal 推最小顺序并声明。小功能默认链路是 `detail -> codegen -> review`，但 codegen 只执行实现阶段。goal 推 routes/schemas/db/tests；modules 推 services/unit tests；核心/高风险 BDD 场景优先落到现有测试框架，测试名或断言保留 AC#；关键逻辑标 FD#/PD#/DB#/AC#。Bugfix 先建 red-capable 复现；无反馈循环不改实现，并用 `review` 复核 safe stop。

**验**：先运行验证，再目标对照。查编译/语法、核心入口、相关测试、goal/modules 对照。运行验证失败或无命令回执，不得完成。

**修**：失败归因代码、文档歧义、文档未同步、范围蔓延；修后回到验证；3 轮不收敛交用户。摘要：`自动修正 N · 中止 M · 待确认 K · 归因：skill / 文档 / 代码 / 范围`。

## 红旗/出口

红旗：未读目标改代码；无运行验证却完成；代码与 goal/modules 不一致；测试不覆盖 AC；BDD 场景改写 AC；测试无 AC# 追溯；bugfix 无 red seam 或使用错误 seam；关键逻辑无编号；新增 goal 外功能/依赖。

出口：代码/测试已生成；运行验证、相关测试、目标对照通过；每个验证项有命令回执；未验证和阻塞项显式交出。历史遵循 `../shared/concepts/history-maintenance.md`，证据写 CU，不生成 trace。
