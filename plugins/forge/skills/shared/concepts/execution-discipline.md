# Execution discipline

Forge methods define what should happen; execution discipline defines how an AI agent changes the project without creating drift.

## 纪律编号（Canonical D#）

所有 skill 的「执行纪律」段引用以下编号。各 skill 可在 canonical 定义基础上**精化**（具体化到本 skill 场景），但**不得重新定义**同一编号的含义。

| 编号 | 名称 | Canonical 定义 |
|------|------|---------------|
| D1 | 决策留痕 | 每个技术选择记录：选了什么、为什么选、拒绝什么 |
| D2 | 目标约束 | 文档定义目标和边界，不定义实现。AI 自主选择路径 |
| D3 | 人类决策 | AI 呈现选项+代价，人类做选择，AI 记录决策。冲突/关键分歧停下等人类 |
| D4 | 最小变更 | 优先满足当前合约的最小变更，不引入未要求的抽象 |
| D5 | 目标边界 | 只编辑与目标直接相关的文件；发现无关问题只记录，不顺手修改 |
| D6 | 暴露假设 | 做决策时列出假设。假设可能不成立时停下来确认 |
| D7 | 验证而非假设 | 每次变更后执行可用验证，或明确说明无法验证的原因 |
| D8 | 累积升级 | 同类问题修正 ≥ 2 次，建议重新审视目标定义。重复失败可能是目标本身的盲区 |
| D9 | 运行实证 | 代码变更声明"完成"前必须提供**可校验证据**：一个实际执行过的命令 + 真实输出（退出码或关键输出行）。"测试通过"是结论不是证据；读了一遍代码是检查(inspect)不是验证(verify)。无法执行时标记 `⚠️ 未验证` 并说明阻塞原因。证据形态与分级见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`。 |
| D10 | 复杂度分级 | 任务进入 skill 链前判断重量：L0 直接 patch（单文件 <20 行）→ L1 轻量链路（1-3 文件有 goal.md）→ L2 标准链路（多模块需 goal + modules/）→ L3 完整链路（新 Feature/架构决策）。分级可双向调整：同类问题反复出现时升级（见 D8），中途发现任务比预期小时降级到更低链路。**验证地板随级别加码**：L0/L1 需 ≥1 命令回执；L2/L3 命令回执写入 Change Unit Evidence 段 + 关键路径按 `${CLAUDE_SKILL_DIR}/../shared/concepts/delegation-matrix.md` 判断是否走独立 subagent 复核（见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`）。降级不缩小地板——L0 也不跳过 D7/D9 |

**精化示例**：test-cases 的 D7 = "D7（验证）：测试数据必须可重复，测试间必须隔离"——这是 D7 在测试场景的具体化，不是重新定义。

## Runtime meaning

- State the goal, boundary, assumptions, and verification target before non-trivial edits.
- Prefer the smallest change that satisfies the current goal.
- Touch only files that directly trace to the requested goal or required specification synchronization.
- Record unrelated findings instead of fixing them opportunistically.
- When a requirement, boundary, or implementation choice is uncertain, leave an explicit `[NEEDS CLARIFICATION: <question>]` marker in the goal instead of silently assuming (D6). Resolve it into a decision record before that part drives codegen.
- After code or specification changes, run the available verification and report the actual command + output (not a conclusion string). If it cannot run, mark `⚠️ 未验证` with the blocking reason. Conclusions like "tests pass" are not evidence; reading code is inspection, not verification (see `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`).
- Classify task complexity before entering a skill chain; use the lightest path that satisfies the goal (D10).
- For context-heavy or high-risk work, use `${CLAUDE_SKILL_DIR}/../shared/concepts/delegation-matrix.md`: subagents return evidence packages; the orchestrator keeps final judgment and user delivery.

## Decision boundaries

Stop and ask the human when a change would:

- replace an architecture decision rather than implement an existing one;
- introduce a new dependency, compatibility layer, or configuration surface;
- delete or rename a public API, persisted field, or specification section;
- keep failing after repeated same-class fixes, suggesting the goal definition may be wrong.

## Inheritance rule

Generated project instructions should inherit this discipline in compressed form. They should not copy Forge internals, but they must preserve the same execution constraints: clarify, minimize, scope, and verify.
