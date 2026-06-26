---
name: detail
description: Orchestrates the full detail stage across multiple domain documents to produce goal.md and modules. Use only when the user explicitly asks for detail stage or cross-domain documents must be coordinated.
when_to_use: Use when the user says technical detail design, detail stage, full goal design, coordinate multiple domain documents, turn PRD or design docs into technical goals, or resolve cross-domain goal inconsistency.
---

# Forge Detail — 详设阶段编排

把需求/PRD + project + 既有 goal/modules/CU 转成可实现 `goal.md` + 必要 `modules/*.md`；下游暴露目标盲区时先复查目标。Refs: `../shared/concepts/document-as-goal.md`, `../shared/rubrics/goal-quality.md`, `../shared/concepts/artifact-policy.md`.

## 硬门

- D2/D3/D5/D6：文档是源头；冲突/前端存在性不明时停下；只加载需要的领域 skill；未知写 `[NEEDS CLARIFICATION: ...]`。
- 不用于单模块小改、已有完整 goal/modules、只改一个端点。
- 读取 project、需求、既有 feature docs/CU；仅前端存在时读 DESIGN/interaction。

## 流程

**Phase 0: Feature 骨架创建**：建 `docs/features/<feature>/goal.md`，首屏含目标/边界/完成标准，FD# 记决策，细节索引 modules。模板：`../shared/goal-template.md`。

**Phase 1: API 设计**：有后端才加载 `api-design`；资源/端点覆盖请求、响应、错误、权限、可靠性；API 先于 DB。

**Phase 2: 数据库设计**：有 DB 才加载 `db-design`；消费 API 查询模式，产出模型、索引、迁移、删除语义。

**Phase 3: 前端设计**：有前端才加载 `frontend-design`；产出页面/组件 module、数据消费、状态/交互。

**Phase 4: 质量门**：编号无冲突；仅 goal 不足以表达公共接口/不变量时建 modules（`../shared/module-template.md`）；跑 goal-quality；接口签名、AC、路径、依赖只留单一权威，冲突交用户。

## 红旗/出口

红旗：缺需求却完整生成；前端不明却加载 frontend-design；module 缺模板必需节；goal/module 重复且不一致；静默否决 PRD 点名技术；范围不清却自动级联。

出口：goal 首屏完整；必要 modules 完整；领域产出达标；编号/一致性/依赖/路径通过；未解决冲突已交用户。历史遵循 `../shared/concepts/history-maintenance.md`，只汇总一次。
