# Archived Skill Audit Fix Plan

> 归档日期：2026-06-16
> 原始文档：2026-05-30 的 Forge Skill 套件修复方案
> 状态：历史参考，不作为当前执行入口。

## 为什么归档

原文件是一次性修复计划，包含逐 skill 的长清单、并行 agent 分工和当时的 frontmatter 信号方案。当前 Forge 已经通过后续 Change Unit、runtime skill 压缩和 validator 约束演进到新状态，继续把 1000+ 行旧计划放在活跃 docs 根目录会造成三类问题：

- 读者误以为旧计划仍是当前 roadmap。
- 根目录文档噪音过高，违反“默认入口服务小功能迭代”的压缩目标。
- 旧 artifact 命名和当前 canonical 布局不完全一致，容易制造误导。

## 原计划核心结论

- 保持 `plugins/forge/skills/` flat list，不新增嵌套 skill 目录。
- 编排器和领域 skill 分工要清楚：编排器协调阶段，领域 skill 负责本领域决策。
- 运行时信号、产物所有权、红旗、入口/出口条件和验证清单需要统一。
- 优先修复骨架缺失的编排 skill，再修复身份分裂和中等强度 skill，最后微调优秀 skill。
- 修复应以最小编辑完成，每个 skill 文件独立修改，避免大范围结构重写。

## 历史执行分组

| 分组 | 内容 |
|------|------|
| P1 | `design`、`test`、`init` 的骨架补齐 |
| P2 | `detail`、`fe-artifact`、`fe-accept`、`fe-system` 的职责和红旗修复 |
| P3 | `review`、`business-alignment`、`test-cases` 的中等强度修复 |
| P4/P5 | 其余领域 skill 的信号、缺失处理和决策编号微调 |
| S1/S2 | 信号词汇表和产物所有权的套件级整理 |

## 当前替代入口

- 当前 skill 运行时文本和预算约束：`plugins/forge/skills/*/SKILL.md` + `scripts/validate.mjs`
- 架构审计结论：`docs/skill-architecture-audit.md`
- 评测系统说明：`docs/skill-suite-evaluation.md`
- 方法论演进历史：`docs/timeline.md`、`docs/timeline/2026.md`
- 变更事实源：`docs/change-units/CU-*.md`

## 保留原因

这份摘要保留当时的修复意图和优先级，便于理解 2026-05-30 附近的演进背景。逐条旧修补清单不再保留；如果需要判断当前应如何修改 skill，以当前 skill 文件、validator 和最新 Change Unit 为准。
