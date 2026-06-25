# Task Management — Testing

> 独立产物理由：跨 Task/Comment/Storage 多模块，使用真实 PostgreSQL、CI 阻断和隔离数据，需要独立 QA 维护周期。依赖 `goal.md` 和 `modules/*.md`，不复制完成标准。

## 决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| T1 | 测试类型 | 合约测试 + 单元测试 | 合约测试验证 API 行为，单元测试覆盖业务逻辑，互补 | B（仅集成）调试定位慢；C（仅 E2E）最慢最贵 |
| T2 | 覆盖策略 | 每个端点全覆盖 | 每个端点覆盖：成功/认证/权限/校验/边界 | B（关键路径）可能漏边界；C（按风险）主观 |
| T3 | 测试数据 | Factory | 代码生成测试数据，灵活且可组合 | B（Fixture）固定不够灵活；C（种子）不够隔离 |
| T4 | Mock 策略 | 不 Mock，用真实 DB | 用 testcontainers 跑真实 PostgreSQL，测试最可靠 | B（Mock 外部服务）平衡但不彻底；C（全 Mock）可能漏集成问题 |
| T5 | CI 集成 | 全量跑 | 每次 PR 跑全部测试，确保无回归 | B（仅受影响）可能漏间接影响；C（并行分片）项目太小不需要 |

---

## 测试框架

| 层 | 选择 | 用途 |
|---|------|------|
| Test Runner | Vitest | 快速，原生 ESM 支持 |
| API Testing | supertest | HTTP 断言 |
| Database | testcontainers | 真实 PostgreSQL 容器 |
| Assertion | vitest expect | 内置断言 |

---

## 覆盖矩阵

引用 `../modules/tasks.md` 和 `../modules/comments.md` 的验收条件。

### Tasks 模块（引用 modules/tasks.md）

| 端点 | 成功 | 401 | 403 | 400 | 409 | 422 |
|------|------|-----|-----|-----|-----|-----|
| POST /tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /tasks | ✅ | ✅ | ✅ | | | |
| GET /tasks/:id | ✅ | ✅ | ✅ | | | |
| PATCH /tasks/:id | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE /tasks/:id | ✅ | ✅ | ✅ | | | |

### Comments 模块（引用 modules/comments.md）

| 端点 | 成功 | 401 | 403 | 400 | 409 |
|------|------|-----|-----|-----|-----|
| POST /tasks/:id/comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /tasks/:id/comments | ✅ | ✅ | ✅ | | |

### 跨模块

| 场景 | 验证点 |
|------|--------|
| 多租户隔离 | 跨租户访问返回 403 |
| 软删除 | 已删除任务不可见（AC6） |
| 父子约束 | 任务删除后评论不可访问（AC7） |
| 并发控制 | version 冲突返回 409（AC4） |
| 幂等 | 相同 key + 不同 body 返回 409（AC5） |

---

## Testing 专属约束

### 测试环境

- 每个测试文件独立的数据库 schema（schema 隔离）
- 测试间不共享数据（每个测试自带 setup/teardown）
- 测试数据库在 CI 中用 testcontainers 启动

### 命名规范

- 测试文件：`<module>.contract.test.ts`
- describe 块：按端点分组
- it 块：`<操作描述> 返回 <状态码> <错误码>`
