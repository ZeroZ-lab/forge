# CU-20260714-fe-artifact-history-ownership

## Type

- Methodology contract

## Intent

- Trigger: Forge Next A05 / GitHub #5 found that `fe-artifact` supported direct and child invocation but did not assign Change Unit ownership.
- Goal: Define standalone and child history behavior so a frontend mutation produces one top-level Change Unit instead of zero or duplicates.
- Out of scope: Runtime invocation-mode flags, codegen caller changes, exact-CU-count benchmark oracles, and fe-artifact evidence/preview cleanup (A06).

## Behavior Change

- `fe-artifact` now imports the shared history-maintenance contract.
- An invocation without an explicit parent owner defaults to standalone and writes one Change Unit after a completed mutation.
- A child invocation returns changed files, decisions, risks, and verification evidence but does not write its own Change Unit; the orchestrator owns the consolidated record.
- Blocking before mutation produces no Change Unit; blocking after mutation preserves partial-change, unverified, and rollback evidence through the standalone caller or orchestrator.

## Affected Surface

- Published `fe-artifact` execution protocol.
- History-aware validator coverage.
- Skill contract regression tests.
- No source-code generator, runtime state, manifest, or version change.

## Decisions

- Treat `child` as an invocation with an explicit orchestrator that owns final completion and history; otherwise use standalone semantics.
- Keep cross-skill ownership in the shared history contract and the main skill rather than duplicating it in the frontend protocol reference.
- Do not modify `codegen` until a reciprocal runtime caller contract exists; this avoids implying an orchestrator that the current implementation does not provide.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Invocation mode is still interpreted from context rather than a runtime flag | A model could misclassify ownership | Default-to-standalone avoids silently losing history; C04 will introduce structured ChangeReceipt semantics |
| Existing evaluator checks only CU presence | Duplicate CU behavior is not behaviorally proven | Static contract test prevents protocol regression; later outcome/runtime evaluators must attest exact ownership |
| Added skill text increases published footprint | Context cost rises | Default-chain footprint is unchanged; full published footprint remains under its existing gate |

## Verification

- Red-capable evidence:
  - `node --test tests/skill-eval-alignment.test.mjs` initially failed because `fe-artifact` had no standalone/child ownership language.
  - `node scripts/validate.mjs` initially failed because `fe-artifact` did not reference the shared history module.
- Commands and results:
  - `node --test tests/skill-eval-alignment.test.mjs` → exit 0; 4 tests passed.
  - `node scripts/validate.mjs` → exit 0; `Forge validation passed (27 skills, version 0.52.0).`
  - `node --test 'tests/*.test.mjs'` → exit 0; 99 tests passed, 0 failed.
  - `node scripts/evaluate-skills.mjs` → exit 0; benchmark contract passed for 23 cases and 27 skills; no behavioral-effectiveness claim.
  - `node scripts/measure-char-footprint.mjs` → exit 0; default chain 4,433 chars, all SKILL.md files 54,742 chars.
- Not verified: Real model executions producing exactly one CU in both modes; the current suite has no reliable ownership/count oracle. C04 and the runtime evidence work must close this gap before claiming runtime enforcement.

## Rollback

- Remove `fe-artifact` from the history-aware validator list, remove its invocation-mode contract and regression test, then remove this CU.
- Safe stop: if a caller cannot identify an explicit parent history owner, execute as standalone rather than dropping mutation evidence.

## Docs To Sync

- [x] `docs/project.md` — no new decision; existing Orchestrator and Change Unit definitions already own this rule.
- [x] `fe-artifact` main skill — synchronized with shared history-maintenance.
- [x] Protocol reference — unchanged; it remains frontend implementation detail, not history ownership.

## Completion Evidence

- Validator coverage now treats `fe-artifact` as a history-aware mutator.
- A public skill-contract test distinguishes standalone, child, pre-mutation block, and post-mutation block behavior.
- The default runtime-chain footprint is unchanged and the full published footprint remains within the existing limit.
