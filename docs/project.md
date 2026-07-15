# Forge Project

> Forge 的项目级目标、共享架构决策和长期约束。Feature 文档引用本文件，不复制。

## 目标

- 为 AI coding 提供清晰的目标约束、决策协议和验证闭环。
- 默认优化已有项目的小功能迭代，而不是强迫所有任务走完整生命周期。
- 让同一目标可由不同模型自主实现，同时保留可审计的决策和运行证据。

## 非目标

- 不成为项目管理器、issue tracker 或状态看板。
- 不用阶段数量、模板数量或文档数量代表工程成熟度。
- 不把计划、推理、审查过程或自动化测试场景复制成长期事实文档。

## 领域语言

| 术语 | 定义 |
|------|------|
| Goal | feature 的目标、边界、完成标准和持久决策 |
| Module | 仅在 goal 不足时使用的公共接口与不变量说明 |
| Change Unit | 一次完成变更的历史、影响、风险和验证证据 |
| Gated artifact | 通过独立 owner/周期/审批/交接责任门槛的可选文档 |
| Skill | 抽象决策或执行协议，不等同于文档类型 |
| Orchestrator | 协调多个 skill，并为一次持久变更汇总一个 CU |
| Kernel | 只管理目标、权限、范围、权威事实、证据、任务状态和完成条件的外部控制边界 |
| Direct action | 模型不调用 Skill，直接执行并验证当前目标所需动作的一等路径 |
| Effectiveness attempt report | 一个 model × arm × fixture × repeat 的原子运行记录；只记录受控条件、可观察动作、来源化证据引用、结果声明和成本 |
| Effectiveness run receipt | B04 runner 对一次隔离执行直接观察的 revision、process、输出、workspace delta、artifact 摘要、资源终止原因和清理结果；它是 report 的原始输入，不是 outcome verdict |
| Effectiveness comparison group | 同一 requested model、fixture、source revision、repeat、预算、limits 和 verifier 下的 `no-forge` / `kernel-only` / `adaptive-full` / `legacy-chain` 四份 attempt；arm 是唯一实验变量 |
| Host-sandbox adapter | 由 benchmark 运行环境提供的受信执行边界；必须可审计地承担 filesystem、network、detached process tree 与 live CPU/memory/disk 限制，Forge 只验证 seam 并绑定定义，不把普通 process group 当完整 sandbox |

## 共享决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| PD1 | 默认链路 | `detail → codegen → review` | 最贴近日常 feature 价值流 | 默认完整生命周期 |
| PD2 | 默认事实源 | project + goal/modules + CU | 三类事实分别覆盖共享约束、当前目标和演化证据 | changelog/timeline/trace 并存 |
| PD3 | 额外文档 | 独立产物门 | 文档必须有独立责任，而非阶段映射 | 每个 skill 固定产物 |
| PD4 | 计划与状态 | 对话/issue tracker | 它们是执行状态，不是项目事实 | `plan.md` / `status.md` |
| PD5 | 测试场景 | 自动化场景以测试代码为源 | 避免 AC、场景文档和代码三份漂移 | 默认 `test-cases.md` |
| PD6 | 插件结构 | skills flat list + shared deep modules | 兼容发现机制，同时集中共享知识 | 嵌套发布 skills |
| PD7 | 评测证据分层 | compliance/regression harness + validator/tests；独立有效性需 held-out/external suite | 文档质量和固定场景合规都不能单独证明真实项目效果 | 把 skills-suite 分数当独立质量证明 |
| PD8 | 图表技术 | Mermaid 优先，PlantUML 兜底；图内联进权威文档，不建独立散图 | GitHub 原生渲染零依赖符合 D4，单一兜底避免工具栈膨胀，内联避免图与文档漂移 | 引入 D2/Structurizr/Kroki；用 Excalidraw/draw.io 存二进制 |
| PD9 | 阻塞后的变更证据 | 保留变更时由 standalone 或 orchestrator 写一个部分完成 CU；完全回滚则不写 | 长程或失败任务不能丢失已发生变更、未验证项和回滚证据，同时避免 child 重复写入 | child 自写 CU；阻塞后一律不记录；无变更也写 CU |
| PD10 | Node 支持线 | Node 22 与 24 两条 LTS major；每次发布按官方生命周期复核 | 2026-07-14 两者仍受 LTS 支持，Node 官方建议生产只用 Active/Maintenance LTS | 已 EOL 的 20；仍为 Current 的 26 |
| PD11 | Kernel 非干扰边界 | Kernel 约束外部目标与证据，不替模型选择阶段、Skill、实现策略或内部推理；有效性以同一显式模型的四臂 outcome、安全和证据受控比较 | 模型能力增强时仍可直接行动、跳过或拒绝无关能力，Forge 不把既有流程变成能力上限 | 固定 Skill 命中率；按模型名称假定能力全序；以阶段完成代替目标结果 |
| PD12 | Effectiveness report 事实边界 | 每次 attempt 独立报告受控实验条件、observable events、typed evidence refs、execution/result 分离和来源化成本；Skill 使用只作遥测 | 让后续 runner、verifier、evaluator 共用一个可追溯 seam，同时不把流程当结果 | 复用 skills-suite 自述报告；静默补齐缺失来源；把模型完成声明当 evaluator 结论 |
| PD13 | Effectiveness report 接受入口 | constructor/parser 共用一条 fail-closed schema、受信 experiment plan 与内部引用校验管线；plan 绑定 arm definition 和 capability policy，constructor 不推断来源事实，旧 contract 不隐式迁移 | 消除手工拼装、自授权实验臂和测试/生产双 validator 漂移，同时为 B06 外部证据验证保留清楚边界 | 暴露 schema-only 生产捷径；由 report 自证 arm/policy；自动补时间、模型或来源；未知 schema 约束静默通过 |
| PD14 | Effectiveness attempt 隔离 | 每个 attempt 从 clean source commit 建 shallow non-local workspace clone、runner-private capture Git 与临时 HOME/CODEX_HOME/TMPDIR；B05 预选中性 arm，runner 在 launch 前冻结其 plan binding 且不把 arm 暴露给 child；runner 保存有界原始输出、强制纳入 ignored/untracked 的 pinned-base diff、稳定 artifact manifest、attempt/process 分层时间、失败分类，并对 HEAD/tree/refs/index 和含 ignored 文件的完整 source worktree 做前后 guard；runner 要求预先计算 launcher definition digest，记录 capsule cleanup 结果并校验 artifact 完整性，再经 B03 原子发布 report，cleanup 失败则发布 `infrastructure_error` 并留下可清理路径 | 防止顺序/并发/Git 元数据串扰、事后 arm 改标和旧 runner 自述事实回流；相同受控 source/launcher/env/limits/arm binding 有稳定比较指纹，外部 source 写入会被检测但不被危险地自动回滚，task claim 与 process termination 保持分离 | 复用空目录 skills runner；`git worktree` 共享元数据；普通 diff 漏 ignored/untracked；只 hash interpreter 不 hash launcher；由 adapter 事后选择 arm；自动回滚可能属于用户的并发 source 修改；模型填 execution/diff；把 exit 0 当目标成功 |
| PD15 | 四臂计划与模型调度 | manifest v4 固定 `no-forge`、`kernel-only`、`adaptive-full`、`legacy-chain` 四种唯一 launch policy；adaptive 绑定当前发布 Skill tree 且允许零调用，legacy 绑定 Forge 0.52.0 tree 和升级前默认链；B05 把同组输入/预算/limits/verifier 的 common context 与唯一 arm context 注入实际 command 并绑定 B04 fingerprint，只接受显式 model，固定调用 B04，正式 actual 来自 B04 保留的子进程 transport receipt 并精确匹配 preflight selection；每个已交给 runner 的 arm 即使失败也 finalize host，runtime/固定字段 host receipt 逐臂落盘；四臂只有在公平性与 cleanup 通过后才随 `group.json` completion seal 原子发布 | 将能力暴露限定为唯一实验变量，既能测 Kernel/自适应增益又不束缚更强模型；旧链保留可复现实验对照，运行宿主的安全责任不被 Node process group 伪装，部分报告和调用方伪对象不会冒充完整比较 | 继续使用歧义 `forge` arm；由 report/provider callback 自报 actual/exposure；替换 runner seam；按 arm 改预算或 verifier；默认/回退模型；未 seal 的部分组；把 transport receipt 当远端真实性证明；把 `ulimit`、workspace clone 或 deprecated `sandbox-exec` 宣称为完整隔离 |
| PD16 | 运行时证据封装 | B06 用严格 Evidence Envelope 把单条 evidence 绑定到 issuer/source level、report/group/arm/repeat/request、objective id+digest、event action、时间、workspace 版本和 retained payload；command 交叉核对 exit/output digest，artifact/claim 交叉核对 raw digest/bytes。Envelope 由 runner 为 runner-owned 事实生成、内容寻址，B05 以 comparison-group seal v2 复验后封存；历史 v1 保持原语义，不 retrofit 为 B06 证据。B06 不提升证据等级，也不输出 outcome | 让后续 runtime state、B07 verifier 和 B08 evaluator 引用同一可检测篡改的事实单元，同时保留模型自主动作、source-level 事实边界和历史 seal 兼容性 | 由模型/adapter 自报 envelope；仅校验 JSON shape；把 issuer 字符串当认证身份；把自述升级为 runtime fact；悄悄收紧 group v1；seal 后改写 report；在 B06 内评分 |
| PD17 | 外部 verifier host | B07 把 test/build/typecheck、host-private hidden assertion 与 captured-diff 检查归一成版本化 verifier runtime；verifier-set digest 绑定 host definition 和全部 adapter definition。只有 B05 注入且与受控 verifier set 相符的 runtime 能运行；host contract 必须声明 timeout/output、CPU/内存/磁盘、网络、secret、workspace/evidence、process-tree、non-blocking bridge 与 cancellation 保证，Forge 用 deadline + cancel acknowledgement fail closed，并向 diff verifier 提供 retained diff 与 base snapshot handle。B04 在 cleanup 前执行和复查输入，首次 report 写 independent result/observation 与 B06 claim Envelope；B05 seal v3 从 observation 重推 outcome，v1/v2 保持原语义。结果不判断目标 outcome | 让 verifier failure 成为不能被模型后续文本覆盖的运行事实，同时把 hostile command 隔离明确留给可审计外部 host，而不是由 Forge 主进程伪装或由声明本身冒充实证 | 在 Forge 主进程直接运行项目测试；模型/provider 提交 independent evidence；无限等待或无 cleanup ack；不给 diff/base 输入却声称检查 diff；只验 result 不验 observation；静默收紧 seal v2；把 callback factory 当认证；明文保留 hidden oracle 或错误；任意 verifier set digest；在 B07 推导 completion |

PD11 当前是评测与后续 Kernel 迁移的约束，不改变 PD1 的已发布默认入口；默认调用逻辑只能在 Forge Next B10 基线冻结并通过对应门禁后迁移。

## 文档约束

- `docs/project.md`：共享决策、约束和领域语言。
- `docs/features/<feature>/goal.md`：feature 唯一核心合约。
- `modules/*.md`：可选公共接口、不变量、依赖；不复制完成标准。
- `docs/change-units/CU-*.md`：唯一变更历史与验证证据。
- `AGENTS.md`：运行时适配层，不复制业务事实。
- `CLAUDE.md`：可选薄入口。
- `DESIGN.md`、ADR、PRD、interaction/research/testing/deploy/thinking 文档都按独立产物门创建。

## 工程约束

- 发布 skill 只位于 `plugins/forge/skills/` 一级目录。
- 候选 skill 进入 `experiments/skills/`；退役 skill 进入 `archive/skills/`。
- Claude/Codex manifest 与 `package.json` 版本保持一致。
- 默认链路和全部 SKILL.md 受 token gate 约束。
- 图表选型与放置遵循 `plugins/forge/skills/shared/concepts/diagram-policy.md`：Mermaid 优先，PlantUML 兜底，内联进权威文档。
- 变更以最窄有效的 tests、validator、evaluator 和 token metrics 验证。
- Node 支持范围以 `package.json#engines` 为公开契约，CI matrix 为执行契约；生命周期依据 [Node.js Releases](https://nodejs.org/en/about/previous-releases) 在每次发布时复核。

## 关键命令

```bash
npm test
npm run validate
npm run eval:skills
npm run eval:effectiveness
npm run metrics:chars
npm run check:supported
```

## 风险

- 过度压缩可能把真正独立的产品、设计、合规或运维责任塞回 goal；独立产物门用于防止这一点。
- optional artifact 若重复 goal/project，将重新产生漂移；review 必须检查单一事实源。
- skills-suite 是固定场景的 compliance/regression harness；benchmark contract 只证明评测定义完整，run report 只证明该固定场景合规。真实 skill 效果必须由 held-out 或外部审阅的 effectiveness suite 另证。
- effectiveness suite 必须保持动作路径中立：直接行动和可选 Skill 调用都可成功，只有可验证结果、安全与有效证据进入成功判定。
- effectiveness report 的 schema 通过只证明结构契约成立；B03 校验引用，B06 校验 retained 证据绑定，B08 才能判定 outcome，任何一层都不能被前一层替代。
- B04 run receipt 和 B06 Envelope 只证明 runner 捕获的 bytes 与特定 report/action/workspace 一致；它们仍是 `tool_output`，没有 B07 独立 verifier 不能自称独立证据，没有 B08 不能推出目标完成。
- B06 当前没有外部 issuer trust root；`issuer_ref` 是 runner 边界内的来源声明而非密码学认证。未来若认证 issuer，信任策略必须由 host 外部注入，不能由 Envelope 自带 key 自授权。
