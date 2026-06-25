# Tasks 模块

> 覆盖 Task API、任务数据模型和列表查询约束。依赖 goal.md 共享决策 D1-D7、DB1-DB5。

## 责任与不变量

- 负责 Task 的创建、列表、详情、更新和软删除接口。
- 不负责评论、页面布局或存储运维。
- 标题、状态、分页、并发、幂等和软删除不变量来自 `goal.md` AC1-AC6。
- 所有读写都必须受 tenant 与角色权限约束。

---

## 数据模型

```
Task: {
  id: string (ULID)
  title: string (1-200 chars)
  description: string (0-5000 chars, optional)
  status: "todo" | "in_progress" | "done"
  assigneeId: string | null (FK → User.id)
  creatorId: string (FK → User.id)
  tenantId: string
  version: integer (starts at 1, increments on update)
  deletedAt: string | null (ISO 8601, soft delete)
  createdAt: string (ISO 8601)
  updatedAt: string (ISO 8601)
}
```

---

## 接口合约

```
POST /tasks
  Auth: Bearer JWT required
  Idempotency: Idempotency-Key header required (D5)
  Request: {
    title: string (1-200 chars, required)
    description: string (0-5000 chars, optional)
    assigneeId: string (optional, must be valid User.id in same tenant)
  }
  Response: 201 Created → Task
  Errors:
    - 400 INVALID_REQUEST_BODY
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 409 IDEMPOTENCY_KEY_CONFLICT
    - 422 ASSIGNEE_NOT_FOUND
```

```
GET /tasks
  Auth: Bearer JWT required
  Request: {
    page: integer (default 1, min 1)
    pageSize: integer (default 20, min 1, max 100)
    status: "todo" | "in_progress" | "done" (optional filter)
    assigneeId: string (optional filter)
    sort: "createdAt" | "updatedAt" | "title" (default "createdAt")
    order: "asc" | "desc" (default "desc")
  }
  Response: 200 OK
    {
      data: Task[]
      pagination: { page, pageSize, total, totalPages }
    }
  Errors:
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
  Notes:
    - 只返回当前 tenant 的任务
    - 不返回已软删除的任务（deletedAt IS NULL）
```

```
GET /tasks/:id
  Auth: Bearer JWT required
  Request: path param id (string)
  Response: 200 OK → Task
  Errors:
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 404 TASK_NOT_FOUND
```

```
PATCH /tasks/:id
  Auth: Bearer JWT required
  Concurrency: version field required (D6)
  Request: {
    title: string (1-200 chars, optional)
    description: string (0-5000 chars, optional)
    status: "todo" | "in_progress" | "done" (optional)
    assigneeId: string | null (optional)
    version: integer (required, must match current)
  }
  Response: 200 OK → Task (version incremented)
  Errors:
    - 400 INVALID_REQUEST_BODY
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 404 TASK_NOT_FOUND
    - 409 TASK_VERSION_CONFLICT
    - 422 ASSIGNEE_NOT_FOUND
```

```
DELETE /tasks/:id
  Auth: Bearer JWT required
  Request: path param id (string)
  Response: 204 No Content
  Errors:
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 404 TASK_NOT_FOUND
  Notes:
    - 软删除：设置 deletedAt 为当前时间
    - 关联评论不删除，但不可访问（AC7）
```

---

## 模块特有约束

### 索引

- 详细索引规划见 `modules/storage.md`。

### 性能

- `GET /tasks` p99 < 200ms
- `total` 用 COUNT(*)，大表时可降级为估算值
