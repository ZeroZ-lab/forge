# CU-20260625-fix-confirmed-adversary-findings

## Type

- bugfix（诚信机制修复）

## Intent

修复一次对抗式反派评审中**站得住**的 3 条问题（1 critical / 1 high / 1 moderate），全部落在"诚信声称跑在诚信执行前面"的系统性根因上：

1. **[critical] `--verify-disk` 校验错误目录**：`scripts/evaluate-skills/index.mjs` 用 `path.join(root=process.cwd(), cuPath)` 去 Forge 仓库根查找 agent 产出的 CU，但 CU 实际落在 `.eval-runs/skills-suite/<run_id>/workspaces/<case_id>/docs/change-units/`——对真实 benchmark 报告必然报 `change unit not found on disk`。唯一"通过"的测试用 Forge 自有 CU 冒充 agent 产出。
2. **[high] 独立产物门准入门自评**：`validate.mjs` 只校验 gated artifact 的命名/结构，不校验门的实质条件（独立 owner / 不同周期 / 独立 review），写文档的同一 agent 自证通过门。
3. **[moderate] v0.41.0 CU 证据 stale copy**：`CU-20260625-guide-stage-progression.md` Verification 段粘贴 bump 前旧输出 `version 0.40.0`；Affected Surface 漏列 3 个版本文件。

## 行为变化

- `scripts/evaluate-skills/index.mjs`：`--verify-disk` 的 CU 路径解析从 `path.join(root, cuPath)` 改为优先解析到报告目录下的 `workspaces/<case_id>/`（由 `--report` 绝对路径推导 `reportDir`），工作区不存在再 fallback 到 `root`（兼容合成/旧报告）。新增 artifact 磁盘存在性校验（同解析逻辑，跳过 `docs/change-units/` 前缀避免与 CU 块重复）。
- `scripts/validate.mjs`：新增独立产物门机械检查——`docs/features/**` 下的 gated artifact（`PRD.md`/`testing/strategy.md`/`deploy/plan.md`/`interaction-spec.md`/`research-brief.md`）与 `docs/adr/*.md` 必须携带 `gate_owner:`（issue URL / CODEOWNERS 路径 / 命名 owner）或 `demo: true`/`exempt: demo` 豁免，否则 fail。
- `tests/skills-suite-evaluation.test.mjs`：删除用 Forge 自有 CU 冒充 agent 产出的 accept 路径，改为自建临时 workspace + 独立 fixture CU 的回归基线，断言工作区 CU 被正确命中、断言不存在的 CU 仍报 `not found on disk`。
- `docs/features/task-management/deploy/plan.md`、`testing/strategy.md`：补 `demo: true` frontmatter，"独立产物理由"自述改为"示例 feature demo 豁免"诚实表述。
- `docs/change-units/CU-20260625-guide-stage-progression.md`：Verification 行 `0.40.0`→`0.41.0`（实跑 `npm run validate` 取真实输出）；Affected Surface 补列 `package.json` 与两个 plugin manifest。

## 影响面

- 代码：`scripts/evaluate-skills/index.mjs`、`scripts/validate.mjs`、`tests/skills-suite-evaluation.test.mjs`
- 文档：2 个 task-management gated artifact、1 个 guide CU、本 CU
- 不影响：skill 路由、scoring 模型、benchmark contract

## 风险

- **(已规避) 历史证据伪造**：起草阶段曾引入"CU Verification 版本字面量必须 == package.json.version"断言，并为让 gate 转绿把 6 份历史 CU 的真实版本（0.32.0/0.35.0/0.39.0×3）重写为 0.41.0，制造内部矛盾证据（如"23 skills, version 0.41.0"，但 0.41.0 实为 25 skills）——这违反断言声称保护的"证据铁律"。**已回退 6 份历史 CU，已移除该断言**。正确作用域需 git-aware（只校验工作树中正在写的 CU），成本与这个一次性 copy-paste 类问题不匹配，作为独立后续硬化和用户确认（见未验证项）。
- `--verify-disk` 现在会在真实报告上实际读取 workspace CU 内容并执行既有 command-evidence 检查；真实 agent CU 若 Verification 段无三反引号块或 node/npm 等命令，会被合法标记 `lacks command evidence`。这是机制终于工作而非回归。
- 独立产物门新规则未同步写入 `AGENTS.md` 独立产物门段落（D1 留痕缺口），贡献者只能从 validator 失败信息得知 `gate_owner`/`demo` 机制。

## 验证

- `npm run validate` → `Forge validation passed (25 skills, version 0.41.1).`
- `npm test` → 28 tests, 28 pass, 0 fail。
- `node --test tests/skills-suite-evaluation.test.mjs` → 19 subtests pass，含新增 `verifies change units on disk with --verify-disk`（workspace 回归）与既有 `--verify-disk requires a Verification section with command evidence`。
- critical 实跑确认：对真实报告 `.eval-runs/skills-suite/2026-06-05T03-39-19-428Z/report.json`（case_id=ambiguous-idea-alignment）执行 `--verify-disk`，workspace CU 被正确定位（不再报 `not found on disk`），转入内容检查。

## 未验证项

- **版本 stale-copy 机械断言**：已移除，未实现。正确实现需 git-aware 作用域（只校验工作树未提交的 CU），需用户确认是否值得引入 git 依赖到 `validate.mjs`。
- **AGENTS.md 门机制文档同步**：`gate_owner`/`demo` 豁免机制未写入 `AGENTS.md` 独立产物门段落，待用户确认措辞后补。
- **真实全量 21-case benchmark + Codex CLI** 未跑（需 Codex CLI 环境，本次为本地修复）。

## 回滚

- 代码/测试/文档均为工作树未提交改动，`git checkout -- <files>` 即可回退。
- verify-disk 路径解析回退后会重新对真实报告报 `not found on disk`（恢复 critical 状态），非数据破坏。

## 权威文档同步

- 本 CU 记录修复与有意推迟项。
- `AGENTS.md` 独立产物门段落待补 `gate_owner`/`demo` 机制说明（未同步，见未验证项）。
