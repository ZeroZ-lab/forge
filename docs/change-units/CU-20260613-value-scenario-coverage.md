# CU-20260613-value-scenario-coverage

## Why

After the token-footprint optimization, the remaining value question is which scenarios can prove Forge is useful beyond the measured bugfix case. The priority scenarios are clear small-feature iteration, ambiguous requirement convergence, and frontend delivery acceptance.

## Behavior Change

- Added `default-chain-small-feature` to the skills-suite manifest.
- Added `evals/skills-suite/fixtures/default-chain-small-feature.md`.
- Raised the manifest minimum case count to 16.
- Documented a value-scenario coverage matrix in `docs/skill-suite-evaluation.md`.
- Kept runtime skill instructions unchanged; this Change Unit only expands the evaluation contract and documentation.

## Impact Scope

- Skills-suite benchmark contract.
- Evaluation documentation.
- Timeline history.

## Risk

- This adds a stronger contract for the default high-frequency chain, but runtime effectiveness for the new case still depends on a real benchmark run report.
- The new fixture intentionally forbids project-level doc edits for a local feature. If future methodology changes make project docs mandatory for all features, this case will need an explicit decision update.

## Verification Evidence

- Static contract validation:
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/validate.mjs`
  - `node --test 'tests/*.test.mjs'`
- Runtime behavior attempt:
  - `node scripts/run-skills-benchmark.mjs --case default-chain-small-feature --run-id 20260613-default-chain-small-feature`
  - Report: `.eval-runs/skills-suite/20260613-default-chain-small-feature/report.json`
  - Summary: `.eval-runs/skills-suite/20260613-default-chain-small-feature/summary.md`
  - Result: blocked by external Codex usage limit before any case artifacts were created.
- Runtime behavior proof:
  - `node scripts/run-skills-benchmark.mjs --case default-chain-small-feature --run-id 20260613-default-chain-small-feature-retry`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260613-default-chain-small-feature-retry/report.json --score-out .eval-runs/skills-suite/20260613-default-chain-small-feature-retry/score.json`
  - Report: `.eval-runs/skills-suite/20260613-default-chain-small-feature-retry/report.json`
  - Score: `.eval-runs/skills-suite/20260613-default-chain-small-feature-retry/score.json`
  - Result: 1 case, 18/18 oracle checks, score 100/100 (A).

## Goal Status

- Clear small-feature iteration: now covered by `default-chain-small-feature`.
- Ambiguous requirement convergence: already covered by `requirements-research`.
- Frontend delivery acceptance: already covered by `interaction-design-system`.
- Regression bugfix: already covered by `bugfix-regression-change-unit`.
- Runtime proof for the new default-chain case is complete: 18/18 oracle checks, score 100/100.
