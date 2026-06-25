---
name: db-design
description: Reviews and designs data models, schemas, indexes, migrations, ID strategy, soft delete, query patterns, and storage boundaries.
when_to_use: Use when designing or reviewing database schema, storage model, ID strategy, indexes, migrations, soft delete, data constraints, or persistence tradeoffs.
---

# DB Design — 数据库详设

## 职责

定义存储层：数据模型、ID、索引、迁移、软删除和约束。先消费 API 资源模型和查询模式，不反向驱动接口。

## 执行纪律

- D1：DB1-DB5 记录选择、理由、被拒方案。
- D5：只设计存储层，不改接口层。
- D7：迁移必须可回滚，生产前 staging 验证。

## 决策点

### DB1: 数据库选型

按数据结构、查询、事务、规模、团队经验选择 SQL/NoSQL/文件/内存等。

### DB2: ID 策略

自增、UUID、ULID、雪花等；记录排序性、泄露风险和分布式要求。

### DB3: 索引策略

从 API 查询模式推导索引；记录唯一性、复合索引、写入成本。

### DB4: 迁移策略

schema 版本、up/down、回填、兼容窗口、回滚和验证。

### DB5: 软删除策略

是否软删除、恢复窗口、唯一约束处理、清理任务和审计。

## 文档约束

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。共享存储决策写入 feature `goal.md`；只有数据接口、不变量或迁移约束复杂到 goal 不足时才创建 `modules/*.md`。结构参考 `${CLAUDE_SKILL_DIR}/../shared/module-template.md`。

## 入口/出口条件

入口：需要新数据模型、迁移、索引或存储审查。出口：DB1-DB5 明确，codegen 能生成 schema/migration/tests。

## 红旗清单

- 没有 API 查询模式就先设计表。
- 迁移只有 up 没有 down。
- 唯一约束和软删除冲突。
- 索引凭感觉添加。
- 数据保留和隐私要求缺失。

## 验证清单

- [ ] DB1-DB5 是否完整或明确不适用？
- [ ] 索引是否来自查询模式？
- [ ] 迁移是否可回滚并有验证计划？
- [ ] 软删除与唯一约束是否兼容？
- [ ] 数据约束是否能被测试？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。standalone 且产生变更时持久化；作为 `detail` 子阶段时不单独写，由 orchestrator 汇总一次。
