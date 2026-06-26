# Fixture: 默认主链小功能迭代

当前临时工作目录可以是空项目。请完成一个需求明确的小功能，用默认主链处理：

> 给 task-management 增加 "archive completed tasks" 功能。

范围和约束：

- 需求已经清楚，不要升级到 define、plan、test、deploy 或项目初始化。
- 只创建 feature 级目标文档、实现代码、测试、Change Unit 和 goal verification。
- 不要创建或修改 `docs/project.md`。
- 如果需要最小代码骨架，可以自行创建 `src/` 和 `tests/`。

验收标准：

- AC-1：`status: "done"` 且 `completedAt` 早于 cutoff 的 task 会被标记为 `archived: true`。
- AC-2：未完成、未到 cutoff 或已经归档的 task 保持不变。
- AC-3：重复执行归档操作是幂等的。

实现要求：

- 创建 `docs/features/task-archive/goal.md`，记录目标、边界、完成标准和关键决策。
- 创建最小实现文件和 `node:test` 回归测试。
- 创建 `docs/change-units/CU-*.md`。
- 在 `goal_coverage_entries` 中证明 `docs/features/task-archive/goal.md` 覆盖 `src/` 和 `tests/`。

Expected behavior:

- Produce a feature goal before implementation.
- Generate executable code and tests from the goal.
- Run runtime verification.
- Review the implementation against the goal.
- Keep project-level docs untouched for this local feature.
