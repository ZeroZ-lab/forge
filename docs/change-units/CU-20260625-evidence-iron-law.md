# CU-20260625-evidence-iron-law

## Type

- Methodology

## Intent

- Trigger: 用户观察到 skills suite 把"能力"和"声明完成"混在一起——模型有能力做（测试、运行、验证），但可以靠自报结论骗过 suite（写"测试通过 45 条"而不真跑命令）。需要把约束轴心从"过程怎么干"挪到"声明完成必须附带什么"。
- Goal: 引入「证据铁律」——实现路径完全放开，但任何"完成"声明必须附带可校验的执行回执（命令 + 真实输出），而非结论字符串。按风险分级证据重量。
- Out of scope: 不改路径约束（D2/D4/D10 的自由度不动）；不全局替换"证据"措辞；不引入 harness 层执行回执校验（超出 skill 文档能力）。

## Behavior Change

- Internal behavior:
  - D9 从模糊的"运行证据"升级为**可校验定义**：证据 = 实际执行过的命令 + 真实输出（退出码/关键输出行）。明确区分 inspect（读代码、走查）vs verify（跑命令、看输出）——只有 verify 满足 D9。
  - D10 加入证据分级：L0/L1 需 ≥1 命令回执；L2/L3 命令回执写入 CU Evidence 段 + 关键路径走独立 subagent 复核。降级不缩小地板。
  - bugfix 红灯加「真实锚定」硬约束：只断言常量矛盾、不调用被测代码的测试不算 red-capable。
  - review 独立性翻转：P0/P1 代码审查默认走独立 subagent；主控自审必须显式声明。
  - Trace 禁令解禁：证据可收敛进 CU 的 Evidence 段，不再禁止"trace-style"措辞，但仍不生成独立 trace 文件。
- Contract change:
  - 新增 `shared/concepts/evidence-policy.md` 作为证据定义的唯一 canonical 源。
  - `change-unit-template.md` 的 Verification / Completion Evidence 段字段格式强化（要求命令+输出，而非空泛的 `- Evidence:`）。

## Affected Surface

- Methodology files:
  - `shared/concepts/evidence-policy.md`（新增）
  - `shared/concepts/execution-discipline.md`（D9 重定义 + D10 分级 + Runtime meaning）
  - `shared/concepts/history-maintenance.md`（Trace 禁令更新）
  - `shared/change-unit-template.md`（Evidence 段格式强化）
  - `shared/rubrics/implementation-quality.md`（新增 Evidence form 维度 + Runtime safety 强化）
- Skills:
  - `codegen/SKILL.md`（D9 纪律条 + 第三步验 + 出口硬门 + 历史维护 + 红旗）
  - `codegen/references/bugfix-protocol.md`（红灯真实锚定 + Phase 5 双输出 + 输出证据段）
  - `review/SKILL.md`（独立性默认翻转）
  - `review/references/review-protocol.md`（测试真实性查证据 + Subagent Prompt 强化）

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 证据铁律让纯文档/无运行时项目卡住 | 模型无命令可跑时强行声明未验证 | evidence-policy 明确「无法执行 → ⚠️ 未验证 + 阻塞原因」是合法出口，不强制无中生有 |
| L2/L3 强制 subagent 增加 token 成本 | 大型任务开销上升 | 仅在触及 P0/P1 时触发；用户已选「分级放权」接受该权衡 |
| 模型编造看似真实的命令输出 | 伪造 `npm test` 输出绕过证据要求 | 这是 harness 层问题，skill 文档无法根治；review 独立 subagent 复核是 suite 内唯一压力（已知边界，见 evidence-policy 末尾） |

## Verification

> 证据 = 命令 + 真实输出，不是结论。详见 `plugins/forge/skills/shared/concepts/evidence-policy.md`。

- Commands (with exit codes): `node scripts/evaluate-skills.mjs` → exit 0 / `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).`
- Consistency check: `rg "不生成\s*Trace|Trace documents|trace 文件|trace files|独立 trace" plugins/forge/skills/` → 3 处命中，全部为更新后的统一措辞（「不生成独立 trace 文件，证据收敛进 CU」），无遗留旧禁令矛盾。
- Reference check: `rg "evidence-policy" plugins/forge/skills/` → 11 处引用，覆盖概念源（D9/D10/Runtime）、codegen、bugfix、review、change-unit 模板，无死链。
- Not verified (with blocking reason): 行为有效性（模型是否真的交出命令回执）需要运行 benchmark（`npm run eval:skills:run`，需 Codex CLI），本次未运行——仅验证了文档合约与术语一致性。

## Rollback

- Revert path: 删除 `evidence-policy.md`；`git revert` 其余 7 个文件的改动。D9 回退到「必须提供运行证据（编译/启动/测试至少一项）」。
- Safe stop condition: 如果 benchmark 行为评分因证据铁律显著下降（模型因交不出证据而反复中止），回到分级更松的版本（L2 才强制 subagent）。

## Docs To Sync

- [x] shared/concepts/evidence-policy.md（新增，已完成）
- [x] execution-discipline.md / history-maintenance.md（已更新）
- [x] codegen / review / bugfix-protocol（已更新）
- [x] change-unit-template.md / implementation-quality.md（已更新）
- [ ] AGENTS.md「操作纪律」段：D9 描述仍为旧措辞，需在下次发版同步（本次为方法论层改动，AGENTS.md 是投影层，可异步）

## Completion Evidence

- Code diff: 见 git diff（8 文件：1 新增 + 7 修改）
- Test evidence (command + output, not conclusion): `node scripts/evaluate-skills.mjs` → `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).`
- Doc sync result: 概念层与 skill 出口已同步；AGENTS.md 投影层标记为异步
- Residual risk: 行为有效性未跑 benchmark 验证；模型伪造命令输出的洞依赖 harness 层（已知边界）
