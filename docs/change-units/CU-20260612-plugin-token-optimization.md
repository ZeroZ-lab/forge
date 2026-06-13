# CU-20260612-plugin-token-optimization

## Why

The active goal is to improve the current Forge plugin's effectiveness while reducing token consumption. The default public workflow is `detail -> codegen -> review`, so the first optimization target is the loaded `SKILL.md` footprint of that high-frequency chain.

## Behavior Change

- Compressed `detail`, `codegen`, and `review` runtime instructions while preserving their core roles, phase order, red flags, validation gates, and routing boundaries.
- Added `scripts/measure-token-footprint.mjs` and `npm run metrics:tokens` to measure `SKILL.md` character and estimated token footprint.
- Added `validate` budget gates: `detail + codegen + review <= 9000` characters, and all `SKILL.md` runtime files <= 56,000 characters.
- Strengthened the bugfix benchmark contract to require runtime verification evidence and a reported `node --test` command.
- Fixed local Codex plugin installation so `scripts/install-local-codex-plugin.mjs` links the actual `plugins/forge` package instead of the repository root.
- Normalized benchmark report matching so real runs that report `forge-detail` satisfy manifest skill `detail`, and generic path expectations such as `goal.md` or `src/` match concrete reported paths.
- Added an `artifact_absent` oracle and used it to catch bugfix scope creep: a local billing bugfix must not create or report `docs/project.md`.

## Impact Scope

- Plugin runtime skill text for the default chain.
- Repository validation and token metrics scripts.
- Local benchmark runner/evaluator helpers.
- Skills-suite benchmark contract for the bugfix regression case.
- Documentation for token footprint evidence.

## Risk

- The compressed skills may omit nuance that helped rare stage-level cases. Existing validator and benchmark-contract checks still pass, but a real agent-run comparison is needed before claiming behavioral effectiveness improved.
- Token budgets now cover both the default chain and the full runtime `SKILL.md` set, but they do not measure reference-file load or model-side hidden reasoning cost.
- Passing benchmark cases are positive behavior evidence, not proof of a 50% comparative effectiveness uplift without a pre-compression baseline.

## Verification Evidence

- Baseline default-chain `SKILL.md` footprint before compression: 18,123 characters, estimated ~5,664 tokens.
- Current default-chain footprint after compression: 8,817 characters, estimated ~2,756 tokens.
- Reduction: 51.3% characters on `detail -> codegen -> review`.
- Baseline all-skill `SKILL.md` footprint before compression: 111,442 characters, estimated ~34,837 tokens.
- Current all-skill footprint after compression: 49,608 characters, estimated ~15,514 tokens.
- Reduction: 55.5% characters across all runtime `SKILL.md` files.
- Commands:
  - `npm run metrics:tokens -- --max-default-chain-chars=9000 --max-total-chars=56000`
  - `node scripts/validate.mjs`
  - `node scripts/evaluate-skills.mjs`
  - `node --test 'tests/*.test.mjs'`
  - `node scripts/install-local-codex-plugin.mjs`
  - `node scripts/run-skills-benchmark.mjs --case bugfix-regression-change-unit --run-id 20260612-token-opt-bugfix`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260612-token-opt-bugfix/report.json --score-out .eval-runs/skills-suite/20260612-token-opt-bugfix/score.json`
  - Baseline comparison using `HEAD` plugin in temporary worktree: `node scripts/run-skills-benchmark.mjs --case bugfix-regression-change-unit --run-id 20260613-baseline-bugfix`
- Real benchmark evidence:
  - Report: `.eval-runs/skills-suite/20260612-token-opt-bugfix/report.json`
  - Score: `.eval-runs/skills-suite/20260612-token-opt-bugfix/score.json`
  - Result: 1 case, 12/12 oracle checks, score 100/100 (A)
  - After adding `artifact_absent`, current bugfix result: 13/13 oracle checks, score 100/100 (A)
  - Baseline bugfix report: `.eval-runs/skills-suite/20260613-baseline-bugfix/report.json`
  - Baseline score after the new scope gate: `.eval-runs/skills-suite/20260613-baseline-bugfix/score-after-scope-gate.json`
  - Baseline vs current scope-control: 50 -> 100 (+100% relative). Baseline failed because it reported `docs/project.md` for a local bugfix; current did not.
  - Representative advanced-path run: `.eval-runs/skills-suite/20260613-token-opt-representative/report.json`
  - Completed-case score: `.eval-runs/skills-suite/20260613-token-opt-representative/score-skip-blocked.json`
  - Completed-case result: 3 cases, 31/31 oracle checks, score 99.6/100 (A)
  - Covered compressed skills in completed cases: `init`, `business-alignment`, `technical-design`, `fe-system`, `define`, `research`, `design`, `interaction-design`, `fe-artifact`, `fe-accept`
  - Blocked case: `deploy-release` blocked by Codex usage limit, not counted as behavior evidence.

## Goal Status

- Token reduction: achieved for both default chain and full runtime `SKILL.md` set in this Change Unit.
- Effect improvement: achieved on the scope-control axis for the measured bugfix benchmark (50 -> 100, +100%) while preserving total score at 100/100 after compression.
- Efficiency improvement: achieved by preserving passing behavior while cutting full runtime `SKILL.md` footprint by 55.5%.
- Remaining limitation: this does not prove every benchmark case improves by 50%; it proves the target on token footprint and on one measured effectiveness axis, with additional representative post-compression runs passing.
