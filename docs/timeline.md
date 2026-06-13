# Timeline — Forge 方法论进化记录

### 2026-06-13 — v0.36.2 发布元数据同步

- **触发**：用户要求 bump version、commit and push。
- **核心判断**：作为 patch release，仅同步版本元数据，不再扩大 runtime skill 改动。
- **改动**：
  - `package.json`、`plugins/forge/.claude-plugin/plugin.json`、`plugins/forge/.codex-plugin/plugin.json` 从 `0.36.1` 升到 `0.36.2`。
  - 新增 Change Unit：`docs/change-units/CU-20260613-v0.36.2-release.md`。
- **验证目标**：版本一致性检查 + `node scripts/measure-token-footprint.mjs --max-default-chain-chars=9000 --max-total-chars=56000` + `node scripts/evaluate-skills.mjs` + `node scripts/validate.mjs` + `node --test 'tests/*.test.mjs'` + `git diff --check`。

### 2026-06-13 — 价值场景评测覆盖

- **触发**：用户追问 Token 优化完成后，还能在哪些场景体现价值，并要求完成前面提到的目标。
- **核心判断**：不再扩大 runtime skill 文本；通过 benchmark 覆盖矩阵证明价值场景，补齐缺失的默认主链小功能 case。
- **改动**：
  - 新增 `default-chain-small-feature` benchmark，覆盖 `detail -> codegen -> review` 的高频小功能路径。
  - 新增 fixture：`evals/skills-suite/fixtures/default-chain-small-feature.md`。
  - manifest 最小 case 数提升到 16，并要求 `node --test`、运行验证证据、CU、goal verification、`artifact_absent docs/project.md`。
  - `docs/skill-suite-evaluation.md` 新增 Value Scenario Coverage 矩阵，映射小功能、模糊需求、前端交付、bugfix 四类价值场景。
  - 新增 Change Unit：`docs/change-units/CU-20260613-value-scenario-coverage.md`。
- **验证目标**：`node scripts/evaluate-skills.mjs` + `node scripts/validate.mjs` + `node --test 'tests/*.test.mjs'` + 单 case 真实 run `default-chain-small-feature`。
- **运行证据**：首次真实 run 被外部 Codex usage limit 阻塞；retry `20260613-default-chain-small-feature-retry` 通过，18/18 oracle，score 100/100。

### 2026-06-12 — 默认链路 Token Footprint 压缩

- **触发**：当前目标要求优化插件效果并降低 Token 消耗。
- **核心判断**：先优化 README 默认主链 `detail -> codegen -> review`，因为它是最高频路径；效果提升不能只靠声明，必须继续依赖真实 run report。
- **改动**：
  - 压缩 `detail`、`codegen`、`review` 三个 SKILL.md。
  - 继续压缩高级阶段 SKILL.md，使全量 runtime 文本下降到 49,608 字符。
  - 新增 `scripts/measure-token-footprint.mjs` 和 `npm run metrics:tokens`。
  - `validate` 增加默认链路 ≤ 9,000 字符、全量 SKILL.md ≤ 56,000 字符预算门。
  - `bugfix-regression-change-unit` benchmark 增加运行验证证据要求。
  - 修复本地 Codex 插件安装脚本，并让 evaluator 接受真实 run 中的 `forge-*` skill 名与具体 goal 路径。
  - 新增 `artifact_absent` oracle，捕捉 bugfix 不应修改项目级文档的范围蔓延。
  - 新增 Change Unit：`docs/change-units/CU-20260612-plugin-token-optimization.md`。
- **验证目标**：`npm run metrics:tokens -- --max-default-chain-chars=9000 --max-total-chars=56000` + `node scripts/validate.mjs` + `node scripts/evaluate-skills.mjs` + `node --test 'tests/*.test.mjs'` + 单 case 真实 run `bugfix-regression-change-unit`（当前 13/13 oracle，100/100；baseline 在新增 scope gate 下 12/13、scope-control 50）+ 代表性 advanced run 已完成 3 case（31/31 oracle，skip blocked 后 99.6/100；deploy-release 被 Codex usage limit 阻塞）。

### 2026-06-11 — Learn skill 发布面同步

- **触发**：静态评审发现 `learn` skill 已存在，但 Claude plugin manifest、skills-suite 覆盖和公开文案仍停在 23 个 skill。
- **核心判断**：以 `plugins/forge/skills/*` 为当前真源，补齐发布面和评测合约，不改历史 Change Unit 的旧验证事实。
- **改动**：
  - Claude plugin manifest 增加 `./skills/learn`。
  - `deploy-release` benchmark case 补齐 review → deploy → learn 覆盖。
  - README、AGENTS、Claude marketplace 当前说明更新为 24 个 skill。
  - 新增 Change Unit：`docs/change-units/CU-20260611-learn-skill-sync.md`。
- **验证目标**：`node scripts/validate.mjs` + `node scripts/evaluate-skills.mjs` + `node --test 'tests/*.test.mjs'`。

### 2026-06-07 — Skills Suite 链路压缩

- **触发**：用户希望压缩当前项目的 skills suite，保证链路完整并删除冗余。
- **核心判断**：删除孤立重复 case，而不是降低覆盖要求；把自然 handoff 的相邻阶段合并成完整链路。
- **改动**：
  - `interaction-design-system` 合并前端实现和验收，覆盖 design → interaction-design → fe-system → fe-artifact → fe-accept。
  - `codegen-implementation` 合并计划和测试用例，覆盖 plan → test-cases → codegen。
  - 删除 `frontend-artifact-acceptance` 和 `plan-test-cases` 两个冗余 fixture，suite 从 12 个 case 压缩到 10 个 case。
  - 新增 Change Unit：`docs/change-units/CU-20260607-skills-suite-compression.md`。
- **验证目标**：`node scripts/evaluate-skills.mjs` + `node scripts/validate.mjs` + `node --test tests/skills-suite-evaluation.test.mjs`。

### 2026-06-07 — Evaluator 目录化

- **触发**：用户希望 evaluator 放到一个目录里。
- **核心判断**：保留 `scripts/evaluate-skills.mjs` 兼容入口，实际实现移动到 `scripts/evaluate-skills/index.mjs`，避免破坏 npm scripts、文档命令和外部调用。
- **改动**：
  - 新增 `scripts/evaluate-skills/` 目录并移动 evaluator 实现。
  - `scripts/evaluate-skills.mjs` 改为薄 wrapper。
  - `scripts/validate.mjs`、`docs/goal_map.yml`、`docs/goal.md`、`docs/goal_verification.md` 同步新路径。
- **验证目标**：`node scripts/evaluate-skills.mjs` + `node scripts/evaluate-skills/index.mjs` + `node scripts/validate.mjs` + `node --test`。

### 2026-06-07 — Skills Suite 评分系统

- **触发**：用户希望 Forge 有完整的 skills suite 评价系统和打分系统。
- **核心判断**：硬性 oracle 仍然是 release gate；分数用于诊断和横向比较，不能替代 pass/fail。评价应覆盖 routing、artifacts、decision gates、verification、scope control、traceability 和 cost/control。
- **改动**：
  - `evals/skills-suite/manifest.json` 新增 `scoring_model`：评分轴、权重和等级阈值。
  - `scripts/evaluate-skills.mjs` 新增 per-case/per-axis/overall score、等级输出和 `--score-out` JSON 导出。
  - `evals/skills-suite/report.schema.json` 新增可选 `metrics`，支持用户干预、turn 数和文件变更数等成本指标。
  - `docs/skill-suite-evaluation.md` 新增评分系统说明。
  - 新增 CU 与 Rebuild Control 文件：`docs/change-units/CU-20260607-skills-suite-scoring.md`、`docs/goal.md`、`docs/goal_verification.md`、`docs/goal_map.yml`。
- **验证目标**：`node scripts/evaluate-skills.mjs` + `node --test tests/skills-suite-evaluation.test.mjs` + `node scripts/validate.mjs` + `node --test`。

### 2026-06-05 — Change Unit 驱动的可追溯重建协议

- **触发**：用户希望重构升级 skills suite，使项目不是一次性生成说明书，而是通过 feature / bugfix / refactor 的可验证补丁包逐步演化。
- **核心判断**：Forge 原有 timeline/changelog 能记录历史，但缺少"每次变更的完整事件记录"和"文档到代码实现映射"。需要把 Change Unit 作为演化事实源，把 Current Snapshot 和 Rebuild Control 作为可重建控制面。
- **改动**：
  - 新增 shared 模板：Change Unit、doc sync checklist、goal_map、goal、goal_verification。
  - 24 个 skill 接入 `Change Unit / Rebuild Control` 协议引用。
  - `SKILL.md` frontmatter 新增 CU、doc sync、goal_map、Current Snapshot、Rebuild Control 信号。
  - skills-suite benchmark 升级到 v2，report 新增 `change_units`、`goal_verification`、`code_map_entries`，并新增 bugfix regression case。
  - validator 新增 packaged plugin 偏移检查和 v2 oracle 校验。
- **验证目标**：`node scripts/validate.mjs` + `node --test` + `node scripts/evaluate-skills.mjs`。

---

## 归档

- 2026-05-31 及更早的方法论进化详见 `docs/timeline/2026.md`。
