# delegation-decision-matrix

> 为 Forge 的 D3/D10 执行纪律增加委托决策速查表，让主控 Agent 知道何时亲自做、何时派 subagent 调查/执行/审查，以及哪些决策不能外包。

## Intent

Forge 已有 D3（人类决策）、D10（复杂度分级）和 evidence-policy 中的独立 subagent 约束，但缺少一张可操作的委托判断表。结果是主控 Agent 容易在两端漂移：要么什么都自己读，导致上下文负载过高；要么把高风险判断外包，削弱主控裁决。

本 feature 增加 shared delegation matrix。矩阵只指导执行编排，不改变人类确认边界，不新增持久 artifact 类型。

## Boundaries（非目标）

- **不在本 feature**：引入新的 subagent 工具、插件或运行时能力。
- **不在本 feature**：要求所有任务必须派发。低风险、低上下文任务仍可主控直接完成。
- **不在本 feature**：把安全、权限、支付、迁移、删除、发布等高风险决策外包给 subagent。
- **不在本 feature**：改 eval oracle、manifest、版本号或 benchmark case。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | `shared/concepts/delegation-matrix.md` 存在，包含亲自做/派调查/派执行/只派分析/不派发的判断表 | 文件存在性 + 内容审查 |
| AC2 | 矩阵明确 subagent 返回证据包，最终判断和用户交付由主控负责，关键取舍仍遵循 D3 人类确认 | 内容审查 |
| AC3 | `execution-discipline` / `evidence-policy` / `review` 至少有一处运行路径引用该矩阵 | `rg delegation-matrix` |
| AC4 | CU 记录 intent、影响面、风险、回滚和验证 | CU 存在性检查 |
| AC5 | 现有验证 gate 无回归 | `npm test` / `npm run validate` / `npm run eval:skills` / `npm run metrics:chars` |

## Decisions

- FD1：矩阵放在 `shared/concepts/`。理由：委托判断跨 detail/codegen/review/evidence 使用，不属于单个 skill。
- FD2：矩阵是运行纪律，不是新 artifact。理由：它约束执行方式，不产生新的项目文档类型。
- FD3：高风险任务只派分析/风险评估，不派最终决策。理由：D3 和主控责任不能外包。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 委托被过度使用 | 简单任务 token 成本上升 | 矩阵保留“亲自做”分支 |
| subagent 结果被当最终裁决 | 主控责任丢失 | 矩阵明确“证据包进，主控裁决出” |
| 高风险任务被误派执行 | 安全/数据/发布风险 | 高风险只允许分析/方案/风险评估 |
