---
name: detail
description: 详设阶段编排——按需加载 API + 数据库 + 前端 skill，产出 contract.md + modules/。用户说"技术详设"、"详细设计"、"设计 API"、或需要从 PRD/设计文档产出技术合约时触发。
---

# Forge Detail — 详设阶段编排

根据项目上下文按需加载领域 skill，产出技术合约文档。

## 加载判断

先确定加载哪些 skill：

1. 读 project.md 技术选型 → 有没有前端框架？
2. 读已有文档 → 有没有 frontend/ 目录？
3. 如果不确定 → 问用户："这个项目有前端吗？"

**加载组合**：
- **有前端** → `forge-api-design` + `forge-db-design` + `forge-frontend-design`
- **纯后端** → `forge-api-design` + `forge-db-design`
- **纯前端** → `forge-frontend-design`

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: API 设计**（如有后端）
加载 `forge-api-design` skill，走完 D1-D7 方法论步骤。先确定资源模型、端点、错误、权限、幂等、并发和认证。

**Phase 2: 数据库设计**（如有后端）
加载 `forge-db-design` skill，走完 DB1-DB5 方法论步骤。数据库设计消费 Phase 1 的资源模型和查询模式，不在缺少 API 合约时先行表设计。

**Phase 3: 前端设计**（如有前端）
加载 `forge-frontend-design` skill，走完 F1-F5 方法论步骤。

## 漂移检测

所有 Phase 完成后，检查跨文档一致性：

1. 读每个领域 contract.md 的「下游依赖」表（如有）
2. 逐一检查下游文档的依赖内容是否仍与当前 contract 一致
3. 汇总：
   - **一致**：记录"下游已同步"
   - **漂移**：列出偏移点和位置，提示用户确认级联更新

**不变原则**：
- 下游依赖表为空或不存在 → 跳过，不报错
- 漂移 ≠ 错误——上游改了下游没跟，可能需要更新也可能不需要
- 漂移点呈现给用户决策，AI 不自动修改下游文档

**偏差信号接收**：如果 codegen 偏差摘要中同类 L1 偏差连续 ≥ 2 个任务出现，建议复查 contract 对应部分——偏差可能是 contract 盲区而非代码问题。

## 产出

```
docs/features/<feature>/
├── contract.md              # feature 级共享骨架（必选）
├── api/                     # 有后端时
│   ├── contract.md
│   └── modules/*.md
├── frontend/                # 有前端时
│   ├── contract.md
│   └── modules/*.md
└── database/                # 有后端时
    └── contract.md
```

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`forge-api-design`、`forge-db-design`、`forge-frontend-design` 作为子阶段时不单独追加历史。超 100 行时归档。

## 完成提示

完成后向用户展示：

```
✅ 详设完成！contract.md + modules/ 已生成。

下一步你可以：
  plan 阶段    — 把详设拆成可执行任务
  自然语言       — 直接说"生成代码"跳过任务分解
```
