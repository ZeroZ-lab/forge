# Goal Verification

Forge uses a simple goal verification model instead of traditional drift detection. skills 是协议节点，不是控制系统本体。

## Runtime goal verification 映射

每个 skill 在目标验证闭环中承担一个角色：

| 角色 | 含义 | 示例 skill |
|------|------|-----------|
| goal-refiner | 细化目标、生成可操作约束 | detail, define, business-alignment |
| executor | 实现目标 | codegen, fe-artifact, deploy |
| verifier | 验证目标是否达成 | review, fe-accept, test-strategy |
| governance | 独立审查和升级 | review |
| knowledge | 方法论沉淀 | shared/ |
| orchestrator | 按需加载子 skill | init, design, detail, test |
| decision-protocol | 领域决策 | api-design, db-design, frontend-design |

## 信号传递

信号在三个层级传递：

- 快回路（单任务）：codegen 生成 → 目标对照 → 修正 → 收敛
- 中回路（单次迭代）：detail 改目标 → 读下游依赖 → 级联更新
- 慢回路（跨项目）：review 差距分析 → 聚合重复模式 → 人工判断是否修改方法论

## How it works

1. **Define** — Documents state: what's the goal, where are the boundaries, what counts as done.
2. **Implement** — AI self-drives the implementation path toward the goal.
3. **Verify** — Check: does the result meet the stated goal?
4. **Fix** — If not, analyze the gap. Fix the implementation or refine the goal.

## Signals

| Signal | Meaning | Action |
|--------|---------|--------|
| Goal met | All completion criteria satisfied | Proceed |
| Goal not met | Some criteria unmet | Fix implementation |
| Goal unclear | Ambiguous or contradictory goal | Stop for human clarification |
| Repeated failure | Same class of issue ≥ 2 times | Re-examine goal definition |
| Goal conflict | Goals contradict each other | Stop for human decision |

## Escalation

- Repeated same-class failure → suggest re-examining the goal
- Goal conflict → human decision required
- 3 fixes without convergence → human decision required

## From skills

- **codegen**: Verifies each task against the stated goal after implementation. consumes: goal.md, produces: src/ + tests/ + verification summary. signals_in: contract goal, signals_out: goal not met / goal conflict, escalates_when: 3 corrections without convergence
- **review**: Checks whether implementation meets stated goals across documents, code, and tests. produces: review report. escalates_when: P0/P1 blocking issue

## Anti-patterns

- Verifying implementation details instead of goal achievement
- Treating AI's implementation choices as errors when the goal is met
- Skipping verification because "it looks right"
- Adding unrevealed goals during verification