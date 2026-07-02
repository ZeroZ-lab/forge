# CU-20260702-research-buy-build-matrix

## Type

Methodology（research 可选输出格式，非功能代码）

## Intent

- Trigger：research 现状只有「按子问题找算法方案」的视角，在标准件生态密集场景（前端 / SaaS / 内部工具）会漏掉「选哪个现成标准件 + 哪块必须自研」这一类技术决策，选型散落在对话里。来源：Lego Vibe 方法论对比分析识别的 buy-vs-build 视角缺失。
- Goal：为 research 增加条件触发的可选输出格式 buy-vs-build 矩阵，仅在标准件密集信号时触发；默认对话输出，不引入新 durable artifact / 决策 ID / eval 改动。
- Out of scope：提升为 durable artifact；加新决策 ID；改下游 detail/codegen；普适化到后端/算法/基础设施；research 四阶段重构。

## Behavior Change

- research 在「标准件密集信号」（前端框架 / SDK / ORM / 认证服务 / 部署平台等成熟生态领域）时，可选输出 buy-vs-build 矩阵（能力 / 候选标准件 / 选择理由 / 不适用场景 / 是否自研）。
- 矩阵默认对话输出，接受的选型写回 `project.md` 共享决策表或 ADR；矩阵本身不落 durable 文件。
- 后端核心服务、算法/模型选择、基础设施等生态稀薄场景不强求填表——走默认算法菜单，不套本矩阵。
- 复用现有 `research_recommendation` 决策 ID，不新增 ID。

## Affected Surface

- `plugins/forge/skills/research/references/buy-vs-build-matrix-template.md`：新增结构化模板（触发条件 + 能力盘点表 + 自研判定表 + 选型理由结构 + 写回约定）。
- `plugins/forge/skills/research/SKILL.md`：文档约束段新增一段条件触发的矩阵引用，镜像 research-brief-template 的接线方式。
- `docs/features/research-buy-build-matrix/goal.md`：新增 feature goal（目标/边界/AC/FD 决策/风险）。
- `docs/change-units/CU-20260702-research-buy-build-matrix.md`：本 CU。

## Decisions

- FD1：矩阵默认对话输出，非 durable artifact。理由：过 artifact-policy 独立产物门会被拒（无独立 owner/周期）；矩阵是中间证据。
- FD2：放置在 `references/` 而非内联 SKILL.md。理由：SKILL.md 保持纪律/路由，结构化格式放 references，镜像 research-brief-template 先例。
- FD3：复用 `research_recommendation` 决策 ID，不加新 ID。理由：避免给 eval suite 加负担；矩阵是 research 结论的一种呈现。
- FD4：条件触发限定为「标准件密集信号」，显式排除后端/算法/基础设施。理由：避免普适化导致空表噪音。
- 拒绝方案：内联进 SKILL.md（破坏纪律/格式分离）；新增 durable artifact（过不了独立产物门）；加新决策 ID（增加 eval 负担无收益）；普适化为默认产物（后端场景空表噪音）。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 「标准件密集信号」边界主观 | 该用的没用，或不该用的乱用 | 触发条件给正反例锚点；模板首段明确何时用/何时不填 |
| 矩阵被误当 durable 文件 | 平行历史文件违反单一事实源 | SKILL.md + 模板均明确「默认对话输出，不落 durable 文件」 |
| 真实选型有效性未实证 | effectiveness 不可由本 suite 证明 | 记 Unverified，归 held-out effectiveness suite（PD7） |

## Verification

```bash
npm test
```

Result: 87 pass / 0 fail。

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.47.0).`

```bash
npm run eval:skills
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` 矩阵复用 `research_recommendation`，未加新决策 ID，未触发新 oracle，无回归。

```bash
npm run metrics:chars
```

Result: research SKILL.md 2274 → 2549 chars（+275，新增条件触发段）；`references/buy-vs-build-matrix-template.md` 不计入 SKILL.md token gate。默认链受 detail A2 叠加影响为 4218 chars，仍在合理范围。

## Unverified

- ⚠️ 矩阵在真实前端项目的选型有效性属 effectiveness，本 skills-suite 是 compliance/regression harness（PD7），不证明独立有效性。需 held-out 或外部审阅的 effectiveness suite 另证。
- 矩阵触发边界（「标准件密集信号」）在不同项目类型上的判定一致性未实测。

## Rollback

Revert 本 CU 关联的四项：
1. 删除 `plugins/forge/skills/research/references/buy-vs-build-matrix-template.md`。
2. 还原 `plugins/forge/skills/research/SKILL.md` 文档约束段（删除新增段落）。
3. 删除 `docs/features/research-buy-build-matrix/` 及其 goal.md。
4. 删除本 CU。

无版本号变更，无需回退 package.json / plugin.json。

## Authoritative Documents Synchronized

- `docs/features/research-buy-build-matrix/goal.md`：feature 目标/边界/AC/FD 决策已建立。
- `plugins/forge/skills/research/SKILL.md`：文档约束段已写明矩阵条件触发与引用。
- `plugins/forge/skills/research/references/buy-vs-build-matrix-template.md`：结构化模板已建立，为矩阵唯一格式事实源。
