# CU-20260714-kernel-non-interference-contract

## Type

- Evaluation contract and methodology

## Intent

- Trigger: Forge Next B01 / [GitHub #11](https://github.com/ZeroZ-lab/forge/issues/11) required an executable boundary that prevents Forge from treating a fixed Skill path as model success.
- Goal: Define what the Kernel may control, preserve direct model action as a first-class path, and make non-interference a same-model Forge/no-Forge outcome comparison.
- Out of scope: Changing the published default invocation flow, defining the effectiveness report schema, implementing benchmark arms or an outcome evaluator, running paired model experiments, and changing the Forge package version.

## Source Baseline

- Implementation commit: `1d0f81fd8df14f63ed79aaad610301a2dd4a0857` on `codex/forge-next`.
- The worktree was clean at that commit before this Change Unit was created.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`; npm `11.4.2`.
- Evidence completed at `2026-07-14T14:42:55Z` UTC.

## Behavior Change

- Effectiveness manifest v2 now defines an exact `kernel_contract`:
  - Kernel-owned: objective, permissions, scope, authoritative facts, evidence, task state, and completion conditions.
  - Model-owned/non-controlled: lifecycle stage, Skill selection, implementation strategy, and internal reasoning.
  - Legal paths: direct action, optional Skill use, skipping a Skill, and rejecting an irrelevant capability.
  - Success basis: verified outcome, safety, and valid evidence.
  - Forbidden proxies: fixed Skill hit rate, fixed stage completion, and model-name capability ordering.
- Non-interference is defined as a paired comparison of Forge and no-Forge arms for the same model, fixture, workspace revision, budget, and verifier. Models are reported separately rather than placed in a presumed capability total order.
- Manifest, Kernel, non-interference, and case objects now use exact field allowlists. Modes, metrics, and all normative Kernel lists must match exactly; extra scoring fields fail validation.
- A sixth held-out scenario, `direct-action`, asks for the authoritative package version with an unchanged workspace and command evidence. It does not require or forbid Skill use; proportional verified outcome is the review target.
- The fixed skills-suite remains a compatibility/regression harness. Its routing signals are explicitly excluded from Kernel effectiveness and non-interference claims.
- Project decision PD11 records the Kernel boundary while leaving the current PD1 default entry unchanged until B10.

## Decisions

- Keep B01 at the contract seam. Report shape belongs to B02/B03, runner arms to B04/B05, external verification/evaluation to B07/B08, and statistical non-interference detection to B09.
- Use exact structural contracts for machine enforcement. Arbitrary prose cannot be proven semantically route-neutral by keyword matching; broad `skill/stage/route` regexes were rejected because they both block legitimate business language and remain bypassable.
- Treat fixture and review prose as human review input, not executable scoring. B08 must score external outcome, safety, and evidence independently.
- Reject manifest v1 rather than silently interpreting it with v2 Kernel semantics. There is no effectiveness report consumer to migrate yet; B02 will define report-version compatibility separately.
- Do not modify published Skills, manifests, default prompts, or version metadata in B01.

## Affected Surface

- Machine contract and validator: `evals/effectiveness-suite/manifest.json`, `scripts/lib/effectiveness-contract.mjs`.
- Held-out task: `evals/effectiveness-suite/fixtures/direct-read-package-version.md`.
- Contract tests: `tests/effectiveness-suite.test.mjs`.
- Project/evaluation documentation: `docs/project.md`, `docs/skill-suite-evaluation.md`, `evals/effectiveness-suite/README.md`, and the existing effectiveness feature goal.
- No published Skill, default invocation policy, plugin/package manifest, dependency, lockfile, or version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manifest v2 rejects v1 consumers | An old custom contract reader may stop | Failure is explicit; update readers to v2 rather than guessing new semantics |
| Exact allowlists require deliberate schema evolution | Legitimate B02–B09 fields initially fail | Expand contract and validator atomically with focused red-capable tests |
| Free-form prose can still contain subtle route bias | Static validation cannot prove semantic neutrality | Prose is non-executable review input; independent B08 verifier/evaluator owns result scoring |
| Direct fixture has not been run in paired model arms | No empirical non-interference or Forge benefit is established | B04/B05 build the runner/arms; B08/B09 evaluate paired outcomes and uncertainty |
| Legacy skills-suite still scores routing compliance | Its score could be misquoted as effectiveness | Documentation explicitly isolates it from the Kernel gate and retains it only for compatibility regression |
| PD1 remains the current default entry | Runtime remains stage-oriented until migration | B10 freezes the legacy baseline before C activates the new Kernel |

## Verification

- Red-capable evidence: initial `node --test tests/effectiveness-suite.test.mjs` → exit 1; three intended failures showed the missing direct-action scenario, absent Kernel contract, and acceptance of fixed routing success fields.
- Focused green: `node --test tests/effectiveness-suite.test.mjs` → exit 0; 6 passed, 0 failed. Negative mutations cover:
  - `required_skills`, `required_stages`, `skill_hit_rate`, and nested `oracle_checks: skill_triggered`;
  - extra `fixed_skill_hit_rate` metric and top-level `scoring_model`;
  - extra Kernel/non-interference Skill fields;
  - incomplete legal paths/non-control lists, model-name ordering, and manifest v1.
- Node 24 (`v24.14.0`, npm `11.4.2`):
  - `npm test` → exit 0; 134 passed, 0 failed.
  - `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - `npm run eval:effectiveness` → exit 0; manifest v2 passed with 6 cases, 6 scenarios, and 2 repeats required; no real-world-effectiveness claim.
  - `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
- Node 22 (`v22.22.3`, npm `11.4.2`):
  - `npm run check:supported` → exit 0; 134 tests passed, validator passed, and the 23-case skills-suite contract passed.
  - `npm run eval:effectiveness` → exit 0; 6 cases, 6 scenarios, 2 repeats required.
- `git diff --check` → exit 0.
- Two independent read-only reviews found no remaining P0/P1/P2 B01 correctness blocker after exact allowlists replaced the broad prose regex.
- Not verified:
  - The direct-action fixture was not executed through real Forge/no-Forge model arms.
  - No effectiveness report schema, runner, verifier adapter, outcome evaluator, paired statistics, or non-interference threshold exists yet.
  - No real-world Forge benefit or lack of interference is claimed by this static contract.

## Rollback

- Revert implementation commit `1d0f81fd8df14f63ed79aaad610301a2dd4a0857` and this Change Unit commit together.
- No data migration, registry publication, version change, or external state requires rollback.
- Safe stop: do not use the effectiveness suite as a Kernel gate if exact contract validation fails or if later evaluators consume route-dependent proxies.

## Docs To Sync

- [x] `docs/project.md` — Kernel/Direct action language and PD11, with B10 activation boundary.
- [x] `docs/skill-suite-evaluation.md` — six held-out cases and legacy routing isolation.
- [x] `evals/effectiveness-suite/README.md` — v2 contract, same-model comparison, legal paths, and semantic non-claim.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — current six-scenario extension noted without rewriting the original feature intent.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- Implementation commit `1d0f81f` contains the complete B01 structural contract, direct-action fixture, documentation, and regression tests.
- Both supported Node majors pass the current canonical contracts.
- Fixed routing proxies cannot be added through supported machine-scored fields without a validator failure.
- Empirical outcome comparison remains explicitly deferred and unclaimed.
