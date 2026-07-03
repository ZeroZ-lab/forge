# CU-20260703-improve-graduation

## Type

- Release / Methodology

## Intent

- Trigger: 用户要求 `$improve` 可作为斜杠命令调用，选择快速毕业路径。
- Goal: 把 `improve` 从 `experiments/skills/` 毕业到 `plugins/forge/skills/`，注册进 manifest，过 benchmark 覆盖门，发布 v0.52.0。
- Out of scope: 不跑真实 benchmark 运行（需 Codex CLI）；eval case 是结构合法的 stub，未实战验证。

## Behavior Change

- User-visible behavior: `$improve` 成为已注册显式 sidecar，可被调用；本机重启 ZCode/Codex 拉取 0.52.0 后生效。
- Internal behavior: 已发布 skill 26→27；新增第 4 类 sidecar「架构发现 skill」(improve)；eval cases 22→23；`minimum_cases` 22→23。
- Contract change: claude manifest skills 数组 +1；validate.mjs 新增 `discoverySkills` 计数轴与三处计数断言；historyAwareSkills/artifactAwareSkills 列表 +improve。
- Data change: 无。

## Affected Surface

- Features: 无。
- Modules: `plugins/forge/skills/improve/`（从 `experiments/skills/` 移入；Refs 路径修为 `../shared/...`）。
- Contracts: `plugins/forge/.claude-plugin/plugin.json`（skills 数组）、`scripts/validate.mjs`（分类+计数+断言+列表）、`evals/skills-suite/manifest.json`（+case、minimum_cases）、4 个 marketplace.json（version）、AGENTS.md/README.md 计数文案。
- Code implementation: 无。
- Tests: 无新增测试；`tests/benchmark-contract.test.mjs` 与 `tests/eval-suite-distribution.test.mjs` 因 cases/minimum_cases/level 分布变化而重新通过。
- Operations: 无。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| eval case 是未实战的 stub | 触发价值无证据 | CU 记录未验证项；graduation 前置的「representative runtime benchmark evidence」未满足，属快速毕业的已知折让 |
| 新增「架构发现 skill」分类是主观判断 | 公共描述用词可能不符用户偏好 | 命名「架构发现 skill」，与「派生视图 skill」并列；用户可后续改名 |
| improve 被误当架构事实 | 单一事实源被破坏 | SKILL 硬门 3/4 + eval oracle `artifact_absent docs/**` + `forbidden_behavior_absent improve_created_authoritative_doc` |
| 本机 ZCode 缓存仍停在 0.46.0 | 本会话仍看不到 $improve | install 脚本只装 codex 缓存；ZCode 需重启拉取 0.52.0 |

## Verification

- Commands (with exit codes):
  - `npm run validate` → exit 0 / `Forge validation passed (27 skills, version 0.52.0).`
  - `npm test` → exit 0 / `tests 96`, `pass 96`, `fail 0`
  - `npm run metrics:chars` → exit 0 / Default chain `4433` chars；All SKILL.md `54214` chars（≤56000 预算）
  - `node scripts/bump-version.mjs 0.52.0` → 3 manifest + 4 marketplace 全部 0.51.1 -> 0.52.0
  - `grep -rn improve plugins/forge/.claude-plugin/plugin.json` → `./skills/improve` 命中（已入 manifest）
- Red-capable evidence (bugfix only): N/A
- Not verified (with blocking reason): 未跑 skills-suite 真实 benchmark（需 Codex CLI；eval case `improve-deepening-candidates` 仅结构合法，无运行证据）；未在真实代码库试跑 improve 协议验证候选质量。

## Rollback

- Revert path: `git revert <this-commit>`；或手删 `plugins/forge/skills/improve/`、从 manifest 移除 `./skills/improve`、还原 validate.mjs 分类/计数/列表/断言、还原 4 marketplace+3 manifest version、还原 AGENTS/README/eval-suite 计数与 minimum_cases。
- Data rollback: 删除生成的 `.forge/improve/**` cache（若有）。
- Safe stop condition: Stop if improve 被误加进默认链、或候选被当架构事实写进 `docs/`。

## Docs To Sync

- [x] feature goal.md — N/A
- [x] project.md / ADR — N/A
- [x] modules — N/A
- [x] testing docs — `evals/skills-suite/README.md` per-level 分布与 case 总数已同步（22→23, lens 3→4）；`docs/skill-suite-evaluation.md` 22→23 已同步
- [x] deploy docs — N/A

AGENTS.md（24+1+1+1 计数行）、README.md（154 行标题 + 109 行覆盖数）、4 个 marketplace.json description/version 已同步为 0.52.0 / 27 skills。前序 CU-20260703-improve-skill 记录的是实验创建态，本 CU 记录毕业决策，两者均为历史记录。

## Completion Evidence

- Code diff: improve 移入发布目录 + 路径修正；eval fixture + manifest case；validate.mjs 分类/计数/断言/列表；7 文件 version 0.52.0；AGENTS/README/marketplace/eval-suite 计数文案；minimum_cases 23。
- Test evidence (command + output, not conclusion): 见 Verification 段。
- Goal coverage: `plugins/forge/skills/improve/SKILL.md` 覆盖扫码→报告→交接职责；`evals/skills-suite/fixtures/improve-deepening-candidates.md` + manifest case 覆盖 benchmark 合约门。
- Doc sync result: 发布计数与版本号全仓库一致（27 skills / v0.52.0）。
- Residual risk: eval case 未实战；分类命名「架构发现 skill」为判断项；本机 ZCode 缓存需重启拉取。
