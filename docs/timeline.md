# Timeline — Forge 方法论进化记录

### 2026-05-31 — 深度思考能力探索（think skill）

- **触发**：用户希望将"高智力协作"提示词（Socratic/First Principles/Red Team/Epistemic Humility）与 Forge 工程协议融合，解决"AI 执行有余思考不足"和"深度思考留不住"两个痛点
- **核心洞察**：思考和记录被设计成两个分离的动作。Forge 记录决策结果但不记录推理过程；对话中的深度分析随 context window 蒸发
- **探索过程**：2 轮 brainstorm，评估 5 个方向（协议注入 / 独立 skill / 推理链文档 / 反馈回路 / 模型选择）
- **推荐方向**：独立 think skill + thinking/ 文档体系（方向 2+3），最小侵入，按需触发
- **改动**：
  - 新增 `skills/think/SKILL.md`：三模式方法论（L0 挑战 / L1 分析 / L2 攻击）
  - 新增 `skills/think/references/thinking-template.md`：thinking 文档模板
  - 注册到 `plugin.json`
  - 产出 `docs/idea-brief.md`（方向地图 + MVP + 假设清单）
- **验证计划**：2 周内试用 3 次，至少 1 次 thinking 产物被下游引用

---

### 2026-05-27 — 内化 AI 执行纪律

- **触发**：用户希望把通用 CLAUDE.md 行为提示词内化到 Forge，而不是只作为当前会话提示。
- **定位**：这不是新增阶段方法论，而是约束 AI 维护项目时的执行方式，防止未确认边界、过度抽象、顺手改无关文件和缺少验证闭环。
- **改动**：
  - 新增 `skills/shared/concepts/execution-discipline.md`，作为 shared Knowledge 层的执行纪律锚点。
  - AGENTS.md 新增「AI 执行纪律」，放在核心理念之后，约束 Forge 自身维护。
  - init 的 AGENTS 模板新增「AI 执行纪律」，让新项目继承压缩后的 clarify / minimize / scope / verify 约束。
  - validator 新增轻量锚点检查，保证 root、模板和 shared concept 不漂移。
- **验证目标**：`node scripts/validate.mjs` + `node --test`。

---

### 2026-05-25 — 新增 forge-research skill（算法猎手）

- **触发**：用户表达"想做壁虎但不知道涉及哪些算法"——Forge 在产品愿景和技术决策之间缺少桥梁
- **核心洞察**：人类擅长定义产品愿景（做什么），不擅长识别技术可能性（怎么做）。research 补这个缺口
- **位置修正**：初版放在 ⓪.5（brainstorm 之后），但此时技术子问题尚未浮出。改为 ①.5（define 之后），因为 PRD 用户故事中隐含技术信号（"平滑爬墙"→脊柱算法），research 从 PRD 提取信号再搜索
- **改动**：
  - 新增 `skills/research/SKILL.md`：四阶段方法论（拆解→上下文→搜索→菜单）
  - 新增 `skills/research/references/research-brief-template.md`：子问题地图 + 算法菜单 + 组合建议
  - AGENTS.md 阶段表新增 research 行（19 个领域 Skill）
  - AGENTS.md 产物传递图新增"算法菜单"环节
  - AGENTS.md 自然语言执行表新增"做一只壁虎"示例
- **与上下游的切法**：brainstorm 发散产品层面"做什么"，research 发散算法层面"怎么做的选项"，technical-design 收敛"选哪个组合"
- **关键设计**：必须 web search（训练数据可能过时）、算法卡片用人话不堆术语、探索性组合诚实标注

---

### 2026-05-25 — 方法论进化：膨胀控制从硬约束改为分级策略

- **触发**：demo11 全量审计发现 PRD(346行)/plan(355行)/interaction-spec(246行) 超限，但这些文件天然需要整体加载，拆开会丢失全局视野
- **调研依据**：
  - Stanford "Lost in the Middle"：LLM 对上下文中间段信息召回最差（U 形曲线）
  - Amazon Science：即使检索完美，30K tokens 以下性能就开始退化
  - LangChain：coding agent 保留最近 5 个文件 + 压缩历史
  - 200 行 ≈ 2,000 tokens，5 文件 × 200 行 + 系统提示 ≈ 20K tokens（安全线内）
- **改动**：AGENTS.md 膨胀控制段落重写
  - 按需加载文件（contract/modules/project.md）：≤ 200 行（不变）
  - 整体加载文件（PRD/plan/interaction-spec）：无硬约束，超 400 行检查
  - 追加型文件（timeline/changelog）：≤ 100 行，超出归档
  - 总预算：一次任务加载 < 30K tokens（≈ 3,000 行）
- **消除重复**：历史记录段落的压缩规则表指向膨胀控制段落

---

### 2026-05-25 — 方法论进化：测试 skill 产物格式强化 + 文件拆分策略

- **触发**：demo11 testing 产物审计（testing/contract.md + testing/test-cases.md），发现 6 个结构性缺陷
- **偏差归因**：
  - T1-T5 决策点格式不统一（T2/T3/T4 缺 `被拒` 段落，因 skill 只在 `**记录**` 行提及，无显式子结构）
  - test-cases.md 无行数约束 → 550 行远超 200 行上限
  - 测试范围矩阵以"模块"为维度（template 引导不足）
  - AC 编号无全局规范（per-module 重启 vs feature-level 全局）
  - test-strategy 覆盖矩阵 vs test-cases 测试用例无交叉验证（TopBar 缺口）
  - feature contract.md 缺领域索引（纯前端路径跳过领域聚合）

- **影响范围**：5 个 skill 文件 + 1 个模板 + demo11 产物

- **执行的修改**：

| # | 改进项 | 影响 Skill/模板 | 类型 |
|---|--------|----------------|------|
| 1 | T1-T5 产出格式统一（表格 + 被拒子标题） | forge-test-strategy | 决策点格式 |
| 2 | 行数约束 ≤ 200 行 + 拆分策略 | forge-test-cases + test-cases-template | 膨胀控制 |
| 3 | AC 编号规范（feature-level 全局） | forge-test-cases | 追溯链 |
| 4 | 覆盖矩阵 vs 测试用例交叉验证 | forge-test + forge-test-cases | 出口条件 |
| 5 | 领域索引段落 | shared/contract-template | 模板新增 |
| 6 | 编排层 Phase 3 交叉验证步骤 | forge-test | 流程新增 |

- **验证结果**：demo11 testing 产物修复后全量通过（行数 ≤ 200、T1-T5 被拒完整、矩阵 AC 维度、领域索引存在、覆盖缺口消除）

---

## 归档

- 2026-05-25 更早的方法论进化详见 `docs/timeline/2026.md`。
