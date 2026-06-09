# Changelog — task-management / database

## v1.0 — 2026-05-22 — 初始版本

### 决策
- DB1: PostgreSQL 16
- DB2: ULID
- DB3: 预规划索引
- DB4: Drizzle Kit
- DB5: deletedAt 软删除

### 文件
- database/goal.md — 新建

### 依赖
- 复用 api/goal.md 共享数据模型（User, Task, Comment）
