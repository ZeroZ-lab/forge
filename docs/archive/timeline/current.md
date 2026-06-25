# Legacy Timeline — Forge 方法论进化记录

> 只读历史。2026-06-25 起，变更历史和验证证据统一使用 `docs/change-units/`。

### 2026-06-25 — Deep module architecture refactor

- **触发**：architecture review 发现 benchmark contract、run report、orchestrator seam 和历史持久化规则缺少 locality。
- **核心判断**：事实源保持 manifest/report schema；复杂解释集中到 deep modules；编排器只依赖子 skill 产出和出口条件。
- **改动**：新增 benchmark-contract、run-report、history-maintenance modules；删除浅层 run helpers；收紧 design/detail/test seam；统一 timeline/status/CU 模式。
- **Change Unit**：`docs/change-units/CU-20260625-deepen-architecture-modules.md`。
- **验证目标**：full tests + validate + evaluator compatibility + token gate + diff check。

### 2026-06-18 — v0.39.0 Skill 质量与成熟度治理

- **触发**：升级计划要求把 Skill 当作可发布、可废弃、可评测的软件模块管理。
- **核心判断**：只自动化稳定约束；新 skill 先实验再晋级，不移动已有稳定 skill。
- **改动**：扩展 skill-quality rubric；新增 `experiments/skills/` 与 `archive/skills/`；validator 接入调用策略、渐进披露和成熟度检查；版本升到 0.39.0。
- **Change Unit**：`docs/change-units/CU-20260618-v0.39-skill-governance.md`。
- **验证目标**：validate + evaluator + token gate + 全量 tests + diff check。

### 2026-06-18 — v0.38 Skill 路由与调用策略

- **触发**：需要减少无效自动触发，并给用户一个只推荐最短链路的入口。
- **核心判断**：Claude Code 与 Codex 的调用控制面不同；保留生命周期 skill 的自然语言触发，只收紧 `guide` 和 `shared`。
- **改动**：新增显式 `guide`；新增跨平台调用策略文档和 benchmark；发布面更新为 25 个 skill。
- **Change Unit**：`docs/change-units/CU-20260618-v0.38-skill-routing.md`。
- **验证**：官方能力核验完成；`guide-shortest-chain` 真实 run 被 Codex usage limit 阻塞。

### 2026-06-18 — v0.37 Bugfix 诊断闭环

- **触发**：已有 bugfix benchmark 无法阻止“未复现先修复”。
- **核心判断**：bugfix 是 codegen 的按需分支；完整方法放 reference，普通 feature 不承担上下文成本。
- **改动**：新增 red-capable 诊断协议；扩展稳定、间歇、不可复现和错误 seam 四类 benchmark。
- **Change Unit**：`docs/change-units/CU-20260618-v0.37-bugfix-diagnosis.md`。
- **验证**：21-case contract 与 token gate 通过；相关真实 run 被 Codex usage limit 阻塞。

### 2026-06-16 — Docs 目录压缩

- **触发**：用户要求压缩整理 docs 目录，确保没有冗余、结构清晰。
- **核心判断**：先对齐活跃示例与 canonical 文档布局，历史记录只归档不改写。
- **改动**：
  - `docs/features/task-management/` 从 per-domain goal 目录压成单 `goal.md + modules/*.md`。
  - `testing/goal.md`、`deploy/goal.md` 改为 `testing/strategy.md`、`deploy/plan.md`。
  - `docs/skill-audit-fix-plan.md` 压缩为历史摘要后移入 `docs/archive/`。
  - `docs/advanced.md` 补齐保留 thinking 产物索引。
  - 新增 Change Unit：`docs/change-units/CU-20260616-docs-directory-compression.md`。
- **验证目标**：`node scripts/validate.mjs` + `node --test tests/*.test.mjs` + `git diff --check`。

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

## 归档

- 2026-06-07 及更早的方法论进化详见 `docs/timeline/2026.md`。
