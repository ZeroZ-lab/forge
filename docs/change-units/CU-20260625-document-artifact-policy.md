# CU-20260625-document-artifact-policy

## Type

- Methodology / Documentation / Refactor

## Intent

- Trigger: Forge 默认文档数量仍过多，stage 与文件一一映射，存在重复事实和同步成本。
- Goal: 将默认事实模型收敛到 project、goal/modules、Change Unit，并为额外文档建立独立产物门。
- Out of scope: 删除历史 Change Units；取消完整生命周期 skills；重写业务实现。

## Behavior Change

- 默认不再创建 changelog、timeline、status、Trace、plan.md、test-cases.md 或 idea brief。
- plan、scenario matrix、review、thinking 默认在对话/issue 中完成。
- PRD、interaction spec、research brief、testing strategy、deploy plan、DESIGN 和 ADR 只有通过独立 owner/周期/审批/交接门时落盘。
- 自动化场景以测试代码为事实源；CU 同时承担变更历史和运行证据。

## Affected Surface

- Project rules: `AGENTS.md`, `README.md`, `docs/project.md`, `docs/advanced.md`
- Shared policy/templates: `plugins/forge/skills/shared/`
- Lifecycle and orchestration skills
- Init runtime instruction templates
- Forge active example documents
- Validator, benchmark contract, fixtures, and tests

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 独立文档被过度合并 | 专业 owner 难以 review | 明确定义 gated artifact 条件和允许类型 |
| 旧 benchmark 仍要求旧文件 | 评测与方法论冲突 | 同步 manifest、fixtures、tests、validator |
| 历史信息丢失 | 无法追溯旧决策 | legacy timeline/idea brief 移入 archive，只读保留 |

## Verification

- Commands:
  - `npm test`
  - `npm run validate`
  - `npm run eval:skills`
  - `npm run metrics:tokens -- --max-default-chain-chars=9000 --max-total-chars=56000`
  - `git diff --check`
- Manual checks: active docs tree; forbidden default artifact scan; skill output scan; moved-link scan
- Evidence:
  - 26/26 Node tests passed.
  - Validator passed for 25 skills, version 0.39.0.
  - Benchmark contract passed for 21 cases covering 25 skills.
  - Default chain 8,927 chars ≤ 9,000; all SKILL.md 50,756 chars ≤ 56,000.
  - No active timeline/status/idea brief, feature changelog, root plan, test-cases, or Trace artifact.
- Not verified: real Codex benchmark agent runs; evaluator explicitly does not claim behavioral effectiveness without a run report.

## Rollback

- Revert this CU listed changes.
- Archived legacy files remain available for manual restoration.
- No data migration.

## Docs To Sync

- [x] project.md
- [x] feature goal/modules
- [x] shared artifact policy
- [x] benchmark/evaluation docs

## Completion Evidence

- Code diff: artifact policy, templates, lifecycle skills, orchestrators, active docs, fixtures, manifest, validator, and tests updated.
- Test evidence: all commands in Verification passed on 2026-06-25.
- Doc sync result: `docs/project.md`, AGENTS/README, task-management example, shared templates, skills, and benchmark contract agree on the same model.
- Residual risk: real agent behavior still requires benchmark runs; optional artifact gating remains a judgment that review should challenge.
