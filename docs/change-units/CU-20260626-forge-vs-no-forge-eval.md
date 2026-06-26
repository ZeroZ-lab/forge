# CU-20260626-forge-vs-no-forge-eval

> Superseded note: 同日后续 `CU-20260626-skill-effect-token-budget.md` 将默认比较门从 `1.5x` 提高到 `2.0x`，并将默认链字符预算降到 `4,500`。本 CU 保留初始对照评测能力落地时的事实。

## Type

- Tooling / Evaluation

## Intent

- Trigger: 对抗评审指出 Forge 需要和 no-Forge baseline 做对照，而不是只证明自己满足自己的 oracle。
- Goal: 增加 Forge vs no-Forge 对照评测能力；默认要求 Forge report 相对 no-Forge baseline 达到 `1.5x` 分数提升，且 pass rate 不更差。
- Out of scope: 自动证明 Forge 在所有真实项目上稳定优于 no-Forge；重放命令输出；把真实 benchmark run 数据作为持久发布资产提交进仓库。

## Behavior Change

- `scripts/run-skills-benchmark.mjs` 新增 `--mode forge|no-forge`：
  - `forge` 保持原行为，给 agent 完整 benchmark contract 并要求真实使用 Forge skills。
  - `no-forge` 使用最小提示 baseline：剥离 fixture 中的 Forge scoring 指令，只给产品任务 + 最小 report schema，明确禁止 Forge skills，并要求 `triggered_skills: []`。
- `scripts/evaluate-skills.mjs` 新增对照参数：
  - `--baseline-report <path>`：读取 no-Forge baseline report。
  - `--min-score-ratio <number>`：默认 `1.5`，要求 Forge 分数至少达到 baseline 的该倍数。
  - `--compare-out <path>`：写出机器可读 comparison JSON。
- Baseline report 允许失败 oracle，因为失败项就是对照信号；但仍必须是可评分的 v2 report 形状。
- Forge report 仍必须通过原有 hard oracle gate。

## Affected Surface

- `scripts/lib/run-report.mjs`
- `scripts/lib/benchmark-helpers.mjs`
- `scripts/evaluate-skills/index.mjs`
- `scripts/run-skills-benchmark.mjs`
- `tests/skills-suite-evaluation.test.mjs`
- `tests/run-skills-benchmark.test.mjs`
- `README.md`
- `docs/skill-suite-evaluation.md`
- `evals/skills-suite/README.md`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Baseline 太弱导致 1.5x 容易达成 | 夸大 Forge 改进 | no-Forge prompt 明确只禁 Forge，不禁止正常工程判断；结果仍需真实 run report |
| 评分仍是 report-based | 不能证明命令真实重放或业务语义完全正确 | 本次只补对照门；命令重放仍是后续深化 |
| Baseline oracle 失败被允许 | 可能掩盖 baseline report 缺项 | 只放宽 outcome oracle；report 形状和 case 覆盖仍由 evaluator 检查 |

## Verification

- Commands:
  - `node --test tests/skills-suite-evaluation.test.mjs`
  - `node --test 'tests/*.test.mjs'`
  - `node scripts/validate.mjs`
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/measure-char-footprint.mjs`
  - `git diff --check`
  - `node scripts/install-local-codex-plugin.mjs --help` (installs local forge plugin in this script)
  - `node scripts/run-skills-benchmark.mjs --mode forge --case guide-shortest-chain --run-id 20260626-forge-guide-shortest`
  - `node scripts/run-skills-benchmark.mjs --mode no-forge --case guide-shortest-chain --run-id 20260626-noforge-guide-shortest`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260626-forge-guide-shortest/report.json --baseline-report .eval-runs/skills-suite/20260626-noforge-guide-shortest/report.json --compare-out .eval-runs/skills-suite/20260626-guide-comparison.json`
  - `node scripts/run-skills-benchmark.mjs --mode forge --case default-chain-small-feature --run-id 20260626-forge-default-chain`
  - `node scripts/run-skills-benchmark.mjs --mode no-forge --case default-chain-small-feature --run-id 20260626-noforge-default-chain-clean`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260626-forge-default-chain/report.json --baseline-report .eval-runs/skills-suite/20260626-noforge-default-chain-clean/report.json --compare-out .eval-runs/skills-suite/20260626-default-chain-clean-comparison.json`
- Results:
  - focused skills-suite test exit 0：21 pass / 0 fail，包含 comparison pass 与 50% gate fail 两条新增测试。
  - full `npm test`/`node --test 'tests/*.test.mjs'` exit 0：31 pass / 0 fail，包含 no-Forge fixture sanitizer 回归测试。
  - validator exit 0：`Forge validation passed (25 skills, version 0.41.1).`
  - no-report evaluator exit 0：21 cases、25 skills covered；不声称 behavior effectiveness。
  - metrics exit 0：default chain 8,947 chars；all `SKILL.md` 51,064 chars。
  - `git diff --check` exit 0，无 whitespace error。
  - real partial comparison exit 0：`guide-shortest-chain` Forge 100/100 vs no-Forge 40/100，ratio 2.5x，超过默认 1.5x gate；pass rate 100% vs 100%。
  - real default-chain comparison exit 0：`default-chain-small-feature` Forge 100/100 vs clean no-Forge 23.3/100，ratio 4.3x，超过默认 1.5x gate；pass rate 100% vs 100%。clean baseline 只生成 `src/` + `tests/`，没有 Forge docs/CU。

## Rollback

`git revert <this-commit>`。对照能力是增量入口；不影响无 `--baseline-report` 的现有评分路径。

## 权威文档同步

- `README.md` 增加 Forge vs no-Forge 对照命令。
- `docs/skill-suite-evaluation.md` 增加比较语义、`1.5x` 默认门和 baseline 放宽边界。
- `evals/skills-suite/README.md` 增加 suite 目录内的最短使用方式。
