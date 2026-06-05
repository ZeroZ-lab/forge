# PLAN-2026-06-05-skills-suite-change-unit-upgrade

## Goal

Upgrade Forge skills suite from stage artifacts plus timeline/changelog into a Change Unit driven, traceable, rebuildable protocol system.

## Scope

- Add shared Change Unit, doc sync, CODE_MAP, CURRENT_STATE, and REBUILD_GUIDE templates.
- Update skills, registry, evaluator, benchmark runner, tests, plugin package copies, and version metadata.
- Keep existing 24 skills unless implementation reveals a concrete reason to change topology.

## Strategy

1. Add shared templates and agent audit records.
2. Add concise Change Unit protocol references to skills.
3. Extend registry signals and eval v2 contract.
4. Add plugin sync and packaged-copy validation.
5. Run validation commands and record results.

## Verification

- `node scripts/validate.mjs`
- `node --test`
- `node scripts/evaluate-skills.mjs`
- Optional behavior smoke: `node scripts/run-skills-benchmark.mjs --max-cases 1`

## Risks

- Broad protocol edits can create stale packaged plugin copies.
- Eval v2 may break synthetic report tests if runner/evaluator/schema drift.
- Skill line limit remains 300 lines.
