---
name: technical-design
description: Reviews and makes architecture decisions, technical tradeoffs, stack choices, service boundaries, deployment shape, and shared engineering constraints. Use for lightweight architecture review or full technical-design execution.
when_to_use: Use when the user asks about architecture, technical design, stack choice, service split, runtime, framework, deployment architecture, performance constraints, tradeoffs, or whether a technical approach fits.
phase: design
type: domain
role: goal-refiner
triggers:
  - "技术设计"
  - "架构"
  - "技术选型"
avoid_when:
  - "纯前端项目"
  - "已有完整技术架构"
consumes:
  - "docs/project.md business goals"
  - "team constraints"
  - "docs/change-units/CU-*.md"
produces:
  - "docs/project.md technical decisions"
  - "docs/change-units/CU-*.md"
signals_in:
  - "business and resource constraints"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "technical constraints"
  - "architecture decisions"
  - "change_unit.updated"
escalates_when:
  - "团队经验、业务约束、运维能力缺失"
output_contract:
  - "架构模式"
  - "技术选型"
  - "服务划分"
  - "数据架构"
  - "部署架构"
maturity: stable
stage_next:
  - detail
  - codegen
feedback_to:
  - business-alignment
quality_gates: []
signal_routes:
  - signal: "technical constraints"
    to: detail
    when: "domain contracts need architecture constraints"
  - signal: "architecture decisions"
    to: codegen
    when: "code generation needs project-level decisions"
---
# Technical Design — 设计阶段（技术层）
## 职责
定义系统的技术架构，做架构权衡和技术选型。
**核心洞察**：架构决策不可逆要慎重，组件选择可替换可以大胆。不存在最优解，只有最适合当前条件的。简单方案优先。
**方法论**：约束→选项→权衡→验证。

## 执行纪律

- **D1**：每个选择记录理由 + 被拒方案，trade-off 比选择本身更重要
- **D4**：简单方案优先，不要过度设计
- **D6**：约束条件要显式列出，团队经验 > 技术先进性

## 与上下游的边界

**上游**：读 project.md「业务目标」（来自 business-alignment），知道用户、指标、资源约束
**下游**：project.md「技术决策」交给 detail 阶段（详设）和代码生成

**和详设阶段的切法**：
- technical-design 定义**架构层**（单体/微服务、技术栈、服务划分、部署架构）
- detail 定义**详设层**（API 合约、数据模型、组件规格）

## 方法论：约束→选项→权衡→验证

### 第一步：明确约束（Constraint）

技术选型从约束开始，不是从"什么技术最好"开始。

**核心问题**：
- 团队熟悉什么技术栈？（学习成本是隐性成本）
- 业务约束是什么？（读写比、一致性要求、流量性能）
- 技术限制是什么？（公司规定、合规要求、已有系统）

**不变原则**：
- 团队经验 > 技术先进性——熟悉的技术栈快速迭代，新技术需要学习成本
- 约束决定选项空间——先画框，再选方案
- 简单方案优先——不要过度设计

### 第二步：列出选项（Option）

基于约束列出可能的技术方案。

**核心问题**：
- 架构模式：单体/微服务/Serverless？
- 技术栈：语言、框架、数据库？
- 服务划分：核心领域有哪些？怎么划分？

**不变原则**：
- 每个选项要有明确的选择理由
- 每个选项要有被拒方案（为什么不用 X）
- 选项要从约束推导，不是从"流行什么"推导

### 第三步：做权衡（Trade-off）

每个选择都是 trade-off，不存在完美方案。

**核心问题**：
- 选了什么？为什么选？
- 拒绝了什么？为什么拒绝？
- 这个选择的代价是什么？（性能、复杂度、学习成本）

**不变原则**：
- 记录 trade-off 比记录选择更重要——框架会换，人会走，决策记录不会过期
- 代价要显式记录（不是"以后再说"）
- 如果未来条件变化，可以基于 trade-off 重新评估

### 第四步：验证方案（Verify）

架构设计要可验证——有性能指标、安全策略、部署方案。

**核心问题**：
- 性能指标是什么？（QPS、延迟、可用性）
- 安全策略是什么？（认证、授权、加密）
- 部署架构是什么？（环境、伸缩、监控）

**不变原则**：
- 性能指标要量化（不是"快"，是"P99 < 200ms"）
- 安全策略要提前定义（不是事后补）
- 部署架构要可回滚（不是"上线后看着办"）

## AI 的角色

| 阶段 | AI 角色 | 行为 |
|------|---------|------|
| 约束 | 约束梳理者 | 从业务目标推导技术约束（读写比、一致性、团队经验） |
| 选项 | 方案搜索者 | 搜索技术方案（框架对比、数据库选型、最佳实践） |
| 权衡 | trade-off 分析者 | 搜索成功案例和失败教训，呈现每个选择的代价 |
| 验证 | 指标推荐者 | 搜索行业基准指标（QPS、延迟、可用性的合理范围） |

## 决策点

> 技术设计使用 TD# 前缀（Technical Design Decision）。TD# 记录在 project.md「技术决策」中。
> 项目级共享决策使用 PD# 前缀。

### TD1: 架构模式（选项+权衡阶段）

**问**：读写比？一致性要求？流量性能？团队技术栈？

**不变原则**：架构决策不可逆要慎重 · 简单方案优先 · 记录被拒方案

**记录**：架构模式 + 选择理由 + 被拒方案

### TD2: 技术选型（选项+权衡阶段）

**问**：团队熟悉什么？技术限制？生态和文档？

**不变原则**：团队经验 > 技术先进性 · 生态完善 > 性能极致

**记录**：技术栈清单 + 选择理由 + 被拒方案

### TD3: 服务划分（选项+权衡阶段）

**问**：核心领域有哪些？领域间耦合度？需要独立部署吗？

**不变原则**：高内聚低耦合 · 通信方式从耦合度推导 · 不要过度拆分

**记录**：服务清单 + 职责边界 + 通信方式

### TD4: 数据架构（验证阶段）

**问**：数据量？数据关系？需要事务支持吗？

**不变原则**：数据库选型从业务需求推导 · 索引策略从查询模式推导

**记录**：数据库选型 + 数据模型 + 索引策略

### TD5: 部署架构（验证阶段）

**问**：部署环境？弹性伸缩？多区域？

**不变原则**：部署架构要可回滚 · 监控方案要提前定义

**记录**：部署环境 + 伸缩策略 + 监控方案

### TD6: 工程约束（验证阶段）

**问**：代码怎么约束质量？哪些不变量在编译期捕获、哪些留给运行时？

**不变原则**：
- 类型系统是防线之一，不是唯一防线——弱类型语言靠运行时校验补齐
- 工具链约束（lint/format/CI）要在项目初期定，不是"以后再说"
- 模块边界和 public API 是架构决策，不是实现细节

**按语言类型适配子问题**：

| 子问题 | 适用 | 说明 |
|--------|------|------|
| 模块边界怎么划？public/private 怎么表达？ | 所有 | 机制因语言不同（Rust `mod`/Go `package`/TS `export`） |
| 哪些业务不变量用类型编码？ | 强类型（Rust, TS） | 状态机、值域约束、非法状态不可表示 |
| 类型不可表达的部分用什么替代？ | 弱/动态类型（Go, Python） | 运行时校验、assert、contract testing |
| 测试策略是什么？ | 所有 | 单元/集成/E2E 比例、关键路径覆盖 |
| lint/format/CI 约束有哪些？ | 所有 | 工具选型 + 门禁检查项 |
| 是否需要示例代码展示项目风格？ | 按需 | 多人协作或新项目时推荐 |

**记录**：工程约束清单（写入 project.md 共享约束「工程约束」段）

## 引导技巧

**4 种技巧**：约束挖掘（"5 人团队能承受微服务吗？"）· 被拒方案（"为什么不用 X？"）· 代价显式化（"性能？复杂度？学习成本？"）· 简单优先（"最简单的方案是什么？"）

## 文档约束

**project.md「技术决策」必须包含**：架构模式（+理由+被拒）· 技术选型（+理由+被拒）· 服务划分（+职责+通信）· 数据架构（+模型+索引）· 部署架构（+伸缩+监控）· 性能指标 · 安全策略 · 工程约束（模块边界 + 测试策略 + lint/CI）

**不应包含**：具体 API 设计（detail 阶段）· 具体代码实现（代码生成）· 具体测试用例（测试阶段）

## 模板

使用 `${CLAUDE_SKILL_DIR}/../shared/project-template.md` 填充「技术决策」段落。核心结构：
1. **架构模式表** — 选择 × 理由 × 被拒方案
2. **技术选型表** — 层 × 选择 × 版本 × 理由 × 被拒方案
3. **服务划分表** — 服务 × 职责 × 通信方式 × 数据库

## 入口/出口条件

**入口**：project.md「业务目标」已填写（来自 business-alignment）或用户已有交互和视觉设计
**出口**：project.md「技术决策」已填写 · 架构模式已确定 · 技术选型已确定 · 用户确认进入 detail 阶段

**缺失处理**：缺业务目标 → 补齐用户/指标再选型；已有技术栈 → 跳过 TD1-TD2 做验证。

## 运行时信号

- 输入：business and resource constraints
- 输出：technical constraints、architecture decisions
- 路由：详见本文件 frontmatter.signal_routes
- 升级：团队经验、业务约束、运维能力缺失

## 何时不使用

纯前端项目 · 已有完整技术架构（直接进入 detail 阶段）· 技术栈已确定（简化选型流程）

## 红旗清单

- 没有选择理由 → 强制补充（"为什么选这个？"）
- 过度设计 → 强制简化（"最简单的方案是什么？"）
- 团队不熟悉的技术 → 强制评估（"学习成本多高？"）
- 没有性能指标 → 强制量化（"QPS 多少？延迟多少？"）
- 没有监控方案 → 强制补充（"怎么知道系统正常？"）
- 没有被拒方案 → 强制补充（"为什么不用 X？"）
- 没有工程约束 → 强制补充（"lint 用什么？CI 门禁查什么？"）
- 强类型语言没用类型编码不变量 → 提醒（"这个状态能用 enum 表达吗？"）

## 验证清单

- [ ] 架构模式是否有明确的选择理由？
- [ ] 技术选型是否符合团队经验？
- [ ] 服务划分是否高内聚低耦合？
- [ ] 数据架构是否符合业务需求？
- [ ] 部署架构是否可回滚？
- [ ] 是否有性能指标（QPS、延迟、可用性）？
- [ ] 是否有安全策略（认证、授权、加密）？
- [ ] 工程约束是否已定义？（模块边界 + 测试策略 + lint/CI）
- [ ] 类型系统能力是否已评估？（哪些不变量编译期捕获）
- [ ] public API 边界是否在详设前就确定？

## 历史维护（自动）

完成后追加 `docs/timeline.md`：`### {日期} — 技术架构确定 · 架构：{模式} · 技术栈：{选型}`。超 100 行时归档。

## 完成提示

```
✅ 技术设计完成！project.md「技术决策」已填写。

下一步你可以：
  detail 阶段  — 进入详设阶段（API + 数据库 + 前端）
```

