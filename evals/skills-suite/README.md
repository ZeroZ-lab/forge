# Forge skills-suite evaluation

This directory makes the Forge skill suite verifiable.

Run the deterministic contract check:

```bash
node scripts/evaluate-skills.mjs
```

That command proves the benchmark definition is complete: 10 non-redundant chain cases, all registered skills covered, fixtures present, v2 Change Unit oracle checks valid, and goal verification evidence required where relevant.

To score a real agent run, collect a JSON report matching `report.schema.json` and run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

The no-report mode does not claim the skills are behaviorally effective. It only proves the evaluation harness is intact.

v2 reports must include:

- `change_units`: reported `docs/change-units/CU-*.md` records.
- `goal_verification`: structured goal verification entries with `target` and `status`.
- `goal_coverage_entries`: structured goal coverage entries. `source` must be a `docs/...` file and `covers` lists paths covered by that source document.

All `expected_artifacts` in a scored case must be reported; missing expected artifacts fail the report even if other oracle checks pass. Non-CU artifacts must be reported through `artifacts`; CU paths must be reported through `change_units`; string-only `goal_verification` evidence is rejected.
