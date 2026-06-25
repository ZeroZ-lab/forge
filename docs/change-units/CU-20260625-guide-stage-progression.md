# CU-20260625-guide-stage-progression

## Type

- Methodology

## Intent

- Trigger: 完成一个生命周期阶段后， Forge 不会主动提示下一阶段步骤，操作者需记忆链路或重调 `guide`。
- Goal: 在 `guide` 输出格式新增「逐阶段推进」行，调用 `guide` 时一次性给出每阶段出口后的常见后继，让操作者/AI 据此推进。
- Out of scope: 各执行 skill 正文内联「下一步」段（方案 C）；改 default chain 字符阈值。

## Decision

- 选方案 B（改 `guide` 输出），不选方案 C（各 skill 加引用段）。
- 原因：`defaultChain = ['detail','codegen','review']`（`scripts/measure-char-footprint.mjs:9`）字符预算 9000，改前已 8950。方案 C 在 default chain 三个 skill 各加约 112 字符 → 9286 > 9000，超 286，`npm run validate` 失败。default chain 恰是最想提示下一步的链路，但预算无余量。
- 被拒方案 C：破坏 char budget；改 9000 阈值违背诚实度量哲学（最近 commit `56f3ced`/`c205a08` 刚把度量诚实化）。
- 被拒方案「降级」：只给非 default chain 的 define/plan/test/deploy 加段、default chain 回退——default chain 无提示，诉求落空且不一致。

## Behavior Change（对外）

- `guide` 输出格式新增「逐阶段推进」字段：按推荐链路列出每阶段出口后的常见后继（如 detail→codegen、codegen→review、review 通过→deploy 或返工 codegen），声明以本推荐为准、不自动执行。
- 妥协：非阶段完成后实时重新触发，而是 `guide` 调用时一次性给出推进表。`guide` 仍 `disable-model-invocation: true`，不自动调用。

## Affected Surface

- `plugins/forge/skills/guide/SKILL.md`（输出格式 +1 行）
- 新增本 CU

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 推进表非实时，阶段完成后需操作者回看 guide 输出 | 体验弱于自动提示 | guide 输出已含完整链路，AI 可据此在每阶段后提示 |
| guide 输出变长 | guide 字符数增加 | 仅 +1 行；guide 不在 default chain，不影响 9000 预算；total 远低于 56000 |
| 推进表依赖 guide 被显式调用 | 未调 guide 的任务无推进提示 | 与既有路由协议一致，非回归 |

## Verification

- `npm run validate` → `Forge validation passed (25 skills, version 0.40.0).`
- `git diff --stat` → 仅 `plugins/forge/skills/guide/SKILL.md` +1 行。
- 未跑 `npm test` / `npm run eval:skills`：本次为 skill 文档文案增量，无代码/路由逻辑变更，validate 已覆盖 char budget 与 skill 计数。

## 未验证项

- guide 实际调用时「逐阶段推进」行的输出质量（需真实任务驱动，无 fixture）。
- 推进表对操作者推进节奏的实际影响（无行为 benchmark）。

## Rollback

- `git revert` 本 CU 对应改动，或手动删除 `guide/SKILL.md` 输出格式中的「逐阶段推进」行。

## 权威文档同步

- `guide/SKILL.md` 输出格式已同步；AGENTS.md 未涉及逐阶段推进细节，无需改动（链路表已在 AGENTS.md 默认工作方式中存在）。
