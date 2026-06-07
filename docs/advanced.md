# Forge Advanced

> 默认入口先服务小功能迭代；这里收纳完整治理链和重文档。

## 什么时候进入 Advanced

只有当默认主链 `define -> detail -> codegen -> review` 不够用时，再展开这里的内容：

- 你在跑完整生命周期，而不是日常 feature patch
- 你需要多 feature 协调，而不是单 feature 局部迭代
- 你在维护 Forge 方法论本身，而不是单次使用
- 你要验证 skill 运行质量，而不是只生成产物

## 运行时治理

- [Goal Verification](goal-verification.md)
  说明 `detail -> codegen -> review -> learn` 的目标验证闭环、信号传递和升级路径。
- [Skill Architecture Audit](skill-architecture-audit.md)
  说明运行时控制面、typed edges 和协议角色的审计结论。

## 评测与验证

- [Skill Suite Evaluation](skill-suite-evaluation.md)
  说明 benchmark、report schema 和评分边界。
- [Timeline](timeline.md)
  查看最近的方法论演进记录。
- [Timeline 2026 Archive](timeline/2026.md)
  查看更早的归档演进记录。

## 协调与进化

- [Feature Stage Tracking Thinking](thinking/feature-stage-tracking.md)
  说明为什么 `status.md` 只应在多 feature 协调时启用。
- `skills/learn/`
  用于归纳同类偏差，回到方法论层面修正。
- `skills/test/`、`skills/deploy/`
  需要测试治理或发布治理时再展开。

## 默认与 Advanced 的边界

默认入口关注：

- `contract.md`
- `modules/*.md`
- `changelog.md`
- `detail -> codegen -> review`

Advanced 入口关注：

- `docs/change-units/CU-*.md`
- `docs/change-units/` (Change Units)
- `timeline.md` / `status.md`
- 完整阶段矩阵
- 目标验证和信号传递
- 评测系统和方法论进化
