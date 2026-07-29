# CU-20260729-adaptive-kernel-runtime

## Type

- Methodology / Runtime contract / Compatibility migration

## Intent

- Trigger: Stronger models should not be forced through Forge 0.52.0's fixed lifecycle chain when direct action or a smaller capability set is sufficient.
- Goal: Make Kernel-first adaptive execution the production contract while retaining every published Skill and the pinned `detail → codegen → review` legacy compatibility path.
- Out of scope: B08 outcome-evaluator implementation, B09 paired statistics, model ranking, real-world effectiveness claims, package/plugin version changes, publication, and deletion of legacy Skills.

## Behavior Change

- The always-on Kernel now owns only objective, authority, scope, state, evidence, and outcome constraints. It cannot prescribe or score lifecycle stages, Skill activation/order, action path, implementation strategy, internal reasoning, or model capability by name.
- Direct action and zero Skill are first-class. Skills are optional capabilities loaded only when their marginal value exceeds context, artifact, and coordination cost; one Skill does not imply a successor.
- The root agent is the single Chain Owner for one user objective. Child Skills return local evidence and advisory next actions; the Chain Owner integrates state, owns review independence, and writes one consolidated Change Unit.
- Verification remains mandatory. L0/L1 may use a disclosed self-check; L2/L3 or P0/P1 require an independent reviewer/verifier before complete or release-ready. Missing independent capacity leaves the task partial or correctly blocked.
- `detail`, `codegen`, `review`, `guide`, orchestration Skills, metadata, init output, and project docs now express adaptive use/skip/no-op and no-successor boundaries.
- The Skills Suite is explicitly a legacy capability compliance harness. Its former `default-chain-small-feature` case is now `legacy-chain-small-feature` and requires explicit selection of the 0.52.0 compatibility preset.
- Runtime footprint gates now measure the generated Kernel template, current project AGENTS adapter, registry/platform metadata, largest selected Skill body, recursively linked capability bundle, and total packaged Skill bodies. The fixed three-Skill chain remains a reported legacy reference only.

## Decisions

- Keep Kernel outside the Skill registry so it cannot be skipped, compete for activation, or become another mandatory prompt layer.
- Preserve implicit capability discovery but remove implicit lifecycle cascade and generic metadata triggers.
- Preserve the exact legacy chain for explicit compatibility and existing effectiveness `legacy-chain` controls; do not silently reinterpret historical evidence as adaptive behavior.
- Keep Skills Suite routing checks as capability regression signals only. Action-neutral effectiveness outcomes remain the only place to compare direct, adaptive, kernel-only, and legacy arms.
- Treat plugin-only installations without always-loaded project/host instructions as best-effort; do not claim host-level enforcement they cannot provide.

## Affected Surface

- Production contract: root `AGENTS.md`, init-generated AGENTS template, shared adaptive/runtime/evidence/delegation/history policies.
- Published capabilities: core implementation/review/detail/guide and orchestration metadata/successor boundaries.
- Entry metadata: Claude/Codex plugin manifests and marketplaces.
- Compatibility evaluation: Skills Suite manifest, fixtures, benchmark prompt positioning, docs, and alignment tests.
- Tooling: Chain Owner ownership helper, adaptive footprint measurement, repository validator, package allowlist.
- Documentation: project decisions, README, advanced/invocation/usage/evaluation/architecture guidance.
- Tests: adaptive runtime content contract, Change Unit ownership, suite routing/metrics/package alignment.
- Existing B08 effectiveness files and `CU-20260715-effectiveness-outcome-evaluator.md` remain a separate uncommitted change unit and are not owned by this CU.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Weaker models skip a useful capability | Missing domain constraints or weaker verification | Keep precise implicit discovery signals and an explicit legacy preset; evaluate by model/scenario before making effectiveness claims |
| Skill-only installation lacks always-on Kernel | Direct action can bypass Forge discipline | Generate project AGENTS through init and disclose best-effort host boundary in plugin metadata/docs |
| Compatibility suite is mistaken for production routing | Users optimize for Skill activation instead of task outcome | Rename/reposition the fixed-chain case and suite; keep action-path telemetry outside effectiveness outcome |
| Relaxed routine review leaks into high-risk work | Safety or correctness regression | Preserve L2/L3 and P0/P1 independent review as a hard completion gate |
| Multiple capabilities write duplicate history | Conflicting state and Change Units | Single Chain Owner contract plus executable ownership tests |
| More adaptive freedom becomes an unverified quality claim | Misleading release decision | This CU claims contract migration and regression safety only; real multi-run effectiveness remains unverified |

## Verification

- `npm test` → exit 0; `271` tests passed, `0` failed.
- `npm run validate` → exit 0; `Forge validation passed (27 skills, version 0.53.0)`.
- `npm run eval:skills` → exit 0; contract passed for `23` cases and `27` Skills; no behavioral effectiveness claimed.
- `npm run eval:effectiveness` → exit 0; contract passed for `6` held-out cases and `6` scenarios with `2` repeats required; no real run report supplied.
- `npm run metrics:chars` → exit 0:
  - generated AGENTS Kernel template: `2204 / 3000` characters;
  - current project AGENTS adapter: `4986 / 6000` characters;
  - initial registry metadata: `7089 / 8500` characters;
  - platform Skill metadata adapters: `776 / 1500` characters;
  - largest selected Skill body: `fe-artifact`, `3895 / 4000` characters;
  - largest recursively linked capability bundle: `improve`, `19017 / 20000` characters;
  - all `SKILL.md`: `54205 / 56000` characters;
  - legacy `detail -> codegen -> review`: `5455` characters, reference only.
- `npm run check:package` → exit 0; `87` files match `87` allowlisted files, no missing/unexpected targets.
- `git diff --check` → exit 0.
- Not verified: Real Codex/Claude multi-run adaptive-vs-kernel-only/legacy effectiveness, model-specific quality uplift, and plugin-host always-on behavior outside generated project instructions.

## Rollback

- Revert the B10 runtime contract, docs, Skills Suite rename/routing updates, validator/metrics/ownership changes, tests, and this Change Unit together.
- Restore `default-chain-small-feature` only as a legacy compatibility case if consumers depend on the old id; do not restore it as the production default.
- No data migration, dependency, lockfile, external publication, production deployment, or user data rollback is required.
- Do not revert or combine the separate B08 outcome-evaluator working changes.

## Docs To Sync

- [x] `docs/features/adaptive-kernel-runtime/goal.md`
- [x] `docs/project.md` — PD1/PD9/PD19 and runtime terminology
- [x] Root and generated `AGENTS.md` Kernel contracts
- [x] README, advanced, invocation, usage, architecture, and evaluation docs
- [x] Plugin and marketplace entry metadata
- [x] Skills Suite manifest, fixtures, README, and evaluation guide
- [x] B08 effectiveness contract and historical 0.52.0 baseline intentionally preserved

## Completion Evidence

- Production completion is action-path neutral: direct, optional Skill, multiple Skill, and zero Skill paths are legal under the same objective/evidence constraints.
- Fixed lifecycle behavior remains executable only when explicitly selected, and the effectiveness `legacy-chain` baseline remains pinned.
- High-risk completion cannot downgrade independent review to a same-context self-check.
- Chain Owner tests cover direct, standalone, child, no-mutation, partial, blocked, and invalid ownership states.
- All repository, evaluation-contract, footprint, package, and whitespace gates passed after the final implementation changes.
- Residual risk: Behavioral superiority is deliberately unclaimed until independent multi-run effectiveness evidence exists.
