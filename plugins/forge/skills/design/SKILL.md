---
name: design
description: Orchestrates the full design stage across interaction design and visual system decisions. Use only when the user explicitly asks for the design stage or when interaction and design-system outputs must be coordinated.
when_to_use: Use when the user says to run the design stage, produce both interaction-spec and DESIGN.md, coordinate interaction-design with fe-system, or resolve conflicts between behavior and visual system decisions.
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

## 何时不使用
- 纯后端 API（无交互和视觉设计需求）
- 已有完整的 interaction-spec.md + DESIGN.md
- 用户只想做交互设计（直接使用 interaction-design）
- 用户只想做设计系统（直接使用 fe-system）

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`interaction-design` 和 `fe-system` 作为子阶段时不单独追加历史。超 100 行时归档。

## 红旗清单
- 用户不确认视觉方向 → 停止生成 DESIGN.md，保留 2-3 个方向和代价
- 交互和视觉职责混淆 → 按"行为归 interaction，外观归 fe-system"拆分
- PRD 缺失或过于模糊 → 不开始设计，先要求补需求
- 用户跳过交互直接要视觉 → 警告风险（"没有交互规格的视觉设计可能和流程脱节"）
- 纯后端项目进入 design → 自动跳过，记录跳过原因

## 验证清单
- [ ] interaction-spec.md 是否已生成/更新？
- [ ] DESIGN.md 是否已更新 feature 相关部分？
- [ ] 交互和视觉是否有职责重叠？
- [ ] 两个子 skill 的产出是否一致（interaction-spec 引用的组件在 DESIGN.md 中有对应 Token）？
- [ ] 用户是否确认关键视觉方向？

## 入口/出口条件
**入口**：有 PRD.md 或等价需求说明 · 项目需要交互和/或视觉设计
**出口**：interaction-spec.md + DESIGN.md 已生成/更新 · 用户确认进入 detail 阶段

**缺失处理**：
- 无 PRD → 不开始设计，先要求补需求
- 已有 interaction-spec → Phase 1 只检查对齐，不重复设计
- 已有 DESIGN.md → Phase 2 只处理 feature 增量

## 运行时信号

- 输入：design needed、frontend absent
- 输出：interaction spec ready、design tokens ready
- 路由：详见 `registry.yaml` 的 `forge-design` 节点；本节只保留人类可读摘要。
- 升级：用户不确认视觉方向 · 交互和视觉职责冲突

## 完成提示

完成后向用户展示：

```
✅ 设计阶段完成！interaction-spec.md + DESIGN.md 已更新。

下一步你可以：
  detail 阶段  — 做技术详设（API + 数据库 + 前端）
  自然语言       — 直接说"设计 API"或"设计数据库"单独进入某个领域
```

