# Forge

**文档是源代码，代码是投影。**

Forge 是一个为 AI 开发工作流设计的决策协议框架。它把文档从代码的衍生品变成项目的唯一真相——每个技术决策都被记录在 contract.md 中，AI 从文档生成代码。模型越强，同一份文档生成的代码越好。

## 核心理念

```
旧认知：代码是源代码，文档是衍生品
Forge：文档是源代码，代码是文档在某个模型能力下的投影
```

同一份合约文档：
- 2024 + GPT-4 → Express + React 18 + CSS Modules
- 2025 + Claude 4 → Hono + React 19 + Tailwind
- 2027 + 更强模型 → 更好的实现，合约不变

**代码会腐烂，但决策不会过期。**

## 安装

### 方式一：插件安装（推荐）

```bash
# 克隆 Forge
git clone https://github.com/ZeroZ-lab/forge.git
cd forge

# 注册为 Claude Code 插件
claude plugin install --path .
```

安装后在任意项目中启动 Claude Code，Forge 的 18 个 skill 自动可用。

### 方式二：个人 Skill 安装

```bash
# 克隆 Forge
git clone https://github.com/ZeroZ-lab/forge.git
cd forge

# 把所有 skill 软链到个人 skills 目录
for skill in skills/forge-*/; do
  ln -s "$(pwd)/$skill" "$HOME/.claude/skills/$(basename $skill)"
done
```

### 方式三：项目级安装

```bash
# 在你的项目目录下
mkdir -p .claude/skills

# 把需要的 skill 软链进来
ln -s /path/to/forge/skills/forge-init .claude/skills/forge-init
ln -s /path/to/forge/skills/forge-detail .claude/skills/forge-detail
# ... 按需添加
```

## 快速开始

### 选择你的流程

不是每个项目都需要走完全部阶段：

| 流程 | 适用场景 | Command 链 |
|------|---------|-----------|
| **完整** | 新项目从零开始 | forge-brainstorm → forge-init → forge-define → forge-design → forge-detail → forge-plan |
| **标准** | 已有项目，新功能 | forge-define → forge-detail → forge-plan |
| **快速** | 已有项目，小功能 | forge-detail → forge-plan |
| **最小** | 加一个端点 | forge-detail |

**跳过原则**：已有 project.md → 跳过 /forge-init；需求明确 → 跳过 /forge-define；纯后端 → 跳过 /forge-design。

以下以完整流程为例：

### 1. 探索想法

```
/forge-brainstorm 我想做一个团队协作工具
```

Forge 会引导你探索：
- 痛点具体是什么？
- 当前怎么解决的？
- 想过哪些方向？
- 有没有参考产品？

产出：`docs/features/<feature>/idea-brief.md`

### 2. 初始化项目

```
/forge-init 任务管理系统
```

Forge 一次对话完成：
- 业务对齐（目标用户、MVP 范围、成功标准）
- 技术选型（架构模式、技术栈、数据库）
- 设计系统（色彩、字体、间距、组件库）

产出：`project.md` + `DESIGN.md` + `AGENTS.md` + `CLAUDE.md`

### 3. 定义需求

```
/forge-define 任务管理
```

引导需求分析：
- 用户故事（Given-When-Then 格式）
- 验收条件
- 非功能需求（性能、安全、可用性）
- 范围排除

产出：`PRD.md`

### 4. 设计系统

```
/forge-design 任务管理
```

交互设计 + 视觉设计：
- 核心操作路径
- 信息架构
- 页面线框
- 组件复用

产出：`interaction-spec.md` + 更新 `DESIGN.md`

### 5. 技术详设

```
/forge-detail 任务管理
```

按需加载领域 skill：
- 有前端 → API 设计 + 前端设计 + 数据库设计
- 纯后端 → API 设计 + 数据库设计

产出：`contract.md` + `modules/*.md`

### 6. 任务分解

```
/forge-plan 任务管理
```

垂直切片：
- 模块识别 + 依赖图
- 每个任务 = 一个完整用户路径（schema + API + UI）
- 拓扑排序（串行/并行/门控）
- **自动推导测试用例**（test-cases.md）

产出：`plan.md` + `test-cases.md`

### 7. 生成代码（自然语言）

```
生成代码
```

AI 读取 `plan.md`，按任务序列生成 `src/` + `tests/`。

### 8. 测试规划

```
/forge-test 任务管理
```

测试策略 + 测试用例：
- 测试类型 + 覆盖策略 + Mock 策略
- 从验收条件推导测试场景

产出：`testing/contract.md` + `test-cases.md`

### 9. 发布规划

```
/forge-deploy 任务管理
```

灰度策略 + 回滚方案 + 监控告警：
- 运行环境 + 容器化 + CI/CD
- 回滚步骤（具体命令）
- 健康检查 + 告警

产出：`deploy/contract.md`

## 8 阶段 × 18 个 Skill

| 阶段 | Skill | 产出 |
|------|-------|------|
| ⓪ 探索 | brainstorm | idea-brief.md |
| ① 定义 | business-alignment | project.md 业务目标段落 |
| | requirements | PRD.md |
| ② 设计 | interaction-design | interaction-spec.md |
| | visual-design | DESIGN.md |
| | technical-design | project.md |
| ③ 详设 | api-design | contract.md + modules/ |
| | frontend-design | contract.md + modules/ |
| | db-design | contract.md |
| ④ 任务 | plan | plan.md |
| ⑤ 构建 | codegen | src/ + tests/ |
| ⑥ 测试 | test-strategy | testing/contract.md |
| | test-cases | test-cases.md |
| ⑦ 交付 | deploy | deploy/contract.md |

## 9 个决策 Command

只有需要决策的阶段才用 command。command 加载 skill，引导人类做选择。

| Command | 做什么 |
|---------|--------|
| `/forge-brainstorm` | 发散可能性 + 圈定方向 |
| `/forge-init` | 业务目标 + 技术选型 + 设计系统 → project.md + DESIGN.md |
| `/forge-define` | 需求分析 + PRD 编写 |
| `/forge-design` | 交互规格 + 视觉规范 |
| `/forge-detail` | 按需加载领域 skill（API + DB + 前端按需） |
| `/forge-plan` | 垂直切片 + 依赖图 + 自动推导测试用例 |
| `/forge-test` | 测试策略 + 测试用例 |
| `/forge-deploy` | 灰度策略 + 回滚方案 + 监控告警 |

## 自然语言触发（无需决策）

| 你说 | AI 做什么 |
|------|----------|
| "生成代码" | 读 plan.md → 按任务序列生成 src/ + tests/ |
| "创建任务报 500" | 读 contract.md + 代码 → 找分歧 → 修代码 |
| "给任务加标签" | detail + build 的组合（加模块） |
| "分页换成 cursor" | 改决策 → 级联更新文档 + 重新生成 |
| "React 升级到 20" | 改 project.md → 级联更新 → 重新生成 |
| "整个重写" | 重写所有 contract.md → 删代码 → 重新生成 |

## 三层文档体系

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

## 项目结构

```
my-project/
│
├── docs/
│   ├── project.md                    # Project 级（技术决策 + 共享约束）
│   ├── timeline.md                   # 项目时间线（最近 10 条详细，≤100 行）
│   ├── timeline/                     # 时间线归档（按年/季度）
│   │
│   └── features/
│       │
│       ├── task-management/          # 一个功能 = 一棵文档树
│       │   ├── contract.md           #   feature 级共享骨架
│       │   ├── changelog.md          #   功能变更历史（最近 5 条，≤100 行）
│       │   ├── changelog/            #   变更历史归档
│       │   ├── api/                  #   API 领域
│       │   │   ├── contract.md
│       │   │   └── modules/
│       │   ├── frontend/             #   前端领域
│       │   ├── database/             #   数据库领域
│       │   ├── testing/              #   测试领域
│       │   └── deploy/               #   部署领域
│       │
│       └── billing/                  # 另一个功能，同样结构
│
├── DESIGN.md                         # Project 级（设计系统）
├── AGENTS.md                         # Project 级（AI 行为指令）
├── CLAUDE.md                         # Project 级（入口指针）
│
├── src/                              # 全部由 AI 从文档生成
└── tests/                            # 全部由 AI 从文档生成
```

## 核心原则

### 1. 决策留痕

每个技术选择都必须记录：选了什么、为什么选、拒绝什么。框架会换，人会走，决策记录是项目唯一不会过时的东西。

### 2. 文档即源代码

文档不是代码的注释，文档是代码的源头。一份好的 contract.md 应该让任何未来模型重建系统。模型越强，从同一份文档生成的代码越好。

### 3. 人类决策，AI 执行

AI 呈现选项 + 代价，人类做选择，AI 记录决策 + 生成实现。AI 不应该替人类做架构决策——在关键分歧点停下来，等人类确认，把选择固化成文档。

## Skill 抽象

Skill 永远抽象，产物文档永远具体。

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

## 贡献

见 CONTRIBUTING.md（待写）。

## 许可证

MIT
