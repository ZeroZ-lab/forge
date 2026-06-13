---
name: detail
description: Orchestrates the full detail stage across multiple domain documents to produce goal.md and modules. Use only when the user explicitly asks for detail stage or cross-domain documents must be coordinated.
when_to_use: Use when the user says technical detail design, detail stage, full goal design, coordinate multiple domain documents, turn PRD or design docs into technical goals, or resolve cross-domain goal inconsistency.
---

# Forge Detail — 详设阶段编排

## 运行时角色

`detail` 是目标细化器：把 PRD、project、DESIGN、历史偏差信号转成可实现的 `goal.md` + `modules/*.md`，并在 codegen/review 发现目标盲区时负责复查目标而不是直接改代码。

读取共享标准：目标验证 `${CLAUDE_SKILL_DIR}/../shared/concepts/control-loop.md`；目标文档 `${CLAUDE_SKILL_DIR}/../shared/concepts/document-as-goal.md`；目标质量 `${CLAUDE_SKILL_DIR}/../shared/rubrics/goal-quality.md`；目标漂移/范围蔓延 `${CLAUDE_SKILL_DIR}/../shared/red-flags/goal-drift.md`、`${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`。

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
- 既有 feature `goal.md`、`modules/*.md`、changelog/timeline。
- `codegen` 验证摘要或 `review` 一致性报告：由偏差触发时先读。

## 加载判断

先判断项目形态：

- 有后端 + 前端：`api-design` → `db-design` → `frontend-design`
- 纯后端：`api-design` → `db-design`
- 纯前端：`frontend-design`
- 前端是否存在不确定：暂停询问，不默认加载。

## 流程

**Phase 0: Feature 骨架创建**（必选）

创建 `docs/features/<feature>/goal.md`。首屏必须包含目标、边界、完成标准；用 FD# 记录跨领域决策；只放跨模块共享数据模型；需要细节时索引到 `modules/*.md`。模板：`${CLAUDE_SKILL_DIR}/../shared/goal-template.md`。

**Phase 1: API 设计**（如有后端）

加载 `api-design`，完成 API1-API7：资源、分页、错误、权限、幂等、并发、认证。API 合约先于数据库表设计。

**Phase 2: 数据库设计**（如有后端）

加载 `db-design`，完成 DB1-DB5：数据库、ID、索引、迁移、软删除。数据库设计消费 Phase 1 的资源模型和查询模式。

**Phase 3: 前端设计**（如有前端）

加载 `frontend-design`，完成 FE1-FE5 或创意编码替代决策点。前端只设计行为、数据流和组件模块，不重做视觉系统。

**Phase 4: 索引同步 + 质量门**（必选）

1. 同步 project.md Feature 索引；检查 PD#/FD#/API#/DB#/FE# 无冲突。
2. 生成或校验 `modules/*.md`：后端用 `${CLAUDE_SKILL_DIR}/../shared/module-template.md`，前端用 `${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`。
3. 模块索引必须对称：要么全部有 spec，要么全部内联完整接口；禁止 P0/P1 有 spec、P2 缺失。
4. 运行 goal-quality 门：源完整性和可重构性不通过时回到对应 Phase。
5. 做跨文档一致性门：接口签名、AC、具名技术、路径和依赖只保留单一权威；冲突交给用户决策。

## 分支与恢复

- 缺 PRD/需求输入：不直接写 goal；要求补需求或明确最小 detail。
- 同类 repeat 偏差触发：先复查 goal/module 盲区，再决定是否改代码。
- 下游一致性问题影响范围不清：输出一致性报告，不自动级联。
- 依赖声明无使用方、目录声明无落地、路径有两套说法：移除/标注预留前先报告。

## 红旗清单

- PRD 缺失却直接生成完整 goal。
- 前端存在性不确定却默认加载 frontend-design。
- module 文件缺模板必需节。
- 同一接口/Props 在 goal 与 module 重复定义且不一致。
- 静默否决 PRD 点名技术。
- goal 质量不足仍进入 codegen。

## 运行时信号

- 输入：repeat signal from codegen；consistency issue from review。
- 输出：feature goal updated；module specs updated；human decision needed。
- 升级：goal ambiguity；downstream consistency conflict；frontend presence unclear。

## 产出

```txt
docs/features/<feature>/
├── goal.md       # 目标/边界/完成标准/FD#/共享模型/模块索引
├── changelog.md
└── modules/*.md # 模块接口、数据、行为、依赖、验收
```

## 验证清单

- [ ] `goal.md` 首屏是否包含目标、边界、完成标准？
- [ ] API1-API7 / DB1-DB5 / FE1-FE5 是否按加载组合完成？
- [ ] 编号是否无冲突，project.md Feature 索引是否同步？
- [ ] `modules/*.md` 是否完整且索引对称？
- [ ] 跨文档一致性门、依赖落地、路径一致性是否通过？

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`。子阶段不单独追加历史。若启用 `docs/status.md`，标记 ③详设 `✅`，下一阶段 ④任务 `🔄`，跳过阶段写明原因。超 100 行时归档。

## 出口条件

`goal.md + modules/*.md` 完整；加载的领域决策齐全；编号、索引、一致性、依赖和路径检查通过；未解决冲突已交给用户决策。
