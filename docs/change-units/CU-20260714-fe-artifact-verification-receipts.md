# CU-20260714-fe-artifact-verification-receipts

## Type

- Methodology and verification contract

## Intent

- Trigger: Forge Next A06 / GitHub #9 found that fe-artifact could imply completion from generated files or an available preview without a verifier result.
- Goal: Separate implementation, failed verification, successful verification, and downstream acceptance with a machine-testable result contract.
- Out of scope: Running a project-specific frontend verifier, changing fe-accept's acceptance rubric, or migrating unrelated skills that still carry legacy signal-route text.

## Behavior Change

- `fe-artifact` now reports exactly one implementation result: `implemented_unverified`, `verification_failed`, or `verified`.
- `verified` requires an actual verifier receipt with a named verifier, target, passed outcome, and non-empty evidence. A runnable preview is not a verification result.
- Failed verifier evidence is retained without erasing the implementation fact or claiming completion.
- Preview availability is an explicit, orthogonal pair of fields and cannot promote an implementation result.
- `accepted` is absent from this boundary and remains the responsibility of the independent fe-accept stage.
- The published protocol and executable policy return one flat canonical receipt; focused tests lock the no-verifier, failed, and passed transitions to that exact shape.
- The obsolete `frontmatter.signal_routes` reference is removed from fe-artifact and rejected by repository validation.

## Affected Surface

- Published fe-artifact responsibility, exit condition, result wording, and protocol receipt.
- Repository validation and focused state-machine tests.
- No frontend implementation, fe-accept rubric, other skill protocol, manifest, dependency, or package version change.

## Decisions

- Model observed facts rather than lifecycle optimism: retained files establish implemented; only an evidence-bearing passed verifier establishes verified.
- Keep verification target-specific. Build, test, browser, screenshot, or other verifiers are selected by the actual frontend surface rather than hard-coding preview as universal proof.
- Treat acceptance as a separate downstream judgment to avoid self-approval by the producer.
- Keep the executable receipt constructor independent from host tool names; skills consume the semantic receipt contract, not a provider-specific API.
- Avoid derived readiness booleans: `result` plus the evidence fields is the sole implementation/verification state.
- Limit stale signal-route removal to fe-artifact because this ticket changes that skill's completion protocol; repository-wide migration belongs to a separate compatibility task.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A caller fabricates an evidence string | A syntactically valid receipt may not be independently trustworthy | The contract requires an actual verifier; downstream review must inspect the referenced evidence |
| A verifier covers only part of the frontend surface | `verified` could be read too broadly | Every receipt names its target and retains unverified items in the published protocol |
| Result fields drift between prose and executable policy | Skills and tooling disagree | Focused tests compare exact canonical receipts and require every published field; validator markers preserve the critical contract |
| Other skills retain legacy route language | Repository protocols remain inconsistent | Explicitly out of scope; no global completion claim is made |

## Verification

- Red-capable evidence:
  - `node --test tests/fe-artifact-result.test.mjs` first failed because the receipt-policy module did not exist.
  - After the state logic passed, the published-protocol test remained red until the stale signal route and ambiguous completion wording were replaced.
  - Independent review found that the first classifier returned a second, nested camelCase shape and omitted preview/rollback fields. Canonical-receipt tests failed before the constructor and published table were aligned.
  - A second review reproduced sparse arrays bypassing `every()` validation; public-seam rejection tests failed until list slots were materialized before validation.
- Commands and results:
  - `node --test tests/fe-artifact-result.test.mjs` → exit 0; 5 tests passed across no-verifier, failed, passed, malformed receipt, and published-protocol cases.
  - `node scripts/validate.mjs` → exit 0; Forge validation passed for 27 skills at version 0.52.0.
  - Node 22.23.1 and Node 24.14.0 each ran the current full `npm run check:supported` worktree contract → exit 0; 119 tests, validator, and skills-suite contract passed on both.
- Not verified: Live frontend behavior or a real fe-accept handoff; this repository change defines and tests the protocol rather than implementing a sample application.

## Rollback

- Restore the prior fe-artifact text and protocol, remove `scripts/lib/fe-artifact-result.mjs` and its focused test, and remove the fe-artifact-specific validator assertions.
- Reopen #9 before any release that restores preview-based or evidence-free completion language; do not preserve a `verified` claim without its receipt requirements.

## Docs To Sync

- [x] `plugins/forge/skills/fe-artifact/SKILL.md` — responsibility, verification discipline, exits, three-state result, and conditional result prompt.
- [x] `plugins/forge/skills/fe-artifact/references/fe-artifact-protocol.md` — receipt fields and fact boundaries.
- [x] `docs/project.md` — unchanged; D7 already establishes evidence-proportional verification.

## Completion Evidence

- No-verifier and failed-verifier paths cannot claim verified, accepted, or complete, and must identify remaining uncertainty.
- Only a passed, evidence-bearing verifier receipt enables the `verified` state and fe-accept handoff.
- Preview availability remains observable without changing the implementation result.
- Published prose, executable policy, focused tests, and validator checks agree on one flat receipt and the three-state boundary.
