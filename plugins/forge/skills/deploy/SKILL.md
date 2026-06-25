---
name: deploy
description: Plans reversible releases, deployment environments, CI or CD flow, rollout strategy, rollback steps, monitoring, and release readiness.
when_to_use: Use when preparing a release, choosing deployment architecture, defining rollout/rollback, configuring CI/CD, planning monitoring, or assessing release readiness.
---

# Deploy — 发布规划

## 职责

规划从提交到上线的可逆发布流程。发布必须可回滚、可观测、可灰度；deploy 不写业务实现。

## 执行纪律

- D1：RL 决策记录选择、理由、被拒方案。
- D4：不为不存在的问题引入复杂部署。
- D7：回滚步骤必须具体且可验证。

## 方法论：可逆发布

### RL1: 环境（Environment）

定义 dev/staging/prod、配置隔离、密钥管理和验证入口。

### RL2: 容器（Container）

是否需要容器、镜像构建、运行参数、健康检查。

### RL3: 管道（Pipeline）

CI/CD 步骤、阻断命令、审批、产物和版本号。

### RL4: 灰度（Canary）

全量/分批/feature flag/蓝绿；写流量比例、观察窗口和停止条件。

### RL5: 回滚（Rollback）

具体回滚命令、数据回滚/兼容策略、负责人和 5 分钟恢复路径。

## 产出结构

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。默认在对话中给出 release checklist、环境、pipeline、灰度、监控、回滚、风险和验收。只有生产发布、数据迁移、回滚操作或独立运维交接需要长期维护时，才用 `${CLAUDE_SKILL_DIR}/references/release-template.md` 创建 `deploy/plan.md`；否则把持久发布约束写入 goal/CU。

## 入口/出口条件

入口：代码准备上线或用户要求发布计划。出口：可执行发布清单、回滚方案、监控和阻断条件明确。

## 何时不使用

纯本地工具、原型验证、已有完整 CI/CD 且本次不改发布面。

## 红旗清单

- 没有回滚方案。
- 发布前测试/审查结果未知。
- 无健康检查和监控。
- 数据迁移不可逆却直接上线。
- 灰度没有停止条件。

## 验证清单

- [ ] RL1-RL5 是否完整？
- [ ] 回滚是否是具体命令或步骤？
- [ ] 发布 gate 是否绑定测试/审查？
- [ ] 监控、告警和观察窗口是否明确？
- [ ] 数据迁移是否可逆或兼容？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。发布计划或发布状态发生持久变更时写一次；发布结果可交 `learn` 归档。
