# CU-20260607-skills-suite-scoring

## Type

- Feature
- Methodology

## Intent

- Trigger: 用户希望 Forge 有完整的 skills suite 评价系统和打分系统。
- Goal: 在现有 skills-suite evaluator 上增加可审查的评分模型、等级、分轴得分和机器可读 score report。
- Out of scope: 不新增 benchmark case；不改变真实 agent runner；不引入外部依赖；不把 no-report 模式当作行为有效性证据。

## Behavior Change

- User-visible behavior:
  - `node scripts/evaluate-skills.mjs --report <report.json>` 现在输出 `Score: <n>/100 (<grade>)` 和分轴得分。
  - 新增 `--score-out <path>`，可写出机器可读评分报告。
- Internal behavior:
  - `evals/skills-suite/manifest.json` 新增 `scoring_model`，声明评分轴、权重和等级阈值。
  - evaluator 在硬性 oracle 之外计算 per-case、per-axis、overall score。
  - `report.schema.json` 新增可选 `metrics`，用于 `cost_control` 评分。
- Contract change:
  - report schema 保持 v2，新增向后兼容的可选字段。
  - scoring report 使用独立 `version: 1` 输出格式。
- Data change:
  - 无持久业务数据变化。

## Affected Surface

- Features:
  - Skills suite evaluation.
- Modules:
  - `scripts/evaluate-skills.mjs`
  - `evals/skills-suite/manifest.json`
  - `evals/skills-suite/report.schema.json`
- Contracts:
  - `docs/skill-suite-evaluation.md`
  - `docs/thinking/skill-suite-effect-evaluation.md`
- Code projection:
  - Score computation and score report export are projected from the evaluation contract.
- Tests:
  - `tests/skills-suite-evaluation.test.mjs`
- Operations:
  - Existing `npm run eval:skills` still works.
  - Score export can be added to benchmark run workflows later.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Score is mistaken for release approval | Failed hard oracle might be ignored | Docs state pass/fail remains the hard gate |
| Fixture overfitting | Suite improves benchmark score without improving real work | Thinking doc records fixture representativeness as the weakest assumption |
| Optional metrics absent | Cost/control axis may be unscored | Missing optional metrics are omitted from weighted average instead of penalized |
| Weight disagreement | Score may not match stakeholder priorities | Weights live in `manifest.json` for review and versioning |

## Verification

- Commands:
  - `node --test tests/skills-suite-evaluation.test.mjs`
  - `node scripts/evaluate-skills.mjs`
- Manual checks:
  - Confirmed scoring output remains additive and no-report mode still refuses behavioral-effectiveness claims.
- Evidence:
  - Skills-suite tests passed: 13/13.
  - Benchmark contract passed: 12 cases, 24 skills covered.
- Not verified:
  - Full real Codex benchmark run with actual `.eval-runs/skills-suite/<run-id>/report.json`.

## Rollback

- Revert path:
  - Revert this CU and changes to evaluator, manifest, schema, docs, tests, and Rebuild Control files.
- Data rollback:
  - None required.
- Safe stop condition:
  - If score output causes downstream automation confusion, keep oracle pass/fail and remove `--score-out` until workflow expectations are clarified.

## Docs To Sync

- [x] docs/goal-verification.md
- [x] feature contract / modules
- [x] testing docs
- [ ] deploy docs
- [x] changelog / timeline summary

## Completion Evidence

- Code diff:
  - `scripts/evaluate-skills.mjs` computes score axes, grades, and score report export.
  - `tests/skills-suite-evaluation.test.mjs` covers scoring output and machine-readable score report.
- Test evidence:
  - `node --test tests/skills-suite-evaluation.test.mjs` passed.
  - `node scripts/evaluate-skills.mjs` passed.
- Doc sync result:
  - Goal verification, timeline, and evaluation docs synchronized.
- Residual risk:
  - Real behavioral effectiveness still requires a report from an actual agent benchmark run.
