---
name: review
description: Performs independent review of diffs, documents, code, tests, and consistency before build or release. Use for lightweight review requests and for full quality-gate review when explicitly requested.
when_to_use: Use when the user asks to review changes, inspect a diff, check code quality, audit documents, find goal inconsistency, run an adversarial review, verify implementation against docs, or assess release readiness.
---

# Review — 独立审查

## 职责

发现会导致目标未达成、错误发布、未来验证失败的问题。review 不是总结优点，也不替代 codegen；它把文档、代码、测试和历史决策放到同一张证据表里审。

## 执行纪律

- D1：每个问题必须有证据、影响和修复建议。
- D5：不直接改实现、不发布、不用同一轮自审替代独立检查。
- D8：偏差必须归因到 skill 方法论、文档未同步、代码实现或范围蔓延。
- 质量标准：`${CLAUDE_SKILL_DIR}/../shared/rubrics/implementation-quality.md`、`${CLAUDE_SKILL_DIR}/../shared/rubrics/goal-quality.md`。

## 上下游边界

上游：project、goal、modules、可选 gated artifacts、Change Units、src、tests。下游：对话中的 findings、阻塞项、文档补全清单、豁免记录。详细维度和报告模板见 `references/review-protocol.md`。

## 何时不使用

没有可审查产物、用户只要格式检查、或同一轮修改后立即让原实现上下文自证正确时，不走完整 review。

## 审查模式

**文档审查**（codegen 前）：查 WHAT/WHY/CONSTRAINTS 是否足够；`[NEEDS CLARIFICATION]` 是否残留；project/goal/modules/可选 gated artifacts 是否一致；模块边界、公共接口、依赖和验收是否可验证；人类决策是否留痕。

**代码审查**（deploy 前）：查实现是否满足 goal/modules；API、数据模型、错误码、权限、测试是否对齐；关键逻辑是否引用 FD#/PD#/DB#/AC#；测试是否覆盖验收条件和风险边界。

## 审查流程

1. 声明模式和范围：读哪些文件、不读哪些文件。
2. 建立目标基线：目标、边界、完成标准、关键决策。
3. 优先找 P0/P1，再看 P2。
4. 每个问题给文件位置、证据、影响、修复建议和归因。
5. Findings 先行，摘要靠后；阻塞项修复后复审。

代码审查涉及 P0/P1 风险时**默认走独立 subagent 上下文**——同一轮实现上下文自审自己的产物，天生偏向认为自己是对的，独立性是纸面上的。仅以下情况允许主控自审，且必须在报告中显式声明「主控自审」：

- 单文件 lens 审查（范围 ≤ 1 文件，无 P0/P1）。
- 纯文档审查（不涉及运行验证回执）。
- 无 subagent 能力或用户明确禁止并行 agent——此时必须声明「受限于环境，主控自审」并列为残余风险。

可用 subagent 且用户允许时，优先用独立上下文审查；主控保留最终裁决。

## 问题优先级

- P0：错误实现、数据损坏、安全漏洞、无法发布。
- P1：重要行为偏离、测试失真、未来验证失败。
- P2：清晰度、可维护性、局部一致性。

## 差距分析

- skill 方法论：记录为方法论风险，必要时进入 learn。
- 文档未同步：回到 detail 做级联更新。
- 代码实现：回到 codegen 修代码。
- 范围蔓延：回到 define/detail 补决策；参考 `${CLAUDE_SKILL_DIR}/../shared/red-flags/scope-creep.md`。

## 入口/出口条件

入口：已有可审查文档或代码；用户要求 review；或 codegen/deploy 前质量门。文档不完整时只做有限审查并声明风险；无历史时声明可能误判决策。

出口：报告列出 P0/P1/P2；P0/P1 必须有文件位置、证据、影响和修复建议；无问题时说明测试缺口和残余风险。

## 运行时信号

输入 artifact ready / health check；输出 issues + 归因(skill/document/code/scope)；升级 P0/P1、WHY 缺失、偏差无根因、范围蔓延。

## 红旗清单

- 只总结不列问题。
- 只看格式不做目标对照。
- 不读相关 Change Unit 就否定既有决策。
- 测试通过但代码和合约不一致。
- 文档缺 WHY 却放行 codegen。
- 发现问题后不复审或不归因。

## 验证清单

- [ ] 是否声明模式、范围和读取文件？
- [ ] 是否按严重度输出问题？
- [ ] 每个问题是否有证据、影响、修复建议和归因？
- [ ] 是否区分阻塞项、建议项、豁免项？
- [ ] 是否说明测试缺口和残余风险？

## 历史维护

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md` 与 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。纯只读 findings 不落盘；改变权威文档/发布/方法论时持久化，必要时进入 `learn`。
