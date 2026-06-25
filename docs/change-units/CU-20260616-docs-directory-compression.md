# CU-20260616-docs-directory-compression

## Type

- Methodology

## Intent

- Trigger: 用户要求压缩整理 docs 目录，确保没有冗余、结构清晰。
- Goal: 把活跃示例文档收敛到 canonical `goal.md + modules/*.md`，并减少 docs 根目录噪音。
- Out of scope: 不改 benchmark fixture 的历史期望；不改 timeline / audit 中作为历史事实存在的旧路径。

## Decision

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| 1 | Feature 详设布局 | 单 `goal.md` + 单层 `modules/*.md` | 只有一个入口和一条下钻路径，符合 CU-20260609 的 canonical 决策 | 继续保留 `api/goal.md`、`frontend/goal.md` 等领域级 goal |
| 2 | 测试/发布产物 | `testing/strategy.md`、`deploy/plan.md` | 与当前 test/deploy skill 产物命名一致 | `testing/goal.md`、`deploy/goal.md` |
| 3 | 旧长计划 | 压缩后移入 `docs/archive/` | 保留历史结论，又不保留 1000+ 行过期执行清单 | 删除历史；继续放根目录 |
| 4 | Thinking 入口 | 从 `docs/advanced.md` 索引 | 所有保留 thinking 产物都有明确入口 | 散放在 `docs/thinking/` 里靠搜索发现 |

## Behavior Change

- User-visible behavior: 文档入口更少，`docs/features/task-management/goal.md` 成为唯一 feature goal。
- Internal behavior: validator 会阻止 `docs/features/*` 重新引入旧 per-domain goal 布局。
- Contract change: 示例 feature 与 runtime skill 的 canonical 文档结构保持一致。
- Data change: 旧 `skill-audit-fix-plan.md` 从 1000+ 行执行清单压缩为历史摘要。

## Affected Surface

- `docs/features/task-management/`
- `references/usage-examples.md`
- `docs/advanced.md`
- `docs/timeline.md`
- `scripts/validate.mjs`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 历史文档仍含旧路径，读者误认为当前规范 | 低 | 只在历史/归档里保留；活文档、示例和 validator 使用新规范 |
| 删除领域级 changelog 后丢失局部历史 | 低 | 合并为 feature 级 `changelog.md` 初始记录 |
| storage 模块新增后 goal 索引遗漏 | 低 | validator 检查 `modules/*.md` 全部被 goal 索引 |

## Verification

- `node scripts/validate.mjs`
- `node --test tests/*.test.mjs`
- `git diff --check`
