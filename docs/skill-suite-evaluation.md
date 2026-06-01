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

The baseline suite contains at least 10 cases and covers all registered Forge skills.

## Report Contract

A run report follows `evals/skills-suite/report.schema.json`.

Each case report records:

- `triggered_skills`
- `artifacts`
- `commands_run`
- `decisions`
- `forbidden_behaviors`
- `evidence`
- `status`

The evaluator treats missing or indirect evidence as failure. A passing report must prove every oracle check for every benchmark case.

## Evaluation Discipline

- Keep fixtures stable across suite comparisons.
- Do not let the agent edit the manifest or report schema during the run.
- Score only after independent verification commands are recorded.
- Mark interrupted runs as incomplete instead of failed skill behavior.
- Compare suites by pass rate, scope control, verification evidence, and user intervention count.
