<p align="center">
  <img src="assets/forge-logo.png" alt="Forge logo" width="180">
</p>

# Forge

**文档是源代码，代码是投影。**

Forge 是一个为 AI 开发工作流设计的决策协议框架。它把文档从代码的衍生品变成项目的唯一真相：人类在关键分歧点做选择，AI 记录决策并从合约文档生成实现。

## 核心理念

```
旧认知：代码是源代码，文档是衍生品
Forge：文档是源代码，代码是文档在某个模型能力下的投影
```

同一份合约文档：

- 2024 + GPT-4 → Express + React 18 + CSS Modules
- 2025 + Claude 4 → Hono + React 19 + Tailwind
- 2027 + 更强模型 → 更好的实现，合约不变

**代码会腐烂，但决策不会过期。**

## 安装与使用

### Claude Code 插件安装

在 Claude Code 中运行：

```text
/plugin marketplace add ZeroZ-lab/forge
/plugin install forge@forge
/reload-plugins
```

安装后在任意项目中启动 Claude Code，Forge skill 会自动可用。直接用自然语言描述目标，Claude Code 会按 skill 描述触发对应的 Forge 决策协议。

## 开发自检

### 仓库自检

```bash
node scripts/validate.mjs
```

自检会校验版本同步、22 个 `forge-*` skill、frontmatter 短名、skill 行数上限、关键编排顺序、测试用例路径，以及禁止非运行 implementation 投影回流。

运行时控制面也会被校验：`registry.yaml` 必须覆盖全部 22 个 skill，并声明每个协议节点的 `runtime_role`、输入输出、typed edges、偏差信号和升级条件；`docs/runtime-control-loop.md` 和 `docs/skill-architecture-audit.md` 必须存在；shared Knowledge 层、编排 skill 的运行时恢复规则，以及 `codegen -> detail -> review -> learn` 信号链必须完整。`registry.yaml` 是 JSON-compatible YAML，保持严格 JSON 语法以便无依赖校验。

### 行为测试

```bash
node --test
```

行为测试验证 suite 运行时控制面的静态完整性，不模拟真实 skill 执行；它不要求每个 skill 文件都长成完整 MAPE-K 模板。

## 使用方式

Forge 不维护独立的指令层。用户用自然语言表达当前目标，运行时由 skill 描述触发对应决策协议。

运行时闭环的边界是：skill 是协议节点，控制系统产生在“路由 skill -> 读取状态 -> 产出文档 -> 下游投影 -> 反馈偏差 -> 修正文档/代码/方法论”的执行过程中。详见 `docs/runtime-control-loop.md`；suite 控制面由 `registry.yaml` 描述。

| 场景 | 触发的 skill | 产出 |
|------|-------------|------|
| 探索模糊想法 | `forge-brainstorm` | `idea-brief.md` |
| 初始化项目 | `forge-init` | `docs/project.md` + `DESIGN.md` + `AGENTS.md` + `CLAUDE.md` |
| 定义需求 | `forge-define` | `PRD.md` |
| 设计交互和视觉 | `forge-design` | `interaction-spec.md` + `DESIGN.md` |
| 技术详设 | `forge-detail` | `contract.md` + `modules/` |
| 任务分解 | `forge-plan` | `plan.md` + `testing/test-cases.md` |
| 生成代码 | `forge-codegen` | `src/` + `tests/` |
| 测试规划 | `forge-test` | `testing/contract.md` + `testing/test-cases.md` |
| 前端验收 | `forge-fe-accept` | `fe-acceptance-report.md` |
| 独立审查 | `forge-review` | 审查报告 |
| 发布规划 | `forge-deploy` | `deploy/contract.md` |

## 流程选择

不是每个项目都需要走完全部阶段：

| 流程 | 适用场景 | 阶段链路 |
|------|----------|----------|
| 完整 | 新项目从零开始 | brainstorm → init → define → design → detail → plan → codegen → test → review → deploy |
| 标准 | 已有项目，新功能 | define → detail → plan → codegen → test → review |
| 快速 | 已有项目，小功能 | detail → plan → codegen |
| 最小 | 加一个端点或模块 | detail → codegen |

跳过原则：已有 `docs/project.md` 和 `DESIGN.md` 可跳过 init；需求明确可跳过 brainstorm 和 define；纯后端可跳过 design；改动很小时可跳过 plan。

## 8 阶段 × 22 个 Skill

| 阶段 | Skill | 产出 |
|------|-------|------|
| 探索 | `forge-brainstorm` | `idea-brief.md` |
| 定义 | `forge-business-alignment` | `project.md` 业务目标段落 |
| 定义 | `forge-define` | `PRD.md` |
| 设计 | `forge-interaction-design` | `interaction-spec.md` |
| 设计 | `forge-fe-system` | `DESIGN.md` |
| 设计 | `forge-technical-design` | `docs/project.md` 技术决策 |
| 详设 | `forge-api-design` | `api/contract.md` + `api/modules/` |
| 详设 | `forge-db-design` | `database/contract.md` |
| 详设 | `forge-frontend-design` | `frontend/contract.md` + `frontend/modules/` |
| 任务 | `forge-plan` | `plan.md` |
| 构建 | `forge-codegen` | `src/` + `tests/` |
| 构建 | `forge-fe-artifact` | 前端代码 |
| 测试 | `forge-test-strategy` | `testing/contract.md` |
| 测试 | `forge-test-cases` | `testing/test-cases.md` |
| 测试 | `forge-fe-accept` | 前端验收报告 |
| 审查 | `forge-review` | 文档审查或代码审查报告 |
| 交付 | `forge-deploy` | `deploy/contract.md` |
| 编排 | `forge-init` | 项目级初始化文件 |
| 编排 | `forge-design` | 交互 + 设计系统汇总 |
| 编排 | `forge-detail` | API + DB + 前端详设汇总 |
| 编排 | `forge-test` | 测试策略 + 测试用例汇总 |

## 三层文档体系

```
Root 级      → Forge 本身的核心理念和架构（AGENTS.md）
Project 级   → 具体项目的技术选型和设计语言
Feature 级   → 具体功能的全流程产物
```

```
改动频率：
  AGENTS.md       核心原则很少改
  project.md      项目建立时写一次，技术栈升级时改
  DESIGN.md       项目建立时写一次，设计语言升级时改
  PRD.md          功能立项时写，需求变更时改
  contract.md     技术设计时写，大重构时改
  modules/*.md    每次迭代都可能改
```

## 目标项目结构

```
my-project/
├── docs/
│   ├── project.md
│   ├── timeline.md
│   ├── timeline/
│   └── features/
│       └── task-management/
│           ├── contract.md
│           ├── changelog.md
│           ├── api/
│           ├── frontend/
│           ├── database/
│           ├── testing/
│           └── deploy/
├── DESIGN.md
├── AGENTS.md
├── CLAUDE.md
├── src/
└── tests/
```

本仓库自带的 `docs/features/task-management/` 是文档树示例，只保留 contract、modules、testing 和 deploy 等文档产物。

## 核心原则

### 1. 决策留痕

每个技术选择都必须记录：选了什么、为什么选、拒绝什么。框架会换，人会走，决策记录是项目唯一不会过时的东西。

### 2. 文档即源代码

文档不是代码的注释，文档是代码的源头。一份好的 `contract.md` 应该让任何未来模型重建系统。模型越强，从同一份文档生成的代码越好。

### 3. 人类决策，AI 执行

AI 呈现选项 + 代价，人类做选择，AI 记录决策 + 生成实现。AI 不应该替人类做架构决策；在关键分歧点停下来，等人类确认，把选择固化成文档。

## Skill 抽象

Skill 永远抽象，产物文档永远具体。

```
Skill（抽象，不过期）              产物文档（具体，每个项目不同）
───────────────────────────────────────────────────────────────
方法论："资源导向设计"              本项目选了什么：父子资源
不变原则："团队经验 > 技术先进性"    本项目团队熟悉：React 19
业务问题："日活多少？"              本项目答案：< 10 万
                                  ↓
                                  模型搜索后推荐具体方案
                                  人类确认
                                  写入产物文档
```

Skill 只写方法论、业务问题和不变原则；具体技术由模型搜索最新方案后推荐，人类确认后写入产物文档。

## 验证教训

端到端验证的核心结论：要证明文档完备，唯一可靠方法是删除代码后从同一份 `contract.md` 重建，并对比行为一致性。

四层结构各层不可替代：

| 层 | 回答的问题 | 如果缺失 |
|----|------------|----------|
| WHAT | 做什么？怎么算对？ | 测试无法推导，边界条件遗漏 |
| WHY | 为什么这么选？拒绝了什么？ | 新 session 会重新做决策，可能选不同方案 |
| HOW | 字段、状态码、接口、技术栈是什么？ | 两次生成的实现会 diverge |
| CONSTRAINTS | 安全、性能、兼容约束是什么？ | 生成代码缺少非功能性考量 |

WHY 层是 Forge 独有的价值。传统文档常只记 WHAT 和 HOW，但选择理由一旦丢失，未来模型无法做出一致的扩展决策。

## 许可证

MIT
