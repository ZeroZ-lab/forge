# research-buy-build-matrix

> 为 research 增加「按能力盘点生态标准件 → 选型 → 自研判定」的可选输出格式。条件触发，不普适化，不改 eval。

## Intent

现状 research 的视角是「按子问题找算法方案」——四阶段从 PRD/goal 拆 SP，按 SP 查算法库，给算法菜单。在标准件生态密集场景（前端 / SaaS / 内部工具），大量技术决策其实不是「选哪个算法」，而是「选哪个现成标准件 + 哪块必须自研」。这个视角在现状 research 里缺失，导致选型散落在对话和决策理由里。

本 feature 给 research 增加一个**条件触发的可选输出格式**：buy-vs-build 矩阵。仅在标准件密集信号时触发；后端/算法/基础设施场景不强求产出。矩阵默认对话输出，不是 durable artifact；接受的选型写回 project/ADR。

## Boundaries（非目标）

- **不在本 feature**：把矩阵提升为 durable artifact（过 artifact-policy 独立产物门会被拒，无独立 owner/周期）。
- **不在本 feature**：加新决策 ID（复用 `research_recommendation`），不改 eval/manifest。
- **不在本 feature**：改下游 detail/codegen/technical-design（它们读 goal，不读 research 产物）。
- **不在本 feature**：把矩阵普适化成所有 research 的默认产物（后端/算法场景会得到空表噪音）。
- **不在本 feature**：研究 methodology 四阶段重构——矩阵是第三/四阶段在标准件密集场景的特化输出，不是新阶段。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | `references/buy-vs-build-matrix-template.md` 存在，含矩阵表结构 + 触发条件 + 写回约定 | 文件存在性 + 内容审查 |
| AC2 | research SKILL.md 文档约束段引用模板，条件限定为「标准件密集信号」 | 文档审查 |
| AC3 | 模板明确后端/算法/基础设施场景不强求填表（反普适化锚点） | 模板内容审查 |
| AC4 | CU 记录变更，含 intent/影响面/回滚 | CU 存在性检查 |
| AC5 | npm test / validate / eval:skills / metrics:chars 回归通过 | 四条命令回执 |

## Decisions

- FD1：矩阵默认对话输出，非 durable artifact。理由：过 artifact-policy 独立产物门会被拒（无独立 owner/周期）；矩阵是中间证据，选型写回权威源即可。
- FD2：放置在 `references/` 而非内联 SKILL.md。理由：SKILL.md 保持纪律/路由，结构化格式放 references，镜像 research-brief-template 先例。
- FD3：复用 `research_recommendation` 决策 ID，不加新 ID。理由：避免给 eval suite 加负担；矩阵是 research 结论的一种呈现。
- FD4：条件触发限定为「标准件密集信号」，显式排除后端/算法/基础设施场景。理由：避免普适化导致空表噪音。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 「标准件密集信号」边界主观 | 该用矩阵的场景没用，或反之 | 触发条件给正反例锚点（前端/SDK/ORM 触发；后端核心/算法/基础设施不触发） |
| 矩阵被误当 durable 文件 | 产生平行历史文件违反单一事实源 | SKILL.md 明确「默认对话输出，不落 durable 文件」 |
| 真实选型有效性未实证 | AC 无法覆盖 effectiveness | 记 Unverified，归 held-out effectiveness suite |
