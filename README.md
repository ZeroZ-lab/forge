<p align="center">
  <img src="https://raw.githubusercontent.com/ZeroZ-lab/forge/master/assets/forge-logo.png" alt="Forge logo" width="180">
</p>

# Forge

**文档是目标约束。**

Forge 是一个给 AI 开发协作用的 Kernel-first 决策协议框架。文档定义目标、边界和完成条件；始终加载的 Kernel 约束权限、范围、状态和证据；模型可以直接行动，也可以按边际价值调用任意、多个或零个 Skill。

## 默认适合什么任务

Forge 的默认入口不是完整生命周期或固定 Skill 链，而是**受约束的自主交付**：

- 目标清晰、风险低时，模型直接实现并验证；
- 边界、技术或风险不确定时，模型只加载有边际价值的 Skill；
- 无论是否使用 Skill，完成都必须满足目标、权限、范围、安全和证据门。

Skill 是可选能力，不是行动许可。未调用 Skill 不影响 success；选择一个 Skill 也不会自动触发下一个 Skill。

## 默认运行方式

| 场景 | 默认动作 |
|------|----------|
| 目标清晰、低风险 | 读取事实 → direct action → verification → self-check |
| 行为边界或共享合同不清 | 按需使用 `define` / `detail` |
| 技术方案不确定 | 按需使用 `research` 或领域设计 Skill |
| 多模块或高风险 | 按需使用 `plan` / `test` / `deploy`，并独立 review |

Forge 0.52.0 的 `detail → codegen → review` 固定链继续作为显式 legacy compatibility preset 和 effectiveness 对照，不再是生产完成条件。

## 默认最小文档集

需要持久合约或审计时，默认只有三类事实源：

- `docs/project.md`：跨 feature 的共享决策、约束和领域语言
- `docs/features/<feature>/goal.md`：目标、边界、完成标准和 feature 决策
- `docs/change-units/CU-*.md`：每次变更的历史、风险和验证证据

只有 goal 不足以表达模块公共接口或不变量时，才加 `modules/*.md`。

PRD、interaction spec、research brief、testing strategy、deploy plan、DESIGN 和 ADR 都要先通过“独立产物门”：它必须有不同 owner/consumer、更新周期，或独立审批、审计、交接、运维责任。否则结论写回 project/goal/module，过程留在对话或 issue。

默认不创建 changelog、timeline、status、Trace、plan.md、test-cases.md 或 idea brief。

## 怎么开始

### Claude Code 插件安装

在 Claude Code 中运行：

```text
/plugin marketplace add ZeroZ-lab/forge
/plugin install forge@forge
/reload-plugins
```

安装后可以直接用自然语言描述目标。只有项目已经由 `init`/迁移生成 `AGENTS.md`，或 host 注入了等价 always-on policy 时，Kernel 才是始终加载的控制边界；仅安装 Skills 属于 best-effort 指导。Kernel 可用时，模型可直接行动，也可按 Skill 描述加载必要能力。

如果只想先判断该直接行动还是加载哪些能力，可显式调用 `guide`。它只给出 L0–L3、调用深度和可选能力建议，不执行任务；用户明确要求时也可推荐 0.52.0 legacy preset。

### 默认 prompt

- `按当前目标直接完成最小已验证变更；只在有边际价值时使用 Forge Skill`
- `这个需求边界不清，使用 Forge detail 补合同`
- `对这组高风险修改做独立 Forge review`

插件发布到 Codex / Claude Code 的目录布局和 manifest 约束见 [发布文档](https://github.com/ZeroZ-lab/forge/blob/master/docs/plugin-publishing.md)。

## 按需能力

Forge Skills 是渐进披露的可选能力。下面这些能力只在其独特价值大于上下文、产物和协调成本时使用：

| 能力 | 什么时候再用 |
|------|--------------|
| `plan` | 任务复杂，需要垂直切片、依赖图或并行矩阵；序列留在对话/issue |
| `test` | 需要协调风险策略、场景和测试代码 |
| `deploy` | 需要明确灰度、回滚、监控和发布清单 |
| `research` | PRD 里出现实时、搜索、推荐、优化、媒体处理等技术信号 |
| `think` | 需要 Socratic / First Principles / Red Team 深挖 |
| `review` | L2/L3、P0/P1、发布门或用户明确要求独立审查 |

Advanced 入口见 [高级能力文档](https://github.com/ZeroZ-lab/forge/blob/master/docs/advanced.md)。

常见场景怎么选流程，见 [使用场景文档](https://github.com/ZeroZ-lab/forge/blob/master/docs/usage-scenarios.md)。

## 开发自检

### 仓库自检

```bash
node scripts/validate.mjs
```

自检会校验版本同步、已发布 skill 与 plugin manifest/registry 完全一致、跨平台显式调用策略、skill 行数与字符预算上限、关键编排顺序、测试用例路径，以及稳定／实验／归档隔离。

### 行为测试

```bash
node --test
```

行为测试验证评测合约和工具脚本的静态完整性，不模拟真实 skill 执行。

### Skill Suite 合规/回归评测

```bash
node scripts/evaluate-skills.mjs
```

Skill Suite 是固定场景的 legacy capability compliance/regression harness，用来防止每个 Skill 的显式协议、产物、追踪、验证和范围控制能力回归。评测自检会校验 `evals/skills-suite/manifest.json`：至少 23 个固定任务、覆盖全部 27 个已发布 skill、fixtures 存在、v2 oracle check 可机器读取，并要求变更型任务提供 Change Unit 和目标验证证据。它刻意要求使用 Skill，只证明兼容能力合同，不定义 Kernel-first 生产路由，也不证明真实效果。

要评价一次真实运行是否符合这组固定场景，把 agent 执行记录整理成 `evals/skills-suite/report.schema.json` 格式，然后运行：

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

加 `--verify-disk` 可让评测额外校验报告里声称的 Change Unit 确实落盘，并要求 CU `Verification` 段里的命令能在同一 run 的 `events.jsonl` 中找到 exit 0 的真实执行记录；仅在 Markdown 中写命令不算验证。

也可以直接用 Codex CLI 跑真实 fixtures：

```bash
node scripts/install-local-codex-plugin.mjs
node scripts/run-skills-benchmark.mjs --case thinking-red-team
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/<run-id>/report.json
```

做历史 skills-suite 合规对照时，可用同一 fixture 分别跑 legacy Forge capability prompt 和 no-Forge 最小提示 baseline；它不等同于 action-neutral effectiveness 四臂实验：

```bash
node scripts/run-skills-benchmark.mjs --mode forge --case legacy-chain-small-feature --runs 2 --run-id forge-legacy-chain
node scripts/run-skills-benchmark.mjs --mode no-forge --case legacy-chain-small-feature --runs 2 --run-id no-forge-legacy-chain
node scripts/evaluate-skills.mjs \
  --allow-partial \
  --report .eval-runs/skills-suite/forge-legacy-chain/report.json \
  --baseline-report .eval-runs/skills-suite/no-forge-legacy-chain/report.json
```

默认比较门拒绝单 run 对照：每个被比较的 case 至少要有重复样本和不同 `evidence_id`，并要求 Forge 的置信区间下界超过 baseline 上界，同时 fair-comparison 点估计分数至少达到 no-Forge baseline fair-comparison 分数的 `2.0x` 且 oracle-derived pass rate 不低于 baseline。该 2.0x 阈值目前仅由历史 2 个选定 n=1 案例校准（guide-shortest-chain 与重命名前的 default-chain-small-feature），非 suite 级经验主张；在全 23 case 多 run 实证发布前不应作为能力结论引用。即使比较门通过，它也只是这组固定场景的合规差异信号，不是独立质量 benchmark。

如果全量运行被 Codex usage limit 中断，可以只评分已完成 case：

```bash
node scripts/evaluate-skills.mjs --skip-blocked --report .eval-runs/skills-suite/<run-id>/report.json
```

## 完整能力地图

生产入口已迁移为 Kernel-first，但完整能力地图和 legacy compatibility 没有删：

- 全量 skill 和阶段说明：见 [AGENTS.md](https://github.com/ZeroZ-lab/forge/blob/master/AGENTS.md)
- 架构审计：见 [Skill 架构审计](https://github.com/ZeroZ-lab/forge/blob/master/docs/skill-architecture-audit.md)
- Skills Suite 评测：见 [Skill Suite 评测文档](https://github.com/ZeroZ-lab/forge/blob/master/docs/skill-suite-evaluation.md)

## 8 阶段 × 24 个协议 Skill + 1 个派生视图 Skill + 1 个架构发现 Skill + 1 个 Guide

这套完整地图仍然保留，但不是强制生命周期。需要显式能力、legacy preset 或完整治理参考时，直接读 [AGENTS.md](https://github.com/ZeroZ-lab/forge/blob/master/AGENTS.md) 或 [高级能力文档](https://github.com/ZeroZ-lab/forge/blob/master/docs/advanced.md)。

## 核心理念

```text
旧认知：代码是源代码，文档是衍生品
Forge：文档是目标约束，代码是实现路径
```

目标约束定义做什么、边界在哪、怎么算完成。实现路径会随技术演进变化，但目标和约束不变。

**代码会腐烂，但决策不会过期。**

## 许可证

MIT
