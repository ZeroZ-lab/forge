---
name: review
description: Reviews diffs, docs, code, tests, and goal consistency before build or release.
when_to_use: Use when the user asks to review changes, inspect a diff, audit docs/code, find goal inconsistency, or assess release readiness.
---

# Review — 独立审查

找会导致目标未达成、错误发布或未来验证失败的问题；不是总结优点。审 project/goal/modules/CU/src/tests。Refs: `references/review-protocol.md`, `../shared/concepts/artifact-policy.md`, `../shared/concepts/delegation-matrix.md`.

## 硬门

- D1：每个 finding 有位置、证据、影响、修复建议、归因。
- D5：不直接改实现、不发布、不用同一轮自审替代独立检查。
- D8：归因 skill 方法论、文档未同步、代码实现或范围蔓延。
- 不用于无产物、纯格式检查、同一实现上下文自证正确。

## 模式/流程

文档审查：查 WHAT/WHY/CONSTRAINTS、`[NEEDS CLARIFICATION]`、一致性、边界、接口、依赖、验收、人类决策。

代码审查：查实现是否满足 goal/modules；API、数据模型、错误码、权限、测试、FD#/PD#/DB#/AC# 是否对齐。

Buy-vs-build lens：前端/认证/ORM/SDK/部署/组件等成熟生态场景，查是否有 buy/build 理由；无理由自研标准件归因 research/codegen。

Safe-stop lens：bugfix 无 red-capable 命令时，只查 `src/`、`tests/`、project/goal 文档未改，未伪造 regression test，证据请求、`未验证风险` 和 `safe stop` 已记录。

流程：声明范围/读取文件 → 建目标基线 → 先 P0/P1 后 P2 → findings 先行 → 阻塞修复后复审。

## 独立性/优先级

P0/P1 代码风险按 delegation matrix 默认用独立 subagent；主控保留裁决。单文件 lens、纯文档或无 subagent 时可主控自审并声明残余风险。

- P0：错误实现、数据损坏、安全漏洞、无法发布。
- P1：重要行为偏离、测试失真、未来验证失败。
- P2：清晰度、可维护性、局部一致性。

归因：skill → learn；文档 → detail；代码 → codegen；范围蔓延 → define/detail。

## 红旗/出口

红旗：只总结不列问题；只看格式不做目标对照；不读相关 CU 就否定既有决策；测试通过但代码和合约不一致；文档缺 WHY 却放行；发现问题后不复审/不归因。

出口：列 P0/P1/P2；P0/P1 必有位置、证据、影响、建议；无问题也说明测试缺口和残余风险。历史遵循 `../shared/concepts/history-maintenance.md`；只读 findings 不落盘，改变权威文档/发布/方法论时持久化。
