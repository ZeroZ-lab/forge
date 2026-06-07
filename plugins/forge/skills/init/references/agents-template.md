# {项目名} — AI 行为指令

> 从 project.md + DESIGN.md 生成，不要手写。

## 角色

你是 {项目名} 的开发搭档。在这个项目里，文档是目标约束。

## 技术栈（来自 project.md）

- Runtime: {runtime}
- 后端: {backend_framework}
- 前端: {frontend_framework}
- 数据库: {database}
- ORM: {orm}
- 测试: {test_framework}
- 部署: {deploy_target}

## 命令

```bash
# 开发
{dev_command}

# 构建
{build_command}

# 测试（全量）
{test_command}

# 测试（单文件）
{test_single_command}

# 类型检查
{typecheck_command}
```

## 项目结构

> 从 project.md「工程约束 → 模块边界」生成。必须与实际目录一致。不使用默认结构假设。

```
{project_directory_tree — 从 project.md 工程约束提取，对照实际目录}
```

## 工作流

- 新功能 → 先写 goal.md，再生成代码
- 加模块 → 参考已有模块模式，追加 modules/*.md
- 改决策 → 更新 goal.md，重新生成受影响文件
- 每个关键逻辑分支注释决策编号（FD# feature 级 / PD# 项目级 / DB# 数据库级）
- 测试失败 → 读目标文档找分歧，修代码对齐

## AI 执行纪律

- 改动前先确认目标、边界、假设和需要同步的目标文件。
- 优先做满足当前目标的最小变更，不引入未要求的抽象、配置或兼容层。
- 只编辑与目标直接相关的文件；发现无关问题只记录，不顺手修改。
- 每次代码或目标文档变更后，说明验证方式并执行可用验证。

## Skill 调用深度

- L0 lens：只分析、判断或 review 一个点，不改文件。
- L1 patch：局部修改 goal 或代码，必须执行可用验证。
- L2 stage：完整阶段执行，必须产出或更新阶段文档和历史记录。
- 用户未显式点名阶段时，默认选择最小相关 skill 做 L0/L1 轻量调用。
- 用户显式点名阶段或 skill 时，默认 L2 阶段调用，除非用户说"只看看"、"简单 review"或等价限制。
- 轻量调用如果改变目标语义，必须回写对应文档。

## 代码标准

- {coding_standard_1}
- {coding_standard_2}
- {coding_standard_3}

## 设计约束（来自 DESIGN.md）

- 主色: {primary_color}
- 间距: {spacing_system}
- 组件模式: {component_pattern}

## 边界

### Always
- 注释决策编号（FD# / PD# / DB#）
- 测试通过再提交
- 读目标文档确认接口定义

### Ask First
- Schema 变更（影响数据库迁移）
- 添加新依赖
- 修改 CI/CD 配置
- 删除或重命名公开 API

### Never
- 提交密钥或凭证
- 删除失败的测试（应该修代码）
- 绕过类型检查（用 any / @ts-ignore）
- 手动修改生成的代码（改目标文档重新生成）

## 历史维护（自动，每次文档变更后执行）

- 改完文档 → 追加 docs/features/<feature>/changelog.md（触发 + 产出 + 决策）
- 完成阶段 → 追加 docs/timeline.md（一条 = 一次发布）
- 每次开发前 → 读 timeline.md + changelog.md 了解上下文
- timeline.md 或 changelog.md 超 100 行 → 旧记录归档到 timeline/ 或 changelog/

## 文档引用

| 文件 | 用途 |
|------|------|
| docs/project.md | 技术决策 + 共享约束 |
| docs/timeline.md | 项目演进时间线 |
| DESIGN.md | 设计系统 |
| docs/features/<feature>/goal.md | 功能目标 |
| docs/features/<feature>/changelog.md | 功能变更历史 |
