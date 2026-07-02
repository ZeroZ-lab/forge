# learn-cross-project-boundary

> 明确 learn 只能归档当前项目内的长期知识；跨项目经验需要人类确认目标边界，不能直接写外部项目、全局 memory 或其他仓库。

## Intent

learn 当前强调“归档是人类决策”，但没有显式承认跨项目边界。review 发现的方法论经验可能看起来适合沉淀为跨项目规则，如果 learn 直接写入当前项目之外的 memory、其他仓库或全局 skill，会越过当前项目的事实源和 D3 确认门。

本 feature 给 learn 增加跨项目边界：当前项目内可按确认后的目标文档归档；跨项目内容只能输出建议和候选归档目标，等待人类在对应项目/全局资产维护流程中确认。

## Boundaries（非目标）

- **不在本 feature**：创建跨项目知识库、全局 memory、模板仓库或发布流程。
- **不在本 feature**：改变 learn 需要 review report + skill 方法论归因的入口条件。
- **不在本 feature**：允许 AI 自动归档到其他仓库或用户全局配置。
- **不在本 feature**：改 eval oracle、manifest、版本号或 benchmark case。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | `learn/SKILL.md` 明确 current project boundary | 文档审查 |
| AC2 | `learn/SKILL.md` 明确跨项目经验只输出建议，不直接写外部项目/global memory | 文档审查 |
| AC3 | `history-maintenance.md` 与 learn 的持久化规则不冲突 | 文档审查 |
| AC4 | CU 记录 intent、影响面、风险、回滚和验证 | CU 存在性检查 |
| AC5 | 现有验证 gate 无回归 | `npm test` / `npm run validate` / `npm run eval:skills` / `npm run metrics:chars` |

## Decisions

- FD1：只改 learn 和 history-maintenance，不新增 cross-project artifact。理由：当前项目没有跨项目知识库事实源。
- FD2：跨项目经验先作为建议输出，不落盘。理由：目标项目/全局资产的 owner、更新周期和确认门不同。
- FD3：保留 `archive_target_confirmation` 决策 ID。理由：这是现有 D3 确认门，不需要新决策 ID。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 有价值的跨项目经验不被沉淀 | 复用效率下降 | learn 输出候选归档目标和理由 |
| 当前项目规则被误推广到所有项目 | 规则污染其他项目 | 明确跨项目归档必须在目标边界内重新确认 |
| benchmark 不覆盖跨项目场景 | 行为有效性未实证 | 记入 CU Unverified，待 held-out learn case 补 |
