---
name: detail
description: Clarifies unclear behavior or shared feature contracts into goal.md and only necessary modules.
when_to_use: Use for unclear boundaries, cross-domain contracts, durable feature goals, or goal/module inconsistency; skip clear implementation-only patches.
---

# Forge Detail — 详设阶段编排

把需求/PRD + project + 既有 goal/modules/CU 转成可实现 `goal.md` + 必要 `modules/*.md`；下游暴露目标盲区时先复查目标并记录 downstream gap。它是可选合同能力，不是实现前置门。Refs: `../shared/concepts/adaptive-runtime.md`, `../shared/concepts/artifact-policy.md`, `../shared/concepts/history-maintenance.md`.

## Use / skip / no-op

行为边界、跨域共享合同或 goal 偏离时使用；清晰 L0/L1 跳过。权威 goal/modules 已完整时返回 no-op 缺口检查，不重写文档或要求后继。

## 硬门

- 文档是源头；冲突/前端存在性不明时停下；只加载需要的领域 skill。
- 读取 project、需求、既有 feature docs/CU；仅前端存在时读 DESIGN/interaction。
- 不用于已有完整 goal/modules 的单点小改。

## 流程

**Phase 0**：建 `docs/features/<feature>/goal.md`；首屏含目标/边界/完成标准，FD# 决策，module 索引，goal coverage（覆盖哪些 `src/`、`tests/`、module/发布面）。

**Phase 1: API 设计**：有后端才加载 `api-design`；API 先于 DB，记录 DB/前端/测试等下游依赖的单一权威。

**Phase 2: 数据库设计**：有 DB 才加载 `db-design`；消费 API 查询模式，产出模型、索引、迁移、删除语义。

**Phase 3**：有前端才加载 `frontend-design`。纯后端必须记录 `no frontend` 或 `skip design` 决策和理由，不加载 frontend-design/interaction-design/fe-system。

**Phase 4**：编号无冲突；建 modules 用**双轴判据**：(1) 文档必要性——goal 不足以表达公共接口/不变量；(2) 生成稳定性——该单元能否被 AI 一次可控生成、人能否独立验收。两轴交集定粒度，并服务可独立验收的 vertical slice，避免只按 frontend/backend/database 横切。接口签名、AC、路径、依赖只留单一权威，冲突交用户。

- 过细反例：Button/Title/Icon 级——标准件已有或无独立验收价值，不建 module。
- 过粗反例：一个 module 塞多个无法独立验收的单元——AI 单次生成失控，应拆。
- 文档必要性仍是首要轴；生成稳定性是叠加判据，不替代它。

## 红旗/出口

红旗：缺需求却完整生成；前端不明却加载 frontend-design；纯后端仍生成前端/设计合同；goal/module 重复不一致；静默否决 PRD 点名技术；范围不清却级联；看到偏差/复审信号却 fresh detail。

出口：goal 首屏完整；必要 modules 完整；goal coverage 覆盖 `src/` / `tests/` / modules；下游依赖和 downstream gap 已记录；冲突已交用户。下一动作只是给 Chain Owner 的建议，不自动调用 codegen；历史只由 Chain Owner 汇总一次。
