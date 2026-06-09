# CU-20260609-collapse-notes-into-modules

## Type

- Methodology

## Intent

- Trigger: 用户连续追问"现在的结构会不会出现文档越多 AI 不知所措"。审查发现详设层存在两套并行产物——领域级 `notes/<domain>.md`（API1-7 / FE1-5 / DB1-5 决策 + 共享数据模型）与模块级 `modules/*.md`（接口/数据/行为合约）——职责重叠（接口合约两处都写）、跨领域粒度不一致（db-design 只产 notes，api/frontend 产 notes + modules），且两份元文档各选不同 canonical（AGENTS 用 notes/、README 用 modules/）。这让下钻路径有两条，AI 不知道以哪个为准、去哪个目录找。
- Goal: 把详设下钻收敛为单层。领域级决策上提 goal.md，模块级合约留在 modules/，移除 notes/ 层。让 agent 只有一条路径：goal.md 首屏合约 → 顺指针读 modules/。
- Out of scope: 不重构 frontend 两个模板的重叠（frontend-goal-template 与 frontend-module-template 内容近似，留 follow-up）；不迁移 docs/features/task-management 示例（停留在更旧的 per-domain 目录布局 api/goal.md、frontend/modules/，留 follow-up）。

## Decision

选项 A：合并 notes/ 进 modules/，单层下钻。

| # | 选项 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| 1 | 详设下钻层数 | A 单层（goal.md + modules/） | 唯一下钻路径，跨领域粒度统一，消除元文档矛盾，最贴合"降低 AI 心智负担" | B 保留两层但硬切职责（心智负担没降）；C 只修元文档表述（治标，重叠与粒度不一致仍在） |

**显式 supersede**：本 CU 推翻 v0.32.0（commit 115c9ee）确立的 `notes/<domain>.md` canonical 命名决策。v0.32.0 把 notes/<domain>.md 作为受 validate 强制的合法布局；本次将其折叠进 goal.md + modules/，并在 validate 的 forbiddenArtifactNames 中新增 notes/api|frontend|database.md，防止回流。

## Behavior Change

- User-visible behavior: 无（方法论/模板层变更，不影响已生成项目的运行）。
- Internal behavior: 详设领域 skill（api/db/frontend-design）的产出从 `notes/<domain>.md + modules/*.md` 改为 `goal.md（领域决策 + 共享数据模型）+ modules/*.md`。
- Contract change: canonical 布局从两层降为单层。validate 新增 feature 级索引校验（modules/ 存在时，goal.md 必须索引全部模块且无悬空指针）。
- Data change: 无。

## Affected Surface

- Skills: api-design、db-design、frontend-design、fe-artifact、fe-accept、codegen（上下游/出口/历史维护/红旗/验证清单中的 notes 引用）。
- Templates: shared/frontend-module-template.md、shared/changelog-template.md、shared/goal-template.md、detail/SKILL.md（产物目录图 + 出口）、init/references/agents-template.md（读取协议）、think/references/thinking-template.md、fe-artifact/references/fe-artifact-protocol.md。
- Meta docs: AGENTS.md（默认产物、产物传递图、文档结构树、膨胀控制表、触发规则、引用链）、README.md（默认文档集，修正"3 类却列 4 条"并对齐到默认 2 类 + modules/ 降为按需）。
- Tooling: scripts/validate.mjs（canonical 注释 + 失败信息 + forbiddenArtifactNames + 新增 feature 级索引校验）。
- Code implementation: 无代码逻辑改动。
- Tests: 沿用 scripts/validate.mjs + node --test。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 推翻一日前的 canonical 决策造成认知摇摆 | 中 | 本 CU 显式记录 supersede + 理由；validate 新增 notes 禁用项硬性防回流 |
| 领域决策上提 goal.md 可能撑破 100 行上限 | 低 | 仍可拆 modules/；膨胀控制规则不变 |
| 示例 task-management 与新布局不一致 | 低 | 登记为 follow-up，validate 索引校验对其无 modules/ 故不误伤 |

## Follow-ups

- frontend-goal-template.md 与 frontend-module-template.md 内容重叠，应合并或明确分工。
- docs/features/task-management 示例迁移到单层 goal.md + modules/ 布局。

## Verification

- `node scripts/validate.mjs`
- `node --test`
