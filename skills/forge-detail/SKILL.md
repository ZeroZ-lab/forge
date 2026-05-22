---
name: forge-detail
description: 详设阶段编排——按需加载 API + 数据库 + 前端 skill，产出 contract.md + modules/。用户说"技术详设"、"详细设计"、"设计 API"、运行 /forge-detail、或需要从 PRD/设计文档产出技术合约时触发。
---

# Forge Detail — 详设阶段编排

根据项目上下文按需加载领域 skill，产出技术合约文档。

## 加载判断

先确定加载哪些 skill：

1. 读 project.md 技术选型 → 有没有前端框架？
2. 读已有文档 → 有没有 frontend/ 目录？
3. 如果不确定 → 问用户："这个项目有前端吗？"

**加载组合**：
- **有前端** → `db-design` + `api-design` + `frontend-design`
- **纯后端** → `db-design` + `api-design`
- **纯前端** → `frontend-design`

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 数据库设计**（如有后端）
加载 `db-design` skill，完成 DB1-DB5 决策点。

**Phase 2: API 设计**（如有后端）
加载 `api-design` skill，完成 D1-D7 决策点。

**Phase 3: 前端设计**（如有前端）
加载 `frontend-design` skill，完成 F1-F5 决策点。

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
└── database/                # 复杂项目单独拆出
    └── contract.md
```

## 完成提示

完成后向用户展示：

```
✅ 详设完成！contract.md + modules/ 已生成。

下一步你可以：
  /forge-plan    — 把详设拆成可执行任务
  自然语言       — 直接说"生成代码"跳过任务分解
```
