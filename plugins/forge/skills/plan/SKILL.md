---
name: plan
description: Converts goals and modules into executable vertical-slice task plans with dependencies, ordering, risks, and verification strategy.
when_to_use: Use when a feature spans multiple modules, has task dependencies, needs sequencing, parallelization, risk-first delivery, or a plan.md before implementation.
---

# Plan — 任务分解

## 职责

把 `goal.md + modules/*.md` 拆成可执行任务序列。每个任务必须是可独立验证的用户价值切片，不按技术层水平切。

## 执行纪律

- D4：任务按垂直切片，不为了整洁重构扩大范围。
- D5：只规划任务，不写实现。
- D7：每个任务必须有验证方式，来自 goal/modules 的 AC。

## 输入

读取 goal、modules、project 约束、已知风险、测试策略和依赖关系。缺验收条件时回 define/detail。

## 方法论：识别→切片→排序→验证→检查

### P1: 识别（Identify）

列出模块、用户路径、依赖、共享资源、风险点和阻塞条件。

### P2: 切片（Slice）

每个任务包含入口、行为、数据、接口、测试和完成证据。超过 7 步先拆小。

### P3: 排序（Order）

按依赖拓扑排序；高风险和高不确定性任务前置；可并行任务标明无共享写集。

### P4: 验证（Verify）

给每个任务标注 TDD、直接验证或手动验收；业务逻辑至少有一条端到端验证。

### P5: 检查（Checkpoint）

设置中途 review 点：跨模块边界、迁移、权限、外部依赖、性能或发布风险。

### P6: 测试推导（Test Derivation）

从 AC 和验证方式推导 `testing/test-cases.md` 骨架；不可自动化的标注手动验收。

## 文档约束

产出 `plan.md`，使用 `${CLAUDE_SKILL_DIR}/references/plan-template.md`。必须包含：模块依赖图、任务清单、拓扑顺序、并行矩阵、关键路径、风险、检查点、验证方式。测试场景输出到 `testing/test-cases.md`。

## 入口/出口条件

入口：已有 goal/modules，任务跨多个模块或用户要求计划。出口：plan 和测试骨架完成，任务能直接交给 codegen。

## 红旗清单

- 按 schema/routes/UI 水平分层。
- 任务没有 AC 或验证方式。
- 高风险任务排在最后。
- 并行任务共享同一写集。
- plan 引入 goal 外范围。

## 验证清单

- [ ] 任务是否垂直切片（完整可验证的用户价值）？
- [ ] 依赖顺序和并行矩阵是否明确？
- [ ] 每个任务是否有验证方式（TDD 或直接验证）？
- [ ] 高风险任务是否前置？
- [ ] 测试骨架是否能追溯 AC？

## 历史维护

完成后追加 feature changelog 和 `docs/timeline.md`；超 100 行归档。
