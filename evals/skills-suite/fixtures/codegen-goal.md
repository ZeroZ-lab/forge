# Fixture: plan to codegen goal

User prompt:

> 标签功能详设已经确认。请先拆成可以实现的垂直切片，把验收条件转成测试用例，然后按 plan.md 实现标签功能。你必须从 goal.md 读取约束，写代码后跑测试，并说明偏差等级。

Expected behavior:

- Trigger plan, test-cases, and codegen as one implementation chain.
- Produce vertical slices and test cases linked to acceptance criteria.
- Generate src and tests from documented goals.
- Run a verification command and classify any L0/L1/L2 deviation.
