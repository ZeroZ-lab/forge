# Changelog — task-management / testing

## v1.0 — 2026-05-22 — 初始版本

### 决策
- T1: 合约测试 + 单元测试
- T2: 每个端点全覆盖
- T3: Factory 生成测试数据
- T4: 不 Mock，用 testcontainers 真实 DB
- T5: CI 全量跑

### 文件
- testing/goal.md — 新建

### 依赖
- 引用 api/modules/tasks.md 验收条件（AC1-AC6）
- 引用 api/modules/comments.md 验收条件（AC7）
- 引用 feature/goal.md 共享约束（多租户、权限）
