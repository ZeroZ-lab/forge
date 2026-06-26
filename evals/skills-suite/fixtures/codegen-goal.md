# Fixture: plan to codegen goal

User prompt:

> 标签功能详设已经确认。请先在当前执行上下文拆成可以实现的垂直切片，把验收条件转成场景矩阵，然后实现标签功能。你必须从 goal.md 读取约束，把自动化场景写入测试代码，跑测试，并说明偏差等级。

Expected behavior:

- Produce vertical slices and a scenario matrix linked to acceptance criteria without creating plan.md or test-cases.md.
- Generate src and tests from documented goals.
- Run a verification command and report any deviation with attribution (skill 方法论 / 文档未同步 / 代码实现).
