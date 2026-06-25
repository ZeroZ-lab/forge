# Storage 模块

> 覆盖 task-management 的表清单、索引、迁移和备份约束。数据字段权威定义在 `modules/tasks.md` 与 `modules/comments.md`。

## 责任与不变量

- 负责 User、Task、Comment 和 Idempotency Key 的持久化边界、索引、迁移和备份。
- 不重新定义 `modules/tasks.md` 与 `modules/comments.md` 的字段合约。
- tenant 隔离、软删除、父子可见性、乐观并发和幂等不变量来自 `goal.md` AC4-AC7。

---

## 表清单

| 表名 | 来源 | 说明 |
|------|------|------|
| users | goal.md 认证上下文 | 用户、角色和租户归属 |
| tasks | modules/tasks.md | 任务主体 |
| comments | modules/comments.md | 任务评论 |
| idempotency_keys | D5 | 幂等键存储 |

## 索引规划

| 表 | 索引名 | 列 | 用途 |
|---|--------|---|------|
| tasks | tasks_tenant_deleted_created_idx | (tenantId, deletedAt, createdAt) | 列表查询主路径 |
| tasks | tasks_tenant_status_idx | (tenantId, status, deletedAt) | 按状态过滤 |
| tasks | tasks_tenant_assignee_idx | (tenantId, assigneeId, deletedAt) | 按指派人过滤 |
| comments | comments_task_created_idx | (taskId, createdAt) | 评论列表查询 |
| idempotency_keys | idempotency_expires_idx | (expiresAt) | 过期清理 |

## 迁移约束

- 所有 schema 变更通过 Drizzle Kit 生成迁移文件。
- 迁移文件必须可回滚。
- 生产环境迁移前必须在 staging 验证。

## 备份约束

- 每日自动备份。
- 备份保留 7 天。
