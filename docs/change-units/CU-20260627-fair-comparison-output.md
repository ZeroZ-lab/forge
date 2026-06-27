# CU-20260627-fair-comparison-output

## Intent

Make Forge-vs-no-Forge comparison output use the same fair-comparison score model that the evaluator gates on.

The comparison gate already used the fair model for both arms, but the success stdout printed the normal full-model Forge score next to the baseline fair-model score. That made the public effect line easier to misread.

## Behavior Change

- Successful comparison output now prints `Forge vs no-Forge (fair-comparison): ...`.
- The printed Forge and baseline scores now both come from the comparison JSON's fair-comparison model.
- Public docs now describe the 2.0x point-estimate gate as fair-comparison score vs fair-comparison baseline score.

## Impacted Surface

- `scripts/evaluate-skills/index.mjs`
- `tests/skills-suite-evaluation.test.mjs`
- `README.md`
- `docs/skill-suite-evaluation.md`
- `evals/skills-suite/README.md`

## Decisions

- Do not change the gate semantics; this is an output and documentation alignment fix.
- Keep the full-model score in the normal single-report score line, because it remains useful for full suite compliance diagnostics.

## Risks

- Historical comparison summaries that quoted the old stdout line may need re-reading as full-model-vs-fair-model display, not as the exact gate inputs.
- This does not add new real benchmark evidence.

## Verification

```bash
node --test tests/skills-suite-evaluation.test.mjs
```

Result: 26 tests pass / 0 fail.

```bash
node --test tests/eval-suite-distribution.test.mjs
```

Result: 7 tests pass / 0 fail.

```bash
npm test
```

Result: 86 tests pass / 0 fail.

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.44.0).`

```bash
node scripts/evaluate-skills.mjs
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No-report mode still states behavioral effectiveness is not claimed.

```bash
node scripts/run-skills-benchmark.mjs --mode forge --case guide-shortest-chain --runs 2 --run-id 20260627-forge-guide-fair-output-smoke
node scripts/run-skills-benchmark.mjs --mode no-forge --case guide-shortest-chain --runs 2 --run-id 20260627-noforge-guide-fair-output-smoke
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-forge-guide-fair-output-smoke/report.json --baseline-report .eval-runs/skills-suite/20260627-noforge-guide-fair-output-smoke/report.json --compare-out .eval-runs/skills-suite/20260627-guide-fair-output-comparison.json
```

Result: guide smoke comparison passed with real event evidence: Forge fair-comparison `100/100` vs no-Forge fair-comparison `47.5/100`, ratio `2.1x` against required `2x`, pass rate `100%` vs `0%`, and `20/20` Forge oracle checks independent.

## Unverified

- Only `guide-shortest-chain` was run as a real Forge-vs-no-Forge smoke comparison.
- No full 21-case multi-run comparison was executed.

## Rollback

Revert this CU and the listed files. The rollback restores the older comparison stdout wording.

## Authoritative Documents Synchronized

- `README.md`, `docs/skill-suite-evaluation.md`, and `evals/skills-suite/README.md` now all identify the 2.0x point-estimate as a fair-comparison score ratio.
