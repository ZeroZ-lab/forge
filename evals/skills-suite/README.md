# Forge skills-suite evaluation

This directory makes the Forge skill suite verifiable.

Run the deterministic contract check:

```bash
node scripts/evaluate-skills.mjs
```

That command proves the benchmark definition is complete: 21 cases (stage 8 / chain 3 / patch 7 / lens 2 / analysis 1), all registered skills covered, fixtures present, v2 Change Unit oracle checks valid, and goal verification evidence required where relevant. Only 3 of the 21 are chain-level, so this is not a set of 21 non-redundant chains. Three cases (init-skip-frontend, detail-backend-only, design-skip-no-frontend) share the same skip-frontend dimension and are not independent on that axis.

To score a real agent run, collect a JSON report matching `report.schema.json` and run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

The no-report mode does not claim the skills are behaviorally effective. It only proves the evaluation harness is intact.

To compare Forge against a no-Forge baseline, run the same case set in both modes and score the uplift. No-Forge mode strips Forge scoring instructions from the fixture so the baseline sees the product task and acceptance criteria, not the oracle:

```bash
node scripts/run-skills-benchmark.mjs --mode forge --case default-chain-small-feature --runs 2 --run-id forge-default-chain
node scripts/run-skills-benchmark.mjs --mode no-forge --case default-chain-small-feature --runs 2 --run-id no-forge-default-chain
node scripts/evaluate-skills.mjs \
  --allow-partial \
  --report .eval-runs/skills-suite/forge-default-chain/report.json \
  --baseline-report .eval-runs/skills-suite/no-forge-default-chain/report.json
```

The default comparison gate rejects single-run comparisons. Both arms need repeated samples with distinct `evidence_id` values; Forge's confidence interval lower bound must exceed the baseline upper bound, Forge must score at least 2.0x the no-Forge baseline, and Forge must avoid a worse oracle-derived pass rate. The 2.0x threshold is currently calibrated from historical 2 selected n=1 cases (guide-shortest-chain, default-chain-small-feature), not a suite-level result; do not cite it as a suite-level effectiveness claim until a full 21-case multi-run comparison is published.

v2 reports must include:

- `change_units`: reported `docs/change-units/CU-*.md` records.
- `goal_verification`: structured goal verification entries with `target` and `status`.
- `goal_coverage_entries`: structured goal coverage entries. `source` must be a `docs/...` file and `covers` lists paths covered by that source document.

All `expected_artifacts` in a scored case must be reported; missing expected artifacts fail the report even if other oracle checks pass. Non-CU artifacts must be reported through `artifacts`; CU paths must be reported through `change_units`; string-only `goal_verification` evidence is rejected.
