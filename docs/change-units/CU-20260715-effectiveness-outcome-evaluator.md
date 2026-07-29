# CU-20260715-effectiveness-outcome-evaluator

## Type

- Outcome evaluation, hard gates, and comparison-seal contract

## Intent

- Trigger: Forge Next B08 / [GitHub #18](https://github.com/ZeroZ-lab/forge/issues/18) required objective outcome evaluation after B06/B07 evidence verification.
- Goal: Derive a traceable task outcome from structured goals, acceptance criteria, constraints, and independently retained evidence without prescribing or rewarding a Skill/action path.
- Out of scope: Paired statistics and effectiveness claims (B09), model ranking, a production verifier host, external cryptographic authentication, package/plugin version changes, publication, push, and issue closure.

## Source Baseline

- Fixed implementation baseline: B07 documentation commit `e20c91b` on `codex/forge-next`.
- Forge package/plugin version is released as `0.53.0` with the adaptive runtime changes.
- Environment: Darwin arm64; Node 22 and 24 support line.
- Evidence date: 2026-07-15.

## Behavior Change

- Manifest v5 now pins one strict outcome contract per held-out case. Each contract binds objective, fixture, authoritative requirement source refs/digests, the complete verifier id/definition manifest, required or optional objective/acceptance criteria, hard permission/scope/safety/evidence-integrity constraints, and exact blocker verifier/outcome/reason rules.
- Contract parsing rejects extra path proxies including required Skill, lifecycle stage, action path, arm, and model fields. Capability activation and costs never enter the evaluator view.
- Added deterministic `success`, `partial`, `correct_block`, `infrastructure_error`, and `fail` derivations with per-rule status, reason, basis, claim alignment, and exact Evidence Envelope/result/host-observation references. The pure derivation is non-authoritative until retained and accepted by seal v4.
- Added stable hard-gate ordering. Integrity and authorization/scope/safety violations outrank required hidden-verifier failure and false completion; all triggered gates remain visible, and no compensating numeric total can hide them.
- Correct blocking requires a scheduler-approved reason for every unexplained required criterion plus passing hard constraints. A second infrastructure unknown or unsafe side effect cannot hide behind one valid blocker.
- Outcome-enabled comparison runs add only the contract id/digest to common context, leave report v1 immutable, write content-addressed outcome sidecars after host cleanup and B06/B07 replay, and publish comparison-group seal v4.
- Seal v4 binds the outcome contract, complete verifier manifest, reports, host/runtime receipts, and sidecars. Validation re-derives each sidecar from retained evidence rather than trusting its claimed verdict.
- Added a trusted-open interface that requires the expected verifier runtime and manifest-pinned outcome contract, validates the complete sealed group, and returns a deeply frozen report/outcome snapshot from the same bounded no-follow file descriptors. Hard-linked members fail closed.
- Historical seal v1–v3 retain their original B05–B07 semantics and are not relabeled as B08 outcomes.

## Decisions

- Keep action selection model-owned. Outcome rules bind requirements to evidence; they do not bind requirements to Skills, stages, arm names, model names, tool counts, or an implementation strategy.
- Keep B08 a deterministic derived module, not another verifier. B07 owns observation; B08 owns sufficiency, gate precedence, claim alignment, and disposition.
- Do not emit an aggregate score in B08. B09 can aggregate categorical outcomes and diagnostic coverage, but a hard violation remains non-compensable.
- Treat the suite manifest as the local policy trust root and bind its per-case digest, fixture, requirement sources, and complete verifier definitions everywhere they matter. Digest integrity is not remote authenticity; an actor controlling the manifest, host, and entire store can still reauthor a self-consistent chain.
- Version the new group acceptance as seal v4 instead of silently tightening v3.

## Affected Surface

- Runtime: `scripts/lib/effectiveness-outcome.mjs` and `scripts/lib/effectiveness-experiment.mjs`.
- Tests: `tests/effectiveness-outcome.test.mjs` and v4 integration/recovery cases in `tests/effectiveness-experiment.test.mjs`.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill text, default route, dependency, lockfile, package/plugin manifest, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Policy maps an irrelevant verifier to a requirement | Passing evidence could be misinterpreted as completion | Manifest v5 pins reviewed per-case requirement refs and complete verifier definitions; caller substitutions or missing members fail before launch |
| Model self-report is treated as proof | A confident completion claim could override facts | Evaluator receives B07 verifier facts; self-report participates only in claim alignment and can trigger false completion |
| One blocker hides another unknown | Incomplete work could be labeled correct block | Every required non-pass must be present and use an allowed reason; hard constraints must pass |
| Infrastructure failure masks a safety/scope violation | Unsafe attempt could avoid failure | All observed hard violations run before blocker/infra disposition |
| Sidecar is edited after evaluation | B09 could consume a forged verdict | Content-addressed ref and seal bind bytes; trusted open recomputes the outcome from retained report/verifier evidence |
| Same-user actor rewrites policy, seal, reports, and evidence together | Digest-only validation cannot prove external authenticity | No cryptographic trust claim is made; immutable storage or an external signed trust root is required |
| Historical v3 group is treated as outcome-ready | B09 could infer results without B08 evidence | Only v4 contains and claims outcome semantics; v1–v3 stay compatible under their prior contracts |

## Verification

- TDD outcome seam: `node --test tests/effectiveness-outcome.test.mjs` covers path-proxy rejection, success, partial, correct block, unexplained unknown, infrastructure, hard scope violation, hidden verifier failure, false completion, exact trace, and direct/Skill path non-interference.
- B05–B08 integration: outcome-enabled four-arm groups publish v4 sidecars, trusted open returns frozen snapshots, tampered sidecars are rejected and quarantined, and reports remain unchanged.
- Final repository and dual-Node gates are recorded below after completion.

## Rollback

- Revert the B08 implementation commit(s) and this Change Unit together.
- Remove or preserve v4 groups for diagnosis; do not relabel v4 sidecars as v3 evidence. Rerun without B08 only when a v3 evidence group is intentionally sufficient for the consumer.
- Historical v1–v3 groups require no data migration.
- No dependency, registry publication, package/plugin version, production data, or external state requires rollback.

## Docs To Sync

- [x] `docs/project.md` — PD18 records the action-neutral outcome and seal boundary.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC14/FD14 record requirements, compatibility, and non-goals.
- [x] `evals/effectiveness-suite/README.md` — public interface, gate taxonomy, v4/open semantics, and trust limitations.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- Direct action and optional Skill action use the same requirement/evidence rules; capability telemetry is excluded from outcome derivation.
- A failed required verifier and a false model completion claim are both retained, with deterministic primary attribution.
- Unauthorized or unsafe changes cannot be offset by other passing criteria or an infrastructure failure.
- Every positive or negative rule decision names its contract basis and retained verifier evidence chain; missing evidence stays explicit.
- B08 completes the per-attempt outcome seam. B09 remains responsible for paired repeats, uncertainty, and any effectiveness claim.
