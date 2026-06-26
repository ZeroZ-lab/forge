# CU-20260626-skill-effect-token-budget

## Type

- Skill runtime / Evaluation gate

## Intent

- Trigger: 用户要求“提高当前 skills 效果 100%，token 消耗降低 50%”。
- Goal: 把可验证目标落成两个硬门：
  - 效果：Forge vs no-Forge 默认比较门从 `1.5x` 提高到 `2.0x`。
  - Token/char：默认高频链 `detail -> codegen -> review` 字符预算从 `9,000` 降到 `4,500`。
- Out of scope: 证明全部 21 个真实 benchmark cases 都提升 100%；把全部 `SKILL.md` 总字符数减半；重放所有真实命令输出。

## Behavior Change

- 压缩默认链三份运行时 skill：
  - `plugins/forge/skills/detail/SKILL.md`
  - `plugins/forge/skills/codegen/SKILL.md`
  - `plugins/forge/skills/review/SKILL.md`
- `scripts/validate.mjs` 默认链硬门改为 `<= 4,500 chars`。
- `tests/skills-suite-evaluation.test.mjs` 的 token budget 测试改为 `--max-default-chain-chars=4500`。
- `scripts/evaluate-skills/index.mjs` 默认 `--min-score-ratio` 从 `1.5` 提高到 `2.0`。
- README 和 suite docs 同步新默认门。

## Affected Surface

- `plugins/forge/skills/detail/SKILL.md`
- `plugins/forge/skills/codegen/SKILL.md`
- `plugins/forge/skills/review/SKILL.md`
- `scripts/validate.mjs`
- `scripts/evaluate-skills/index.mjs`
- `tests/skills-suite-evaluation.test.mjs`
- `README.md`
- `docs/skill-suite-evaluation.md`
- `evals/skills-suite/README.md`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 过度压缩削弱 skill 行为 | 默认链真实执行质量下降 | 保留硬门、红旗、出口、引用；用真实 `default-chain-small-feature` 对照验证 |
| 只降低默认链，不降低全部 skills 50% | 低频 skill 总包体仍较大 | 本次目标限定在高频运行链；total 仍由 56,000 chars 门控制 |
| 2.0x 门仍基于 report scoring | 无法证明所有语义正确性 | 保留真实 partial comparison，并明确后续需命令重放 |

## Verification

- Commands:
  - `node scripts/measure-char-footprint.mjs --json`
  - `node scripts/measure-char-footprint.mjs --max-default-chain-chars=4500 --max-total-chars=56000`
  - `node scripts/validate.mjs`
  - `node --test tests/skills-suite-evaluation.test.mjs`
  - `node --test 'tests/*.test.mjs'`
  - `node scripts/evaluate-skills.mjs`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260626-forge-default-chain/report.json --baseline-report .eval-runs/skills-suite/20260626-noforge-default-chain-clean/report.json --compare-out /tmp/forge-compare-current-2x.json`
  - `git diff --check`
- Results:
  - default chain chars：8,947 -> 4,396（-50.9%），低于 4,500 新门。
  - total `SKILL.md` chars：51,064 -> 46,513（未减半，仍低于 56,000 旧门）。
  - validate exit 0：25 skills，version 0.41.1。
  - focused skills-suite test exit 0：21 pass / 0 fail。
  - full test exit 0：31 pass / 0 fail。
  - no-report evaluator exit 0：21 cases、25 skills covered；不声称 behavior effectiveness。
  - real default-chain comparison exit 0：Forge 100/100 vs clean no-Forge 23.3/100，ratio 4.3x，超过新默认 2.0x gate；pass rate 100% vs 100%。
  - `git diff --check` exit 0。

## Rollback

`git revert <this-commit>`。若只回退 token 压缩，可恢复三份默认链 SKILL.md 并把 `validate`/测试预算改回 9,000；若只回退效果门，可把 `--min-score-ratio` 默认值改回 1.5。

## 权威文档同步

- `README.md`、`docs/skill-suite-evaluation.md`、`evals/skills-suite/README.md` 已同步 2.0x 比较门和 4,500 chars 默认链预算。
