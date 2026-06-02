<p align="center">
  <img src="assets/forge-logo.png" alt="Forge logo" width="180">
</p>

# Forge

**文档是源代码，代码是投影。**

Forge 是一个给 AI 开发协作用的决策协议框架。它把文档从代码的衍生品变成项目的唯一真相：人类在关键分歧点做选择，AI 记录决策，并从合约文档生成实现。

## 默认适合什么任务

Forge 的默认入口不是完整生命周期，而是**已有项目上的小功能迭代**：

- 你已经知道大概要做什么，只差把决策补完整
- 你希望 AI 先补 detail 合约，再生成实现，再做偏差 review
- 你不想一开始就展开完整能力地图和整套治理机制

如果需求边界还不清，再往前补 `define`。如果只是一个很小的端点或模块改动，可以直接从 `detail` 起步。

## 默认主链

| 场景 | 默认链路 |
|------|----------|
| 需求明确的小功能 | `detail -> codegen -> review` |
| 边界还不清晰的功能 | `define -> detail -> codegen -> review` |

这就是 Forge 的默认心智模型。`plan`、`test`、`deploy`、`research`、`think`、`learn` 都保留，但属于按需能力，不是首页必修课。

## 默认最小文档集

默认只要求 3 类文档：

- `contract.md`：共享约束和跨领域骨架
- `modules/*.md`：模块级接口、数据和行为
- `changelog.md`：这个 feature 的决策历史

按需再补：

- `PRD.md`：需求边界还不清时再写
- `plan.md`：任务复杂、需要切片或并行时再写
- `testing/`、`deploy/`：测试或发布要独立建模时再开
- `docs/timeline.md`：项目级决策演进或跨 feature 影响时再开
- `docs/status.md`：多 feature 并行协调时再开

## 怎么开始

### Claude Code 插件安装

在 Claude Code 中运行：

```text
/plugin marketplace add ZeroZ-lab/forge
/plugin install forge@forge
/reload-plugins
```

安装后直接用自然语言描述目标，Forge 会按 skill 描述触发相应协议。

### 默认 prompt

- `用 Forge 为已有 feature 补 detail 合约`
- `按 contract 生成这个 feature 的实现`
- `review 当前修改是否偏离 contract`

插件发布到 Codex / Claude Code 的目录布局和 manifest 约束见 [docs/plugin-publishing.md](docs/plugin-publishing.md)。

## 按需能力

Forge 不是只会 4 步主链，只是默认先从这里开始。下面这些能力都保留，但建议在真的需要时再显式进入：

| 能力 | 什么时候再用 |
|------|--------------|
| `plan` | 任务复杂，需要垂直切片、依赖图或并行矩阵 |
| `test` | 需要独立维护测试策略和测试用例产物 |
| `deploy` | 需要明确灰度、回滚、监控和发布清单 |
| `research` | PRD 里出现实时、搜索、推荐、优化、媒体处理等技术信号 |
| `think` | 需要 Socratic / First Principles / Red Team 深挖 |
| `learn` | 同类偏差反复出现，要回到方法论层面修正 |
| `timeline` | 需要项目级演化记录 |
| `status` | 需要多 feature 全局协调视图 |

Advanced 入口见 [docs/advanced.md](docs/advanced.md)。

常见场景怎么选流程，见 [docs/usage-scenarios.md](docs/usage-scenarios.md)。

## 开发自检

### 仓库自检

```bash
node scripts/validate.mjs
```

自检会校验版本同步、24 个 skill、frontmatter 短名、skill 行数上限、关键编排顺序、测试用例路径，以及禁止非运行 implementation 投影回流。

运行时控制面也会被校验：`registry.yaml` 必须覆盖全部 24 个 skill，并声明每个协议节点的 `runtime_role`、输入输出、typed edges、偏差信号和升级条件；`docs/runtime-control-loop.md` 和 `docs/skill-architecture-audit.md` 必须存在；shared Knowledge 层、编排 skill 的运行时恢复规则，以及 `codegen -> detail -> review -> learn` 信号链必须完整。`registry.yaml` 是 JSON-compatible YAML，保持严格 JSON 语法以便无依赖校验。

### 行为测试

```bash
node --test
```

行为测试验证 suite 运行时控制面的静态完整性，不模拟真实 skill 执行；它不要求每个 skill 文件都长成完整 MAPE-K 模板。

### Skill Suite 评测

```bash
node scripts/evaluate-skills.mjs
```

评测自检会校验 `evals/skills-suite/manifest.json`：至少 10 个固定任务、覆盖全部 24 个 skill、fixtures 存在、oracle check 可机器读取。这只证明评测合约完整，不证明某次 agent 行为有效。

要评价真实运行，把 agent 执行记录整理成 `evals/skills-suite/report.schema.json` 格式，然后运行：

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

也可以直接用 Codex CLI 跑真实 fixtures：

```bash
node scripts/install-local-codex-plugin.mjs
node scripts/run-skills-benchmark.mjs --case thinking-red-team
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/<run-id>/report.json
```

如果全量运行被 Codex usage limit 中断，可以只评分已完成 case：

```bash
node scripts/evaluate-skills.mjs --skip-blocked --report .eval-runs/skills-suite/<run-id>/report.json
```

## 完整能力地图

默认入口收窄了，但完整框架没有删：

- 全量 skill 和阶段说明：见 [AGENTS.md](AGENTS.md)
- 运行时控制回路：见 [docs/runtime-control-loop.md](docs/runtime-control-loop.md)
- 架构审计：见 [docs/skill-architecture-audit.md](docs/skill-architecture-audit.md)
- Skills Suite 评测：见 [docs/skill-suite-evaluation.md](docs/skill-suite-evaluation.md)

## 8 阶段 × 24 个 Skill

这套完整地图仍然保留，只是不再作为默认入口。需要完整阶段矩阵、编排 skill 和治理能力时，直接读 [AGENTS.md](AGENTS.md) 或 [docs/advanced.md](docs/advanced.md)。

## 核心理念

```text
旧认知：代码是源代码，文档是衍生品
Forge：文档是源代码，代码是文档在某个模型能力下的投影
```

同一份合约文档：

- 2024 + GPT-4 → Express + React 18 + CSS Modules
- 2025 + Claude 4 → Hono + React 19 + Tailwind
- 2027 + 更强模型 → 更好的实现，合约不变

**代码会腐烂，但决策不会过期。**

## 许可证

MIT
