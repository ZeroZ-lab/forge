---
name: test-strategy
description: Designs how to test a feature through test types, risk coverage, data strategy, mocking, isolation, CI gates, and quality thresholds. Use for lightweight testing strategy review or full test-strategy execution.
when_to_use: Use when the user asks how to test, which test layers to use, coverage strategy, mock strategy, test data, CI integration, quality gate, automation scope, or testing/contract.md planning.
---

# Test Strategy — 测试阶段

## 职责

规划测试策略——决定测试什么、怎么测、用什么数据、怎么隔离、怎么集成到 CI。

**核心洞察**：测试策略不是追求覆盖率数字，是用最小测试成本覆盖最大业务风险。100% 覆盖率是虚荣指标，有效覆盖才是目标。

**方法论**：分层 → 覆盖 → 数据 → 隔离 → 集成。

## 执行纪律

- **D1**：T1-T5 每个决策记录选择 + 理由 + 被拒方案
- **D7**：测试必须在 CI 中跑，测试失败必须阻断发布
- **D5**：只定义测试策略，不涉及具体用例（test-cases）和部署（deploy）

## 与上下游的边界

**上游**：读 contract.md + modules/（验收条件+业务规则）+ plan.md（任务序列）
**下游**：testing/contract.md 交给 test-cases（测试用例推导）和 codegen（测试生成）

**和 test-cases 的切法**：test-strategy 定义**怎么测**（类型+覆盖+Mock），test-cases 定义**测什么**（具体用例）
**和 codegen 的切法**：test-strategy 定义测试框架和规范，codegen 按规范生成测试代码

## 方法论：测试金字塔

1. **分层测试** — 底层多且快（单元），顶层少且慢（E2E）
2. **风险驱动覆盖** — 覆盖率由业务风险决定，不由代码行决定
3. **隔离性** — 测试之间不互相依赖，可以任意顺序运行
4. **可重复** — 同一个测试跑 100 次结果一样

## 决策点

### T1: 测试类型

**问**：有多少端点？出问题需要多快定位？有 QA 团队吗？bug 代价多大？

**不变原则**：
- 测试类型由**风险等级 + 定位速度需求**决定
- 测试金字塔：底层多且快，顶层少且慢
- 没有测试的代码 = 不存在的功能

**记录**：测试类型组合 + 各类型占比 + 选择理由 + 被拒方案

### T2: 覆盖策略

**问**：端点多吗？所有功能同等重要吗？团队愿意花多少时间？

**不变原则**：
- 关键路径必须全覆盖（支付、认证、数据写入）
- 覆盖率和维护成本正相关
- 100% 覆盖率是虚荣指标，有效覆盖才是目标

**记录**：策略 + 选择理由 + 被拒方案

### T3: 测试数据

**问**：数据模型复杂吗？需要真实数据吗？测试间共享基础数据吗？

**不变原则**：
- 测试数据必须可重复生成
- 测试之间不能互相依赖（A 的输出不能是 B 的输入）
- 数据越真实，越能发现真实场景的 bug

**记录**：策略 + 数据生成方式 + 选择理由 + 被拒方案

### T4: Mock 策略

**问**：CI 能跑 Docker 吗？多少外部依赖？测试跑多久可接受？

**不变原则**：
- 真实依赖 > Mock（能发现集成问题）
- 外部服务必须 Mock（不可控、不稳定、有费用）
- 速度太慢的测试不会被运行 = 不存在的测试

**记录**：策略 + 真实/Mock 清单 + 选择理由 + 被拒方案

### T5: CI 集成

**问**：测试跑多久？发布频率？测试失败怎么办？

**不变原则**：
- 测试必须在 CI 中跑，本地跑的测试约等于没跑
- 测试时间 > 10 分钟必须优化，否则开发者会跳过
- 失败的测试必须阻断发布（否则测试失去意义）

**记录**：策略 + 超时设置 + 失败策略 + 选择理由 + 被拒方案

## 产出格式（T1-T5 通用）

每个 T# 决策在 testing/contract.md 中的产出必须包含三部分：

```
## T#: {决策名}

| （决策表格，列名按 T# 不同） |

**被拒**：
- 方案名：拒绝理由
- 方案名：拒绝理由
```

**T1** 表列：类型 / 占比 / 目标 / 选择理由  
**T2** 表列：模块 / 可自动化 / 测试类型 / 覆盖程度  
**T3** 表列：数据类型 / 用途 / 构造方式  
**T4** 表列：依赖 / 策略 / 理由  
**T5** 表列：项目 / 策略

> ⚠️ `**被拒**` 子标题是必填项。每个 T# 至少列出 1 个被拒方案及其理由。

## AI 的角色

| 决策点 | AI 角色 | 行为 |
|--------|---------|------|
| T1 测试类型 | 风险评估者 | 从 bug 代价和定位速度推导测试类型组合 |
| T2 覆盖策略 | 优先级分析者 | 从业务关键路径推导覆盖优先级 |
| T3 测试数据 | 数据工程师 | 从数据模型复杂度推导数据生成策略 |
| T4 Mock 策略 | 集成分析者 | 从外部依赖数量和稳定性推导 Mock 策略 |
| T5 CI 集成 | 流水线设计者 | 从发布频率推导 CI 配置和失败策略 |

## 引导技巧

**分层判断**："出了问题，你希望多快定位到根因？"
**覆盖判断**："如果只能测 3 个流程，测哪 3 个？"
**数据判断**："测试数据要看起来像真实用户数据吗？"
**Mock 判断**："这个外部服务挂了，测试还能跑吗？"
**CI 判断**："测试跑 15 分钟，开发者还会每次提交都跑吗？"

## 产出结构

```
docs/features/<feature>/testing/
├── contract.md      # T1-T5 决策 + 覆盖矩阵 + 测试规范
└── changelog.md
```

## 文档约束

**testing/contract.md 必须包含**：T1-T5 决策（选择+理由+被拒） · 测试框架表 · 覆盖矩阵 · 测试规范（命名+隔离+环境）
**不应包含**：具体测试用例（test-cases）· CI 配置文件（deploy）

## 模板

- `${CLAUDE_SKILL_DIR}/../shared/goal-template.md` — goal.md 结构
- `${CLAUDE_SKILL_DIR}/../shared/changelog-template.md` — changelog.md 结构

## 入口/出口条件

**入口**：有 contract.md + modules/ + plan.md，或用户已有详设和任务分解

**缺失处理**：缺 plan.md → 从 contract.md 推导最小任务序列；缺 modules/ → 从 contract.md 推导覆盖矩阵。

**出口**：testing/contract.md（T1-T5 完整） · 测试框架已选 · 覆盖矩阵已填 · 测试规范已明确

## 运行时信号

- 输入：`define.acceptance_criteria` + `plan.task_sequence`
- 输出：`test_strategy.test_strategy`
- 路由：详见 `registry.yaml` 的 `forge-test-strategy` 节点；本节只保留人类可读摘要。
- 升级：关键路径无法覆盖 · CI 约束不清

## 何时不使用

纯文档项目 · 已有完整测试策略 · 原型验证阶段

## 红旗清单

- 没有选择理由 → 强制补充（"为什么选这个？被拒方案是什么？"）
- 追求 100% 覆盖率 → 强制纠正（"100% 覆盖率是虚荣指标"）
- 测试间互相依赖 → 强制隔离
- 测试只在本地跑 → 强制 CI
- 测试时间超过 10 分钟 → 强制优化
- 关键路径没有全覆盖 → 强制补充

## 验证清单

- [ ] T1-T5 是否都有选择 + 理由 + 被拒方案？
- [ ] 关键路径是否全覆盖（支付、认证、数据写入）？
- [ ] 测试数据是否可重复生成？
- [ ] 测试间是否互相隔离？
- [ ] 外部依赖是否有 Mock 策略？
- [ ] CI 中是否配置了测试运行？
- [ ] 测试失败是否阻断发布？
- [ ] **跨文档一致性**：testing/contract.md 的覆盖率策略是否与 project.md 工程约束中的测试策略一致？
  - 如果 project.md 写了 "目标 ≥80% 覆盖率"，testing/contract.md 不能写 "不做覆盖率门槛"
  - 不一致 → 停下来让用户决策，更新 project.md 或 testing/contract.md
- [ ] **引用纪律**：testing/contract.md 的约束是否引用 project.md PD#，而非重复内容？

## 历史维护（自动）

完成后追加 `docs/timeline.md`：`### {日期} — {feature} 测试策略 · testing/contract.md（T1-T5）`。追加 `changelog.md`。

**更新 docs/status.md**：⑥测试 → `🔄`（test-cases 完成后由 test 编排或 test-cases 标记 `✅`）。

超 100 行时归档。

## 完成提示

```
✅ 测试策略完成！testing/contract.md 已生成。

下一步你可以：
  test-cases — 定义具体测试用例（正常/边界/错误）
  代码生成   — 按任务序列生成 src/ + tests/
  自然语言   — 直接说"写测试"或"生成代码"
```

