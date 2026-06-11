# CU-20260611-learn-skill-sync

## Type

- Bugfix

## Intent

- Trigger: 静态评审发现 `learn` skill 已存在于 `plugins/forge/skills/learn`，但 Claude plugin manifest、skills-suite manifest 和公开文档仍只同步到 23 个 skill。
- Goal: 把 `learn` 同步到插件发布面、评测合约和当前公开说明，恢复 validate、skills-suite evaluator 和 test suite 质量门。
- Out of scope: 不修改 `learn` 方法论内容，不新增 benchmark case，不升级版本号，不运行真实 Codex benchmark。

## Behavior Change

- User-visible behavior: Claude plugin manifest 现在显式包含 `learn` skill；README、AGENTS 和 marketplace 当前说明改为 24 个 skill。
- Internal behavior: skills-suite benchmark 的 `deploy-release` case 覆盖 review → deploy → learn 链路，使 `learn` 重新进入全量覆盖校验。
- Contract change: skills-suite manifest 的 expected skills 和 oracle checks 增加 `review` / `learn` routing 证据。
- Data change: 无。

## Affected Surface

- Features: Forge plugin packaging and skills-suite evaluation.
- Modules: N/A。
- Contracts:
  - `plugins/forge/.claude-plugin/plugin.json`
  - `evals/skills-suite/manifest.json`
  - `README.md`
  - `AGENTS.md`
  - `plugins/forge/.claude-plugin/marketplace.json`
- Code implementation: 无运行时代码改动。
- Tests: `scripts/validate.mjs`、`scripts/evaluate-skills.mjs`、`node --test 'tests/*.test.mjs'`。
- Operations: 无。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `deploy-release` case 承担更多 routing 检查 | 失败时需要看 oracle 细项定位 review/deploy/learn 哪个环节缺失 | 保留独立 `skill_triggered` oracle checks |
| 只跑静态合约，不证明真实 agent 行为有效 | 真实 benchmark 仍可能暴露 routing 行为问题 | 明确 Not verified，后续可运行 `.eval-runs/skills-suite` 真跑 |
| 历史文档仍有 23 个 skill 旧记录 | 读历史时可能误解当前状态 | 不篡改旧验证事实，只更新当前公开说明和本 CU |

## Verification

- Commands: `node scripts/validate.mjs`、`node scripts/evaluate-skills.mjs`、`node --test 'tests/*.test.mjs'`
- Manual checks: 确认 `plugins/forge/skills` 当前有 24 个非 shared skill，且 `learn` 被 Claude manifest 和 skills-suite manifest 覆盖。
- Evidence: validation passed (24 skills, version 0.35.0)；skills-suite benchmark contract passed (14 cases, 24 skills covered)；node --test 100 pass / 0 fail。
- Not verified: 未运行真实 Codex benchmark（`scripts/run-skills-benchmark.mjs`）。

## Rollback

- Revert path: 还原本 CU 对 manifest、README、AGENTS、marketplace、timeline 和本 CU 文件的改动。
- Data rollback: N/A。
- Safe stop condition: validate、evaluate-skills 或 test suite 失败时停止，不继续扩大范围。

## Docs To Sync

- [x] README 当前 skill 计数
- [x] AGENTS 当前 skill 计数
- [x] marketplace 当前 skill 计数
- [x] changelog / timeline summary

## Completion Evidence

- Code diff: 无运行时代码改动；仅同步 plugin manifest、benchmark manifest 和文档。
- Test evidence: validate passed；evaluate-skills passed；node --test 100 pass / 0 fail。
- Doc sync result: 当前公开说明以 24 个 skill 为准；历史 Change Unit 的旧验证事实保持不变。
- Residual risk: 真实 agent 行为评测未运行。
