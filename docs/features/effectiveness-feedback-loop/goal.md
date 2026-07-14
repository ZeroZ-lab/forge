# effectiveness-feedback-loop

> 建立 Forge v0.49 方向的反馈闭环：独立 effectiveness contract、vertical slice 规则、buy-vs-build review lens、learn cross-project candidate 和 guide delegation 建议。

## Intent

Forge 目前有稳定的 compliance/regression suite，但它明确不证明真实项目有效性。v0.49 方向需要补运行反馈闭环，同时把“小孩版乐高城市”心智模型里的关键规则落到执行路径：按可验收切片搭、标准件优先选、委托只交证据、跨项目知识只候选不越界。

本 feature 不追求一次性证明 Forge 更优，只建立可验证的 held-out task contract 和最小运行规则补丁。

## Boundaries（非目标）

- **不在本 feature**：运行真实 Codex benchmark 或发布 effectiveness 结论。
- **不在本 feature**：新增默认生命周期阶段、状态看板或 `plan.md`。
- **不在本 feature**：自动写跨项目 memory、其他仓库或用户全局配置。
- **不在本 feature**：bump version、commit、push。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | `evals/effectiveness-suite/` 存在并覆盖至少 5 类 held-out scenario；Forge Next B01 已扩展为含 direct-action 的 6 类 | `npm run eval:effectiveness` |
| AC2 | contract 明确 Forge/no-Forge、至少 2 repeats、5 个 review metrics，且不声称真实 effectiveness | 文档审查 + 测试 |
| AC3 | detail 规则明确 module/task 服务可独立验收的 vertical slice | `rg "vertical slice" plugins/forge/skills/detail/SKILL.md` |
| AC4 | review 有 buy-vs-build lens，能检查成熟生态场景下无理由自研 | `rg "Buy-vs-build lens" plugins/forge/skills/review/SKILL.md` |
| AC5 | learn 提供对话内 Cross-project candidates 格式，不落盘 | `rg "Cross-project candidates" plugins/forge/skills/learn/SKILL.md` |
| AC6 | guide 能基于 delegation matrix 给委托建议 | `rg "delegation matrix" plugins/forge/skills/guide/SKILL.md` |
| AC7 | 现有验证 gate 无回归 | `npm test` / `npm run validate` / `npm run eval:skills` / `npm run metrics:chars` |

## Decisions

- FD1：effectiveness suite 独立于 skills-suite。理由：skills-suite 是 compliance/regression，混入真实效果会污染语义。
- FD2：先做 contract validator，不做 scorer。理由：没有真实多轮 run report 前，评分会制造伪确定性。
- FD3：vertical slice 只补到 detail 的 module 粒度规则，不新增阶段。理由：默认链仍应短。
- FD4：learn cross-project candidate 只在对话输出。理由：跨项目归档需要目标 owner 和确认门。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| contract 被误读成效果证明 | 过度宣传 | README、docs、脚本输出均声明 no effectiveness claim |
| review lens 增加默认链字符 | token 预算压力 | 文案保持一行，metrics gate 验证 |
| held-out fixtures 变成 oracle 泄漏 | 评测失真 | 测试禁止 fixture 出现 oracle/scoring 内部词 |
