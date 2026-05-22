---
name: api-design
description: API 合约设计——引导决策对话，产出能重建系统的 contract.md
---

# API Design — 决策协议

## 职责

引导人类完成 API 设计的 7 个决策点。每个决策点：
1. 呈现 2-3 个选项 + 各自代价
2. 给出推荐（标注 `(Recommended)`）
3. 等人类确认
4. 记录选择 + 理由 + 被拒方案

**不教模型怎么设计 API**——模型已经会了。只负责在关键分歧点让人类做选择。

## 决策点

### D1: 资源建模

**呈现给人类：**

> 你的 API 涉及哪些资源？它们之间是什么关系？
>
> 选项：
> - A: 扁平资源（/users, /tasks）— 简单，无嵌套
> - B: 父子资源（/users/:id/tasks）— 关系清晰，URL 较长
> - C: 图结构（/users/:id/tasks/:taskId/comments）— 表达力强，复杂度高
>
> **推荐**：根据资源关系复杂度判断。1:N 用 B，N:M 用 A + 查询参数。

**记录到 contract.md：**
- 资源列表（名词 + 关系）
- 选择理由
- 被拒方案

---

### D2: 分页策略

**呈现给人类：**

> 列表接口怎么分页？
>
> 选项：
> - A: page/pageSize — 适合后台管理，实现简单，大数据量性能差（深页 O(n)）
> - B: cursor/limit — 适合 feed/大数据，性能好，不能跳页
> - C: 混合 — 管理用 A，feed 用 B，增加代码复杂度
>
> **推荐**：数据量 < 10 万用 A，> 10 万或实时变化用 B。

**记录到 contract.md：**
- 选择 + 理由
- 被拒方案
- 默认排序字段（createdAt desc 或 id desc）

---

### D3: 错误格式

**呈现给人类：**

> API 错误响应用什么格式？
>
> 选项：
> - A: RFC 9457 Problem Details — 标准但重，适合大型团队
> - B: 轻量 `{ code, message, details }` — 简单够用，大多数项目首选
> - C: 自定义 — 灵活但需要更多设计
>
> **推荐**：B，除非项目已有 RFC 9457 依赖或需要跨团队标准化。

**记录到 contract.md：**
- 错误格式 schema
- code 命名规范（UPPER_SNAKE_CASE）
- 400 vs 422 的选择

---

### D4: 权限失败策略

**呈现给人类：**

> 用户无权限访问资源时，返回什么？
>
> 选项：
> - A: 403 Forbidden — 明确告知"你没权限"，简单
> - B: 404 Not Found — 隐藏资源存在性，更安全
> - C: 混合 — 公开资源 403，私有资源 404
>
> **推荐**：C。多租户 SaaS 的私有资源（用户数据、订单）用 404，公开资源（系统配置）用 403。

**记录到 contract.md：**
- 策略选择 + 理由
- 哪些资源用 404，哪些用 403

---

### D5: 幂等策略

**呈现给人类：**

> 有副作用的 POST（创建订单、扣款）怎么处理重试？
>
> 选项：
> - A: Idempotency-Key header — 业界标准（Stripe），需要存储 key
> - B: 业务去重 — 订单号天然幂等，无额外开销
> - C: 不处理 — 简单但有重复风险
>
> **推荐**：关键业务（支付、订单）必须选 A 或 B。C 仅用于低风险操作。

**记录到 contract.md：**
- 哪些端点需要幂等
- 选择 + 理由
- 冲突时的错误码（IDEMPOTENCY_KEY_CONFLICT）

---

### D6: 并发控制

**呈现给人类：**

> 可能并发修改的资源（用户配置、任务状态）怎么处理冲突？
>
> 选项：
> - A: version 字段 — 简单，放在 body 里，每次更新 +1
> - B: ETag + If-Match — HTTP 标准，利用缓存机制
> - C: 不处理 — 简单但有丢失更新风险
>
> **推荐**：A，除非项目已经大量使用 HTTP 缓存。C 仅用于单人独占资源。

**记录到 contract.md：**
- 哪些资源需要并发控制
- 选择 + 理由
- 冲突时的错误码（VERSION_CONFLICT）

---

### D7: 认证方式

**呈现给人类：**

> API 怎么认证？
>
> 选项：
> - A: Bearer token（JWT / OAuth2）— 无状态，适合微服务
> - B: Session + Cookie — 有状态，适合 Web 应用
> - C: API Key — 简单，适合服务间调用
>
> **推荐**：A 是默认选择。B 仅在已有 session 基础设施时用。C 用于第三方集成。

**记录到 contract.md：**
- 认证方式 + 理由
- token 存储位置（header / cookie）
- 过期策略

---

## 文档约束

产出必须写入 `docs/features/<feature>/contract.md`，遵循 `contracts/contract-template.md` 模板。

必须包含：
1. **需求（WHAT）**：功能需求 + 验收条件
2. **决策（WHY）**：D1-D7 的每个选择 + 理由 + 被拒方案
3. **架构（HOW）**：数据模型 + 接口合约 + 技术选型
4. **约束（CONSTRAINTS）**：安全 + 性能 + 兼容性

---

## 项目约定

> 这部分按项目维护，记录模型训练数据里没有的本地约定。

### 命名
- URL: plural nouns（/tasks, /users/:id/orders）
- JSON body: camelCase
- Error code: UPPER_SNAKE_CASE

### 基础类型
- 时间: ISO 8601 string（`2026-05-22T10:30:00Z`）
- ID: string（不暴露数据库自增）
- 金额: 最小货币单位整数（分）或 decimal string（"123.45"）

### 接口合约格式

每个端点交付：
```
METHOD /path
  Auth: 认证要求
  Request: DTO + 示例
  Response: DTO + 示例
  Errors: error codes + HTTP status
  Pagination: 分页策略（如适用）
  Idempotency: 幂等策略（如适用）
  Concurrency: 并发控制（如适用）
```
