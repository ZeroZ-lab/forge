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

### 8 阶段 × 14 个 Skill

| 阶段 | Skill | 核心方法论 | 参与角色 | 产出 |
|------|-------|-----------|---------|------|
| **⓪ 探索** | brainstorm | 可能性展开 | 产品 + 业务方 | 方向简报 |
| **① 定义** | business-alignment | 需求验证 | 产品 + 业务方 | 项目章程 |
| | requirements | 约束定义 | 产品 + 开发 | PRD |
| **② 设计** | interaction-design | 流程优先 | 产品 + 设计师 | 交互规格 |
| | visual-design | 系统化一致 | 设计师 | 设计系统 |
| | technical-design | 架构权衡 | 架构师 + 开发 | 技术方案 |
| **③ 详设** | api-design | 资源导向 | 后端开发 | API 合约 |
| | frontend-design | 组件驱动 | 前端开发 | 组件规格 |
| | db-design | 模型驱动 | 后端开发 | 数据模型 |
| **④ 任务** | plan | 垂直切片 | 开发 | 任务分解 |
| **⑤ 构建** | codegen | 文档驱动 | AI | src/ + tests/ |
| **⑥ 测试** | test-strategy | 风险分层 | QA + 开发 | 测试策略 |
| | test-cases | 场景覆盖 | QA | 测试用例 |
| **⑦ 交付** | deploy | 可逆发布 | DevOps + 开发 | 发布清单 |

### 阶段间的产物传递

```
⓪ 探索         ① 定义                    ② 设计                      ③ 详设
方向简报  →  项目章程 → PRD    →    交互规格 + 设计系统 + 技术方案    →    contract + modules/
                                                                              │
                                                                              ↓
⑦ 交付          ⑥ 测试                     ⑤ 构建         ④ 任务
发布清单  ←   测试策略 + 测试用例   ←   src/ + tests/  ←   plan.md（任务分解）
```

每个阶段的产物是下一阶段的输入。PRD 约束技术方案，技术方案约束详设，详设驱动编码，编码驱动测试。

### 三层文档体系

```
Root 级      → Forge 本身的核心理念和架构（AGENTS.md）    永不变
Project 级   → 这个项目的技术选型和设计语言              很少变
Feature 级   → 这个功能的全流程产物                     迭代时变
```

```
改动频率：
  AGENTS.md       核心原则永远不改
  project.md      项目建立时写一次，技术栈升级时改
  DESIGN.md       项目建立时写一次，设计语言升级时改
  PRD.md          功能立项时写，需求变更时改
  contract.md     技术设计时写，大重构时改
  modules/*.md    每次迭代都可能改
```

### 项目级文件

项目级文件在各阶段按需生成，不存在则自动创建：

```
my-project/
├── docs/project.md        # 技术决策 + 共享约束
├── DESIGN.md              # 设计系统（颜色、间距、交互模式、组件模式）
├── AGENTS.md              # AI 行为指令（从 project.md + DESIGN.md 投影）
└── CLAUDE.md              # Claude Code 入口（指向 AGENTS.md）
```

**project.md 是源头，AGENTS.md / CLAUDE.md 是它的投影。** 跟代码一样 — contract.md 生成代码，project.md 生成项目配置文件。

| 文件 | 告诉 AI | 生成来源 |
|------|---------|---------|
| project.md | 技术上怎么做 | technical-design 的共享决策 |
| DESIGN.md | 视觉上怎么呈现 | visual-design 决策 |
| AGENTS.md | 你应该怎么工作 | project.md + DESIGN.md 投影 |
| CLAUDE.md | 读 AGENTS.md | 入口指针 |

### Skill 目录结构

```
forge/skills/
├── forge-brainstorm/               # ⓪ 可能性探索（B1-B5）
├── forge-init/                     # 项目初始化编排
├── forge-business-alignment/       # ① 业务对齐（BA1-BA5）
├── forge-define/             # ① 需求文档（R1-R5）
├── forge-design/                   # 设计阶段编排
├── forge-interaction-design/       # ② 交互设计（I1-I5）
├── forge-visual-design/            # ② 视觉设计（V1-V5）
├── forge-technical-design/         # ② 技术设计（TD1-TD5）
├── forge-detail/                   # 详设阶段编排
├── forge-api-design/               # ③ API 详设（D1-D7）
├── forge-frontend-design/          # ③ 前端详设（F1-F5）
├── forge-db-design/                # ③ 数据库详设（DB1-DB5）
├── forge-plan/                     # ④ 任务分解（P1-P5）
├── forge-codegen/                  # ⑤ 代码生成
├── forge-test-strategy/            # ⑥ 测试策略（T1-T5）
├── forge-test-cases/               # ⑥ 测试用例（TC1-TC5）
└── forge-deploy/                   # ⑦ 部署发布（RL1-RL5）
```

> **Flat list 纪律**：Claude Code 只发现 `skills/` 一级子目录的 SKILL.md，不支持嵌套。Skill 目录名全局唯一，用命名前缀区分阶段归属。

### 各阶段 Skill 详述

#### ⓪ 探索（Explore）

**brainstorm（可能性探索）**
- **角色**：产品 + 业务方
- **方法论**：发散收敛 — 先展开可能性空间，再圈定值得深入的方向
- **问**：痛点具体是什么？当前怎么解决的？想过哪些方向？有没有参考产品？
- **原则**：发散阶段不评判不收敛 · 每个方向要有"什么场景下它是对的" · 探索产出是判断标准不是决策
- **记录**：方向地图（3-5 个方向 + 各自适用场景）+ 判断标准 + 下一步行动

#### ① 定义（Define）

**business-alignment（业务对齐）**
- **角色**：产品 + 业务方
- **方法论**：需求验证 — 在写代码之前验证假设
- **问**：要解决什么问题？当前用户怎么做的？MVP 最小可以是什么？成功的衡量标准？
- **原则**：先验证需求再验证方案 · 最贵的错误是做了没人用的东西
- **记录**：目标 + 用户画像 + MVP 范围 + 成功指标

**requirements（需求文档）**
- **角色**：产品 + 开发
- **方法论**：约束定义 — 需求不是说"要什么"，是说"不要什么"
- **问**：有哪些用户角色？核心场景 TOP 5？非功能约束（性能/安全/合规）？优先级？
- **原则**：每个需求必须有验收条件 · 不验收的需求 = 不存在的需求
- **记录**：用户故事 + 验收条件 + 优先级 + 范围排除

#### ② 设计（Design）

**interaction-design（交互设计）**
- **角色**：产品 + 设计师
- **方法论**：流程优先 — 先画用户怎么走，再画界面长什么样
- **问**：核心操作路径？每步需要什么信息 + 能做什么操作？异常流程？导航模式？
- **原则**：核心操作 3 步内完成 · 每个操作必须有反馈 · 错误处理 > 错误预防
- **记录**：用户流程 + 信息架构 + 核心线框 + 组件复用清单

**visual-design（视觉设计）**
- **角色**：设计师
- **方法论**：系统化一致 — 不是每个页面单独设计，而是建立系统后消费
- **问**：有品牌指南吗？产品气质？暗色模式？多平台？无障碍要求？
- **原则**：一致性 > 创意 · 设计系统 > 单页面设计 · 留白是最强的设计工具
- **记录**：色板 + 字体 + 间距系统 + 组件库规范

**technical-design（技术设计）**
- **角色**：架构师 + 开发
- **方法论**：架构权衡 — 每个选择都是 trade-off，不存在最优解
- **问**：读写比？一致性要求？流量 + 性能要求？团队技术栈？单体还是微服务？
- **原则**：架构决策不可逆要慎重 · 组件选择可替换可以大胆 · 简单方案优先
- **记录**：系统架构 + 技术栈 + 服务划分 + 部署架构

#### ③ 详设（Detail）

**api-design（API 详设）**
- D1-D7: 资源建模 / 分页 / 错误 / 权限 / 幂等 / 并发 / 认证

**frontend-design（前端详设）**
- F1-F5: 框架 / 状态管理 / 样式 / 数据请求 / 表单

**db-design（数据库详设）**
- DB1-DB5: 选型 / ID策略 / 索引 / 迁移 / 软删除

#### ④ 任务（Plan）

**plan（任务分解）**
- **角色**：开发
- **方法论**：垂直切片 — 每个任务交付一个完整、可独立验证的用户路径
- **问**：contract.md 里有哪些模块？模块间的依赖关系？哪些可以并行？
- **原则**：垂直切片不水平分层 · 每个任务 3-7 步 · 禁止占位符（TBD/TODO） · RED → GREEN → REFACTOR
- **记录**：依赖图 + 任务清单（每任务：目标 + 文件 + 步骤 + 验证标准）+ 拓扑（serial/parallel/gated）

#### ⑤ 构建（Build）

**codegen（代码生成）**
- **角色**：AI
- **方法论**：文档驱动 — 代码是 contract.md 的投影，不是手写的
- **问**：（无业务问题，从文档推导）
- **原则**：生成代码必须注释决策编号 · 两次生成应该行为一致
- **记录**：ADR（架构决策记录）

#### ⑥ 测试（Test）

**test-strategy（测试策略）**
- T1-T5: 测试类型 / 覆盖策略 / 测试数据 / Mock / CI 集成

**test-cases（测试用例）**
- **角色**：QA + 开发
- **方法论**：场景覆盖 — 测试用例不是代码的翻译，是用户场景的投影
- **问**：PRD 验收条件有哪些？正常流程？边界值？异常场景？并发？
- **原则**：测试用例 = 验收条件的可执行版本 · 先写正常再写边界再写异常
- **记录**：用例清单（按场景分类）+ 优先级 + 预期结果

#### ⑦ 交付（Ship）

**deploy（部署发布）**
- **角色**：DevOps + 开发
- **方法论**：可逆发布 — 每次发布都必须能在 5 分钟内回滚
- **问**：发布频率？审批流程？灰度策略？回滚方案？值班安排？
- **原则**：发布清单 = 上线前的最后防线 · 没有回滚方案 = 不允许发布
- **记录**：发布清单 + 灰度策略 + 回滚步骤 + 监控告警

### Skill vs 产物文档

**Skill 永远抽象，产物文档永远具体。** 这是 Forge 架构的核心分离。

```
Skill（抽象，不过期）              产物文档（具体，每个项目不同）
───────────────────────────────────────────────────────────────
方法论："资源导向设计"              本项目选了什么：父子资源
不变原则："团队经验 > 技术先进性"    本项目团队熟悉：React 19
业务问题："日活多少？"              本项目答案：< 10 万
                                  ↓
                                  模型搜索后推荐具体方案
                                  人类确认
                                  写入产物文档（PRD / contract.md / plan.md）
```

**Skill 里只有三样东西：**

1. **方法论** — 恒久不变的设计思想（需求验证、流程优先、架构权衡、测试金字塔、可逆发布）
2. **业务问题** — 只有人类能回答的（用户是谁、场景是什么、数据量多大、谁来做）
3. **不变原则** — 永远成立的判断（"团队经验 > 技术先进性""没有测试 = 不存在的功能"）

**Skill 里不写具体技术。** 不写 React、PostgreSQL、Docker。具体技术由模型搜索最新方案后推荐，人类确认后写入产物文档。

这样 skill 不会因为技术更替而过期。2027 年 Solid.js 比 React 好了，skill 不需要改，模型自然会推荐新方案。

### 实际项目中的文档结构

```
my-project/
│
├── docs/
│   ├── project.md                    # Project 级（~100 行，很少变）
│   │                                   技术决策 + 共享约束 + feature 索引
│   │
│   └── features/
│       │
│       ├── task-management/          # 一个功能 = 一棵文档树
│       │   ├── contract.md           #   feature 级共享骨架（~80 行）
│       │   ├── api/                  #   API 领域
│       │   │   ├── contract.md       #     只记 feature 特有决策
│       │   │   ├── modules/          #     共享决策指向 project.md
│       │   │   └── changelog.md
│       │   ├── frontend/             #   前端领域
│       │   ├── database/             #   数据库领域
│       │   ├── testing/              #   测试领域
│       │   └── deploy/               #   部署领域
│       │
│       └── billing/                  # 另一个功能，同样结构
│
├── DESIGN.md                         # Project 级（设计系统）
├── AGENTS.md                         # Project 级（AI 行为指令，从 project.md 投影）
├── CLAUDE.md                         # Project 级（入口指针）
│
├── src/                              # 全部由 AI 从文档生成
└── tests/                            # 全部由 AI 从文档生成
```

**Feature 级文档引用 Project 级：**

```markdown
# Task Management — API

> 继承 project.md 共享决策，本文件只记录 feature 特有内容。

## Feature 特有决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D1 | 资源建模 | 父子（Task + Comment） | 评论从属于任务 |

> 分页、错误格式、认证、幂等、并发 → 见 project.md，不重复。
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

---

## feature 级 contract.md

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

每个文件始终 < 200 行。

```
feature/contract.md     ~80 行    几乎不变
api/contract.md         ~100 行   几乎不变
api/modules/*.md        100-200 行  迭代时修改
frontend/contract.md    ~80 行    几乎不变
frontend/modules/*.md   100-200 行  迭代时修改
...
```

AI 按需加载：

```
"加标签功能"
  → 读 feature/contract.md（共享约束，~80 行）
  → 读 api/contract.md + api/modules/tasks.md（参考模式，~220 行）
  → 读 frontend/contract.md + frontend/modules/task-list.md（参考，~200 行）
  → 写 api/modules/labels.md + frontend/modules/labels.md
  → 改 database/contract.md（追加表）
  → 生成代码
  → 总共读 ~500 行，不碰其他领域和模块
```

---

## 完整使用流程

### 流程选择

不是每个项目都需要走完 8 个阶段。根据场景选择：

| 流程 | Command 链 | 适用场景 |
|------|-----------|---------|
| **完整** | brainstorm → init → define → design → detail → plan | 新项目从零开始 |
| **标准** | define → detail → plan | 已有项目，新功能 |
| **快速** | detail → plan | 已有项目，小功能迭代 |
| **最小** | detail | 已有项目，加一个端点 |

**跳过原则**：
- 已有 project.md + DESIGN.md → 跳过 /init
- 需求已经很明确 → 跳过 /brainstorm 和 /define
- 纯后端 API → 跳过 /design
- 只有一个端点 → 跳过 /plan

### Command 体系（决策编排）

只有需要决策的阶段才用 command。command 是编排概念——加载对应 skill，引导人类做选择。可通过自然语言（"做技术详设"）或直接调用 skill（`/api-design`）触发。

| Command | 阶段 | 做什么 | 加载的 skill |
|---------|------|--------|-------------|
| `/forge-brainstorm` | ⓪ 探索 | 发散可能性 + 圈定方向（可选） | brainstorm |
| `/forge-init` | 项目初始化 | 业务目标 + 技术选型 + 设计系统 → project.md + DESIGN.md | business-alignment + technical-design + visual-design |
| `/forge-define` | ① 定义 | 需求分析 + PRD 编写 | requirements |
| `/forge-design` | ② 设计 | 交互规格 + 视觉规范 | interaction-design + visual-design |
| `/forge-detail` | ③ 详设 | 按需加载领域 skill | api-design + db-design（+ frontend-design 按需） |
| `/forge-plan` | ④ 任务 | 垂直切片 + 依赖图 + 自动推导测试 | plan + test-cases |

**原则：决策用 command，执行用自然语言。**

#### 编排细节

| Command | 执行顺序 | 产出 |
|---------|---------|------|
| `/forge-brainstorm` | B1→B5 逐步引导 | `idea-brief.md` |
| `/forge-init` | Phase 1 业务对齐（BA1-BA5）→ Phase 2 技术选型（TD1-TD5）→ Phase 3 设计系统（V1-V5），一次对话完成 | `project.md` + `DESIGN.md` + `AGENTS.md` + `CLAUDE.md` |
| `/forge-define` | R1→R5 逐步引导 | `PRD.md` |
| `/forge-design` | Phase 1 交互设计（I1-I5）→ Phase 2 视觉设计（V1-V5） | `interaction-spec.md` + 更新 `DESIGN.md` |
| `/forge-detail` | Phase 1 数据库（DB1-DB5）→ Phase 2 API（D1-D7）→ Phase 3 前端（F1-F5，按需） | `contract.md` + `modules/*.md` |
| `/forge-plan` | P1→P5 逐步引导，完成后自动推导 test-cases | `plan.md` + `test-cases.md` |

**detail 按需加载判断**：读 project.md 技术选型 → 有没有前端框架？读已有文档 → 有没有 frontend/ 目录？不确定 → 问用户。

> 编排逻辑已内联到 AGENTS.md，不再需要独立的 command 文件。用户可通过自然语言（"做技术详设"）或直接调用 `/forge-brainstorm`、`/init` 等 skill 触发。

### 自然语言（无需决策，AI 直接执行）

| 你说 | AI 做什么 |
|------|----------|
| "生成代码" | 读 plan.md → 按任务序列生成 src/ + tests/ |
| "写测试" | 读 contract.md 验收条件 → 生成测试用例 |
| "发布" | 读 deploy contract → 生成发布清单 |
| "创建任务报 500" | 读 contract.md + 代码 → 找分歧 → 修代码 |
| "给任务加标签" | detail + build 的组合（加模块） |
| "分页换成 cursor" | 改决策 → 级联更新文档 + 重新生成 |
| "React 升级到 20" | 改 project.md → 级联更新 → 重新生成 |
| "整个重写" | 重写所有 contract.md → 删代码 → 重新生成 |

### 用户视角 vs AI 视角

```
显式触发                              自然语言触发                        AI 在背后做的
────────────────────────────────────────────────────────────────────────────────────
/brainstorm 团队提效        "我们想做个内部工具"              →  加载 brainstorm skill
                                                                     → 引导痛点探索 + 方向展开
                                                                     → 生成 idea-brief.md

/forge-init                       "我要做任务管理系统"              →  加载 business-alignment + technical-design + visual-design
                                                                     → 一次对话问完所有业务问题
                                                                     → 搜索方案 → 推荐 → 确认
                                                                     → 生成项目级文件（如不存在）

/forge-define 任务管理            "先做任务管理功能的需求"          →  加载 forge-define skill
                                                                     → 引导需求分析（用户角色？场景？验收条件？）
                                                                     → 生成 PRD.md

/forge-design 任务管理            "做任务管理的交互设计"            →  加载 interaction-design + visual-design
                                                                     → 引导交互设计 + 视觉规范
                                                                     → 生成 interaction-spec.md + 更新 DESIGN.md

/forge-detail 任务管理            "做任务管理的技术详设"            →  加载 api-design + frontend-design + db-design
                                                                     → 按领域逐个引导详设
                                                                     → 生成 contract.md + modules/*.md

/plan 任务管理              "拆分任务管理的任务"              →  加载 plan skill
                                                                     → 垂直切片 + 依赖图 + 执行顺序
                                                                     → 生成 plan.md

                                  "生成代码"                        →  读 plan.md → 按任务序列生成 src/ + tests/

                                  "写测试"                          →  读 contract.md 验收条件 → 生成测试用例

                                  "发布"                            →  读 deploy contract → 生成发布清单

                                  "创建任务时报 500"                →  读 contract.md + 代码 → 找分歧 → 修代码

                                  "给任务加标签功能"                →  detail + build 的组合（加模块）

                                  "分页换成 cursor"                 →  改决策 → 级联更新文档 + 重新生成

                                  "React 升级到 20"                 →  改 project.md → 级联更新 → 重新生成

                                  "整个重写"                        →  重写所有 contract.md → 删代码 → 重新生成
```

### 完整对话示例

```
你：/brainstorm 我们团队想做一个内部工具提效

AI：（加载 brainstorm skill）
  → 痛点具体是什么？当前工作流？想过哪些方向？
  → 搜索：行业里怎么解决类似问题的？
  → 展开 3-5 个方向
  → 你判断：任务管理方向值得做
  → 生成：idea-brief.md

你：/forge-init 团队协作任务管理系统，面向中小企业，1000 DAU，5 人团队

AI：（加载 3 个 skill，一次对话）
  → 业务对齐：目标用户？MVP 范围？成功指标？
  → 技术设计：读写比？一致性？团队技术栈？
  → 视觉设计：品牌？气质？暗色模式？
  → 生成项目级文件（project.md / DESIGN.md / AGENTS.md / CLAUDE.md）

你：/forge-define 任务管理

AI：（加载 forge-define skill）
  → 用户角色有哪些？核心场景 TOP 5？
  → 验收条件怎么定？优先级怎么排？
  → 生成：PRD.md

你：/forge-design 任务管理

AI：（加载 interaction-design + visual-design）
  → 核心操作路径？导航模式？
  → 组件复用？色彩系统？
  → 生成：interaction-spec.md + 更新 DESIGN.md

你：/forge-detail 任务管理

AI：（加载 api-design + frontend-design + db-design）
  → API: D1-D7 → contract.md + modules/tasks.md
  → 前端: F1-F5 → contract.md + modules/*.md
  → 数据库: DB1-DB5 → contract.md

你：/plan 任务管理

AI：（加载 plan skill）
  → contract.md 有哪些模块？依赖关系？
  → 垂直切片：每个任务 = 一个完整用户路径
  → 生成：plan.md（任务清单 + 执行顺序）

你："生成代码"

AI：读 plan.md → 按任务序列生成 src/ + tests/

你："写测试"

AI：读 contract.md 验收条件 → 生成测试用例

你："发布"

AI：读 deploy contract → 生成发布清单 → 执行发布
```

### 迭代模式

```
"给任务加标签功能"：
  AI：
    → 加载相关领域 skill
    → 参考已有模块模式
    → api/modules/labels.md（新建）
    → frontend/modules/labels.md（新建）
    → database/（追加表）
    → 各 changelog.md 追加
    → 生成新文件

"分页从 page 换成 cursor"：
  AI：
    → 加载受影响的 skill
    → 改 api/contract.md D2
    → 改所有 api/modules（分页参数）
    → 改 frontend/modules（分页组件）
    → 追加各 changelog.md
    → 重新生成受影响文件

"整个重写"：
  AI：
    → 重写各领域 contract.md
    → 删 src/ + tests/ + infra/
    → 重新生成全部
```

### Skill 加载策略

| Command | 加载的 skill | 原因 |
|---------|-------------|------|
| `/forge-brainstorm` | forge-brainstorm | 探索阶段，产出方向地图 |
| `/forge-init` | forge-business-alignment + forge-technical-design + forge-visual-design | 项目级决策需要业务 + 技术 + 设计三方对齐 |
| `/forge-define` | forge-define | 需求定义是独立阶段，产出 PRD |
| `/forge-design` | forge-interaction-design + forge-visual-design | 交互和视觉通常同步进行 |
| `/forge-detail` | forge-api-design + forge-db-design（+ forge-frontend-design 按需） | 根据项目上下文选择加载：有前端加 forge-frontend-design，纯后端不加 |
| `/forge-plan` | forge-plan + forge-test-cases | 任务分解后自动推导测试用例 |

**detail 加载判断依据**：
- 读 project.md 技术选型 → 有没有前端框架？
- 读已有文档 → 有没有 frontend/ 目录？
- 如果不确定 → 问用户："这个项目有前端吗？"

**以下操作无需 command，自然语言直接触发：**

| 自然语言 | 加载的 skill | 原因 |
|---------|-------------|------|
| "生成代码" | forge-codegen | 代码生成从文档推导 |
| "写测试" | forge-test-strategy + forge-test-cases | /forge-plan 已自动推导，手动触发可补充 |
| "发布" | forge-deploy | 发布是独立阶段 |
| "创建任务报 500" | 无（读 contract + 代码） | bug 修复是执行动作，不是决策 |
| "给任务加标签" | forge-detail 相关领域 | 参考已有模式，追加新模块 |
| "分页换成 cursor" | 受影响领域 | 级联更新所有引用该决策的文件 |
| "React 升级到 20" | forge-technical-design + 受影响领域 | 技术栈变更影响项目级 + 下游 |
| "整个重写" | 全部 skill | 等同于重新走一遍完整流程 |

### changelog.md 格式

```markdown
## v1.1 — 2026-05-25 — 新增 task labels

### 影响领域
- api: 新增 modules/labels.md（POST/GET /tasks/:id/labels）
- frontend: 新增 modules/labels.md（LabelsPanel 组件）
- database: 追加 labels 表
- testing: 追加标签测试

### 决策变更
- api/D8: labels 作为 task 子资源

### 类型
- 纯追加，不影响已有功能

---

## v1.0 — 2026-05-22 — 初始版本

### 影响领域
- 全部领域首次建立

### 决策
- api: D1-D7 确定
- frontend: F1-F5 确定
- database: DB1-DB5 确定
- testing: T1-T5 确定
- deploy: DP1-DP5 确定
```

---

## 落地机制：投影链

### 两层 AGENTS.md

Forge 的 AGENTS.md 和项目实际使用的 AGENTS.md 是**不同的文件**。

```
Forge 的 AGENTS.md（方法论）
       │
       │ 各阶段按需生成
       ▼
项目的 AGENTS.md（具体指令）  ← 实际项目开发读的是这个
       │
       │ 每次 AI session
       ▼
代码
```

**实际项目里，AI 读的是项目自己的文件，不是 Forge 的：**

```
my-project/
├── CLAUDE.md          ← AI 入口："读 AGENTS.md"
├── AGENTS.md          ← 告诉 AI：在这个项目里怎么工作
├── docs/project.md    ← 技术决策（用什么框架、什么数据库）
├── DESIGN.md          ← 设计语言（什么颜色、什么组件模式）
└── docs/features/
    └── task-management/
        ├── contract.md
        └── api/modules/tasks.md  ← AI 写代码时读这个
```

### forge init 生成项目的 AGENTS.md

Forge 的 skill 在一次 `forge init` 对话中，把所有方法论投影成项目专属指令：

```markdown
# my-project — AI 行为指令

> 从 project.md + DESIGN.md 投影生成，不要手写。

## 技术栈（来自 project.md）
- API: Hono + TypeScript
- 前端: React 19 + Tailwind CSS
- 数据库: PostgreSQL 16 + Drizzle
- 测试: Vitest + testcontainers

## 工作流程（来自 Forge 方法论）
- 新功能 → 先写 contract.md，再生成代码
- 加模块 → 参考已有模块模式，追加 modules/*.md
- 改决策 → 更新 contract.md，重新生成受影响文件
- 每个关键逻辑分支注释决策编号（D1-D7, AC1-AC8）

## 设计约束（来自 DESIGN.md）
- 主色: #2563EB
- 间距: 4px 基准网格
- 组件模式: 受控组件 + 组合模式

## 文档引用
- 技术决策 → docs/project.md
- 设计系统 → DESIGN.md
- 功能合约 → docs/features/<feature>/contract.md
```

### 实际开发时，AI 只读项目文件

```
你（在 my-project 目录）："加一个标签功能"

AI 的行为：
  1. 读 CLAUDE.md → "读 AGENTS.md"
  2. 读项目的 AGENTS.md → 知道工作流程
  3. 读 docs/project.md → 知道技术栈
  4. 读 docs/features/task-management/contract.md → 知道已有结构
  5. 参考 api/modules/tasks.md → 知道模块格式
  6. 写 api/modules/labels.md + 生成代码
```

**Forge 的 AGENTS.md 只在 `forge init` 时被加载，之后项目靠自己的文件运转。**

### 类比

```
Forge AGENTS.md     →  编译器源码
项目 AGENTS.md      →  编译产物（可执行文件）
项目 contract.md    →  输入数据
项目代码            →  输出
```

用户不需要安装 Forge 源码来运行项目，就像用户不需要编译器源码来运行程序。各阶段 command 就是"编译"步骤——把方法论编译成项目专属指令。

### 资源引用链

**Skill 不引用资源。** Skill 是纯方法论，只定义"问什么问题、怎么思考、记录什么"。

```
Skill（抽象）        →  "问日活多少，推荐方案，记录决策"
forge init（执行器） →  加载 skill + 模板 → 生成项目文件
项目 AGENTS.md       →  告诉 AI 文件在哪、格式是什么
```

**原因：**
- Skill 引用模板 = 把执行逻辑混进方法论
- 破坏了"Skill 永远抽象"的原则
- 模板和文件路径是项目级决策，不是方法论

**引用关系只存在于项目文件中：**
- 项目 AGENTS.md → 引用 project.md 和 DESIGN.md
- Feature contract.md → 引用领域级 contract.md
- 模块文件 → 互相引用（api/modules/*.md ↔ frontend/modules/*.md）

---

## Forge 项目本身

```
forge/
├── AGENTS.md                       # 本文件（含核心理念）
│
├── skills/                         # 决策协议（17 个，flat list）
│   ├── forge-brainstorm/           # ⓪ 可能性探索
│   ├── forge-init/                 # 项目初始化编排
│   ├── forge-business-alignment/   # ① 业务对齐
│   ├── forge-define/         # ① 需求文档
│   ├── forge-design/               # 设计阶段编排
│   ├── forge-interaction-design/   # ② 交互设计
│   ├── forge-visual-design/        # ② 视觉设计
│   ├── forge-technical-design/     # ② 技术设计
│   ├── forge-detail/               # 详设阶段编排
│   ├── forge-api-design/           # ③ API 详设（D1-D7）
│   ├── forge-frontend-design/      # ③ 前端详设（F1-F5）
│   ├── forge-db-design/            # ③ 数据库详设（DB1-DB5）
│   ├── forge-plan/                 # ④ 任务分解
│   ├── forge-codegen/              # ⑤ 代码生成
│   ├── forge-test-strategy/        # ⑥ 测试策略（T1-T5）
│   ├── forge-test-cases/           # ⑥ 测试用例
│   └── forge-deploy/               # ⑦ 部署发布
│
├── contracts/                      # 文档模板（11 个）
│   ├── idea-brief-template.md      # 方向简报模板
│   ├── prd-template.md             # 需求文档模板
│   ├── interaction-template.md     # 交互规格模板
│   ├── design-system-template.md   # 设计系统模板
│   ├── project-template.md         # 项目技术决策模板（含业务目标段落）
│   ├── contract-template.md        # 技术合约模板
│   ├── module-template.md          # 模块模板
│   ├── plan-template.md            # 任务分解模板
│   ├── test-cases-template.md      # 测试用例模板
│   ├── release-template.md         # 发布清单模板
│   └── changelog-template.md       # 迭代日志模板
│
├── hooks/                          # 插件钩子
│   ├── session-start.sh
│   └── careful.sh
│
├── .claude-plugin/plugin.json      # Claude Code 插件
└── .codex-plugin/plugin.json       # Codex CLI 插件
```

---

## 验证教训

2026-05-22 端到端验证：从 contract.md 生成实现 → 删除 → 从同一份 contract.md 重建 → 对比一致性。

### 四层结构各层不可替代

| 层 | 回答的问题 | 如果缺失 |
|---|-----------|---------|
| WHAT（需求 + 验收条件） | 做什么？怎么算对？ | 测试无法推导，边界条件遗漏 |
| WHY（决策 + 理由 + 拒绝） | 为什么不用 cursor 分页？ | 新 session 会重新做一遍决策，且可能选不同方案 |
| HOW（数据模型 + 接口合约 + 技术栈） | 字段叫什么？状态码多少？ | 两次生成的实现会 diverge |
| CONSTRAINTS（安全 + 性能 + 兼容） | 多租户怎么隔离？索引怎么建？ | 生成的代码缺少非功能性考量 |

**WHY 层是 Forge 独有的价值。** 传统文档只记 WHAT 和 HOW。但"为什么选 page 而不是 cursor""为什么错误用 RFC 9457 而不是轻量格式"——这些信息一旦丢失，未来模型无法做出一致的扩展决策。

### 接口合约段的格式足够结构化

缩进伪代码描述（Auth / Request / Response / Errors / Notes），不是 YAML 也不是 JSON Schema，但两次独立生成的 AI 都正确解析了。人类可读 > 机器可解析。

### 目录结构路径必须无歧义

**踩坑**：contract.md 写了 `tests/` 在 `src/` 外面，但 agent 生成为 `src/tests/`。

**修复**：目录结构段用完整路径，或在结构图上方加说明。

### 代码注释引用决策编号 = 可追溯链

生成代码时，每个关键逻辑分支注释对应的决策编号（D1-D7、AC1-AC8）。人类审查代码时可直接跳转 contract.md 理解 WHY。

### 验证文档完备性的唯一方法

**删除代码后重建。** 两个隔离 session 只读同一份 contract.md 能生成行为一致的 API = 文档完备。

### 两次生成结果

| 维度 | 一致性 |
|------|--------|
| 文件结构 | 13/14（测试目录位置有偏差） |
| 技术栈 | ✅ 完全一致 |
| 业务逻辑 | ✅ 一致 |
| 错误码 | ✅ 一致 |
| 测试覆盖 | ✅ 一致 |
| 代码风格 | 差异 ~20%，不影响 API 行为 |

**API 行为一致性 100%。**

---

## 状态

- ✅ 全生命周期架构已设计（8 阶段 × 14 个 skill）
- ✅ 14 个 Skill 全部完成（SKILL.md 均已编写，flat list 结构）
- ✅ 6 个 Command 编排已合入 AGENTS.md（brainstorm / init / define / design / detail / plan）
- ✅ 11 个文档模板已完成（idea-brief / PRD / interaction / design-system / project / contract / module / plan / test-cases / release / changelog）
- ✅ 流程选择机制已加入（完整 / 标准 / 快速 / 最小 4 种流程）
- ✅ /detail 按需加载（根据项目上下文选择领域 skill）
- ✅ /plan 后自动推导测试用例（test-cases 不再需要手动触发）
- ✅ project-charter 合入 project.md（小项目不需要独立文件）
- ✅ Skill 抽象化：只含方法论 + 业务问题 + 不变原则，不写死具体技术
- ✅ 多领域架构已通过 task-management 验证（15 个文件，5 个领域）
- ✅ 三层文档体系已建立（Root / Project / Feature）
- ✅ Command 编排已合入 AGENTS.md（消除 command/skill 重复，编排逻辑内联）
- ✅ 双触发模式（决策用 command 或自然语言，执行用自然语言）
- ✅ 投影链机制已明确（Forge AGENTS.md → 项目 AGENTS.md → 代码）
- ✅ Plugin 配置已就绪（.claude-plugin + .codex-plugin + hooks）
- ✅ session-start.sh 已更新（对齐 8 阶段架构，移除 CANON.md 引用）
