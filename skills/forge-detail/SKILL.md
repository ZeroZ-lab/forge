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
- **有前端** → `forge-api-design` + `forge-db-design` + `forge-frontend-design`
- **纯后端** → `forge-api-design` + `forge-db-design`
- **纯前端** → `forge-frontend-design`

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: API 设计**（如有后端）
加载 `forge-api-design` skill，完成 D1-D7 决策点。先确定资源模型、端点、错误、权限、幂等、并发和认证。

**Phase 2: 数据库设计**（如有后端）
加载 `forge-db-design` skill，完成 DB1-DB5 决策点。数据库设计消费 Phase 1 的资源模型和查询模式，不在缺少 API 合约时先行表设计。

**Phase 3: 前端设计**（如有前端）
加载 `forge-frontend-design` skill，完成 F1-F5 决策点。

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

完成后自动执行，不需要人工触发：

1. **追加 feature changelog.md**（如不存在则创建）：
   ```markdown
   ### v{版本} — {日期} — 技术详设
   - **触发**：{用户说的一句话}
   - **产出**：contract.md + modules/（{N} 个模块）
   - **决策**：{关键决策编号，如 D1-D7, DB1-DB5, F1-F5}
   ```

2. **追加 docs/timeline.md**（如不存在则创建）：
   ```markdown
   ### {日期} — {feature} 技术详设
   - 新增：contract.md + {N} 个模块
   ```

3. **检查膨胀**：timeline.md 或 changelog.md 超过 100 行时，旧记录归档。

**边界**：由 `forge-detail` 追加本次详设的一条汇总历史。`forge-api-design`、`forge-db-design`、`forge-frontend-design` 作为子阶段运行时不再各自追加历史；只有直接调用这些子 skill 时才维护自己的历史。

## 完成提示

完成后向用户展示：

```
✅ 详设完成！contract.md + modules/ 已生成。

下一步你可以：
  /forge-plan    — 把详设拆成可执行任务
  自然语言       — 直接说"生成代码"跳过任务分解
```
