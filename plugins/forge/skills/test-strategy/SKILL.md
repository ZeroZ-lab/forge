---
name: test-strategy
description: Designs how to test a feature through test types, risk coverage, data strategy, mocking, isolation, CI gates, and release confidence.
when_to_use: Use when deciding test strategy, coverage expectations, risk-based testing, CI gates, mock boundaries, test data design, or release confidence before deriving concrete test cases.
---

# Test Strategy — 测试策略

## 职责

定义怎么测、测到什么程度、哪些风险必须阻断发布。test-strategy 不写具体用例，不写测试代码。

## 执行纪律

- D1：T1-T5 每个决策记录选择、理由、被拒方案。
- D5：只定义策略，不写 test cases 和 deploy。
- D7：关键测试必须在 CI 跑，失败阻断发布。

## 方法论：风险驱动测试金字塔

先读 goal/modules/风险/发布要求，再按业务风险选择单元、集成、E2E、契约、性能、安全和手动验收组合。拒绝虚荣覆盖率。

## 决策点

### T1: 测试类型

按风险选择测试层级；说明每层覆盖什么、不覆盖什么。

### T2: 覆盖策略

给关键路径、边界、权限、错误、回归的覆盖要求和最低门槛。

### T3: 测试数据

fixture、factory、seed、隔离、清理和敏感数据策略。

### T4: Mock 策略

外部服务、时间、随机、网络、支付等 mock 边界；避免 mock 掉被测逻辑。

### T5: CI 集成

哪些命令阻断 PR/release，哪些只做观察；记录失败处理。

## 产出格式（T1-T5 通用）

每个决策写：选择、理由、拒绝方案、适用范围、验证命令。

## 文档约束

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。默认在对话中给出覆盖矩阵、风险矩阵、CI gate、数据策略、mock 策略和手动验收边界。只有跨模块、高风险、合规或独立 QA owner 时创建 `testing/strategy.md`；否则把关键验证约束压缩写入 goal。

## 入口/出口条件

入口：功能风险较高、测试要求不清、准备发布或用户要求测试策略。出口：test-cases 可据此推导具体场景，持久化门已明确。

## 红旗清单

- 只追求覆盖率数字。
- 关键路径不进 CI。
- Mock 过度导致测试失真。
- 测试数据不可重复。
- 发布风险没有阻断门。

## 验证清单

- [ ] T1-T5 是否完整？
- [ ] 覆盖矩阵是否对应 goal 风险？
- [ ] CI gate 是否有具体命令？
- [ ] 数据和 mock 边界是否清楚？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。作为 `test` 子阶段时不单独写；standalone 且产生变更时持久化。
