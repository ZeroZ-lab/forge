# Task List 模块

> 依赖 frontend/contract.md 共享决策 F1-F5，遵循共享约束。
> 依赖 API：GET /tasks, POST /tasks（引用 api/modules/tasks.md）

## 需求

- F1: 展示任务列表，支持分页和过滤
- F2: 支持按状态、指派人过滤
- F3: 点击创建按钮打开新建表单
- F4: 点击任务卡片进入详情页

## 验收条件

- AC1: 首屏加载 < 1s
- AC2: 分页加载不闪烁（乐观更新）
- AC3: 空状态显示引导文案
- AC4: 列表支持键盘导航（上下键选择，Enter 进入详情）

---

## 页面结构

```
TaskListPage
├── Header
│   ├── Title ("Tasks")
│   ├── FilterBar
│   │   ├── StatusFilter (todo / in_progress / done / all)
│   │   └── AssigneeFilter (dropdown)
│   └── CreateButton → 打开 CreateTaskModal
├── TaskTable
│   ├── TaskCard[] (可点击)
│   │   ├── Title
│   │   ├── StatusBadge
│   │   ├── AssigneeAvatar
│   │   └── UpdatedAt
│   └── EmptyState (无任务时)
├── Pagination
│   ├── PrevButton
│   ├── PageIndicator
│   └── NextButton
└── CreateTaskModal (条件渲染)
    └── TaskForm
```

---

## 数据流

```typescript
// hooks/useTasks.ts
useQuery({
  queryKey: ["tasks", { page, status, assigneeId }],
  queryFn: () => api.getTasks({ page, pageSize: 20, status, assigneeId }),
})

// hooks/useCreateTask.ts
useMutation({
  mutationFn: (input) => api.createTask(input),
  onSuccess: () => queryClient.invalidateQueries(["tasks"]),
})
```

## 状态管理

```typescript
// stores/taskFilters.ts (Zustand)
{
  status: Status | null,
  assigneeId: string | null,
  page: number,
  setStatus: (s) => ...,
  setAssigneeId: (id) => ...,
  setPage: (p) => ...,
}
```

---

## 模块特有约束

### 性能

- 列表使用虚拟滚动（> 100 条时）
- 分页切换使用 prefetch（预取下一页）
