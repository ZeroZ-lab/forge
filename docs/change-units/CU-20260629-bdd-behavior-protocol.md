# CU-20260629-bdd-behavior-protocol

## Type

- Methodology

## Intent

- Trigger: User requested BDD cases to be generated during development and approved a plan for BDD to span Forge stages.
- Goal: Make BDD a behavior-expression and traceability protocol across define/detail/plan/test-cases/codegen/review without adding a new lifecycle stage or default document.
- Out of scope: Adding Cucumber/Gherkin dependencies, creating `.feature` files, creating `testing/test-cases.md`, or changing benchmark fixtures.

## Behavior Change

- User-visible behavior: Forge guidance now explains where BDD belongs: AC in `goal.md`, scenario matrix in conversation/issue, automated scenarios in tests.
- Internal behavior: Published skills preserve AC# traceability from BDD examples through planning, scenario derivation, implementation, and review.
- Contract change: `docs/project.md` PD5 now defines BDD as a behavior-expression protocol and rejects default `.feature` use-case libraries.
- Data change: None.

## Affected Surface

- Features: None directly; this is a methodology update.
- Modules: None.
- Contracts: `docs/project.md`, `AGENTS.md`, goal template, and core stage SKILL.md files.
- Code implementation: `scripts/validate.mjs` adds BDD protocol guards and active-feature `.feature` rejection.
- Version metadata: `package.json`, `plugins/forge/.claude-plugin/plugin.json`, and `plugins/forge/.codex-plugin/plugin.json` are bumped to `0.47.0`.
- Tests: Validation suite covers the new protocol markers.
- Operations: No deployment or runtime behavior change.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agents treat BDD as a new default artifact | More documentation drift | PD5, AGENTS, artifact policy, and validate all reject default `.feature` / `testing/test-cases.md` artifacts |
| AC and derived BDD scenarios drift | Tests may verify a different behavior than the goal | test-cases/codegen/review now require AC# traceability and flag scenario rewrites |
| Skill text grows past budget | Plugin becomes harder to run in constrained contexts | Run `npm run metrics:chars` after edits |

## Verification

- Commands (with exit codes):
  - `node scripts/bump-version.mjs 0.47.0` -> exit 0; `package.json: 0.46.0 -> 0.47.0`; both plugin manifests also changed `0.46.0 -> 0.47.0`.
  - `npm run validate` -> exit 0; `Forge validation passed (25 skills, version 0.47.0).`
  - `npm test` -> exit 0; `tests 87`, `pass 87`, `fail 0`. The synthetic no-evidence report failure printed during the run is an expected negative fixture.
  - `npm run eval:skills` -> exit 0; `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered). No run report supplied; behavioral effectiveness is not claimed.`
  - `npm run metrics:chars` -> exit 0; `Default chain (detail -> codegen -> review): 4246 chars`; `All SKILL.md files: 48271 chars`.
  - `git status --short` -> exit 0; only the planned docs/skill/validator edits plus this CU are changed.
- Red-capable evidence (bugfix only): Not applicable.
- Not verified (with blocking reason): Real agent behavior on a runtime BDD workflow was not benchmarked; this change is verified at documentation/validator level only.

## Rollback

- Revert path: Revert this CU, the version bump, and the BDD edits in project/runtime docs, core SKILL.md files, artifact policy, goal template, and validator.
- Data rollback: None.
- Safe stop condition: If validator or metrics fail due to BDD wording bloat, revert the guard additions first and shrink SKILL wording before release.

## Docs To Sync

- [x] project.md / ADR
- [x] AGENTS.md
- [x] feature goal template
- [x] core stage SKILL.md files
- [x] artifact policy
- [x] version metadata: package and plugin manifests synced to `0.47.0`
- [x] testing docs: not created; BDD scenarios remain conversation/issue or tests by PD5
- [x] deploy docs: not applicable

## Completion Evidence

- Code diff: Updated project/runtime docs, core stage skills, artifact policy, goal template, validator guards, version metadata, and this CU. No dependencies, lifecycle stages, `.feature` files, `testing/test-cases.md`, or default `plan.md` files were added.
- Test evidence (command + output, not conclusion): See `## Verification`.
- Goal coverage: Methodology change covers `docs/project.md`, `AGENTS.md`, `plugins/forge/skills/shared/goal-template.md`, core stage skills, `plugins/forge/skills/shared/concepts/artifact-policy.md`, and `scripts/validate.mjs`.
- Doc sync result: `project.md`, `AGENTS.md`, goal template, relevant SKILL.md files, artifact policy, and validator are synchronized around BDD as behavior expression + AC# traceability.
- Residual risk: Real agent behavior remains unproven until a runtime benchmark exercises the BDD workflow.
