# Forge 使用示例

## 1. 小功能：默认链

```text
用户：给任务加归档功能

detail
  → 创建/更新 docs/features/task-archive/goal.md
  → 只有接口或不变量复杂时才创建 modules/*.md

codegen
  → 从 goal 推导最小任务序列
  → 修改 src/ + tests/
  → 运行最窄有效验证

review
  → 对话中输出 findings

完成
  → 写一个 docs/change-units/CU-*.md
```

不创建 PRD、plan、test-cases、changelog、timeline、status 或 Trace。

## 2. 边界不清：define 前置

```text
用户：给任务做一个更好用的搜索

define
  → 澄清用户、范围、非目标、可测试完成标准
  → 默认直接写入 feature goal

research（出现搜索算法不确定性）
  → 对话中给 BM25 / vector / hybrid 菜单
  → 接受的选择写入 goal/project/ADR

detail → codegen → review
```

只有产品合约有独立 owner/审批时创建 PRD；只有研究证据需独立复核/交接时创建 research brief。

## 3. 复杂计划

```text
用户：先把这个跨模块改动拆清楚

plan
  → 在当前对话或 issue 中输出垂直切片
  → 标注依赖、并行项、风险优先项和每片验证证据
```

不创建 `plan.md`。任务状态由 issue tracker 或执行系统维护。

## 4. 测试

```text
test-strategy
  → 风险、层级、数据、mock、CI gate

test-cases
  → AC 对应的正常/边界/错误/权限场景矩阵

实现
  → 自动化场景写入 tests/
```

只有独立 QA、合规或跨模块测试治理时创建 `testing/strategy.md`；不创建 `testing/test-cases.md`。

## 5. 发布

普通发布清单在对话中给出，并把运行证据写入 CU。只有生产 rollout、数据迁移、回滚操作或运维交接需要独立维护时创建 `deploy/plan.md`。

## 6. 思考与审查

`think` 和 `review` 默认在对话中完成。被接受的结论写回 project/goal/module/ADR；只有多次复用且有明确失效条件的分析才进入 `docs/thinking/`。

## 7. 每次 session 的读取顺序

1. `AGENTS.md`
2. 相关 feature `goal.md`
3. 需要接口/不变量时读取相关 modules
4. 需要共享约束时读取 `docs/project.md`
5. 需要变更来历或验证证据时读取相关 Change Units
6. 可选 gated artifacts 只在存在且相关时读取

## 8. 完成规则

- 权威目标文档已同步。
- 代码变更有运行证据。
- 一个完成变更只写一个 CU。
- 不维护平行 changelog/timeline/trace。
