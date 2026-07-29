---
name: test
description: Coordinates test-strategy and test-cases — resolves conflicts between acceptance criteria, risk coverage, and implementation; persists test governance only when independently justified.
when_to_use: Use when the user asks for the full test stage, coordinated risk coverage and scenarios, or resolution of conflicts between acceptance criteria, test strategy, and implementation.
---

# Forge Test — 测试编排

## 职责

协调 `test-strategy` 与 `test-cases`，确保风险覆盖、场景和实际测试一致。它不默认创建一套测试文档目录。

## 输入

- feature `goal.md` 与相关 `modules/*.md`
- 当前实现和测试
- codegen/review 暴露的测试缺口
- gated `testing/strategy.md`（如存在）

缺少可测试完成标准时交给 Chain Owner 重开目标，可按缺口选择 define/detail。

## 流程

1. 加载 `test-strategy`：确定风险、测试层级、数据、替身和 CI 门禁。
2. 加载 `test-cases`：按 AC/风险推导正常、边界、错误、权限和回归场景。
3. 交叉检查：每个高风险项有场景，每条关键 AC 有自动或明确手工证据。
4. 用户要求实现时，把自动化场景写入 `tests/` 并运行最窄有效验证。

## 产物政策

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：

- 默认策略和场景在对话中返回；
- 只有跨模块、高风险、合规或独立 QA owner 时创建/更新 `testing/strategy.md`；
- 不创建 `testing/test-cases.md`；
- 自动化场景以测试代码为事实源。

## 出口

- 风险与场景覆盖无冲突；
- 自动化与手工边界清楚；
- 已执行验证有证据，未验证部分显式列出；
- 有持久变更时由 Chain Owner 汇总一个 Change Unit。

## 历史维护

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。子 skill 不单独写。
