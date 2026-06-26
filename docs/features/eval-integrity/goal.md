# eval-integrity

> Forge eval 体系的诚实化与行为化重构。完整方案见 `docs/thinking/eval-optimization-plan.md`，红队证据见 `docs/thinking/eval-red-team-report.md`。

## Intent

把 Forge eval 体系从「证明 Forge 像 Forge」的自洽循环改造为「行为有效、盲评、非自指」的评测：

- Forge arm 不再被喂 oracle 答案（`run-skills-benchmark.mjs:171-179`）。
- 篡改证明层不再被 echo 击穿（`evidence-collector.mjs` 三检测器）。
- 自报 pass 不再等价于独立 pass 计分（`evaluate-skills/index.mjs:173-176` 忽略 `result.source`）。
- 2.0x 门不再由两个自选 n=1 案例或 `Infinity` 自动通过撑起。
- 「honest metric / 效果+100% / token-50%」不再是改名与阈值挪动的品牌包装。

## Master Gate（完成判据）

一份手写答案回声 report（`tests/skills-suite-evaluation.test.mjs:15-45` 的 `reportEvidenceFor` 构造）+ 空/echo-only `events.jsonl` + 无 workspace，在默认信任下（无 `--trust-self-report`）`evaluate-skills.mjs` 必须退出非零；`tests/skills-suite-evaluation.test.mjs:269-295` 反转为断言 FAIL。

**在此反转前，没有任何红队 finding 被真正关闭。** 这是整个 feature 的唯一可测总判据。

## Boundaries（非目标）

- **不在本 feature**：独立外部作者审阅 oracle/fixtures/schema（社会性，非代码）；落地前 suite 须显式重定位为「一致性/回归检查」而非独立质量 benchmark。
- **不在本 feature（各单独 CU）**：C3 validator `gate_owner` 真锚点解析；H1 `pass_rate` 从 oracle 裁决派生；`sanitizeNoForgeFixture` 截断/剥行非对称修复。
- **不在本 feature（需真实 run，P3 单独 CU）**：全 suite 2.0x 经验主张；Codex seed/temperature flag 真实验证与复现断言；21-case×两臂×K≥5 真实多 run。
- **不在本 feature（运行时工作）**：`heldout-large-existing-repo` 大型代码库预 staging；`heldout-test-fails-mid-implementation` red→green exit-code 序列——runtime 播种前不计入 `minimum_cases`。

## Done Criteria（可测，精选；完整 15 条见 thinking plan）

1. **Master gate 成立**（见上）。
2. **盲 prompt**：`forgePromptForCase` 不含 `oracle_checks`/`expected_*`/`forbidden_behaviors`/decision ID；含 fixture 任务文本 + 已发布 skill 名称列表。
3. **echo 硬化**：`commandWasRun('echo "node --test"')===false`（拒 echo/cat/printf/heredoc 包装，要求相关 `file_change` 或非空 stdout + exit 0）；`skillWasRead` 要求真实 read 事件而非命令串正则+exit 0；`transcriptContains` 仅在非 final 推理上下文匹配。
4. **source 加权**：`oracleAxisScore` 自报 pass=0、独立 pass=满分；`writeScoreReport` 持久化 per-check source；`fairComparisonScoringModel` 无 `decisions` 轴（重归一化）；artifacts 轴走 `oracleAxisScore`（`artifact_reported` 独立裁决）而非 `artifactCompletenessScore` 自报。
5. **Infinity**：`scoreRatio` baseline=0 返回 `null`；门失败并报「not comparable, cannot auto-pass」。
6. **README/docs 诚实**：`evals/skills-suite/README.md` 不再说「10 non-redundant chain cases」（改 21 + per-level 分布 + skip-frontend 三重披露）；`manifest.json` 不再「non-redundant」；每条 2.0x 线带「2 个选定 n=1 案例，非 suite 级」caveat。

## 分阶段（摘要）

- **P0 自指根因清除**（无 Codex，单工程师立即可发）：C1-prompt 盲化+fixture de-coach、C1-echo-hardening、**C2-source-weighting（命门）**、SP-gate#Infinity、M2-2x caveat、M3 README 真分布。
- **P1 行为级独立分支 + verify-disk 行为化 + held-out + 次级 metric 门诚实化**（无 Codex）。
- **P2 统计 harness + CI 门接线**（模块无 Codex；seed 透传需 Codex）。
- **P3 全 suite 真实多 run 实证**（needs_real_run，单独 CU）。

## 关键诚实约束

- C2-source-weighting 是原始 design 集缺失的命门；没有它，answer-echo report 在 legacy 单 run 路径仍 100/100 过门，其它任何修复都白做。
- 多数 fix 单发只 partially 关闭一个通道；只有 P0 cluster 合力才 fully 关闭红队 C1。CU/docs 不应在 P0 cluster 落地前宣称任何 finding 关闭。
- P2 的 CI 门在 SP-harness 真发 runs/repeat 且 scorer 拒单 run 比较前是死代码；stats 模块接线前是「品牌包装死代码」。SP-stats 必须与 SP-gate 配对发。
