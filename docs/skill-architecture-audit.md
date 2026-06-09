# Forge Skills Suite Runtime 审计

> 审计日期：2026-05-25（更新于 2026-06-07）
> 审计目标：判断 Forge 在运行时使用这套 skills 时，是否能形成目标验证闭环。审计对象不是 skill 文件本身是否长成控制系统，而是这些协议节点被调用、串联、反馈和修正时是否能验证目标达成。

## 1. 基线

当前仓库基线：

- `node scripts/validate.mjs` 通过：`Forge validation passed (24 skills, version 0.24.1).`
- 当前 suite 暴露 24 个一级 `plugins/forge/skills/*` skill，SKILL.md frontmatter 使用目录名作为 skill id。
- `plugins/forge/.claude-plugin/plugin.json` 显式枚举 `skills/*`，`scripts/validate.mjs` 校验 manifest 与目录一致。
- `SKILL.md` frontmatter 已新增为运行时控制面，覆盖全部 24 个 skill。
- `plugins/forge/skills/shared/` 已从产物模板扩展出 concepts、rubrics、red-flags、output-contracts 四类 Knowledge 文件。
- `docs/goal-verification.md` 定义目标验证闭环。

不改 flat 结构的原因：

- Claude Code 只发现 `plugins/forge/skills/` 一级子目录的 `SKILL.md`，当前 flat list 是安装和发现边界。
- Validator 已经把 24 个 skill、frontmatter 短名、manifest 枚举和行数上限作为稳定约束。
- 嵌套分类目录会破坏现有 plugin discovery 和 validator 约束；分类应该进入 registry 元数据，不应进入物理目录。

审计标准来源：

- 当前 Forge 的目标验证链：`codegen -> detail -> review`。
- Forge 的 skill 是运行时协议节点；控制系统产生在"用户任务 -> skill 路由 -> 文档产物 -> 代码实现 -> 目标验证 -> 文档/方法论修正"的运行链路中。
- 单个 skill 可以只是决策协议、执行器、验证器、治理门或知识锚点。
- 本次审计先建立运行时口径，再把 frontmatter registry、Knowledge 层、编排 skill 和 validator/tests 纳入闭环校验。

## 2. 审计标准

本审计以 Forge 运行时为对象。一个 skill 不需要覆盖所有模块，但运行时总体必须能回答以下问题：

| 模块 | 判断问题 |
|------|----------|
| Goal Contract | 目标、非目标、成功标准是否明确？ |
| Use When / Do Not Use When | 什么时候触发，什么时候不该使用？ |
| Monitor | 执行前读取哪些输入、文档、状态和信号？ |
| Analyze | 如何判断问题、风险、冲突和类型？ |
| Plan | 如何选择最小有效行动或分支策略？ |
| Execute | 执行动作、产物和边界是什么？ |
| Feedback / Done When | 如何验收，什么时候停止？ |
| Recovery | 信息不足、目标冲突、工具失败、验证失败时怎么恢复？ |
| Output Contract | 输出结构是否稳定，可被下游消费？ |
| Signal Passing | 问题信号向哪个上游或下游传递？ |
| Red Flags | 哪些情况必须暂停、转向或升级？ |
| Knowledge Anchors | 长解释、模板、评分卡、反例是否放到 references/shared？ |

## 3. 运行时目标验证判定

当前 Forge 的运行时闭环已经具备雏形：

| 模块 | 运行时承担者 | 当前状态 |
|------|--------------|----------|
| Monitor | 当前任务、项目文档、feature 文档、代码、测试、timeline/changelog、用户确认 | SKILL.md frontmatter 已记录 consumes/signals；编排 skill 已补输入状态读取 |
| Analyze | `review`、`codegen`、`detail` 运行时步骤 | 差距分析已固化 |
| Plan | `plan`、`detail`、`deploy` 运行时步骤 | 任务计划、级联更新、发布计划存在 |
| Execute | `codegen`、`fe-artifact`、`deploy` 运行时步骤 | 执行层清晰 |
| Knowledge | `plugins/forge/skills/shared/`、各 skill `references/`、项目 `timeline`、feature `changelog`、产物文档 | shared 已扩展 concepts/rubrics/red-flags/output-contracts |
| Feedback | `validate.mjs`、真实测试、`review`、`fe-accept`、用户验收 | validator 与 `node --test` 已校验 SKILL.md frontmatter、runtime docs 和 signal-flow |
| Recovery | `codegen` 问题升级、`detail` 级联更新、`review` 阻塞项、`deploy` 回滚 | 目标验证链已由 SKILL.md frontmatter 和编排 skill 固化 |

整体结论：

- Forge 不需要把 24 个 skill 都改成统一模板。
- 必须保证运行时闭环完整：状态读取、问题判断、计划选择、目标实现、反馈验收、恢复升级和知识沉淀能串起来。
- 真正需要优先补的是运行时控制面、知识层、行为测试层，以及 4 个编排 skill 的中枢控制能力。
- 领域型决策 skill 可以继续保持"方法论 + 决策点 + 文档约束"的形态，只需在必要处补输入状态、问题分类或恢复规则。
- 运行时闭环定义见 `docs/goal-verification.md`。

## 4. 逐项扫描结果

以下逐项扫描判断每个 skill 在运行时系统中承担什么角色、是否缺少完成该角色所需的运行时控制信息。

### brainstorm

- 当前强项：三轮探索循环完整，`Understand -> Expand -> Converge & Validate` 有自适应信号；红旗和验证清单较完整。
- 缺口：作为探索阶段的前馈输入器，恢复路径仍偏隐式。
- 建议动作：只补"探索素材不足或方向无法排序时如何恢复"。
- 优先级：P2。

### business-alignment

- 当前强项：承诺四要素清晰，能把探索方向转成用户、指标、资源和 Go/No-Go。
- 缺口：作为承诺决策门，要素冲突时的停止/降级协议不足。
- 建议动作：补"用户、指标、资源不对齐时如何停下、记录 No-Go、回到 brainstorm 或收缩范围"。
- 优先级：P2。

### define

- 当前强项：`约束 -> 场景 -> 验收` 能把需求转成可测试 PRD；范围排除和验收条件意识强。
- 缺口：作为目标定义器，需求输入质量判断不足。
- 建议动作：补需求输入状态读取清单和模糊需求分级，明确何时先补 business-alignment 或回到用户确认。
- 优先级：P2。

### research

- 当前强项：把 PRD 中的技术信号翻译成子问题地图、算法菜单和组合建议。
- 缺口：作为研究阶段，需要明确纯 CRUD 跳过、方案不可行和重大 trade-off 时的升级路径。
- 建议动作：保持 research-brief 作为 technical-design 的输入，并在 registry 中记录路由。
- 优先级：P2。

### interaction-design

- 当前强项：流程优先，覆盖用户路径、信息架构、组件复用和交互细节。
- 缺口：作为交互决策协议，异常流程信息不足时的恢复路径不够明确。
- 建议动作：补"异常流程缺失时如何提问、如何降级为简化交互"的规则。
- 优先级：P2。

### fe-system

- 当前强项：三层 token 方法明确，能把产品气质、页面类型和组件模式生成为 `DESIGN.md`。
- 缺口：核心缺口是设计决策冲突时的恢复规则。
- 建议动作：补"视觉方向冲突时给 2-3 个取舍并等待确认"的恢复规则。
- 优先级：P2。

### technical-design

- 当前强项：trade-off 和被拒方案意识强，能把技术选择固化到 `project.md`。
- 缺口：读取业务目标、团队经验、运维能力、合规约束的标准清单不够结构化。
- 建议动作：补技术设计前的状态读取表。
- 优先级：P2。

### api-design

- 当前强项：D1-D7 覆盖资源、分页、错误、权限、幂等、并发和认证。
- 缺口：文件 197 行，接近上限；通用 API 评分标准和反例还未抽到 shared。
- 建议动作：先把通用 API rubrics / red flags 抽到 `plugins/forge/skills/shared/`。
- 优先级：P1。

### db-design

- 当前强项：DB1-DB5 覆盖选型、ID、索引、迁移和软删除；边界与 api-design 切分清晰。
- 缺口：数据模型冲突、迁移风险、API/DB 边界问题分类不足。
- 建议动作：补"数据模型冲突 / 迁移不可逆 / API 资源与表结构不一致"的处理。
- 优先级：P2。

### frontend-design

- 当前强项：组件拆分、数据流、服务端状态/客户端状态边界清晰。
- 缺口：API 缺失、DESIGN 缺失、状态方案冲突时没有明确停止或降级规则。
- 建议动作：补"缺 API 合约先停、缺 DESIGN 先转 fe-system"的恢复协议。
- 优先级：P2。

### plan

- 当前强项：P1-P5 覆盖识别、垂直切片、排序、验证和检查点；任务粒度规则具体。
- 缺口：读取 contract/modules、依赖图、风险点和验收条件的前置检查表没有单列。
- 建议动作：补读取状态清单。
- 优先级：P2。

### codegen

- 当前强项：最接近完整闭环；`读 -> 生 -> 验 -> 修`，信号传递和验证摘要已经具备。
- 缺口：文件 193 行，不能膨胀。
- 建议动作：作为标杆保留。
- 优先级：P1。

### fe-artifact

- 当前强项：五层翻译能把 DESIGN、交互、API 和组件规格实现为前端代码。
- 缺口：前端不可运行、无法预览、设计缺失时的停止条件不足。
- 建议动作：补"不可运行不宣称通过"的恢复和停止规则。
- 优先级：P2。

### test-strategy

- 当前强项：风险驱动测试策略清晰，反对虚荣覆盖率，强调 CI 和隔离。
- 缺口：测试输入状态、关键路径风险、外部依赖风险读取没有单列。
- 建议动作：补测试策略前的状态读取清单和风险信号判断。
- 优先级：P2。

### test-cases

- 当前强项：验收条件到正常、边界、错误、数据测试用例的映射完整。
- 缺口：验收条件缺失、不可测试时没有明确转向。
- 建议动作：补"验收条件不可测试时回到 define/detail"的恢复规则。
- 优先级：P2。

### fe-accept

- 当前强项：四维验收覆盖功能、视觉、适应性和性能；强调真实预览和证据。
- 缺口：问题分级、返工/豁免规则还可更结构化。
- 建议动作：补 P0/P1/P2 分类、豁免条件和返工后复验规则。
- 优先级：P2。

### review

- 当前强项：Governance 标杆；独立审查、差距分析、P0/P1/P2 已经完整。
- 缺口：Goal Review / Scope Control / Safety Review 等治理子能力还没有结构化表达。
- 建议动作：后续补 shared governance rubrics。
- 优先级：P1。

### deploy

- 当前强项：可逆发布意识强，覆盖环境、容器、管道、灰度和回滚。
- 缺口：上线前状态读取和事故信号判断没有单列。
- 建议动作：补"发布前读取代码审查、测试结果、监控可用性"的状态清单。
- 优先级：P2。

### think

- 当前强项：把深度思考从对话中抽出为可追踪产物。
- 缺口：必须防止 thinking 文档绕过原阶段 contract，变成隐藏决策源。
- 建议动作：registry 将其标为 knowledge/governance 节点。
- 优先级：P1。

### init

- 当前强项：能编排 business-alignment、technical-design、fe-system，并生成项目级文件。
- 缺口：编排型中枢，需要补输入状态判断和恢复规则。
- 建议动作：明确如何判断缺哪些项目级文件、如何处理已有项目。
- 优先级：P1。

### design

- 当前强项：能串联 interaction-design 和 fe-system，保持设计阶段历史汇总。
- 缺口：当前最薄；作为设计阶段编排器，需要补输入状态判断、分支选择和恢复规则。
- 建议动作：补纯后端跳过、已有 DESIGN 冲突的恢复规则。
- 优先级：P1。

### detail

- 当前强项：已有加载判断、API -> DB -> Frontend 顺序和问题信号接收。
- 缺口：作为目标细化器，还缺更明确的输入信号和恢复决策。
- 建议动作：补完整结构，明确 codegen 问题信号如何进入 contract 复查决策。
- 优先级：P1。

### test

- 当前强项：能编排 test-strategy 和 test-cases，并保持历史汇总。
- 缺口：编排型且很薄；缺分支判断和失败恢复。
- 建议动作：补分支和恢复规则。
- 优先级：P1。

## 5. Suite 层缺口

### SKILL.md frontmatter 已落地

`SKILL.md` frontmatter 是运行时控制面，不替代 plugin manifest。它记录：

- skill name / path / phase / type
- triggers / avoid_when
- consumes / produces
- stop_conditions
- output_contract
- maturity

### shared 已扩展为 Knowledge 层

`plugins/forge/skills/shared/` 保留产物模板，同时新增共享知识：

- `plugins/forge/skills/shared/concepts/`
- `plugins/forge/skills/shared/rubrics/`
- `plugins/forge/skills/shared/red-flags/`
- `plugins/forge/skills/shared/output-contracts/`

### validator 校验运行时闭环完整性

`scripts/validate.mjs` 校验：

- `docs/skill-architecture-audit.md` 存在
- `docs/goal-verification.md` 存在
- 24 个 skill 均在审计表中出现
- `SKILL.md` frontmatter 覆盖 24 个 skill
- shared Knowledge 层文件存在
- 编排 skill 含输入状态、分支判断和恢复规则
- `codegen -> detail -> review` 验证链存在

## 6. 推荐重构顺序与当前状态

1. 已落地本审计文件，保持 validate 通过。
2. 已落地 `docs/goal-verification.md`，定义运行时闭环。
3. 已新增 `SKILL.md` frontmatter，只做运行时控制面和审计面，不改变 plugin discovery。
4. 已扩展 `plugins/forge/skills/shared/` 为 Knowledge 层。
5. 已优先重构 4 个编排 skill：`init`、`design`、`detail`、`test`。
6. 已以 `codegen`、`detail`、`review` 固化目标验证链。

## 7. 执行边界

本轮执行仍保持以下边界：

- 保留 `plugins/forge/skills/*` 一级 flat discovery，`SKILL.md` frontmatter 使用目录名作为 skill id。
- 不触碰未跟踪 `.claude/`。
- 不改变 `plugins/forge/.claude-plugin/plugin.json` 和 `plugins/forge/.codex-plugin/plugin.json` 的 skill 枚举方式。
- `SKILL.md` frontmatter 保持 YAML 格式，由 `scripts/lib/registry.mjs` 统一解析。

后续如果继续深化，应按问题信号逐步修改领域 skill，而不是一次性套模板。
