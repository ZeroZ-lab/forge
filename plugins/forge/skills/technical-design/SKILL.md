---
name: technical-design
description: Reviews and makes architecture decisions, technical tradeoffs, stack choices, service boundaries, deployment shape, and engineering constraints for project.md.
when_to_use: Use when choosing or reviewing architecture, tech stack, service boundaries, data/deployment architecture, performance/security constraints, or project-level engineering rules.
---

# Technical Design — 技术设计

## 职责

把业务目标、团队经验和运维约束转成项目级技术决策。产物写入 `docs/project.md`，记录为什么选 A、不选 B。

## 执行纪律

- D1：每个选择记录理由和被拒方案。
- D4：简单方案优先，拒绝过度设计。
- D6：约束显式化；团队经验 > 技术先进性。

## 方法论：约束→选项→权衡→验证

1. 约束：用户量、数据量、团队、运维、合规、性能、预算。
2. 选项：给 2-4 个可行路线，不只给偏好。
3. 权衡：成本、复杂度、可维护性、迁移风险。
4. 验证：性能指标、安全策略、部署和回滚可验证。

## 决策点

### TD1: 架构模式（选项+权衡阶段）

单体、模块化单体、微服务、serverless 等；记录适用边界。

### TD2: 技术选型（选项+权衡阶段）

语言、框架、包管理、构建、运行时；已有栈则验证不重选。

### TD3: 服务划分（选项+权衡阶段）

模块边界、public API、依赖方向、共享库规则。

### TD4: 数据架构（验证阶段）

存储类型、数据量、备份、迁移、缓存和一致性。

### TD5: 部署架构（验证阶段）

环境、CI/CD、运行平台、回滚、监控。

### TD6: 工程约束（验证阶段）

目录结构、测试策略、lint/typecheck、错误处理、安全默认值。

## 文档约束

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。产出或更新 `docs/project.md`，模板 `${CLAUDE_SKILL_DIR}/../shared/project-template.md`。只写项目级共享决策；feature 特有选择留给 detail。只有难以逆转、出乎直觉且需要独立复核的项目决策才创建 `docs/adr/*.md`。

## 入口/出口条件

入口：新项目、架构选择、技术栈复查、共享约束缺失。出口：TD1-TD6 决策可指导 detail/codegen。

## 红旗清单

- 未问团队经验直接选新技术。
- 没有被拒方案。
- 架构不可部署或不可回滚。
- 把 feature 细节写进 project。
- 安全/错误处理/测试策略缺失。

## 验证清单

- [ ] TD1-TD6 是否完整或明确跳过？
- [ ] 每个决策是否有理由、拒绝项和适用边界？
- [ ] 工程约束是否可被 codegen 执行？
- [ ] 性能、安全、部署是否有验证方式？

## 历史维护

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。只有 project 级共享决策发生持久变更时写历史。
