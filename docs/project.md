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
- 变更以最窄有效的 tests、validator、evaluator 和 token metrics 验证。

## 关键命令

```bash
npm test
npm run validate
npm run eval:skills
npm run metrics:chars
```

## 风险

- 过度压缩可能把真正独立的产品、设计、合规或运维责任塞回 goal；独立产物门用于防止这一点。
- optional artifact 若重复 goal/project，将重新产生漂移；review 必须检查单一事实源。
- skills-suite 是固定场景的 compliance/regression harness；benchmark contract 只证明评测定义完整，run report 只证明该固定场景合规。真实 skill 效果必须由 held-out 或外部审阅的 effectiveness suite 另证。
