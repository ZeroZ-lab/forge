---
name: api-design
description: Reviews and designs API contracts, endpoints, schemas, error formats, auth, pagination, idempotency, and API boundaries.
when_to_use: Use when creating or reviewing HTTP/RPC/resource contracts, endpoint behavior, request/response schemas, API errors, authorization behavior, pagination, idempotency, or concurrency semantics.
---

# API Design — 接口详设

## 职责

定义接口层 contract：资源、端点、请求、响应、错误、权限和并发语义。只设计接口，不设计存储和 UI。

## 执行纪律

- D1：每个 API 决策记录选择、理由、被拒方案。
- D2：合约必须有 WHAT/WHY/HOW/CONSTRAINTS。
- D5：只处理接口层；数据库交给 db-design，外观交给 fe-system。

## 决策点

### API1: 资源建模

确定资源名、生命周期、关系、动作是否需要独立资源。拒绝把数据库表直接暴露成 API。

### API2: 分页策略

按数据量、排序稳定性、实时变化选择 cursor/offset/none，并写边界行为。

### API3: 错误格式

统一错误 envelope、code、message、field errors、trace id。

### API4: 权限失败策略

区分 401/403/404 隐藏资源策略；记录信息泄露风险。

### API5: 幂等策略

写 idempotency key、重复提交、重试窗口和冲突响应。

### API6: 并发控制

选择 ETag/version/锁/事务语义，记录冲突码和客户端恢复方式。

### API7: 认证方式

选择 session/token/API key/OAuth 等，记录过期、刷新和撤销。

## 文档约束

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。共享 feature API 决策写入 `goal.md`；只有接口和不变量复杂到 goal 不足时才创建 `modules/*.md`，包含端点、auth、request、response、errors、side effects、constraints。模板：`${CLAUDE_SKILL_DIR}/../shared/module-template.md`。

## 入口/出口条件

入口：需要新接口或审查接口合约。出口：API1-API7 明确，前端和数据库能消费。缺权限/错误/幂等时不得进入 codegen。

## 红旗清单

- 只有 URL 没有请求/响应/错误。
- 权限失败行为未定义。
- 写接口时顺手定表结构。
- 分页、幂等、并发缺失但场景需要。
- 多处重复同一 schema 且不一致。

## 验证清单

- [ ] API1-API7 是否完整或明确不适用？
- [ ] 每个端点是否有 auth/request/response/errors？
- [ ] 错误、权限、幂等、并发是否可测试？
- [ ] 下游依赖是否有单一权威？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。standalone 且产生变更时持久化；作为 `detail` 子阶段时不单独写，由 orchestrator 汇总一次。
