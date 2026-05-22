# Task Detail 模块

> 依赖 frontend/contract.md 共享决策 F1-F5，遵循共享约束。
> 依赖 API：GET /tasks/:id, PATCH /tasks/:id, DELETE /tasks/:id,
>           POST /tasks/:id/comments, GET /tasks/:id/comments
>          （引用 api/modules/tasks.md + api/modules/comments.md）

## 需求

- F1: 展示任务详情（标题、描述、状态、指派人）
- F2: 编辑任务字段（行内编辑）
- F3: 修改任务状态
- F4: 删除任务（二次确认）
- F5: 展示评论列表
- F6: 添加评论

## 验收条件

- AC1: 进入详情页 < 500ms
- AC2: 状态变更即时反映（乐观更新）
- AC3: 删除前弹出确认对话框
- AC4: 评论按时间正序显示
- AC5: 评论提交后自动清空输入框并滚动到底部

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

## 数据流

```typescript
// hooks/useTask.ts
useQuery({
  queryKey: ["task", taskId],
  queryFn: () => api.getTask(taskId),
})

// hooks/useUpdateTask.ts
useMutation({
  mutationFn: (input) => api.updateTask(taskId, { ...input, version }),
  onSuccess: (data) => queryClient.setQueryData(["task", taskId], data),
})

// hooks/useDeleteTask.ts
useMutation({
  mutationFn: () => api.deleteTask(taskId),
  onSuccess: () => navigate("/tasks"),
})

// hooks/useComments.ts
useQuery({
  queryKey: ["comments", taskId],
  queryFn: () => api.getComments(taskId),
})

// hooks/useCreateComment.ts
useMutation({
  mutationFn: (content) => api.createComment(taskId, { content }),
  onSuccess: () => queryClient.invalidateQueries(["comments", taskId]),
})
```

## 表单

```typescript
// TaskForm — React Hook Form + Zod
const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  assigneeId: z.string().optional(),
})

// CommentForm
const commentSchema = z.object({
  content: z.string().min(1).max(2000),
})
```

---

## 模块特有约束

### 并发控制

- 编辑时携带 version（D6）
- 收到 409 TASK_VERSION_CONFLICT 时提示用户刷新
