---
name: business-alignment
description: Aligns a product direction into project commitment by defining users, success metrics, resource constraints, and Go or No-Go decisions. Use for lightweight business fit checks or full business-alignment stage execution.
when_to_use: Use when the user asks about target users, project goals, success metrics, resource limits, demand validation, Go or No-Go decisions, or moving an explored direction into a committed project scope.
phase: define
type: domain
role: goal-refiner
triggers:
  - "验证需求"
  - "项目目标"
  - "成功指标"
avoid_when:
  - "只是技术探索"
  - "已有完整 PRD"
  - "已有 project.md"
consumes:
  - "idea-brief.md"
  - "user business context"
  - "docs/change-units/CU-*.md"
produces:
  - "docs/project.md business goals"
  - "docs/change-units/CU-*.md"
signals_in:
  - "direction decision"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "Go decision"
  - "No-Go decision"
  - "business constraints"
  - "change_unit.updated"
escalates_when:
  - "用户画像、指标、资源不对齐"
output_contract:
  - "用户画像"
  - "成功指标"
  - "资源约束"
  - "Go/No-Go 决策"
maturity: stable
stage_next:
  - define
  - technical-design
feedback_to:
  - brainstorm
quality_gates: []
signal_routes:
  - signal: "Go decision"
    to: define
    when: "business commitment is accepted"
  - signal: "No-Go decision"
    to: brainstorm
    when: "direction, user, metric, or resource assumptions need to be revisited"
  - signal: "business constraints"
    to: technical-design
    when: "technical choices need business and resource context"
---
# Business Alignment — 定义阶段（业务层）
## 职责
从探索方向到项目承诺——把 idea-brief 变成"我确定要做、为谁做、做到什么程度算成功"。
**核心洞察**：brainstorm 的产出是方向地图，business-alignment 的产出是承诺。方向是"这个值得探索"，承诺是"我投入资源做这件事"。
**方法论**：承诺四要素——为谁、做什么、怎么算成功、有多少资源。

## 执行纪律

- **D1**：Go/No-Go 决策必须记录理由，No-Go 理由用于未来重新评估
- **D3**：四要素不对齐时停下来呈现冲突，等人类决策
- **D6**：资源约束假设要显式列出（"如果只有 2 周呢？"）

## 与 brainstorm 的边界
```
brainstorm（探索）               business-alignment（承诺）
─────────────────────────────────────────────────────────────
理解问题                        读 idea-brief，不重复
展开方向                        读方向地图，不重复
MVP 验证假设                    读验证计划，不重复
                                ↓ 产出
                                为谁做（用户画像）
                                做到什么程度（成功指标）
                                有多少资源（约束）
                                Go / No-Go（承诺决策）
```
brainstorm 回答"这个方向值得探索吗"，business-alignment 回答"我承诺投入多少资源做这件事"。
## 方法论：承诺四要素
### 要素 1: 为谁做（用户画像）
从 brainstorm 的"有痛点的人"变成"有名字、有场景、有工作流程的具体人物"。
**核心问题**：
- 谁会用？能叫出名字吗？
- 他的一天是什么样的？在什么场景下打开这个产品？
- 他当前怎么解决这个问题？
**不变原则**：
- 目标用户要具体到能画出来——不是"所有人"，是"张三，产品经理，每周五下午写周报"
- 最多 3-5 个典型用户，不是越多越好
- 每个用户要有名字 + 角色 + 核心诉求 + 使用场景
### 要素 2: 做到什么程度（成功指标）
从 brainstorm 的"决策标准"变成项目的 KPI。
**核心问题**：
- 怎么知道这个项目成功了？
- 哪 3-5 个数字能判断成败？
- 什么时候评估？
**不变原则**：
- 成功标准要可量化——不是"用户喜欢"，是"日活 > 1000"
- 指标要少而精（3-5 个核心指标）
- 每个指标要有当前值、目标值、评估时间
### 要素 3: 有多少资源（约束）
资源决定范围，不是范围决定资源。
**核心问题**：
- 团队有多少人？多少时间？
- 预算是多少？
- 有哪些技术限制？
**不变原则**：
- 时间是最重要的约束——"如果只有 2 周呢？"
- 资源约束先于功能规划——先画框，再填内容
- 技术限制要提前暴露（不要做到一半才发现不行）
### 要素 4: Go / No-Go（承诺决策）
这是 brainstorm 和后续阶段之间的门。
**核心问题**：
- 基于 idea-brief 的方向地图 + 用户画像 + 成功指标 + 资源约束
- 我们确定要做吗？
- 不做的理由是什么？
**不变原则**：
- Go 需要所有要素对齐——用户明确、指标清晰、资源够
- No-Go 不是失败——是避免了最贵的错误（做了没人要的东西）
- 决策要记录理由，未来条件变化时可以重新评估
## AI 的角色
| 要素 | AI 角色 | 行为 |
|------|---------|------|
| 用户画像 | 场景丰富者 | 搜索目标用户群体的典型工作流程和使用场景 |
| 成功指标 | 行业对标者 | 搜索同类产品的行业基准指标 |
| 资源约束 | 现实检验者 | 根据团队规模评估 MVP 范围是否现实 |
| Go/No-Go | 决策辅助者 | 汇总四个要素，呈现对齐/冲突状态 |
## 决策点
### BA1: 用户画像
**问**：谁会用？工作流程是什么？在什么场景下使用？核心诉求是什么？
**记录**：用户画像表（名字 + 角色 + 核心诉求 + 使用场景）
### BA2: 成功指标
**问**：怎么知道成功了？哪几个数字能判断成败？什么时候评估？
**记录**：指标表（指标 + 当前值 + 目标值 + 评估时间）
### BA3: 资源约束
**问**：多少人？多少时间？多少预算？技术限制？
**记录**：团队规模 + 时间约束 + 预算 + 技术限制
### BA4: Go / No-Go
**问**：基于以上三个要素，我们确定要做吗？
**记录**：决策（Go/No-Go）+ 理由 + 风险
## 文档约束
**合入 project.md 的「业务目标」段落，不生成独立文件。**
必须包含：用户画像表 · 成功指标表 · 资源约束 · Go/No-Go 决策
不应包含：方向探索（brainstorm 已做）· 具体功能列表（define 阶段）· 技术选型（init 的技术阶段）
## 模板
使用 `${CLAUDE_SKILL_DIR}/../shared/project-template.md` 填充「业务目标」段落。核心结构：
1. **用户画像表** — 角色 × 描述 × 核心诉求 × 使用场景
2. **成功指标表** — 指标 × 当前值 × 目标值 × 评估时间
## 入口/出口条件
**入口**：有 idea-brief.md（来自 brainstorm）或用户已有明确方向
**出口**：project.md「业务目标」已填写 · Go 决策已确认 · 用户确认进入下一阶段

**缺失处理**：
- 无 idea-brief.md → 降级为 5 分钟快速探索（"用一句话描述你想做什么？为谁做？"），不强制回退 brainstorm
- idea-brief.md 缺推荐方向 → 要求用户从方向列表中选择一个再继续
## 运行时信号
- 输入：direction decision
- 输出：Go decision、No-Go decision、business constraints
- 路由：详见本文件 frontmatter.signal_routes
- Go 决策路由：→ define（进入需求定义）+ → technical-design（同步业务约束）
- No-Go 决策路由：→ 终止当前流程，记录理由到 timeline
- 升级：用户画像、指标、资源不对齐
## 何时不使用
- 只是技术探索（不需要业务承诺）
- 已有完整 PRD（直接进入 design 阶段）
- 已有项目级 project.md（跳过，直接进入新功能）
## 轻量模式
**触发条件**：1 人项目 / 个人学习 / 技术 Demo / 黑客松
**简化规则**：
- 用户画像：一句话描述即可（不需要名字+场景+工作流程）
- 成功指标：1-2 个核心指标（不需要 3-5 个）
- 资源约束：只填团队规模和时间（跳过预算）
- Go/No-Go：简化为"确认要做"一句话
**何时不使用轻量模式**：
- 团队 ≥ 3 人
- 有外部利益方（客户/投资人）
- 有明确交付时间线的商业项目
## 红旗清单
- "所有人都需要" → 强制具体化（"给我 3 个典型用户"）
- 成功标准模糊 → 强制量化（"具体数字是什么？"）
- 资源无限 → 强制约束（"如果只有 2 周呢？"）
- 跳过 brainstorm 直接进入 → 先读 idea-brief（"方向验证了吗？"）
- 要素不对齐 → 呈现冲突（"5 人团队 2 周做 10 个功能？"）
- No-Go 时不记录理由 → 强制记录（"为什么不做了？"）
## 验证清单
- [ ] 目标用户是否具体（有名字、有场景）？
- [ ] 成功标准是否可量化（3-5 个指标）？
- [ ] 资源约束是否明确（团队、时间、预算）？
- [ ] Go/No-Go 决策是否有明确理由？
- [ ] 四个要素是否对齐（用户、指标、资源之间无冲突）？
- [ ] 轻量模式触发条件是否满足（团队 ≤ 2 人 / 无外部利益方 / 无交付时间线）？
- [ ] 轻量模式下产物是否仍包含核心四要素（简化版）？
- [ ] 业务目标质量是否满足 goal-quality 标准？参考 `${CLAUDE_SKILL_DIR}/../shared/rubrics/goal-quality.md`
## 历史维护（自动）
完成后自动执行：
1. **追加 docs/timeline.md**：
   ```markdown
   ### {日期} — 项目初始化（业务对齐）
   - 用户：{核心用户画像}
   - 目标：{成功指标}
   - 决策：Go / No-Go
   ```
2. **检查膨胀**：timeline.md 超 100 行时归档。
## 完成提示
```
✅ 业务对齐完成！project.md「业务目标」已填写。

下一步（init 编排自动继续）：
  技术选型   — 架构模式 + 技术栈 + 服务划分
  设计系统   — 色彩 + 字体 + 组件模式
```

