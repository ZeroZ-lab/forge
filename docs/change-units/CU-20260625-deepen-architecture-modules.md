# CU-20260625-deepen-architecture-modules

## Type

- Refactor / Methodology

## Intent

- Trigger: architecture review identified four shallow or leaking seams in the benchmark harness and lifecycle skill protocols.
- Goal: concentrate benchmark contract, run report, orchestrator, and history persistence complexity behind deep module interfaces.
- Out of scope: change benchmark scoring, report schema v2, manifest cases, flat skill discovery, plugin manifests, release version, or the compatibility evaluator CLI.

## Decision

| # | Decision | Choice | Reason | Rejected |
|---|----------|--------|--------|----------|
| 1 | Benchmark contract seam | One `benchmark-contract.mjs` loader/validator | Validator, evaluator, runner, and tests need one contract interpretation | Keep duplicate manifest validation |
| 2 | Run report seam | One `run-report.mjs` module for construction, normalization, validation, and oracle evaluation | Report field variants and failure shapes should not leak to callers | Preserve low-level accessor helpers |
| 3 | Orchestrator dependency | Depend on child outputs and exit conditions | Child method numbering is implementation, not interface | Bind orchestrators to I#/S#/API#/DB#/FE#/T#/TC# |
| 4 | Persistence mode | One shared history/state concept | Standalone/child, timeline, status, CU, and archive decisions need locality | Repeat persistence policy in every skill |
| 5 | Timeline semantics | Keep timeline opt-in | Matches the project default-minimum history model | Unconditionally append timeline from every stage |

## Behavior Change

- User-visible behavior:
  - Lifecycle stages keep the same artifacts and routing.
  - Timeline is written only when enabled; Change Units remain mandatory for durable mutations.
- Internal behavior:
  - `scripts/validate.mjs`, evaluator, runner, and tests consume the same benchmark contract module.
  - Report construction and oracle checks cross one run-report interface.
  - Orchestrators verify child outputs instead of internal method IDs.
  - Lifecycle skills delegate persistence mode to `shared/concepts/history-maintenance.md`.
- Contract change:
  - `evals/skills-suite/manifest.json` and `report.schema.json` remain the facts.
  - Runtime report validation now consistently enforces required arrays and supported entry shapes.
- Data change:
  - None.

## Affected Surface

- Modules:
  - `scripts/lib/benchmark-contract.mjs`
  - `scripts/lib/run-report.mjs`
  - `scripts/evaluate-skills/index.mjs`
  - `scripts/run-skills-benchmark.mjs`
  - `scripts/validate.mjs`
- Skill protocols:
  - `design`, `detail`, `test`
  - 23 lifecycle skills that persist history directly or through an orchestrator
  - `plugins/forge/skills/shared/concepts/history-maintenance.md`
- Tests:
  - `tests/benchmark-contract.test.mjs`
  - `tests/run-skills-benchmark.test.mjs`
  - `tests/skills-suite-evaluation.test.mjs`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Historical report variant is rejected | Medium | Preserve schema-supported string/object variants and exercise them through interface tests |
| Scoring behavior drifts during refactor | High | Keep scoring in evaluator and run existing synthetic 100/100 report tests |
| Child skill stops writing expected history | Medium | Shared mode table distinguishes standalone and child; validator requires every history-aware skill to reference it |
| Orchestrator loses a quality gate | Medium | Keep cross-document/cross-artifact gates local; only remove child implementation IDs |

## Verification

- Commands:
  - `npm test`
  - `npm run validate`
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/evaluate-skills/index.mjs`
  - `node scripts/measure-token-footprint.mjs --max-default-chain-chars=9000 --max-total-chars=56000`
  - `git diff --check`
- Manual checks:
  - Confirmed old evaluator wrapper still imports the directory implementation.
  - Confirmed manifest and report schema files are unchanged by this Change Unit.
- Evidence:
  - `npm test`: 26 passed, 0 failed.
  - `npm run validate`: passed for 25 skills, version 0.39.0.
  - Both evaluator entrypoints: 21 cases, 25 skills covered.
  - Token gate: default chain 8,910 chars; all SKILL.md files 51,914 chars.
  - `git diff --check`: passed.
- Not verified:
  - Real Codex benchmark behavior; no manifest or skill behavior case changed, so runtime benchmark execution is not required for this structural refactor.

## Rollback

- Revert path:
  - Restore `run-helpers.mjs`, inline manifest/report validation, numbered orchestrator dependencies, and per-skill persistence paragraphs.
- Data rollback:
  - None.
- Safe stop condition:
  - If any existing v2 report accepted before this change is rejected despite matching `report.schema.json`, stop and repair run-report compatibility before release.

## Docs To Sync

- [x] `docs/skill-architecture-audit.md`
- [x] `docs/skill-suite-evaluation.md`
- [x] `AGENTS.md`
- [x] `docs/timeline.md`

## Completion Evidence

- Code diff: two deep harness modules added; shallow run helpers removed; three orchestrator seams and 23 history-aware skills updated.
- Test evidence: 26 interface/CLI tests passed, including synthetic evaluator scoring and malformed report rejection.
- Doc sync result: architecture and persistence decisions recorded.
- Residual risk: real agent behavior is unchanged by intent but not re-benchmarked.
- Trace Report: not applicable; this is a repository architecture refactor, not feature code generation.
