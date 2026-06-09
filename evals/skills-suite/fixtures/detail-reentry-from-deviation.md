# Fixture: detail reentry from deviation

User prompt:

> 之前的 codegen 发现了偏差：API 返回的字段和 goal.md 里定义的导出格式不一致，review 也确认了合约和目标冲突。请重新进入详设，修正合约。

Context files:

- `docs/features/billing/goal.md` — existing goal with export format requirements
- `docs/features/billing/api/goal.md` — current API contract (has deviation)
- `docs/features/billing/database/goal.md` — current database contract
- Deviation summary from codegen: API returns `createdAt` timestamp but goal requires ISO date string; missing `totalCount` header for pagination
- Review findings: contract-goal inconsistency on export format and pagination metadata

Expected behavior:

- Re-enter detail orchestration from deviation signal (not a fresh detail run).
- Read deviation summary and review findings as primary input.
- Update API contract with corrected constraints: ISO date string format, `totalCount` in response header.
- Update database contract if query changes are needed.
- Record a downstream gap report documenting what changed and why.
- Update changelog with the deviation-triggered correction.
- Produce Change Unit for the reentry correction.
