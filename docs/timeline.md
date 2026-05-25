# Timeline — Forge 方法论进化记录

### 2026-05-25 — 方法论进化：测试 skill 产物格式强化 + 文件拆分策略

- **触发**：demo11 testing 产物审计（testing/contract.md + testing/test-cases.md），发现 6 个结构性缺陷
- **偏差归因**：
  - T1-T5 决策点格式不统一（T2/T3/T4 缺 `被拒` 段落，因 skill 只在 `**记录**` 行提及，无显式子结构）
  - test-cases.md 无行数约束 → 550 行远超 200 行上限
  - 测试范围矩阵以"模块"为维度（template 引导不足）
  - AC 编号无全局规范（per-module 重启 vs feature-level 全局）
  - test-strategy 覆盖矩阵 vs test-cases 测试用例无交叉验证（TopBar 缺口）
  - feature contract.md 缺领域索引（纯前端路径跳过领域聚合）

- **影响范围**：5 个 skill 文件 + 1 个模板 + demo11 产物

- **执行的修改**：

| # | 改进项 | 影响 Skill/模板 | 类型 |
|---|--------|----------------|------|
| 1 | T1-T5 产出格式统一（表格 + 被拒子标题） | forge-test-strategy | 决策点格式 |
| 2 | 行数约束 ≤ 200 行 + 拆分策略 | forge-test-cases + test-cases-template | 膨胀控制 |
| 3 | AC 编号规范（feature-level 全局） | forge-test-cases | 追溯链 |
| 4 | 覆盖矩阵 vs 测试用例交叉验证 | forge-test + forge-test-cases | 出口条件 |
| 5 | 领域索引段落 | shared/contract-template | 模板新增 |
| 6 | 编排层 Phase 3 交叉验证步骤 | forge-test | 流程新增 |

- **验证结果**：demo11 testing 产物修复后全量通过（行数 ≤ 200、T1-T5 被拒完整、矩阵 AC 维度、领域索引存在、覆盖缺口消除）

---

### 2026-05-25 — 方法论进化：决策编号分域 + 模板分前后端 + 轻量模式

- **触发**：demo11（factory-digital-twin）产物审计，发现 10 个结构性缺陷
- **偏差归因**：
  - 模板 API-first 偏见（contract-template 和 module-template 硬编码 D1-D7 = 资源建模/分页/错误/权限/幂等/并发/认证）
  - 决策编号空间冲突（project.md 和 contract.md 各自使用 D1-Dn，语义不同但编号相同）
  - Skill 出口条件缺失（detail 完成后不更新 project.md Feature 索引）
  - 无轻量模式路径（1 人 Demo 项目被迫走完整 business-alignment）
  - Changelog 模板不支持首次创建场景

- **影响范围**：16 个 skill 文件 + 6 个模板文件

- **执行的修改**：

| # | 改进项 | 影响 Skill/模板 | 类型 | 证据来源 |
|---|--------|----------------|------|---------|
| 1 | 决策编号分域 PD#/FD#/DB# | 全部 skill + 模板 | 结构重写 | demo11 contract.md D1 覆盖 project.md D1，codegen 无法区分 |
| 2 | 新增 frontend-contract-template.md | forge-frontend-design | 模板新增 | demo11 被迫重写 contract-template 的 D1-D7 为 F1-F5 |
| 3 | 新增 frontend-module-template.md | forge-frontend-design | 模板新增 | demo11 被迫在 module-template 中新增组件结构/数据消费段落 |
| 4 | contract-template 通用化 | 所有领域 skill | 模板重写 | 硬编码 API 决策对纯前端/纯数据库项目无意义 |
| 5 | project-template PD# + 后端段落标条件 | forge-init, forge-business-alignment | 模板修改 | demo11 project.md 的 D1-D6 和 contract.md 的 D1-D7 冲突 |
| 6 | detail 出口增加索引同步 | forge-detail | 出口条件 | demo11 project.md Feature 索引列了 3 个不存在的 feature |
| 7 | init Feature 索引不预填 | forge-init | 初始化逻辑 | 同上 |
| 8 | business-alignment 轻量模式 | forge-business-alignment | 场景分支 | demo11 是 1 人 Demo，business-alignment 产出太薄 |
| 9 | define 轻量模式 | forge-define | 场景分支 | demo11 PRD 缺验收计划和依赖图，但 8 个故事不需要 |
| 10 | DESIGN.md Component Token 完整性检查 | forge-fe-system | 验证清单 | demo11 DESIGN.md Component 层只有 12 个 token，引用未定义的 semantic token |
| 11 | changelog-template 区分首次/迭代 | 所有领域 skill | 模板修改 | demo11 changelog 首次创建条目无法套用迭代变更格式 |
| 12 | frontend-design 模板引用 + 去重 | forge-frontend-design | 模板引用 | demo11 frontend/contract.md 重复列出 project.md 已有的技术选型 |

- **验证结果**：demo11 修复后端到端验证通过（零旧编号残留、Feature 索引正确、PD# 交叉引用完整、Module 段落完整）

- **未改项**：
  - forge-db-design（已使用 DB1-DB5，天然分域，验证了方案正确性）
  - forge-plan（不引用决策编号，不受影响）
  - forge-test-strategy（引用 contract-template，但模板已通用化）
