# Forge Skill 套件修复方案

> 基于 23 个 SKILL.md 逐文件精读 + SKILL.md frontmatter 信号路由分析
> 评审日期：2026-05-30

---

## 修复原则

1. **D4 最小变更**：每个修复只加必须加的内容，不重构已有结构
2. **保持 flat list**：不新增 Skill，不合并 Skill，只修补现有文件
3. **信号统一**：所有信号名称以 SKILL.md frontmatter 为准，SKILL.md 引用不自由命名
4. **编排器 vs 领域分离**：编排器不做 domain work，领域 Skill 不做编排

---

## 依赖分析与并行执行计划

### 结论：全部 24 个修复项互相独立

每个修复只改自己的 SKILL.md（或 SKILL.md frontmatter），无跨文件写入冲突。信号名称对齐（S1）在 Skill 层面只是替换文本，不需要等 frontmatter 先改。

```
┌─────────────────────────────────────────────────────────────┐
│  所有修复均为独立文件编辑，可完全并行执行                       │
│                                                             │
│  Agent A: init + design + test + detail       (4 files)     │
│  Agent B: brainstorm + business-alignment                   │
│         + define + research + fe-system       (5 files)     │
│  Agent C: interaction-design + technical-design             │
│         + api-design + db-design + frontend-design (5 files)│
│  Agent D: plan + codegen + test-strategy                    │
│         + test-cases                          (4 files)     │
│  Agent E: fe-artifact + fe-accept + review                  │
│         + deploy + learn                      (5 files)     │
│  Agent F: SKILL.md frontmatter                 (1 file)      │
│                                                             │
│  总计: 23 SKILL.md + 1 SKILL.md frontmatter = 24 files            │
│  并行度: 6 agents                                          │
└─────────────────────────────────────────────────────────────┘
```

### 无依赖的原因

| 修复类型 | 涉及文件 | 为何独立 |
|---------|---------|---------|
| 编排器补骨架 (P1) | init/design/test/detail 各 SKILL.md | 每个只追加内容到自己的文件 |
| 红旗格式修复 | fe-system/fe-artifact/fe-accept/review 各 SKILL.md | 替换自己文件中的红旗节 |
| 补充 when_not_to_use | 11 个 SKILL.md | 各自追加，无共享位置 |
| 信号名称对齐 | 10 个 SKILL.md | 各自替换文本，词汇表已在 S1 中定义 |
| S1 信号词汇表 | SKILL.md frontmatter | 新增节，不改已有内容 |
| S2 产物拆分 | SKILL.md frontmatter | 修改 produces 字段，与 S1 不冲突 |

### 执行顺序

**全部并行**：6 个 Agent 同时启动，无等待依赖。

---

## 套件级修复（改一处修一片）

### S1: 统一信号词汇表

**问题**：每个 Skill 的「运行时信号」节自由命名信号名称，导致 14 条路由中 6 条目标 Skill 不接收、14 个 signals_in 无人送达。

**修复位置**：`SKILL.md` frontmatter + 所有 SKILL.md 的「运行时信号」节

**修复方法**：
1. 在 SKILL.md frontmatter 顶部新增 `signal_vocabulary` 节，集中定义所有信号名称
2. 每个 Skill 的「运行时信号」节改为引用词汇表 ID，不再自由命名
3. 信号名称统一为 `{source_skill}.{artifact_name}` 格式

**信号词汇表草案**：

```yaml
signal_vocabulary:
  # 定义阶段
  - id: brainstorm.idea_brief
    name: idea brief
    produced_by: forge-brainstorm
    consumed_by: [forge-business-alignment]
  - id: business_alignment.go_decision
    name: go decision
    produced_by: forge-business-alignment
    consumed_by: [forge-define, forge-technical-design]
  - id: define.prd
    name: PRD
    produced_by: forge-define
    consumed_by: [forge-research, forge-interaction-design, forge-detail]
  - id: define.acceptance_criteria
    name: acceptance criteria
    produced_by: forge-define
    consumed_by: [forge-test-cases, forge-plan]

  # 研究阶段
  - id: research.algorithm_menu
    name: algorithm menu
    produced_by: forge-research
    consumed_by: [forge-technical-design]

  # 设计阶段
  - id: interaction_design.interaction_spec
    name: interaction spec
    produced_by: forge-interaction-design
    consumed_by: [forge-fe-system, forge-frontend-design, forge-detail]
  - id: fe_system.design_tokens
    name: design tokens
    produced_by: forge-fe-system
    consumed_by: [forge-frontend-design, forge-fe-artifact, forge-fe-accept]
  - id: technical_design.architecture_decisions
    name: architecture decisions
    produced_by: forge-technical-design
    consumed_by: [forge-detail]

  # 详设阶段
  - id: api_design.api_goal
    name: API goal
    produced_by: forge-api-design
    consumed_by: [forge-db-design, forge-frontend-design, forge-plan]
  - id: api_design.shared_data_model
    name: shared data model
    produced_by: forge-api-design
    consumed_by: [forge-db-design]
  - id: db_design.database_goal
    name: database goal
    produced_by: forge-db-design
    consumed_by: [forge-plan]
  - id: frontend_design.frontend_goal
    name: frontend goal
    produced_by: forge-frontend-design
    consumed_by: [forge-plan]
  - id: detail.feature_contract
    name: feature contract
    produced_by: forge-detail
    consumed_by: [forge-plan, forge-codegen]

  # 任务阶段
  - id: plan.task_sequence
    name: task sequence
    produced_by: forge-plan
    consumed_by: [forge-codegen]

  # 构建阶段
  - id: codegen.generated_code
    name: generated code
    produced_by: forge-codegen
    consumed_by: [forge-review, forge-fe-accept]
  - id: codegen.deviation_summary
    name: deviation summary
    produced_by: forge-codegen
    consumed_by: [forge-detail]
  - id: codegen.repeat_signal
    name: repeated goal-not-met
    produced_by: forge-codegen
    consumed_by: [forge-detail]

  # 测试阶段
  - id: test_strategy.test_strategy
    name: test strategy
    produced_by: forge-test-strategy
    consumed_by: [forge-test-cases]
  - id: test_cases.test_case_goal
    name: test case goal
    produced_by: forge-test-cases
    consumed_by: [forge-codegen]

  # 审查阶段
  - id: review.deviation_attribution
    name: deviation attribution
    produced_by: forge-review
    consumed_by: [forge-learn, forge-detail]

  # 交付阶段
  - id: deploy.release_plan
    name: release plan
    produced_by: forge-deploy
    consumed_by: []  # 终端输出

  # 进化阶段
  - id: learn.methodology_proposal
    name: methodology change proposal
    produced_by: forge-learn
    consumed_by: []  # 人类确认后执行
```

每个 SKILL.md 的「运行时信号」节改为：

```markdown
## 运行时信号
- 输入：引用 `signal_vocabulary` 的 {id}
- 输出：引用 `signal_vocabulary` 的 {id}
- 路由：详见 `SKILL.md` frontmatter
- 升级：{具体条件}
```

---

### S2: 消除产物所有权冲突

**问题**：7 个产物有多个 Skill 声称拥有（`testing/test-cases.md` 有 3 个生产者）。

**修复位置**：`SKILL.md` frontmatter 的 `produces` 字段

**修复方法**：
- 引入 `own_produces`（自己生成的）vs `orchestrated_produces`（编排子 Skill 生成的）
- 只有 `own_produces` 计入所有权

```yaml
# 修复前
forge-detail:
  produces: ["feature contract.md", "api/contract.md", "database/contract.md", "frontend/contract.md"]

# 修复后
forge-detail:
  own_produces: ["feature contract.md"]  # Phase 0 自己写的
  orchestrated_produces: ["api/contract.md", "database/contract.md", "frontend/contract.md"]
```

**具体修复**：

| Skill | own_produces | orchestrated_produces |
|-------|-------------|----------------------|
| forge-init | (none — 纯编排) | project.md, DESIGN.md, AGENTS.md, CLAUDE.md |
| forge-design | (none — 纯编排) | interaction-spec.md, DESIGN.md updates |
| forge-detail | feature/contract.md (Phase 0) | api/contract.md, database/contract.md, frontend/contract.md |
| forge-test | (none — 纯编排) | testing/contract.md, testing/test-cases.md |
| forge-plan | plan.md | ~~testing/test-cases.md~~（移除，见 P5） |

---

### S3: 输入缺失处理策略统一模板

**问题**：23 个 Skill 中几乎都没有定义"上游输入缺失时怎么处理"。

**修复位置**：每个 SKILL.md 的「入口/出口条件」节

**统一模板**：在「入口」后追加「缺失处理」子节：

```markdown
**缺失处理**：
- 缺 {上游产物} → {降级策略：回退/简化/中止}
- 上游产物不完整 → {部分处理策略}
- 用户要求跳过上游直接执行 → {条件 + 风险标注}
```

---

### S4: 编排器统一骨架标准

**问题**：4 个编排器（init/design/detail/test）的 SKILL.md 结构差异大，2 个缺红旗+验证清单。

**修复**：为编排器定义统一必须节：

```markdown
## 编排器必须节（4 个编排器都必须包含）
1. 运行时角色（已有）
2. 输入状态读取（已有）
3. 分支与恢复（已有）
4. 流程（已有）
5. 产出（已有）
6. **红旗清单** ← init/test/design 缺失
7. **验证清单** ← init/test/design 缺失
8. **何时不使用** ← init/test/design 缺失
9. **入口/出口条件** ← test/design 缺失
10. 运行时信号（已有）
```

---

## 逐 Skill 修复方案

---

### 1. brainstorm (143 行) — 当前 9/10

**状态**：优秀，仅需微调。

**修复 1：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 用户无痛点/无方向 → 降级为开放式探索（"你现在最想解决什么问题？"），不生成 idea-brief
- 用户已有完整方向 → 跳过 brainstorm，建议进入 init 或 define
- 用户只想聊不想产出 → 尊重节奏，但在对话结束时问"需要我把讨论整理成 idea-brief 吗？"
```

**修复 2：决策编号对齐**

在 `## 决策点` 顶部追加编号说明：

```markdown
> Brainstorm 使用 B# 前缀（Brainstorm Decision）。B# 记录在 idea-brief.md 中。
> 项目级共享决策使用 PD# 前缀。
```

**预计行数变化**：+8 行 → 151 行（安全）

---

### 2. business-alignment (155 行) — 当前 7.5/10

**状态**：合格，信号路由和验证清单需加强。

**修复 1：信号完整性——补充 Go/No-Go 路由**

在 `## 运行时信号` 的「路由」前追加：

```markdown
- Go 决策路由：→ define（进入需求定义）+ → technical-design（同步业务约束）
- No-Go 决策路由：→ 终止当前流程，记录理由到 timeline
```

**修复 2：验证清单补充轻量模式检查**

在 `## 验证清单` 末尾追加：

```markdown
- [ ] 轻量模式触发条件是否满足（团队 ≤ 2 人 / 无外部利益方 / 无交付时间线）？
- [ ] 轻量模式下产物是否仍包含核心四要素（简化版）？
```

**修复 3：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 无 idea-brief.md → 降级为 5 分钟快速探索（"用一句话描述你想做什么？为谁做？"），不强制回退 brainstorm
- idea-brief.md 缺推荐方向 → 要求用户从方向列表中选择一个再继续
```

**预计行数变化**：+10 行 → 165 行（安全）

---

### 3. define (154 行) — 当前 8/10

**状态**：良好，信号路由分散是主要问题。

**修复 1：信号完整性——技术信号词路由内联**

将 `## 完成提示` 中的技术信号词扫描逻辑移一份到 `## 运行时信号`：

```markdown
- 路由：
  - PRD 无技术信号词 → 建议进入 design 或 detail
  - PRD 含技术信号词（实时/同步/协作/搜索/推荐/动画/物理/仿真/路径/调度/加密/音频/视频/流式/ASR/TTS）→ 建议进入 research
```

**修复 2：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- project.md「业务目标」不完整 → 补齐关键缺失字段（用户/指标），不重写已有内容
- 无 project.md → 要求先完成 init，或降级为无业务约束的需求定义（标注风险）
- 用户要求跳过需求直接做详设 → 执行最小 define（≤ 5 个用户故事 + 验收条件），标注"跳过完整需求定义"
```

**修复 3：AI 角色边界澄清**

修改「一致性检查者」行：

```markdown
| 验收 | 一致性检查者 | 检查验收条件是否覆盖所有场景；**发现不一致时列出差异等用户决策，不自行修正** |
```

**预计行数变化**：+12 行 → 166 行（安全）

---

### 4. research (154 行) — 当前 8/10

**状态**：良好，红旗和追溯需加强。

**修复 1：红旗补充子问题粒度约束**

在 `## 红旗清单` 末尾追加：

```markdown
- 子问题太粗（> 5 个技术挑战合一）→ 强制拆分（"渲染、动画、交互、性能分开看"）
- 子问题太细（< 2 个算法可选）→ 合并到相邻子问题
```

**修复 2：决策追溯补充被拒理由**

修改 R2-R4 的「记录」字段，追加被拒要求：

```markdown
### R2: 算法搜索（每个子问题重复）
**记录**：算法卡片（名称 + 一句话 + 上下文评估 + 复杂度 + 成熟度 + 参考链接）+ **每个子问题被拒算法 + 理由**
```

**修复 3：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- PRD 不含技术信号词但用户仍要求 research → 执行，但标注"非标准触发，可能算法选择空间有限"
- project.md 无技术选型 → 跳过上下文注入阶段，标注"脱离上下文的算法推荐需人工验证"
```

**预计行数变化**：+10 行 → 164 行（安全）

---

### 5. init (142 行) — 当前 6/10

**状态**：编排逻辑好但骨架不完整，缺 5 个标准节。

**修复 1：补充「何时不使用」**

在 `## 跳过规则` 后新增：

```markdown
## 何时不使用
- 已有完整的 project.md + DESIGN.md + AGENTS.md + CLAUDE.md（无需初始化）
- 只想做技术选型（直接使用 technical-design skill）
- 只想做设计系统（直接使用 fe-system skill）
- 已有项目，只想加新功能（使用 define 或 detail）
```

**修复 2：补充「红旗清单」**

在「分支与恢复」后新增：

```markdown
## 红旗清单
- 已有文件与新决策冲突 → 停止覆盖，输出冲突项等用户决策（不自动合并）
- 无法判断是否有前端 → 暂停询问（不默认生成前端设计系统）
- 用户跳过某 phase → 记录跳过原因 + 标注下游可能缺失的输入
- 三个 phase 全跳过 → 确认是否真的需要 init，还是只需要补某个文件
- 生成 AGENTS.md 超过 100 行 → 强制精简（project.md 是源头，AGENTS.md 是实现）
```

**修复 3：补充「验证清单」**

在「运行时信号」前新增：

```markdown
## 验证清单
- [ ] project.md 是否包含业务目标（用户/指标/约束）+ 技术决策（架构/选型/部署）？
- [ ] DESIGN.md 是否包含三层 Token（primitive/semantic/component）？
- [ ] AGENTS.md 是否从 project.md + DESIGN.md 实现（不含独立决策）？
- [ ] CLAUDE.md 是否 < 20 行且指向 AGENTS.md？
- [ ] 四个文件之间是否无矛盾（技术选型与项目类型匹配、设计系统与产品气质匹配）？
- [ ] Feature 索引是否为空表（不预填）？
```

**修复 4：补充「入口/出口条件」**

在「运行时信号」前新增：

```markdown
## 入口/出口条件
**入口**：用户明确要初始化项目 · 或已有部分项目文件需要补齐
**出口**：project.md + DESIGN.md + AGENTS.md + CLAUDE.md 已生成/更新 · 用户确认进入 define 阶段
```

**修复 5：补充「方法论」**

在「流程」前新增简要方法论：

```markdown
## 方法论
init 是编排器，不做独立决策。方法论 = 读状态 → 判断跳过 → 加载子 skill → 实现生成。
每个子 skill 有自己的方法论（business-alignment 的承诺四要素、technical-design 的约束→选项→权衡→验证、fe-system 的三层 Token）。
init 的方法论是：**不替代子 skill 做决策，只负责状态判断和实现组装**。
```

**预计行数变化**：+35 行 → 177 行（安全）

---

### 6. design (77 行) — 当前 5/10

**状态**：骨架不完整，缺红旗+清单+when_not_to_use+出入口。

**修复 1：补充「何时不使用」**

在「跳过规则」后新增：

```markdown
## 何时不使用
- 纯后端 API（无交互和视觉设计需求）
- 已有完整的 interaction-spec.md + DESIGN.md
- 用户只想做交互设计（直接使用 interaction-design）
- 用户只想做设计系统（直接使用 fe-system）
```

**修复 2：补充「红旗清单」**

新增：

```markdown
## 红旗清单
- 用户不确认视觉方向 → 停止生成 DESIGN.md，保留 2-3 个方向和代价
- 交互和视觉职责混淆 → 按"行为归 interaction，外观归 fe-system"拆分
- PRD 缺失或过于模糊 → 不开始设计，先要求补需求
- 用户跳过交互直接要视觉 → 警告风险（"没有交互规格的视觉设计可能和流程脱节"）
- 纯后端项目进入 design → 自动跳过，记录跳过原因
```

**修复 3：补充「验证清单」**

新增：

```markdown
## 验证清单
- [ ] interaction-spec.md 是否已生成/更新？
- [ ] DESIGN.md 是否已更新 feature 相关部分？
- [ ] 交互和视觉是否有职责重叠？
- [ ] 两个子 skill 的产出是否一致（interaction-spec 引用的组件在 DESIGN.md 中有对应 Token）？
- [ ] 用户是否确认关键视觉方向？
```

**修复 4：补充「入口/出口条件」**

新增：

```markdown
## 入口/出口条件
**入口**：有 PRD.md 或等价需求说明 · 项目需要交互和/或视觉设计
**出口**：interaction-spec.md + DESIGN.md 已生成/更新 · 用户确认进入 detail 阶段

**缺失处理**：
- 无 PRD → 不开始设计，先要求补需求
- 已有 interaction-spec → Phase 1 只检查对齐，不重复设计
- 已有 DESIGN.md → Phase 2 只处理 feature 增量
```

**预计行数变化**：+30 行 → 107 行（安全）

---

### 7. interaction-design (143 行) — 当前 8/10

**状态**：良好，仅需微调。

**修复 1：决策编号对齐**

在 `## 决策点` 顶部追加编号说明：

```markdown
> 交互设计使用 I# 前缀（Interaction Decision）。I# 记录在 interaction-spec.md 中。
```

**修复 2：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- PRD 缺失 → 要求用户至少描述核心用户路径，不凭空设计交互
- PRD 缺验收条件 → 从用户故事中推导最小验收条件，标注为"AI 推导，待用户确认"
```

**修复 3：红旗补充交叉验证**

在 `## 红旗清单` 末尾追加：

```markdown
- interaction-spec 引用的组件在 DESIGN.md 中无对应 Token → 标记（等 fe-system 补齐）
```

**预计行数变化**：+8 行 → 151 行（安全）

---

### 8. fe-system (118 行) — 当前 7/10

**状态**：方法论好但红旗格式不对，缺 when_not_to_use。

**修复 1：红旗改为条件→动作格式**

替换现有 `## 红旗` 全部内容：

```markdown
## 红旗清单
- 只给颜色不给语义 Token → 强制补充（"primary 用在哪些组件上？"）
- 只有审美词没有组件和状态规则 → 强制补充（"hover/focus/disabled/error/empty 怎么表达？"）
- 把组件库名称当成设计系统 → 纠正（"Tailwind ≠ 设计系统，设计系统是 WHY + Token"）
- 未区分工具型界面和营销型界面 → 强制区分（"这是工具还是内容？密度和留白不同"）
- 未覆盖交互状态 → 强制补充（"hover/focus/disabled/loading/error/empty 都设计了吗？"）
- 未验证移动端和可访问性 → 强制验证（"移动端布局？对比度？"）
```

**修复 2：补充「何时不使用」**

新增：

```markdown
## 何时不使用
- 纯后端 API（无前端界面）
- 已有完整的 DESIGN.md 且不需要更新
- 使用现成 UI 框架不做定制（直接用框架默认样式）
- 原型验证阶段（不需要设计系统）
```

**修复 3：决策点补充记录格式**

修改 S1-S5 节，为每个决策点追加记录要求：

```markdown
- **S1 色彩系统**：主色、辅助色、语义色、背景层级、对比度。
  **记录**：色彩选择 + 理由 + 被拒方案
- **S2 字体系统**：字体族、字号层级、行高、字重。
  **记录**：字体选择 + 理由 + 被拒方案
- **S3 间距系统**：基准网格、容器宽度、section 节奏、组件内距。
  **记录**：间距选择 + 理由 + 被拒方案
- **S4 页面结构**：导航、内容区、侧栏、工具栏、表格或卡片密度。
  **记录**：结构选择 + 理由 + 被拒方案
- **S5 组件模式**：按钮、输入、选择、表格、弹窗、状态反馈。
  **记录**：组件选择 + 理由 + 被拒方案
```

**预计行数变化**：+20 行 → 138 行（安全）

---

### 9. technical-design (200 行) — 当前 8/10

**状态**：良好，但已到 200 行上限，只能做替换不能追加。

**修复 1：决策点引入编号**

在 `## 决策点` 顶部追加（替换现有标题前缀）：

```markdown
> 技术设计使用 TD# 前缀（Technical Design Decision）。TD# 记录在 project.md「技术决策」中。
> 项目级共享决策使用 PD# 前缀。
```

**修复 2：输入缺失处理（精简版）**

在 `## 入口/出口条件` 的「入口」后追加一行：

```markdown
**缺失处理**：缺业务目标 → 补齐用户/指标再选型；已有技术栈 → 跳过 TD1-TD2 做验证。
```

**预计行数变化**：+4 行 → 204 行（略超上限，需压缩其他节 4 行）

**压缩建议**：`## 引导技巧` 4 种技巧合并为 2 行（当前 4 行），节省 2 行。`## 历史维护` 压缩为 1 行格式，节省 2 行。

---

### 10. detail (156 行) — 当前 5.5/10

**状态**：编排器有身份分裂 + 缺红旗 + 缺 when_not_to_use。

**修复 1：补充「何时不使用」**

在「加载判断」前新增：

```markdown
## 何时不使用
- 只有一个模块的简单功能（直接使用 api-design 或 frontend-design）
- 已有完整的 contract.md + modules/（无需重新详设）
- 用户只想改一个端点（L1 patch，直接用 api-design）
```

**修复 2：补充「红旗清单」**

新增：

```markdown
## 红旗清单
- 前端存在性不确定 → 暂停询问（不默认加载 frontend-design）
- PRD 缺失 → 不直接写 contract，先要求补需求或明确走最小 detail
- 由同类 L1 偏差触发 → 先复查 contract 盲区，再决定是否改代码
- L2 goal 偏移 → 中止详设，列出矛盾点等用户决策
- feature/contract.md 的 FD# 与 project.md 的 PD# 编号冲突 → 重新分配编号
- 下游偏移影响范围不清 → 不自动级联修改，先输出偏移报告
```

**修复 3：Phase 0 职责显式声明**

在 `## 运行时角色` 后追加一段：

```markdown
**Phase 0 例外**：`detail` 的 Phase 0（Feature 骨架创建）是编排器自己的 domain work——它创建 feature/contract.md 作为跨领域共享骨架。这不是子 skill 的职责，因为没有单独的 skill 负责 feature 级共享决策。Phase 4（索引同步 + Module 结构校验）同理。
```

**修复 4：补充「验证清单」**

在「出口条件」前新增（或合并到出口条件中）：

```markdown
## 验证清单
- [ ] feature/contract.md（FD#）是否包含共享决策 + 共享数据模型 + 共享约束？
- [ ] 所有加载的领域 skill 产出是否完整（API1-API7 / DB1-DB5 / FE1-FE5）？
- [ ] FD# 与 PD# / API# / DB# / FE# 是否无编号冲突？
- [ ] project.md Feature 索引是否已同步？
- [ ] 偏移检测是否已完成？
- [ ] 所有 modules/*.md 是否包含模板必需节？
```

**预计行数变化**：+25 行 → 181 行（安全）

---

### 11. api-design (149 行) — 当前 9/10

**状态**：优秀，仅需微调。

**修复 1：运行时信号内联路由条件**

替换 `## 运行时信号` 为：

```markdown
## 运行时信号
- 输入：`define.acceptance_criteria` + `technical_design.architecture_decisions`
- 输出：`api_design.api_goal` + `api_design.shared_data_model`
- 路由：
  - `api_design.api_goal` → forge-db-design（数据模型约束）+ forge-frontend-design（接口消费）
  - `api_design.shared_data_model` → forge-db-design（存储模型）
  - 资源模型无法确认 → 升级到用户决策
- 升级：资源模型无法确认 · 权限或幂等策略冲突
```

**修复 2：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- project.md 缺技术选型 → 要求先完成 technical-design，或在 API 设计中做最小选型标注
- PRD 缺验收条件 → 从用户故事推导，标注"AI 推导，待确认"
```

**预计行数变化**：+8 行 → 157 行（安全）

---

### 12. frontend-design (169 行) — 当前 8/10

**状态**：良好，仅需微调。

**修复 1：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 无 interaction-spec.md → 从 PRD 推导最小交互路径，标注"无交互规格，组件行为需用户确认"
- 无 DESIGN.md → 跳过 FE3 样式方案决策（使用框架默认样式），标注"无设计系统"
- api/contract.md 缺失 → 要求先完成 API 详设，或标注"接口待定义"
```

**修复 2：红旗补充模板验证交叉项**

在 `## 红旗清单` 末尾追加：

```markdown
- 模块索引中的页面/组件没有对应的 module 文件 → 强制补充或从索引移除
```

**预计行数变化**：+8 行 → 177 行（安全）

---

### 13. db-design (182 行) — 当前 8/10

**状态**：良好，仅需微调。

**修复 1：补充 module-template 引用**

在 `## 模板` 中追加：

```markdown
- `${CLAUDE_SKILL_DIR}/../shared/module-template.md` — 如有数据库领域模块文件
```

**修复 2：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- api/contract.md 缺失 → 要求先完成 API 详设（数据库设计从 API 资源模型推导，不从零开始）
- 共享数据模型不完整 → 从 PRD 推导最小模型，标注"待 API 详设确认"
```

**修复 3：信号名称对齐**

修改 `## 运行时信号`：

```markdown
- 输入：`api_design.shared_data_model`（原 "API data model"，与 api-design 的输出对齐）
```

**预计行数变化**：+6 行 → 188 行（安全）

---

### 14. plan (201 行) — 当前 8.5/10

**状态**：优秀但 P6 越界 + 已到 200 行上限。

**修复 1：P6 职责澄清**

修改 P6 节末尾（第 113 行附近）：

```markdown
**与 test-cases 的分工**：plan P6 只产出测试范围矩阵 + P0 用例骨架（≤ 30 行）。完整测试用例（正常/边界/错误/数据）由 test-cases skill 负责。如果用户需要完整测试用例，plan 的完成提示中推荐进入 test 阶段。
```

**修复 2：决策编号引入**

在 `## 决策点` 或 P1-P6 节顶部追加：

```markdown
> Plan 使用 PL# 前缀（Plan Decision）。PL# 记录在 plan.md 中。
> 仅用于关键规划决策（如任务拆分争议、风险优先级判断），不用于每个任务的步骤。
```

**修复 3：输入缺失处理（精简版）**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：contract.md 不完整 → 只切已有模块，标注"待补模块"；modules/ 为空 → 从 contract.md 推导最小切片。
```

**预计行数变化**：+8 行 → 209 行（超上限，需压缩 9 行）

**压缩建议**：`## 引导技巧` 5 种技巧合并为 3 行（当前 5 行），节省 2 行。`## 历史维护` 压缩格式，节省 3 行。`## 完成提示` 精简 deploy 注释，节省 4 行。

---

### 15. codegen (199 行) — 当前 8.5/10

**状态**：优秀但接近 200 行上限。

**修复 1：上游缺失 fallback**

在 `## 入口/出口条件` 的「入口」后追加精简版：

```markdown
**缺失处理**：缺 plan.md → 从 contract.md 推导最小任务序列（标注"无 plan，任务顺序为 AI 推导"）；缺 modules/ → 从 contract.md 推导，标注"模块文档缺失"。
```

**修复 2：信号名称对齐**

修改 `## 运行时信号`：

```markdown
- 输入：`detail.feature_contract` + `plan.task_sequence`
- 输出：`codegen.generated_code` + `codegen.deviation_summary` + `codegen.repeat_signal`
```

**预计行数变化**：+4 行 → 203 行（需压缩 3 行）

**压缩建议**：`## 完成提示` 中 deploy 项移到 test 的完成提示中（deploy 不应出现在 codegen 完成提示里），节省 2 行。

---

### 16. fe-artifact (113 行) — 当前 6/10

**状态**：核心方法在外部文件，自身缺 when_not_to_use + 验证清单。

**修复 1：补充「何时不使用」**

在 `## 上下游边界` 后新增：

```markdown
## 何时不使用
- 无前端合约（frontend/contract.md 不存在）
- 无 DESIGN.md（设计系统未建立）
- 纯后端 API（无前端代码需要生成）
- codegen 未处理前端任务时不单独调用
```

**修复 2：补充「验证清单」**

在 `## 红旗` 后新增：

```markdown
## 验证清单
- [ ] 是否读取了 DESIGN.md + frontend/contract.md + frontend/modules/*.md + api/modules/*.md？
- [ ] API 类型、错误和加载状态是否完整？
- [ ] 组件 props 是否与 module 文档一致？
- [ ] 视觉是否消费 DESIGN.md Token（不自行发明颜色/间距）？
- [ ] 所有交互状态是否覆盖（loading/error/empty/disabled/success）？
- [ ] 移动端和桌面端是否无重叠、无横向溢出？
- [ ] 关键逻辑是否引用文档来源（From: frontend/modules/xxx.md AC3）？
```

**修复 3：红旗改为条件→动作格式**

替换现有 `## 红旗` 全部内容：

```markdown
## 红旗清单
- 没读 DESIGN.md 就写样式 → 停止，先读 DESIGN.md 提取 Token
- 只写 happy path 没有 loading/error/empty → 强制补充所有状态
- 组件 props 和 module 文档不一致 → 以 module 文档为准，标注差异
- 页面结构和交互规格不一致 → 以 interaction-spec 为准
- 移动端文本溢出或控件重叠 → 强制修复响应式布局
- 视觉状态无法被 fe-accept 验收 → 补充证据（截图/预览链接）
```

**修复 4：内联核心方法论摘要**

在 `## 核心方法论` 的 `详细规则见 references/fe-artifact-protocol.md` 后追加：

```markdown
**最小执行规则**（不读 protocol 文件时仍需遵守）：
- 每个页面/组件必须消费 DESIGN.md Token，不自行发明视觉语言
- 每个组件必须有 loading/error/empty/disabled 状态
- 关键逻辑必须引用文档来源
```

**预计行数变化**：+30 行 → 143 行（安全）

---

### 17. test (85 行) — 当前 5/10

**状态**：最短的 Skill，骨架严重不完整。

**修复 1：补充「何时不使用」**

在「跳过规则」后新增：

```markdown
## 何时不使用
- 只有文档没有代码（不需要测试阶段）
- 已有完整的 testing/contract.md + testing/test-cases.md
- 用户只想做测试策略（直接使用 test-strategy）
- 用户只想做测试用例（直接使用 test-cases）
```

**修复 2：补充「红旗清单」**

新增：

```markdown
## 红旗清单
- 缺 contract/modules → 不生成测试策略，先回到 detail 补 goal
- 缺验收条件或验收条件不可测试 → 回到 define/detail，不凭空编测试
- 测试策略和测试用例冲突 → 暂停并列出冲突，不让 codegen 消费矛盾输入
- plan 已推导 test-cases.md → Phase 2 只补遗漏场景，不重复推导
- 两个子 skill 产出有重叠 → 以 test-strategy 的覆盖矩阵为准
```

**修复 3：补充「验证清单」**

新增：

```markdown
## 验证清单
- [ ] testing/contract.md（T1-T5）是否完整？
- [ ] testing/test-cases.md 是否覆盖所有验收条件？
- [ ] 测试策略的覆盖矩阵与测试用例的范围矩阵是否一致（交叉验证）？
- [ ] test-cases.md 是否 ≤ 200 行？超出是否按拆分策略处理？
- [ ] 用户是否确认进入代码生成？
```

**修复 4：补充「入口/出口条件」**

新增：

```markdown
## 入口/出口条件
**入口**：有 contract.md + modules/ + plan.md · 或用户明确要求补测试
**出口**：testing/contract.md + testing/test-cases.md 已生成 · 交叉验证通过 · 用户确认

**缺失处理**：
- 缺 contract/modules → 不开始，要求先补详设
- 已有 testing/contract.md → Phase 1 只更新缺口
- plan 已推导 test-cases.md → Phase 2 只补充遗漏场景
```

**修复 5：Phase 3 交叉验证职责澄清**

在 Phase 3 后追加注释：

```markdown
**职责说明**：Phase 3 交叉验证是编排器的质量门控——比对测试策略的覆盖矩阵和测试用例的范围矩阵，确保一致。这不是 test-strategy 或 test-cases 的职责，因为两者各自只对自己的产物负责。
```

**预计行数变化**：+40 行 → 125 行（安全）

---

### 18. test-strategy (200 行) — 当前 8/10

**状态**：良好但已到上限，只能替换不能追加。

**修复 1：输入缺失处理（精简版）**

在 `## 入口/出口条件` 的「入口」后追加一行：

```markdown
**缺失处理**：缺 plan.md → 从 contract.md 推导最小任务序列；缺 modules/ → 从 contract.md 推导覆盖矩阵。
```

**修复 2：信号名称对齐**

修改 `## 运行时信号`：

```markdown
- 输入：`define.acceptance_criteria` + `plan.task_sequence`（原 "business risk, test constraints"）
- 输出：`test_strategy.test_strategy`（原 "test strategy, quality gate"）
```

**预计行数变化**：+3 行 → 203 行（需压缩 3 行）

**压缩建议**：`## 历史维护` 压缩格式，节省 3 行。

---

### 19. test-cases (195 行) — 当前 7.5/10

**状态**：良好，追溯链好但决策追溯弱于 test-strategy。

**修复 1：决策追溯加强**

修改 TC1-TC5 每个步骤的「记录」字段，追加理由要求：

```markdown
### TC1: 映射（Map）
**记录**：测试范围矩阵（验收条件 → 测试用例 → 优先级）+ **优先级理由**（为什么这个 AC 是 P0？）
```

（TC2-TC5 类似，各追加一句理由要求）

**修复 2：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 验收条件未编号 → 先补充 AC 编号（AC1, AC2, ...），不凭空写测试
- contract.md 存在但 modules/ 为空 → 从 contract.md 推导，标注"模块文档缺失"
```

**修复 3：信号名称对齐**

修改 `## 运行时信号`：

```markdown
- 输入：`define.acceptance_criteria` + `test_strategy.test_strategy`
- 输出：`test_cases.test_case_goal`
```

**预计行数变化**：+8 行 → 203 行（需压缩 3 行）

**压缩建议**：`## 历史维护` 压缩格式。

---

### 20. fe-accept (101 行) — 当前 6.5/10

**状态**：四维验收好但红旗格式不对 + 缺 when_not_to_use。

**修复 1：补充「何时不使用」**

在 `## 上下游边界` 后新增：

```markdown
## 何时不使用
- 无前端实现（没有代码可验收）
- 无 DESIGN.md（没有设计标准可对照）
- 前端不可运行且用户只提供截图 → 可以做有限验收，标注"非真实验证"
```

**修复 2：红旗改为条件→动作格式**

替换现有 `## 红旗` 全部内容：

```markdown
## 红旗清单
- 只看截图不操作真实路径 → 强制启动预览做真实验证
- 只检查桌面不检查移动端 → 强制补充移动端验证
- 只检查 happy path 不检查失败状态 → 强制补充 loading/error/empty/disabled
- 视觉和 DESIGN.md 不一致却未记录 → 强制记录差异 + 标注是否需要修正
- 无法运行或无法预览却宣称通过 → 禁止通过，标注"未验证"
- 把 P0/P1 写成建议而不是阻塞问题 → 纠正（P0/P1 必须修复后才能发布）
```

**修复 3：内联核心验收维度摘要**

在 `## 核心方法论` 的 `详细维度和报告模板见 references/fe-accept-protocol.md` 后追加：

```markdown
**最小执行规则**（不读 protocol 文件时仍需遵守）：
- 四维都必须检查（功能/视觉/适应性/性能），不能只查功能
- 每个问题必须有证据（截图/日志/复现步骤）+ 影响 + 修复建议
- P0/P1 是阻塞问题，不是建议
```

**预计行数变化**：+20 行 → 121 行（安全）

---

### 21. review (134 行) — 当前 7.5/10

**状态**：三层归因好但缺 when_not_to_use + 审查维度委托外部文件。

**修复 1：补充「何时不使用」**

在 `## 上下游边界` 后新增：

```markdown
## 何时不使用
- 无可审查的文档或代码
- 用户只想做格式检查（用 linter 而不是 review）
- 同一轮修改后立即自审（需要独立上下文消除自审偏见）
```

**修复 2：红旗改为条件→动作格式**

现有红旗大部分已是条件→动作格式，只需微调：

```markdown
## 红旗清单
- 只做摘要不列问题 → 强制列出具体问题（证据+影响+修复建议）
- 只检查格式不检查跨文档一致性 → 强制检查 contract vs code
- 没读 changelog/timeline 就评价当前决策 → 先读历史再评价
- 测试通过但代码和合约不一致 → 标记为 P1（测试覆盖 ≠ 合约对齐）
- 文档缺 WHY 却直接允许 codegen → 阻塞，先补 WHY
- 发现问题后没有重新审查 → 修复后必须复审
- 发现偏差后没有归因 → 强制归因到三层之一（skill 方法论 / 文档未同步 / 代码实现）
```

**修复 3：输入缺失处理**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 文档不完整 → 做有限审查，标注"基于不完整文档，结论可能变化"
- 无 changelog/timeline → 标注"无历史上下文，可能误判决策"
```

**预计行数变化**：+15 行 → 149 行（安全）

---

### 22. deploy (181 行) — 当前 9/10

**状态**：优秀，仅需微调。

**修复 1：上游缺失 fallback**

在 `## 入口/出口条件` 的「入口」后追加：

```markdown
**缺失处理**：
- 缺 src/ + tests/ → 不生成发布清单，先要求代码生成
- 缺 review → 标注"未经独立审查"，用户确认后仍可生成
- 缺 testing/test-cases.md → 标注"无测试用例"，降级为最小发布流程
```

**修复 2：信号名称对齐**

修改 `## 运行时信号`：

```markdown
- 输入：`codegen.generated_code` + `review.deviation_attribution`（原 "code review passed, test results"）
- 输出：`deploy.release_plan`（原 "release plan, rollback plan, release blocked"）
```

**预计行数变化**：+5 行 → 186 行（安全）

---

### 23. learn (143 行) — 当前 7/10

**状态**：反向验证概念出色但红旗太少 + 缺 when_not_to_use。

**修复 1：补充「何时不使用」**

在 `## 触发条件` 后新增：

```markdown
## 何时不使用
- 同类偏差 < 3 条（数据不足以构成模式）
- 只做过一个项目（没有跨项目验证）
- 用户只想修一个 bug（不是方法论问题，是代码问题）
```

**修复 2：红旗从 3 条扩充到 6 条**

替换现有 `## 红旗` 全部内容：

```markdown
## 红旗清单
- 没有证据就建议修改 → 强制补充证据链（"哪些偏差记录支撑了这个建议？"）
- 单次偏差就认为有问题 → 强制要求 ≥ 3 条同类（"一条偏差不是模式"）
- 建议和已有方法论冲突 → 强制检查兼容性（"新建议和已有不变原则矛盾吗？"）
- 之前因同类偏差改过 skill 但仍出现 → 回滚修改并重新归因（"上次归因可能错了"）
- 建议会导致 skill 超 200 行 → 考虑提取 protocol 文件（"加内容前先想怎么压缩"）
- 偏差归因不一致（review 说是 skill 问题，实际是文档偏移）→ 交叉验证归因
```

**修复 3：补充闭环路由说明**

在 `## 运行时信号` 后追加：

```markdown
**闭环路由**：learn 的方法论改进建议经人类确认后，需要回写到对应 SKILL.md。当前此步骤为手动执行。未来可通过 SKILL.md frontmatter 的 signal_routes 实现自动注入——learn 输出 `{skill}_methodology_update` 信号，目标 skill 的 signals_in 声明接收。
```

**预计行数变化**：+18 行 → 161 行（安全）

---

## 修复优先级总表

| 优先级 | Skill | 当前分 | 修复后预期 | 修复项数 | 行数变化 |
|--------|-------|--------|-----------|---------|---------|
| **P1** | design | 5 | 7.5 | 4 | +30 |
| **P1** | test | 5 | 7 | 5 | +40 |
| **P1** | init | 6 | 7.5 | 5 | +35 |
| **P2** | detail | 5.5 | 7.5 | 4 | +25 |
| **P2** | fe-artifact | 6 | 7.5 | 4 | +30 |
| **P2** | fe-accept | 6.5 | 7.5 | 3 | +20 |
| **P2** | fe-system | 7 | 8 | 3 | +20 |
| **P3** | learn | 7 | 8 | 3 | +18 |
| **P3** | review | 7.5 | 8 | 3 | +15 |
| **P3** | business-alignment | 7.5 | 8 | 3 | +10 |
| **P3** | test-cases | 7.5 | 8 | 3 | +8 |
| **P4** | define | 8 | 8.5 | 3 | +12 |
| **P4** | research | 8 | 8.5 | 3 | +10 |
| **P4** | interaction-design | 8 | 8.5 | 3 | +8 |
| **P4** | technical-design | 8 | 8.5 | 2 | +4 |
| **P4** | db-design | 8 | 8.5 | 3 | +6 |
| **P4** | frontend-design | 8 | 8.5 | 2 | +8 |
| **P4** | test-strategy | 8 | 8.5 | 2 | +3 |
| **P5** | plan | 8.5 | 9 | 3 | +8 |
| **P5** | codegen | 8.5 | 9 | 2 | +4 |
| **P5** | brainstorm | 9 | 9.5 | 2 | +8 |
| **P5** | api-design | 9 | 9.5 | 2 | +8 |
| **P5** | deploy | 9 | 9.5 | 2 | +5 |
| **S1** | SKILL.md frontmatter | — | — | 1 | 新增信号词汇表 |
| **S2** | SKILL.md frontmatter | — | — | 1 | produces 拆分 |

---

## 执行建议

**第一轮（修复骨架缺失）**：P1 的 3 个 Skill（design/test/init）
- 补红旗 + 验证清单 + when_not_to_use + 入口/出口
- 预计工作量：3 个文件，~105 行新增

**第二轮（修复身份分裂 + 弱 Skill）**：P2 的 4 个 Skill（detail/fe-artifact/fe-accept/fe-system）
- detail: 声明 Phase 0 例外 + 补红旗
- fe-artifact: 补清单 + 内联核心规则
- fe-accept: 红旗改格式 + 补 when_not_to_use
- fe-system: 红旗改格式 + 补 when_not_to_use

**第三轮（加强中等 Skill）**：P3 的 4 个 Skill（learn/review/business-alignment/test-cases）
- learn: 红旗扩充 + 补 when_not_to_use
- review: 补 when_not_to_use + 红旗微调
- 信号完整性微调

**第四轮（微调优秀 Skill）**：P4 + P5 的 12 个 Skill
- 信号对齐 + 输入缺失处理 + 决策编号

**套件级**：S1（信号词汇表）+ S2（产物所有权）
- 这两个是杠杆最大的修复，建议在第二轮同步执行
