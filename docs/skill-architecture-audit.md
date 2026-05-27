# Forge Skills Suite Runtime MAPE-K 审计

> 审计日期：2026-05-25  
> 审计目标：判断 Forge 在运行时使用这套 skills 时，是否能形成控制论 / MAPE-K 闭环。审计对象不是 skill 文件本身是否长成控制系统，而是这些协议节点被调用、串联、反馈和修正时是否形成控制系统。

## 1. 基线

当前仓库基线：

- `node scripts/validate.mjs` 通过：`Forge validation passed (23 skills, version 0.18.0).`
- 当前 suite 暴露 23 个一级 `skills/*` skill，registry 使用 `forge-*` 作为对外协议 id。
- `.claude-plugin/plugin.json` 显式枚举 `skills/*`，`scripts/validate.mjs` 校验 manifest 与目录一致。
- `registry.yaml` 已新增为运行时控制面，覆盖全部 23 个 skill。
- `skills/shared/` 已从产物模板扩展出 concepts、rubrics、red-flags、output-contracts 四类 Knowledge 文件。
- `tests/runtime-control.test.mjs` 已新增为 suite 级行为测试层，验证运行时闭环和信号链。
- `docs/runtime-control-loop.md` 已新增为运行时闭环定义。

不改 flat 结构的原因：

- Claude Code 只发现 `skills/` 一级子目录的 `SKILL.md`，当前 flat list 是安装和发现边界。
- Validator 已经把 23 个 skill、frontmatter 短名、manifest 枚举和行数上限作为稳定约束。
- 嵌套分类目录会破坏现有 plugin discovery 和 validator 约束；分类应该进入 registry 元数据，不应进入物理目录。

审计标准来源：

- 当前 Forge 已有“三层控制回路”：`codegen -> detail -> review -> learn`。
- 网页讨论中的 Harness / MAPE-K 方法论要求运行过程形成可观测、可分析、可规划、可执行、可反馈、可恢复的控制系统。
- Forge 的 skill 是运行时协议节点，不是控制系统本体；控制系统产生在“用户任务 -> skill 路由 -> 文档产物 -> 代码投影 -> 偏差反馈 -> 文档/方法论修正”的运行链路中。
- 单个 skill 可以只是决策协议、执行器、传感器、治理门或知识锚点；不是所有 skill 都必须独立长成完整 MAPE-K。
- 本次审计先建立运行时口径，再把 registry、Knowledge 层、编排 skill 和 validator/tests 纳入闭环校验。

## 2. 审计标准

本审计以 Forge 运行时为对象。一个 skill 不需要覆盖所有模块，但运行时总体必须能回答以下问题：

| 模块 | 判断问题 |
|------|----------|
| Goal Contract | 目标、非目标、成功标准是否明确？ |
| Use When / Do Not Use When | 什么时候触发，什么时候不该使用？ |
| Monitor | 执行前读取哪些输入、文档、状态和信号？ |
| Analyze | 如何判断偏差、风险、冲突和问题类型？ |
| Plan | 如何选择最小有效行动或分支策略？ |
| Execute | 执行动作、产物和边界是什么？ |
| Feedback / Done When | 如何验收，什么时候停止？ |
| Recovery | 信息不足、目标冲突、工具失败、验证失败时怎么恢复？ |
| Output Contract | 输出结构是否稳定，可被下游消费？ |
| Signal Passing | 偏差信号向哪个上游或下游传递？ |
| Red Flags | 哪些情况必须暂停、转向或升级？ |
| Knowledge Anchors | 长解释、模板、评分卡、反例是否放到 references/shared？ |

## 3. 运行时控制回路判定

当前 Forge 的运行时闭环已经具备雏形：

| MAPE-K / 控制论模块 | 运行时承担者 | 当前状态 |
|---------------------|--------------|----------|
| Monitor | 当前任务、项目文档、feature 文档、代码、测试、timeline/changelog、用户确认 | registry 已记录 consumes/signals；编排 skill 已补输入状态读取 |
| Analyze | `forge-review`、`forge-learn`、`forge-codegen`、`forge-detail` 运行时步骤 | 偏差归因、L0/L1/L2、review -> learn 证据链已固化 |
| Plan | `forge-plan`、`forge-detail`、`forge-deploy`、`forge-learn` 运行时步骤 | 任务计划、级联更新、发布计划存在；learn 已补建议排序和防膨胀规则 |
| Execute | `forge-codegen`、`forge-fe-artifact`、`forge-deploy` 运行时步骤 | 执行层清晰，codegen 最接近 actuator |
| Knowledge | `skills/shared/`、各 skill `references/`、项目 `timeline`、feature `changelog`、产物文档 | shared 已扩展 concepts/rubrics/red-flags/output-contracts |
| Feedback | `validate.mjs`、真实测试、`forge-review`、`forge-fe-accept`、用户验收 | validator 与 `node --test` 已校验 registry、runtime docs 和 signal-flow |
| Recovery | `codegen` L1/L2、`detail` 级联更新、`review` 阻塞项、`learn` 方法论进化、`deploy` 回滚 | 快/中/慢恢复链已由 registry 和编排 skill marker 固化 |

整体结论：

- Forge 不需要把 23 个 skill 都改成完整 MAPE-K 模板。
- 必须保证运行时闭环完整：状态读取、偏差判断、计划选择、执行投影、反馈验收、恢复升级和知识沉淀能串起来。
- 真正需要优先补的是运行时控制面、知识层、行为测试层，以及 4 个编排 skill 的中枢控制能力。
- 领域型决策 skill 可以继续保持“方法论 + 决策点 + 文档约束”的形态，只需在必要处补输入状态、偏差分类或恢复规则。
- 运行时闭环定义见 `docs/runtime-control-loop.md`。

## 4. 逐项扫描结果

以下逐项扫描不是要求每个 skill 都完整符合 MAPE-K，而是判断它在运行时控制系统中承担什么角色、是否缺少完成该角色所需的运行时控制信息。

### forge-brainstorm

- 当前强项：三轮探索循环完整，`Understand -> Expand -> Converge & Validate` 有自适应信号；红旗和验证清单较完整。
- 缺口：作为探索阶段的前馈输入器，不需要完整 MAPE-K，但恢复路径仍偏隐式。
- 建议动作：只补“探索素材不足或方向无法排序时如何恢复”，不机械添加完整 MAPE-K 标题。
- 优先级：P2。

### forge-business-alignment

- 当前强项：承诺四要素清晰，能把探索方向转成用户、指标、资源和 Go/No-Go。
- 缺口：作为承诺决策门，不需要完整闭环，但要素冲突时的停止/降级协议不足。
- 建议动作：补“用户、指标、资源不对齐时如何停下、记录 No-Go、回到 brainstorm 或收缩范围”。
- 优先级：P2。

### forge-define

- 当前强项：`约束 -> 场景 -> 验收` 能把需求转成可测试 PRD；范围排除和验收条件意识强。
- 缺口：作为 setpoint 生成器，重点不是完整 MAPE-K，而是需求输入质量判断不足。
- 建议动作：补需求输入状态读取清单和模糊需求分级，明确何时先补 business-alignment 或回到用户确认。
- 优先级：P2。

### forge-research

- 当前强项：把 PRD 中的技术信号翻译成子问题地图、算法菜单和组合建议，补足 define 与 technical-design 之间的技术探索层。
- 缺口：作为研究阶段 setpoint 生成器，需要明确纯 CRUD 跳过、方案不可行和重大 trade-off 时的升级路径。
- 建议动作：保持 research-brief 作为 technical-design 的输入，并在 registry 中记录 `algorithm menu` 与 `technical recommendation` 的路由。
- 优先级：P2。

### forge-interaction-design

- 当前强项：流程优先，覆盖用户路径、信息架构、组件复用和交互细节。
- 缺口：作为交互决策协议，不需要完整闭环，但异常流程信息不足时的恢复路径不够明确。
- 建议动作：补“异常流程缺失时如何提问、如何降级为简化交互、如何转给 fe-system 或 detail”的规则。
- 优先级：P2。

### forge-fe-system

- 当前强项：三层 token 方法明确，能把产品气质、页面类型和组件模式投影为 `DESIGN.md`。
- 缺口：作为 Knowledge/setpoint 生成器，核心缺口是设计决策冲突时的恢复规则。
- 建议动作：补“视觉方向冲突时给 2-3 个取舍并等待确认；已有 DESIGN.md 冲突时记录变更理由”的恢复规则。
- 优先级：P2。

### forge-technical-design

- 当前强项：trade-off 和被拒方案意识强，能把技术选择固化到 `project.md`。
- 缺口：作为架构 setpoint 生成器，读取业务目标、团队经验、运维能力、合规约束的标准清单不够结构化。
- 建议动作：补技术设计前的状态读取表，避免在缺团队/约束信息时直接推荐技术栈。
- 优先级：P2。

### forge-api-design

- 当前强项：D1-D7 覆盖资源、分页、错误、权限、幂等、并发和认证；强调 WHAT/WHY/HOW/CONSTRAINTS。
- 缺口：文件 197 行，接近 200 行上限；不能直接继续加 MAPE-K 标题。通用 API 评分标准和反例还未抽到 shared。
- 建议动作：先把通用 API rubrics / red flags 抽到 `skills/shared/`；不要求它独立实现完整 MAPE-K。
- 优先级：P1。

### forge-db-design

- 当前强项：DB1-DB5 覆盖选型、ID、索引、迁移和软删除；边界与 api-design 切分清晰。
- 缺口：作为存储层决策协议，数据模型冲突、迁移风险、API/DB 边界偏差分类不足。
- 建议动作：补“数据模型冲突 / 迁移不可逆 / API 资源与表结构不一致”的偏差分类和处理。
- 优先级：P2。

### forge-frontend-design

- 当前强项：组件拆分、数据流、服务端状态/客户端状态边界清晰。
- 缺口：作为前端详设协议，API 缺失、DESIGN 缺失、状态方案冲突时没有明确停止或降级规则。
- 建议动作：补“缺 API 合约先停、缺 DESIGN 先转 fe-system、状态方案冲突给取舍”的恢复协议。
- 优先级：P2。

### forge-plan

- 当前强项：P1-P5 覆盖识别、垂直切片、排序、验证和检查点；任务粒度规则具体。
- 缺口：作为 Plan 模块，读取 contract/modules、依赖图、风险点和验收条件的前置检查表没有单列。
- 建议动作：补读取状态清单，把“先画全景再切片”升级成明确 Monitor 阶段。
- 优先级：P2。

### forge-codegen

- 当前强项：最接近完整控制回路；`读 -> 生 -> 验 -> 修`，L0/L1/L2，信号传递、偏差摘要和健康检查已经具备。
- 缺口：作为 suite actuator/controller 标杆，语义基本完整；文件 193 行，不能膨胀。
- 建议动作：作为标杆保留，不需要补完整模板；后续可在 shared 文档里说明它如何对应 MAPE-K。
- 优先级：P1。

### forge-fe-artifact

- 当前强项：五层翻译能把 DESIGN、交互、API 和组件规格投影为前端实现。
- 缺口：作为前端执行子协议，前端不可运行、无法预览、设计缺失时的停止条件不足。
- 建议动作：补“不可运行不宣称通过、无法预览记录阻塞、设计缺失回到 fe-system”的恢复和停止规则。
- 优先级：P2。

### forge-test-strategy

- 当前强项：风险驱动测试策略清晰，反对虚荣覆盖率，强调 CI 和隔离。
- 缺口：作为测试策略 Plan 模块，测试输入状态、关键路径风险、外部依赖风险读取没有单列。
- 建议动作：补测试策略前的状态读取清单和风险信号判断。
- 优先级：P2。

### forge-test-cases

- 当前强项：验收条件到正常、边界、错误、数据测试用例的映射完整。
- 缺口：作为测试用例生成协议，验收条件缺失、不可测试、测试数据无法构造时没有明确转向。
- 建议动作：补“验收条件不可测试时回到 define/detail；测试数据不可重复时先补数据策略”的恢复规则。
- 优先级：P2。

### forge-fe-accept

- 当前强项：四维验收覆盖功能、视觉、适应性和性能；强调真实预览和证据。
- 缺口：作为 Feedback/Sensor，问题分级、返工/豁免规则还可更结构化。
- 建议动作：补 P0/P1/P2 分类、豁免条件和返工后复验规则。
- 优先级：P2。

### forge-review

- 当前强项：Governance 标杆；独立审查、失败模式、偏差归因、P0/P1/P2 已经完整。
- 缺口：作为 Governance/Sensor 标杆，Goal Review / Scope Control / Safety Review 等治理子能力还没有在 shared 或 registry 中结构化表达。
- 建议动作：作为治理型 skill 标杆，后续补 shared governance rubrics，并在 registry 标注 governance 类型。
- 优先级：P1。

### forge-deploy

- 当前强项：可逆发布意识强，覆盖环境、容器、管道、灰度和回滚。
- 缺口：作为交付 Plan/Recovery 模块，上线前状态读取和事故信号判断没有单列。
- 建议动作：补“发布前读取代码审查、测试结果、监控可用性、回滚命令”的状态清单。
- 优先级：P2。

### forge-learn

- 当前强项：慢回路基础成熟，能从 review、changelog、timeline 聚合偏差信号并提出方法论改进。
- 缺口：作为慢回路 Knowledge/Analyze 模块，多个改进建议如何排序、如何避免 skill 膨胀还不够明确。
- 建议动作：补“建议排序、证据强度、行数预算、抽 shared 优先”的计划规则。
- 优先级：P1。

### forge-init

- 当前强项：能编排 business-alignment、technical-design、fe-system，并投影项目级文件。
- 缺口：编排型中枢，需要承担 suite Monitor/Plan 的一部分；当前缺输入状态判断和恢复规则。
- 建议动作：优先重构为编排控制器，明确如何判断缺哪些项目级文件、如何处理已有项目、如何恢复 phase 冲突。
- 优先级：P1。

### forge-design

- 当前强项：能串联 interaction-design 和 fe-system，保持设计阶段历史汇总。
- 缺口：当前最薄；作为设计阶段编排器，需要补输入状态判断、分支选择和恢复规则。
- 建议动作：补设计阶段输入状态判断、纯后端跳过、已有 DESIGN 冲突、用户不确认视觉方向时的恢复规则。
- 优先级：P1。

### forge-detail

- 当前强项：已有加载判断、API -> DB -> Frontend 顺序、漂移检测和 L1 偏差信号接收。
- 缺口：中回路语义有了，但作为 suite controller 还缺更明确的输入信号、偏差分类和恢复决策。
- 建议动作：补完整中回路结构，明确 `codegen` 偏差信号如何进入 contract 复查和级联更新决策。
- 优先级：P1。

### forge-test

- 当前强项：能编排 test-strategy 和 test-cases，并保持历史汇总。
- 缺口：编排型且很薄；作为测试阶段编排器，缺分支判断和失败恢复。
- 建议动作：补“已有 testing/contract、plan 已推导 test-cases、验收条件缺失、测试策略冲突”的分支和恢复规则。
- 优先级：P1。

## 5. Suite 层缺口

### registry.yaml 已落地

`registry.yaml` 是运行时控制面，不替代 plugin manifest。它记录：

- skill name / path / phase / type
- runtime_role
- triggers / avoid_when
- consumes / produces
- stage_next / feedback_to / quality_gates
- signal_routes
- signals_in / signals_out
- escalates_when
- output_contract
- maturity

### shared 已扩展为 Knowledge 层

`skills/shared/` 保留产物模板，同时新增 Harness 所需的共享知识：

- `skills/shared/concepts/`
- `skills/shared/rubrics/`
- `skills/shared/red-flags/`
- `skills/shared/output-contracts/`

### tests 行为测试层已落地

`tests/runtime-control.test.mjs` 已覆盖：

- registry 覆盖 23 个 skill
- 每个 registry entry 具备运行时控制字段
- typed edges 只引用已知 skill 或允许的外部目标
- `signal_routes` 覆盖 fast / middle / slow 偏差信号链
- L2 drift、无回滚、证据不足等恢复阻塞信号存在
- suite 不强制每个 skill 套完整 MAPE-K 标题

### validator 已校验运行时闭环完整性

`scripts/validate.mjs` 除原有 23 个 skill、manifest、frontmatter、行数、共享模板、关键 marker 和 stale pattern 外，已新增：

- `docs/skill-architecture-audit.md` 存在
- `docs/runtime-control-loop.md` 存在
- 23 个 skill 均在审计表中出现
- `registry.yaml` 覆盖 23 个 skill
- `registry.yaml` typed edges 引用完整
- shared Knowledge 层文件存在
- 运行时 MAPE-K 映射存在
- 编排 skill 含输入状态、分支判断和恢复规则
- `codegen -> detail -> review -> learn` 信号链存在

## 6. 推荐重构顺序与当前状态

1. 已落地本审计文件，保持 validate 通过。
2. 已落地 `docs/runtime-control-loop.md`，先定义运行时闭环，不把所有 skill 改成同一种模板。
3. 已新增 `registry.yaml`，只做运行时控制面和审计面，不改变 plugin discovery。
4. 已扩展 `skills/shared/` 为 Knowledge 层，包含 concepts/rubrics/red-flags/output-contracts。
5. 已优先重构 4 个编排 skill：`forge-init`、`forge-design`、`forge-detail`、`forge-test`，补输入状态、分支和恢复规则。
6. 已以 `forge-codegen`、`forge-detail`、`forge-review`、`forge-learn` 固化快/中/慢信号链，不要求所有领域 skill 套完整 MAPE-K 模板。
7. 已对接 validator 和 tests，固化 registry 覆盖、运行时 MAPE-K 映射、signal-flow 和 shared 引用。

## 7. 执行边界

本轮执行仍保持以下边界：

- 保留 `skills/*` 一级 flat discovery，`registry.yaml` 使用 `forge-*` 作为协议 id。
- 不触碰未跟踪 `.claude/`。
- 不把领域型 skill 统一改成完整 MAPE-K 模板。
- 不改变 `.claude-plugin/plugin.json` 和 `.codex-plugin/plugin.json` 的 skill 枚举方式。
- `registry.yaml` 保持 JSON-compatible YAML；如需 YAML 注释或裸 key，必须先引入 parser 并更新 validator。

后续如果继续深化，应按偏差信号逐步修改领域 skill，而不是一次性套模板。
