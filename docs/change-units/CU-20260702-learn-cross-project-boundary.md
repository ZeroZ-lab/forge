# CU-20260702-learn-cross-project-boundary

## Type

Methodology（learn 归档边界，非功能代码）

## Intent

- Trigger：learn 已要求用户确认归档目标，但未显式承认跨项目边界；跨项目经验若直接写外部 memory/仓库，会越过当前项目事实源。
- Goal：明确 learn 只写当前项目内的长期文档；跨项目经验只输出候选归档目标和理由，等待目标项目或全局资产流程确认。
- Out of scope：创建跨项目知识库；改 learn 入口条件；允许 AI 自动写其他仓库/global memory；改 eval/manifest/版本号。

## Behavior Change

- `learn/SKILL.md` 的职责、边界、归档判断和方法论均明确 current project boundary。
- 跨项目经验被归类为“只建议、不落盘”，必须在目标边界重新经过 `archive_target_confirmation`。
- `history-maintenance.md` 同步 learn 持久化规则，避免 CU 规则与 learn 行为冲突。

## Affected Surface

- `plugins/forge/skills/learn/SKILL.md`
- `plugins/forge/skills/shared/concepts/history-maintenance.md`
- `docs/features/learn-cross-project-boundary/goal.md`
- `docs/change-units/CU-20260702-learn-cross-project-boundary.md`

## Decisions

- FD1：只改 learn 和 history-maintenance，不新增 cross-project artifact。理由：当前项目没有跨项目知识库事实源。
- FD2：跨项目经验先作为建议输出，不落盘。理由：目标项目/全局资产的 owner、更新周期和确认门不同。
- FD3：保留 `archive_target_confirmation` 决策 ID。理由：复用现有 D3 确认门。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 有价值经验不被沉淀 | 复用效率下降 | learn 输出候选归档目标和理由 |
| 当前项目规则误推广 | 污染其他项目事实源 | 目标边界内重新确认 |
| benchmark 不覆盖跨项目场景 | effectiveness 未实证 | 记录 Unverified，待 held-out learn case |

## Verification

```bash
rg -n "当前项目|跨项目|global memory|archive_target_confirmation|current project" plugins/forge/skills/learn/SKILL.md plugins/forge/skills/shared/concepts/history-maintenance.md docs/features/learn-cross-project-boundary/goal.md
```

Result: found current-project boundary, cross-project suggestion-only rule, global memory exclusion, and `archive_target_confirmation` reuse.

```bash
npm test
```

Result: 87 pass / 0 fail.

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.47.0).`

```bash
npm run eval:skills
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No run report supplied; behavioral effectiveness is not claimed.

```bash
npm run metrics:chars
```

Result: default chain 4281 chars; all SKILL.md 48668 chars. Both remain under validator budgets.

## Unverified

- 跨项目 learn 场景未由现有 skills-suite 覆盖；本变更依赖文档审查和回归 gate。

## Rollback

Revert 本 CU 关联改动：
1. 还原 `plugins/forge/skills/learn/SKILL.md` 的跨项目边界段落。
2. 还原 `plugins/forge/skills/shared/concepts/history-maintenance.md` 的 learn local exception。
3. 删除 `docs/features/learn-cross-project-boundary/goal.md` 及本 CU。

## Authoritative Documents Synchronized

- `docs/features/learn-cross-project-boundary/goal.md`：feature 目标/边界/AC/决策已建立。
- `plugins/forge/skills/learn/SKILL.md`：learn 当前项目归档边界已写入。
- `plugins/forge/skills/shared/concepts/history-maintenance.md`：learn 持久化例外已同步跨项目边界。
