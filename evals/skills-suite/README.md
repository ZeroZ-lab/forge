# Forge skills-suite evaluation

This directory makes the Forge skill suite verifiable.

Run the deterministic contract check:

```bash
node scripts/evaluate-skills.mjs
```

That command proves the benchmark definition is complete: at least 10 cases, all registered skills covered, fixtures present, v2 Change Unit oracle checks valid, and rebuild-control evidence required where relevant.

To score a real agent run, collect a JSON report matching `report.schema.json` and run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

The no-report mode does not claim the skills are behaviorally effective. It only proves the evaluation harness is intact.

v2 reports must include:

- `change_units`: reported `docs/change-units/CU-*.md` records.
- `doc_sync`: structured Current Snapshot / Rebuild Control sync entries with `target` and `status`.
- `code_map_entries`: structured `docs/CODE_MAP.yml` source-to-projection entries. `source` must be a `docs/...` file and `projects_to` lists generated code, tests, or other projected artifacts.

All `expected_artifacts` in a scored case must be reported; missing expected artifacts fail the report even if other oracle checks pass. Non-CU artifacts must be reported through `artifacts`; CU paths must be reported through `change_units`; string-only `doc_sync` evidence is rejected.
