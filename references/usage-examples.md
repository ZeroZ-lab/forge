# Forge 使用示例

> 从 AGENTS.md 移出，供需要时查阅。

## 完整对话示例

```
你：/brainstorm 我们团队想做一个内部工具提效

AI：（加载 forge-brainstorm）
  → 痛点具体是什么？当前工作流？想过哪些方向？
  → 搜索：行业里怎么解决类似问题的？
  → 展开 3-5 个方向
  → 你判断：任务管理方向值得做
  → 生成：idea-brief.md

你：/init 团队协作任务管理系统，面向中小企业，1000 DAU，5 人团队

AI：（加载 3 个 skill，一次对话）
  → 业务对齐：目标用户？MVP 范围？成功指标？
  → 技术设计：读写比？一致性？团队技术栈？
  → 视觉设计：品牌？气质？暗色模式？
  → 生成项目级文件（project.md / DESIGN.md / AGENTS.md / CLAUDE.md）

你：/define 任务管理

AI：（加载 forge-define skill）
  → 用户角色有哪些？核心场景 TOP 5？
  → 验收条件怎么定？优先级怎么排？
  → 生成：PRD.md

你：/design 任务管理

AI：（加载 forge-interaction-design + forge-visual-design）
  → 核心操作路径？导航模式？
  → 组件复用？色彩系统？
  → 生成：interaction-spec.md + 更新 DESIGN.md

你：/detail 任务管理

AI：（加载 forge-api-design + forge-db-design + forge-frontend-design）
  → API: D1-D7 → contract.md + modules/tasks.md
  → 数据库: DB1-DB5 → contract.md
  → 前端: F1-F5 → contract.md + modules/*.md

你：/plan 任务管理

AI：（加载 forge-plan + forge-test-cases）
  → contract.md 有哪些模块？依赖关系？
  → 垂直切片：每个任务 = 一个完整用户路径
  → 生成：plan.md（任务清单 + 执行顺序）+ testing/test-cases.md

你："生成代码"

AI：读 plan.md → 按任务序列生成 src/ + tests/

你：/test 任务管理

AI：（加载 forge-test-strategy + forge-test-cases）
  → 测试策略：测试类型？覆盖范围？Mock 策略？
  → 测试用例：正常路径？边界情况？错误处理？
  → 生成：testing/contract.md + testing/test-cases.md

你：/deploy 任务管理

AI：（加载 forge-deploy）
  → 运行环境？容器化？CI/CD？灰度策略？
  → 回滚方案？监控告警？
  → 生成：deploy/contract.md
```

## 迭代模式

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

## AI 行为示例

```
你（在 my-project 目录）："加一个标签功能"

AI 的行为：
  1. 读 CLAUDE.md → "读 AGENTS.md"
  2. 读项目的 AGENTS.md → 知道工作流程
  3. 读 docs/project.md → 知道技术栈
  4. 读 docs/timeline.md → 知道项目近期演进（避免重复决策）
  5. 读 docs/features/task-management/contract.md → 知道已有结构
  6. 读 docs/features/task-management/changelog.md → 知道这个功能的变更历史
  7. 参考 api/modules/tasks.md → 知道模块格式
  8. 写 api/modules/labels.md + 生成代码
  9. 自动追加 changelog.md 一条记录（触发 + 决策 + 影响）
  10. 自动追加 timeline.md 一条记录
```

## forge init 生成的 AGENTS.md 示例

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

## 历史维护（自动，每次文档变更后执行）
- 改完文档 → 追加 docs/features/<feature>/changelog.md（触发 + 产出 + 决策）
- 完成阶段 → 追加 docs/timeline.md（一条 = 一次发布）
- 每次开发前 → 读 timeline.md + changelog.md 了解上下文
- timeline.md 或 changelog.md 超 100 行 → 旧记录归档到 timeline/ 或 changelog/

## 设计约束（来自 DESIGN.md）
- 主色: #2563EB
- 间距: 4px 基准网格
- 组件模式: 受控组件 + 组合模式

## 文档引用
- 技术决策 → docs/project.md
- 设计系统 → DESIGN.md
- 功能合约 → docs/features/<feature>/contract.md
```
