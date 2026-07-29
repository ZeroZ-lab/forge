---
name: research
description: Optional evidence-backed research for explicit investigation or material technical uncertainty.
when_to_use: Use when the user asks for research or current/stale facts, unfamiliar algorithms, security, optimization, search, media, or simulation uncertainty blocks a defensible decision.
---

# Research — 技术探索

## 职责

把 PRD 中的技术不确定性拆成子问题，搜索当前资料，给出算法/方案菜单、风险和验证计划。research 不替人类拍板，不写实现。

## 执行纪律

- D6：区分已验证、可验证、探索性组合。
- D7：必须 web search 获取最新信息；无网络时标注可能过时。
- D3：方案选择给菜单和代价，等人类决策。

## 触发信号

技术信号词包括：实时/协作、搜索/排序/推荐、动画/物理、路径/优化、加密/权限、图片/音频/视频、模型/算法选择、依赖版本可能过时。这些信号提高 research 的边际价值；Chain Owner 仍可根据已有权威事实、风险和时效性决定直接行动或调用本能力。

运行时先输出非 JSON 证据行：`技术信号词: ...; algorithm menu before selection; research_recommendation pending.`。若给出研究建议，决策 ID 使用 `research_recommendation`，并在 Change Unit 的 Decisions 段和进度证据中原样出现。Feature 路径沿用 define 的主能力 slug，例如实时搜索和推荐排序写入 `docs/features/realtime-search/research-brief.md`。

## 方法论：四阶段

### 第一阶段：问题拆解（Decompose）

从 PRD/goal 提取技术信号，拆成 SP1-SPn；每个子问题有输入、输出、约束和成功指标。

### 第二阶段：上下文注入（Context）

读取 project 技术栈、团队经验、运行环境、数据量、延迟/成本/合规约束；缺失时标注假设。

### 第三阶段：算法搜索（Search）

按子问题查官方文档、论文、成熟库、生产案例。记录新旧程度、维护状态、复杂度和失败边界。

### 第四阶段：菜单呈现（Menu）

每个子问题给 2-4 个选项，标注推荐、拒绝方案、风险、验证计划和原型优先级。

## 决策点

### R1: 子问题拆解

确认问题是否拆对；若其实是 CRUD，建议跳过 research。

### R2: 算法搜索（每个子问题重复）

比较成熟度、维护成本、性能、数据需求、生态和团队经验。

### R3: 组合建议

组合必须说明兼容性和未验证部分；探索性组合不能包装成最佳实践。

### R4: 可行性评估

最高风险子问题优先 POC；记录如何验证、停止条件和替代路线。

## 文档约束

默认在对话中给出 SP 分解、算法卡片、组合建议、风险评估、验证计划和被拒方案。用户接受的约束写入 `project.md`、feature `goal.md` 或 ADR。

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md`。只有研究证据有独立复核、交接或长期复用责任时，才用 `${CLAUDE_SKILL_DIR}/references/research-brief-template.md` 创建 `research-brief.md`。

仅当出现**标准件密集信号**（前端框架 / SDK / ORM / 认证服务 / 部署平台等成熟生态领域）时，可选输出 buy-vs-build 矩阵（能力 / 候选标准件 / 选择理由 / 不适用场景 / 是否自研），见 `${CLAUDE_SKILL_DIR}/references/buy-vs-build-matrix-template.md`。后端核心服务、算法/模型、基础设施等生态稀薄场景不强求填表——走默认算法菜单，不套本矩阵。矩阵默认对话输出，接受的选型写回 `project.md` 或 ADR，不落 durable 文件。

## 入口/出口条件

入口：PRD/goal 有技术信号或用户显式要求研究。出口：用户能基于菜单做决策，并知道哪些约束应写回权威事实、哪些 POC 值得执行；不自动触发 detail。

## 何时不使用

纯 CRUD、已有明确技术方案且团队做过类似项目、用户只要代码 patch。

## 红旗清单

- 不搜索最新信息。
- 只给一个方案。
- 未验证组合说成生产成熟。
- 只列库名不列取舍。
- 不给 POC/验证计划。

## 验证清单

- [ ] 每个技术信号是否拆成子问题？
- [ ] 是否有最新来源和成熟度判断？
- [ ] 是否列出 2-4 个选项及被拒方案？
- [ ] 是否有风险评估 + 验证计划？
- [ ] 是否明确人类决策点？

## 历史维护（自动）

遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`。实现依赖 research 结论前必须将其写成权威目标约束或明确拒绝；未形成持久变更时不写历史。
