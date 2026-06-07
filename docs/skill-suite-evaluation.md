# Skill Suite Evaluation

Forge skills must be evaluated by runtime behavior, not by prose quality alone.

## What Is Verifiable

The repository now separates two claims:

1. **Benchmark contract is valid**: cases exist, cover every skill, fixtures exist, and oracle checks are machine-readable.
2. **A run proves skill effectiveness**: an actual agent run produced a report that passes the benchmark oracle.

The first claim is checked locally by `node scripts/evaluate-skills.mjs`. The second claim requires a report from a real run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

No-report mode must not be used as evidence that the skills are effective. It only proves the evaluation harness is intact.

## V2 Traceability Contract

The benchmark contract is now version 2. Every scored case must prove that the run is traceable through a Change Unit.

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

The baseline suite contains 10 non-redundant chain cases and covers all registered Forge skills.

Cases should prefer complete adjacent chains over isolated single-stage prompts when the chain has a natural runtime handoff. For example, frontend design should continue through implementation acceptance, and implementation planning should continue through test cases and codegen. Keep standalone cases only when the skill is intentionally a sidecar, such as red-team thinking.

## Report Contract

A run report follows `evals/skills-suite/report.schema.json`.

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

## Evaluation Discipline

- Keep fixtures stable across suite comparisons.
- Do not let the agent edit the manifest or report schema during the run.
- Score only after independent verification commands are recorded.
- Mark interrupted runs as incomplete instead of failed skill behavior.
- Compare suites by pass rate, scope control, verification evidence, and user intervention count.
- Treat score deltas as diagnostic signals, not as release approval when any hard oracle fails.
