---
name: interaction-design
description: Reviews and designs user flows, navigation, information architecture, wireframes, interaction patterns, feedback states, and edge flows before frontend implementation.
when_to_use: Use when defining user flow, page structure, navigation, information architecture, interaction details, error/empty/loading states, or reviewing whether a UI flow is coherent.
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

记录主流程和异常流程。

### I2: 信息架构（结构阶段）

记录页面和对象层级。

### I3: 页面布局（结构阶段）

记录布局意图和响应式断点，不写视觉 token。

### I4: 组件复用（模式阶段）

记录复用组件、定制组件和拒绝理由。

### I5: 交互细节（细节阶段）

记录反馈、错误、键盘/触摸和可访问行为。

## 文档约束

产出 interaction spec，模板 `${CLAUDE_SKILL_DIR}/references/interaction-template.md`。必须包含流程图/步骤、页面结构、状态表、异常路径和开放问题。

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

完成后追加 feature changelog；由 design 编排器汇总 timeline。
