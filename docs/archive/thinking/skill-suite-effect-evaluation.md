# Skills Suite 效果评价 — 深度思考（已归档）

> 结论已吸收到评测系统和 `docs/project.md`；本文件只读。

## 元信息

| 字段 | 值 |
|------|-----|
| 决策阶段 | 方法论设计（Forge 自身） |
| 模式 | L1 分析 |
| 前提假设 | Forge skills suite 已有 benchmark manifest、fixtures、report schema 和 evaluator；评价目标是判断 suite 是否让 agent 行为更可靠 |
| 有效期 | benchmark 仍用于比较 Forge skills suite 效果时有效 |
| 过期触发器 | skills 不再以 agent runtime 行为为核心 · benchmark runner/report contract 被替换 · suite 目标从工程交付转为教学或文档展示 |
| 创建日期 | 2026-06-07 |

## 问题重构

**原始问题**：
> 如何评价一个 skills suite 的效果？

**追问过程**：
1. Why 要评价？→ 需要知道 skills 是否真的改善 agent 交付，而不是只写得好看。
2. Why 不能只看文档质量？→ skills 的价值发生在运行时：是否正确触发、控制范围、产生产物、要求验证、留下证据。
3. Why 不能只看 pass rate？→ pass rate 容易掩盖过度提问、过度修改、遗漏决策、验证弱和上下文成本高。
4. Why 需要 suite 级评价？→ 单个 skill 成功不代表跨阶段信号、文档同步、Change Unit 和 Rebuild Control 能闭环。
5. Why 需要可比性？→ 没有稳定 fixture 和相同 oracle，就无法判断新版 suite 比旧版更好还是只是任务更容易。

**重构后的问题**：
> 一个 skills suite 是否有效，应评价它在稳定任务集上能否把用户意图稳定路由为最小、可追溯、可验证、低干预的 agent 行为，并且这种能力能跨版本比较。

## 假设清单

| # | 假设 | 确定度 | 验证方法 | 如果不成立 |
|---|------|--------|---------|-----------|
| H1 | 用户关心的是交付行为质量，不是 skill 文案质量 | 高 | 对照 Forge AGENTS.md 和 skill-suite-evaluation.md | 评价指标需改成文档可读性/教学性 |
| H2 | benchmark fixture 能代表主要使用场景 | 可能 | 检查 case 覆盖真实任务分布和失败历史 | 需要新增或重权重 case |
| H3 | report 里的证据能真实反映 agent 行为 | 可能 | 抽样审查 transcript、workspace、产物和命令输出 | 需要独立 runner 或人工审计 |
| H4 | suite 价值来自跨 skill 协同 | 高 | 检查 Change Unit、doc sync、goal_map、decision gate 是否跨阶段闭环 | 若只看单 skill，指标可简化 |
| H5 | 用户干预越少越好，但关键决策不能跳过 | 高 | 统计 intervention count，并审查是否越权代决策 | 需要区分必要决策和无效打扰 |

**最脆弱的假设**：H2。fixture 如果不代表真实工作，评测会优化 benchmark，而不是优化 skills suite。

## First Principles 分析

Skills suite 的底层功能不是“提供说明”，而是改变 agent 的行为分布：

```
用户意图
→ skill 路由
→ 决策协议
→ 产物文档
→ 代码/测试/验证/审查
→ 证据报告
```

因此评价对象不是单个输出，而是整条链路的行为质量。

### 五层评价模型

| 层 | 问题 | 代表指标 |
|----|------|----------|
| Routing | 该用的 skill 是否被触发，不该用的是否没乱触发？ | expected skill recall、unexpected skill rate |
| Contract | 是否产生正确文档、决策门和约束？ | artifact coverage、decision gate coverage、forbidden behavior absence |
| Execution | 是否把文档实现成最小正确改动？ | task success、scope control、diff size、unrelated file touches |
| Evidence | 是否有真实验证和可追溯证据？ | command evidence、test/build/lint result、Change Unit、doc sync、goal_map coverage |
| UX/Cost | 是否减少用户负担和 agent 成本？ | user intervention count、turn count、runtime、token/context load、blocked rate |

### 关键判断

有效的 suite 不是“每个 case 都能产出文件”，而是满足四个性质：

1. **稳**：同一 fixture 多次运行，路由和关键产物一致。
2. **准**：触发正确 skill，决策门不漏，禁止行为不发生。
3. **小**：修改范围贴合任务，不做无关扩张。
4. **证据足**：验证命令、Change Unit、doc sync、goal_map 和 transcript 能支撑结论。

## 指标建议

### 一级指标

| 指标 | 定义 | 用途 |
|------|------|------|
| Case pass rate | oracle 全部通过的 case 比例 | 总体健康度 |
| Skill routing score | expected skills 命中率和误触发率 | 评估入口协议 |
| Artifact completeness | expected artifacts / Change Units / rebuild docs 是否完整 | 评估文档实现 |
| Scope control score | 禁止行为、无关文件、diff 膨胀情况 | 评估 D4/D5 |
| Verification strength | 有无运行命令、命令是否与任务相关、结果是否可审计 | 评估 D7/D9 |
| Traceability score | Change Unit、doc sync、goal_map 是否闭环 | 评估可重建性 |
| Intervention quality | 用户干预次数，以及是否是必要决策 | 评估协作成本 |
| Stability | 相同 case 多次运行的一致性 | 评估可靠性 |

### 不应单独使用的指标

| 指标 | 问题 |
|------|------|
| 文档长度 | 长不等于有效，可能只是上下文负担 |
| 产物数量 | 多不等于好，可能违反最小变更 |
| 单次成功截图 | 没有可重复性，不能比较 suite |
| 模型主观评分 | 可作为辅助，但不能替代 oracle 和证据 |
| No-report evaluator pass | 只能证明 benchmark 合约完整，不能证明 skills 有效 |

## 评测流程

1. **固定任务集**：冻结 manifest、fixtures、schema，禁止运行中修改。
2. **跑真实 agent**：每个 case 产生 transcript、workspace、report。
3. **机器评分**：用 evaluator 检查 oracle、report schema、expected artifacts。
4. **人工抽审**：抽样看 transcript 和 diff，确认没有 report 美化或证据缺口。
5. **多次重复**：关键 case 至少跑 3 次，看稳定性和方差。
6. **对比基线**：同一 fixture 对比旧 suite、新 suite、无 suite 或替代 suite。
7. **失败归因**：把失败归到 routing、contract、execution、evidence、UX/cost，而不是只记 fail。

## 被否方案及理由

| 方案 | 否决理由 |
|------|----------|
| 只看 pass rate | 会掩盖范围失控、用户负担和证据弱 |
| 只做人工主观评分 | 不可重复，难以跨版本比较 |
| 只测单个 skill | 无法证明 suite 级信号链闭环 |
| 只校验 benchmark manifest | 只能证明评测资产完整，不能证明 runtime 行为有效 |
| 让 agent 自报成功 | 缺少独立证据，容易把声明当事实 |

## 结论

**判断**：评价 skills suite 效果应采用“runtime behavior + traceability + comparative stability”的组合评估。Forge 现有 `evals/skills-suite` 已经覆盖合约完整性和 report oracle；下一层应补充多次运行稳定性、人工抽审、成本/干预指标和失败归因矩阵。

**置信度**：高

**依据**：Forge 目标是交付最小 verified patch；现有文档已明确 no-report 模式不能证明 skill 有效，真实效果必须来自 agent run report。suite 级价值还依赖 Change Unit、doc sync、goal_map 等跨阶段闭环，不能只看单 skill 产物。

## 推荐落点

- 在 `docs/skill-suite-evaluation.md` 中补充“评价维度”和“失败归因”章节。
- 在 report 或 summary 中加入可选统计：unexpected skill count、user intervention count、turn count、changed file count、verification command result。
- 对核心 case 做 repeat runs，记录稳定性，而不是只保留单次 pass/fail。
- 把 fixture 代表性作为独立风险审查项，防止 suite 过拟合 benchmark。
