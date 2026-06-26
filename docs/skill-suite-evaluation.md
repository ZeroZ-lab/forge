# Skill Suite Evaluation

Forge skills must be evaluated by runtime behavior, not by prose quality alone.

## What Is Verifiable

The repository now separates two claims:

1. **Benchmark contract is valid**: cases exist, cover every skill, fixtures exist, and oracle checks are machine-readable.
2. **A run proves skill effectiveness**: an actual agent run produced a report that passes the benchmark oracle.
3. **Runtime token footprint is bounded**: high-frequency skill chains stay under an explicit `SKILL.md` loading budget.

The first claim is checked locally by `node scripts/evaluate-skills.mjs`. The second claim requires a report from a real run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

No-report mode must not be used as evidence that the skills are effective. It only proves the evaluation harness is intact.

## Token Footprint Gate

Runtime token cost is measured on loaded `SKILL.md` files, not on every packaged reference file. The default high-frequency chain is:

```text
detail -> codegen -> review
```

Run:

```bash
npm run metrics:chars
npm run metrics:chars -- --max-default-chain-chars=4500 --max-total-chars=56000
```

`node scripts/validate.mjs` enforces two budgets:

- default chain `detail -> codegen -> review` <= 4,500 characters
- all `SKILL.md` runtime files <= 56,000 characters

This gate proves token footprint control, not behavior effectiveness. Behavior still requires a real run report.

## V2 Traceability Contract

The benchmark contract is now version 2. Every mutating scored case must prove that the run is traceable through a Change Unit. Non-mutating advisory or blocked-diagnosis cases must instead prove that no current artifact was changed.

Each case report includes:

- `change_units`: `docs/change-units/CU-*.md` records for the feature, bugfix, release, or methodology update.
- `goal_verification`: evidence that the implementation met the stated goal criteria.

The evaluator rejects a report when artifacts change without a valid Change Unit path.

Every `expected_artifacts` entry must be reported by the run. Non-CU artifacts must appear in `artifacts`; CU artifacts must appear in `change_units` and match `docs/change-units/CU-*.md`.

For Codex-based smoke runs:

```bash
node scripts/install-local-codex-plugin.mjs
node scripts/run-skills-benchmark.mjs --case thinking-red-team
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/<run-id>/report.json
```

The runner stores transcripts and temporary workspaces under `.eval-runs/skills-suite/`.
Each run writes both `report.json` for machine scoring and `summary.md` for human review in the run directory.

If Codex usage limits or other external conditions block a full run, score only completed cases with:

```bash
node scripts/evaluate-skills.mjs --skip-blocked --report .eval-runs/skills-suite/<run-id>/report.json
```

Skipped blocked cases are not evidence of skill effectiveness.

## Benchmark Contract

The source of truth is `evals/skills-suite/manifest.json`.

`scripts/lib/benchmark-contract.mjs` is the single in-process interface that loads and validates that source. The repository validator, evaluator, benchmark runner, and contract tests consume it instead of reinterpreting manifest rules independently.

Each case defines:

- fixture prompt
- expected skills
- expected artifacts
- required evidence
- forbidden behaviors
- oracle checks

V2 oracle checks include:

- `change_unit_reported`
- `goal_verified`

The suite keeps a minimum representative case count in the manifest and covers all registered Forge skills.

Cases should prefer complete adjacent chains over isolated single-stage prompts when the chain has a natural runtime handoff. For example, frontend design should continue through implementation acceptance, and implementation planning should continue through test cases and codegen. Keep standalone cases only when the skill is intentionally a sidecar, such as red-team thinking.

## Value Scenario Coverage

The suite now makes the main product-value claims measurable instead of relying on prose:

| Value Scenario | Benchmark Case | What It Proves |
|----------------|----------------|----------------|
| Clear small feature iteration | `default-chain-small-feature` | The high-frequency `detail -> codegen -> review` path can create a feature goal, implement code, run `node --test`, review the result, and avoid project-doc scope creep. |
| Ambiguous requirement convergence | `requirements-research` | A vague feature with technical signal words is narrowed into PRD plus research options before implementation. |
| Frontend experience delivery | `interaction-design-system` | Design, visual system, frontend artifact, and acceptance evidence stay connected through one chain. |
| Deterministic regression bugfix | `bugfix-regression-change-unit` | The exact symptom goes red before the fix, is minimized, becomes a regression test, and is rechecked through the original scenario. |
| Intermittent bugfix | `bugfix-flaky-reproduction-rate` | A low-rate failure is amplified into a measurable harness before root-cause work starts. |
| Unreproducible production bug | `bugfix-unreproducible-blocked` | The agent stops instead of guessing when no red-capable signal can be built and requests the minimum missing evidence. |
| Correct regression seam | `bugfix-correct-test-seam` | A shallow test that cannot reproduce the real multi-caller failure is rejected. |
| Minimal routing advice | `guide-shortest-chain` | The explicit Router recommends L0 `codegen(patch)` and does not execute stages or create artifacts. |
| Routing matrix | `guide-routing-matrix` | The Router distinguishes L3 project initialization, L1 production bug diagnosis, and L2 cross-module delivery without copying child methods. |

## Report Contract

A run report follows `evals/skills-suite/report.schema.json`.

`scripts/lib/run-report.mjs` owns report construction, schema-aligned runtime validation, field-shape normalization, and oracle evaluation. Callers consume its interface; they do not parse string/object variants or rebuild blocked/fail result shapes themselves.

Each case report records:

- `triggered_skills`
- `artifacts`
- `change_units`
- `goal_verification`
- `commands_run`
- `decisions`
- `forbidden_behaviors`
- `evidence`
- `status`

The evaluator treats missing or indirect evidence as failure. A passing report must prove every oracle check for every benchmark case.

## Scoring System

The evaluator now produces a 0-100 score for real run reports. Pass/fail remains the hard gate: a report with failed oracle checks is still rejected even when a partial score can be computed.

The scoring model is declared in `evals/skills-suite/manifest.json` under `scoring_model` so suite comparisons use an auditable contract instead of hidden weights.

Current scoring axes:

| Axis | What It Measures |
|------|------------------|
| `routing` | Expected skills triggered and unexpected skills avoided |
| `artifacts` | Expected artifacts, including Change Units, were reported |
| `decisions` | Required decision gates were recorded |
| `verification` | Required commands and evidence text were present |
| `scope_control` | Forbidden behaviors were absent |
| `traceability` | Change Unit and goal verification evidence closed the trail |
| `goal_verification` | Goal verification oracle checks confirmed coverage |

Grades use the manifest thresholds: A >= 90, B >= 80, C >= 70, D >= 60, F < 60.

To write a machine-readable score report:

```bash
node scripts/evaluate-skills.mjs \
  --report .eval-runs/skills-suite/<run-id>/report.json \
  --score-out .eval-runs/skills-suite/<run-id>/score.json
```

`goal_verification` is scored from `goal_verified` and `goal_covers` oracle checks. Each check verifies that a goal document covers its stated targets. Missing checks lower the score proportionally.

## Forge vs No-Forge Comparison

Forge effectiveness must be compared against a no-Forge baseline, not only against its own oracle. The runner supports two prompt modes:

```bash
node scripts/run-skills-benchmark.mjs \
  --mode forge \
  --case default-chain-small-feature \
  --run-id forge-default-chain

node scripts/run-skills-benchmark.mjs \
  --mode no-forge \
  --case default-chain-small-feature \
  --run-id no-forge-default-chain
```

`forge` mode gives the agent the full benchmark case contract and requires real Forge skill use. `no-forge` mode strips Forge-specific scoring instructions from the fixture, gives only the product task plus a minimal JSON report shape, explicitly forbids Forge skills, and requires `triggered_skills: []`. This keeps the baseline close to "no large prompt" behavior.

Compare the two reports with the default 100% uplift gate:

```bash
node scripts/evaluate-skills.mjs \
  --allow-partial \
  --report .eval-runs/skills-suite/forge-default-chain/report.json \
  --baseline-report .eval-runs/skills-suite/no-forge-default-chain/report.json \
  --compare-out .eval-runs/skills-suite/default-chain-comparison.json
```

The comparison passes only when:

- the Forge report itself passes the normal hard oracle gate;
- Forge score is at least `2.0x` the no-Forge baseline score, configurable with `--min-score-ratio`;
- Forge pass rate is not worse than the baseline pass rate.

Baseline reports are allowed to fail oracle checks because those failures are the measured comparison signal. They must still be valid v2 report shapes over the selected cases.

## Evaluation Discipline

- Keep fixtures stable across suite comparisons.
- Do not let the agent edit the manifest or report schema during the run.
- Score only after independent verification commands are recorded.
- Mark interrupted runs as incomplete instead of failed skill behavior.
- Compare suites by pass rate, scope control, verification evidence, and user intervention count.
- Treat score deltas as diagnostic signals, not as release approval when any hard oracle fails.
- Evaluate skill prose with `plugins/forge/skills/shared/rubrics/skill-quality.md`; runtime evidence remains the release gate.
