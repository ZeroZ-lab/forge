---
name: architecture-view
description: Generates a local derived architecture view from Forge authoritative docs when the user explicitly asks for an architecture view, derived system map, module/data/interface/runtime/deployment overview, or HTML relationship preview; use as a sidecar only, not for map data structures, geographic maps, source maps, roadmaps, or ordinary implementation work.
disable-model-invocation: true
---

# Architecture View — 派生架构视图

## 职责

从 `docs/project.md`、`docs/features/<feature>/goal.md`、`modules/*.md` 和可选 deploy plan 生成本地 HTML/JSON 视图。视图是 cache，不是事实源；接受的事实必须回写到 goal、module、project 或 ADR。Refs: `../shared/concepts/artifact-policy.md`, `../shared/concepts/history-maintenance.md`.

## 硬门

- 只在用户显式要求架构视图、关系网页、derived view、系统关系预览时使用；不进入默认链。
- 不创造事实：`Confirmed` 必须有 source file + heading/line；缺来源只能是 `Missing`、`Not applicable` 或极少数 `Inferred`。
- `Inferred` 只允许表示 goal 指向的 `modules/*.md` 缺失；不要从源码或常识推断架构。
- 生成到 `.forge/architecture-views/<feature>/`；不写 `docs/**/architecture-view.html`，不为生成缓存写 Change Unit。
- 修改本 skill、脚本、模板、发布面或权威文档时才写 Change Unit。

## 运行

```bash
node plugins/forge/skills/architecture-view/scripts/render-architecture-view.mjs \
  --feature <feature-slug> \
  --out .forge/architecture-views/<feature-slug>/index.html
```

调试 view model：

```bash
node plugins/forge/skills/architecture-view/scripts/render-architecture-view.mjs \
  --feature <feature-slug> \
  --format json
```

## 读取与输出

读取：feature `goal.md`、`modules/*.md`、可选 `deploy/plan.md`、可选 `docs/project.md`。结构说明见 `references/view-model.md`。

输出先展示 coverage matrix：`Present with source` / `Missing` / `Not applicable`。只有 confirmed sources 存在的项才进入具体视图；runtime/deployment 缺来源时保持空缺，不脑补。

## Review 检查

- 生成页是否声明 `derived-view` 与 `not-fact-source`。
- 每个 confirmed item 是否有 source ref。
- 是否只使用稳定 heading：`需要细节时`、`责任与不变量`、`数据模型`、`公共接口`、`接口合约`、`依赖关系`、`数据消费`、`页面结构`、`表清单`。
- 是否没有新增权威文档、Change Unit 或依赖。
