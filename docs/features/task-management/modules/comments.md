# Comments 模块

> 覆盖 Comment API、评论数据模型和父子资源约束。依赖 goal.md 共享决策 D1-D7、DB1-DB5。
> D1: Comment 是 Task 的父子资源，路由嵌套在 /tasks/:id 下。

## 责任与不变量

- 负责 Task 下的评论创建和列表接口。
- 不负责独立评论生命周期、通知或附件。
- Comment 必须从属于可访问且未删除的 Task；来源：`goal.md` AC7。
- 所有读写都必须受 tenant 与角色权限约束。

---

## 数据模型

```
Comment: {
  id: string (ULID)
  taskId: string (FK → Task.id)
  authorId: string (FK → User.id)
  content: string (1-2000 chars)
  tenantId: string
  createdAt: string (ISO 8601)
}
```

> 存储索引与迁移约束见 `modules/storage.md`。

---

## 接口合约

```
POST /tasks/:taskId/comments
  Auth: Bearer JWT required
  Idempotency: Idempotency-Key header required (D5)
  Request: {
    content: string (1-2000 chars, required)
  }
  Response: 201 Created → Comment
  Errors:
    - 400 INVALID_REQUEST_BODY
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 404 TASK_NOT_FOUND (parent task not found or deleted)
    - 409 IDEMPOTENCY_KEY_CONFLICT
  Notes:
    - AC7: 父任务必须存在且未删除
    - authorId 从 JWT 中提取，不接受请求传入
```

```
GET /tasks/:taskId/comments
  Auth: Bearer JWT required
  Request: {
    page: integer (default 1)
    pageSize: integer (default 20, max 100)
  }
  Response: 200 OK
    {
      data: Comment[]
      pagination: { page, pageSize, total, totalPages }
    }
  Errors:
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 403 INSUFFICIENT_PERMISSIONS
    - 404 TASK_NOT_FOUND
  Notes:
    - AC7: 父任务已删除时返回 404
    - 评论按 createdAt 正序排列
```
