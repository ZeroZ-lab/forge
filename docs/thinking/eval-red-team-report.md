# 红队报告：Forge eval 体系对抗审计

> 来源：ultracode 红队 workflow `wf_81acc943-844`（108 agents，22 confirmed / 22 uncertain / 3 refuted）。
> 失效条件：若 eval 体系重构使本报告引用的 file:line 不再适用，本文档随之失效。优化方案须以当前代码为准复核。

## 总裁定

Forge 的 eval 体系声称四件事——"skill effect +100%、token -50%"、"2.0x gate"、"honest metric"、"integrity restoration"——但没有一件被它实际拥有的证据所确立。真正驱动 2.0x 门的 `fairComparisonScoringModel` 有 ~50% 落在自报轴上，其中 25% 是 Forge-schema 决策 ID（`business_go_no_go`、`test_seam`…）一个被告知 `decisions=[]` 的基线在结构上得 0 分；`oracleAxisScore` 还显式忽略 `result.source`，使自报 pass 与独立 pass 等价计分。Forge arm 被逐字喂入完整 `oracle_checks` 答案，而"篡改证明"证据层用子串+exit-0 匹配，`echo "skills/codegen/SKILL.md"` 与 `echo "node --test"` 即可通关——仓库自己的测试已证明一份手写答案回声 JSON 能拿 100/100 (A) 并通过硬门。"integrity restoration" 是把 source 标签当死代码、"honest metric" 是 0 字节改名、"效果+100%" 是把门阈值从 1.5x 挪到 2.0x 而不产生任何新 run、"token -50%" 是对一个代码自承"不是 tokenizer、CJK 低估 ~2.6x"的字符代理的裁剪。整套体系的唯一 2.0x 实证是两个自选单案例（各 n=1，无 seed/CI）。这不是评测，是营销镀层的自洽循环：它证明的是"Forge resembles Forge"。

## 系统性问题

下面 6 条是跨 finding 的根因，不是逐条缺陷。

1. **自报即得分。** 整个评分层把 agent 自填的 JSON 当行为证据。`routingScore`/`artifactCompletenessScore`（`scripts/evaluate-skills/index.mjs:152-171`）直接读 `inspectRun(run).triggeredSkills`/`matchesArtifact`，绕过有独立分支的 `skill_triggered`/`artifact_reported` oracle；`oracleAxisScore`（`:173-176`）只读 `result.passed`、丢弃 `result.source`；4 个 oracle 类型（`goal_covers`/`decision_gate_reported`/`goal_verified`/`forbidden_behavior_absent`，`scripts/lib/run-report.mjs:325-333,360-362`）无条件 `source=SELF_REPORT`。于是 source 标签是死代码，`writeScoreReport`（`:330-348`）连它都不持久化。一个 self-report pass 与一个 independent pass 对分数贡献相同——直接违背 `run-report.mjs:257` "A self-report pass is NOT behavioral evidence"。

2. **答案泄漏 + 易上当的匹配器 = 零成本作弊。** `forgePromptForCase`（`scripts/run-skills-benchmark.mjs:171-179`）把整个 `oracle_checks` 数组逐字塞进 Forge prompt（精确命令、transcript 短语、artifact 路径、decision ID），no-forge arm 只收到被截断+过滤的 fixture 与一个不含答案字段的静态模板（`:216-231`）。被宣称为"篡改证明"的 `evidence-collector.mjs` 三个检测器全是子串/正则+exit-0：`SKILL_READ_RE`（`:58`）匹配命令字符串、`exit_code===0` 即算读过（`:96`）；`commandWasRun`（`:207-210`）做 `entry.command.includes(frag)`、`requireExitCode` 只拒绝 `null`；`transcriptContains`（`:241-242`）对任意非 final message 做子串。`echo "skills/codegen/SKILL.md"`、`echo "node --test"`、中途背一遍短语即可全过。

3. **非对称、被削弱的基线。** `sanitizeNoForgeFixture`（`scripts/lib/benchmark-helpers.mjs:32-47`）在 `实现要求：`/`Expected behavior:` 处截断 fixture（default-chain 因此丢掉"跑 `node --test`"、"建 goal.md"、CU 与 goal_coverage 指令），再用 case-insensitive 子串模式 `/skill/i`、`/trigger/i` 剥掉任何含这些词的行（learn-archive 被砍到 127 字符、guide-routing-matrix 丢掉"不修改文件/不创建 CU"的范围约束，可 oracle 仍查这些 scope_control）。叠加 no-forge prompt 被告知保持 `decisions=[]`，而 fair 门 decisions 轴检查 Forge 专属 ID——基线在 25% 门权重上结构性≈0。

4. **n=1，无统计功效。** 每个 case 只跑一次（`scripts/run-skills-benchmark.mjs:328-330`），Codex spawn 不传 seed/temperature（`:245-260`），`parseArgs` 无 `--runs/--repeats/--seed`（`:22--29`），全仓无 variance/CI 计算。2.0x 门只用 2 个自选单案例校准（guide-shortest-chain 2.5x、default-chain 4.3x），且阈值从 1.5x 提到 2.0x 时没产生任何新 run——4.3x 在两个 CU 里逐字相同。每个 verdict 都是一个未知方差分布的单点采样，重跑可能翻盘却无机制察觉。

5. **品牌包装凌驾测量。** "integrity restoration" = 把 source 标签当死代码；"honest metric" = 0 字节改名（`git show 56f3ced --numstat` 显示 `0 0`）且改名后的脚本默认不门控（`package.json:8` 不带 `--max-*`），真正的预算门在并行 hardcoded 的 `validate.mjs:178-191` 且不调用该脚本；"效果+100%" = 门阈值 1.5x→2.0x 的挪动；"token -50%" = 对一个代码自承"NOT a tokenizer、undercounts CJK ~2.6x"（`scripts/measure-char-footprint.mjs:10-12`）的字符代理的裁剪。validator 的"机械执行门实质"（`validate.mjs:541-545`）实际只查一行 `gate_owner:` 正则（`:548`）。

6. **单作者自洽。** `git log` 确认 `manifest.json`、全部 fixtures、`AGENTS.md`、schema 都由同一人（GuanMu）作者。oracle 编码的就是作者自己在 AGENTS.md 里写的约定：`forbidden_files`（docs/status.md、timeline.md、idea-brief.md）镜像 AGENTS.md 禁建清单；默认链 `detail -> codegen -> review` 镜像最短链路表；`forbidden_behaviors`（escalated_clear_feature_to_define、generated_plan_for_small_feature）镜像 D4/D5。分数只能确立自洽性，不能确立独立质量。

## 确认缺陷

按 Critical→Medium 排列。每条给出证据、为何严重、修复。

### [Critical] C1 — Forge arm 被喂完整 oracle 答案 +「篡改证明」检测器可被 echo 击穿

证据：`scripts/run-skills-benchmark.mjs:171-179` 把 `expected_skills/expected_artifacts/required_evidence/forbidden_behaviors/oracle_checks` 整体 `JSON.stringify` 进 prompt；`:216-231` no-forge 静态模板无答案字段；`:201` no-forge 被告保持 `[]`；`evidence-collector.mjs:58` `SKILL_READ_RE` 匹配命令字符串、`:96` `exit_code===0` 即算读过、`:207-210` `commandWasRun` 做 `includes(frag)` 且仅拒 `exitCode===null`、`:241-242` `transcriptContains` 对非 final message 子串；`tests/skills-suite-evaluation.test.mjs:26-35,288-293` 合成答案回声 report 仍断言 `100/100 (A)` + `report passed`；`fixtures/default-chain-small-feature.md:28` fixture 直接告诉 agent 把精确文本放进 evidence。

为何严重：Forge arm 拿答案考、基线盲考同一卷；篡改证明层 echo 即过。零工作作弊即可全过、100 分、对剥光基线得 2.5x–4.3x 或 Infinity。仓库自己的测试证明评测器无法区分答案回声与真实 run。

修复：停止把 `oracle_checks`/`expected_*` 序列化进任一臂 prompt；两臂同产品任务+同最小 report schema（无期望值），oracle 作 agent 看不见的盲评分独立跑；`skill_triggered` 要求真实 read runtime 事件、`command_reported` 拒绝 `echo/cat/printf` 退化包装并要求相关 file_change/非空 stdout、`transcript_contains` 要求短语在带上下文推理中；补负向测试（答案回声 report + 矛盾 events.jsonl → 断言 FAIL）。

### [Critical] C2 —「公平」门 ~50% 是自报，decisions 轴是 Forge-schema 自报，且评分忽略 source 标签

证据：`evaluate-skills/index.mjs:50-55` `fairComparisonScoringModel` artifacts 25/decisions 25/verification 25/scope_control 25；`:194-197` routing 走 `routingScore`、artifacts 走 `artifactCompletenessScore`（自报），均不经 `oracleAxisScore`；`:166-170` `artifactCompletenessScore` 用 `matchesArtifact`（自报）；`:173-176` `oracleAxisScore` 只 filter `result.passed` 从不读 `result.source`；`run-report.mjs:328-330` `decision_gate_reported` 无条件 `source=SELF_REPORT`；`:42-46` 注释声称 fair 模型排除"基线结构不可能"轴、衡量"真实行为而非 schema 填充"——artifacts+decisions 两轴直接违背；`:330-348` `writeScoreReport` 无 per-check source；`run-report.mjs:257` "self-report pass is NOT behavioral evidence" 与评分路径矛盾；6 个 case 带 `decision_gate_reported`，ID 为 Forge-schema 专属。

为何严重：~50% 门权重非行为可验证，25% 是 Forge-schema 自报（基线结构性≈0）；自报 pass 与独立 pass 等价计分；fair 门排除标准不一致（删了 traceability/goal_verification 却留同样自报-only 的 decisions）。

修复：artifacts 轴改走 `oracleAxisScore`（继承 `artifact_reported` 独立裁决）；从 fair 模型删 decisions 轴并重归一化；为 4 个自报-only 类型加独立分支；`oracleAxisScore` 按 source 加权；持久化 per-check source 并在 headline 暴露独立 vs 自报占比。

### [Critical] C3 — validator「独立产物门」只校验一行 `gate_owner` 正则

证据：`validate.mjs:541-545` 宣称机械执行门实质（外部可解析 `gate_owner:` issue URL/CODEOWNERS/named owner）；`:548` `gateOwnerRe = /^gate_owner:\s*\S[^\r\n]*$/m` 匹配任何非空值；`:552-557` `hasGateAnchor` 仅 `test` 三个正则，无 URL 解析、无 CODEOWNERS 存在性、无 owner 名单。

为何严重：形状校验当实质校验宣传；一行 `gate_owner: x` 即自我认证独立产物门——正是该门声称禁止的。

修复：`hasGateAnchor` 真解析锚点（issue URL host 模式+可达、CODEOWNERS 文件存在、owner 名单），拒绝裸单 token；或降级宣传为 "structural reminder"。

### [High] H1 — `pass_rate` 是 agent 自报状态，第二个门条件近 no-op

证据：`evaluate-skills/index.mjs:261-265` `passRate` filter `run.status==='pass'`（自报）；`:315-316` `pass_rate_not_worse: forgePassRate >= baselinePassRate`；`run-report.mjs:454` Forge 侧 `strictOutcomes` 强制 pass_rate=100%；`:461` baseline inspection `strictOutcomes:false` 自报 pass 不被质疑；`:288` status 来自 agent 最后 message `extractJsonObject`。

为何严重：Forge 侧强制 100%、基线侧自报永不被质疑，`pass_rate_not_worse` 几近恒成立；CU 记录 100% vs 100% 是自报非行为。

修复：从 oracle 裁决派生 pass_rate，两臂同一严格度；或改名 `self_reported_pass_rate` 并移出门，仅依赖 `score_ratio`。

### [High] H2 — 四个 oracle 类型永远自报无独立分支，docs 仍声称「a run proves skill effectiveness」

证据：`run-report.mjs:325-327` `goal_covers` 自报；`:331-333` `goal_verified` 自报；`:360-362` `forbidden_behavior_absent` 自报；`:328-330` `decision_gate_reported` 自报；`docs/skill-suite-evaluation.md:10` "A run proves skill effectiveness"；`report.schema.json:142-166` `goal_coverage_entries` 仅校验形状非语义。

为何严重：agent 自填 `decisions=[]`/`goal_verification=[{status:'completed'}]`/`forbidden_behaviors=[]` 即过这些 check 无行为证明，却被记为"证明 skill 有效"。

修复：为这四个类型加独立分支（target 文件落盘且内容匹配、decision 出现在落盘 CU/doc、禁止行为交叉比对事件流）；在此之前把 docs:10 改述为"这些轴是自报，非行为证明"。

### [High] H3 —「honest naming」是 0 字节改名 + 真预算门在并行 hardcoded validator 且默认不门控

证据：`git show 56f3ced --numstat` = `0 0`（纯改名）；`measure-char-footprint.mjs:10-12` 自承 "NOT a tokenizer, undercounts CJK ~2.6x"；`package.json:8` `metrics:chars` 无 `--max-*`；`:82-94` 门控分支仅 CLI 传 `--max-*` 时触发；`validate.mjs:178-191` 重新计算 `read(...).length` 内联断言 `<=4500/<=56000`，不 import 该脚本。

为何严重：改名宣传的 "honest" 脚本既不是门也不是阈值来源，默认只打印 exit 0；真门住在 validate.mjs 并行副本里，两套独立可能漂移；commit message 把 0 字节操作包装为 "honest naming"。

修复：让 `npm run metrics:chars` 传 `--max-*` 使改名后脚本真 enforce；validate.mjs 从该脚本 import 预算常量/测量做到单一真相源；commit message 改为 "rename for naming accuracy"。

### [Medium] M1 — success 头行混用 full-model Forge 分数与 fair-model baseline 分数

证据：`evaluate-skills/index.mjs:522` 头行 `Forge vs no-Forge: ${score.score}/100 vs ${comparison.baseline.score}/100`（score.score 为 full-model，baseline 为 fair-model）；`:450` `scoreReport` 无 override => full 7 轴；`:474-475` 门 ratio 为 fair/fair；`docs/skill-suite-evaluation.md:196` "Forge score is at least 2.0x" 语义模糊。

为何严重：操作者读到的"干净对比"实际比较不可比两种模型；CU 引用 4.3x 是 full-model 计算的 23.3 baseline，而门实际检查更低 fair-model ratio，文档化边距高估被门的量。

修复：头行两侧同模型（fair/fair）+ ratio；或给每个数后缀其模型；docs 把 "Forge score" 改为 "Forge fair-comparison score"。

### [Medium] M2 — 2.0x 头条只靠两个自选单案例 +「效果+100%/token-50%」是阈值移动与字符预算裁剪的包装

证据：`CU-forge-vs-no-forge-eval.md:70-71` 仅 guide-shortest-chain(2.5x) 与 default-chain(4.3x)，均 `--allow-partial` 单 case；`CU-skill-effect-token-budget.md:13` 自承 "Out of scope: 证明全部 21 case 都提升 100%"；`:9-11` trigger 引用户"效果 100%/token-50%"，效果操作化为门 1.5x→2.0x；`:64` 4.3x 与 1.5x-era CU 逐字相同（提门未产生新 run）；`measure-char-footprint.mjs:10-12` "NOT a tokenizer"；`evaluate-skills/index.mjs:79` `minScoreRatio: 2` 无校准数据。

为何严重：2.0x 全 suite 主张只由 2 个自选单案例（各 n=1）支撑，恰是基线最弱案例；阈值提高未产生新 run 即被包装为"skills 100% more effective"。

修复：声称 2.0x 达成前跑并发布全 21 case suite 比较；在此之前 README/docs 标注"基于 2 个选定案例，非 suite 级"；停止把阈值变更包装为能力提升；token 主张用 `evidence-collector.mjs:120-139` 真实 turn-level tokenUsage；CU 改标为 "gate threshold tightening + char-budget cut"。

### [Medium] M3 — suite README 公开虚报「10 non-redundant chain cases」

证据：`evals/skills-suite/README.md:11` "10 non-redundant chain cases"；`manifest.json:5` `minimum_cases: 21`（实 21 cases，levels stage:8/chain:3/patch:7/lens:2/analysis:1）；`README.md:109` 顶层 README 正确写 21。

为何严重：子 README 在数量（10 vs 21）与"non-redundant"（含 skip-frontend 三重重复）两方面都错，且与仓库自身描述内部不一致。

修复：更新 `evals/skills-suite/README.md:11` 为真实数量与 level 分布；先合并 skip-frontend 三重重复再决定是否保留"non-redundant"。

## 争议项（contested，残留真实缺陷）

- **score 本质是 schema 一致性 + 自证**：routing/artifacts 两轴直接读自报，`oracleAxisScore` 忽略 source，4 个 oracle 类型永远自报。残留：oracleAxisScore 忽略 source（低成本可补）；routing/artifacts 绕过 oracle 独立证据能力（内部不一致）。
- **零基线 → Infinity 自动通过 2.0x 门**：`scoreRatio`（`index.mjs:268-274`）在 `baselineScore===0 && forgeScore>0` 返回 `Infinity`，`Infinity >= minScoreRatio` 为 true（`:314`），报告把 Infinity 当 ratio 输出（`:283`）。残留：latent 正确性缺陷，应把 baseline=0 当硬失败或标记不可比。
- **单作者自洽**：oracle/fixtures/schema/约定皆同一人。残留：结构性、部分不可避免；suite 被定位为"benchmark contract"即击败独立校验核心目的，重定位为一致性/回归检查可降级。
- **n=1、无 seed/temperature、无 variance/CI**：每 case 单跑、无重复、无方差。残留：方向性 CU 证据，非统计功效化主张，不应被当严谨引用。
- **sanitizer 截断剥掉被评分的产品/验证指令**：`sanitizeNoForgeFixture` 在 `实现要求：` 处截断，丢掉"跑 node --test"、"建 goal.md"等产品/验证指令（非评分元数据），fair 门 artifacts=25/verification=25 即 50% 门权重辅导被从基线剥掉。残留：sanitizer 应只剥评分 coaching 行，不截断整个实现要求 block。
- **--verify-disk 的 CU Verification 是 code-fence/子串存在非行为验证**：`index.mjs:425-437` `hasCommandEvidence = section.includes('```') || /\b(node|npm|...)\s+\S/.test(section)`，从不执行命令、不查 exit code；仓库测试用从不执行的 fenced `node --test` 即断言 exit 0 + "on-disk verified"。残留：启发式可收紧或交叉引用 events.jsonl 命令流。

## 要真正成立需要什么

1. **盲 oracle**：停止把 `oracle_checks` 序列化进任一臂 prompt；两臂相同产品任务+验收标准+同一最小 report schema（字段名/类型，不含期望值）；oracle 作 agent 看不见的独立盲评分 pass 单独跑；若 Forge arm 必须知道 skill 存在，给已发布 skill registry 列表，绝不给 per-case `expected_skills` 答案。
2. **行为级独立证据，非字符串匹配**：`skill_triggered` 要求真实 read/open runtime 事件；`command_reported` 拒绝 `echo/cat/printf` 并要求相关 file_change 或非空 stdout 与 exit 0；`transcript_contains` 要求短语在带上下文推理/工具调用中；为 4 个自报-only 类型加独立分支或移出 fair 门。
3. **source 标签进分数**：`oracleAxisScore` 按 source 加权（独立 pass 满分、自报 pass 0 或折扣），`writeScoreReport` 持久化 per-check source，headline/score.json 暴露独立 vs 自报占比；fair 门只保留"有独立证据分支且非 Forge-schema 目标"的轴——删 decisions 与自报 artifacts 轴，重归一化。
4. **对称基线**：sanitizer 只剥评分 coaching，不截断合法产品/验证指令，不剥范围约束；基线与 Forge 同一 report schema、同一 oracle、同一严格度；pass_rate 从 oracle 裁决派生而非自报 status。
5. **统计功效**：每 case 重复跑（`--runs K`，core cases K≥5），传 seed/temperature，报告每臂每 case score/pass-rate 均值与置信区间，要求 Forge 下界 >= 基线上界；2.0x 阈值由跨多 case 经验分布校准，而非 2 个自选单案例。
6. **全 suite 实证 + held-out cases**：跑并发布全 21 case suite 比较（两臂、全部 case、同一次 run）；增加 held-out/对抗 case（矛盾 spec、跨生态 Python/Go、大型既有代码库、test-fails-mid-implementation、multi-skill 冲突）证明泛化。
7. **去营销包装**：停止把阈值移动包装为"效果+100%"、把字符预算裁剪包装为"token-50%"；token 主张用真实 turn-level tokenUsage；改名 commit message 诚实化；validator 的"机械执行门实质"要么真解析外部锚点要么降级为"structural reminder"；README 修正"10 chain cases"为真实 21/3。
8. **独立作者/外部审阅**：oracle 与 fixtures 至少经非 skill 作者的外部审阅，或显式把 suite 重定位为"一致性/回归检查"而非独立质量 benchmark——后一窄框架下仍产出可复现、有意义的一致性分数，但不得做跨工具/质量主张。

## 一句话结论

Forge eval 体系的每个核心主张都被它自己选择的测量方式所背叛——答案泄漏给 Forge arm、~50% 门权重是自报且含 Forge-schema 轴、篡改证明层是 echo 即过的子串栅栏、2.0x 只由两个自选 n=1 案例支撑、而"integrity/honest/效果+100%/token-50%"全是改名与阈值挪动的品牌包装——它证明的不是"skill 更有效"，而是"Forge 像 Forge"。
