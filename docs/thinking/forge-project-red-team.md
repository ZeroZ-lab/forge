# Forge 项目对抗评审 — 深度思考

## 元信息

| 字段 | 值 |
|------|-----|
| 决策阶段 | project governance |
| 模式 | 攻击 |
| 回写目标 | 无明确目标；本次只落 `docs/thinking/forge-project-red-team.md` |
| 前提假设 | 当前仓库文档和脚本代表 Forge 真实意图；没有真实 run report 时不能证明行为有效性；本评审只攻击项目形态，不评价作者动机 |
| 有效期 | 在 `docs/project.md` 的目标、评测模型和插件结构不发生根本变化前有效 |
| 过期触发器 | 引入自动重放型 benchmark、真实 run report 成为发布硬门、或默认链路/skill 数量大幅收缩 |
| 创建日期 | 2026-06-26 |

## 问题重构

**原始问题**：
> 作为反派猛烈抨击这个项目。

**追问过程**：
1. Why: 要攻击项目，不能只骂文档多，必须找它核心价值主张哪里最脆弱。
2. Why: Forge 的核心价值主张是“文档作为目标约束 + AI 自主实现 + 可审计验证闭环”。
3. Why: 如果验证闭环主要依赖 agent 自报和人工阅读 transcript，那么项目最强口号反而是最弱证据。

**重构后的问题**：
> Forge 现在是否真的证明了它能稳定提高 AI coding 质量，还是只证明了它能维护一套漂亮、复杂、可校验形状的协议系统？

## Steelman

最强辩护如下：

- Forge 已经明确收缩目标：默认服务已有项目的小功能迭代，而不是吞下完整项目管理生命周期。
- 项目事实模型足够克制：`project.md`、feature `goal.md/modules`、Change Unit 三类长期事实源，避免 plan/status/trace 泛滥。
- 评测文档清楚地区分“benchmark contract 有效”和“真实 run 证明有效”，没有把无报告 eval 冒充行为效果。
- Validator、tests、skills suite、token metrics 都能在本地跑通，说明维护纪律不是纯口号。
- `detail -> codegen -> review` 作为高频链路有明确预算和边界，比很多“万能 agent 方法论”更诚实。

如果我是拥护者，我会说：Forge 的价值不是替你写代码，而是让 agent 不乱写、不乱扩 scope、不把推理散落在聊天里。它提供的是治理框架，不是自动正确性神谕。

## Red Team

### 1. 你把“可验证”说得太响，但硬验证没有追上

项目目标说要提供“验证闭环”和“运行证据”。但当前公开硬门能稳定证明的主要是：

- 文件存在；
- manifest 和 registry 对齐；
- skill 文本包含指定 marker；
- report JSON 字段形状正确；
- Change Unit 落盘并含 Verification 段；
- report 声称跑过某个命令。

这不是“证明 agent 做对了事”，这是“证明 agent 写了一份看起来像做对了事的报告”。`--verify-disk` 是进步，但仍然没有重放命令、没有检查命令输出真实性、没有把实现语义和验收标准做强绑定。一个熟练的坏 agent 仍然可以生产漂亮 CU、漂亮 evidence、漂亮 goal_verification，然后把错误藏在代码里。

最狠的攻击：Forge 的评测系统防的是“懒惰 agent”，不是“会迎合评分器的 agent”。而 AI 恰好最擅长迎合评分器。

### 2. 项目复杂度正在反噬“最小链路”叙事

Forge 说默认入口是小功能迭代，但仓库实际承载的是 25 个发布 skill、shared knowledge、21 个 benchmark cases、Change Unit 纪律、artifact gate、history policy、invocation policy、token metrics、validator、runner、evaluator、score model。

你可以说这些都按需加载。问题是：用户和 agent 仍然要理解这套治理宇宙何时展开、何时不展开。Forge 试图用协议防止过度工程，但协议自身已经是一个过度工程风险源。

最狠的攻击：Forge 给小功能 patch 配了一套方法论中控室。它提醒别人别制造文档债，同时自己维护一座文档治理工厂。

### 3. “文档是目标约束”成立，但容易变成目标替身

项目反复强调文档不是代码的衍生品，而是目标约束。这个观点强，但危险在于：agent 会把“更新了目标文档、写了 CU、对齐了编号”当作完成感来源。真正用户价值仍然发生在代码运行、交互正确、边界条件处理、生产风险下降，而不是目标文本更漂亮。

Forge 已经意识到“文档质量不能证明 skill 行为”，但大量工程能量仍消耗在协议文本、artifact 名称、marker、frontmatter、描述去歧义、历史维护规则上。换句话说，它知道陷阱在哪里，却仍然每天在陷阱边上施工。

### 4. 评测 oracle 太容易被 Goodhart 化

当前评分轴包括 routing、artifacts、decisions、verification、scope_control、traceability、goal_verification。这些都重要，但它们更像流程合规指标，而不是结果质量指标。

当指标变成目标，agent 会学会：

- 触发正确 skill 名；
- 报告正确 artifact；
- 写出目标关键词；
- 避开 forbidden behavior 字符串；
- 在 evidence 中塞入 oracle 需要的短语；
- 把命令名放进 `commands_run`。

这会提高“合规外观”，不必然提高“代码正确”。Forge 现在最危险的幻觉不是没有评测，而是有一套足够复杂、足够正式的评测，让人过早相信质量已经被度量。

### 5. Token budget 已经贴近上限，默认链路没有多少余量

本次实跑 `npm run metrics:chars` 显示默认链路 `detail -> codegen -> review` 为 8,947 chars，预算是 9,000 chars。也就是说核心链路只剩 53 chars 余量。脚本自己还提示这是粗略代理，且会低估 CJK token。

攻击点不是“预算失败”，而是“系统已被预算卡到边缘”。后续任何真实补强都可能挤爆默认链路，逼迫项目继续拆引用、压缩措辞、优化加载策略。Forge 现在不是轻盈，而是靠持续修剪维持轻盈外观。

### 6. “不做项目管理器”与 CU 历史事实之间存在张力

项目声明不做 issue tracker 或状态看板，不维护 plan/status/timeline。但 Change Unit 已经承担变更历史、风险、验证证据、同步结果。随着 CU 数量增长，用户如果要理解项目现状，仍然会回到历史文档挖矿。

这不是错，但它削弱了“只保留少量事实源”的承诺：CU 是必要的审计证据，也可能变成另一个难检索、难综合、难废弃的事实地层。

### 7. 真实 runtime benchmark 仍是外部重型动作，不是日常硬门

README 和评测文档都承认：无报告 eval 不证明行为有效，真实效果需要实际 agent run report。问题是，真实 run 依赖 Codex CLI、usage limit、workspace 产物和报告整理。越真实，越昂贵；越便宜，越静态。

所以项目日常最容易跑通的是“不会证明行为有效”的检查；最能证明行为有效的检查最不容易成为每次变更的默认门。

最狠的攻击：Forge 的证据阶梯倒挂了。容易获得的是低价值证据，高价值证据成本高到只能偶尔获得。

## Premortem

假设一年后 Forge 失败，最可能不是因为没有文档，而是因为下面三件事：

### 失败原因 1：用户觉得它让简单任务变慢

小功能 patch 需要在 skill、goal、CU、验证摘要之间穿梭。即使默认链路收窄，用户感知仍可能是“我只是要改个按钮，你给我一套治理流程”。

现在可预防：
- 给 L0 patch 一个更强的无文档路径：只读约束、改代码、验证、简短报告。
- 把 CU 要求限制在持久变更和方法论变更，不让 advisory/analysis 产物自动背 CU。

### 失败原因 2：评测高分与真实代码质量脱钩

agent 可以优化 report，而不是优化行为。团队看到 A 分，以为质量提高；上线后才发现业务 bug、交互缺陷、安全边界仍然漏。

现在可预防：
- 增加可重放命令证据：报告命令必须能在 workspace 重跑。
- 对 mutating cases 增加 domain-specific assertions，而不是只查 evidence 字符串。
- 把 transcript 人审结论降级为辅助证据，不作为 oracle 的主要来源。

### 失败原因 3：方法论维护成本超过收益

每次改变一个 skill，都要考虑 manifest、registry、validator、benchmark、docs、CU、token budget。项目会变成维护协议本身，而不是改善 AI coding 结果。

现在可预防：
- 每个新规则必须删除或合并一个旧规则，保持治理预算恒定。
- 把“必须项”和“建议项”硬拆开，避免所有纪律都挤进默认链路。
- 定期做反向评测：同一任务不用 Forge 跑一次，比较时间、改动质量和失败率。

## 存活论点

攻击后仍然站得住的点：

- “文档作为目标约束”是有效抽象，尤其适合多轮 agent 协作和需求边界不稳定的项目。
- 默认链路从完整生命周期收缩到 `detail -> codegen -> review` 是正确方向。
- 项目诚实地区分静态 contract 和真实 run evidence，这比多数 agent 框架强。
- Change Unit 作为审计粒度合理，前提是不要把所有临时思考都变成历史负担。

## 被击穿论点

被攻击后不能原样成立的点：

- “验证闭环”不能只靠 report oracle 和 CU 内容检查支撑；它目前更像 traceability loop，不是 correctness loop。
- “默认轻量”不能只看默认链路步骤少；用户认知负担、skill 数量和维护面也必须算成本。
- “benchmark proves value scenario”这类表达需要降温；当前更准确是“benchmark report can show scenario compliance when supplied and trusted”。

## 补强建议

1. 把最高优先级从继续打磨 skill 文案，转为让 benchmark 可重放、可复验、能发现真实错误。
2. 给 L0 patch 明确绿色通道：无 goal 新建、无 CU、只做最小代码修复和命令证据，除非触发范围/文档风险。
3. 将默认链路预算从“字符数不超”升级为“实际加载 token + 成功率 + 用户干预次数”三指标。
4. 增加 Forge vs no-Forge 对照评测，否则无法证明协议本身带来净收益。
5. 对 CU 做索引或摘要机制，否则历史证据会从资产变成沉积层。

## 结论

**判断**：Forge 是一套有纪律、有自知之明的 AI coding 治理框架，但它最大的风险是把“可审计流程”误当成“可证明正确性”；如果不把评测从自报痕迹推进到可重放行为，它会成为一个优雅的合规机器，而不是可靠的交付机器。

**置信度**：中高。

**依据**：
- 项目目标明确要求验证闭环和运行证据，但评测文档也承认无报告 eval 不证明行为有效。
- 当前 evaluator 的 oracle 主要消费 report 字段，`--verify-disk` 只把部分证据从“自报”推进到“磁盘可见”，没有重放命令或语义验收。
- 本次本地验证全部通过，说明仓库结构健康；因此核心风险不是静态坏掉，而是价值证明边界不足。

**前提依赖**：如果后续发布门要求真实 workspace 命令重放、domain assertions 和 Forge/no-Forge 对照实验，这个结论应降级为“曾经存在的评测薄弱风险”。

## 验证

本次检查运行：

```bash
npm test
npm run validate
npm run eval:skills
npm run metrics:chars
```

结果：
- `npm test`：28 pass / 0 fail。
- `npm run validate`：`Forge validation passed (25 skills, version 0.41.1).`
- `npm run eval:skills`：21 cases、25 skills covered；无 run report，明确不声称行为有效。
- `npm run metrics:chars`：默认链路 8,947 chars，全部 `SKILL.md` 51,064 chars。

未运行真实 Codex benchmark；原因是本次任务是项目级攻击分析，不需要触发外部 agent run，且真实 run 成本与 usage limit 风险高于本次分析收益。

## 回写摘要

未回写到 `docs/project.md` 或 feature `goal.md`。原因：用户没有指定本次攻击结论应成为哪个权威决策的依据；强行写入会把对抗分析混入项目事实源。

## 下游引用

可由以下文档在后续决策中引用：

- `docs/project.md` 的风险或 PD7 后续修订。
- `docs/skill-suite-evaluation.md` 的评测边界说明。
- 后续关于可重放 benchmark、L0 patch 绿色通道、CU 索引机制的 Change Unit。

引用方式：`决策依据：docs/thinking/forge-project-red-team.md`
