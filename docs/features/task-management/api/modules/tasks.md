# Tasks 模块

> 依赖 api/contract.md 共享决策 D1-D7，遵循共享约束。

## 需求

- F1: 用户可以创建任务（标题、描述、状态、指派人）
- F2: 用户可以查询任务列表（支持分页、过滤、排序）
- F3: 用户可以查看单个任务详情
- F4: 用户可以更新任务（标题、描述、状态、指派人）
- F5: 用户可以删除任务（软删除）

## 验收条件

- AC1: 创建任务时，标题为必填，1-200 字符
- AC2: 任务状态只能是 `todo` / `in_progress` / `done`
- AC3: 列表接口必须分页，默认 page=1, pageSize=20
- AC4: 更新时必须携带 version，版本冲突返回 409
- AC5: 创建时必须携带 Idempotency-Key
- AC6: 软删除，已删除任务不出现在列表中

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

- `(tenantId, deletedAt, createdAt)` 复合索引 — 列表查询主路径

### 性能

- `GET /tasks` p99 < 200ms
- `total` 用 COUNT(*)，大表时可降级为估算值
