---
name: forge-design
description: 设计阶段编排——交互规格 + 视觉规范，一次对话完成交互和视觉设计。用户说"做设计"、"交互设计"、"设计阶段"、运行 /forge-design、或需要从 PRD 产出交互规格和设计系统时触发。
---

# Forge Design — 设计阶段编排

一次对话完成交互 + 视觉设计。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 交互设计**
加载 `interaction-design` skill，完成 I1-I5 决策点。

**Phase 2: 视觉设计**
加载 `visual-design` skill，完成 V1-V5 决策点。

## 产出

```
docs/features/<feature>/interaction-spec.md    # 来自 Phase 1
DESIGN.md（更新）                               # 来自 Phase 2
```

## 跳过规则

- 纯后端 API → 跳过整个阶段，直接进入 `/forge-detail`
- 已有 DESIGN.md → Phase 2 只更新 feature 相关的部分

## 历史维护（自动）

完成后自动执行，不需要人工触发：

1. **追加 feature changelog.md**（如不存在则创建）：
   ```markdown
   ### v{版本} — {日期} — 交互+视觉设计
   - **触发**：{用户说的一句话}
   - **产出**：interaction-spec.md + DESIGN.md 更新
   ```

2. **追加 docs/timeline.md**（如不存在则创建）：
   ```markdown
   ### {日期} — {feature} 设计完成
   - 新增：interaction-spec.md + DESIGN.md 更新
   ```

3. **检查膨胀**：timeline.md 或 changelog.md 超过 100 行时，旧记录归档。

## 完成提示

完成后向用户展示：

```
✅ 设计阶段完成！interaction-spec.md + DESIGN.md 已更新。

下一步你可以：
  /forge-detail  — 做技术详设（API + 数据库 + 前端）
  自然语言       — 直接说"设计 API"或"设计数据库"单独进入某个领域
```
