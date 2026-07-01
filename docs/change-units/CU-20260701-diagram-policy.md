# CU-20260701-diagram-policy

## Type

Methodology / Release (v0.47.0)

## Intent

- Trigger: 项目此前无统一图表规约，流程图/状态图/时序图/架构图的选型与放置缺少约束，易出现工具混用、二进制散图、图与文档漂移。
- Goal: 为 Forge 流程中产生的所有图表确立单一规约——Mermaid 优先、PlantUML 兜底、内联进权威文档、不建独立散图。
- Out of scope: 不引入新图渲染工具链（D2/Structurizr/Kroki）；不改动已有 feature 文档；不在本次实际产出图。

## Behavior Change

- 流程中产生的流程图/状态图/时序图/类图/架构图默认用 Mermaid；PlantUML 仅在 Mermaid 表达不了或需精排时兜底。
- PlantUML 兜底时用本地插件预览，不依赖外发服务端（避免仓库内容泄露）。
- 图内联进 `goal.md` / module / `docs/project.md` / interaction-spec / ADR，不创建 `diagrams/` 散图目录或独立 `.puml`/`.svg`/`.png`。
- 明确排除 Excalidraw / draw.io 等可视化拖拽工具作为权威产物（违反文本 diff 原则）。

## Affected Surface

- `docs/project.md`：共享决策表新增 PD8；工程约束段新增图表规约引用。
- `plugins/forge/skills/shared/concepts/diagram-policy.md`：新增图表规约概念文件。
- `plugins/forge/skills/interaction-design/SKILL.md`：文档约束段新增 PD8 / diagram-policy 引用。
- `package.json`、`plugins/forge/.claude-plugin/plugin.json`、`plugins/forge/.codex-plugin/plugin.json`：版本同步至 0.47.0。

## Decisions

- 选 Mermaid 为默认：GitHub/GitLab 原生渲染、零依赖，符合 D4 最小变更。
- PlantUML 仅作兜底：表达力最全，但 GitHub 不原生渲染，需配套插件；不引入第三选项避免工具栈膨胀。
- 图内联而非独立文件：图是文档从属表达，随文档同生命周期，避免图与文档漂移（符合独立产物门）。
- 排除可视化拖拽工具：存二进制/xml，Git diff 失去意义，违反文本驱动原则。
- 拒绝方案：D2（新生代但生态年轻）、Structurizr（架构专用、对 Forge 过度）、Kroki（中转渲染不解决原生问题）、Graphviz DOT（仅擅长有向图）。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mermaid 在不支持的平台显示为代码块 | 图不可见，文档可读性下降 | 文本驱动前提下可接受；PlantUML 同样依赖平台能力，不更优 |
| 图与代码实现漂移 | 图过期误导读者 | 由 review 与权威文档单一事实源保证，不靠图自证 |
| 规约无法在 harness 层强制 | skill 可能违规出图 | 纳入 review 检查项；concept 文件作为出口引用依据 |

## Verification

```bash
npm test
```

Result: 87 tests pass / 0 fail.

```bash
npm run validate
```

Result: `Forge validation passed (25 skills, version 0.47.0).`

```bash
npm run metrics:chars
```

Result: default chain `4026` chars（未变）；all `SKILL.md` files `47935` chars。`shared/concepts/diagram-policy.md` 不计入 SKILL.md token gate。

## Unverified

- 无 held-out 或外部审阅的 effectiveness suite 被运行（本次为方法论更新，无功能代码）。
- 规约在实际 feature 出图时的可读性未实测（本次仅落地规约，未产出图）。

## Rollback

Revert this CU plus the edits to `docs/project.md`、`plugins/forge/skills/shared/concepts/diagram-policy.md`（删除）、`plugins/forge/skills/interaction-design/SKILL.md` 及三个版本文件。版本回退至 0.46.0。

## Authoritative Documents Synchronized

- `docs/project.md`：PD8 决策与工程约束引用已写入。
- `plugins/forge/skills/shared/concepts/diagram-policy.md`：图表规约概念文件已建立，供所有 skill 引用。
- `plugins/forge/skills/interaction-design/SKILL.md`：流程/状态/时序图选型已指向 PD8 与 diagram-policy。
