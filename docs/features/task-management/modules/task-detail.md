# Task Detail 模块

> 覆盖任务详情页、编辑、删除、评论展示和评论创建。依赖 goal.md 共享决策 FE1-FE5。
> 依赖 API：GET /tasks/:id, PATCH /tasks/:id, DELETE /tasks/:id,
>           POST /tasks/:id/comments, GET /tasks/:id/comments
>          （见 `modules/tasks.md` + `modules/comments.md`）

## 责任与不变量

- 负责详情展示、编辑、状态更新、删除确认、评论列表和评论创建。
- 不负责列表筛选、API 字段定义或持久化索引。
- 更新必须携带 version；冲突必须提示刷新，不得静默覆盖。
- 删除必须二次确认；评论必须遵守 Task 父子可见性。

---

## 页面结构

```
TaskDetailPage
├── Header
│   ├── BackButton
│   ├── Title (可编辑)
│   ├── StatusSelect (todo / in_progress / done)
│   └── DeleteButton → ConfirmDialog
├── InfoSection
│   ├── AssigneeSelect
│   ├── CreatorInfo
│   └── Timestamps (created / updated)
├── DescriptionSection
│   └── DescriptionEditor (可编辑)
├── CommentSection
│   ├── CommentList
│   │   └── CommentItem[]
│   │       ├── AuthorName
│   │       ├── Content
│   │       └── CreatedAt
│   └── CommentForm
│       ├── ContentInput (textarea, max 2000)
│       └── SubmitButton
└── ConfirmDialog (条件渲染)
```

---

## 数据消费与状态

- Task 与 Comments 使用独立缓存边界，均以 taskId 标识。
- 更新成功后以服务端返回值替换详情缓存；409 冲突不得保留乐观结果。
- 删除成功后返回列表；失败时保留详情并展示可恢复错误。
- 评论创建成功后刷新或追加评论缓存，并清空输入。

## 表单合约

- Task 表单字段与限制引用 `modules/tasks.md`。
- Comment 内容限制引用 `modules/comments.md`。
- 客户端校验用于快速反馈，服务端错误仍必须可见并映射到字段或表单级错误。

---

## 模块特有约束

### 并发控制

- 编辑时携带 version（D6）
- 收到 409 TASK_VERSION_CONFLICT 时提示用户刷新
