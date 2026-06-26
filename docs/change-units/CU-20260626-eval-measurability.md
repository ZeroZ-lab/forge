# CU-20260626-eval-measurability

## Intent

Make the skills-suite evaluation more measurable and less self-referential after the eval-integrity red team:

- blind the Forge prompt from per-case oracle answers;
- stop treating answer-shaped self-report as behavioral evidence;
- harden command, skill-read, transcript, and Change Unit verification evidence;
- support repeated samples and a confidence-interval comparison gate;
- keep public docs aligned with the new limits.

## Behavior Change

- `run-skills-benchmark.mjs` now supports repeated samples via `--runs` / `--repeats`; each repeat gets a distinct `evidence_id`, event log, and workspace directory.
- Forge-arm prompts are built by `benchmark-prompts.mjs` and receive only the case id/title, fixture text, report shape, and published skill names. They no longer serialize `expected_*`, `required_evidence`, `forbidden_behaviors`, or `oracle_checks`.
- no-Forge fixture sanitization no longer truncates the whole implementation section; it removes Forge-specific scoring lines while preserving product requirements.
- `inspectRunReport` accepts multiple samples for the same `case_id` and evaluates each sample.
- The evaluator now rejects single-run Forge-vs-baseline comparisons, computes a CI gate over repeated fair-score samples, and derives comparison pass rate from oracle outcomes rather than self-reported `status`.
- `--verify-disk` now requires CU verification commands to be corroborated by the run's `events.jsonl`; echoing a command string does not count.
- Independent semantic branches now exist for `goal_covers`, `goal_verified`, `decision_gate_reported`, and `forbidden_behavior_absent`.
- Scoring persists independent-vs-self-report provenance and scores self-report passes as zero unless `--trust-self-report` is explicitly used.
- **Mixed-bypass fix**: the per-case `requireIndependent` check dropped its `evidence?.available &&` guard, so a self-report pass is flagged as lacking independent evidence whether or not an `events.jsonl` exists. Previously one real case (with evidence) could cover N self-report-only echo cases; now each echo case is flagged. Proven by a new `inspectRunReport` regression test.
- **Arrow normalization**: `transcriptContains` normalizes Unicode arrows (`→ ⇒ ⇨ …`) to ASCII `->` on both sides, so an oracle phrase like `detail -> codegen -> review` matches a transcript where the agent reasoned with `detail → codegen → review` (the form in `AGENTS.md` and the published skills). Proven by a new unit test.

## Impacted Surface

- `scripts/run-skills-benchmark.mjs`
- `scripts/evaluate-skills/index.mjs`
- `scripts/lib/benchmark-prompts.mjs`
- `scripts/lib/evidence-collector.mjs`
- `scripts/lib/run-report.mjs`
- `scripts/lib/multi-run-stats.mjs`
- `tests/*.test.mjs`
- `README.md`, `docs/skill-suite-evaluation.md`, `evals/skills-suite/README.md`
- de-coached skills-suite fixtures

## Decisions

- Keep `--trust-self-report` as an explicit synthetic/legacy escape hatch, but make default report scoring and hard gates prefer independent evidence.
- Treat repeated identical score samples as false precision unless repeated runs carry distinct `evidence_id` provenance.
- Keep the historical `2.0x` ratio as a point-estimate gate, but require repeated samples and CI separation before comparison passes.
- Do not claim suite-level effectiveness until a real full-suite multi-run comparison is published.

## Risks

- Existing single-run comparison scripts now fail by design and must add `--runs` / repeated report samples.
- Independent semantic checks are stricter and may reject older reports that only filled `goal_verification`, `goal_coverage_entries`, or `decisions` in final JSON.
- Codex CLI seed/temperature reproducibility and full 21-case multi-run evidence remain unverified in this CU.
- **`events.jsonl` has no integrity binding** (no hash/HMAC/signature linking `report.json` to its sibling `events.jsonl`). In a real Codex run the harness writes `events.jsonl` honestly, so independent evidence is trustworthy; but an operator-supplied synthetic report can forge an `events.jsonl` line to obtain `source = INDEPENDENT`. The evaluator cannot verify `events.jsonl` provenance — this is a known limitation, not a closed finding. A future CU could bind the two via a run-id HMAC.
- The master gate fires when no case carries independent evidence; with the mixed-bypass fix, per-case `requireIndependent` also flags each self-report-only case. Both are belt-and-suspenders; neither alone is sufficient.

## Verification

```bash
npm test
```

Result: 79 tests pass / 0 fail (was 77; +1 mixed-bypass regression, +1 arrow-normalization unit test).

```bash
node scripts/validate.mjs
```

Result: `Forge validation passed (25 skills, version 0.42.0).`

```bash
node scripts/evaluate-skills.mjs
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No-report mode states behavioral effectiveness is not claimed.

```bash
npm run metrics:chars -- --max-default-chain-chars=4500 --max-total-chars=56000
```

Result: default chain `4396 chars`; all `SKILL.md` files `46513 chars`; both under budget.

## Unverified

- Full 21-case Forge vs no-Forge multi-run comparison (`21 cases x 2 arms x K>=5`) was not run.
- Codex CLI `--seed` / `--temperature` behavior was wired for runner invocation but not proven against the installed CLI.
- External oracle/fixture review remains outside this code change.

## Rollback

Revert this CU and the files listed in Impacted Surface. The rollback restores single-run comparison behavior and self-report fallback scoring, so it should also restore the previous red-team vulnerabilities.

## Authoritative Documents Synchronized

- `README.md`: comparison examples now use `--runs 2`; `--verify-disk` explains events-backed command verification.
- `docs/skill-suite-evaluation.md`: comparison gate now documents repeated samples, CI separation, distinct `evidence_id`, and oracle-derived pass rate.
- `evals/skills-suite/README.md`: quickstart now reflects repeated-sample comparison and the non-suite-level status of the historical `2.0x` threshold.
