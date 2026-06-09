# CU-20260609-agent-readable-goal-docs

## Type

- Methodology

## Intent

- Trigger: 用户反馈"文档越详细效果反而越差"，且很多 agent 的 read 一次只读 ~200 行；调研外部 SDD 方案（Spec Kit / Kiro / OpenSpec / BMAD）后定位到四个 agent 可读性缺口。
- Goal: 在不改变 Forge"目标约束而非详细蓝图"立场的前提下，让目标文档对 agent 更友好——首屏即合约、验收条件可机读、暴露假设有钩子、读取有协议。
- Out of scope: 结构性决策 A（拆分 project.md 为 Kiro 式 steering 三件套）和 B（OpenSpec 式 change 目录 + 完成即归档）显式不做，留作 v2 候选。

## Behavior Change

- User-visible behavior: 无（方法论/模板层变更）。
- Internal behavior: detail 生成 goal.md 时显式要求首屏合约 + EARS + NEEDS_CLARIFICATION；review 在 codegen 前检查残留澄清标记并按 P0/P1 阻塞。
- Contract change: goal-template 新增「待澄清」「需要细节时」两节；完成标准从自由文本改为优先 EARS 句式。四个 validate 必需头（## 目标/## 边界/## 完成标准/## 决策记录）保留。
- Data change: 无。

## Affected Surface

- Features: 方法论本身（Forge plugin 模板与纪律）。
- Modules: N/A。
- Contracts:
  - shared/goal-template.md（首屏合约提示 + EARS 完成标准 + 待澄清 + 需要细节时指针）
  - shared/frontend-goal-template.md（首屏提示 + EARS + 待澄清）
  - shared/module-template.md（验收条件 EARS + 自描述头规范）
  - shared/rubrics/goal-quality.md（新增 First-screen contract / Assumptions exposed 维度，EARS 写入 Runtime fit，澄清残留作为 codegen 前门禁）
  - shared/concepts/execution-discipline.md（NEEDS_CLARIFICATION 机制落地 D6）
  - init/references/agents-template.md（顶部新增「读取协议」）
  - review/SKILL.md + review/references/review-protocol.md（文档审查新增残留澄清标记检查）
  - detail/SKILL.md（生成 goal 步骤补首屏合约/EARS/待澄清/指针）
- Code implementation: 无代码逻辑改动。
- Tests: 沿用 scripts/validate.mjs + node --test。
- Operations: 无。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| EARS 句式对纯展示类 feature 可能僵硬 | 低 | 模板写明"优先"非强制，纯展示无触发时可退化为可验收陈述句 |
| 与 define 的 Given-When-Then 并存造成困惑 | 低 | 两者分属不同产物（PRD AC vs goal 完成标准），互补且都可测试，define 不改 |
| 首屏 30 行为软约束，可能被超出 | 低 | rubric 新增 First-screen contract 维度，由 review 检出 |

## Verification

- Commands: `node scripts/validate.mjs`、`node --test 'tests/*.test.mjs'`
- Manual checks: 确认 goal-template 保留四个 validate 必需头；模板均 ≤200 行；detail SKILL ≤350 行。
- Evidence: validation passed (23 skills, version 0.32.0)；tests 109 pass / 0 fail。
- Not verified: 未做真实 agent 运行评测（evals/skills-suite 真跑），仅静态自检通过。

## Rollback

- Revert path: 还原本 CU 列出的 9 个模板/skill 文件即可，无迁移。
- Data rollback: N/A。
- Safe stop condition: validate 或 node --test 失败时停止并回退。

## Docs To Sync

- [x] feature goal.md（模板层，无具体 feature goal 需改）
- [ ] testing docs
- [ ] deploy docs
- [x] changelog / timeline summary（方法论变更，按需在 timeline 追加摘要并链接本 CU）

## Completion Evidence

- Code diff: 9 个文件，全部为模板/纪律/skill 文档，零代码逻辑。
- Test evidence: validate passed (23 skills, v0.32.0)；node --test 109 pass / 0 fail。
- Doc sync result: rubric、execution-discipline、review、detail、agents-template 已与新模板一致。
- Residual risk: 缺真实 agent 行为评测；EARS 推广效果待实际使用反馈。
