---
name: review
description: Independent findings-first review of diffs, tests, and goal consistency, separate from verification.
when_to_use: Use for explicit review, L2/L3 or P0/P1 risk, or release readiness; skip routine L0/L1 self-checks.
---

# Review — 独立审查

找会导致目标未达成、错误发布或未来验证失败的问题；不是总结优点。它是按风险使用的独立能力，不是每次实现后的固定阶段。审 project/goal/modules/CU/src/tests。Refs: `references/review-protocol.md`, `../shared/concepts/adaptive-runtime.md`, `../shared/concepts/artifact-policy.md`, `../shared/concepts/delegation-matrix.md`.

## Use / skip / no-op

显式审查、高风险或发布门时使用；L0/L1 self-check 跳过。没有可审产物或独立上下文时 no-op，返回缺失输入和残余风险。

## 硬门

- D1：每个 finding 有位置、证据、影响、修复建议、归因。
- D5：不直接改实现、不发布、不用同一轮 self-check 替代独立检查。
- D8：归因 skill 方法论、文档未同步、代码实现或范围蔓延。
- 不用于无产物、纯格式检查、同一实现上下文自证正确；若只能同上下文检查，明确标为 self-check 并退出本 Skill。

## 模式/流程

文档审查：查 WHAT/WHY/CONSTRAINTS、`[NEEDS CLARIFICATION]`、一致性、边界、接口、依赖、验收、人类决策。

代码审查：查实现是否满足 goal/modules；API、数据模型、错误码、权限、测试、FD#/PD#/DB#/AC# 是否对齐。

Buy-vs-build lens：前端/认证/ORM/SDK/部署/组件等成熟生态场景，查是否有 buy/build 理由；无理由自研标准件归因 research/codegen。

Safe-stop lens：bugfix 无 red-capable 命令时，只查 `src/`、`tests/`、project/goal 文档未改，未伪造 regression test，证据请求、`未验证风险` 和 `safe stop` 已记录。

流程：声明范围/读取文件 → 建目标基线 → 先 P0/P1 后 P2 → findings 先行 → 阻塞修复后复审。

## 独立性/优先级

L2/L3 或 P0/P1 代码风险在宣称 complete/release-ready 前必须按 delegation matrix 使用独立 subagent/verifier；Chain Owner 保留裁决。单文件 L0/L1 可由主控 self-check，但不能称为独立 review。高风险任务无独立执行条件时保持 partial/正确阻塞并披露残余风险，不把 self-check 计作本 Skill 的独立证据。

独立 reviewer 必须未参与实现并使用分离 context/actor；独立 verifier 必须是预声明或 host-private，且实现上下文不能改写输入和留存观察。Chain Owner 自跑普通测试只算 verification，不能冒充 independent evidence。

- P0：错误实现、数据损坏、安全漏洞、无法发布。
- P1：重要行为偏离、测试失真、未来验证失败。
- P2：清晰度、可维护性、局部一致性。

归因：skill → learn；文档 → detail；代码 → codegen；范围蔓延 → define/detail。

## 红旗/出口

红旗：只总结不列问题；只看格式不做目标对照；不读相关 CU 就否定既有决策；测试通过但代码和合约不一致；文档缺 WHY 却放行；发现问题后不复审/不归因。

出口：列 P0/P1/P2；P0/P1 必有位置、证据、影响、建议；无问题也说明测试缺口和残余风险。结果只交给 Chain Owner，不自动触发修复或其他后继 Skill。历史遵循 `../shared/concepts/history-maintenance.md`；只读 findings 不落盘，改变权威文档/发布/方法论时持久化。
