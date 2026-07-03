---
name: improve
description: Scan source code for shallow-module refactor (deepening) opportunities and render a self-contained HTML candidate report with before/after visuals; hand off the chosen candidate to $think for design-tree grilling. Use only on explicit request for an architecture deepening review — not for derived doc views ($architecture-view), not for implementation ($codegen), not for architecture decisions→ADR ($technical-design), not for ordinary bugfix seams ($codegen bugfix-protocol).
disable-model-invocation: true
---

# Improve — 架构加深机会发现

Refs: references/module-depth.md, references/html-report-format.md, ../shared/concepts/artifact-policy.md, ../shared/concepts/history-maintenance.md.

## 职责

扫描**源码**找浅模块（shallow module）重构机会——把浅模块加深（deepen）成深模块——出自包含 HTML 候选报告（before/after 内联 SVG）。报告是 cache，不是事实源。用户选定候选后交接 `$think` 走设计树；接受的 deepening 回写由后续 `codegen`/`learn`/`technical-design` 完成。本 skill 不做 grilling、不回写权威文档。

与 `architecture-view` 是平行不重叠的兄弟：view 从权威文档**派生**视图，improve 从**源码**找改进。

## 硬门

1. 显式调用 only；不进入默认链（`disable-model-invocation: true` + `allow_implicit_invocation: false`）。
2. 扫源码不扫文档：每个候选必须有 `{file, line, symbol}` 证据；无代码位置的"感觉"不进报告（D9 运行实证 + evidence-policy）。
3. 报告是 cache 不是事实源：写入 `.forge/improve/<scope>/index.html`；不写 `docs/**`；不为生成缓存写 CU。
4. 不创造架构事实：候选是 refactor 建议，不是架构事实；接受结论在后续 `think`/`codegen`/`learn`/`technical-design` 阶段回写 module/goal/project/ADR，不在本 skill 内回写。
5. 不重新争论 ADR：先读 `docs/adr/`；候选与 ADR 冲突时只在卡片标注「与 ADR-NNNN 冲突，建议重开因为…」，不静默推翻。
6. CU 只在修改本 skill/references 时写。

## 流程

1. **Orient**：读 `docs/project.md` 领域语言 + `docs/adr/` + 相关 `goal.md`/`modules/*.md`。用领域词命名候选（「Order intake 模块」），不造 `FooBarHandler`。
2. **Explore**：用 `Agent(subagent_type=Explore)` 有机走查源码，记摩擦点：
   - 理解一个概念要在多个小模块间跳来跳去；
   - 浅模块：接口几乎和实现一样复杂；
   - 纯函数为测试抽取，但 bug 藏在调用处（无 locality）；
   - 耦合跨 seam 泄漏；
   - 不可测或难通过当前接口测的部分。
   对每个疑点跑 **deletion test**（见 references/module-depth.md）：删掉它让复杂度**集中**（信号）还是只是**搬移**（不是）。
3. **Present**：按 references/html-report-format.md 写自包含 HTML 到 `.forge/improve/<scope>/index.html`，`open` 它。每张候选卡：Files / Problem / Solution / Benefits（用 locality & leverage 表达）/ Before-After 内联 SVG / 强度徽章（Strong / Worth exploring / Speculative）/ ADR 冲突标注。结尾 Top recommendation。**不提接口设计**。
4. **Pick**：用 `AskUserQuestion` 问用户选哪个候选深入（2-4 选项，Recommended 标记；遵循 decision-presentation）。
5. **Handoff**：推荐 `$think` 深入选定候选，grilling agenda（约束 / 依赖 / 加深后模块形状 / seam 后面放什么 / 哪些测试存活）见 references/module-depth.md。接受的 deepening 回写由后续 `think`/`codegen`/`learn`/`technical-design` 完成。

## 文档约束

遵循 `../shared/concepts/artifact-policy.md`。

- 写：`.forge/improve/<scope>/index.html`（cache）+ 对话。
- 不写：`CONTEXT.md`、`refactor-plan.md`、`trace-*.md`、候选独立文档、`docs/**` 架构事实。

`<scope>` = feature slug（feature 范围扫描）或 `repo-<timestamp>`（跨 feature 扫描），由 AI 按扫描范围决定。

## 红旗/出口

- 候选无 `{file, line, symbol}` → 拒收。
- 候选与 ADR 冲突但未标注 → 拒收。
- 用户未选就提接口设计 → 越界，回到呈现。
- 把候选当架构事实写进 `docs/` → 越界。
- 扫描沦为逐文件流水账 → 停，重新聚焦摩擦点。

## Review 检查

- 每个候选是否有 `{file, line, symbol}` 证据。
- 报告是否声明 `derived-view` / `not-fact-source`。
- 是否用 `docs/project.md` 领域词命名候选。
- 是否未新增权威文档、CU 或依赖。
- 候选与 ADR 冲突是否标注。
- 是否未提接口设计（接口留给 handoff 后的 think/codegen）。

## 历史维护

遵循 `../shared/concepts/history-maintenance.md`。生成缓存不写 CU；修改本 skill、references 才写 CU。
