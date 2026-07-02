# detail-module-grain

> 为 detail 的 module 划分增加「生成稳定性」判据轴，使 module 粒度同时满足文档可承载性与 AI 单次可控生成可验收性。

## Intent

现状 detail 决定是否建 `modules/*.md` 只按单一轴——文档必要性（goal 能否清楚承载公共接口/不变量）。在 AI 驱动的 codegen 工作流里，这根轴会漏判一类 module：goal 能写清楚、但大到 AI 一次生成会失控，或拆细到 Button/Title 级无意义。本 feature 给 detail 叠加第二个判据轴：生成稳定性——该单元能否被 AI 在一次可控生成内完成、人能否独立验收。

两个轴的交集决定 module 粒度。判据保持定性，不引入量化硬指标（避免把当前 codegen 经验值写成铁律）。

## Boundaries（非目标）

- **不在本 feature**：A1 标准件清单进 research；A3 委托决策矩阵；A4 learn 跨项目资产化地平线。各自独立推进。
- **不在本 feature**：改 codegen/review。本 feature 只影响 detail 的划分决策，下游 skill 行为不变。
- **不在本 feature**：可量化指标（单次生成文件数上限等）。判据定性表述，避免过拟合当前 codegen 能力。
- **不在本 feature**：普适化到非 AI 场景。生成稳定性轴仅在 AI 驱动 codegen 时有意义。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | detail `SKILL.md` 的 module 判据段落同时包含两轴：文档必要性 + 生成稳定性 | 文档审查 |
| AC2 | 双轴判据给出过细反例（Button/Title/Icon 级拆分）和过粗反例（多个无法独立验收单元塞一个 module） | 文档审查 |
| AC3 | benchmark 跑 detail 相关 case，module 划分不出现过细/过粗 | `run-skills-benchmark` + `evaluate-skills` 回执 |
| AC4 | CU 记录判据变化，含 intent/影响面/回滚 | CU 存在性检查 |
| AC5 | 新判据不破坏既有 detail case 合规性（回归） | `npm run eval:skills` 通过 |

## Decisions

- FD1：判据用**定性表述**（「AI 能否一次可控生成 + 人能否独立验收」），不引入文件数/行数硬指标。理由：codegen 能力会演进，硬指标会过拟合；定性判据允许随能力提升调整权重。
- FD2：**两个轴取交集**而非替代。文档必要性仍是首要轴；生成稳定性是叠加的次级判据。两者都满足才健康。
- FD3：产物落 `docs/features/detail-module-grain/goal.md` + SKILL.md 改动 + CU，**不建 ADR**（forge 目前无 adr 目录，goal 即 feature 级合约）。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 定性判据执行者主观偏差 | 同一 goal 不同人 module 粒度不一致 | review lens 对照反例；判据段落给足正反例锚点 |
| 生成稳定性轴权重过高，导致过细拆分 | module 数量膨胀，文档维护成本上升 | FD2 明确文档必要性仍是首要轴 |
| benchmark case 未覆盖粒度边界场景 | AC3 无法真正验证 | 检查现有 case 是否含粒度信号；若无，记入 Unverified |
