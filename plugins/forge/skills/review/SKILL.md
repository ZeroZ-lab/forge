---
name: review
description: Performs independent review of diffs, documents, code, tests, and consistency before build or release. Use for lightweight review requests and for full quality-gate review when explicitly requested.
when_to_use: Use when the user asks to review changes, inspect a diff, check code quality, audit documents, find goal inconsistency, run an adversarial review, verify implementation against docs, or assess release readiness.
---

# Review — 独立审查

## 职责

在关键阶段前做独立审查，找出文档、代码、测试和决策之间的不一致。

review 的目标不是总结优点，而是发现会导致目标未达成、错误发布或未来验证失败的问题。

## 执行纪律

- **D1**：每个问题必须有证据、影响和修复建议
- **D5**：不替代 codegen，不直接发布，不用同一轮自我确认代替独立检查
- **D8**：发现偏差必须做差距分析（skill 方法论 / 文档未同步 / 代码实现 / 范围蔓延），明确根因才能精准修复
- 实现质量评价维度见 `${CLAUDE_SKILL_DIR}/../shared/rubrics/implementation-quality.md`
- 目标质量评价维度见 `${CLAUDE_SKILL_DIR}/../shared/rubrics/goal-quality.md`

## 上下游边界

**上游**：PRD、project.md、DESIGN.md、goal.md、modules、plan、src、tests、changelog、timeline。

**下游**：审查报告、阻塞项、文档补全清单、豁免记录。

不替代 codegen，不直接发布，不用同一轮自我确认代替独立检查。

## 何时不使用
- 无可审查的文档或代码
- 用户只想做格式检查（用 linter 而不是 review）
- 同一轮修改后立即自审（需要独立上下文消除自审偏见）

## 核心机制

主 agent 负责编排范围和呈现结论；独立审查者负责从失败模式出发检查。可使用 subagent 时，优先用 subagent 隔离上下文和自审偏见。

详细审查维度、prompt 和报告模板见 `references/review-protocol.md`。

## 运行时角色

review 是目标验证器。它不只判断”有没有问题”，还必须把差距分析成可传递信号：代码实现偏差回到 codegen，文档不一致回到 detail。

## 审查模式

### 文档审查

在 codegen 前执行。检查：

- 是否有足够的 WHAT / WHY / HOW / CONSTRAINTS。
- 是否残留未解决的 `[NEEDS CLARIFICATION: ...]` 标记 → 阻塞，路由到人类决策（P0/P1）。
- project、DESIGN、goal、modules、plan 是否一致。
- 模块边界、入口、公共接口、依赖关系是否可验证。
- 是否有未记录的人类决策。

### 代码审查

在 deploy 前执行。检查：

- 代码是否满足声明的目标。
- API、数据模型、错误码、权限、测试是否和目标一致。
- 关键逻辑是否引用决策编号（FD# / PD# / DB#）。
- 测试是否覆盖验收条件和风险边界。


## 审查流程

1. 确定模式：文档或代码。
2. 收集范围：列出读取文件和不读取文件。
3. 建立检查表：按模式选择维度。
4. 执行审查：优先找 P0/P1，保留证据。
5. 输出报告：问题优先，摘要靠后。
6. 循环修复：阻塞项修复后重新审查。

## 问题优先级

- **P0**：会导致错误实现、数据损坏、安全漏洞、无法发布。
- **P1**：会导致重要行为偏离、测试失真、未来验证失败。
- **P2**：清晰度、可维护性或局部一致性问题。

## 入口/出口条件

**入口**：已有可审查的文档或代码；用户要求 review；或 codegen 或 deploy 前需要质量门。

**缺失处理**：
- 文档不完整 → 做有限审查，标注"基于不完整文档，结论可能变化"
- 无 changelog/timeline → 标注"无历史上下文，可能误判决策"

**出口**：审查报告已输出，P0/P1 有文件位置、证据和修复建议。

## 运行时信号

- 输入：artifact ready、health check trigger
- 输出：P0/P1/P2 issues、skill/document/code attribution
- 路由：详见本文件 frontmatter.signal_routes
- 升级：P0/P1 found · WHY missing before codegen · gap has no root cause

## 差距分析

每个问题归因到四层之一，根因不同修法不同：

- **skill 方法论**：skill 的决策点或方法论缺陷导致遗漏 → 记录为已知风险，供后续迭代参考
- **文档未同步**：文档间不一致（上游改了下游没跟） → 级联更新
- **代码实现**：代码未满足声明的目标 → 修代码
- **范围蔓延**：实现超出了 goal/PRD 定义的范围且无决策记录 → 路由到 define 或 detail 补充决策，参考 `${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`

## 红旗清单
- 只做摘要不列问题 → 强制列出具体问题（证据+影响+修复建议）
- 只检查格式不检查跨文档一致性 → 强制检查 goal vs code
- 没读 changelog/timeline 就评价当前决策 → 先读历史再评价
- 测试通过但代码和合约不一致 → 标记为 P1（测试覆盖 ≠ 目标对齐）
- 文档缺 WHY 却直接允许 codegen → 阻塞，先补 WHY
- 发现问题后没有重新审查 → 修复后必须复审
- 发现偏差后没有归因 → 强制差距分析到四层之一（skill 方法论 / 文档未同步 / 代码实现 / 范围蔓延）
- 实现范围超出 goal/PRD 定义 → 范围蔓延红旗，参考 `${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`

## 验证清单

- [ ] 是否声明审查模式和范围？
- [ ] 是否列出读取的关键文件？
- [ ] 是否按严重度输出问题？
- [ ] 是否每个问题都有证据、影响和修复建议？
- [ ] 是否区分阻塞项、建议项和豁免项？

## 历史维护

审查结果影响文档或发布状态时，追加 feature `changelog.md` 和 `docs/timeline.md`。

## 完成提示

```
审查完成：问题、证据、影响和修复建议已列出。

下一步：
  - 修复阻塞项并复审
  - 进入代码生成
  - 规划发布
```
