# Comments 模块

> 依赖 api/goal.md 共享决策 D1-D7，遵循共享约束。
> D1: Comment 是 Task 的父子资源，路由嵌套在 /tasks/:id 下。

## 需求

- F6: 用户可以为任务添加评论
- F7: 用户可以查询任务的评论列表

## 验收条件

- AC7: 评论不能独立于任务存在，任务删除后评论不可访问

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
