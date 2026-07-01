# Diagram policy

> 图表（diagram）的技术选型与放置规则。所有 skill 在流程、状态、时序、架构需要可视化表达时引用本文件。

## 为什么单独定义

图表没有统一规约时，会朝两个方向腐烂：一是各自选工具（Mermaid / PlantUML / Excalidraw / draw.io 混用），二进制或 xml 文件混进仓库，Git diff 失去意义；二是图与文档脱节，散落 `.puml`/`.svg` 成为无人维护的平行事实源。本文件把图表钉死成「文本驱动、内联为主、单一兜底技术」。

## 技术选型

默认 **Mermaid**，PlantUML 仅作兜底：

| 场景 | 技术 | 理由 |
|------|------|------|
| 默认流程、状态、时序、类、甘特 | Mermaid | GitHub/GitLab 原生渲染，零依赖，符合 D4 最小变更 |
| Mermaid 无法表达，或需要精控排版 | PlantUML（兜底） | 表达力最全、UML 覆盖完整、`skinparam` 可精排 |
| 依赖/调用关系等有向图 | Mermaid `flowchart` 或 `graph` | 优先 Mermaid；Graphviz DOT 不引入 |

选型只两层，不引入 D2 / Structurizr / Kroki 等第三选项，避免工具栈膨胀。

## 何时升级到 PlantUML 兜底

只有当 **Mermaid 确实表达不了**，或**排版需要精控**（自动布局结果不可用）时才升级。升级时必须：

- 用本地插件（VS Code / IntelliJ PlantUML 插件）预览，**不依赖外发服务端**（`plantuml.com` 会把内容发到外网，违反最小泄露）。
- 图源仍是纯文本 `@startuml ... @enduml`，内联在 Markdown 代码块里，不拆成独立 `.puml` 文件。

## 放置规则

图是文档的从属表达，不是独立产物。遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`：

| 内容 | 放在哪 |
|------|--------|
| 流程、状态、时序 | 内联进 `goal.md` 或对应 module |
| 项目级架构 | 内联进 `docs/project.md` |
| 复杂交互（通过独立产物门） | 内联进 `interaction-spec.md` |
| 难逆架构决策 | 内联进 ADR |

默认**不创建** `diagrams/` 散图目录、独立 `.puml`/`.svg`/`.png` 文件。图与它服务的权威文档同生命周期，随文档一起 review 和更新。

## 明确排除

| 技术 | 为什么排除 |
|------|-----------|
| Excalidraw / draw.io 等可视化拖拽工具 | 存二进制/xml，Git diff 无意义，违反文本驱动原则；结论用文本回写 goal |
| 外发服务端渲染（PlantUML server URL 嵌入） | 把仓库内容发到外网，违反最小泄露 |

可视化拖拽工具顶多在 brainstorm/对话里临时沟通，结论必须用文本回写权威文档。

## 边界（已知限制）

本文件约束的是 **skill 文档层**的图表选型与放置。它无法：

- 强制 GitHub/IDE 端实际渲染（取决于平台能力，Mermaid 在不支持的环境仍显示为代码块）。
- 校验图与代码的一致性（图会随实现漂移，需 review 把关）。

图的正确性由 review 和权威文档单一事实源保证，不靠图的「准确性」自证。
