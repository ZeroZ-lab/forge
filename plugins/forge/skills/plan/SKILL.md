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
3. 每个任务绑定来源 AC/FD、修改范围、完成证据和停止条件。
4. 从 AC 推导测试场景类别，但不创建测试用例文档。
5. 让 codegen 能逐片实现、验证和安全停止。
6. 当用户需要跨会话恢复、多人/多 agent 领取、或明确要求落到 issue tracker 时，把任务序列转换成 tracer-bullet issues，而不是项目内 `plan.md` / `status.md`。

## Issue handoff mode

只有 issue tracker 可用、triage label 词表已知、且用户需要持久交接时启用。否则只返回 issue-ready 草案，不假装发布。

每个 issue 必须是可独立领取的垂直切片：

- 穿过相关集成层形成一条窄而完整的行为路径；
- 完成后可 demo 或可用测试/检查独立验证；
- 先做能降低后续切片风险的 prefactor slice，但它也必须有可验证出口；
- 不按 frontend/backend/database/schema/API 等横向层拆票。

发布前先把拟拆分列表交给用户确认，至少包含：

- Title；
- Blocked by；
- User stories / AC covered（若来源材料存在）；
- 最小验证证据。

确认后按依赖顺序发布 blocker 优先的 issues，以便后续 issue 的 `Blocked by` 使用真实 issue 标识。不要关闭或修改 parent issue。issue body 使用：

```md
## Parent

<parent issue reference, if any>

## What to build

<concise end-to-end behavior for this vertical slice>

## Acceptance criteria

- [ ] ...

## Blocked by

None - can start immediately
```

若有 blocker，把 `None - can start immediately` 替换为真实 blocker issue 引用。

## 产出

默认在当前对话或 issue tracker 中返回：

- 任务序列；
- 依赖与并行关系；
- 风险优先级；
- 每片验证命令/证据；
- 可发布 issue 草案或已发布 issue 链接（仅在 handoff mode）；
- 未解决决策。

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：不创建 `plan.md`。若计划产生新的持久目标或约束，先写回 `goal.md` / module；任务状态由执行系统维护，不进入项目事实文档。

## 验证清单

- [ ] 每个任务是否形成垂直价值和可独立验证结果？
- [ ] 是否引用目标完成标准？
- [ ] 是否明确依赖、并行项、关键路径和风险优先项？
- [ ] 如果需要交接，是否先让用户确认 issue 粒度和依赖，并只在 tracker/label 可用时发布？
- [ ] 是否没有把未决需求伪装成任务？

## 历史维护

纯计划不写 Change Unit。只有计划过程中修改了权威目标文档时，遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。

## 出口

codegen 能从当前执行上下文逐片实现；或后续 agent 能从已确认/已发布的 tracer-bullet issues 独立领取；所有阻塞决策已显式列出。
