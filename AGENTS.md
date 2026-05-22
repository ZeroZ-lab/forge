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

---

## 多领域架构

一个功能不只有 API。Forge 用多个 skill 覆盖软件开发的各个领域，每个 skill 遵循相同范式：

```
决策协议（skill）→ 文档（contract.md + modules/）→ 代码投影（AI 生成）
```

### Skill 体系

```
forge/skills/
├── api-design/           # D1-D7: 资源建模/分页/错误/权限/幂等/并发/认证
├── frontend-design/      # F1-F5: 框架/状态管理/样式/数据请求/表单
├── db-design/            # DB1-DB5: 选型/ID策略/索引/迁移/软删除
├── test-strategy/        # T1-T5: 测试类型/覆盖策略/测试数据/Mock/CI集成
└── deploy-design/        # DP1-DP5: 运行环境/容器化/CI-CD/环境管理/监控
```

### Skill vs Contract.md

**Skill 永远抽象，contract.md 永远具体。** 这是 Forge 架构的核心分离。

```
Skill（抽象，不过期）              Contract.md（具体，每个项目不同）
───────────────────────────────────────────────────────────────
方法论："资源导向设计"              本项目选了什么：父子资源
不变原则："团队经验 > 技术先进性"    本项目团队熟悉：React 19
业务问题："日活多少？"              本项目答案：< 10 万
                                  ↓
                                  模型搜索后推荐具体方案
                                  人类确认
                                  写入 contract.md（React 19 + 理由）
```

**Skill 里只有三样东西：**

1. **方法论** — 恒久不变的设计思想（资源导向、测试金字塔、可逆部署）
2. **业务问题** — 只有人类能回答的（日活多少、团队几个人、数据量多大）
3. **不变原则** — 永远成立的判断（"团队经验 > 技术先进性""没有测试 = 不存在的功能"）

**Skill 里不写具体技术。** 不写 React、PostgreSQL、Docker。具体技术由模型搜索最新方案后推荐，人类确认后写入 contract.md。

这样 skill 不会因为技术更替而过期。2027 年 Solid.js 比 React 好了，skill 不需要改，模型自然会推荐新方案。

### 实际项目中的文档结构

```
my-project/
│
├── docs/features/
│   │
│   ├── task-management/                  # 一个功能 = 一棵文档树
│   │   │
│   │   ├── contract.md                   # feature 级共享骨架（~80 行）
│   │   │                                   跨领域共享约束 + 模块索引
│   │   │
│   │   ├── api/                          # API 领域
│   │   │   ├── contract.md               #   D1-D7 决策 + 共享数据模型 + 技术选型
│   │   │   ├── modules/
│   │   │   │   ├── tasks.md              #   Task CRUD 端点
│   │   │   │   ├── comments.md           #   评论端点
│   │   │   │   └── labels.md             #   标签端点
│   │   │   └── changelog.md
│   │   │
│   │   ├── frontend/                     # 前端领域
│   │   │   ├── contract.md               #   F1-F5 决策 + 组件架构
│   │   │   ├── modules/
│   │   │   │   ├── task-list.md          #   任务列表页
│   │   │   │   ├── task-detail.md        #   任务详情页
│   │   │   │   └── task-form.md          #   任务表单
│   │   │   └── changelog.md
│   │   │
│   │   ├── database/                     # 数据库领域
│   │   │   ├── contract.md               #   DB1-DB5 决策 + 索引策略
│   │   │   └── changelog.md
│   │   │
│   │   ├── testing/                      # 测试领域
│   │   │   ├── contract.md               #   T1-T5 决策 + 覆盖策略
│   │   │   └── changelog.md
│   │   │
│   │   └── deploy/                       # 部署领域
│   │       ├── contract.md               #   DP1-DP5 决策
│   │       └── changelog.md
│   │
│   └── billing/                          # 另一个功能，同样的结构
│       ├── contract.md
│       ├── api/
│       ├── frontend/
│       └── ...
│
├── src/                                  # 全部由 AI 从文档生成
│   ├── routes/                           # ← api/ 文档
│   ├── schemas/                          # ← api/ 文档
│   ├── middleware/                        # ← api/ contract.md
│   ├── components/                       # ← frontend/ 文档
│   ├── hooks/                            # ← frontend/ 文档
│   ├── stores/                           # ← frontend/ 文档
│   ├── db/                               # ← database/ 文档
│   └── infra/                            # ← deploy/ 文档
│
└── tests/                                # 全部由 AI 从文档生成
    ├── api/                              # ← testing/ + api/ 文档
    ├── frontend/                         # ← testing/ + frontend/ 文档
    └── e2e/                              # ← testing/ 文档
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

## 工作流程

### 开发一个完整功能

```
你："做一个任务管理系统"

── 第 1 步：API 设计 ──
AI：加载 api-design skill → 引导 D1-D7
你：逐个选择
AI：→ api/contract.md + api/modules/tasks.md

── 第 2 步：数据库设计 ──
AI：加载 db-design skill → 引导 DB1-DB5
AI：复用 api/ 中的数据模型
你：逐个选择
AI：→ database/contract.md

── 第 3 步：前端设计 ──
AI：加载 frontend-design skill → 引导 F1-F5
AI：引用 api/ 的端点合约
你：逐个选择
AI：→ frontend/contract.md + frontend/modules/*.md

── 第 4 步：测试策略 ──
AI：加载 test-strategy skill → 引导 T1-T5
AI：引用所有领域的验收条件
你：逐个选择
AI：→ testing/contract.md

── 第 5 步：部署设计 ──
AI：加载 deploy-design skill → 引导 DP1-DP5
你：逐个选择
AI：→ deploy/contract.md

── 生成代码 ──
你："生成代码"
AI：从 5 份 contract + modules 生成 src/ + tests/ + infra/
```

### 迭代开发

```
加模块（跨领域）：
  你："给任务加标签功能"
  AI：
    → api/modules/labels.md（新建）
    → frontend/modules/labels.md（新建）
    → database/（追加表）
    → testing/（追加测试）
    → 各 changelog.md 追加
    → 生成新文件

改决策（影响所有领域）：
  你："分页从 page 换成 cursor"
  AI：
    → 改 api/contract.md D2
    → 改所有 api/modules（分页参数）
    → 改 frontend/modules（分页组件）
    → 追加各 changelog.md
    → 重新生成受影响文件

大重构：
  你："整个重写"
  AI：
    → 重写各领域 contract.md
    → 删 src/ + tests/ + infra/
    → 重新生成全部
```

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

## Forge 项目本身

```
forge/
├── CANON.md                        # 3 条宪法
├── AGENTS.md                       # 本文件
│
├── skills/                         # 决策协议（5 个）
│   ├── api-design/SKILL.md         # D1-D7: 资源/分页/错误/权限/幂等/并发/认证
│   ├── frontend-design/SKILL.md    # F1-F5: 框架/状态/样式/请求/表单
│   ├── db-design/SKILL.md          # DB1-DB5: 选型/ID/索引/迁移/软删除
│   ├── test-strategy/SKILL.md      # T1-T5: 类型/覆盖/数据/Mock/CI
│   └── deploy-design/SKILL.md      # DP1-DP5: 环境/容器/CI-CD/环境管理/监控
│
├── contracts/                      # 文档模板
│   ├── contract-template.md        # 领域级 contract.md 模板
│   ├── module-template.md          # 模块模板
│   └── changelog-template.md       # 迭代日志模板
│
├── hooks/                          # 插件钩子（2 个）
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

✅ 5 个 skill 全部完成，多领域架构已通过 task-management 验证。
