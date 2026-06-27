# CU-20260627-transcript-verification-normalization

## Intent

Stop rejecting real verification progress evidence because the transcript used English or adjacent Chinese wording instead of the exact oracle phrase `运行验证`.

The `default-chain-small-feature` Forge smoke run performed real `node --test` verification and reported it in non-final progress messages as `runtime verification`, `Verification passed`, `验证回执`, and `最窄验证命令`, but the transcript oracle required an exact `运行验证` substring.

## Behavior Change

- `transcriptContains` still ignores final JSON reports and structured mid-task echo blobs.
- For the `运行验证` oracle phrase, it now accepts non-final reasoning messages that mention equivalent verification signals, including `runtime verification`, `verification passed`, `验证回执`, `验证命令`, `验证通过`, and `最窄验证`.
- The default-chain Forge smoke report now scores `100/100` with `36/36` independent oracle checks.

## Impacted Surface

- `scripts/lib/evidence-collector.mjs`
- `tests/evidence-collector.test.mjs`

## Decisions

- Keep the synonym bridge narrow and only apply it to the existing `运行验证` oracle phrase.
- Do not weaken the structured-echo guard; JSON-shaped echo messages still do not satisfy transcript evidence.
- Do not treat this as proof of 2.0x effect; it fixes a Forge false negative.

## Risks

- Any synonym-based transcript check is less strict than exact matching. The implementation limits this to verification-specific phrases in non-final reasoning messages.
- Baseline runs can also receive credit when they genuinely report verification in a non-final message, which is appropriate for a fair comparison.

## Verification

```bash
node --test tests/evidence-collector.test.mjs
```

Result: 26 tests pass / 0 fail.

```bash
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-forge-default-chain-2x-smoke/report.json --score-out /tmp/forge-default-score-after-transcript.json
```

Result: Forge default-chain smoke passed with `36/36` independent oracle checks and `100/100` score.

```bash
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260627-forge-default-chain-2x-smoke/report.json --baseline-report .eval-runs/skills-suite/20260627-noforge-default-chain-2x-smoke/report.json --compare-out .eval-runs/skills-suite/20260627-default-chain-2x-comparison-after-transcript.json
```

Result: comparison still failed the 2.0x gate: Forge fair-comparison `100/100` vs no-Forge fair-comparison `82.2/100`, ratio `1.2x`.

## Unverified

- No full 21-case multi-run comparison was executed.
- No claim is made that the overall effect target is met.

## Rollback

Revert this CU plus the matcher/test edits in `scripts/lib/evidence-collector.mjs` and `tests/evidence-collector.test.mjs`.

## Authoritative Documents Synchronized

- No project-level positioning change was needed. This CU records the behavior-level evidence change and its limits.
