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
| PD11 | Kernel 非干扰边界 | Kernel 约束外部目标与证据，不替模型选择阶段、Skill、实现策略或内部推理；有效性以同模型 Forge/no-Forge 的 outcome、安全和证据配对比较 | 模型能力增强时仍可直接行动、跳过或拒绝无关能力，Forge 不把既有流程变成能力上限 | 固定 Skill 命中率；按模型名称假定能力全序；以阶段完成代替目标结果 |

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
