# CU-20260702-effectiveness-feedback-loop

## Type

Methodology / Evaluation

## Intent

- Trigger：Forge 已有 compliance/regression suite，但下一轮升级需要真实 effectiveness 反馈闭环；同时儿童版心智模型暴露出 vertical slice、buy-vs-build review、learn 候选出口、guide 委托建议四个可操作补强点。
- Goal：新增独立 effectiveness contract，并把四个运行规则接入现有 skill。
- Out of scope：真实 Codex benchmark run；effectiveness 结论；新增生命周期阶段；bump version / commit / push。

## Behavior Change

- 新增 `evals/effectiveness-suite/`，定义 5 类 held-out task contract：small feature、bugfix、frontend buy-vs-build、delegation、learn boundary。
- 新增 `npm run eval:effectiveness`，只验证 contract 完整性，不声称真实效果。
- `validate` 接入 effectiveness contract 校验。
- `detail` 的 module 粒度规则补充 vertical slice 约束。
- `review` 新增 buy-vs-build lens。
- `learn` 新增对话内 `Cross-project candidates` 输出格式。
- `guide` 引用 delegation matrix 给委托建议。

## Affected Surface

- `evals/effectiveness-suite/**`
- `scripts/lib/effectiveness-contract.mjs`
- `scripts/validate-effectiveness-suite.mjs`
- `tests/effectiveness-suite.test.mjs`
- `package.json`
- `scripts/validate.mjs`
- `docs/skill-suite-evaluation.md`
- `plugins/forge/skills/detail/SKILL.md`
- `plugins/forge/skills/review/SKILL.md`
- `plugins/forge/skills/learn/SKILL.md`
- `plugins/forge/skills/guide/SKILL.md`
- `docs/features/effectiveness-feedback-loop/goal.md`

## Decisions

- FD1：effectiveness suite 独立于 skills-suite。理由：skills-suite 是 compliance/regression，不能被真实效果语义污染。
- FD2：先做 contract validator，不做 scorer。理由：没有真实多轮 run report 前，评分会制造伪确定性。
- FD3：vertical slice 只补到 detail，不新增阶段。理由：默认链保持 `detail -> codegen -> review`。
- FD4：Cross-project candidates 只在对话输出，不落盘。理由：跨项目归档需要目标 owner 和确认门。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| contract 被误读成效果证明 | 过度宣传 | README、docs、脚本输出均声明 no effectiveness claim |
| review lens 增加默认链字符 | token 预算压力 | 一行规则，metrics gate 验证 |
| fixtures 泄漏 oracle | 评测失真 | `tests/effectiveness-suite.test.mjs` 禁止 scoring 内部词 |

## Verification

```bash
npm run eval:effectiveness
```

Result: `Forge effectiveness-suite contract passed (5 held-out cases, 5 scenarios, 2 repeats required).` No run report supplied; real-world effectiveness is not claimed.

```bash
npm test
```

Result: 90 pass / 0 fail.

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.48.0).`

```bash
npm run eval:skills
```

Result: `Forge skills-suite benchmark contract passed (21 cases, 25 skills covered).` No run report supplied; behavioral effectiveness is not claimed.

```bash
npm run metrics:chars
```

Result: default chain 4433 chars; all SKILL.md 49072 chars. Default chain remains under the 4500-char validator budget.

## Unverified

- 尚未运行真实 Forge/no-Forge multi-run effectiveness comparison。
- 尚未有人类或外部审阅者使用 5 个 metrics 打分。

## Rollback

Revert this CU plus the affected files above. Remove `eval:effectiveness` from `package.json` and `validate` if rolling back the suite.

## Authoritative Documents Synchronized

- `docs/features/effectiveness-feedback-loop/goal.md`：feature 合约已建立。
- `docs/skill-suite-evaluation.md`：新增 held-out effectiveness contract 边界说明。
