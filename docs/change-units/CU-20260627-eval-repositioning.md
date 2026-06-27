# CU-20260627-eval-repositioning

## Intent

Reposition the Forge skills-suite from an implied effectiveness benchmark to a fixed-scenario compliance/regression harness.

The previous public wording still contained claims such as "A run proves skill effectiveness" and "Forge effectiveness must be compared..." even though the suite primarily checks routing, artifact, verification, traceability, and scope-control compliance on Forge-authored fixed cases.

## Behavior Change

- Public evaluation docs now state that skills-suite passing reports are scenario-compliance evidence, not independent proof of real-world delivery effectiveness.
- The README and suite README describe Forge vs no-Forge comparison as experimental and diagnostic.
- The manifest description now calls the suite a deterministic compliance/regression contract and explicitly says it is not an independent real-world effectiveness benchmark.
- `validate.mjs` now gates on the new "A run satisfies scenario compliance" wording instead of the old effectiveness-proof wording.
- `tests/eval-suite-distribution.test.mjs` now fails if public docs revive the old effectiveness-proof framing.

## Impacted Surface

- `README.md`
- `docs/skill-suite-evaluation.md`
- `evals/skills-suite/README.md`
- `evals/skills-suite/manifest.json`
- `docs/project.md`
- `docs/features/eval-integrity/goal.md`
- `scripts/validate.mjs`
- `tests/eval-suite-distribution.test.mjs`

## Decisions

- Keep the manifest `name` as `forge-skills-suite-benchmark` for compatibility with existing contract tests and tooling.
- Do not change evaluator scoring behavior in this CU; this is a positioning and documentation contract change.
- Treat the existing suite as release/regression evidence for fixed Forge scenarios. Independent effectiveness remains a separate future suite requiring held-out or externally reviewed tasks and a strong baseline.

## Risks

- Historical thinking docs and old CUs still contain prior critique or historical language; they remain history, not current positioning.
- Readers may still over-interpret the 2.0x comparison gate unless future docs and releases keep the caveat attached.
- This does not add held-out tasks or external oracle review.

## Verification

```bash
node --test tests/eval-suite-distribution.test.mjs
```

Result: 7 tests pass / 0 fail.

```bash
node scripts/validate.mjs
```

Result: `Forge validation passed (25 skills, version 0.44.0).`

```bash
node scripts/evaluate-skills.mjs
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No-report mode still states behavioral effectiveness is not claimed.

```bash
npm test
```

Result: 86 tests pass / 0 fail.

## Unverified

- No full 21-case Forge vs no-Forge multi-run comparison was run.
- No held-out or externally reviewed effectiveness suite was created.
- No real Codex runner behavior changed.

## Rollback

Revert this CU and the files listed in Impacted Surface. The rollback restores the old public framing and old validator text gate.

## Authoritative Documents Synchronized

- `docs/project.md`: PD7 now distinguishes compliance/regression evidence from independent effectiveness evidence.
- `docs/features/eval-integrity/goal.md`: eval-integrity now records the repositioning criterion.
- `README.md`, `docs/skill-suite-evaluation.md`, and `evals/skills-suite/README.md`: public positioning now agrees on fixed-scenario compliance/regression scope.
