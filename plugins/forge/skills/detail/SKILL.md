---
name: detail
description: Orchestrates the full detail stage across multiple domain documents to produce goal.md and modules. Use only when the user explicitly asks for detail stage or cross-domain documents must be coordinated.
when_to_use: Use when the user says technical detail design, detail stage, full goal design, coordinate multiple domain documents, turn PRD or design docs into technical goals, or resolve cross-domain goal inconsistency.
---

# Forge Detail — 详设阶段编排

## 运行时角色

`detail` 是目标细化器：把 PRD、project、DESIGN、历史偏差信号转成可实现的 `goal.md` + `modules/*.md`，并在 codegen/review 发现目标盲区时负责复查目标而不是直接改代码。

读取共享标准：目标验证 `${CLAUDE_SKILL_DIR}/../shared/concepts/control-loop.md`；目标文档 `${CLAUDE_SKILL_DIR}/../shared/concepts/document-as-goal.md`；目标质量 `${CLAUDE_SKILL_DIR}/../shared/rubrics/goal-quality.md`；目标漂移/范围蔓延 `${CLAUDE_SKILL_DIR}/../shared/red-flags/goal-drift.md`、`${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`。

所有产物遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：默认 goal，modules 只在公共接口或不变量需要下钻时创建。

## 执行纪律

- D3：前端存在性、目标矛盾、跨文档冲突不确定时停下给用户决策。
- D5：只加载需要的领域 skill；纯后端不加载 frontend-design。
- D2：文档是源头；一致性问题先报告，不静默级联。
- D6：不确定需求写 `[NEEDS CLARIFICATION: ...]`。

## 何时不使用

只有单模块小改、已有完整 `goal.md + modules/`、用户只想改一个端点时，不走完整 detail；直接进入对应 domain skill 或 patch。

## 输入状态读取

- `docs/project.md`：技术选型、共享约束、目录结构、测试策略。
- `PRD.md` 或等价需求：场景、AC 编号、范围排除。
- `DESIGN.md`、interaction spec：仅前端存在时读取。
- 既有 feature `goal.md`、`modules/*.md`、相关 Change Units。

## 加载判断

按项目形态加载：后端走 `api-design → db-design`，前端走 `frontend-design`，两者都有则全走；前端是否存在不确定则暂停询问，不默认加载。

## 流程

**Phase 0: Feature 骨架创建**（必选）

创建 `docs/features/<feature>/goal.md`。首屏必须包含目标、边界、完成标准；用 FD# 记录跨领域决策；只放跨模块共享数据模型；需要细节时索引到 `modules/*.md`。模板：`${CLAUDE_SKILL_DIR}/../shared/goal-template.md`。

**Phase 1: API 设计**（如有后端）

加载 `api-design`。只依赖其公开产出与出口条件：资源和端点合约覆盖请求、响应、错误、权限及必要的可靠性约束。API 合约先于数据库表设计。

**Phase 2: 数据库设计**（如有后端）

加载 `db-design`。只依赖其公开产出与出口条件：数据模型、查询模式、索引、迁移和删除语义可被实现与验证。数据库设计消费 Phase 1 的资源模型和查询模式。

**Phase 3: 前端设计**（如有前端）

加载 `frontend-design`。只依赖其公开产出与出口条件：页面/组件 module、数据消费、状态和交互约束完整。前端只设计行为、数据流和组件模块，不重做视觉系统。

**Phase 4: 质量门**（必选）

1. 检查项目、feature 和领域决策编号无冲突。
2. 仅在 goal 不足以表达模块接口/不变量时生成或校验 `modules/*.md`：后端用 `${CLAUDE_SKILL_DIR}/../shared/module-template.md`，前端用 `${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`。
3. 运行 goal-quality 门：源完整性和可重构性不通过时回到对应 Phase。
4. 做跨文档一致性门：接口签名、AC、具名技术、路径和依赖只保留单一权威；冲突交给用户决策。

## 分支与恢复

- 缺 PRD/需求输入：不直接写 goal；要求补需求或明确最小 detail。
- 同类 repeat 偏差触发：先复查 goal/module 盲区，再决定是否改代码。
- 下游一致性问题影响范围不清：输出一致性报告，不自动级联。

## 红旗清单

- PRD 缺失却直接生成完整 goal。
- 前端存在性不确定却默认加载 frontend-design。
- module 文件缺模板必需节。
- 同一接口/Props 在 goal 与 module 重复定义且不一致。
- 静默否决 PRD 点名技术。

## 运行时信号

输入 repeat(codegen)/consistency(review)；输出 goal+modules 更新或 human decision；升级 goal 歧义、跨文档冲突、前端存在性不明。

## 产出

`docs/features/<feature>/goal.md`（目标/边界/完成标准/FD#/模块指针）+ 必要 `modules/*.md`（公共接口、不变量、依赖）。

## 验证清单

- [ ] `goal.md` 首屏是否包含目标、边界、完成标准？
- [ ] 已加载的领域 skill 是否分别满足自己的出口条件？
- [ ] 需要的 `modules/*.md` 是否完整，不需要的是否未创建？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`；出口条件通过后只汇总一次，子阶段不单独写。

## 出口条件

`goal.md` 完整，必要 modules 满足接口/不变量需要；加载的领域产出满足各自出口条件；编号、一致性、依赖和路径检查通过；未解决冲突已交给用户决策。
