---
name: db-design
description: Reviews and designs data models, schemas, indexes, migrations, ID strategy, soft delete, query patterns, and storage constraints. Use for lightweight database review or patch tasks, and for full db-design stage execution when explicitly requested.
when_to_use: Use when the user asks about table structure, data model, schema changes, indexes, migrations, rollback, IDs, storage choice, soft delete, query performance, or whether a database design is reasonable.
phase: detail
type: domain
role: goal-refiner
triggers:
  - "数据库设计"
  - "表结构"
  - "数据模型"
avoid_when:
  - "纯前端项目"
  - "已有完整数据库详设"
consumes:
  - "docs/project.md"
  - "api/goal.md"
  - "docs/change-units/CU-*.md"
produces:
  - "database/goal.md"
  - "docs/change-units/CU-*.md"
signals_in:
  - "API data model"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "database goal"
  - "migration rules"
  - "change_unit.updated"
escalates_when:
  - "API 模型和存储模型冲突"
  - "迁移不可回滚"
output_contract:
  - "DB1-DB5"
  - "表清单"
  - "索引规划表"
  - "迁移规则"
maturity: stable
stage_next:
  - plan
  - codegen
feedback_to:
  - api-design
quality_gates: []
signal_routes:
  - signal: "database goal"
    to: plan
    when: "task slicing needs persistence work"
  - signal: "migration rules"
    to: codegen
    when: "code generation includes schema or migrations"
---

# Database Design — 详设阶段（数据库层）

## 职责

设计数据的存储结构——模型先行，索引为查询服务。

**核心洞察**：数据库选型一旦确定，迁移成本极高。模型先于存储，索引服务于查询而非字段。

**方法论**：数据模型驱动——模型先行 → 查询驱动索引 → 迁移可逆。

## 执行纪律

- **D1**：DB1-DB5 每个决策记录选择 + 理由 + 被拒方案
- **D7**：迁移必须可回滚（不能只有 up 没有 down），生产迁移前 staging 验证
- **D5**：只设计存储层，不涉及接口层（api-design）

## 与上下游的边界

**上游**：读 notes/api.md（共享数据模型+接口合约）
**下游**：notes/database.md 交给 plan 阶段（任务分解）和代码生成

**和 api-design 的切法**：
- api-design 定义**资源是什么、怎么暴露**（接口层）
- db-design 定义**数据怎么存、怎么查**（存储层）
- 两者通过共享数据模型连接

## AI 的角色

| 决策点 | AI 角色 | 行为 |
|--------|---------|------|
| DB1 选型 | 数据库评估者 | 根据数据量级、关系复杂度、一致性需求推荐数据库 |
| DB2 ID 策略 | 安全评估者 | 评估自增 ID 的安全风险，推荐分布式 ID 方案 |
| DB3 索引 | 查询优化者 | 从查询模式推导索引策略，避免无脑加索引 |
| DB4 迁移 | 流程规范者 | 推荐迁移工具和流程，确保可回滚 |
| DB5 软删除 | 合规检查者 | 根据业务需求和合规要求推荐删除策略 |

## 决策点

### DB1: 数据库选型

**问**：数据量级？关系复杂度？强一致性需求？团队运维经验？

**不变原则**：关系型 vs 非关系型由数据关系复杂度决定 · 团队能运维的 > 技术最先进的 · 选型迁移成本极高

**记录**：数据库 + 版本 + 选择理由 + 被拒方案

### DB2: ID 策略

**问**：多节点写入？ID 暴露在 URL 中？数据量大到关注存储效率？

**不变原则**：暴露自增 ID = 暴露业务量 + 可枚举攻击面 · 分布式写入需要无协调 ID · 时间有序性影响排序性能

**记录**：ID 方案 + 存储类型 + 选择理由 + 被拒方案

### DB3: 索引策略

**问**：查询模式能确定吗？写入量大吗？有"查得慢就加索引"的习惯？

**不变原则**：索引为查询服务不为字段服务 · 每个索引都有写入成本 · 复合索引列顺序决定服务哪些查询

**记录**：策略 + 索引规划表 + 选择理由 + 被拒方案

### DB4: 迁移策略

**问**：schema 变更频繁？多人开发冲突怎么处理？生产迁移需要审批？

**不变原则**：schema 变更必须版本化 · 迁移必须可回滚（不能只有 up 没有 down）· 生产迁移前必须 staging 验证

**记录**：工具 + 迁移规则 + 选择理由 + 被拒方案

### DB5: 软删除策略

**问**：删除数据需要恢复？有合规删除需求（GDPR）？关联数据怎么处理？

**不变原则**：有恢复需求→软删除 · 有合规删除需求→物理删除 · 两者可共存（先软删除，过期后物理清理）

**记录**：策略 + 适用表清单 + 选择理由 + 被拒方案

## 引导技巧

**模型先行**："先画实体关系图，再选数据库"
**索引穷举**："每个查询模式需要什么索引？"
**迁移可逆**："这个迁移有 down 脚本吗？"
**删除策略**："删除后需要恢复吗？有合规要求吗？"

## 文档约束

**产出必须包含**：
1. **DB1-DB5 决策**：每个选择 + 理由 + 被拒方案
2. **表清单**：引用 api/ 共享数据模型
3. **索引规划表**：表名 + 索引名 + 列 + 用途
4. **迁移规则**：变更流程

### 命名规范
- 表名：snake_case 复数
- 列名：snake_case
- 索引名：`{表名}_{列名}_idx`

### 通用列
每张表都包含：
```
id: primary key
created_at: timestamp, not null, default now()
updated_at: timestamp, not null, default now()
```

## 模板

使用共享模板：
- `${CLAUDE_SKILL_DIR}/../shared/goal-template.md` — goal.md 结构
- `${CLAUDE_SKILL_DIR}/../shared/changelog-template.md` — changelog.md 结构
- `${CLAUDE_SKILL_DIR}/../shared/module-template.md` — 如有数据库领域模块文件

## 入口/出口条件

**入口**：有 project.md + notes/api.md，或用户已有技术选型和 API 详设
**出口**：notes/database.md（DB1-DB5 完整）+ 表清单 + 索引规划表 + 迁移规则

**缺失处理**：
- notes/api.md 缺失 → 要求先完成 API 详设（数据库设计从 API 资源模型推导，不从零开始）
- 共享数据模型不完整 → 从 PRD 推导最小模型，标注"待 API 详设确认"

## 运行时信号

- 输入：`api_design.shared_data_model`
- 输出：database spec、migration rules
- 路由：详见本文件 frontmatter.signal_routes
- 升级：API 模型和存储模型冲突 · 迁移不可回滚

## 何时不使用

纯前端项目 · 已有完整数据库详设 · 简单 CRUD（可简化决策流程）

## 红旗清单

- 没有选择理由 → 强制补充（"为什么选这个数据库？被拒方案是什么？"）
- ID 用自增 → 强制评估（"暴露自增 ID = 暴露业务量 + 可枚举攻击面"）
- 索引无规划 → 强制补充（"查询模式是什么？哪些列需要索引？"）
- 迁移不可回滚 → 强制补充（"down 脚本在哪里？"）
- 没有软删除策略 → 强制评估（"删除的数据需要恢复吗？"）
- 和 api-design 职责重叠 → 拉回（"这是存储层还是接口层？"）

## 验证清单

- [ ] DB1-DB5 是否都有选择 + 理由 + 被拒方案？
- [ ] 每张表是否有通用列（id / created_at / updated_at）？
- [ ] 索引是否服务于查询（不是服务于字段）？
- [ ] 迁移是否版本化（和代码一起提交）？
- [ ] 迁移是否可回滚（有 down 脚本）？
- [ ] 表名是否 snake_case 复数？
- [ ] 软删除策略是否明确（哪些表需要）？

## 历史维护（自动）

完成后自动执行：

1. **追加 feature changelog.md**：
   ```markdown
   ### v{版本} — {日期} — 数据库详设
   - **触发**：{用户说的一句话}
   - **产出**：notes/database.md（DB1-DB5）+ {N} 张表 + {M} 个索引
   ```

2. **追加 docs/timeline.md**：
   ```markdown
   ### {日期} — {feature} 数据库详设
   - 新增：notes/database.md
   ```

3. **检查膨胀**：超 100 行时归档。

## 完成提示

```
✅ 数据库详设完成！notes/database.md 已生成。

下一步（detail 编排自动继续）：
  前端详设     — 组件 + 数据流 + 状态管理（如有前端）
  plan 阶段  — 跳过前端，直接进入任务分解
```

