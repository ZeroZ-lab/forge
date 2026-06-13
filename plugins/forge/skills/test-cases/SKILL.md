---
name: test-cases
description: Derives concrete test scenarios from acceptance criteria, business rules, normal paths, boundaries, errors, permissions, and data requirements.
when_to_use: Use when turning goal/PRD acceptance criteria into concrete test cases, creating regression scenarios, mapping ACs to tests, or reviewing test-case coverage.
---

# Test Cases — 测试用例

## 职责

从 PRD/goal/modules 的 AC 推导测试场景。test-cases 定义输入、动作、预期和数据；测试代码由 codegen 实现。

## 执行纪律

- D2：测试范围从验收条件推导，不从代码倒推。
- D5：只定义场景，不写测试策略和实现。
- D7：数据可重复，测试隔离。

## 方法论：场景覆盖

### TC1: 映射（Map）

建立 AC → 场景矩阵；每条 AC 至少正常路径，风险 AC 补边界/错误。

### TC2: 正常（Happy Path）

写输入、前置状态、动作、预期输出和验证点。

### TC3: 边界（Edge Cases）

空值、最大/最小、重复、排序、分页、权限边界和并发边界。

### TC4: 错误（Error Handling）

无效输入、未认证、无权限、资源不存在、冲突、外部服务失败。

### TC5: 数据（Test Data）

固定 fixture、隔离策略、清理方式、种子和不可共享状态。

## 产出结构

产出 `testing/test-cases.md`。每个用例包含：ID、覆盖 AC、前置条件、步骤、输入、预期、验证方式、自动/手动、数据需求。

## 入口/出口条件

入口：有 PRD/goal/modules 或 bugfix 需要回归测试。出口：AC 覆盖矩阵完整，可交 codegen 写测试。

## 红旗清单

- 测试没有 AC 编号。
- 只测 happy path。
- 数据不可重复或测试间共享状态。
- 错误/权限/边界缺失。
- 验收条件不可测试却继续生成。

## 验证清单

- [ ] 每条 AC 是否有测试映射？
- [ ] 正常、边界、错误、权限路径是否覆盖？
- [ ] 测试数据是否隔离且可重复？
- [ ] 手动验收是否明确标注？
- [ ] 与测试策略覆盖矩阵是否一致？

## 历史维护（自动）

完成后追加 feature changelog；作为 test/plan 子阶段时由编排器汇总。
