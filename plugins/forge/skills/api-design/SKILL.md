---
name: api-design
description: Reviews and designs API contracts, endpoints, schemas, error formats, auth, pagination, idempotency, and API boundary decisions. Use for lightweight API review or patch tasks, and for full api-design stage execution when explicitly requested.
when_to_use: Use when the user asks whether an API is reasonable, wants to add or change an endpoint, adjust request or response shape, review error codes, auth, pagination, idempotency, REST or GraphQL contracts, or explicitly asks for API design.
---
# API Design — 详设阶段（API 层）
## 职责
设计资源的接口合约——URL 是资源的地址，不是动作的调用。
**核心洞察**：好的 API 合约应该让任何未来模型重建系统。接口合约的四层信息（WHAT/WHY/HOW/CONSTRAINTS）缺一不可。
**方法论**：资源导向设计——识别资源 → 建立关系 → 映射操作（CRUD→HTTP 动词）→ 统一接口（错误、分页、认证、幂等）。
## 执行纪律

- **D1**：每个 API 决策记录选择 + 理由 + 被拒方案
- **D2**：API 合约的四层信息（WHAT/WHY/HOW/CONSTRAINTS）缺一不可
- **D5**：只设计接口层，不涉及存储层（db-design）和外观层（fe-system）

## 与上下游的边界
**上游**：读 project.md（技术选型+共享约束）+ PRD.md（用户故事+验收条件）
**下游**：api/contract.md + modules/*.md 交给 db-design（数据模型）、frontend-design（消费接口）、plan 阶段（任务分解）
**和 db-design 的切法**：
- api-design 定义**资源是什么、怎么暴露**（接口层）
- db-design 定义**数据怎么存、怎么查**（存储层）
- 两者通过共享数据模型连接
**和 frontend-design 的切法**：
- api-design 定义**接口合约**（端点+请求+响应）
- frontend-design 定义**怎么消费接口**（数据请求+缓存+状态管理）
## AI 的角色
| 决策点 | AI 角色 | 行为 |
|--------|---------|------|
| API1 资源建模 | 资源分析师 | 从 PRD 推导核心实体，建议资源关系 |
| API2 分页 | 数据量评估者 | 根据数据量级推荐分页策略（page vs cursor） |
| API3 错误格式 | 标准推荐者 | 搜索行业标准（RFC 9457、Google API），推荐最佳实践 |
| API4 权限 | 安全评估者 | 根据安全等级推荐 403/404 策略 |
| API5 幂等 | 副作用分析者 | 从端点推导哪些需要幂等，推荐策略 |
| API6 并发 | 冲突风险者 | 从协作模式推导并发控制需求 |
| API7 认证 | 架构匹配者 | 从系统架构推导认证方式 |
## 决策点
> API 领域的决策编号使用 API# 前缀（API Decision）。项目级共享决策使用 PD# 前缀，记录在 project.md。Feature 级共享决策使用 FD# 前缀，记录在 feature/contract.md。数据库领域使用 DB# 前缀，记录在 database/contract.md。
### API1: 资源建模
**问**：系统管理哪些核心实体？关系是什么？有没有必须独立存在的实体？
**不变原则**：URL 是资源地址不是动作调用 · 嵌套深度 ≤ 2 层 · 资源名用复数名词
**记录**：资源清单 + 关系图 + 选择理由 + 被拒方案
### API2: 分页策略
**问**：数据量级？需要跳页还是"加载更多"？数据变化快吗？
**不变原则**：无界数据集必须分页 · 分页策略由数据量级+访问模式决定 · 量级越大越偏向游标
**记录**：选择 + 理由 + 被拒方案 + 默认排序
### API3: 错误格式
**问**：谁调用 API？多少团队对接？有行业标准吗？
**不变原则**：错误响应必须结构化 · 错误码稳定（程序用）信息可变（人类用）· 消费者越多格式越标准化
**记录**：格式 schema + code 规范 + 选择理由 + 被拒方案
### API4: 权限失败策略
**问**：有没有"不该让别人知道存在"的资源？内部还是外部？调试需要明确权限错误吗？
**不变原则**：403 暴露存在性但调试友好 · 404 隐藏存在性但调试困难 · 选择取决于安全等级
**记录**：策略 + 适用资源分类 + 选择理由 + 被拒方案
### API5: 幂等策略
**问**：重复执行最坏会怎样？弱网环境吗？有天然幂等键吗？
**不变原则**：有副作用的写操作必须考虑重复执行 · 副作用越严重幂等要求越严格 · 有天然幂等键就用
**记录**：哪些端点需要 + 策略 + 冲突处理 + 选择理由 + 被拒方案
### API6: 并发控制
**问**：同一资源会被多人同时修改吗？静默覆盖后果严重吗？用户希望怎么被通知冲突？
**不变原则**：并发冲突风险由协作模式决定 · 单人独占不需要 · 多人协作必须有机制
**记录**：哪些资源需要 + 策略 + 冲突处理 + 选择理由 + 被拒方案
### API7: 认证方式
**问**：单体还是微服务？有第三方应用调用吗？跨设备共享会话吗？
**不变原则**：认证方式由系统架构决定 · 无状态→token · 有状态→session · 服务间→API Key/mTLS
**记录**：认证方式 + token 格式 + 过期策略 + 选择理由 + 被拒方案
## 引导技巧
**资源识别**："系统管理哪些'东西'？每个'东西'能独立存在吗？"
**嵌套简化**："这个嵌套关系能不能用查询参数替代？"
**幂等穷举**："每个写操作，重复执行会怎样？"
**错误码规范**："这个错误是客户端问题（4xx）还是服务端问题（5xx）？"
## 文档约束
**产出必须包含四层信息**：
1. **WHAT**：功能需求 + 验收条件
2. **WHY**：每个决策的选择 + 理由 + 被拒方案
3. **HOW**：数据模型 + 接口合约 + 技术选型
4. **CONSTRAINTS**：安全 + 性能 + 兼容性
### 接口合约格式
```
METHOD /path
  Auth: 认证要求
  Idempotency: 幂等策略（如适用）
  Concurrency: 并发控制（如适用）
  Request: DTO + 字段约束
  Response: 状态码 + DTO
  Errors: error code + HTTP status
  Notes: 补充说明
```
### 命名约定
- URL: plural nouns（/tasks, /users/:id/orders）
- JSON body: camelCase
- Error code: UPPER_SNAKE_CASE
- 时间: ISO 8601
- ID: string（不暴露数据库自增）
## 模板
使用共享模板：
- `${CLAUDE_SKILL_DIR}/../shared/contract-template.md` — contract.md 结构
- `${CLAUDE_SKILL_DIR}/../shared/module-template.md` — modules/*.md 结构
- `${CLAUDE_SKILL_DIR}/../shared/changelog-template.md` — changelog.md 结构
## 入口/出口条件
**入口**：有 project.md + PRD.md，或用户已有技术选型和需求文档
**出口**：api/contract.md（API1-API7 完整）+ modules/*.md（接口合约完整）+ 共享数据模型

**缺失处理**：
- project.md 缺技术选型 → 要求先完成 technical-design，或在 API 设计中做最小选型标注
- PRD 缺验收条件 → 从用户故事推导，标注"AI 推导，待确认"

## 运行时信号
- 输入：`define.acceptance_criteria` + `technical_design.architecture_decisions`
- 输出：`api_design.api_setpoint` + `api_design.shared_data_model`
- 路由：
  - `api_design.api_setpoint` → forge-db-design（数据模型约束）+ forge-frontend-design（接口消费）
  - `api_design.shared_data_model` → forge-db-design（存储模型）
- 升级：资源模型无法确认 · 权限或幂等策略冲突
## 何时不使用
纯前端项目 · 已有完整 API 详设 · GraphQL 项目（资源导向不完全适用）
## 红旗清单
- 没有选择理由 → 强制补充（"为什么选这个？被拒方案是什么？"）
- 接口合约缺字段 → 强制补充（"Auth？Request？Response？Errors？"）
- 资源嵌套超过 2 层 → 强制扁平化（"能不能用查询参数替代？"）
- 错误码不统一 → 强制规范（"UPPER_SNAKE_CASE + HTTP status"）
- 没有幂等策略 → 强制评估（"重复执行最坏会怎样？"）
- 和 db-design 职责重叠 → 拉回（"这是接口层还是存储层？"）
- module 文件缺少模板必需节（入口 / 公共接口 / 内部函数 / 依赖关系 / 接口合约）→ 强制补充，参照 `${CLAUDE_SKILL_DIR}/../shared/module-template.md`
## 验证清单
- [ ] API1-API7 是否都有选择 + 理由 + 被拒方案？
- [ ] 每个端点是否有完整接口合约？
- [ ] 资源命名是否用复数名词？
- [ ] 嵌套深度是否 ≤ 2 层？
- [ ] 错误格式是否结构化？
- [ ] 有副作用的写操作是否有幂等策略？
- [ ] 共享数据模型是否完整？
- [ ] 每个 module 文件是否包含模板必需节（入口 / 公共接口 / 内部函数 / 依赖关系 / 接口合约）？
## 历史维护（自动）
完成后自动执行：
1. **追加 feature changelog.md**：
   ```markdown
   ### v{版本} — {日期} — API 详设
   - **触发**：{用户说的一句话}
   - **产出**：api/contract.md（API1-API7）+ {N} 个 modules
   ```
2. **追加 docs/timeline.md**：
   ```markdown
   ### {日期} — {feature} API 详设
   - 新增：api/contract.md + modules/
   ```
3. **检查膨胀**：超 100 行时归档。
## 完成提示
```
✅ API 详设完成！api/contract.md + modules/ 已生成。

下一步（detail 编排自动继续）：
  数据库详设   — 表结构 + 索引 + 迁移
  前端详设     — 组件 + 数据流 + 状态管理（如有前端）
```
