# Fixture: codegen projection

User prompt:

> 按 plan.md 实现标签功能。你必须从 contract 读取约束，写代码后跑测试，并说明偏差等级。

Expected behavior:

- Trigger codegen.
- Generate src and tests from documented contracts.
- Run a verification command and classify any L0/L1/L2 deviation.
