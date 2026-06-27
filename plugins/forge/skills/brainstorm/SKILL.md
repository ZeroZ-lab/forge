---
name: brainstorm
description: Explores ambiguous ideas through structured divergence-convergence to find the most promising direction.
when_to_use: Use when the user has a vague product idea, wants options, asks to brainstorm, explore directions, compare possibilities, or decide what to build before requirements are defined.
---

# Brainstorm — 方向探索

## 职责

把模糊想法扩展成多个方向，再收敛到可验证的候选方向。brainstorm 不做技术选型、不写 PRD、不承诺实现。

## 执行纪律

- D1：记录被拒方向和理由。
- D3：关键方向选择交给人类。
- D5：只探索方向，不做详细设计。
- D6：每个方向列核心假设。

## 方法论：5 阶段顺序执行

### 阶段 1：问题理解与澄清

复述用户意图、目标用户、场景、约束和未知点。

### 阶段 2：发散生成

从用户、场景、商业、技术、风险、差异化等角度生成多方向。

### 阶段 3：自我反驳

攻击每个方向的用户价值、可行性、差异化和成本。

### 阶段 4：评分筛选

按价值、可行性、风险、资源匹配和验证速度评分。

### 阶段 5：最终收敛

推荐 1-3 个方向，给下一步验证计划。

### 自适应深度与迭代

小问题 1 轮；战略方向 2-3 轮；发现关键假设不稳时转 business-alignment 或 think。

## 决策点

### B1: 问题定义（阶段 1）

确认真正要探索的问题。

### B2: 发散边界（阶段 2）

确认允许/禁止探索的范围。

### B3: 反驳结论（阶段 3）

记录最强反对意见。

### B4: 评分权重（阶段 4）

确认价值、速度、风险等权重。

### B5: 推荐方向（阶段 5）

记录推荐、理由、被拒方向和验证计划。

## 文档约束

默认在对话中给出轻量 idea brief（方向地图、评分、假设、推荐、被拒方案和下一步），不创建 `docs/idea-brief.md`。用户确认的目标和边界写入 feature `goal.md` 或 `docs/project.md`。

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。只有存在独立研究交接或审批责任时，才将可复用证据写入 gated `research-brief.md`。

## 入口/出口条件

入口：想法模糊或需要方向选择。出口：候选方向和验证计划清楚，可进入 business-alignment 或 define。

## 红旗清单

- 只给一个想法。
- 没有反驳和假设。
- 把探索变成技术方案。
- 推荐没有评分依据。
- 未经用户确认直接进入实现。

## 验证清单

- [ ] 是否复述并澄清问题？
- [ ] 是否有多个方向和被拒方案？
- [ ] 是否列核心假设和验证计划？
- [ ] 是否有评分权重和推荐理由？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。只有权威目标发生持久变更时才写 Change Unit。
