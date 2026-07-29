# Forge

> 文档定义目标、边界、完成标准和持久决策；代码定义当前实现。

## 默认工作方式：Kernel-first

Forge 的始终加载控制面只管理目标、权限、范围、状态、证据和完成条件。模型可以直接行动，也可以按边际价值调用任意、多个或零个 Skill；未调用 Skill 不影响完成判定。

| 场景 | 默认动作 |
|------|----------|
| 目标清晰、低风险 | 读取权威事实 → 直接最小实现 → 运行验证 → self-check |
| 边界或共享合同不清 | 按需使用 `define` / `detail`，确认后实现 |
| 技术不确定或高风险 | 按信号使用 `research` / `plan` / `test` / `deploy` / 独立 review |
| 局部 bugfix | 建立 red-capable 反馈 → 最小修复 → 回归验证；无反馈循环则 safe stop |

Skill 是可选能力，不是生命周期门票。选择一个 Skill 不自动要求后继；固定 `detail → codegen → review` 仅保留为显式 legacy compatibility preset 和 effectiveness 对照。

根代理是同一用户目标的唯一 Chain Owner：维护全局状态、review 独立性、最终交付和唯一 Change Unit；child Skill 只返回局部证据包。

当前发布：24 个决策协议 + 1 个派生视图 skill + 1 个架构发现 skill + 1 个显式 guide。

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

行为变化或共享合同需要持久化时，默认只创建：

- 必要的 `docs/features/<feature>/goal.md`
- 必要时 `modules/*.md`
- `docs/change-units/CU-*.md`
- 代码与测试

### 独立产物门

额外文档必须证明至少一个独立责任，并且合并回 goal/module 会明显降低可用性：

- 不同 consumer 或 owner；
- 不同更新周期；
- 独立 review、审批、审计、交接或运维责任。

否则：

- 探索、计划、场景矩阵、review 和 thinking 留在对话/issue；
- 接受的结论写回 project、goal、module、ADR、测试或 CU；
- 自动化场景写进测试代码。

默认不创建 `changelog.md`、`timeline.md`、`status.md`、`trace-*.md`、`plan.md`、`testing/test-cases.md` 或 idea brief。

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
- **D10 复杂度分级**：L0 局部 patch / L1 单 feature / L2 多模块中风险 / L3 新项目或高风险；级别决定验证和独立复核地板，不规定 Skill 链。

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
| codegen | 可选实现/bugfix playbook → src + tests | 不创建 Trace；CU 由 Chain Owner 汇总 |
| test-strategy | 对话中的风险策略 | 独立 QA/合规治理时 strategy |
| test-cases | 场景矩阵/测试代码 | 不创建 test-cases.md |
| review | 独立对话 findings | self-check 不冒充独立审查；只有权威文档变更才写 CU |
| deploy | 对话发布清单 | 生产/迁移/回滚交接时 deploy plan |
| think | 对话分析 | 多决策复用且有失效条件时 thinking |
| learn | 回写权威事实 | 用户确认后写 CU |

## 执行协议

1. Observe：读相关 goal 首屏、必要 modules、project 和仓库状态。
2. Orient：确认目标、非目标、假设、风险、验证方式和权威事实源。
3. Decide：可直接行动；只有 Skill 的边际价值高于上下文、产物和协调成本时才加载。额外文档先过独立产物门。
4. Act：实现最小完整变更。
5. Verify：运行项目现有脚本中最窄有效的检查。
6. Persist：Chain Owner 同步权威文档并汇总一个 CU；不维护平行历史文件。

L0/L1 可由 Chain Owner 做 self-check，但不得称为独立 review。L2/L3 或 P0/P1 在宣称 complete/release-ready 前必须使用独立 reviewer/verifier；不可用时保持 partial/正确阻塞并披露残余风险。

独立 reviewer 必须未参与本次实现并使用分离上下文/actor 返回基于目标和 diff 的证据；独立 verifier 必须是实现上下文不能改写输入和留存观察的预声明或 host-private 检查。Chain Owner 自己运行普通测试只算 verification，不能重标成 independent evidence。

## Change Unit

每次完成的 feature、bugfix、refactor、release 或方法论更新写：

```text
docs/change-units/CU-<YYYYMMDD>-<slug>.md
```

CU 必须包含 intent、行为变化、影响面、风险、验证命令与结果、未验证项、回滚和权威文档同步结果。Chain Owner 只写一个汇总 CU；child Skill 不重复写。CU 是执行后的 evidence sink，不控制模型采用哪条路径。

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
