# CU-20260625-eval-verify-disk

## Type

- Tooling / Evaluation

## Intent

- Trigger: 对抗式审计 M1——评测只校验自报来源（`*_reported` oracle 只 glob 报告数组，从不触磁盘），CHANGE UNIT 是否真的存在无法机器验证。
- Goal: 给评测加一个最小、默认关闭的"磁盘可验"能力 `--verify-disk`：报告里声称的 Change Unit 必须在仓库里真实存在。把 traceability 轴从"自报"升级一档到"磁盘可验"。
- Out of scope: 校验 CU 内容质量（Verification 段是否含真实命令）；校验 artifacts 落盘；重新执行测试命令验证行为正确性；把磁盘校验设为默认。这些是后续 M1 深化项。

## Behavior Change

- `scripts/evaluate-skills/index.mjs` 新增 `--verify-disk` flag（默认 false）。开启时，遍历 `report.cases[*].change_units`，对每个 `docs/change-units/...` 路径 `fs.existsSync(path.join(root, cuPath))`，不存在则 push failure `${case_id}: change unit not found on disk: ${cuPath}`，整体 exit 1。
- 通过时输出追加 `, on-disk verified` 后缀。
- 默认关闭 → 不触碰磁盘，既有自报评测与所有合成测试行为零变化。

## Affected Surface

- `scripts/evaluate-skills/index.mjs`（parseArgs + 磁盘校验 pass + 成功输出后缀）
- `tests/skills-suite-evaluation.test.mjs`（新增 `--verify-disk` 测试：reject-missing + accept-present）
- `README.md`（评测段说明 `--verify-disk` 语义与局限）
- 新增本 CU

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 仅校验存在性，不校验内容 | 仍可被空文件骗过 | 显式记为 out of scope；后续可加 Verification 段与命令校验 |
| 磁盘校验依赖 cwd=repo root | 在子目录运行可能误判 | evaluator 本就以 root=process.cwd() 解析 manifest，沿用同一假设 |
| 默认关闭，无人用 | 能力空置 | README 记录；CI 可在真实运行时启用 |

## Verification

- Commands:
  - `node scripts/validate.mjs`
  - `node --test 'tests/*.test.mjs'`
  - 手动：`--verify-disk` + 缺失 CU → exit 1，stderr 含 `change unit not found on disk`；+ 真实 CU → exit 0，stdout 含 `on-disk verified`（由新增测试覆盖）
- Results:
  - validate exit 0：`passed (25 skills, version 0.39.0)`。
  - tests：27 pass / 0 fail（新增 1 个 `--verify-disk` 测试）。
  - 磁盘校验拒绝/接受两路径均由测试证明。

## Rollback

`git revert <this-commit>`。功能完全增量、默认关闭，回退无副作用。

## 权威文档同步

- `README.md` 评测段补充 `--verify-disk` 的能力边界（磁盘可验 ≠ 完整行为有效性）。
- 本 CU 记录 M1 的第一个落地增量，剩余深化项（内容校验、artifact 落盘、重跑命令）留待后续。
