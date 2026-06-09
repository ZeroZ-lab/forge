# Forge

> 文档是目标约束。目标是什么、边界在哪、怎么算完成。
> 路径、结构、技术选型是实现手段，AI 自主决定。

## 核心理念

文档只回答三个问题：
1. **目标是什么** — 做什么、解决什么问题
2. **边界在哪** — 不做什么、约束条件、已知限制
3. **怎么算完成** — 验收标准、成功指标

实现路径、项目结构、技术选型——都是达成目标的手段。同一份目标约束，不同模型能力下会有不同实现，但目标不变。

**决策不会过期，代码会。** 记录为什么选 A 不选 B，比记录 A 怎么实现更重要。框架会换，人会走，决策记录是项目唯一不会过时的东西。

## 默认入口：小功能迭代

Forge 的默认目标不是把每个用户都带进完整生命周期，而是先降低日常 feature 迭代的心智负担。

### 默认主链

| 场景 | 默认链路 | 何时使用 |
|------|----------|---------|
| 需求明确的小功能 | `detail → codegen → review` | 已有项目、只差补齐决策和实现 |
| 边界还不清晰的功能 | `define → detail → codegen → review` | 需要先澄清需求，再进入实现 |

`plan`、`test`、`deploy`、`research`、`think` 都保留，但默认不进入首页叙事。只有在任务复杂度或治理需求明确提高时才显式启用。

### 默认最小产物

默认只要求 2 类 feature 文档：

| 文档 | 默认角色 |
|------|---------|
| `goal.md` | 记录目标、边界、完成标准和关键决策 |
| `changelog.md` | 记录这个 feature 的决策历史 |

按需再补：

- `notes/*.md`：需要领域补充说明时启用（API、前端、数据库等）
- `PRD.md`：需求边界还不清时启用
- `plan.md`：任务切片、依赖图、并行矩阵有价值时启用
- `testing/`、`deploy/`：需要独立测试或发布产物时启用
- `docs/timeline.md`：项目级演进或跨 feature 影响时启用
- `docs/status.md`：多 feature 并行协调时启用

### Change Unit

每次 feature、bugfix、refactor、release 或方法论更新都应有一个 Change Unit：

```txt
docs/change-units/CU-<date>-<slug>.md
```

CU 记录：为什么改、行为变化、影响范围、风险、验证证据。`changelog.md` 与 `docs/timeline.md` 只写摘要并链接 CU，不复制完整事件。

### Advanced 入口

完整生命周期、评测系统和方法论进化都仍然存在，但默认放进 Advanced 语境：

- 团队治理和多 feature 协调：看 `docs/status.md`、`docs/timeline.md`
- 架构审计和评测：看 `docs/skill-architecture-audit.md`、`docs/skill-suite-evaluation.md`
- 方法论进化：看 `docs/timeline.md`

### 操作纪律（D1–D9）

所有 skill 自动遵守以下条款，不重复内容，只引用编号。

**D1：决策留痕**
每个技术选择都记录：选了什么、为什么选、拒绝什么。框架会换，人会走，决策记录是项目唯一不会过时的东西。

**D2：目标约束**
文档定义目标和边界，不定义实现。AI 自主选择路径和结构。清晰的目标比详细的蓝图更有价值。

**D3：人类决策，AI 执行**
AI 呈现选项 + 代价，人类做选择，AI 记录决策 + 生成实现。在关键分歧点停下来，等人类确认，把选择固化成文档。

**D4：最小变更**
优先满足当前目标的最小变更，不引入未要求的抽象、配置或兼容层。

**D5：目标边界**
改动前确认目标、边界、假设和验证方式。只编辑与目标直接相关的文件；发现无关问题只记录，不顺手修改。

**D6：暴露假设**
做决策时列出假设。如果假设可能不成立，停下来向人类确认。

**D7：验证而非假设**
每次代码或文档变更后，执行可用验证，或明确说明无法验证的原因。

**D8：累积升级**
同类问题修正 ≥ 2 次，停下来建议重新审视目标定义。重复失败可能是目标本身的盲区。

**D9：运行实证（Evidence over claims）**
任何代码变更声明"完成"之前，必须提供运行证据。编译通过、服务启动、测试绿灯——至少一项，视项目类型而定。无法提供运行证据时，必须说明原因并标记"⚠️ 未验证"。不跑就说完了 = 猜。
D7 管所有变更，D9 加码代码变更——代码不能只"说明原因"就跳过运行验证。

### AI 执行纪律

以下为 D4/D5/D6/D7 在执行层面的展开。完整定义见「操作纪律（D1–D9）」。
- D5+D6：改动前确认目标、边界、假设和验证方式。
- D4：优先满足当前目标的最小变更，不引入未要求的抽象、配置或兼容层。
- D5：只编辑与目标直接相关的文件；发现无关问题只记录，不顺手修改。
- D7：每次代码或文档变更后，执行可用验证，或明确说明无法验证的原因。

---

## Advanced：全生命周期架构

软件开发不只有技术设计。Forge 用阶段制 skill 覆盖从业务讨论到上线发布的完整生命周期，每个 skill 遵循相同范式：

```
决策协议（skill）→ 明确目标 → AI 自主实现 → 验证结果
```

### 7 阶段（含 3 子阶段，共 10 个阶段标记） × 18 个领域 Skill + 4 个编排 Skill + 1 个思考增强 Skill

| 阶段 | Skill | 方法论 | 角色 | 产出 |
|------|-------|--------|------|------|
| **⓪ 探索** | brainstorm | 可能性展开 | 产品 + 业务方 | 方向简报 |
| **① 定义** | business-alignment | 需求验证 | 产品 + 业务方 | 项目章程 |
| | define | 约束定义 | 产品 + 开发 | PRD |
| **①.5 研究** | research | 算法猎手 | 产品 + 技术研究员 | 算法菜单 |
| **② 设计** | interaction-design | 流程优先 | 产品 + 设计师 | 交互规格 |
| | fe-system | 三层 Token | 设计师 | 设计系统 |
| | technical-design | 架构权衡 | 架构师 + 开发 | 技术方案 |
| **③ 详设** | api-design | 资源导向 | 后端开发 | API 合约 |
| | frontend-design | 组件驱动 | 前端开发 | 组件规格 |
| | db-design | 模型驱动 | 后端开发 | 数据模型 |
| **④ 任务** | plan | 垂直切片 | 开发 | 任务分解 |
| **⑤ 构建** | codegen | 目标驱动实现 | AI | src/ + tests/ |
| | fe-artifact | 五层翻译 | AI | 前端代码 |
| **⑥ 测试** | test-strategy | 风险分层 | QA + 开发 | 测试策略 |
| | test-cases | 场景覆盖 | QA | 测试用例 |
| | fe-accept | 四维验收 | QA + 设计 | 验收报告 |
| **⑥.5 审查** | review | subagent 独立审查 | AI + 用户 | 审查报告 |
| **⑦ 交付** | deploy | 可逆发布 | DevOps + 开发 | 发布清单 |
| **思考增强** | think | 结构化深度思考 | AI + 用户 | thinking 产物 + 决策依据回写 |

> think 产出的推理记录可被 brainstorm、define、technical-design、review 等 skill 参考，但这些 skill 不显式声明消费 think 产出——AI 在需要时自行回读 `docs/thinking/` 目录。

编排 skill：`init`、`design`、`detail`、`test`。不新增方法论，只负责按需加载领域 skill、合并产物和维护汇总历史。`init` 加载 business-alignment + technical-design + fe-system（项目级）。`design` 加载 interaction-design + fe-system（feature 级）。`test` 加载 test-strategy + test-cases。`detail` 加载 api-design + db-design + frontend-design。`technical-design`（非编排器加载）和 `fe-accept`（非编排器加载）为独立领域 skill，可由用户直接调用或由 AI 在需要时自动选择。`think` 不是生命周期阶段，而是可在任意阶段调用的思考增强层。

> 每个 skill 的完整方法论、AI 角色、边界声明和引导技巧见 `plugins/forge/skills/*/SKILL.md`。

### 阶段间的产物传递

```
⓪ 探索         ① 定义         ①.5 研究       ② 设计                      ③ 详设
方向简报  →  项目章程 → PRD  →  算法菜单  →    交互规格 + 设计系统 + 技术方案    →    goal.md + notes/
                                                                              │
                                                                              ↓
⑦ 交付          ⑥.5 审查        ⑥ 测试                     ⑤ 构建         ④ 任务
发布清单  ←   审查报告   ←   测试策略 + 测试用例   ←   src/ + tests/  ←   plan.md（任务分解）
```

每个阶段的产物是下一阶段的输入。PRD 约束技术方案，技术方案约束详设，详设驱动编码，编码驱动测试。

### 目标验证

Forge 是闭环系统——文档定义目标，AI 自主实现，验证结果是否达标。信号传递在环节间完成，闭环控制由 `SKILL.md` frontmatter 驱动，完整定义见 `docs/goal-verification.md`。

| 环节 | 机制 | 信号 |
|------|------|------|
| **实现** | codegen 读取目标 → 生成代码 → 验证目标是否达成 | 同类失败 ≥ 2（同类 = 同一 goal.md 完成标准项在单次 session 中连续验证不通过）→ 触发目标审视 |
| **审查** | review 检查实现是否满足目标 → 差距分析 | 目标冲突 → 需要人类决策 · review 产出偏差归因（deviation_attribution）→ 路由到 detail 复查 goal · P0/P1 阻塞 → 路由到人类决策 |

**前馈机制**：detail 阶段从历史失败中提取高频风险 → 写入目标文档「已知风险」→ codegen 读目标时自然获得，零额外成本。

**累积升级规则**：如果你在本次 session 中反复修正同类问题（≥ 2 次，同类 = 同一完成标准项或同一文件的同区域反复修改），停下来建议用户重新审视目标定义。重复失败可能是目标本身的盲区。

### 两层文档体系

```
Project 级   → 这个项目的技术选型和设计语言              很少变
Feature 级   → 这个功能的目标、决策和历史                迭代时变
```

### 项目级文件

项目级文件在各阶段按需生成，不存在则自动创建：

```
my-project/
├── docs/project.md        # 技术决策 + 共享约束
├── docs/status.md         # 可选：多 feature 协调看板
├── docs/timeline.md       # 可选：项目级演进记录
├── docs/timeline/         # 可选：timeline 归档（按年/季度）
├── docs/thinking/         # 可选：深度思考产物
├── DESIGN.md              # 设计系统（颜色、间距、交互模式、组件模式）
├── AGENTS.md              # AI 行为指令（从 project.md + DESIGN.md 生成）
└── CLAUDE.md              # Claude Code 入口（指向 AGENTS.md）
```

| 文件 | 告诉 AI | 生成来源 |
|------|---------|---------|
| project.md | 技术上怎么做 | technical-design 的共享决策 |
| DESIGN.md | 视觉上怎么呈现 | fe-system 决策 |
| status.md | 各 feature 当前在哪个阶段（启用时） | 多 feature 协调时更新 |
| AGENTS.md | 你应该怎么工作 | project.md + DESIGN.md 生成 |
| CLAUDE.md | 读 AGENTS.md | 入口指针 |

### Skill vs 产物文档

**Skill 永远抽象，产物文档永远具体。** 这是 Forge 架构的核心分离。

**Skill 里只有三样东西：**
1. **方法论** — 恒久不变的设计思想（需求验证、流程优先、架构权衡、测试金字塔、可逆发布）
2. **业务问题** — 只有人类能回答的（用户是谁、场景是什么、数据量多大、谁来做）
3. **不变原则** — 永远成立的判断（"团队经验 > 技术先进性""没有测试 = 不存在的功能"）

**Skill 里不写具体技术。** 具体技术由模型搜索最新方案后推荐，人类确认后写入产物文档。这样 skill 不会因为技术更替而过期。

**决策点用结构化选择呈现。** 所有 skill 的决策点（`### XX: 主题`）在选项可枚举时，使用 `AskUserQuestion` 工具呈现 2-4 个选项让用户点选，而非自然语言提问。开放性问题（场景描述、发散探索）用自然语言。详见 `plugins/forge/skills/shared/concepts/decision-presentation.md`。

---

## 文档结构

### 实际项目

```
my-project/
│
├── docs/
│   ├── project.md                    # Project 级（~100 行，很少变）
│   ├── timeline.md                   # 可选：项目时间线（最近 10 条，≤100 行）
│   ├── timeline/                     # 可选：时间线归档
│   ├── thinking/                     # 可选：深度思考产物
│   │   └── archive/                  #   被推翻的分析归档
│   │
│   └── features/
│       ├── task-management/          # 一个功能 = 一个 goal + 按需补充
│       │   ├── goal.md               #   目标 + 边界 + 完成标准 + 决策
│       │   ├── changelog.md          #   决策历史（最近 5 条，≤100 行）
│       │   ├── changelog/            #   变更历史归档
│       │   ├── PRD.md                #   可选：需求定义（define 阶段）
│       │   ├── plan.md               #   可选：任务分解（plan 阶段）
│       │   └── notes/                #   可选：领域补充说明
│       │       ├── api.md            #     API 相关说明
│       │       ├── frontend.md       #     前端相关说明
│       │       └── database.md       #     数据库相关说明
│       └── billing/                  # 另一个功能，同样结构
│
├── DESIGN.md                         # Project 级（设计系统）
├── AGENTS.md                         # Project 级（AI 行为指令）
├── CLAUDE.md                         # Project 级（入口指针）
├── src/                              # 由 AI 实现
└── tests/                            # 由 AI 实现
```

### Feature 级 goal.md

每个功能的核心文档，回答三个问题：

```markdown
# Task Management

> 团队协作的任务管理系统

## 目标

- 用户可以创建、分配和追踪任务
- 支持多租户隔离
- 支持看板和列表两种视图

## 边界

### 包含
- 任务 CRUD
- 状态流转（todo → in-progress → done）
- 成员分配
- 标签分类

### 不包含
- 时间追踪（v2）
- 文件附件（v2）
- 评论 @提及通知

## 完成标准

- [ ] 任务 CRUD 全流程可操作
- [ ] 多租户数据隔离
- [ ] 看板拖拽排序
- [ ] 权限：admin 全权限，member 限操作自己的

## 决策记录

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| 1 | 分页方式 | cursor | 数据量大时稳定 | offset（深度分页慢） |
| 2 | 软删除 | 是 | 恢复需求 | 硬删除（数据不可恢复） |

## 共享约束

> 引用 project.md 约束，只补充本 feature 新增。
```

---

## 膨胀控制

**原则**：文档只记目标、决策和约束。不记录实现细节——那是代码的事。

### 追加型（≤ 100 行，超出归档）

| 文件类型 | 上限 | 超出时 |
|---------|------|--------|
| goal.md | 100 行 | 分拆为多个 feature 或精简 |
| timeline.md | 100 行 | 旧条目压缩成年度摘要，移到 timeline/年.md |
| changelog.md | 100 行 | 旧版本移到 changelog/v*.md |
| notes/*.md | 200 行 | 按子领域拆分 |

---

## 使用流程

### 流程选择

默认先用简短链路，不要一上来展开完整生命周期：

| 流程 | 链路 | 适用场景 |
|------|------|---------|
| **默认** | define → detail → codegen → review | 已有项目，新功能但边界还不够清楚 |
| **快速** | detail → codegen → review | 已有项目，小功能迭代 |
| **最小** | detail → codegen | 已有项目，加一个端点或模块 |
| **完整** | brainstorm → init（内含 business-alignment） → define → research → design → detail → plan → codegen → test → review → deploy | 新项目从零开始，或需要完整治理链 |

**跳过原则**：已有 project.md + DESIGN.md → 跳过 init · 需求明确 → 跳过 define · 纯后端 → 跳过 design · 改动很小时 → 跳过 plan / test / deploy

**跳过时的产物假设**：跳过上游阶段时，下游 skill 默认读取已有文件作为输入。如果被跳过阶段的产物不存在（如 goal.md 缺失），下游 skill 应先补建必要产物再继续，而非假设其存在。

**research 自动触发**：走了 define 路径后，AI 扫描 PRD 中的技术信号词并建议 research。完整流程中 research 在 define 之后、design 之前。小功能默认链路（detail → codegen → review）不主动展开 research，但用户可通过 `/forge:research` 显式触发。

技术信号词（出现任一即触发）：
- 实时/同步/协作（CRDT vs OT vs 锁）
- 搜索/排序/推荐（BM25 vs 向量 vs 混合）
- 动画/物理/仿真（运动学、碰撞检测、粒子系统）
- 路径/调度/优化（A*、遗传算法、约束求解）
- 加密/认证/权限（加密方案、权限模型）
- 图片/音频/视频处理（编解码、滤镜、压缩）

跳过（三条全部满足）：
- 纯 CRUD 应用（表单→数据库→列表页，没有技术选择空间）
- 且用户已有明确技术方案
- 且团队做过类似项目

### Skill 编排

Forge 不维护独立的指令层。用户用自然语言表达目标，运行时由 skill 描述触发对应协议。需要人类决策的阶段由 skill 停下来呈现选项；不需要决策的执行动作由 AI 直接完成。

### Skill 调用深度

Claude Code 根据 skill 的 `description` / `when_to_use` 自动选择最小相关协议；用户也可以用 `/forge:<skill>` 或自然语言显式点名阶段。

| 深度 | 用途 | 行为 |
|------|------|------|
| L0 lens | 判断、分析、review 一个点 | 只读必要上下文，不改文件 |
| L1 patch | 局部目标 / code 修正 | 最小改动，执行可用验证 |
| L2 stage | 完整阶段执行 | 产出或更新阶段文档 + 历史记录 |

**Per-skill depth 默认**：domain skill（brainstorm, define, codegen, review 等）遵循上表通用规则。编排 skill（init, design, detail, test）默认 L2（编排器职责是产出阶段文档）。轻量调用只改目标语义时必须回写对应文档。

**Depth 判断信号**：用户说"只看看"/"简单 review"/"检查一下" → L0 · 用户说"修一下"/"改个字段"/"加个端点" → L1 · 用户说"走一遍 design"/"完整测试"/显式点名阶段 → L2。

**默认规则**：用户未显式点名阶段时，优先走 `detail → codegen → review` 的 L0/L1 轻量调用；用户显式点名阶段或 skill 时，默认 L2 阶段调用，除非用户说"只看看"、"简单 review"或等价限制。轻量调用如果改变目标语义，必须回写对应文档。

### 自然语言执行

| 你说 | AI 做什么 |
|------|----------|
| "生成代码" | 读目标文档 → 自主实现 → 验证 |
| "做一只壁虎" | brainstorm + research 的组合（产品探索 + 算法菜单） |
| "创建任务报 500" | 读目标 + 代码 → 找问题 → 修代码 |
| "给任务加标签" | detail + codegen 的组合（加模块） |
| "分页换成 cursor" | 更新决策 → 实现 → 验证 |
| "React 升级到 20" | 更新 project.md → 重新实现 → 验证 |
| "整个重写" | 保留目标和决策 → 重新实现 |
| "加个测试" | test 编排器（test-strategy + test-cases + 交叉验证） |
| "重构这段代码" | detail + codegen 的组合（重新详设并实现） |
| "这个 bug 怎么修" | 读目标 + 代码 → 定位问题 → 最小修补 → 验证（L1 patch） |
| "设计一下" | design 编排器（interaction-design + fe-system） |

> 完整对话示例和迭代模式详见 `references/usage-examples.md`。

---

## 历史记录（默认最小集 + 按需扩展）

默认只维护 feature 级 `changelog.md`。`timeline.md` 是项目级扩展，只有在项目决策演进、跨 feature 影响或需要发布摘要时才启用。

| 文件 | 粒度 | 格式 |
|------|------|------|
| `docs/features/<feature>/changelog.md` | 一条 = 一个决策 | 触发 + 决策 + 影响 + 类型 |
| `docs/timeline.md` | 一条 = 一次项目级演进（启用时） | 日期 + 变更摘要 + 触发原因 + 影响范围 |

**默认触发规则**：goal.md / notes/*.md 变更 → 追加 changelog。

**timeline 启用后**：阶段完成、新增 feature、跨 feature 共享决策变更或项目级发布摘要 → 追加 timeline。

**压缩规则**：见上方「膨胀控制 → 追加型」。

**AI 怎么用**：默认先读 changelog.md 了解这个 feature 的局部决策历史；只有启用了 timeline.md，才额外回看项目级演进脉络。

---

## 阶段追踪（多 Feature 协调）

`docs/status.md` 是可选的 feature 阶段**全局快照**，只在多 feature 并行协调时建议开启。

**与历史记录的关系**：status.md 是"现在在哪"（快照，启用时）；changelog 是默认历史；timeline 是项目级扩展历史。三者互补，但不是默认一起维护。

### 状态机语义

每个 feature 的每个阶段有 5 种状态：

| 状态 | 含义 | 标记 |
|------|------|------|
| 未到 | 还没开始 | `·` |
| 进行中 | 正在执行 | `🔄` |
| 完成 | 出口条件满足 | `✅` |
| 跳过 | 显式决定不做（必须附原因） | `⏭️跳过（原因）` |
| 阻塞 | 被依赖 feature 或人类确认卡住 | `🚫阻塞（原因）` |

**转换条件**：skill 入口 → `进行中` · skill 出口 → `完成` · 用户/AI 显式跳过 → `跳过` · 依赖未满足 → `阻塞`

### 多 Feature 依赖

依赖是**产物依赖**，不是抽象关系：

```
Feature B 的 detail 需要 Feature A 的 goal.md
→ status.md 中标注：B 依赖 A（③详设）
→ B 进入 detail 时，检查 A 的 detail 是否完成
→ 未完成 → B 的 detail 标记为 🚫阻塞
```

### 更新规则

启用 status.md 后，每个 skill 完成时，在「历史维护」步骤中同步更新 status.md：

1. 当前阶段状态 → `✅`
2. 下一阶段状态 → `🔄`（如果有明确的下一步）
3. 新 feature 首次出现 → 添加行
4. 跳过阶段 → 标注 `⏭️` + 原因

**注意**：status.md 是可选协调工具。单 feature 项目不需要启用——维护成本高于收益。只在 3+ feature 并行且存在跨 feature 依赖时建议启用。启用后由编排器在阶段完成时自动更新，非编排 skill 不负责更新 status.md。

**膨胀控制**：status.md 是追加型（≤ 100 行）。已交付的 feature 移到"已交付归档"区域。超过 100 行时，归档早期 feature。

### 模板

使用 `plugins/forge/skills/shared/status-template.md` 作为产出结构参考。

---

## 落地机制

### 两层 AGENTS.md

Forge 的 AGENTS.md 和项目实际使用的 AGENTS.md 是**不同的文件**。

```
Forge 的 AGENTS.md（方法论）
       │
       │ init 生成
       ▼
项目的 AGENTS.md（具体指令）  ← 实际项目开发读的是这个
       │
       │ 每次 AI session
       ▼
代码
```

**Forge 的 AGENTS.md 只在 `forge init` 时被加载，之后项目靠自己的文件运转。**

### 资源引用链

**决策 Skill 不引用资源。** 只有编排型 Skill（init）引用模板。

```
决策 Skill（抽象）     →  "问日活多少，推荐方案，记录决策"
init（编排器）          →  加载子 skill + 模板 → 生成项目文件
项目 AGENTS.md         →  告诉 AI 文件在哪、格式是什么
```

引用关系只存在于项目文件中：项目 AGENTS.md → project.md + DESIGN.md · Feature goal.md → notes/*.md · 模块文件 → 互相引用。

---

## 验证教训

### 关键教训

- **目标清晰 > 实现精确**：模糊的目标导致 AI 反复修正，清晰的目标一次通过。
- **决策留痕防止摇摆**：为什么选 A 不选 B 一旦丢失，新 session 可能选不同方案。
- **完成标准必须可验证**：不可验证的标准等于没有标准。
- **接口合约用缩进伪代码**（人类可读 > 机器可解析）。
- **编排层（入口 + 事件绑定 + 调用链）是最容易丢失的部分**——如果涉及复杂编排，在目标文档中明确记录。
- **代码注释引用决策编号**（FD# / PD#）形成可追溯链。

> 详细验证方法见 `references/validation-lessons.md`。

---

## Forge 项目本身

```
forge/
├── AGENTS.md                        # 本文件
├── references/                      # 补充文档（使用示例、验证教训）
├── plugins/forge/                   # 插件目录（唯一源）
│   ├── .claude-plugin/plugin.json   # Claude Code 插件
│   ├── .codex-plugin/plugin.json    # Codex CLI 插件
│   └── skills/                      # 23 个决策协议（flat list）
│       ├── brainstorm/            # ⓪ 探索
│       ├── init/                  # 初始化编排（+ agents/claude 模板）
│       ├── business-alignment/    # ① 业务对齐
│       ├── define/                # ① 需求文档
│       ├── research/              # ①.5 技术探索（算法猎手）
│       ├── design/                # 设计编排
│       ├── interaction-design/    # ② 交互设计
│       ├── fe-system/             # ② 设计系统落地（含原 visual-design）
│       ├── technical-design/      # ② 技术设计
│       ├── detail/                # 详设编排
│       ├── api-design/            # ③ API 详设
│       ├── frontend-design/       # ③ 前端详设
│       ├── db-design/             # ③ 数据库详设
│       ├── plan/                  # ④ 任务分解
│       ├── codegen/               # ⑤ 代码生成
│       ├── fe-artifact/           # ⑤ 前端代码生成（codegen 子协议）
│       ├── test/                  # 测试编排
│       ├── test-strategy/         # ⑥ 测试策略
│       ├── test-cases/            # ⑥ 测试用例
│       ├── fe-accept/             # ⑥ 前端质量验收
│       ├── review/                # ⑥.5 subagent 独立审查（文档审查+代码审查）
│       ├── deploy/                # ⑦ 部署发布
│       ├── think/                 # 思考增强
│       └── shared/                      # 共享模板和概念
```

> **Flat list 纪律**：Claude Code 只发现 `plugins/forge/skills/` 一级子目录的 SKILL.md，不支持嵌套。Skill 目录名全局唯一，用命名前缀区分阶段归属。

### 版本同步纪律

发版时以下文件的 `version` 字段必须保持一致，`/plugin` 命令读取的是 plugin.json，不是 package.json：

| 文件 | 用途 |
|------|------|
| `package.json` | npm 包版本 |
| `plugins/forge/.claude-plugin/plugin.json` | Claude Code 插件版本（`/plugin` 命令显示） |
| `plugins/forge/.codex-plugin/plugin.json` | Codex CLI 插件版本 |

**规则**：更新版本号时，三个文件同步改，commit message 用 `vX.Y.Z:` 前缀。漏改任何一个 = 用户看到的版本号和实际不一致。

### Skills 评测系统

Forge 通过运行时行为验证 skills 有效性，而非仅靠文档质量。

**两个核心脚本**：

1. **验证评测合约**（无需运行 agent）：
```bash
node scripts/evaluate-skills.mjs
# 或：npm run eval:skills
```
验证 benchmark 定义完整性：至少 10 个测试用例、覆盖所有 skills、fixture 存在、oracle checks 格式正确。这只证明评测工具本身正确，不证明 skills 有效。

2. **评分实际运行**（需要 Codex CLI）：
```bash
# 安装本地 Codex 插件
node scripts/install-local-codex-plugin.mjs

# 运行 benchmark（单个用例或全部）
node scripts/run-skills-benchmark.mjs --case thinking-red-team
# 或：npm run eval:skills:run

# 评分报告
node scripts/evaluate-skills.mjs --report .eval-runs/skills-suite/<run-id>/report.json
# 部分完成时加 --allow-partial，跳过 blocked 用例加 --skip-blocked
```

运行记录保存在 `.eval-runs/skills-suite/`，包含 transcript、workspace 和中间产物。

**评测纪律**：
- Fixture 保持稳定，确保跨版本可比
- 运行期间禁止 agent 修改 manifest 或 report schema
- 中断的运行标记为 incomplete，不算 skill 行为失败
- 对比 suite 时关注：pass rate、scope control、verification evidence、user intervention count
