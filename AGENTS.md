# Forge

> 文档是源代码，代码是投影。模型越强，同一份文档生成的代码越好。

## 核心理念

**旧认知**：代码是源代码，文档是衍生品  
**Forge 的认知**：文档是源代码，代码是文档在某个模型能力下的投影

同一份合约文档：
- 2024 + GPT-4 → Express + React 18 + CSS Modules
- 2025 + Claude 4 → Hono + React 19 + Tailwind
- 2027 + 更强模型 → 更好的实现，合约不变

**代码会腐烂，但决策不会过期。**

### 3 条不可变原则

**1. 决策留痕**  
每个技术选择都必须记录：选了什么、为什么选、拒绝什么。框架会换，人会走，决策记录是项目唯一不会过时的东西。

**2. 文档即源代码**  
文档不是代码的注释，文档是代码的源头。一份好的 contract.md 应该让任何未来模型重建系统。模型越强，从同一份文档生成的代码越好。

**3. 人类决策，AI 执行**  
AI 呈现选项 + 代价，人类做选择，AI 记录决策 + 生成实现。AI 不应该替人类做架构决策——在关键分歧点停下来，等人类确认，把选择固化成文档。

---

## 全生命周期架构

软件开发不只有技术设计。Forge 用阶段制 skill 覆盖从业务讨论到上线发布的完整生命周期，每个 skill 遵循相同范式：

```
决策协议（skill）→ 产物文档 → 下游消费（代码/设计稿/任务清单/测试用例...）
```

### 8 阶段 × 19 个领域 Skill + 4 个编排 Skill

| 阶段 | Skill | 方法论 | 角色 | 产出 |
|------|-------|--------|------|------|
| **⓪ 探索** | brainstorm | 可能性展开 | 产品 + 业务方 | 方向简报 |
| **① 定义** | business-alignment | 需求验证 | 产品 + 业务方 | 项目章程 |
| | requirements | 约束定义 | 产品 + 开发 | PRD |
| **①.5 研究** | research | 算法猎手 | 产品 + 技术研究员 | 算法菜单 |
| **② 设计** | interaction-design | 流程优先 | 产品 + 设计师 | 交互规格 |
| | fe-system | 三层 Token | 设计师 | 设计系统 |
| | technical-design | 架构权衡 | 架构师 + 开发 | 技术方案 |
| **③ 详设** | api-design | 资源导向 | 后端开发 | API 合约 |
| | frontend-design | 组件驱动 | 前端开发 | 组件规格 |
| | db-design | 模型驱动 | 后端开发 | 数据模型 |
| **④ 任务** | plan | 垂直切片 | 开发 | 任务分解 |
| **⑤ 构建** | codegen | 文档投影 | AI | src/ + tests/ |
| | fe-artifact | 五层翻译 | AI | 前端代码 |
| **⑥ 测试** | test-strategy | 风险分层 | QA + 开发 | 测试策略 |
| | test-cases | 场景覆盖 | QA | 测试用例 |
| | fe-accept | 四维验收 | QA + 设计 | 验收报告 |
| **⑥.5 审查** | review | subagent 独立审查 | AI + 用户 | 审查报告 |
| **⑦ 交付** | deploy | 可逆发布 | DevOps + 开发 | 发布清单 |
| **⑧ 进化** | learn | 偏差驱动进化 | AI + 用户 | 方法论改进 |

编排 skill：`init`、`design`、`detail`、`test`。不新增方法论，只负责按需加载领域 skill、合并产物和维护汇总历史。

> 每个 skill 的完整方法论、AI 角色、边界声明和引导技巧见 `skills/*/SKILL.md`。

### 阶段间的产物传递

```
⓪ 探索         ① 定义         ①.5 研究       ② 设计                      ③ 详设
方向简报  →  项目章程 → PRD  →  算法菜单  →    交互规格 + 设计系统 + 技术方案    →    contract + modules/
                                                                              │
                                                                              ↓
⑦ 交付          ⑥.5 审查        ⑥ 测试                     ⑤ 构建         ④ 任务
发布清单  ←   审查报告   ←   测试策略 + 测试用例   ←   src/ + tests/  ←   plan.md（任务分解）
```

每个阶段的产物是下一阶段的输入。PRD 约束技术方案，技术方案约束详设，详设驱动编码，编码驱动测试。

### 三层控制回路

Forge 是闭环系统——文档是 setpoint，代码是投影，偏差信号驱动修正。

这里的控制论约束发生在运行时，不要求每个 `SKILL.md` 文件都独立长成完整 MAPE-K 模板。skill 是协议节点；控制系统产生在一次任务执行中：路由 skill、读取项目状态、生成或更新文档、下游投影、检测偏差、回流信号、修正文档/代码/方法论或等待人类决策。运行时控制面见 `registry.yaml`，完整定义见 `docs/runtime-control-loop.md`，审计记录见 `docs/skill-architecture-audit.md`。

| 回路 | 速度 | 机制 | 信号传递 |
|------|------|------|---------|
| **快回路** | 单任务 | codegen 生成 → 四维对照 → L0/L1/L2 分级 → 修正 → 收敛 | 同类 L1 ≥ 2 → 触发中回路 |
| **中回路** | 单次迭代 | detail 改 contract → 读下游依赖表 → 漂移检测 → 级联更新 | 偏差归因 → 喂给慢回路 |
| **慢回路** | 跨项目 | review 偏差归因 → learn 聚合 → 修改 skill 方法论 | 方法论变更 → 影响所有回路 |

**前馈机制**：detail 阶段从历史偏差提取高频失误 → 写入 contract「已知风险」→ codegen 读 contract 时自然获得，零额外成本。

**自适应频率**：codegen 按任务复杂度选择对照频率——简单任务整任务对照，复杂任务逐函数对照。连续零偏差触发健康检查（验证检查机制本身是否有效）。

**控制论映射**：contract = setpoint · codegen = actuator · 四维对照 = sensor · 偏差信号 = error signal · 修正循环 = controller。

### 三层文档体系

```
Root 级      → Forge 本身的核心理念和架构（AGENTS.md）    永不变
Project 级   → 这个项目的技术选型和设计语言              很少变
Feature 级   → 这个功能的全流程产物                     迭代时变
```

### 项目级文件

项目级文件在各阶段按需生成，不存在则自动创建：

```
my-project/
├── docs/project.md        # 技术决策 + 共享约束
├── docs/timeline.md       # 项目时间线（最近 10 条详细 + 更早压缩）
├── docs/timeline/         # 时间线归档（按年/季度）
├── DESIGN.md              # 设计系统（颜色、间距、交互模式、组件模式）
├── AGENTS.md              # AI 行为指令（从 project.md + DESIGN.md 投影）
└── CLAUDE.md              # Claude Code 入口（指向 AGENTS.md）
```

**project.md 是源头，AGENTS.md / CLAUDE.md 是它的投影。** contract.md 生成代码，project.md 生成项目配置文件。

| 文件 | 告诉 AI | 生成来源 |
|------|---------|---------|
| project.md | 技术上怎么做 | technical-design 的共享决策 |
| DESIGN.md | 视觉上怎么呈现 | fe-system 决策 |
| AGENTS.md | 你应该怎么工作 | project.md + DESIGN.md 投影 |
| CLAUDE.md | 读 AGENTS.md | 入口指针 |

### Skill vs 产物文档

**Skill 永远抽象，产物文档永远具体。** 这是 Forge 架构的核心分离。

**Skill 里只有三样东西：**
1. **方法论** — 恒久不变的设计思想（需求验证、流程优先、架构权衡、测试金字塔、可逆发布）
2. **业务问题** — 只有人类能回答的（用户是谁、场景是什么、数据量多大、谁来做）
3. **不变原则** — 永远成立的判断（"团队经验 > 技术先进性""没有测试 = 不存在的功能"）

**Skill 里不写具体技术。** 具体技术由模型搜索最新方案后推荐，人类确认后写入产物文档。这样 skill 不会因为技术更替而过期。

**决策点用结构化选择呈现。** 所有 skill 的决策点（`### XX: 主题`）在选项可枚举时，使用 `AskUserQuestion` 工具呈现 2-4 个选项让用户点选，而非自然语言提问。开放性问题（场景描述、发散探索）用自然语言。详见 `skills/shared/concepts/decision-presentation.md`。

---

## 文档结构

### 实际项目

```
my-project/
│
├── docs/
│   ├── project.md                    # Project 级（~100 行，很少变）
│   ├── timeline.md                   # 项目时间线（最近 10 条，≤100 行）
│   ├── timeline/                     # 时间线归档
│   │
│   └── features/
│       ├── task-management/          # 一个功能 = 一棵文档树
│       │   ├── PRD.md                #   需求定义（define 阶段，整体加载）
│       │   ├── plan.md               #   任务分解（plan 阶段，整体加载）
│       │   ├── contract.md           #   feature 级共享骨架（~80 行）
│       │   ├── changelog.md          #   功能变更历史（最近 5 条，≤100 行）
│       │   ├── changelog/            #   变更历史归档
│       │   ├── api/                  #   API 领域
│       │   │   ├── contract.md       #     只记 feature 特有决策
│       │   │   └── modules/          #     共享决策指向 project.md
│       │   ├── frontend/             #   前端领域
│       │   ├── database/             #   数据库领域
│       │   ├── testing/              #   测试领域
│       │   └── deploy/               #   部署领域
│       └── billing/                  # 另一个功能，同样结构
│
├── DESIGN.md                         # Project 级（设计系统）
├── AGENTS.md                         # Project 级（AI 行为指令）
├── CLAUDE.md                         # Project 级（入口指针）
├── src/                              # 全部由 AI 从文档生成
└── tests/                            # 全部由 AI 从文档生成
```

### 领域间的引用关系

```
feature/contract.md（feature 级共享骨架）
  │
  ├── api/contract.md ──────────→ database/contract.md
  │     数据模型                     表结构、索引、迁移
  │
  ├── api/modules/*.md ─────────→ frontend/modules/*.md
  │     端点合约                      组件的 API 调用、类型引用
  │
  ├── api/ + frontend/ ─────────→ testing/contract.md
  │     验收条件 + 组件               测试用例来源
  │
  └── 所有领域 ──────────────────→ deploy/contract.md
        运行依赖                      容器化、环境变量、健康检查
```

**规则：下游领域引用上游领域，不反向。**

### 文件到代码的映射

```
api/contract.md ───────────→ src/middleware/ (auth, error, idempotency)
api/modules/<name>.md ─────→ src/routes/, src/schemas/, src/services/
frontend/modules/<name>.md → src/components/, src/hooks/
database/contract.md ──────→ src/db/schema.ts, src/db/migrations/
deploy/contract.md ────────→ Dockerfile, .github/workflows/
testing/contract.md ───────→ tests/ 结构和策略
```

### Feature 级 contract.md

每个功能的顶层 contract.md 放跨领域共享信息：

```markdown
# Task Management

> 团队协作的任务管理系统

## 共享约束

- 多租户隔离（所有领域）
- 软删除（API + 数据库）
- 权限：admin 全权限，member 限操作自己的（API + 前端）

## 领域索引

| 领域 | 目录 | 状态 | 模块数 |
|------|------|------|--------|
| API | api/ | v1.2 | 3 |
| Frontend | frontend/ | v1.1 | 3 |
| Database | database/ | v1.0 | - |
| Testing | testing/ | v1.0 | - |
| Deploy | deploy/ | v1.0 | - |
```

---

## 膨胀控制

**原则**：一次任务加载的总上下文 < 30K tokens（≈ 3,000 行）。
按需加载的文件控制单文件大小，整体加载的文件按 scope 自然增长。

### 按需加载（单文件 ≤ 200 行）

AI 每次任务只读 1-2 个，控制单次 token 消耗。

```
feature/contract.md     ~100 行   几乎不变
api/contract.md         ~100 行   几乎不变
api/modules/*.md        100-200 行  迭代时修改
frontend/contract.md    ~80 行    几乎不变
frontend/modules/*.md   100-200 行  迭代时修改
project.md / DESIGN.md  ~200 行   很少变
```

AI 按需加载：

```
"加标签功能"
  → 读 feature/contract.md（共享约束，~100 行）
  → 读 api/contract.md + api/modules/tasks.md（参考模式，~220 行）
  → 读 frontend/contract.md + frontend/modules/task-list.md（参考，~200 行）
  → 写 api/modules/labels.md + frontend/modules/labels.md
  → 改 database/contract.md（追加表）
  → 生成代码
  → 总共读 ~500 行，不碰其他领域和模块
```

### 整体加载（无硬约束，超 400 行检查）

AI 做任务时需要全部读，不存在"只读某一段"的场景。大小与 scope 正相关。

| 文件类型 | 说明 |
|---------|------|
| PRD.md | `docs/features/<feature>/PRD.md`，大小与 US 数量正相关，拆开会丢失全局视野 |
| plan.md | `docs/features/<feature>/plan.md`，依赖图 + 并行矩阵需要整体可见 |
| interaction-spec.md | 流程 + 线框 + 组件复用需要交叉引用 |
| idea-brief.md | 发散阶段，不宜过早压缩 |

### 追加型（≤ 100 行，超出归档）

| 文件类型 | 上限 | 超出时 |
|---------|------|--------|
| timeline.md | 100 行 | 旧条目压缩成年度摘要，移到 timeline/年.md |
| changelog.md | 100 行 | 旧版本移到 changelog/v*.md |
| timeline/年.md | 200 行 | 按季度拆分 |

---

## 使用流程

### 流程选择

不是每个项目都需要走完 8 个阶段：

| 流程 | 链路 | 适用场景 |
|------|------|---------|
| **完整** | brainstorm → init → define → design → detail → plan | 新项目从零开始 |
| **标准** | define → detail → plan | 已有项目，新功能 |
| **快速** | detail → plan | 已有项目，小功能迭代 |
| **最小** | detail | 已有项目，加一个端点 |

**跳过原则**：已有 project.md + DESIGN.md → 跳过 init · 需求明确 → 跳过 brainstorm 和 define · 纯后端 → 跳过 design · 一个端点 → 跳过 plan

**research 自动触发**：define 完成后，AI 扫描 PRD 中的技术信号词，默认建议 research，只在明确不需要时跳过。

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

| 阶段 | 做什么 | 加载的 skill | 产出 |
|------|--------|-------------|------|
| ⓪ 探索 | 发散可能性 + 圈定方向 | brainstorm | `idea-brief.md` |
| 初始化 | 业务 + 技术 + 设计 | business-alignment + technical-design + fe-system | `project.md` + `DESIGN.md` + `AGENTS.md` + `CLAUDE.md` |
| ① 定义 | 需求分析 + PRD | requirements | `PRD.md` |
| ①.5 研究 | 扫描 PRD 技术信号 + 算法搜索 | research | `research-brief.md` |
| ② 设计 | 交互 + 视觉 | interaction-design + fe-system | `interaction-spec.md` + `DESIGN.md` |
| ③ 详设 | API + DB + 前端（按需） | api-design + db-design (+ frontend-design) | `contract.md` + `modules/` |
| ④ 任务 | 垂直切片 + 自动推导测试 | plan + test-cases | `plan.md` + `testing/test-cases.md` |
| ⑥ 测试 | 测试策略 + 测试用例 | test-strategy + test-cases | `testing/contract.md` + `testing/test-cases.md` |
| ⑦ 交付 | 灰度 + 回滚 + 监控 | deploy | `deploy/contract.md` |

**detail 按需加载**：读 project.md → 有前端框架？读已有文档 → 有 frontend/ 目录？不确定 → 问用户。

### 自然语言执行

| 你说 | AI 做什么 |
|------|----------|
| "生成代码" | 读 plan.md → 按任务序列生成 src/ + tests/ |
| "做一只壁虎" | brainstorm + research 的组合（产品探索 + 算法菜单） |
| "创建任务报 500" | 读 contract.md + 代码 → 找分歧 → 修代码 |
| "给任务加标签" | detail + build 的组合（加模块） |
| "分页换成 cursor" | 改决策 → 级联更新文档 + 重新生成 |
| "React 升级到 20" | 改 project.md → 级联更新 → 重新生成 |
| "整个重写" | 重写所有 contract.md → 删代码 → 重新生成 |

> 完整对话示例和迭代模式详见 `references/usage-examples.md`。

---

## 历史记录（自动维护）

每次文档变更后，AI 自动更新两层历史记录。

| 文件 | 粒度 | 格式 |
|------|------|------|
| `docs/timeline.md` | 一条 = 一次发布 | 日期 + 变更摘要 + 触发原因 + 影响范围 |
| `docs/features/<feature>/changelog.md` | 一条 = 一个决策 | 触发 + 决策 + 影响 + 类型 |

**触发规则**：contract.md / modules/*.md 变更 → 追加 changelog · 阶段完成 → 追加 timeline · 新增 feature → 新建 changelog + 追加 timeline · 跨 feature 共享决策变更 → 追加 timeline 并标注影响

**压缩规则**：见上方「膨胀控制 → 追加型」。

**AI 怎么用**：改分页逻辑 → 读 timeline.md 看到 v1.1 改过 page → cursor（触发：性能）→ 读 changelog.md 看详细决策 → 知道上次为什么选 cursor，避免重复犯错。

---

## 落地机制：投影链

### 两层 AGENTS.md

Forge 的 AGENTS.md 和项目实际使用的 AGENTS.md 是**不同的文件**。

```
Forge 的 AGENTS.md（方法论）
       │
       │ init 投影生成
       ▼
项目的 AGENTS.md（具体指令）  ← 实际项目开发读的是这个
       │
       │ 每次 AI session
       ▼
代码
```

**Forge 的 AGENTS.md 只在 `forge init` 时被加载，之后项目靠自己的文件运转。**

### 类比

```
Forge AGENTS.md     →  编译器源码
项目 AGENTS.md      →  编译产物（可执行文件）
项目 contract.md    →  输入数据
项目代码            →  输出
```

用户不需要安装 Forge 源码来运行项目，就像不需要编译器源码来运行程序。

### 资源引用链

**决策 Skill 不引用资源。** 只有编排型 Skill（init）引用模板。

```
决策 Skill（抽象）     →  "问日活多少，推荐方案，记录决策"
init（编排器）   →  加载子 skill + 模板 → 生成项目文件
项目 AGENTS.md        →  告诉 AI 文件在哪、格式是什么
```

引用关系只存在于项目文件中：项目 AGENTS.md → project.md + DESIGN.md · Feature contract.md → 领域 contract.md · 模块文件 → 互相引用。

---

## 验证教训

### 验证 #1 — 2026-05-22 单次重建

从 contract.md 生成实现 → 删除 → 从同一份 contract.md 重建 → 对比一致性。

#### 四层结构各层不可替代

| 层 | 回答的问题 | 如果缺失 |
|---|-----------|---------|
| WHAT（需求 + 验收条件） | 做什么？怎么算对？ | 测试无法推导，边界条件遗漏 |
| WHY（决策 + 理由 + 拒绝） | 为什么不用 cursor 分页？ | 新 session 会重新做决策，可能选不同方案 |
| HOW（数据模型 + 接口合约 + 技术栈） | 字段叫什么？状态码多少？ | 两次生成的实现会 diverge |
| CONSTRAINTS（安全 + 性能 + 兼容） | 多租户怎么隔离？ | 生成的代码缺少非功能性考量 |

**WHY 层是 Forge 独有的价值。** 传统文档只记 WHAT 和 HOW——但选择理由一旦丢失，未来模型无法做出一致的扩展决策。

### 验证 #2 — 多轮迭代后重建

#### 重建结果

| 指标 | 值 |
|------|-----|
| 文件结构一致率 | 94% (16/17) |
| 导出函数一致率 | 87% (47/54) |
| 功能覆盖率 | 100% (10/10 轮全部实现) |
| 数据模型一致率 | 95% |
| 总代码行偏差 | -6% |

#### 文档做得好的

- **模块边界清晰** — 每个 .md 一个模块，职责单一
- **数据模型精确** — 字段和类型被完整重建
- **函数签名稳定** — 核心 API 在两版中完全一致
- **changelog 全量覆盖** — 10 轮迭代的功能都被完整保留
- **设计系统 token** — CSS 变量被完整复用

#### 文档缺失导致的问题

| 问题 | 原因 | 改进 |
|------|------|------|
| 渲染器参数类型变化 | 接口只写了函数名 | module template 加参数类型签名 |
| 入口文件不明确 | 没标注哪个文件是 boot 入口 | contract.md 加 `## 入口文件` 节 |
| public/private 接口混淆 | 接口列表未区分 | module template 加 `## 公共接口` vs `## 内部函数` |
| 编排逻辑丢失 | sim-engine 的调用链未文档化 | plan.md 或 contract.md 记录编排层调用链 |
| 模块 import 关系缺失 | 只在代码里体现 | contract.md 加 `## 模块依赖图` |

#### 对 module template 的改进建议

```markdown
# module-name

## 入口                    ← 新增
- 是否项目入口？哪个文件 boot？

## 公共接口                 ← 拆分
- 哪些函数被其他模块调用？
- 参数类型签名

## 内部函数                 ← 新增
- 模块内部使用，不需要导出

## 依赖关系                 ← 新增
- import 哪些模块的哪些函数？
```

### 通用教训

**关键教训**：接口合约用缩进伪代码（人类可读 > 机器可解析）· 目录路径必须无歧义 · 代码注释引用决策编号（FD# / PD#）形成可追溯链 · 验证文档完备性的唯一方法是删除代码后重建 · 多轮迭代后文档仍然是唯一的信息源 · 编排层（入口 + 事件绑定 + 调用链）是最容易丢失的部分。

> 详细验证方法见 `references/validation-lessons.md`。

---

## Forge 项目本身

```
forge/
├── AGENTS.md                        # 本文件
├── references/                      # 补充文档（使用示例、验证教训）
├── skills/                          # 22 个决策协议（flat list）
│   ├── brainstorm/            # ⓪ 探索
│   ├── init/                  # 初始化编排（+ agents/claude 模板）
│   ├── business-alignment/    # ① 业务对齐
│   ├── define/                # ① 需求文档
│   ├── research/              # ①.5 技术探索（算法猎手）
│   ├── design/                # 设计编排
│   ├── interaction-design/    # ② 交互设计
│   ├── fe-system/             # ② 设计系统落地（含原 visual-design）
│   ├── technical-design/      # ② 技术设计
│   ├── detail/                # 详设编排
│   ├── api-design/            # ③ API 详设
│   ├── frontend-design/       # ③ 前端详设
│   ├── db-design/             # ③ 数据库详设
│   ├── plan/                  # ④ 任务分解
│   ├── codegen/               # ⑤ 代码生成
│   ├── fe-artifact/           # ⑤ 前端代码生成（codegen 子协议）
│   ├── test/                  # 测试编排
│   ├── test-strategy/         # ⑥ 测试策略
│   ├── test-cases/            # ⑥ 测试用例
│   ├── fe-accept/             # ⑥ 前端质量验收
│   ├── review/                # ⑥.5 subagent 独立审查（文档审查+代码审查）
│   ├── deploy/                # ⑦ 部署发布
│   ├── learn/                 # ⑧ 方法论进化
│   └── shared/                      # 共享模板（contract + module + changelog）
├── .claude-plugin/plugin.json       # Claude Code 插件
└── .codex-plugin/plugin.json        # Codex CLI 插件
```

> **Flat list 纪律**：Claude Code 只发现 `skills/` 一级子目录的 SKILL.md，不支持嵌套。Skill 目录名全局唯一，用命名前缀区分阶段归属。
