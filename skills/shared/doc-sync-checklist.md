# doc-sync-checklist.md — Doc Sync

> 在 Change Unit 完成前执行。Current Snapshot 只写当前事实；Change History 只写演化事件。

## Current Snapshot

- [ ] `docs/CURRENT_STATE.md` reflects the current system.
- [ ] `docs/REBUILD_GUIDE.md` still describes a valid rebuild path.
- [ ] `docs/CODE_MAP.yml` maps changed docs to projected code/tests.

## Contracts

- [ ] Feature `contract.md` and domain contracts match the new behavior.
- [ ] Module docs record public interfaces, dependencies, edge cases, and tests.
- [ ] API/database/event contracts are updated when wire/data shape changes.

## Testing

- [ ] Acceptance tests trace to AC IDs or module test obligations.
- [ ] Bugfixes add regression tests or explain why none are needed.
- [ ] Verification commands and failed/blocked checks are recorded in the CU.

## History

- [ ] The CU is the complete event record.
- [ ] Changelog/timeline entries link to the CU and do not duplicate the full record.
- [ ] Risks, rollback, and residual unknowns are explicit.
