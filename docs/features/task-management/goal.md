# Task Management

> 团队协作的任务管理系统。首屏只记录目标、边界、完成标准和跨模块决策；实现细节按「需要细节时」读取。

## 目标

- 用户可以创建、分配、更新、删除任务。
- 用户可以按列表查看任务，并查看任务详情。
- 用户可以在任务下创建和查看评论。

## 边界

### 包含

- Task CRUD、分页列表、详情页。
- Comment 创建和列表。
- 多租户隔离、角色权限、软删除、幂等创建、乐观并发。

### 不包含

- 文件附件、提醒通知、时间追踪。
- 看板拖拽、全文搜索、审计日志。

### 约束

- 所有查询必须从认证上下文提取 `tenantId`，不得跨租户访问。
- `admin` 可操作所有资源；`member` 只能操作自己创建或被指派的资源。
- 不删除已有 response 字段；新增字段必须可选、可为空或有默认值；breaking change 必须走 `/v2/`。

## 完成标准

- [ ] AC1: 创建任务时，标题必填且为 1-200 字符。
- [ ] AC2: 任务状态只能是 `todo` / `in_progress` / `done`。
- [ ] AC3: 列表接口必须分页，默认 `page=1`、`pageSize=20`。
- [ ] AC4: 更新任务必须携带 `version`，版本冲突返回 409。
- [ ] AC5: 创建任务必须携带 `Idempotency-Key`，重复 key + 不同 body 返回 409。
- [ ] AC6: 删除任务为软删除，已删除任务不出现在列表中。
- [ ] AC7: 评论不能独立于任务存在，任务删除后评论不可访问。
- [ ] AC8: 所有错误响应遵循 RFC 9457 Problem Details 格式。

## 决策记录

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| D1 | 资源建模 | Task + Comment 父子资源 | Comment 与 Task 是明确 1:N，嵌套路由直观 | 扁平评论资源；深度嵌套 |
| D2 | 分页 | `page` / `pageSize` | 数据量 < 10 万，后台管理场景需要跳页 | cursor；混合分页 |
| D3 | 错误格式 | RFC 9457 | 跨团队标准化，HTTP 错误格式有官方标准 | 轻量自定义；完全自定义 |
| D4 | 权限失败 | 统一 403 | 项目初期调试友好，不隐藏资源存在性 | 统一 404；混合策略 |
| D5 | 幂等 | `Idempotency-Key` | 成熟方案，避免重复创建 | 业务字段去重；不处理 |
| D6 | 并发 | `version` 字段 | 简单直接，无 HTTP 缓存基础设施依赖 | ETag；不处理 |
| D7 | 认证 | Bearer JWT | 无状态，token 自包含用户信息 | Session；API Key |
| DB1 | 数据库 | PostgreSQL 16 | 成熟稳定，JSON 支持好，适合 Drizzle | MySQL；SQLite |
| DB2 | ID | ULID | 时间有序、字符串存储、分布式友好 | UUID v7；自增 ID |
| DB3 | 索引 | 预规划 | 主要查询路径明确，上线后补索引风险更高 | 按需补；覆盖式过度索引 |
| DB4 | 迁移 | Drizzle Kit | 与 schema 紧耦合，类型安全 | Prisma Migrate；手写 SQL |
| DB5 | 软删除 | `deletedAt` | 查询规则简单，满足 AC6 | 归档表；硬删除 |
| FE1 | 前端框架 | React 19 + Vite | 生态成熟，HMR 快 | Vue；Svelte |
| FE2 | 状态 | Zustand | 极简，适合筛选和分页状态 | Redux Toolkit；Context |
| FE3 | 数据请求 | TanStack Query | 缓存、重试、乐观更新内置 | SWR；原生 fetch |
| FE4 | 表单校验 | React Hook Form + Zod | 性能好，可复用 API schema | Formik；手写校验 |
| FE5 | 样式 | Tailwind CSS + Lucide | 约束一致、图标风格统一 | CSS Modules；手写样式 |

## 共享协议

- 默认排序：`createdAt desc`。
- 错误响应：`type`、`title`、`status`、`detail`、`instance`、`extensions.code`、`extensions.requestId`。
- 主要错误码：`INVALID_REQUEST_BODY`、`TOKEN_EXPIRED`、`TOKEN_INVALID`、`INSUFFICIENT_PERMISSIONS`、`TASK_NOT_FOUND`、`IDEMPOTENCY_KEY_CONFLICT`、`TASK_VERSION_CONFLICT`、`ASSIGNEE_NOT_FOUND`。

## 需要细节时

- Task API、数据模型和列表查询约束 → modules/tasks.md
- Comment API、数据模型和父子约束 → modules/comments.md
- 前端任务列表页 → modules/task-list.md
- 前端任务详情页 → modules/task-detail.md
- 存储、索引、迁移和备份约束 → modules/storage.md
- 测试策略和覆盖矩阵 → testing/strategy.md
- 发布流程、环境和回滚计划 → deploy/plan.md
