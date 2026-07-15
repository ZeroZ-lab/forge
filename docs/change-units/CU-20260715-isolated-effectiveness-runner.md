# CU-20260715-isolated-effectiveness-runner

## Type

- Isolated benchmark execution and evidence capture runtime

## Intent

- Trigger: Forge Next B04 / [GitHub #15](https://github.com/ZeroZ-lab/forge/issues/15) required repeatable benchmark attempts in isolated workspaces with reviewable command, diff, event, and artifact evidence.
- Goal: Execute one caller-selected model × arm × fixture × repeat attempt without sharing mutable workspace state or letting runner-owned facts flow back from model self-report.
- Out of scope: Selecting the four B05 arms or model, hostile-code host containment, Evidence Envelopes, independent verification, outcome scoring, empirical effectiveness claims, version changes, publication, push, and issue closure.

## Source Baseline

- Implementation commits: `d036b81` and review-hardening commit `1b14a20` on `codex/forge-next`.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`; npm `11.4.2`.
- Evidence completed at `2026-07-15T00:19:18Z` UTC.

## Behavior Change

- Added `runIsolatedEffectivenessAttempt(spec)` and `EffectivenessRunnerError` in `scripts/lib/effectiveness-runner.mjs`.
- Every launched attempt uses fresh shallow non-local workspace and private capture clones plus isolated HOME/CODEX_HOME/TMP/XDG paths. Source/evidence paths are rejected from command files, arguments, environment, and PATH.
- B05 supplies a neutral `armId`; B04 binds it to the trusted plan before launch, fingerprints its definition and capability policy, records it in the receipt, does not expose it to the child, and rejects adapter relabeling.
- The runner binds clean source revision/tree, launcher definition, executable bytes, redacted arguments and effective environment, capture limits, and arm policy into a stable configuration digest.
- POSIX process-group execution distinguishes completion, process error, timeout, cancellation, output limit, capture failure, source-guard failure, cleanup failure, and report rejection. Process timing remains separate from full attempt timing and task claims.
- Retained evidence includes runner lifecycle events, command facts, bounded eligible streams, attempt receipt, complete artifact manifest, and a pinned-base binary diff when capture succeeds. Ignored/untracked files, empty directories, command-created commits, and nested repository artifacts cannot hide final content.
- Source guards cover HEAD/tree/refs/index and the complete non-`.git` worktree including ignored files before and after the attempt. External changes invalidate the attempt but are not destructively rolled back.
- Configured credential literals are checked in source, output, workspace, persistent metadata, and adapter input. Secret-bearing or unverifiably truncated streams are not promoted into retained evidence.
- Temporary capsules are removed before report construction. Cleanup failure becomes `infrastructure_error` and records the remaining capsule path for caller recovery.
- Runner artifacts are rechecked as regular in-root files with matching size/digest before the sole B03 constructor publishes `report.json` atomically. B04 does not claim B06 evidence validity or B07/B08 verifier outcomes.

## Decisions

- Use independent clones instead of `git worktree`; shared Git metadata would couple concurrent attempts and let child commits hide deltas.
- Keep arm selection outside B04. The runner freezes a preselected neutral id but contains no four-arm or model scheduling policy.
- Treat `maxCapturedWorkspace*` and diff/output bounds as capture ceilings, not live disk/CPU/memory/network quotas. B05 must provide the host sandbox.
- Detect but never automatically revert source changes because the runner cannot prove they are not concurrent user work.
- Retain raw receipt evidence when formal report construction fails; never describe a partial bundle as an accepted report.
- Centralize fixed Git isolation policy so execution environment, reserved variables, and configuration fingerprint cannot drift independently.

## Affected Surface

- Runtime: `scripts/lib/effectiveness-runner.mjs`.
- Tests: `tests/effectiveness-runner.test.mjs` with 31 public-seam scenarios.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill, default invocation flow, dependency, lockfile, package/plugin manifest, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A child escapes its POSIX process group or scans the host filesystem | It can outlive cancellation or reach source/credentials | B05 must supply hostile-code sandboxing, live resource quotas, network policy, and detached-process containment |
| Capture ceiling is mistaken for a live quota | Process can consume resources before final capture | Field names and docs state capture semantics; B05 owns live enforcement |
| Source changes during an attempt | Comparison input is no longer controlled | Full source guard invalidates the attempt; no destructive auto-rollback |
| Credential is encoded or transformed | Literal scanner may not identify it | Caller sandbox and secret-minimized launcher remain required |
| Capsule cleanup fails | Temporary workspace remains on disk | Receipt records `capsule_removed: false`, error, and recovery path |
| Host/platform behavior differs | POSIX process-group guarantees may not hold | Node 22/24 are tested on Darwin; Windows job-object support remains unimplemented |

## Verification

- Focused final, Node 24: `node --test tests/effectiveness-runner.test.mjs` → exit 0; 31 passed, 0 failed.
- Focused final, Node 22: `node --test tests/effectiveness-runner.test.mjs` → exit 0; 31 passed, 0 failed.
- Node 24 (`v24.14.0`):
  - Serial `npm test` → exit 0; 188 passed, 0 failed.
  - `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats; no produced-report or real-world-effectiveness claim.
  - `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
- Node 22 (`v22.22.3`):
  - `npm run check:supported` → exit 0; 188 tests, validator, and 23-case skills-suite contract passed.
  - `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats.
- Sequential and concurrent attempt tests prove distinct workspaces, stable controlled fingerprints, complete retained evidence, and unchanged source under runner-owned operation.
- Standards/Spec review against `45f488b` found one Git-policy duplication smell and one ignored-source-change gap; both were corrected in `1b14a20`. Final Spec re-review reported no remaining finding.
- `git diff --check` and committed diff checks passed before implementation and hardening commits.
- Verification anomaly: when the complete Node 22 and Node 24 suites were deliberately launched concurrently, Node 24 reported one failure in the repo-local executable case while Node 22 passed. The same Node 24 case immediately passed alone and the canonical serial Node 24 suite then passed 188/188. Root cause was not established; no product concurrency claim relies on concurrent execution of two full test harnesses.
- Not verified:
  - No real Codex/model benchmark attempt was run; reports are fixture-backed runtime tests.
  - No live CPU, memory, disk, network, credential-broker, or detached-process sandbox exists until B05.
  - Windows process-tree containment is not implemented or tested.
  - Evidence Envelope authenticity, independent verifier behavior, outcome hard gates, paired statistics, and empirical Forge benefit remain B06–B09 work.

## Rollback

- Revert `1b14a20`, `d036b81`, and this Change Unit commit together.
- Remove any cleanup-failed capsule only by the exact path in its receipt after confirming it belongs to the attempt.
- No data migration, dependency, registry publication, version change, or external write requires rollback.

## Docs To Sync

- [x] `docs/project.md` — PD14 records attempt isolation, prelaunch arm binding, source guard, evidence, and cleanup boundaries.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC10, FD8, and risks record the B04 contract and B05–B08 boundaries.
- [x] `evals/effectiveness-suite/README.md` — public API, retained bundle, failure semantics, non-claims, and host-sandbox boundary.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- Implementation and hardening commits contain the B04 runner, public-seam tests, and synchronized authoritative facts.
- Repeated and concurrent attempts do not share mutable workspaces; runner-owned process, source, workspace, and evidence facts cannot be supplied by the adapter.
- B05 is unblocked to add the four controlled arms, model scheduling, launcher-definition production, and host sandbox without changing B04's neutral runner seam.
