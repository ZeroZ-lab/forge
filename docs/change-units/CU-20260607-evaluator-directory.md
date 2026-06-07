# CU-20260607-evaluator-directory

## Type

- Refactor

## Intent

- Trigger: 用户希望 evaluator 放到一个目录里。
- Goal: 将 skills-suite evaluator 实现移动到独立目录，同时保留现有 CLI 命令兼容。
- Out of scope: 不改变评分逻辑、report schema、manifest case、runner 行为或 npm script 命令。

## Behavior Change

- User-visible behavior:
  - `node scripts/evaluate-skills.mjs` 继续可用，输出不变。
  - 新增直接入口：`node scripts/evaluate-skills/index.mjs`。
- Internal behavior:
  - evaluator 实现从 `scripts/evaluate-skills.mjs` 移到 `scripts/evaluate-skills/index.mjs`。
  - `scripts/evaluate-skills.mjs` 变成兼容 wrapper。
- Contract change:
  - 无评分合约变化。
- Data change:
  - 无。

## Affected Surface

- Features:
  - Skills suite evaluation.
- Modules:
  - `scripts/evaluate-skills/index.mjs`
  - `scripts/evaluate-skills.mjs`
  - `scripts/validate.mjs`
- Contracts:
  - `docs/goal-verification.md`
  - `docs/timeline.md`
- Code projection:
  - Path-only refactor with compatibility wrapper.
- Tests:
  - Existing evaluator tests should pass through wrapper path.
- Operations:
  - Existing `npm run eval:skills` remains valid.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| External callers use old path | Could break if old file disappears | Keep old file as wrapper |
| Validator misses implementation path | Directory refactor could drift | Add `scripts/evaluate-skills/index.mjs` validation |
| Documentation maps only wrapper | Rebuild could recreate wrong shape | Update goal verification docs |

## Verification

- Commands:
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/evaluate-skills/index.mjs`
  - `node scripts/validate.mjs`
  - `node --test`
- Manual checks:
  - Confirmed wrapper imports implementation.
- Evidence:
  - `node scripts/evaluate-skills.mjs` passed.
  - `node scripts/evaluate-skills/index.mjs` passed.
  - `node scripts/validate.mjs` passed.
  - `node --test` passed: 23/23.
- Not verified:
  - External CI using undocumented direct file assumptions.

## Rollback

- Revert path:
  - Move implementation back to `scripts/evaluate-skills.mjs` and remove `scripts/evaluate-skills/`.
- Data rollback:
  - None.
- Safe stop condition:
  - If downstream tools cannot follow the wrapper, revert to a single-file evaluator.

## Docs To Sync

- [x] docs/goal-verification.md
- [ ] feature contract / modules
- [ ] testing docs
- [ ] deploy docs
- [x] changelog / timeline summary

## Completion Evidence

- Code diff:
  - Evaluator implementation lives in `scripts/evaluate-skills/index.mjs`.
  - Compatibility wrapper remains at `scripts/evaluate-skills.mjs`.
- Test evidence:
  - `node scripts/evaluate-skills.mjs` and `node scripts/evaluate-skills/index.mjs` both reported benchmark contract pass.
  - `node scripts/validate.mjs` passed.
  - `node --test` passed.
- Doc sync result:
  - Rebuild Control updated for new path.
- Residual risk:
  - Minimal; compatibility wrapper preserves existing command surface.
