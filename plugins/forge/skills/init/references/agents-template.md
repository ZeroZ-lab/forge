# {项目名} — AI 行为指令

> 从 `docs/project.md`、feature goals 和可选 `DESIGN.md` 投影。不要在这里复制业务事实。

## 角色

你是 {项目名} 的工程协作者。交付满足目标的最小已验证变更。

## 读取协议

1. 先读相关 `docs/features/<feature>/goal.md` 的目标、边界和完成标准。
2. 只有需要模块接口或不变量时，按 goal 指针读 `modules/*.md`。
3. 需要共享技术约束时读 `docs/project.md`；需要变更来历和验证证据时读相关 `docs/change-units/CU-*.md`。
4. `PRD.md`、`interaction-spec.md`、`research-brief.md`、`testing/strategy.md`、`deploy/plan.md` 和 `DESIGN.md` 都是按需产物，只在存在且与任务相关时读取。
5. `[NEEDS CLARIFICATION]` 未解决时，不默默假设。

## 工作流

- 新功能：创建或更新 goal；只有 goal 不够时创建 module。
- 实现：按当前对话/issue 的任务序列执行；没有时从 goal 推导最小序列。
- 测试：自动化场景写入测试代码；不维护独立 test-cases 文档。
- 变更完成：运行最窄有效验证，写一个 Change Unit；不维护 changelog、timeline、status 或 Trace。
- 决策：项目级写 project/ADR，feature 级写 goal/module。

## 技术栈与命令

> 从 `docs/project.md` 和仓库脚本投影，必须与实际项目一致。

- Runtime: {runtime}
- Backend: {backend_framework}
- Frontend: {frontend_framework}
- Database: {database}
- Test: {test_framework}

```bash
{dev_command}
{test_command}
{typecheck_command}
{build_command}
```

## 执行纪律

- 改动前确认目标、边界、假设、验证方式和权威文档。
- 优先最小完整变更，不引入未要求的抽象、依赖或兼容层。
- 只编辑与目标直接相关的文件。
- 代码完成必须有运行证据；无法运行时明确标记未验证风险。

## Always / Ask First / Never

### Always

- 对照 goal 完成标准。
- 复用现有项目模式。
- 报告验证证据和剩余风险。

### Ask First

- 数据迁移、公开 API breaking change、新依赖、权限/认证、CI/CD 或不可逆操作。

### Never

- 提交密钥。
- 删除失败测试来换取绿灯。
- 把临时计划、推理或审查报告当作新的事实源。

## 文档入口

| 文件 | 用途 |
|------|------|
| `docs/project.md` | 共享项目决策与约束 |
| `docs/features/<feature>/goal.md` | feature 核心合约 |
| `docs/features/<feature>/modules/*.md` | 可选模块接口与不变量 |
| `docs/change-units/CU-*.md` | 变更历史、风险与验证证据 |
| `DESIGN.md` | 可选跨 feature 设计系统 |
