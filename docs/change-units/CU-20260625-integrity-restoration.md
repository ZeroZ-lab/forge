# CU-20260625-integrity-restoration

## Type

- Methodology / Refactor / Tooling

## Intent

- Trigger: 对抗式审计发现工作树违反自家门——validator 红、测试红、版本声明 0.39.0 但 HEAD 仍 v0.36.2（v0.37–0.39 为"幽灵发布"未提交）、token 度量以 chars/3.2 伪报为 tokens（对中文内容低估 ~2.6×）、D10 仍引用已于 v0.34.0 合并掉的 notes/。
- Goal: 用最小可逆 patch 让仓库从"红线 + 说谎度量 + 漂移文档"回到"绿线 + 诚实度量 + 自洽事实"，并把此前未提交的 0.37–0.39 WIP 连同本轮修复收敛进 git。
- Out of scope: 合并冗余 skill（test 三连 / 前端六连）；重写 git 历史拆分幽灵版本；评测从"自报来源"升级到"行为 oracle"；接真分词器；重命名 measure-token-footprint 文件与 metrics:tokens 脚本名（保留为残留命名）。

## Behavior Change

- 默认链 `detail/codegen/review` SKILL.md 去冗余：压缩 运行时信号/加载判断/产出/历史维护，删除与 Phase 4 重复的 checklist 与红旗项，删除 codegen/review 中复述验证清单的"完成提示"段。default chain chars 9561 → 8947，回到 9000 预算内。
- `scripts/measure-token-footprint.mjs`：移除 `estimated_tokens`/`token_ratio` 字段的伪精确命名，改为 `token_proxy` + `unit_note`，明确声明 chars 才是度量基准、proxy 对 CJK 内容低估 ~2.6×、不是真分词器；人类可读输出加同等 disclaimer。
- `scripts/validate.mjs`：失败信息 `token budget` → `char budget`（实际度量的是字符）。
- `README.md`：把"校验 25 个已发布 skill、…token 上限"改为与 validate 实际行为一致的话术（校验 skill 与 manifest/registry 一致、字符预算上限）。
- `shared/concepts/execution-discipline.md`：D10/L2 "多模块需 notes/" → "多模块需 goal + modules/"。

## Affected Surface

- `plugins/forge/skills/{detail,codegen,review}/SKILL.md`
- `scripts/measure-token-footprint.mjs`、`scripts/validate.mjs`
- `README.md`
- `plugins/forge/skills/shared/concepts/execution-discipline.md`
- 新增 `docs/change-units/CU-20260625-integrity-restoration.md`
- 同时落地此前未提交的 document-artifact-policy 收敛工作（删除 changelog/status/trace/test-cases 等模板，见 CU-20260625-document-artifact-policy.md）

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| skill 文案精简削弱协议 | detail 等可读性下降 | 仅删复述内容（Phase 4 已覆盖的 checklist/红旗、复述验证清单的完成提示），保留全部 Phase/出口条件/红旗主项；绿线证明未破坏契约 |
| 度量改名破坏下游 | 读取旧 JSON 字段报错 | grep 确认仅脚本自用；测试只读 `.chars`；CUs 只引用命令行 |
| 单提交合并多版本 WIP | 历史难拆 | 残留：0.37–0.39 仍无独立 commit；本 CU 显式记录，不重写已发布历史 |
| 文件名/脚本名仍含 token | 命名不诚实 | 残留命名，Tier 2 处理 |

## Verification

- Commands:
  - `node scripts/measure-token-footprint.mjs --max-default-chain-chars=9000 --max-total-chars=56000`
  - `node scripts/validate.mjs`
  - `node --test 'tests/*.test.mjs'`
- Results:
  - metric exit 0：default chain 8947 chars < 9000；total 50776 < 56000；输出含 "NOT a real tokenizer, undercounts CJK ~2.6x"。
  - validate exit 0：`Forge validation passed (25 skills, version 0.39.0)`。
  - tests：26 pass / 0 fail（修复前 25 pass / 1 fail）。

## Rollback

`git revert <this-commit>`（本轮为单一 commit，含全部修改）。skill 文案精简可用 `git checkout HEAD~1 -- plugins/forge/skills/{detail,codegen,review}/SKILL.md` 单独回退。

## 权威文档同步

- `README.md` 自检描述与 validate 实际行为对齐。
- `execution-discipline.md` D10 与 v0.34.0 后的文档模型对齐。
- 本 CU 记录幽灵版本（0.37–0.39 declared-but-uncommitted）现状与残留，未重写历史。
