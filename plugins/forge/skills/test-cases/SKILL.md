---
name: test-cases
description: Optional scenario derivation for explicit coverage matrices or unresolved acceptance, boundary, error, and permission cases.
when_to_use: Use when the user asks for test cases/coverage analysis or material scenario gaps cannot be closed safely by direct test implementation.
---

# Test Cases — 场景推导

## 职责

把 goal/module 中的完成标准转成可执行测试场景。test-cases 不发明需求，不维护第二份验收事实。

## 输入

- feature `goal.md`
- 相关 `modules/*.md`
- 已有测试和缺口证据
- gated `testing/strategy.md`（如存在）

## 方法

1. 为每条 AC 推导正常、边界、错误、权限、并发/恢复场景。
2. 每个场景注明来源 AC、前置数据、动作、可观察预期和建议测试层级。
3. 识别最小回归用例与高风险数据组合。
4. 已自动化的场景直接落到测试代码；未自动化场景留在当前执行上下文。

## 产出

默认在对话中返回场景矩阵，并在用户要求实现时写入 `tests/`。遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：不创建 `testing/test-cases.md`。

手工、合规或外部系统场景只有在存在独立 QA 治理时，才作为 `testing/strategy.md` 的一部分维护；不得复制 goal 的完成标准。

## 验证清单

- [ ] 每条场景是否追溯到 AC/风险？
- [ ] 是否覆盖正常、边界、错误和权限路径？
- [ ] 自动化场景是否落到正确测试层级？
- [ ] 是否没有创建第二份验收事实？

## 历史维护

纯场景分析不写 Change Unit；新增或修改测试代码时由上层 codegen/test run 按 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md` 汇总 Change Unit。
