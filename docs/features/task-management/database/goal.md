# Task Management — Database

> 依赖 api/ 数据模型，遵循共享约束。

## 决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| DB1 | 数据库 | PostgreSQL 16 | 成熟稳定，JSON 支持好，扩展性强，与 Drizzle 配合最佳 | B（MySQL 8）JSON 不如 PG；C（SQLite）不支持并发写入 |
| DB2 | ID 策略 | ULID | 时间有序 + 字符串存储，分布式友好，无协调开销 | B（UUID v7）稍重；C（自增）暴露数量信息 |
| DB3 | 索引策略 | 预规划 | 根据查询模式预先设计索引，避免上线后性能问题 | B（按需）上线后补索引风险大；C（覆盖式）过度索引影响写入 |
| DB4 | 迁移策略 | Drizzle Kit | Drizzle 官方工具，与 schema 紧耦合，类型安全 | B（Prisma Migrate）引入 Prisma 生态冲突；C（手写 SQL）容易不同步 |
| DB5 | 软删除 | deletedAt 字段 | 简单直接，查询时 `WHERE deletedAt IS NULL` | B（归档表）增加复杂度；C（不删除）不满足 AC6 |

---

## 数据模型（复用 api/ 定义）

引用 `../api/goal.md` 共享数据模型。

### 表清单

| 表名 | 来源 | 说明 |
|------|------|------|
| users | api/ 共享 | 用户表 |
| tasks | api/modules/tasks.md | 任务表 |
| comments | api/modules/comments.md | 评论表 |
| idempotency_keys | api/ D5 | 幂等键存储 |

---

## 索引规划（DB3: 预规划）

| 表 | 索引名 | 列 | 用途 |
|---|--------|---|------|
| tasks | tasks_tenant_deleted_created_idx | (tenantId, deletedAt, createdAt) | 列表查询主路径 |
| tasks | tasks_tenant_status_idx | (tenantId, status, deletedAt) | 按状态过滤 |
| tasks | tasks_tenant_assignee_idx | (tenantId, assigneeId, deletedAt) | 按指派人过滤 |
| comments | comments_task_created_idx | (taskId, createdAt) | 评论列表查询 |
| idempotency_keys | idempotency_expires_idx | (expiresAt) | 过期清理 |

---

## 数据库专属约束

### 迁移规则

- 所有 schema 变更通过 Drizzle Kit 生成迁移文件
- 迁移文件必须可回滚
- 生产环境迁移前必须在 staging 验证

### 备份

- 每日自动备份
- 保留 7 天
