# Forge

> 文档定义目标、边界、完成标准和持久决策；代码定义当前实现。

## 默认工作方式

Forge 默认服务已有项目上的小功能迭代：

| 场景 | 最短链路 |
|------|----------|
| 明确的小功能 | `detail → codegen → review` |
| 边界不清 | `define → detail → codegen → review` |
| 局部 bugfix | 读 goal/代码 → 最小修复 → 回归验证 → review |

`plan`、`test`、`deploy`、`research`、`think` 按风险启用，不因生命周期阶段存在就自动生成文档。BDD 是跨阶段行为表达与追溯方式，不是独立阶段或默认文档类型。

当前发布：24 个决策协议 + 1 个显式 guide。

## 文档事实模型

### 默认事实源

```text
project/
├── AGENTS.md
├── CLAUDE.md                         # 可选平台指针
├── DESIGN.md                         # 可选跨 feature 设计系统
├── docs/
│   ├── project.md                    # 共享项目决策、约束、领域语言
│   ├── adr/                          # 可选：难逆且反直觉的项目决策
│   ├── features/<feature>/
│   │   ├── goal.md                   # feature 核心合约
│   │   ├── modules/*.md              # 可选模块接口与不变量
│   │   ├── PRD.md                    # 可选独立产品合约
│   │   ├── interaction-spec.md       # 可选复杂交互交付物
│   │   ├── research-brief.md         # 可选独立研究证据
│   │   ├── testing/strategy.md       # 可选测试治理
│   │   └── deploy/plan.md            # 可选发布/迁移/回滚方案
│   ├── change-units/CU-*.md          # 变更历史、风险、验证证据
│   └── thinking/                     # 可选临时可复用分析，不是事实源
├── src/
└── tests/
```

默认小功能只创建：

- `docs/features/<feature>/goal.md`
- 必要时 `modules/*.md`
- `docs/change-units/CU-*.md`
- 代码与测试

### 独立产物门

额外文档必须证明至少一个独立责任，并且合并回 goal/module 会明显降低可用性：

- 不同 consumer 或 owner；
- 不同更新周期；
- 独立 review、审批、审计、交接或运维责任。

否则：

- 探索、计划、BDD/场景矩阵、review 和 thinking 留在对话/issue；
- 接受的结论写回 project、goal、module、ADR、测试或 CU；
- 自动化场景写进测试代码。

默认不创建 `changelog.md`、`timeline.md`、`status.md`、`trace-*.md`、`plan.md`、`testing/test-cases.md`、`.feature` 用例库或 idea brief。

## 核心纪律（D1–D10）

- **D1 决策留痕**：记录选择、理由和被拒方案；项目级写 project/ADR，feature 级写 goal/module。
- **D2 目标约束**：目标文档不规定无必要的实现路径。
- **D3 人类决策**：关键取舍由人确认，AI 执行并留痕。
- **D4 最小变更**：只实现当前目标所需的最小完整 patch，不引入未要求的抽象、依赖或兼容层。
- **D5 范围控制**：只编辑直接相关文件；无关问题只报告。
- **D6 暴露假设**：高影响假设不成立时停下确认。
- **D7 验证**：每次变更执行最窄有效验证或说明不能验证的原因。
- **D8 累积升级**：同类失败两次，复查 goal/约束，不继续盲修。
- **D9 运行实证**：代码完成至少有测试、构建、类型检查或可运行证据之一。
- **D10 复杂度分级**：L0 patch / L1 轻量链 / L2 标准链 / L3 完整链，可双向调整。

## Skill 产物职责

| Skill | 默认产出 | 何时落独立文档 |
|-------|----------|----------------|
| brainstorm / business-alignment | 对话结论 → project/goal | 不创建 idea brief |
| define | 更新 goal | 独立产品 owner/审批时 PRD |
| research | 方案菜单 → project/goal/ADR | 独立研究复核/交接时 research brief |
| interaction-design | goal/module 中的流程与状态 | 独立复杂 UX review 时 interaction spec |
| fe-system | goal/module 中的局部视觉约束 | 跨 feature 设计系统时 DESIGN |
| technical-design | project 或 goal | 难逆项目决策时 ADR |
| detail | goal + 必要 modules | 不创建阶段报告 |
| plan | 对话/issue 中的任务序列 | 不创建 plan.md |
| codegen | src + tests + CU | 不创建 Trace |
| test-strategy | 对话中的风险策略 | 独立 QA/合规治理时 strategy |
| test-cases | BDD 场景矩阵/测试代码 | 不创建 test-cases.md |
| review | 对话 findings | 只有权威文档变更才写 CU |
| deploy | 对话发布清单 | 生产/迁移/回滚交接时 deploy plan |
| think | 对话分析 | 多决策复用且有失效条件时 thinking |
| learn | 回写权威事实 | 用户确认后写 CU |

## 执行协议

1. Observe：读相关 goal 首屏、必要 modules、project 和仓库状态。
2. Orient：确认目标、非目标、假设、风险、验证方式和权威事实源。
3. Decide：选择最短 skill 链；额外文档先过独立产物门。
4. Act：实现最小完整变更。
5. Verify：运行项目现有脚本中最窄有效的检查。
6. Persist：同步权威文档，写一个 CU；不维护平行历史文件。

## Change Unit

每次完成的 feature、bugfix、refactor、release 或方法论更新写：

```text
docs/change-units/CU-<YYYYMMDD>-<slug>.md
```

CU 必须包含 intent、行为变化、影响面、风险、验证命令与结果、未验证项、回滚和权威文档同步结果。编排器只写一个汇总 CU；子 skill 不重复写。

## 模块文档

`modules/*.md` 只用于 `goal.md` 无法清楚承载的模块公共接口、不变量、依赖和模块特有约束。不得复制 feature 目标、完成标准或内部实现步骤。超过 200 行时按真实子领域拆分。

## Forge 仓库

```text
plugins/forge/skills/       # 发布 skills；一级目录 flat list
experiments/skills/         # 未通过评测的候选 skills
archive/skills/             # 退役 skills
evals/skills-suite/         # benchmark contract 和 fixtures
scripts/                    # validator / benchmark / metrics
tests/                      # 工具链测试
```

版本发布时同步：

- `package.json`
- `plugins/forge/.claude-plugin/plugin.json`
- `plugins/forge/.codex-plugin/plugin.json`

验证命令：

```bash
npm test
npm run validate
npm run eval:skills
npm run metrics:chars
```

真实 benchmark 运行需要 Codex CLI：

```bash
node scripts/install-local-codex-plugin.mjs
node scripts/run-skills-benchmark.mjs --case <case-id>
node scripts/evaluate-skills.mjs --report <report.json>
```
