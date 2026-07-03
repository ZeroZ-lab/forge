# CU-20260703-architecture-view-skill

## Type

- Feature / Release

## Intent

- Trigger: 用户希望需求定义或设计阶段能同步生成网页展示模块关系、数据模型、接口关系、运行链路和部署拓扑，但该网页只能是派生视图，不是事实源。
- Goal: 发布 `architecture-view` skill，提供从 Forge 权威文档生成本地派生架构视图的显式 sidecar 能力，并发布 v0.50.0。
- Out of scope: 不把 architecture view 加入默认链；不新增 npm 依赖；不从源码或常识推断 confirmed 架构事实。

## Behavior Change

- User-visible behavior: 新增显式 `$architecture-view` / skill selector 能力，可生成 `.forge/architecture-views/<feature>/index.html`。
- Internal behavior: 新增 deterministic renderer，读取 goal/modules/project/deploy，输出 coverage matrix 与 source-backed sections。
- Contract change: 已发布 skill 从 25 个变为 26 个：24 个决策协议 + 1 个派生视图 skill + 1 个显式 guide；skills-suite 增加 `architecture-view-derived-view` case。
- Data change: 无。

## Affected Surface

- Features: `architecture-view`
- Modules: `plugins/forge/skills/architecture-view/`
- Contracts: Claude plugin manifest、skills-suite manifest、README/AGENTS 发布说明、skill invocation policy
- Code implementation: `render-architecture-view.mjs`
- Tests: `tests/architecture-view-renderer.test.mjs`
- Operations: `.forge/` 作为本地生成 cache 加入 `.gitignore`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 派生视图被误当事实源 | 文档单一事实源被破坏 | SKILL、HTML、benchmark 均要求 `derived-view` / `not-fact-source`；输出写 `.forge/` |
| Parser 对历史自由格式误报 | 用户不信任 Unknown/Missing | v1 只支持稳定 Forge heading，旧格式 best-effort，不扩 regex 兼容 |
| 新 skill 增加触发噪音 | 误触发普通 coding map/map 数据结构任务 | skill 禁止隐式调用，description 排除 geographic/source/roadmap/data-structure map |
| 发布统计漂移 | validate/eval 信息不一致 | validator 改为单独统计 derived-view skill，skills-suite 覆盖 26 个 skill |

## Verification

- Commands (with exit codes):
  - `node --test tests/architecture-view-renderer.test.mjs` → exit 0 / `tests 6`, `pass 6`
  - `node plugins/forge/skills/architecture-view/scripts/render-architecture-view.mjs --feature task-management --format json | node -e ...` → exit 0 / task-management view model: sources 8; modules/models/interfaces/runtime/deployment all confirmed
  - `npm run validate` → exit 0 / `Forge validation passed (26 skills, version 0.50.0).`
  - `npm test` → exit 0 / `tests 96`, `pass 96`
  - `npm run eval:skills` → exit 0 / `benchmark contract passed (22 cases, 26 skills covered)`
  - `npm run metrics:chars` → exit 0 / default chain `4433` chars; all SKILL.md `50980` chars
  - `git diff --check` → exit 0 / no output
  - `node scripts/run-skills-benchmark.mjs --case architecture-view-derived-view --run-id 20260703-architecture-view-smoke` → exit 0 / wrote report and summary under `.eval-runs/skills-suite/20260703-architecture-view-smoke/`
  - `node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/20260703-architecture-view-smoke/report.json` → exit 0 / `1 cases, 11/11 oracle checks`, `Score: 100/100 (A)`, `evidence 11/11 independent`
- Red-capable evidence (bugfix only): N/A
- Not verified (with blocking reason): Cross-platform Claude/Codex implicit invocation behavior was not live-tested; static metadata and validator coverage were verified.

## Rollback

- Revert path: `git revert <this-commit>` or remove `plugins/forge/skills/architecture-view/`, its manifest/eval/docs entries, and rerun version bump to the prior release if needed.
- Data rollback: Remove generated `.forge/architecture-views/**` cache if present.
- Safe stop condition: Stop if generated views are treated as authoritative docs or if validator/eval stops covering the derived-view skill.

## Docs To Sync

- [x] feature goal.md — N/A, no feature fact source changed
- [x] project.md / ADR — N/A, no project architecture decision changed
- [x] modules — N/A, no module contract changed
- [x] testing docs — skills-suite docs and fixture synchronized
- [x] deploy docs — N/A, no deploy contract changed

No feature goal/project/module/deploy fact source needed changes; release docs, invocation policy, skills-suite docs, and this CU were synchronized.

## Completion Evidence

- Code diff: Added `architecture-view` skill, renderer, HTML template, tests, skills-suite fixture/case, release docs, version bump, and `.forge/` ignore.
- Test evidence (command + output, not conclusion): See Verification section.
- Goal coverage: `plugins/forge/skills/architecture-view/SKILL.md` covers derived-view behavior; `tests/architecture-view-renderer.test.mjs` covers renderer source refs and no-invention behavior; `evals/skills-suite/manifest.json` covers runtime skill routing and non-authoritative output.
- Doc sync result: README、AGENTS、marketplace、skill-invocation-policy、skill-architecture-audit、skills-suite docs and manifests synchronized for 26 published skills.
- Residual risk: Renderer supports only stable Forge headings in v1; older/freeform docs may produce sparse Missing/Not applicable coverage until their accepted facts are written into canonical sections.
