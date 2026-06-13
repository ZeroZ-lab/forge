---
name: business-alignment
description: Aligns a product direction into project commitment by defining users, success metrics, resource constraints, and Go/No-Go decision.
when_to_use: Use after brainstorm or when a project idea needs validation against users, success metrics, constraints, resources, and commitment before technical definition.
---

# Business Alignment — 业务对齐

## 职责

把方向变成是否值得做的承诺：为谁做、做到什么程度、用多少资源、现在 Go 还是 No-Go。

## 执行纪律

- D1：Go/No-Go 必须记录理由，No-Go 留给未来复评。
- D3：四要素冲突时停下呈现取舍。
- D6：资源和市场假设显式列出。

## 方法论：承诺四要素

### 要素 1: 为谁做（用户画像）

明确目标用户、使用场景、痛点强度、替代方案和触发频率。

### 要素 2: 做到什么程度（成功指标）

定义可观察成功指标、失败指标和验证窗口。

### 要素 3: 有多少资源（约束）

时间、人员、预算、已有资产、合规、发布窗口。

### 要素 4: Go / No-Go（承诺决策）

根据用户价值、指标、资源和风险做继续/缩小/暂停决策。

## 决策点

### BA1: 用户画像

记录核心用户和非目标用户。

### BA2: 成功指标

记录主指标、辅助指标、最低成功标准。

### BA3: 资源约束

记录硬约束、可调整约束和假设。

### BA4: Go / No-Go

记录选择、理由、拒绝选项和复评条件。

## 文档约束

更新 `docs/idea-brief.md` 或 `docs/project.md` 的业务承诺摘要；不写技术方案。

## 入口/出口条件

入口：有候选方向但未决定是否投入。出口：Go/No-Go 明确，define/init 能继续。

## 轻量模式

小功能只回答：用户、成功标准、资源边界、是否值得现在做。

## 红旗清单

- 没有用户却直接技术设计。
- 指标不可测。
- 资源假设不写。
- 四要素冲突仍 Go。
- 跳过 brainstorm 但方向未验证。

## 验证清单

- [ ] 用户和非目标用户是否清楚？
- [ ] 成功指标是否可测？
- [ ] 资源约束是否显式？
- [ ] Go/No-Go 是否有理由和复评条件？

## 历史维护（自动）

完成后追加 idea/project 历史和必要 Change Unit。
