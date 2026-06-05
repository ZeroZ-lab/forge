# REBUILD_GUIDE.md — Rebuild Control

> Rebuild Control tells a future human or AI how to recreate the project from documents after source code is missing or stale.

## Inputs

- `docs/CURRENT_STATE.md`
- `docs/CODE_MAP.yml`
- `docs/project.md`
- `docs/features/*/contract.md`
- `docs/features/*/modules/*.md`
- `docs/features/*/testing/*`

## Rebuild Order

1. Read project and current snapshot.
2. Recreate directory structure from `CODE_MAP.yml`.
3. Generate shared contracts, schemas, and module interfaces.
4. Generate implementation files by feature/module.
5. Generate tests from testing docs and acceptance criteria.
6. Run verification commands.

## Verification

- Required commands:
- Smoke checks:
- Known blocked checks:

## Rules

- Do not invent behavior that is not in source docs.
- If a mapping is missing, record the inference in the active CU before projecting code.
- Changelog/timeline explain history; current docs define the rebuild target.
