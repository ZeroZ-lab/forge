# CU-20260715-external-verifier-adapters

## Type

- External verification, retained evidence, and comparison-seal contract

## Intent

- Trigger: Forge Next B07 / [GitHub #16](https://github.com/ZeroZ-lab/forge/issues/16) required one external interface for test, build, typecheck, hidden assertion, and captured-diff verification.
- Goal: Make verifier outcomes independently sourced, target-bound, retained, and impossible for later model text to overwrite, without rewarding a fixed Skill route or deciding task completion inside B07.
- Out of scope: Evidence-sufficiency and objective outcome scoring (B08), paired statistical claims (B09), a bundled production hostile-code sandbox, remote host authentication, package/plugin version changes, publication, push, and issue closure.

## Source Baseline

- Implementation commits: `24eac9d`, `faf6aba`, `3174fe1`, `64016a9`, `1aaeedd`, and `559e212` on `codex/forge-next`.
- Fixed review baseline: B06 completion commit `48caac9`.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`.
- Evidence completed on 2026-07-15 UTC.

## Behavior Change

- Added strict factories for command (`test`, `build`, `typecheck`), host-private hidden assertion, and captured-diff verifier definitions. Adapter and external-executor definitions are immutable and included in the controlled verifier-set digest.
- Added a versioned host runtime seam owned by B05, not by the model/provider observation. Public factory registration validates shape but is not identity authentication; B05 requires the exact runtime object and controlled set.
- The external host contract declares timeout/output bounds, CPU/memory/disk limits, network and secret isolation, workspace/evidence isolation, process-tree cleanup, non-blocking bridge behavior, and cancellation. Forge adds its own deadline, `AbortSignal`, bounded cancel acknowledgement, and settled-execution requirement; missing cleanup acknowledgement fails closed.
- Diff verifiers receive digest-checked retained patch and base-snapshot handles. B07 rechecks the retained diff after host execution, while B04 separately rechecks the final workspace before cleanup.
- Host observations have a fixed, size-bounded shape and never retain hidden oracle content or exception text. Command status/exit/signal invariants distinguish pass, task failure, command absence, timeout/output limit, and infrastructure failure.
- Every result binds the verifier set, executor, verifier definition, scope, independence level, attempt/objective, isolation id, base/final snapshots, retained diff ref/digest, timestamps, and one retained host-observation reference.
- B04 executes the verifier set after workspace capture and before capsule cleanup, extends the report execution window through verifier completion, rejects host side effects, and first-publishes verifier events, `independent_verifier` evidence, final refs, and B06 claim Envelopes. Model/provider inputs cannot submit these runner-owned fields.
- B05 requires a runtime matching the common controlled set across all arms. Comparison-group seal v3 binds the complete ordered verifier id/definition manifest, requires every arm's final refs to cover it exactly, requires every verifier Envelope, revalidates retained result and observation bytes, parses the observation, re-derives outcome/reason and event status, and checks all target/workspace/producer bindings.
- Historical seal v1 keeps the original B05 semantics and seal v2 keeps the B06 Envelope semantics. Neither is silently promoted to B07; only v3 requires and claims B07 verifier semantics.

## Decisions

- Keep action choice model-owned. The verifier set observes results and safety-relevant facts; it does not prescribe lifecycle stages, Skill calls, or an action path.
- Treat external host guarantees as an explicit, auditable trust boundary, not as cryptographic proof or production isolation evidence. The repository test double verifies protocol behavior only.
- Derive result semantics from normalized host observation rather than accepting caller outcome labels. A later model success statement cannot replace a failed observation/result/event/Envelope chain.
- Keep B07 below the completion decision. `passed` means that one verifier passed in its declared scope; B08 must decide whether available evidence is sufficient for the objective.
- Version B07 comparison acceptance as seal v3 instead of tightening B06 seal v2 in place.
- Fail closed when an external bridge misses its deadline without acknowledged cleanup; do not publish a sanitized result while host execution may still be live.

## Affected Surface

- Runtime: `scripts/lib/effectiveness-verifier.mjs`, `scripts/lib/effectiveness-runner.mjs`, and `scripts/lib/effectiveness-experiment.mjs`.
- Tests: verifier public seam, B04 first-publication and side-effect checks, B05 v1/v2/v3 compatibility, Envelope retention, observation/result contradiction, and recovery.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill text, default routing, dependency, lockfile, package/plugin manifest, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Host declares guarantees it does not enforce | Hostile verification code may escape or fabricate observations | Runtime/set bind the declaration; production hosts require separate audit and external trust policy; repository tests do not claim production isolation |
| In-process bridge blocks the JS event loop despite the non-blocking contract | Forge deadline cannot execute | `non-blocking-bridge` is mandatory and the host is an explicit trusted integration boundary; real execution must occur in an externally supervised host |
| Timed-out host continues after Forge moves on | Late writes or surviving processes could corrupt evidence | Forge aborts, requires bounded cancel acknowledgement and settled execution, and otherwise fails the run before report/seal publication |
| Diff verifier checks mutable or unrelated data | A pass would not support the captured change | Host receives retained patch/base handles bound to target digests; B07 verifies the patch before and after execution and B04 rechecks final workspace |
| Result contradicts its raw observation | Failure could be rewritten as pass | B05 v3 parses the retained observation and re-derives result/event semantics under the Envelope and outer seal |
| A failing verifier member is deleted wholesale | The remaining passing subset could hide a recorded failure | Seal v3 binds the runtime's ordered member manifest and requires exact per-arm evidence/final-ref coverage |
| B07 invalidates historical B06 groups | Legitimate v2 evidence could be quarantined | New groups use v3; v1/v2 are accepted under their original contracts and receive no B07 claim |
| Valid verifier pass is mistaken for objective completion | Partial or irrelevant evidence could produce a false success claim | B07 exposes scoped verifier facts only; B08 owns sufficiency, safety, and objective outcome |
| Same-user store owner rewrites the whole unauthenticated chain | Digest-only integrity can be reauthored by an actor controlling every file | No remote authenticity is claimed; immutable storage or an external signed trust anchor is required for that threat model |

## Verification

- TDD public seam: `node --test tests/effectiveness-verifier.test.mjs` → exit 0; command pass/fail/missing/timeout, hidden pass/fail/exception, diff pass/fail/invalid observation, source-level rejection, strict result/observation parsing, supervised cancellation, missing cleanup acknowledgement, retained-input mutation, JSON bounds, and host-guarantee validation passed.
- B04/B05/B06 focused integration: `node --test tests/effectiveness-verifier.test.mjs tests/evidence-envelope.test.mjs tests/effectiveness-runner.test.mjs tests/effectiveness-experiment.test.mjs` → exit 0; 85 passed, 0 failed.
- Integration regressions include model claim success with verifier failure, verifier workspace mutation, first-publication Envelope binding, refreshed report digest tamper, missing observation, fully refreshed pass-result/failed-observation contradiction, mandatory v3 verifier Envelope, and v1/v2 compatibility.
- `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
- Independent Spec review initially found silent seal-v2 tightening, optional verifier Envelope refs, missing observation/result semantic cross-check, and removable failing verifier members. `64016a9` introduces seal v3, preserves v1/v2, requires every v3 verifier Envelope, and re-derives result semantics from retained observation; `1aaeedd` binds the complete ordered membership and exact per-arm refs. Final Spec review reported no remaining P0–P2 findings.
- Independent Standards review initially found incomplete hostile-code guarantees, unlimited bridge await, no retained diff/base handle, missing observation parsing, weak command status invariants, inconsistent object size limits, path-only base checks, post-write observation limits, and unbounded-memory diff hashing. `64016a9` adds the complete external-host contract, supervised cancellation, input handles, strict observation derivation, status invariants, and uniform JSON bounds; `559e212` adds streamed diff hashing, base-content manifests, and pre-retain combined-document validation. Final Standards review reported no remaining P0–P2 findings.
- Final repository gates:
  - Node 24.14.0: `npm test` → exit 0; 243 passed, 0 failed.
  - Node 24.14.0: `npm run validate`, `npm run eval:skills`, `npm run eval:effectiveness`, and `npm run metrics:chars` → exit 0; 27 Skills at version `0.52.0`, 23-case compliance contract, 6 held-out effectiveness contract cases with 2 repeats, default chain 4,433 chars, all Skill files 55,373 chars.
  - Node 22.22.3: `npm test` → exit 0; 243 passed, 0 failed.
  - Node 22.22.3: the same four validation/evaluation/footprint commands → exit 0 with identical contract, version, and footprint results.
- Not verified:
  - No real Codex/model four-arm benchmark, production provider, or audited external verifier host was run.
  - Required host guarantees are contract declarations; this repository cannot prove an injected host enforced them.
  - No B08 outcome evaluator or B09 paired analysis was run; no objective-completion or Forge-effectiveness claim is made.
  - External host identity and the evidence store are not cryptographically authenticated.
  - Windows hostile-code, cancellation, and retained-path behavior were not tested.

## Rollback

- Revert this Change Unit commit, `559e212`, `1aaeedd`, `64016a9`, `3174fe1`, `faf6aba`, and `24eac9d` together.
- Preserve any `.incomplete-*` groups needed for diagnosis. B07 v3 groups can be removed and rerun after rollback; do not relabel them as v2.
- Historical v1/v2 groups require no migration or rollback.
- No dependency, registry publication, package/plugin version change, data migration, or external write requires rollback.

## Docs To Sync

- [x] `docs/project.md` — PD17 records external host, supervision, evidence, seal-version, and B08 boundaries.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC13/FD13 record behavior, non-goals, compatibility, and verification.
- [x] `evals/effectiveness-suite/README.md` — public API, host contract, result/observation semantics, B04/B05 integration, and non-claims.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- A model success claim and a verifier failure can coexist without the model claim replacing the verifier fact.
- Every v3 verifier fact is traceable through result, raw host observation, event, Evidence Envelope, workspace/diff target, and outer group seal.
- Test/build/typecheck, hidden assertions, and captured-diff checks share one external contract and failure taxonomy while leaving model action selection unconstrained.
- B07 is complete as an external verification and retained-fact layer. B08 remains responsible for unmet-goal evaluation and objective outcome.
