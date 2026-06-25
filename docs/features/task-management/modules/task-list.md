# Task List 模块

> 覆盖任务列表页、筛选、分页和创建入口。依赖 goal.md 共享决策 FE1-FE5。
> 依赖 API：GET /tasks, POST /tasks（见 `modules/tasks.md`）。

## 责任与不变量

- 负责任务列表、过滤、分页、创建入口和详情导航。
- 不负责 Task API 合约或详情页内部交互。
- loading、empty、error、disabled 与键盘导航状态必须可验收。
- 数据与权限行为引用 `goal.md` 和 `modules/tasks.md`。

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

## 数据消费与状态

- Query key 必须包含 page、status、assigneeId，避免筛选结果串缓存。
- 创建成功后列表必须重新验证或安全地更新缓存。
- 客户端状态只包含筛选和当前页；任务数据属于服务端状态。
- 分页切换保留旧数据直到新结果就绪，失败时允许重试。

---

## 模块特有约束

### 性能

- 列表使用虚拟滚动（> 100 条时）
- 分页切换使用 prefetch（预取下一页）
