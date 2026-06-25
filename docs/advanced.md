# Forge Advanced

> 默认入口先服务小功能迭代；这里收纳完整治理链和重文档。

## 什么时候进入 Advanced

只有当默认主链 `define -> detail -> codegen -> review` 不够用时，再展开这里的内容：

- 你在跑完整生命周期，而不是日常 feature patch
- 你需要多 feature 协调，而不是单 feature 局部迭代
- 你在维护 Forge 方法论本身，而不是单次使用
- 你要验证 skill 运行质量，而不是只生成产物

## 运行时治理

- [Skill Architecture Audit](skill-architecture-audit.md)
  说明协议节点、阶段编排和协议角色的审计结论。

## 评测与验证

- [Skill Suite Evaluation](skill-suite-evaluation.md)
  说明 benchmark、report schema 和评分边界。
- [Skill Invocation Policy](skill-invocation-policy.md)
  说明 Claude Code / Codex 调用控制、Guide 路由和上下文预算。
- [Legacy Timeline](archive/timeline/current.md)
  旧方法论时间线，只读历史，不再作为事实源。
- [Legacy Timeline 2026](archive/timeline/2026.md)
  更早的只读归档。

## 协调与进化

- [Feature Stage Tracking Thinking](archive/thinking/feature-stage-tracking.md)
  旧阶段跟踪分析；当前任务状态交给 issue tracker，不进入项目事实模型。
- [Project Value Analysis](archive/thinking/project-value-analysis.md)
  说明 Forge 的核心价值为什么收敛到 AI coding 的目标约束和验证协议。
- [Skill Suite Effect Evaluation](archive/thinking/skill-suite-effect-evaluation.md)
  说明 skills suite 效果评价应看 runtime behavior、traceability 和稳定性。
- `plugins/forge/skills/test/`、`plugins/forge/skills/deploy/`
  需要测试治理或发布治理时再展开。
- [Archived Skill Audit Fix Plan](archive/skill-audit-fix-plan.md)
  2026-05-30 的旧修复计划，仅作历史参考，不作为当前执行入口。

## 默认与 Advanced 的边界

默认入口关注：

- `goal.md`
- `modules/*.md`
- `detail -> codegen -> review`

Advanced 入口关注：

- `docs/change-units/CU-*.md`
- `docs/project.md`、可选 ADR、Change Units
- 完整阶段矩阵
- 目标验证实践
- 评测系统和方法论进化
