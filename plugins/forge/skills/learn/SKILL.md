---
name: learn
description: Archives review findings into durable project knowledge — updates specs, AGENTS.md, regression tests when review finds skill-methodology gaps.
when_to_use: Use after review completes with skill-methodology attributions, or when the user asks to archive findings, update long-term specs, or consolidate review lessons.
phase: post-review
type: governance
role: knowledge-archivist
triggers:
  - "归档"
  - "沉淀"
  - "learn"
avoid_when:
  - "没有 review report"
  - "没有 skill 方法论层归因"
consumes:
  - "review report"
  - "deviation attribution"
  - "goal.md"
  - "docs/project.md"
  - "AGENTS.md"
  - "docs/change-units/CU-*.md"
produces:
  - "archive decision report"
  - "docs/change-units/CU-*.md"
signals_in:
  - "review.completed"
signals_out:
  - "knowledge.archived"
  - "project_state.updated"
escalates_when:
  - "归档目标不明确"
  - "长期规则与现有文档冲突"
output_contract:
  - "archive decisions"
  - "updated documents"
  - "discarded items with reasons"
maturity: experimental
stage_next: []
feedback_to:
  - detail
  - codegen
---

# Learn — 知识归档

## 职责

从 review report 的 skill 方法论层归因中提取可沉淀知识，判断归档或丢弃，写入长期文档。

learn 不产生新代码、不做架构决策、不修改 skill 方法论本身。它只做知识路由：判断哪些发现应该进入长期项目知识库，写入哪里。

## 执行纪律

- **D1**：每条归档决策留痕——归到哪里、为什么、拒绝了什么
- **D3**：归档是人类决策，AI 只建议不自动执行。呈现归档建议，等人类确认
- **D5**：只处理 review report 中明确归因到 skill 方法论层的发现，不擅自扩大归档范围

## 与上下游的边界

**上游**：review report（deviation attribution 中 skill 方法论层的条目）。

**下游**：长期文档更新（goal.md、project.md、AGENTS.md、shared concepts、regression tests）。

不替代 review（不做新的审查），不替代 codegen（不写实现代码）。

## 归档判断

### 需要归档

| 内容类型 | 归档目标 | 示例 |
|---------|---------|------|
| 长期有效的业务规则 | goal.md 或 project.md | "所有金额字段使用分存储" |
| 架构决策 | project.md 或 gated ADR | "读分离写走主库" |
| 测试命令 | AGENTS.md | "集成测试: `pnpm test tests/integration/`" |
| 关键风险 | goal.md 已知风险段 | "并发上传可能导致超限" |
| 约定俗成的实现模式 | project.md 或 shared/concepts/ | "所有 API 响应统一 envelope 格式" |
| 容易被未来 Agent 误改的边界 | goal.md 边界段 | "软删除字段只在此 feature 使用，不全局推广" |
| 回归测试 | tests/ | "权限绕过回归测试" |

### 不需要归档

- 临时调试过程
- 一次性探索
- 已废弃方案
- 低价值细节（如变量命名偏好）
- 过时上下文

## 方法论

1. **读取**：读取 review report，提取归因层为「skill 方法论」的全部发现
2. **判断**：对每条发现做归档判断（需要 / 不需要）
3. **建议**：需要归档的 → 呈现归档目标和理由，等人类确认（D3）；确认门决策 ID 使用 `archive_target_confirmation`
4. **写入**：确认后写入目标文档，记录决策编号
5. **丢弃**：不需要归档的 → 标记并说明原因
6. **报告**：输出归档决策报告

## 入口/出口条件

**入口**：review report 存在 · 有 skill 方法论层归因 · 用户确认执行归档

**缺失处理**：review report 无 skill 方法论层归因 → 输出"无可归档内容"，结束

**出口**：归档决策已记录 · 需要归档的已写入（或人类确认跳过）· 不需要归档的已标记原因

## 归档决策报告格式

```markdown
# Archive Decision Report — {feature}

## Archived
- {发现} → {目标文档}（理由）

## Discarded
- {发现}: 不归档原因

## Updated documents
- `path`: 变更摘要
```

## 红旗清单

- 没有 review report 就执行归档 → 强制要求 review report 作为输入
- 自动归档不问人类 → 强制 D3，呈现建议等确认
- 归档范围超出 skill 方法论层 → 强制只处理该层归因
- 归档后未记录决策编号 → 强制 D1 留痕

## 验证清单

- [ ] 是否只处理了 skill 方法论层的归因？
- [ ] 每条归因是否都做了归档/丢弃判断？
- [ ] 需要归档的是否经过人类确认（D3）？
- [ ] 不需要归档的是否说明了原因？
- [ ] 写入的文档是否追加了决策编号（D1）？

## 历史维护

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md` 与 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。只有用户确认归档且权威文档实际变更后才写 Change Unit。

## 完成提示

```
✅ 知识归档完成！

归档: {N} 条写入长期文档
丢弃: {M} 条（已标记原因）

更新的文档:
  - {文件列表}
```
