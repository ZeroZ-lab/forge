---
name: plan
description: Converts goals and modules into an executable vertical-slice task sequence with dependencies, risks, and verification criteria.
when_to_use: Use when work spans multiple modules, has ordering or parallelization constraints, needs risk-first sequencing, or must be split into independently executable tasks.
---

# Plan — 执行切片

## 职责

把已确认的目标和模块合约转换成可执行的垂直切片。plan 不改需求、不做技术选型、不生成代码。

## 输入

- feature `goal.md`
- 相关 `modules/*.md`
- `docs/project.md` 和 gated optional artifacts（如存在）
- 当前 issue / 对话中的交付约束

缺少可验证完成标准时回到 define/detail，不用计划掩盖目标缺口。

## 方法

1. 按可独立验证的用户价值切片，不按 controller/service/repository 横切。
2. 标出依赖、可并行任务、关键路径和最早风险验证点。
3. 每个任务绑定来源 AC#/FD、修改范围、完成证据和停止条件。
4. 从 AC# 推导 BDD 场景类别（正常、边界、错误、权限等），但不创建测试用例文档。
5. 让 codegen 能逐片实现、验证和安全停止。

## 产出

默认在当前对话或 issue tracker 中返回：

- 任务序列；
- 依赖与并行关系；
- 风险优先级；
- 每片引用的 AC# 与 BDD 场景类别；
- 每片验证命令/证据；
- 未解决决策。

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：不创建 `plan.md`。若计划产生新的持久目标或约束，先写回 `goal.md` / module；任务状态由执行系统维护，不进入项目事实文档。

## 验证清单

- [ ] 每个任务是否形成垂直价值和可独立验证结果？
- [ ] 是否引用目标完成标准？
- [ ] 是否明确依赖、并行项、关键路径和风险优先项？
- [ ] 是否没有把未决需求伪装成任务？

## 历史维护

纯计划不写 Change Unit。只有计划过程中修改了权威目标文档时，遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。

## 出口

codegen 能从当前执行上下文逐片实现；所有阻塞决策已显式列出。
