# CU-20260625-audit-followthrough

## Type

- Tooling / Methodology

## Intent

- Trigger: 对抗式审计剩余项——H4 skill 角色歧义（`test`/`design` 的 description 听起来复述了其他 skill 的职责）与 M1 评测深化（`--verify-disk` 只验存在性、不验内容）。
- Goal: ① 把 `test`/`design` 的 description 改写为明确的"协调者"角色，去除复述 `test-strategy`/`test-cases` 与 `interaction-design`/`fe-system` 的歧义；② `--verify-disk` 在 CU 落盘后再加一档内容校验：必须含 `## Verification` 段且段内带命令证据。
- Out of scope: artifact 落盘校验（与合成报告声称不存在的 fixture 路径冲突，留待后续）；Verification 内容真伪与命令是否在 CI 跑过；前端四阶段（frontend-design/fe-system/fe-artifact/fe-accept）边界——已是清晰流水线，不改。

## Behavior Change

- `test/SKILL.md` description：「Orchestrates testing strategy and concrete scenario derivation」→「Coordinates test-strategy and test-cases — resolves conflicts between acceptance criteria, risk coverage, and implementation…」（与 body 职责"协调"一致）。
- `design/SKILL.md` description：「Orchestrates interaction and visual decisions」→「Orchestrates the design stage — coordinates interaction-design, fe-system, and frontend-design, and resolves conflicts…」（明确为编排者）。
- `evaluate-skills/index.mjs` `--verify-disk`：存在性校验通过后读 CU，要求 `## Verification` 段存在，且该段含 ```fence``` 或命令前缀（`node|npm|npx|git|yarn|pnpm|deno|bash|sh|python|pip` + 参数）；否则报 `lacks a Verification section` / `Verification section lacks command evidence`。

## Affected Surface

- `plugins/forge/skills/test/SKILL.md`、`plugins/forge/skills/design/SKILL.md`
- `scripts/evaluate-skills/index.mjs`
- `tests/skills-suite-evaluation.test.mjs`（新增内容校验测试）
- 新增本 CU

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| description 改动影响 skill 路由 | 触发可能变 | 关键词 risk coverage/scenarios/design stage 保留；validate 不校验触发语义，测试不依赖 description 文本 |
| 内容校验误判合法 CU | 真 CU 被拒 | 阈值宽松（fence 或任意命令前缀即可）；28/28 测试含真 CU 通过路径 |
| 仍不校验 Verification 内容真伪 | 空 fence 可骗过 | 显式记为后续深化项 |

## Verification

- Commands: `node scripts/validate.mjs`、`node --test 'tests/*.test.mjs'`、`node scripts/measure-char-footprint.mjs`
- Results: validate exit 0（25 skills）；tests **28 pass / 0 fail**（+1 内容校验测试）；default chain 8947<9000、total 50963<56000。

## Rollback

`git revert <this-commit>`。description 改写与 `--verify-disk` 内容校验相互独立，可分别回退。

## 权威文档同步

- `test`/`design` description 与各自 body 职责对齐。
- `--verify-disk` 内容校验语义见本 CU 与 README `--verify-disk` 说明。
- 命名级联（`measure-char-footprint` / `metrics:chars`）见上一个 commit `56f3ced`。
