---
name: design
description: 设计阶段编排——交互规格 + 视觉规范，一次对话完成交互和视觉设计。用户说"做设计"、"交互设计"、"设计阶段"、或需要从 PRD 产出交互规格和设计系统时触发。
---

# Forge Design — 设计阶段编排

一次对话完成交互 + 视觉设计。

## 运行时角色

`design` 是设计阶段 orchestrator。它判断当前任务是否真的需要交互和视觉设计，并协调 `interaction-design` 与 `fe-system` 的边界。

## 输入状态读取

开始前读取：

- `PRD.md` 或等价需求说明
- 是否为纯后端 API
- 是否已有 `docs/features/<feature>/interaction-spec.md`
- 是否已有 `DESIGN.md`
- 用户是否只需要交互、只需要视觉，或需要完整设计阶段

## 分支与恢复

- 纯后端 API → 跳过整个设计阶段，记录跳过原因并进入 detail。
- 已有 interaction-spec → Phase 1 只检查是否与 PRD 对齐，不重复设计。
- 已有 DESIGN.md → Phase 2 只处理 feature 相关增量和冲突。
- 用户不确认视觉方向 → 停止生成 DESIGN.md，保留 2-3 个方向和代价供选择。
- 交互和视觉职责冲突 → 按“行为归 interaction，外观归 fe-system”拆分，不混写。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 交互设计**
加载 `interaction-design` skill，走完 I1-I5 方法论步骤。

**Phase 2: 设计系统落地**
加载 `fe-system` skill，走完 S1-S5 方法论步骤。

## 产出

```
docs/features/<feature>/interaction-spec.md    # 来自 Phase 1
DESIGN.md（更新）                               # 来自 Phase 2
```

## 跳过规则

- 纯后端 API → 跳过整个阶段，直接进入 `detail 阶段`
- 已有 DESIGN.md → Phase 2 只更新 feature 相关的部分

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`interaction-design` 和 `fe-system` 作为子阶段时不单独追加历史。超 100 行时归档。

## 运行时信号

- **signals in**：设计阶段需要、纯后端跳过、已有设计冲突。
- **signals out**：interaction-spec ready、DESIGN ready、human decision needed。
- **升级条件**：PRD 缺关键用户流程、视觉方向未确认、已有 DESIGN.md 冲突不可自动合并。

## 完成提示

完成后向用户展示：

```
✅ 设计阶段完成！interaction-spec.md + DESIGN.md 已更新。

下一步你可以：
  detail 阶段  — 做技术详设（API + 数据库 + 前端）
  自然语言       — 直接说"设计 API"或"设计数据库"单独进入某个领域
```
