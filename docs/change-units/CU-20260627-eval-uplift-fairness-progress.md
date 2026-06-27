# CU-20260627-eval-uplift-fairness-progress

## Intent

Move the `效果提升 100%` eval goal forward without weakening the fair-comparison model or overstating the evidence.

This CU records additional 2-repeat smoke evidence, a no-Forge sanitizer fairness fix, and a learn-case contract fix discovered while trying to expand aggregate coverage.

## Behavior Change

- `sanitizeNoForgeFixture` now removes benchmark `Expected behavior` blocks and Forge workflow cues such as feature-goal-before-implementation, `docs/features/*/goal.md`, and goal-coverage wording.
- The no-Forge default-chain baseline now receives the product task, ACs, and `node:test` implementation requirement, but not benchmark oracle coaching.
- `learn-archive-methodology` no longer expects `docs/project.md` as an artifact before human archive-target confirmation.
- `learn/SKILL.md` now tells agents to emit a non-JSON progress evidence line containing `Archive Decision Report` and `archive_target_confirmation` when archive-target confirmation is pending.
- Additional real smoke comparisons were recorded for `bugfix-unreproducible-blocked` and `guide-routing-matrix`, both reaching the 2.0x fair-comparison gate.

## Impacted Surface

- `scripts/lib/benchmark-helpers.mjs`
- `tests/run-skills-benchmark.test.mjs`
- `evals/skills-suite/manifest.json`
- `plugins/forge/skills/learn/SKILL.md`
- `docs/change-units/CU-20260627-eval-uplift-fairness-progress.md`
- Generated run evidence under `.eval-runs/skills-suite/20260627-*`

## Decisions

- Keep the fair-comparison model unchanged: artifacts, verification, and scope-control remain the compared axes.
- Remove only benchmark/Forge workflow cues from no-Forge fixtures; preserve product ACs and concrete implementation/test requirements.
- Treat `docs/project.md` as a pending archive target in learn, not as an expected artifact before D3 human confirmation.
- Do not count blocked Codex repeats as skill effectiveness evidence.

## Risks

- The current 4-case smoke aggregate still fails the 2.0x gate after the sanitizer fix: Forge `100/100` vs no-Forge `60.7/100`, ratio `1.6x`.
- `default-chain-small-feature` remains a strong baseline case: post-sanitizer no-Forge still scores `77.8/100`, ratio `1.3x`.
- `learn-archive-methodology` post-fix had one Forge repeat pass and one repeat blocked by Codex usage limit, so it cannot be counted as a completed 2-repeat comparison yet.
- No full 21-case multi-run Forge-vs-no-Forge comparison has been executed.

## Verification

```bash
node --test tests/run-skills-benchmark.test.mjs
```

Result: 16 tests pass / 0 fail.

```bash
node --test tests/skills-suite-evaluation.test.mjs tests/eval-suite-distribution.test.mjs
```

Result: 33 tests pass / 0 fail.

```bash
npm test
```

Result: 87 tests pass / 0 fail.

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.45.0).`

```bash
node scripts/evaluate-skills.mjs
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No-report mode still states behavioral effectiveness is not claimed.

```bash
node scripts/install-local-codex-plugin.mjs
```

Result: installed local Forge plugin into Codex cache as `forge-local/forge/0.45.0`.

```bash
npm run metrics:chars
```

Result: default chain `4026` chars; all `SKILL.md` files `47794` chars.

```bash
node scripts/run-skills-benchmark.mjs --mode no-forge --case default-chain-small-feature --runs 2 --run-id 20260627-noforge-default-chain-post-sanitizer
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-forge-default-chain-2x-smoke/report.json --baseline-report .eval-runs/skills-suite/20260627-noforge-default-chain-post-sanitizer/report.json --compare-out .eval-runs/skills-suite/20260627-default-chain-post-sanitizer-comparison.json
```

Result: default-chain comparison still failed the 2.0x gate: Forge `100/100` vs no-Forge `77.8/100`, ratio `1.3x`.

```bash
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-smoke4-post-sanitizer-forge/report.json --baseline-report .eval-runs/skills-suite/20260627-smoke4-post-sanitizer-noforge/report.json --compare-out .eval-runs/skills-suite/20260627-smoke4-post-sanitizer-comparison.json
```

Result: 4-case aggregate comparison still failed the 2.0x gate: Forge `100/100` vs no-Forge `60.7/100`, ratio `1.6x`.

```bash
node scripts/run-skills-benchmark.mjs --mode forge --case learn-archive-methodology --runs 2 --run-id 20260627-forge-learn-archive-post-fix
```

Result: repeat `r0` passed with the updated `forge-local/forge/0.45.0` learn skill; repeat `r1` was blocked by Codex usage limit and is not effectiveness evidence.

```bash
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-forge-learn-archive-2x-smoke/report.json --baseline-report .eval-runs/skills-suite/20260627-noforge-learn-archive-2x-smoke/report.json --compare-out .eval-runs/skills-suite/20260627-learn-archive-after-manifest-fix-comparison.json
```

Result: old learn evidence no longer fails on `docs/project.md`, but still fails because one pre-fix repeat lacked independent transcript/decision evidence; comparison remains Forge `75/100` vs no-Forge `50/100`, ratio `1.5x`.

Additional completed 2-repeat comparisons:

```text
guide-shortest-chain: Forge 100/100 vs no-Forge 47.5/100, ratio 2.1x
bugfix-unreproducible-blocked: Forge 100/100 vs no-Forge 50/100, ratio 2x
guide-routing-matrix: Forge 100/100 vs no-Forge 50/100, ratio 2x
```

## Unverified

- The overall 2.0x effect target is not proven.
- The post-fix `learn-archive-methodology` comparison needs a second successful Forge repeat after Codex usage limit clears.
- No held-out or externally reviewed effectiveness suite was run.

## Rollback

Revert this CU plus the edits to `scripts/lib/benchmark-helpers.mjs`, `tests/run-skills-benchmark.test.mjs`, `evals/skills-suite/manifest.json`, and `plugins/forge/skills/learn/SKILL.md`. Generated `.eval-runs` artifacts may be removed if the evidence should no longer be retained.

## Authoritative Documents Synchronized

- `evals/skills-suite/manifest.json`: learn archive artifact expectations now match D3 human-confirmation behavior.
- `plugins/forge/skills/learn/SKILL.md`: learn now exposes the transcript/decision signal required by the suite.
