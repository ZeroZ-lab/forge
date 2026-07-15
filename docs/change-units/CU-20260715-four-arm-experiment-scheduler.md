# CU-20260715-four-arm-experiment-scheduler

## Type

- Controlled four-arm effectiveness experiment scheduling

## Intent

- Trigger: Forge Next B05 / [GitHub #17](https://github.com/ZeroZ-lab/forge/issues/17) required one controlled fixture to run as `no-forge`, `kernel-only`, `adaptive-full`, and `legacy-chain` under the same model and resource conditions.
- Goal: Make capability exposure the declared experiment variable while preserving the stronger model's option to act directly or use zero Skills, rejecting silent model fallback, and retaining reviewable evidence for every arm.
- Out of scope: Running a real Codex benchmark, bundling a hostile-code sandbox, authenticating external provider claims, independent evidence envelopes, verifier outcomes, statistical conclusions, version changes, publication, push, and issue closure.

## Source Baseline

- Implementation commits: `4e4cabd`, `0fa808a`, and `8d2588f` on `codex/forge-next`.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`.
- Evidence completed on 2026-07-15 UTC.

## Behavior Change

- Effectiveness manifest v4 now declares exactly four ordered arms: autonomous `no-forge`, Kernel v1 `kernel-only`, current published-tree `adaptive-full`, and pinned Forge `0.52.0` `legacy-chain` with tree `516a67e49c8c5e564be1671396bad6edadaef4f2` and `detail → codegen → review`.
- `createEffectivenessExperimentPlan` derives arm and capability-policy digests from trusted repository facts. Common capability kinds are contract-limited, cannot enter the reserved `forge:` namespace, and use locale-independent ordering.
- `runEffectivenessComparisonGroup` recomputes the trusted plan, requires an explicit requested model, and fixes execution to the B04 isolated runner; caller-provided `runAttempt` replacements are rejected before model resolution or evidence writes.
- All arms receive one canonical common context for objective, fixture, source, repeat/seed, budget, limits, verifier set, requested model, parameters, and host policy. Each receives a separate scheduler-owned arm definition and capability context. Both are injected into the actual command environment and bound into B04's configuration fingerprint.
- Preflight model mismatch is retained as four unavailable `no_output` reports without launching a fallback. For executed attempts, `actual` comes from one process-emitted runtime transport receipt in B04-retained stdout and must exactly match the full selected identity, including revision; mismatch stops later arms immediately.
- A versioned host adapter must declare filesystem, network, detached-process, live CPU, memory, and disk guarantees. All four handles are prepared before the first run, share one policy digest, and remain under unified cleanup ownership.
- Every arm handed to B04 is host-finalized even when runner preflight, report adaptation, runtime receipt, or identity validation fails. Host receipts accept only five fixed audit fields, bind available runner/common/arm digests, and are persisted without arbitrary adapter diagnostics.
- Runtime and host-enforcement receipts are written per arm and referenced by the group seal. Evidence/source physical overlap is rejected before mutation. Attempts run in private staging; after all reports, fairness checks, and cleanup pass, `group.json` is written there and the complete directory is atomically published.
- Failed groups are quarantined as unsealed `.incomplete-*` evidence and can reuse the intended group id after correction. Historical final directories without a valid seal are safely quarantined; symlinks and non-directories are treated as collisions rather than followed.
- Adaptive attempts with zero `capability_activation` events remain valid. Legacy launcher metadata must attest the pinned baseline, while the actual adapter remains responsible for materializing and using it.

## Decisions

- Keep the four arm definitions explicit and mutually exclusive; do not map the old ambiguous `forge` arm to adaptive or legacy behavior.
- Bind common controls to the launched process, not only to report fields, so reports cannot create fairness after the fact.
- Treat the process transport receipt as stronger than a provider callback but not as remote-provider authentication. Provider and host adapters remain named trust boundaries until B06/B07.
- Require complete runtime identity equality with the preflight selection. Omitting a revision in the request does not permit different revisions across arms.
- Fix the production scheduler to B04. An injectable public runner seam would let callers seal in-memory objects without formal reports.
- Make `group.json` the sole completion marker and publish it with the staging directory only after host cleanup. Individual accepted reports do not constitute a complete comparison.
- Require an external sandbox adapter instead of presenting process groups, `ulimit`, workspace cloning, or deprecated macOS `sandbox-exec` as complete hostile-code containment.

## Affected Surface

- Contract: `evals/effectiveness-suite/manifest.json`, report samples, and `scripts/lib/effectiveness-contract.mjs`.
- Scheduler: `scripts/lib/effectiveness-experiment.mjs`.
- Tests: experiment, effectiveness contract/report, runner integration, and suite contract tests.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill text, default invocation flow, dependency, lockfile, package/plugin version, or release artifact changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A model adapter echoes scheduler context instead of reporting real provider behavior | A structurally valid transport receipt can misstate the remote model or capability configuration | Raw transport evidence and digests are retained; docs keep the adapter as an explicit trust boundary; B06/B07 must add external evidence and verification before any effectiveness claim |
| A host adapter declares guarantees it does not enforce | Launcher code can escape process/resource boundaries | Scheduler fails closed on missing policy/receipt fields, but production runs still require an independently audited container, microVM, or equivalent host |
| Legacy metadata is attested but the adapter does not materialize the pinned tree | `legacy-chain` would not be a real historical control | Pin and bind version/tree/default chain; require provider/host implementation review and external evidence before treating the arm as empirical legacy behavior |
| B04 process groups miss a deliberately detached descendant or platform-specific permission state | A child can outlive the local runner | B05 requires detached-process containment from the external host; a prior orphan fixture process was explicitly located and killed, and no repository claim relies on B04 alone as a sandbox |
| Crash or storage failure interrupts group publication | Partial evidence may be mistaken for a complete comparison | Consumer requires a valid seal; staging/failed groups remain unsealed, and an unsealed final residue is quarantined before retry |
| A stronger model needs no Forge capability | A fixed chain could suppress model progress or bias the result | `no-forge` remains autonomous and `adaptive-full` permits zero Skill activation; actions are model-selected rather than stage-routed |

## Verification

- Focused final, Node 24: `node --test tests/effectiveness-experiment.test.mjs` → exit 0; 24 passed, 0 failed.
- Effectiveness integration, Node 24: `node --test tests/effectiveness-suite.test.mjs tests/effectiveness-report-contract.test.mjs tests/effectiveness-report.test.mjs tests/effectiveness-runner.test.mjs tests/effectiveness-experiment.test.mjs` → exit 0.
- Independent adversarial, contract, and code-quality reviews found and drove fixes for provider self-attestation, cross-arm revision drift, continued fallback spending, non-durable receipts, overlap mutation, cleanup/seal ordering, public runner replacement, abnormal host finalization, handle leakage, locale-dependent digests, and symlink recovery. Final adversarial and acceptance reviews reported no remaining P0–P2 finding.
- `git diff --check` and `node --check scripts/lib/effectiveness-experiment.mjs` passed before the final documentation commit.
- Final repository gates:
  - Node 24: `npm test` → exit 0; 213 passed, 0 failed.
  - Node 24: `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - Node 24: `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats; no produced-report or real-world-effectiveness claim.
  - Node 24: `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - Node 24: `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
  - Node 22: `npm run check:supported` → exit 0; 213 tests, validator, and 23-case skills-suite contract passed.
  - Node 22: `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats.
- Not verified:
  - No real Codex/model four-arm benchmark or empirical Forge comparison was run.
  - No production model provider or hostile-code host sandbox adapter exists in this repository; tests use protocol doubles.
  - Transport and host receipts are not externally authenticated Evidence Envelopes.
  - The legacy tree was pinned and context-bound but not materialized in a real provider run.
  - B06 Evidence Envelopes, B07 independent verifier, B08 outcome hard gates, and B09 paired statistics remain unimplemented.

## Rollback

- Revert this Change Unit commit, `8d2588f`, `0fa808a`, and `4e4cabd` together.
- Preserve any `.incomplete-*` directory needed for diagnosis; remove it only after confirming its comparison id and retained receipts.
- No data migration, dependency, registry publication, version change, or external write requires rollback.

## Docs To Sync

- [x] `docs/project.md` — PD15 records the four-arm, model, B04, receipt, host, and seal boundaries.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC11 and FD9–FD11 record behavior, non-goals, and trust limits.
- [x] `evals/effectiveness-suite/README.md` — public scheduler contract, launch contexts, model handling, host requirements, evidence lifecycle, and non-claims.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- One deterministic fixture exercises all four arms with the same common controls, separate workspaces, exact declared capability policies, durable receipts, and one completion seal.
- Preflight and runtime fallback paths are visible and fail closed; adaptive zero-Skill behavior is accepted; legacy metadata is pinned without being overstated as empirical behavior.
- B05 is complete as a controlled scheduling seam. B06 remains the next roadmap task and must authenticate retained evidence rather than changing model action selection.
