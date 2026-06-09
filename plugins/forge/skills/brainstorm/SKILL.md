---
name: brainstorm
description: Explores ambiguous ideas through structured divergence-convergence to find the most promising direction. Use when brainstorming, comparing ideas, or clarifying vague concepts before requirements.
when_to_use: Use when the user says they want to brainstorm, explore possibilities, compare ideas, clarify a vague idea, or figure out what is worth pursuing before requirements or design.
phase: explore
type: domain
role: goal-refiner
triggers:
  - "想法模糊"
  - "探索方向"
  - "brainstorm"
avoid_when:
  - "方向已明确"
  - "已有完整 PRD"
  - "纯技术实现问题"
consumes:
  - "user intent"
  - "problem context"
  - "docs/change-units/CU-*.md"
produces:
  - "idea-brief.md"
  - "docs/change-units/CU-*.md"
signals_in:
  - "user uncertainty"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "validated direction"
  - "assumption list"
  - "change_unit.updated"
escalates_when:
  - "方向无法排序"
  - "核心痛点无法具体化"
output_contract:
  - "方向地图"
  - "MVP 定义"
  - "假设清单"
  - "验证计划"
maturity: stable
stage_next:
  - business-alignment
  - init
feedback_to: []
quality_gates: []
signal_routes:
  - signal: "validated direction"
    to: business-alignment
    when: "direction is concrete enough for business commitment"
  - signal: "assumption list"
    to: init
    when: "new project initialization can proceed from explored direction"
---
# Brainstorm — 探索阶段

## 职责

展开可能性空间，通过结构化发散-自我反驳-收敛找到真正值得投入的方向。

**核心洞察**：brainstorm 最大的敌人不是"没有好点子"，而是"太快收敛到第一个想到的方案"。

**方法论**：5 阶段顺序执行——理解 → 发散 → 反驳 → 评分 → 收敛。自适应深度：轻（1-2）、中（1-4）、重（全部 5 阶段）。

## 执行纪律

- **D1**：所有决策（包括被拒方向）记录在 idea-brief.md 中
- **D3**：方向选择等关键分歧点停下来呈现选项，等人类确认
- **D5**：只探索方向，不做技术选型和详细设计
- **D6**：每个方向列出核心假设，假设不成立时向人类确认

## 上下游边界

**上游**：用户模糊想法、痛点描述、竞品信息。

**下游**：idea-brief.md → business-alignment（业务对齐）或 init（项目初始化）。

不涉及技术选型（init 阶段）、需求定义（define 阶段）、交互设计（design 阶段）。

## 方法论：5 阶段顺序执行

### 阶段 1：问题理解与澄清

从模糊输入中识别真正的问题。不急于生成方案。

**行动**：复述理解 → 追问 5 层"为什么" → 痛点具体化到真实场景 → 确认探索范围。

**不变原则**：先理解问题再想方案——跳到方案太快是最常见的失败。痛点要具体到能讲出一个真实场景。

### 阶段 2：发散生成

沿 8 个维度展开 8-12 个想法。

| 维度 | 视角 |
|------|------|
| 用户痛点 | 用户的真实困扰是什么？ |
| 工作流 | 如何嵌入现有流程？ |
| 杠杆点 | 哪里可以放大投入产出比？ |
| 工程实现 | 技术上怎么做？ |
| 成本 | 投入多大？ROI 如何？ |
| 风险 | 什么会导致失败？ |
| 产品形态 | 最终交付物长什么样？ |
| 反共识 | 常规思路的反面是什么？ |

**不变原则**：发散时不评判——每个想法记录"什么场景下它是对的"。

### 阶段 3：自我反驳

每个想法必须接受 5 个必答问题的攻击：

1. 最大的弱点是什么？
2. 在什么条件下完全失效？
3. 有没有更简单的替代方案？
4. 假设中最脆弱的是哪个？
5. 一年后回看，什么原因会让它失败？

**不变原则**：反驳不是为了否定，是为了找到真正站得住脚的部分。经不起反驳的想法不值得投入。

**边界**：这是轻量级可行性筛选，不是深度对抗攻击。战略级决策需要深度攻击时，用 think L2。

### 阶段 4：评分筛选

5 维度加权评分，量化比较。

| 维度 | 权重 | 含义 |
|------|------|------|
| 目标契合度 | 30% | 是否真正解决核心问题 |
| 可执行性 | 20% | 团队能力、时间窗口是否匹配 |
| 可复用性 | 20% | 方案沉淀后能否复用到其他场景 |
| 成本 | 15% | 资源投入是否合理 |
| 风险 | 15% | 失败概率和失败代价 |

**不变原则**：评估标准先于评估——先定权重，再打分。分数是相对比较指标，用高/中/低或 1-3 分避免虚假精度。

### 阶段 5：最终收敛

产出一个推荐方案：推荐理由、被拒方案及理由、风险清单、下一步行动。

**验收**：
- 最低：核心问题已澄清 · 至少 5 个想法经过反驳 · 有量化评分 · 有明确推荐。
- 进阶：覆盖全部 8 维度 · 12+ 想法 · 假设已验证或有验证计划 · 竞品对比已完成。

### 自适应深度与迭代

| 深度 | 阶段 | 适用场景 |
|------|------|---------|
| 轻 | 1-2 | 快速探索，已有方向直觉 |
| 中 | 1-4 | 需要比较多个候选方向 |
| 重 | 1-5 | 战略级决策，需要完整论证 |

简单问题 1 轮，复杂问题 2-3 轮。每轮结束检查：反驳推翻推荐 → 回阶段 2；评分差异太小 → 回阶段 1 澄清标准；方向清晰 → 结束。

**迭代合并**：新一轮替换旧结论，被推翻的方案压缩为一行摘要，最终产物中每个结论只出现一次。

## AI 的角色

| 阶段 | AI 角色 | 行为 |
|------|---------|------|
| 理解 | 思维挑战者 | 挑战假设、追问根因 |
| 发散 | 信息搜索者 | 跨领域借鉴、竞品扫描 |
| 反驳 | 反方律师 | 构造最强反对意见 |
| 评分 | 数据分析师 | 量化比较、消除模糊 |
| 收敛 | 现实检验者 | 压力测试推荐方案 |

## 决策点

> Brainstorm 使用 B# 前缀。B# 记录在 idea-brief.md 中。

### B1: 问题定义（阶段 1）

**问**：真正在解决什么问题？痛点具体到什么场景？

**记录**：核心问题 + 痛点场景 + 根因分析

### B2: 发散边界（阶段 2）

**问**：哪些维度最值得深入？有没有"疯狂但可能成立"的想法？

**记录**：想法列表 + 各维度的核心洞察

### B3: 反驳结论（阶段 3）

**问**：哪些想法经得起反驳？哪些被击穿但部分有价值？

**记录**：存活想法 + 被击穿想法 + 补强建议

### B4: 评分权重（阶段 4）

**问**：5 个维度的权重是否需要调整？

**记录**：最终权重 + 调整理由（如有）

### B5: 推荐方向（阶段 5）

**问**：推荐哪个方向？为什么？被拒方案的理由是什么？

**记录**：推荐方案 + 理由 + 被拒方案 + 风险 + 下一步

## 文档约束

**idea-brief.md 必须包含**：核心问题重述 · 发散方向表 · 自我反驳表 · 评分筛选表 · 推荐方案 · 不推荐方案 · 下一步行动

**idea-brief.md 不应包含**：技术选型 · 详细功能列表 · 交互设计 · 代码 · 约束条件（define 负责） · 成功标准（define 负责）

## 模板

使用 `${CLAUDE_SKILL_DIR}/references/idea-brief-template.md` 作为产出结构参考。

## 入口/出口条件

**入口**：用户有模糊想法或痛点，尚未明确方向

**出口**：idea-brief.md 已生成 · 推荐方向已确认 · 最低验收通过

**缺失处理**：
- 无痛点/无方向 → 降级为开放式探索，不生成文档
- 用户已有完整方向 → 跳过 brainstorm，建议进入 init 或 business-alignment
- 用户只想聊不想产出 → 尊重节奏，结束时问"需要整理成 idea-brief 吗？"

## 运行时信号

- 输入：user uncertainty
- 输出：validated direction、assumption list
- 路由：详见本文件 frontmatter.signal_routes
- 升级：方向无法排序 · 核心痛点无法具体化 · 反驳全部推翻现有想法

## 何时不使用

- 方向已经明确 → 直接进入 init 或 business-alignment
- 只是技术实现问题 → 直接进入 detail
- 已有完整 PRD → 直接进入 detail 或 design

## 红旗清单

- 用户说"我们想做一切" → 强制收敛到 1 个核心痛点
- 所有方向评分"差不多" → 强制排序（"如果只能选一个呢？"）
- 跳过发散直接收敛 → 拉回发散，至少展开 5 个想法
- 自我反驳走过场 → 必须构造真正有杀伤力的 5 个问题
- 痛点太抽象 → 追问具体场景（"能描述一个真实的例子吗？"）
- 所有想法都很常规 → 加 1 个反共识选项
- 评分后没有明确推荐 → 强制收敛（"哪个最不怕后悔？"）

## 验证清单

- [ ] 核心问题是否具体到真实场景？
- [ ] 是否沿至少 6 个维度展开了想法？
- [ ] 每个想法是否接受了 5 个必答反驳问题？
- [ ] 是否有 5 维度加权评分表？
- [ ] 是否有明确推荐 + 被拒方案及理由？
- [ ] 下一步行动是否具体到"谁、做什么、什么时候"？
- [ ] 最终产物中每个结论是否只出现一次？

## 历史维护（自动）

完成后自动执行：
1. **追加 docs/timeline.md**（如不存在则创建）：
   ```markdown
   ### {日期} — {主题} 探索
   - 产出：idea-brief.md（{N} 个想法，{M} 轮探索，推荐：{方向名}）
   ```
2. **更新 docs/status.md**（如不存在则从模板创建）：
   - 新 feature → 添加行，⓪探索 → `✅`
   - 已有 feature → 更新 ⓪探索 列为 `✅`
3. **检查膨胀**：timeline.md 超过 100 行时归档到 `timeline/`。

## 完成提示

完成后向用户展示：
```
✅ 探索完成！idea-brief.md 已生成。

推荐方向：{方向名}
深度：{轻/中/重}，{N} 个想法，{M} 轮探索

下一步你可以：
  business-alignment — 业务对齐、项目章程
  init 阶段          — 初始化项目（技术选型 + 设计系统）
  继续探索           — 对某个方向深入 brainstorm
```
