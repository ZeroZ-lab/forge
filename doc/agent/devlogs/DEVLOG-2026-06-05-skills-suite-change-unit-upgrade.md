# DEVLOG-2026-06-05-skills-suite-change-unit-upgrade

## Context

User requested implementation of the approved full upgrade plan.

## Baseline

- `node scripts/validate.mjs`: passed before implementation.
- `node --test`: passed before implementation.
- `node scripts/evaluate-skills.mjs`: passed before implementation.
- Existing untracked file: `docs/plugin-publishing.md`; not in scope.

## Changes

- Added shared templates for Change Unit, doc sync, CODE_MAP, CURRENT_STATE, and REBUILD_GUIDE.
- Added concise `Change Unit / Rebuild Control` protocol references to all 24 root skills and synced packaged skills.
- Added CU/doc sync/CODE_MAP signals to `registry.yaml`.
- Upgraded skills-suite manifest/report contract to v2 with `change_units`, `doc_sync`, and `code_map_entries`.
- Added bugfix regression benchmark fixture and v2 evaluator assertions.
- Added `scripts/sync-packaged-plugin.mjs` and validate-time packaged plugin drift detection.
- Updated Forge docs, timeline, plugin metadata, and initial release version to 0.28.0.
- Follow-up consistency fix: all registry skills now declare `docs/change-units/CU-*.md`; all manifest `doc_sync_completed` targets are listed in each case's expected artifacts.
- Follow-up evaluator hardening: expected artifacts are now mandatory report evidence, and CODE_MAP coverage requires structured `{ source: "docs/...", projects_to: [...] }` entries.
- Pre-release evaluator hardening: string-only `doc_sync` no longer counts as completed evidence; `change_units` must point to `docs/change-units/CU-*.md`; non-CU expected artifacts must be reported through `artifacts`.
- Bumped final release version to 0.28.1 after pre-release evaluator hardening.

## Verification

- `node scripts/validate.mjs`: passed.
- `node --test`: passed, 21/21.
- `node scripts/evaluate-skills.mjs`: passed, 12 cases / 24 skills covered.
- Negative smoke reports for missing expected artifacts and string-only CODE_MAP entries now fail as intended.
- Negative smoke reports for string-only `doc_sync` and non-CU `change_units` now fail as intended.
- `node scripts/run-skills-benchmark.mjs --max-cases 1`: generated report under `.eval-runs/skills-suite/2026-06-05T03-39-19-428Z/`.
- `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/2026-06-05T03-39-19-428Z/report.json`: passed, 1 case, 8/8 oracle checks.

## Risks

- Full 12-case behavioral benchmark was not run.
- V2 report contract is stricter; older v1 reports must be regenerated or migrated.
- `docs/plugin-publishing.md` remains an unrelated untracked file and was not modified.
