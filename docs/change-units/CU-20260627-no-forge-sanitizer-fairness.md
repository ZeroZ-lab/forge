# CU-20260627-no-forge-sanitizer-fairness

## Intent

Make the no-Forge baseline prompt sanitizer preserve product requirements while still removing Forge-specific scoring and report-shape coaching.

The previous sanitizer removed any fixture line containing `skill` or `trigger`. That could delete legitimate product requirements from the baseline arm and make Forge-vs-no-Forge uplift look stronger than the task actually supports.

## Behavior Change

- `sanitizeNoForgeFixture` now removes specific Forge/report cues such as `triggered_skills`, `expected_skills`, the default Forge chain, Change Units, goal verification report fields, and `docs/change-units`.
- Product lines that merely contain ordinary domain words like `skill` or `trigger` are preserved.
- The runner unit test now asserts both sides of the contract: Forge scoring instructions are removed, and product `skill trigger` requirements remain.

## Impacted Surface

- `scripts/lib/benchmark-helpers.mjs`
- `tests/run-skills-benchmark.test.mjs`

## Decisions

- Keep line-based sanitization for now because the current fixture format is Markdown prose and the needed fix is narrow.
- Do not broaden this into a full fixture rewrite or new held-out suite.
- Do not claim a new suite-level effectiveness result; this improves comparison fairness for future runs.

## Risks

- A future fixture could contain a new Forge-specific coaching phrase not covered by the explicit patterns.
- This may increase no-Forge baseline scores in affected cases, reducing previously reported uplift ratios. That is desirable for evaluation honesty but changes historical comparability.

## Verification

```bash
node --test tests/run-skills-benchmark.test.mjs
```

Result: 16 tests pass / 0 fail.

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

## Unverified

- No real Forge-vs-no-Forge benchmark run was executed.
- No full 21-case multi-run comparison was executed.

## Rollback

Revert this CU plus the edits to `scripts/lib/benchmark-helpers.mjs` and `tests/run-skills-benchmark.test.mjs`.

## Authoritative Documents Synchronized

- Existing `docs/skill-suite-evaluation.md` already states that no-Forge mode preserves the product task and acceptance criteria while stripping Forge scoring instructions; this CU tightens the implementation to match that contract.
