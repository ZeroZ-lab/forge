---
name: define
description: Defines requirements, constraints, user stories, scope exclusions, and testable acceptance criteria. Use for lightweight requirement clarification or full PRD creation before detail/codegen.
when_to_use: Use when the user describes a feature with unclear scope, asks to define requirements, write a PRD, clarify acceptance criteria, decide in/out of scope, or turn a rough idea into testable product constraints.
---

# Define — 需求定义

## 职责

把方向变成可执行 PRD：做什么、不做什么、谁用、如何验收。define 不做技术选型、不设计交互、不写代码。

## 执行纪律

- D1：范围排除要写理由，排除是主动决策。
- D5：只定义目标和边界；范围超出当前 goal 时停下记录缺失决策，参考 `${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`。
- D7：验收条件必须可测试；不可测试需求不算完成。

## 方法论：约束→场景→验收

### 第一步：约束定义（Constraint）

明确用户、目标、边界、非目标、资源、风险、合规和已有 project 约束。产出“包含/不包含/假设/依赖”。

### 第二步：场景覆盖（Scenario）

用用户故事覆盖正常、边界、错误和权限路径。每条故事只表达一个可观察行为。

### 第三步：验收确认（Verify）

把场景转成 Given-When-Then 或 EARS。验收必须能被测试、手动验证或明确标注不可自动化。

## 决策点

### R1: 用户故事（场景阶段）

记录角色、目标、触发条件和成功结果。

### R2: 验收条件（验收阶段）

每条 AC 必须有输入、动作、预期输出和失败边界。

### R3: 非功能需求（约束阶段）

性能、安全、可访问性、兼容性、数据保留和可观测性；只写目标指标，不写实现。

### R4: 范围排除（约束阶段）

记录不做什么、为什么不做、未来触发条件。

### R5: 验收测试（验收阶段）

列出用户如何确认完成；给 test-cases 和 codegen 提供 AC 编号。

## 文档约束

产出 `PRD.md`，使用 `${CLAUDE_SKILL_DIR}/references/prd-template.md`。PRD 必须包含：目标、用户、场景、范围、AC、非功能需求、风险、开放问题、被拒范围。引用 project.md 共享约束，不复制技术方案。

## 入口/出口条件

入口：需求边界不清或用户要求 PRD。出口：PRD 可被 detail 读取，且没有阻塞性 `[NEEDS CLARIFICATION]`。若出现实时、搜索、推荐、优化、媒体、加密等技术信号，建议 research。

## 轻量模式

小改只补：目标、边界、3-5 条 AC、非目标、开放问题；不扩写完整 PRD。

## 红旗清单

- 需求不可测试。
- 只有功能列表，没有用户场景。
- 范围排除没有理由。
- 把技术方案写成需求。
- 出现强技术信号却跳过 research。

## 验证清单

- [ ] 用户、目标、边界和非目标是否明确？
- [ ] AC 是否可测试且有编号？
- [ ] 正常、边界、错误、权限路径是否覆盖？
- [ ] 假设和开放问题是否暴露？
- [ ] 技术信号是否路由到 research？

## 历史维护

完成后追加 feature changelog 和必要的 `docs/timeline.md`；超 100 行归档。
