# CU-20260714-effectiveness-report-contract

## Type

- Evaluation data contract and compatibility policy

## Intent

- Trigger: Forge Next B02 / [GitHub #12](https://github.com/ZeroZ-lab/forge/issues/12) required every effectiveness attempt to preserve its model, experimental condition, workspace, observable actions, evidence sources, result, and cost.
- Goal: Establish one route-neutral, versioned report seam that later constructors, runners, evidence validators, outcome evaluators, and paired statistics can share.
- Out of scope: Production report construction/parsing, cross-reference validation, Evidence Envelope trust validation, benchmark execution, outcome scoring, paired statistics, package-version changes, publication, and push.

## Source Baseline

- Implementation commit: `a43aa2994b9e931821fa64bd0c0779ddadd5bce9` on `codex/forge-next`.
- The worktree was clean at that commit before this Change Unit was created.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`; npm `11.4.2`.
- Evidence completed at `2026-07-14T15:20:10Z` UTC.

## Behavior Change

- Effectiveness manifest v3 registers `report.schema.json` and `report.compatibility.json`; older manifest versions and redirected contract paths fail closed.
- Report schema v1 defines one atomic model × arm × fixture × repeat attempt. Required groups cover:
  - comparison group, objective, neutral arm id, requested/actual model, fixture, repeat/seed or request fingerprint, workspace snapshot, budget, verifier set, and exposed capability policy;
  - execution runner, UTC timestamps, and termination state;
  - observable events and optional typed capability-activation telemetry;
  - typed evidence references that distinguish `model_self_report`, `tool_output`, and `independent_verifier`;
  - submitted output, verifier references, and a separately labeled model completion claim;
  - wall time plus a context-equivalent cost measurement, with metric/unit binding and acquisition source.
- Direct action remains valid when capabilities are exposed but no capability-activation event exists. Arm ids are identifiers rather than a schema enum, so B05 can add experiment arms without changing the wire shape; B03 will validate an arm against the current experiment plan.
- Model availability is explicit: an available request must record the actual model; an unavailable request must record a reason and cannot claim an actual model. A submitted result must include both its final output reference and model claim.
- All stable report objects are fail closed. Fixed routing proxies such as `triggered_skills` are unsupported fields, and no success or outcome score is part of the report.
- UTC timestamps share one schema definition. Contract tests validate calendar reality as well as syntax, so impossible dates such as February 31 are rejected by the tested contract.
- Compatibility policy declares report v1 as the first effectiveness family. Legacy skills-suite v2 is recognized by its `version: 2`, `suite: forge`, `run_id`, and `cases` signature and classified as incompatible because missing controlled conditions and evidence provenance cannot be reconstructed safely.
- No migration adapter or report migration field exists. Future migration requires a versioned explicit adapter, preservation of source digest/version, no inferred provenance, and full current-schema revalidation.
- The effectiveness contract loader now validates manifest pointers, report version/source vocabulary, compatibility invariants, sample presence, and every local `$ref` target. It still does not validate produced reports; B03 owns that production path.

## Decisions

- Keep the new report family separate from `evals/skills-suite/report.schema.json`. The latter requires route-oriented compliance fields and untyped self-report strings that cannot become effectiveness evidence.
- Use one report per attempt rather than a heterogeneous `cases[]` batch. Pairing and uncertainty need an atomic comparison unit; a future batch index may point to reports without changing their contract.
- Record capability exposure and activation only as diagnostic telemetry. Neither use nor non-use is a success signal.
- Keep execution termination, model claim, evidence source, and later evaluator verdict distinct. A structurally valid report is not a verified result.
- Define Evidence References in B02, but leave issuer integrity, command/artifact payloads, tamper detection, target/workspace validity, and freshness to B06.
- Do not invent a fictitious effectiveness v0 or auto-migrate skills-suite v2. The only safe current disposition is an explicit incompatible diagnostic and rerun.
- Avoid a permanent JSON Schema dependency in B02. Repository tests exercise every semantic keyword used by the schema and resolve `$ref` siblings/targets; an independent pinned Ajv Draft 2020-12 run provides a second implementation check. B03 still owns the production validator choice.

## Affected Surface

- Machine contract: `evals/effectiveness-suite/manifest.json`, `report.schema.json`, and `report.compatibility.json`.
- Contract corpus: valid direct-action, missing-workspace, and incompatible legacy report samples under `evals/effectiveness-suite/report-samples/`.
- Contract loader and command output: `scripts/lib/effectiveness-contract.mjs`, `scripts/validate-effectiveness-suite.mjs`.
- Tests: `tests/effectiveness-report-contract.test.mjs`, `tests/effectiveness-suite.test.mjs`.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, `docs/skill-suite-evaluation.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill, default invocation flow, package/plugin manifest, dependency, lockfile, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manifest v3 rejects v2 readers | A custom effectiveness-contract consumer may stop | Failure is explicit; update the reader to consume the registered report pointers rather than guessing |
| Strict v1 report fields increase runner work | Early B04/B05 implementations may omit controlled dimensions | B03 provides the only constructor and field-addressed diagnostics before runner integration |
| A valid Evidence Reference may still point to weak, stale, or altered evidence | Structure could be mistaken for trust | Docs separate structure from validity; B06 owns the Evidence Envelope and completion-support rules |
| Model claim or execution completion may be misread as task success | False effectiveness conclusions | The schema has no evaluator verdict; B08 alone maps objectives, constraints, safety, and verified evidence to outcomes |
| Arm ids are intentionally forward-compatible | A syntactically valid but undeclared arm can pass schema shape | B03 must cross-check the arm and definition digest against the active experiment plan |
| Contract samples contain fixture data, not real model runs | Samples could be cited as empirical evidence | README and validator state that no produced report or real-world effectiveness was validated |
| UTC-only timestamps are narrower than arbitrary RFC3339 offsets | A runner using local offsets will be rejected | Normalize observed timestamps to UTC before report construction |

## Verification

- Red-capable evidence:
  - Initial report tests → 4 intended failures for missing manifest pointers, schema, compatibility policy, and samples.
  - Review-driven negatives separately went red for missing actual model/unavailable reason, empty submitted result, invalid metric/unit pairs, weakened migration policy, missing legacy discriminator, unvalidated calendar dates, skipped `$ref` sibling assertions, unresolved `$ref` targets, and an unregistered migration hook.
- Focused final: `node --test tests/effectiveness-report-contract.test.mjs tests/effectiveness-suite.test.mjs` → exit 0; 17 passed, 0 failed.
- Node 24 (`v24.14.0`, npm `11.4.2`):
  - `npm test` → exit 0; 145 passed, 0 failed.
  - `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats, report contract v1 registered; produced reports and real-world effectiveness not claimed.
  - `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
- Node 22 (`v22.22.3`, npm `11.4.2`):
  - `npm run check:supported` → exit 0; 145 tests, validator, and 23-case skills-suite contract passed.
  - `npm run eval:effectiveness` → exit 0; 6 cases, 6 scenarios, 2 repeats, report contract v1 registered.
- Independent JSON Schema implementation:
  - `npx -y -p ajv-cli@5.0.0 -p ajv-formats@3.0.1 ajv validate --spec=draft2020 -c ajv-formats -s evals/effectiveness-suite/report.schema.json -d evals/effectiveness-suite/report-samples/v1-valid-direct-action.json` → exit 0; valid sample accepted.
  - The same command with `v1-missing-workspace.invalid.json` → expected exit 1; rejected at `/experiment` with missing `workspace`.
  - An initial Ajv invocation without `ajv-formats` exited 1 because that CLI does not register `date-time` by default; it was not treated as a schema verdict and was rerun with the explicit format plugin.
- `git diff --check` → exit 0 before the implementation commit.
- Two independent read-only review paths found and then confirmed closure of model-fallback, empty-submission, metric/unit, migration-policy, legacy-discriminator, date validity, `$ref`, and speculative-migration issues. Final incremental review reported no remaining P0/P1/P2.
- Not verified:
  - No production report constructor/parser or field-addressed runtime diagnostics exist yet.
  - No report has been produced by a real isolated benchmark runner.
  - Evidence envelopes, external verifier adapters, evaluator hard gates, paired statistics, and model non-suppression conclusions do not exist yet.
  - No empirical Forge benefit or non-interference claim is made.

## Rollback

- Revert implementation commit `a43aa2994b9e931821fa64bd0c0779ddadd5bce9` and this Change Unit commit together.
- No data migration, registry publication, dependency, version change, or remote state requires rollback.
- Safe stop: do not let B03/B04 emit v1 reports if the manifest pointers, local refs, compatibility policy, or independent schema validation fail.

## Docs To Sync

- [x] `docs/project.md` — Effectiveness attempt report language and PD12 fact boundary.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC8, B02/B03/B06/B08 boundary, and report-family decisions.
- [x] `docs/skill-suite-evaluation.md` — separate attempt-report family and legacy incompatibility.
- [x] `evals/effectiveness-suite/README.md` — report groups, truth boundaries, compatibility policy, and non-claims.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- Implementation commit `a43aa29` contains the complete B02 schema, compatibility corpus, contract loader changes, documentation, and regression tests.
- Every supported path keeps the model free to act directly, use a capability, or use none; capability telemetry cannot become a report success proxy.
- Current reports cannot hide a model fallback, submit an empty result, mix cost units, claim an unregistered migration, or silently convert legacy compliance self-report into effectiveness evidence.
- B03 is now unblocked to implement the single constructor/parser and strict cross-reference diagnostics against this contract.
