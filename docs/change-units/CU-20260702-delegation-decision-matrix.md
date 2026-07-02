# CU-20260702-delegation-decision-matrix

## Type

Methodology（执行编排纪律，非功能代码）

## Intent

- Trigger：D3/D10/evidence-policy 已要求人类裁决、复杂度分级和关键路径独立复核，但缺少“何时派、派什么、何时不派”的操作化速查表。
- Goal：新增 shared delegation matrix，让主控 Agent 保留最终判断，同时可把上下文重的调查、低风险执行或高风险分析委托出去。
- Out of scope：新增 subagent 工具；强制所有任务派发；把高风险最终决策外包；改 eval/manifest/版本号。

## Behavior Change

- 新增 `shared/concepts/delegation-matrix.md`，定义亲自做/派调查/派执行/只派分析/不派发的判断表，并明确 D3 人类决策边界。
- `execution-discipline` 的 D10 和 runtime meaning 引用 delegation matrix。
- `evidence-policy` 的 L2/L3 独立复核描述改为按 delegation matrix 判断。
- `review` 的 P0/P1 独立性规则引用 delegation matrix，保留主控裁决。

## Affected Surface

- `plugins/forge/skills/shared/concepts/delegation-matrix.md`
- `plugins/forge/skills/shared/concepts/execution-discipline.md`
- `plugins/forge/skills/shared/concepts/evidence-policy.md`
- `plugins/forge/skills/review/SKILL.md`
- `docs/features/delegation-decision-matrix/goal.md`
- `docs/change-units/CU-20260702-delegation-decision-matrix.md`

## Decisions

- FD1：矩阵放 shared concepts。理由：委托判断跨 detail/codegen/review/evidence 使用。
- FD2：矩阵是运行纪律，不是新 artifact。理由：它不产生项目事实文档，只约束执行编排。
- FD3：高风险任务只派分析/风险评估，不派最终决策。理由：D3 和主控责任不能外包。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 委托被过度使用 | 简单任务 token 成本上升 | 矩阵保留“亲自做”分支 |
| subagent 结果被当最终裁决 | 主控责任丢失 | 明确“证据包进，主控裁决出” |
| 高风险任务被误派执行 | 安全/数据/发布风险 | 高风险只允许分析/方案/风险评估 |

## Verification

```bash
rg -n "delegation-matrix|D3 边界|证据包|subagent" plugins/forge/skills/shared/concepts/delegation-matrix.md plugins/forge/skills/shared/concepts/execution-discipline.md plugins/forge/skills/shared/concepts/evidence-policy.md plugins/forge/skills/review/SKILL.md docs/features/delegation-decision-matrix/goal.md
```

Result: found matrix coverage in `delegation-matrix.md`, D10/evidence-policy references, review reference, and goal AC.

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

- 真实 subagent 运行行为未由 benchmark 实证；本变更只约束文档层执行纪律。

## Rollback

Revert 本 CU 关联改动：
1. 删除 `plugins/forge/skills/shared/concepts/delegation-matrix.md`。
2. 还原 `execution-discipline.md`、`evidence-policy.md`、`review/SKILL.md` 的引用。
3. 删除 `docs/features/delegation-decision-matrix/goal.md` 及本 CU。

## Authoritative Documents Synchronized

- `docs/features/delegation-decision-matrix/goal.md`：feature 目标/边界/AC/决策已建立。
- `plugins/forge/skills/shared/concepts/delegation-matrix.md`：委托矩阵为唯一格式事实源。
