---
name: interaction-design
description: Optional interaction-flow design/review for explicit UX requests or unresolved navigation/state behavior.
when_to_use: Use when the user asks for interaction/UX design or uncertain flows, navigation, information architecture, feedback, or edge states require a reviewable contract.
---

# Interaction Design — 交互设计

## 职责

定义用户怎么完成任务：流程、结构、模式、反馈和异常路径。视觉语言归 fe-system，前端实现归 frontend-design/fe-artifact。

## 执行纪律

- D4：核心操作尽量 3 步内完成，复用模式优先。
- D5：只定义交互行为，不写外观和实现。
- D7：每个流程必须有异常路径和反馈。

## 方法论：流程→结构→模式→细节

### 第一步：画流程（Flow）

列入口、目标、关键动作、成功出口、失败出口和返回路径。

### 第二步：定结构（Structure）

定义页面/区域、信息层级、导航关系和主要对象。

### 第三步：选模式（Pattern）

选择表单、列表、详情、向导、看板、弹窗等模式；复用既有产品模式。

### 第四步：补细节（Detail）

loading、empty、error、disabled、success、undo、confirm、权限和移动端行为。

## 决策点

### I1: 用户流程（流程阶段）

记录主流程和异常流程；主流程决策 ID 使用 `primary_flow`，并写明入口、成功出口、异常出口和被拒路径。

### I2: 信息架构（结构阶段）

记录页面和对象层级。

### I3: 页面布局（结构阶段）

记录布局意图和响应式断点，不写视觉 token。

### I4: 组件复用（模式阶段）

记录复用组件、定制组件和拒绝理由。

### I5: 交互细节（细节阶段）

记录反馈、错误、键盘/触摸和可访问行为。

## 文档约束

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。默认把必要的流程、状态和异常约束写入 `goal.md` 或对应 module。只有复杂流程需要独立设计 review、交付或更新时，才用 `${CLAUDE_SKILL_DIR}/references/interaction-template.md` 创建 `interaction-spec.md`。

流程图、状态图、时序图按 PD8 选型，遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/diagram-policy.md`：Mermaid 优先，PlantUML 仅在 Mermaid 表达不了时兜底；图内联进权威文档，不建独立散图文件。

## 入口/出口条件

入口：用户路径不清、UI flow 需设计或 review。出口：frontend-design 能据此拆组件和数据流。

## 红旗清单

- 只有页面清单没有用户流程。
- 无错误/空/加载状态。
- 异常流程缺失。
- 交互细节变成视觉设计。
- 移动端和键盘操作未考虑。

## 验证清单

- [ ] I1-I5 是否完整？
- [ ] 主路径和异常路径是否可走通？
- [ ] 每个操作是否有反馈状态？
- [ ] 信息层级和导航是否明确？
- [ ] 是否留给 fe-system/frontend-design 正确边界？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。作为 `design` 子阶段时不单独写；standalone 且产生变更时持久化。
