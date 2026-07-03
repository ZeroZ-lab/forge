# CU-20260703-plan-issue-handoff

## Type

- Methodology / Release

## Intent

- Trigger: 用户希望把外部 `to-issues` 技巧内化到 Forge 的 `plan` skill，让计划拆解能支持重启后恢复和多 agent 领取。
- Goal: 在不创建 `plan.md` / `status.md` 的前提下，把 `plan` 的可选出口扩展为 issue tracker 中的 tracer-bullet vertical slices，并发布为 v0.52.1。
- Out of scope: 不新增 issue tracker 集成工具；不修改 eval fixture 或其他 skill；不改变默认小任务链路。

## Behavior Change

- User-visible behavior: `plan` 在需要持久交接时会先产出 issue-ready 垂直切片列表，要求用户确认粒度和依赖；tracker 与 label 可用后才发布 issues。
- Internal behavior: `plan` 新增 issue handoff mode，强调 issue 是执行系统中的可领取任务，不是项目事实文档。
- Contract change: 无默认产物变更；仍不创建 `plan.md`；发布版本元数据同步为 `0.52.1`。
- Data change: 无。

## Affected Surface

- Features: 无。
- Modules: `plugins/forge/skills/plan/SKILL.md`。
- Contracts: `package.json`、2 个 plugin manifest、4 个 marketplace forge entry 版本同步为 `0.52.1`；无 eval case 变更。
- Code implementation: 无。
- Tests: 无新增测试。
- Operations: 无。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| issue 被误当权威需求源 | goal/module 与 issue 内容分叉 | SKILL 要求新持久目标或约束先写回 goal/module；issue 只承载任务状态和执行切片 |
| 无 tracker/label 时假发布 | 后续 agent 找不到任务 | SKILL 明确 tracker 与 triage label 不可用时只返回 issue-ready 草案 |
| 切片退化为横向分层任务 | agent 领取后无法独立验证 | handoff mode 明确每票必须是窄而完整的 vertical slice，验证清单增加交接检查 |

## Verification

- Commands (with exit codes):
  - `node scripts/bump-version.mjs 0.52.1` → exit 0 / 3 个 manifest + 4 个 marketplace 从 `0.52.0` 同步到 `0.52.1`。
  - `npm run validate` → exit 0 / `Forge validation passed (27 skills, version 0.52.1).`
  - `npm test` → exit 0 / `tests 96`, `pass 96`, `fail 0`.
  - `npm run metrics:chars` → exit 0 / Default chain `4433` chars; All SKILL.md `55233` chars.
- Red-capable evidence (bugfix only): N/A
- Not verified (with blocking reason): 未跑真实 skills-suite benchmark（需 Codex CLI 运行实际 cases；本次未改 eval fixture）。

## Rollback

- Revert path: 还原 `plugins/forge/skills/plan/SKILL.md` 中 issue handoff mode 相关段落，运行 `node scripts/bump-version.mjs 0.52.0` 回退版本元数据，并删除本 CU。
- Data rollback: 无。
- Safe stop condition: Stop if `plan` 开始要求默认创建项目内计划/状态文档，或绕过用户确认直接发布任务 issues。

## Docs To Sync

- [x] feature goal.md — N/A，无 feature 事实源变更
- [x] project.md / ADR — N/A，既有 project 规则已声明计划/状态留在对话或 issue tracker
- [x] modules — N/A
- [x] testing docs — N/A
- [x] deploy docs — N/A

## Completion Evidence

- Code diff: `plan` skill 增加 issue handoff mode、issue body 模板、发布前确认门和出口表述；版本元数据同步到 `0.52.1`。
- Test evidence (command + output, not conclusion): 见 Verification 段。
- Goal coverage: 覆盖用户要求的“把 plan 拆解内化为可重启/可领取的 issue 队列”，同时保持 Forge 非平行文档原则。
- Doc sync result: 无权威目标文档需同步；本 CU 记录方法论和 release metadata 变更。
- Residual risk: 尚未通过真实 issue tracker 发布流程验证。
