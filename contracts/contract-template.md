# <Feature Name>

> 一句话：这个 feature 做什么、为谁做。

## 需求（WHAT）

### 功能需求

- F1: 用户可以...
- F2: 系统应该...

### 验收条件

- AC1: 当 X 时，Y 必须发生
- AC2: 当 Z 时，返回错误

---

## 决策（WHY）

### D1: 资源建模

**选择**：B — 父子资源  
**理由**：User 和 Task 是 1:N 关系，嵌套 URL 更清晰  
**拒绝**：A（扁平）— 查询参数不够直观

### D2: 分页策略

**选择**：A — page/pageSize  
**理由**：数据量预估 < 10 万，后台管理场景  
**拒绝**：B（cursor）— 不需要实时 feed，增加复杂度

### D3: 错误格式

**选择**：B — 轻量 `{ code, message, details }`  
**理由**：项目规模小，不需要 RFC 9457 的复杂度  
**拒绝**：A（RFC 9457）— 过重

### D4: 权限失败策略

**选择**：C — 混合  
**理由**：User 私有数据用 404 隐藏，系统配置用 403  
**拒绝**：A（全 403）— 暴露资源存在性

### D5: 幂等策略

**选择**：A — Idempotency-Key  
**理由**：创建订单是关键业务，必须防重复  
**拒绝**：C（不处理）— 重复扣款风险

### D6: 并发控制

**选择**：A — version 字段  
**理由**：简单，项目无 HTTP 缓存基础设施  
**拒绝**：B（ETag）— 增加复杂度

### D7: 认证方式

**选择**：A — Bearer token（JWT）  
**理由**：无状态，适合微服务  
**拒绝**：B（Session）— 无 session 基础设施

---

## 架构（HOW）

### 数据模型

```
User: { id, email, name, createdAt }
Task: { id, userId, title, status, version, createdAt }
```

### 接口合约

```
GET /users/:id/tasks
  Auth: Bearer token
  Request: { page: 1, pageSize: 20, sort: "createdAt" }
  Response: { data: Task[], total: 100, page: 1, pageSize: 20 }
  Errors: USER_NOT_FOUND (404), UNAUTHORIZED (401)
  Pagination: page/pageSize, default sort createdAt desc

POST /users/:id/tasks
  Auth: Bearer token
  Idempotency: required (Idempotency-Key header)
  Request: { title: "Fix bug", description: "..." }
  Response: Task
  Errors: USER_NOT_FOUND (404), TASK_TITLE_REQUIRED (422), IDEMPOTENCY_KEY_CONFLICT (409)

PATCH /users/:id/tasks/:taskId
  Auth: Bearer token
  Concurrency: version field required
  Request: { title: "Updated", version: 1 }
  Response: Task
  Errors: TASK_NOT_FOUND (404), VERSION_CONFLICT (409)
```

### 技术选型

- Runtime: Node.js + Hono
- Validation: Zod
- Database: PostgreSQL + Drizzle
- Auth: JWT (jsonwebtoken)

---

## 约束（CONSTRAINTS）

### 安全

- 多租户隔离：所有查询必须带 userId
- 权限失败：User 私有数据返回 404
- 不暴露内部字段：passwordHash、deletedAt、internalNotes

### 性能

- GET /users/:id/tasks p99 < 200ms
- 列表默认 pageSize 20，最大 100
- total 计算走索引，避免全表扫描

### 兼容性

- 不删除已有字段
- 新增字段必须可选
- 不修改已有字段的类型或语义
- 不修改默认排序、错误格式、error code

---

## 支撑材料

- `evidence/competitive-analysis.md` — 竞品 API 设计调研
- `evidence/best-practices.md` — 行业最佳实践扫描
- `evidence/user-research.md` — 用户需求访谈记录

---

## 实现

> 这部分由模型从 contract.md 生成，不手写。

```
src/
├── routes/
│   └── tasks.ts
├── schemas/
│   └── task.schema.ts
├── services/
│   └── task.service.ts
└── tests/
    └── tasks.contract.test.ts
```
