# CU-20260702-detail-module-grain-dual-axis

## Type

Methodology（skill 判据演进，非功能代码）

## Intent

- Trigger：detail 决定是否建 `modules/*.md` 此前只有单一判据轴（文档必要性），在 AI 驱动 codegen 工作流里会漏判一类 module——goal 能写清楚但大到 AI 单次生成失控，或拆细到 Button/Title 级无意义。来源：Lego Vibe 方法论对比分析中识别的「生成稳定性」判据缺失。
- Goal：给 detail 的 Phase 4 叠加第二个判据轴（生成稳定性），两轴交集定 module 粒度。
- Out of scope：A1 标准件清单进 research；A3 委托决策矩阵；A4 learn 跨项目资产化；改 codegen/review；可量化指标；非 AI 场景普适化。

## Behavior Change

- detail Phase 4 从「仅 goal 不足以表达公共接口/不变量时建 modules」升级为**双轴判据**：
  - 轴 1 文档必要性（原判据，仍是首要轴）。
  - 轴 2 生成稳定性——该单元能否被 AI 一次可控生成、人能否独立验收。
- 给出过细反例（Button/Title/Icon 级）与过粗反例（一个 module 塞多个无法独立验收单元）作为粒度锚点。
- 判据定性表述，不引入文件数/行数硬指标。

## Affected Surface

- `plugins/forge/skills/detail/SKILL.md`：Phase 4 段落扩展为双轴判据 + 正反例。
- `docs/features/detail-module-grain/goal.md`：新增 feature goal（目标/边界/AC/决策/风险）。
- `docs/change-units/CU-20260702-detail-module-grain-dual-axis.md`：本 CU。

## Decisions

- FD1：判据定性，不量化。理由：codegen 能力会演进，硬指标会过拟合；定性允许随能力调整权重。
- FD2：两轴取交集而非替代。文档必要性仍是首要轴；生成稳定性是叠加判据。
- FD3：产物落 goal.md + SKILL.md + CU，不建 ADR（forge 无 adr 目录，goal 即 feature 级合约）。
- 拒绝方案：只保留单轴（现状，漏判 AI 失控）；只按生成稳定性轴（破坏文档结构）；引入量化指标（过拟合当前 codegen）。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 定性判据执行者主观偏差 | 同一 goal 不同人 module 粒度不一致 | review lens 对照反例；判据段落给正反例锚点 |
| 生成稳定性轴权重过高致过细拆分 | module 膨胀，文档维护成本上升 | SKILL.md 明确「文档必要性仍是首要轴」 |
| benchmark 未真实跑验证粒度 | AC3 未实证 | 记入 Unverified，待 Codex 真实 run 补 |

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

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` 无回归。

```bash
npm run metrics:chars
```

Result: 默认链 4026 → 4218 chars（+192，新增双轴判据与反例），仍在合理范围；all SKILL.md 48127 chars。

## Unverified

- ⚠️ AC3 benchmark 实跑未验证：`run-skills-benchmark.mjs` 需 Codex CLI 真实执行，本环境无 Codex。module 粒度是否在真实 detail case 上不出现过细/过粗，待 Codex 真实 run 补证。
- 无 held-out / 外部审阅 effectiveness suite 被运行（方法论更新，无功能代码）。

## Rollback

Revert 本 CU 关联的三处改动：
1. `plugins/forge/skills/detail/SKILL.md` Phase 4 还原为单轴表述。
2. 删除 `docs/features/detail-module-grain/goal.md` 及其目录。
3. 删除本 CU。

无版本号变更，无需回退 package.json / plugin.json。

## Authoritative Documents Synchronized

- `docs/features/detail-module-grain/goal.md`：feature 目标/边界/AC/FD 决策已建立。
- `plugins/forge/skills/detail/SKILL.md`：Phase 4 双轴判据已写入，为 detail 唯一行为事实源。
