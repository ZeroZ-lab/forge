# CU-20260714-effectiveness-report-runtime

## Type

- Evaluation report runtime and validation boundary

## Intent

- Trigger: Forge Next B03 / [GitHub #13](https://github.com/ZeroZ-lab/forge/issues/13) required one production construction/parsing path for the B02 effectiveness report contract.
- Goal: Accept only current, plan-bound, internally consistent effectiveness reports and return field-addressed diagnostics for invalid input.
- Out of scope: Benchmark execution, evidence-locator access, producer authentication, digest recomputation, evidence sufficiency, outcome scoring, paired statistics, package-version changes, publication, and push.

## Source Baseline

- Implementation commit: `2c935159b2d1464ce6ba0eae6414db0c71d12dea` on `codex/forge-next`.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`; npm `11.4.2`.
- Evidence completed at `2026-07-14T16:04:17Z` UTC.

## Behavior Change

- Added the production API `createEffectivenessReport`, `parseEffectivenessReport`, and `EffectivenessReportError`. Constructor and parser share one private acceptance pipeline; no schema-only production shortcut is exported.
- The constructor owns `schema_version`, `contract`, and a deterministic report id derived from comparison group, arm, and repeat. It rejects caller-supplied owned fields and only defaults semantically empty final-result reference arrays.
- Both entry points require a separate trusted experiment plan. The plan must define every manifest arm and binds the selected arm's definition digest and complete capability policy, preventing a report from authorizing its own arm or capability exposure.
- Current-family reports pass a fail-closed JSON Schema subset implementation. Unsupported keywords, invalid keyword operands, unsupported formats/types, unresolved references, and evaluation cycles are rejected while loading the contract.
- Accepted reports must have a consistent objective/event/evidence/final-result graph: unique ordered events and evidence ids, reciprocal event/evidence links, existing final references, correct evidence source kinds, and activations limited to plan-exposed capabilities.
- Parser diagnostics use bounded, JSON-safe `issues[]` entries with JSON Pointer paths. Malformed JSON, BigInt/non-JSON scalars, sparse or custom-property arrays, and extremely large sparse arrays cannot escape as raw runtime errors or force linear traversal.
- Report ids and controlled plan fields are checked without rewriting parsed reports. Legacy skills-suite v2 receives an explicit rerun-required incompatibility; future effectiveness versions receive an unsupported-version diagnostic.
- Contract tests now reuse the production schema validator instead of maintaining a second test-side interpreter.

## Decisions

- Keep the trusted experiment plan outside the report. A self-contained report cannot be trusted to prove which arm or capability policy the experiment actually assigned.
- Keep construction conservative: do not infer timestamps, model identity, digests, evidence sources, or other observed facts.
- Implement only the JSON Schema vocabulary used by the checked-in contract and fail closed on schema evolution. This avoids a silent partial-validator path while retaining a dependency-free runtime.
- Validate report-local reference integrity in B03, but leave locator authenticity, producer identity, digest verification, freshness, and evidence sufficiency to B06/B08.
- Treat `comparison_group_id` uniqueness and cross-report pairing consistency as runner/evaluator responsibilities; a single-report parser cannot prove global experiment properties.

## Affected Surface

- Runtime: `scripts/lib/effectiveness-report.mjs` and `scripts/lib/json-schema-subset.mjs`.
- Contract loading: `scripts/lib/effectiveness-contract.mjs`.
- Corpus and tests: effectiveness report samples, `tests/effectiveness-report.test.mjs`, and `tests/effectiveness-report-contract.test.mjs`.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill, default invocation flow, package/plugin manifest, dependency, lockfile, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A custom schema extension is outside the supported vocabulary | Runtime rejects a newly edited contract | Extend the validator and focused tests atomically before changing the schema |
| A structurally valid locator or digest can still be false | Consumers could overstate evidence trust | B03 explicitly does not authenticate evidence; B06 must validate envelopes and content |
| A valid single report may belong to an invalid comparison group | Pairing or attribution could be wrong | B04/B05 own run isolation and plan production; B08/B09 own cross-report gates |
| Strict mandatory plan context breaks ad hoc report parsing | Existing callers must provide controlled-arm facts | Failure is explicit at `/experiment_plan`; README documents the required API |
| Local validator behavior could drift from Draft 2020-12 | Reports could differ across validators | Fail-closed keyword inspection, contract mutation tests, and independent Ajv differential review cover the active vocabulary |

## Verification

- Red-capable evidence: focused tests were observed failing before each implementation for missing runtime entry points, false conditional schemas, invalid schema operands, reference cycles, coarse `oneOf` paths, absent trusted plans, arm/policy self-authorization, report-id mismatch, non-JSON diagnostics, sparse arrays, and Unicode code-point length.
- Focused final: `node --test tests/effectiveness-report.test.mjs tests/effectiveness-report-contract.test.mjs` → exit 0; 22 passed, 0 failed.
- Node 24 (`v24.14.0`, npm `11.4.2`):
  - `npm test` → exit 0; 157 passed, 0 failed.
  - `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats, report contract v1 registered; no produced-report or real-world-effectiveness claim.
  - `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
- Node 22 (`v22.22.3`, npm `11.4.2`):
  - `npm run check:supported` → exit 0; 157 tests, validator, and 23-case skills-suite contract passed.
  - `npm run eval:effectiveness` → exit 0; 6 cases, 6 scenarios, 2 repeats, report contract v1 registered.
- Independent schema differential: a pinned Ajv 8.20 plus `ajv-formats` comparison exercised 1,833 single-point report mutants; no runtime-only acceptance was found. The only initial difference, proleptic year `0000`, was corrected and regression-tested.
- Two independent read-only review paths confirmed closure of schema operand fail-open, boolean condition, cyclic ref, plan-binding, error-path, JSON-safety, sparse-array, report-id, and capability-policy seams; final review found no remaining P0/P1/P2.
- `git diff --check` and `git diff --cached --check` → exit 0 before the implementation commit.
- Not verified:
  - No real benchmark attempt has produced a report through an isolated runner.
  - The experiment-plan producer does not exist until B04/B05 integration.
  - Evidence envelopes, locator contents, producers, digests, freshness, sufficiency, evaluator hard gates, and paired statistics remain unverified.
  - No empirical Forge benefit or non-interference claim is made.

## Rollback

- Revert implementation commit `2c935159b2d1464ce6ba0eae6414db0c71d12dea` and this Change Unit commit together.
- No data migration, registry publication, dependency, version change, or external state requires rollback.
- Safe stop: do not let B04 persist a report when constructor/parser acceptance or trusted-plan creation fails.

## Docs To Sync

- [x] `docs/project.md` — PD13 records the single plan-bound acceptance seam.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC9 and FD7 record the runtime contract and B03/B06/B08 boundary.
- [x] `evals/effectiveness-suite/README.md` — production API, mandatory plan, diagnostics, and non-claims.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- Implementation commit `2c93515` contains the complete B03 runtime, shared fail-closed schema validator, documentation, samples, and regression tests.
- A caller cannot use the supported API to self-authorize an unknown arm, alter the assigned capability policy, inject constructor-owned identity fields, or retain dangling/mistyped internal evidence references.
- Every rejection remains field-addressable and JSON-safe, while evidence truth and outcome quality remain explicitly outside this layer.
- B04 is unblocked to execute isolated attempts and construct accepted reports from observed facts.
