# Forge skills-suite evaluation

This directory makes the Forge skill suite verifiable.

Run the deterministic contract check:

```bash
node scripts/evaluate-skills.mjs
```

That command proves the benchmark definition is complete: at least 10 cases, all 23 skills covered, fixtures present, and oracle checks valid.

To score a real agent run, collect a JSON report matching `report.schema.json` and run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

The no-report mode does not claim the skills are behaviorally effective. It only proves the evaluation harness is intact.
