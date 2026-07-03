# CU-20260703-improve-skill

## Type

- Methodology

## Intent

- Trigger: 用户贴来一个外部 `improve-codebase-architecture` skill（扫源码找浅模块重构机会、出 HTML 候选报告、再 grilling），希望按 Forge 体系重新设计。
- Goal: 落一个 Forge 体系的 `improve` 实验 skill：扫码探查 → 自包含 HTML 候选报告 → 用户选定 → 交接 `$think`；grilling 与回写交给既有 skill，不重实现。
- Out of scope: 不把 improve 加入任何 manifest 或 AGENTS.md skill 表；不做 grilling/回写（交给 think/codegen/learn/technical-design）；不引入 CDN 或 Mermaid 自动布局；不写渲染脚本（AI 直接写自由 HTML）。

## Behavior Change

- User-visible behavior: 新增显式 `$improve` 实验 sidecar 能力，可扫描源码、生成 `.forge/improve/<scope>/index.html` 候选报告。
- Internal behavior: 无。improve 在 `experiments/skills/`，`validate`/`metrics:chars` 不扫该目录，发布面零变化。
- Contract change: 无。已发布 skill 仍 26 个（24 决策协议 + 1 派生视图 + 1 guide）；manifest、AGENTS.md、README 计数不变。
- Data change: 无。

## Affected Surface

- Features: 无（实验，无 feature goal 变更）。
- Modules: `experiments/skills/improve/`（SKILL.md + references/module-depth.md + references/html-report-format.md + agents/openai.yaml）。
- Contracts: 无 manifest / 无 invocation-policy / 无 eval 变更。
- Code implementation: 无（AI 直接写 HTML，无渲染脚本）。
- Tests: 无新增测试（实验未进 eval）。
- Operations: `.forge/improve/` 复用已 gitignore 的 `.forge/` cache 目录。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 候选被误当架构事实 | 单一事实源被破坏 | SKILL 硬门 3/4：报告是 cache、不写 `docs/**`、不创造事实；HTML 声明 `derived-view`/`not-fact-source` |
| 候选无代码证据 | 报告沦为主观流水账 | 硬门 2 + Review 检查：每候选必须 `{file, line, symbol}`；无代码位置即拒收（仅清单强制，无 code-enforced 断言） |
| 与 architecture-view 同名混淆 | 用户分不清「派生视图」与「找改进」 | description 正负向 fixture 显式排除 `$architecture-view`；职责段说明两者是平行兄弟 |
| 跨树引用 shared 概念路径 | graduation 时需修路径 | Refs 用 repo-root-relative `plugins/forge/skills/shared/...`；CU 记录 graduation 时改 `${CLAUDE_SKILL_DIR}/../shared/...` |
| 未做 benchmark/真实试跑 | 触发价值未验证 | 标注为实验、不入 manifest；graduation 前必须跑 skills-suite benchmark 与真实代码库试跑 |

## Verification

- Commands (with exit codes):
  - `npm run validate` → exit 0 / `Forge validation passed (26 skills, version 0.50.0).`
  - `npm run metrics:chars` → exit 0 / Default chain `4433` chars; All SKILL.md `50980` chars（与发布前一致，实验未被计入）
  - `npm test` → exit 0 / `tests 96`, `pass 96`, `fail 0`
  - `grep -rn improve plugins/forge/.claude-plugin/plugin.json plugins/forge/.codex-plugin/plugin.json` → exit 1（无匹配，确认未入 manifest）
  - `wc -l experiments/skills/improve/SKILL.md` → 68 行（≤350 发布上限，good-faith 目标）
- Red-capable evidence (bugfix only): N/A
- Not verified (with blocking reason): 未跑 skills-suite benchmark（实验未进 eval manifest，需 graduation 前补）；未在真实代码库试跑（需用户在自己的项目上显式调用 `$improve` 验证触发价值与候选质量）。

## Rollback

- Revert path: `rm -r experiments/skills/improve/` 并删除本 CU；无 manifest/AGENTS/README/版本号需回滚。
- Data rollback: 删除生成的 `.forge/improve/**` cache（若有）。
- Safe stop condition: Stop if 候选被当架构事实写进 `docs/`，或 improve 被误加进默认链/manifest。

## Docs To Sync

- [x] feature goal.md — N/A，无 feature 事实源变更
- [x] project.md / ADR — N/A，无项目架构决策变更
- [x] modules — N/A，无模块合约变更
- [x] testing docs — N/A，实验未进 eval
- [x] deploy docs — N/A，无发布面变更

improve 是实验，未进 AGENTS.md skill 表、未进 manifest、未进 eval；无权威文档需同步。

## Completion Evidence

- Code diff: 新增 `experiments/skills/improve/`（SKILL.md + 2 references + agents/openai.yaml）与本 CU；无发布面、无测试、无脚本变更。
- Test evidence (command + output, not conclusion): 见 Verification 段。
- Goal coverage: `experiments/skills/improve/SKILL.md` 覆盖「扫码→报告→交接」职责与 6 条硬门；`references/module-depth.md` 覆盖词汇/deletion test/grilling agenda；`references/html-report-format.md` 覆盖自包含 HTML 脚手架/卡片 schema/内联 SVG 图式/词汇禁换。
- Doc sync result: 无权威文档变更；experiments README 的 graduation 前置（distinct role、正负向 routing fixture、token budget、benchmark、platform metadata、graduation CU）作为未来 graduation 的待办记录于此。
- Residual risk: source-ref 不变量仅靠清单强制（无 code-enforced 断言，不像 architecture-view 的 `assertConfirmedSources`）；跨树引用路径待 graduation 修正；触发价值与候选质量待真实代码库试跑验证。
