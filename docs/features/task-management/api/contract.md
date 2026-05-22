# Task Management — API

> 依赖共享决策，遵循共享约束。

## 决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| D1 | 资源建模 | 父子资源 | Comment 是 Task 子资源，1:N 关系明确，嵌套 URL 直观 | A（扁平）关系不直观；C（深度嵌套）过度 |
| D2 | 分页 | page/pageSize | 数据量 < 10 万，后台管理场景，支持跳页 | B（cursor）不需要；C（混合）不值得 |
| D3 | 错误格式 | RFC 9457 | 跨团队标准化需求，HTTP 错误官方标准 | B（轻量）缺乏标准；C（自定义）设计成本高 |
| D4 | 权限失败 | 统一 403 | 项目初期不需要隐藏资源存在性，调试友好 | B（404）调试困难；C（混合）不值得 |
| D5 | 幂等 | Idempotency-Key | 业界标准（Stripe），方案成熟 | B（业务去重）任务无天然唯一标识；C（不处理）有重复风险 |
| D6 | 并发 | version 字段 | 简单直接，项目无 HTTP 缓存基础设施 | B（ETag）需要缓存基础设施；C（不处理）丢失更新风险 |
| D7 | 认证 | Bearer JWT | 无状态，token 自包含用户信息 | B（Session）有状态；C（API Key）不适合用户认证 |

**默认排序**：`createdAt desc`

---

## 共享数据模型

```
User: {
  id: string (ULID)
  email: string (unique)
  name: string
  role: "admin" | "member"
  tenantId: string
  createdAt: string (ISO 8601)
  updatedAt: string (ISO 8601)
}
```

---

## 错误格式（RFC 9457）

```json
{
  "type": "https://api.example.com/errors/<error-type>",
  "title": "Human Readable Title",
  "status": 400,
  "detail": "Specific error description.",
  "instance": "/tasks/abc123",
  "extensions": {
    "code": "UPPER_SNAKE_CASE",
    "requestId": "req_xxx"
  }
}
```

**错误码注册表**：

| Code | Status | 触发场景 |
|------|--------|---------|
| INVALID_REQUEST_BODY | 400 | 请求体校验失败 |
| TOKEN_EXPIRED | 401 | JWT 过期 |
| TOKEN_INVALID | 401 | JWT 无效或缺失 |
| INSUFFICIENT_PERMISSIONS | 403 | 角色权限不足 |
| TASK_NOT_FOUND | 404 | 任务不存在或已删除 |
| IDEMPOTENCY_KEY_CONFLICT | 409 | 相同 key + 不同 body |
| TASK_VERSION_CONFLICT | 409 | version 不匹配 |
| ASSIGNEE_NOT_FOUND | 422 | assigneeId 不在当前租户 |

---

## 技术选型

| 层 | 选择 | 理由 |
|---|------|------|
| Runtime | Node.js 20+ | LTS，性能足够 |
| Framework | Hono | 轻量，TypeScript 优先 |
| Validation | Zod | 运行时 schema，类型安全 |
| Database | PostgreSQL 16 | 成熟，JSON 支持好 |
| ORM | Drizzle | 类型安全，轻量 |
| Auth | jose (JWT) | 纯 JS，无 native 依赖 |
| ID | ULID | 时间有序，string 存储 |

---

## API 专属约束

### 安全

- 不暴露 `tenantId` 到 API 响应
- sort/filter 参数白名单，不透传数据库字段名
- JWT 有效期 24h，refresh token 7 天

### 性能

- `GET /tasks` p99 < 200ms
- 复合索引：`(tenantId, deletedAt, createdAt)`
- pageSize 上限 100

### 幂等规则（D5）

- 仅 `POST /tasks` 和 `POST /tasks/:id/comments` 需要
- 相同 key + 相同 body → 返回缓存结果（200）
- 相同 key + 不同 body → 409 IDEMPOTENCY_KEY_CONFLICT
- key 存储 24h 后过期

### 并发规则（D6）

- Task 有 `version` 字段，创建时为 1，每次更新 +1
- PATCH 请求必须携带当前 version
- version 不匹配 → 409 TASK_VERSION_CONFLICT
- Comment 不需要并发控制（追加写入，不修改）

---

## 模块索引

| 模块 | 文件 | 端点数 |
|------|------|--------|
| Tasks | modules/tasks.md | 5 |
| Comments | modules/comments.md | 2 |
