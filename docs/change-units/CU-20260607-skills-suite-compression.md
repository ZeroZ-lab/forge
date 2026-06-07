# CU-20260607-skills-suite-compression

## Type

- Refactor
- Methodology

## Intent

- Trigger: 用户希望压缩当前项目的 skills suite，保证链路完整并删除冗余。
- Goal: 将相邻且重复的 benchmark case 合并为完整链路，同时保持全部 Forge skill 覆盖、Change Unit 追踪和 goal verification 合约。
- Out of scope: 不改变 evaluator 评分逻辑、report schema、runner 行为、skill 文案或 registry。

## Behavior Change

- User-visible behavior:
  - `node scripts/evaluate-skills.mjs` 现在校验 10 个非冗余链路 case，而不是 12 个较分散 case。
- Internal behavior:
  - 前端链路合并：design / interaction-design / fe-system / fe-artifact / fe-accept。
  - 实现链路合并：plan / test-cases / codegen。
  - 删除被合并后的冗余 fixture。
- Contract change:
  - `manifest.json` 仍为 v2。
  - `minimum_cases` 仍为 10。
- Data change:
  - 无持久业务数据变化。

## Affected Surface

- Features:
  - Skills suite evaluation.
- Modules:
  - `evals/skills-suite/manifest.json`
  - `evals/skills-suite/fixtures/interaction-design-system.md`
  - `evals/skills-suite/fixtures/codegen-goal.md`
- Contracts:
  - `evals/skills-suite/README.md`
  - `docs/skill-suite-evaluation.md`
- Tests:
  - `tests/skills-suite-evaluation.test.mjs`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 合并 case 后失败归因粒度降低 | 单个链路失败时需要看 oracle 细项定位 | 保留 per-skill oracle checks 和 per-axis scoring |
| 链路任务变长 | 真实 benchmark 单 case 成本上升 | 仅合并自然 handoff 的相邻阶段，保持 case 总数下降 |
| 删除 fixture 破坏引用 | runner 或测试找不到 case | 运行 evaluator、validate 和 node test |

## Verification

- Commands:
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/validate.mjs`
  - `node --test tests/skills-suite-evaluation.test.mjs`
- Manual checks:
  - 确认 manifest 从 12 个 case 压缩到 10 个 case。
  - 确认 registry 全部 24 个 skill 仍被 expected_skills 覆盖。
- Not verified:
  - Full real Codex benchmark run with actual `.eval-runs/skills-suite/<run-id>/report.json`.

## Rollback

- Revert path:
  - 恢复被删除的两个 fixture，并将 `frontend-artifact-acceptance` 与 `plan-test-cases` case 加回 manifest。
- Data rollback:
  - None required.

## Docs To Sync

- [x] docs/skill-suite-evaluation.md
- [x] evals/skills-suite/README.md
- [x] changelog / timeline summary

## Completion Evidence

- Code diff:
  - `evals/skills-suite/manifest.json` now has 10 chain cases and still covers all 24 registered skills.
  - Redundant fixtures `frontend-artifact-acceptance.md` and `plan-test-cases.md` were removed after their checks were merged into adjacent chains.
- Test evidence:
  - `node scripts/evaluate-skills.mjs` passed: 10 cases, 24 skills covered.
  - `node scripts/validate.mjs` passed: 24 skills, version 0.28.4.
  - `node --test tests/skills-suite-evaluation.test.mjs` passed: 14/14.
- Residual risk:
  - Real behavioral effectiveness still requires a report from an actual agent benchmark run.
