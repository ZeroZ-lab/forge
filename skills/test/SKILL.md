---
name: test
description: Orchestrates the full test stage across testing strategy and test-case derivation. Use only when the user explicitly asks for the test stage or when testing strategy and test cases must be coordinated.
when_to_use: Use when the user says run the test stage, full testing plan, coordinate test-strategy and test-cases, produce both testing/contract.md and testing/test-cases.md, or resolve conflicts between how to test and what to test.
---

# Forge Test — 测试阶段编排

一次对话完成测试策略 + 测试用例。

## 运行时角色

`test` 是测试阶段 orchestrator。它判断当前运行时已有多少测试输入，决定是补测试策略、补测试用例，还是把缺失验收条件回流到 define/detail。

## 输入状态读取

开始前读取：

- feature `contract.md` 和 `modules/*.md`
- `plan.md`
- 已有 `testing/contract.md`
- 已有 `testing/test-cases.md`
- codegen 或 review 中暴露的测试缺口（如有）

## 分支与恢复

- 缺 contract/modules → 不生成测试策略，先回到 detail 补 setpoint。
- 缺验收条件或验收条件不可测试 → 回到 define/detail，不凭空编测试。
- 已有 testing/contract.md → Phase 1 只更新缺口和冲突。
- plan 已推导 testing/test-cases.md → Phase 2 只补遗漏场景。
- 测试策略和测试用例冲突 → 暂停并列出冲突，不让 codegen 消费矛盾输入。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 测试策略**
加载 `test-strategy` skill，走完 T1-T5 方法论步骤。

**Phase 2: 测试用例**
加载 `test-cases` skill，走完 TC1-TC5 方法论步骤。

**Phase 3: 交叉验证**
1. 读 testing/contract.md 覆盖矩阵 → 提取"可自动化"的模块列表
2. 读 testing/test-cases.md 测试范围矩阵 → 提取覆盖的 AC 列表
3. 比对：覆盖矩阵中有但 test-cases 无 → 标记缺失
4. 如有缺失 → 回到 Phase 2 补充
5. 检查 test-cases.md 行数 ≤ 200 → 超出则按拆分策略处理

## 产出

```
docs/features/<feature>/
├── testing/
│   ├── contract.md          # 测试策略（来自 Phase 1）
│   └── test-cases.md        # 测试用例（来自 Phase 2）
```

## 跳过规则

- 已有 testing/contract.md → Phase 1 只更新 feature 相关的部分
- plan 已自动推导 testing/test-cases.md → Phase 2 只补充遗漏场景

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`test-strategy` 和 `test-cases` 作为子阶段时不单独追加历史。超 100 行时归档。

## 运行时信号

- 输入：test planning needed、missing test cases
- 输出：test strategy ready、test cases ready
- 路由：详见 `registry.yaml` 的 `forge-test` 节点；本节只保留人类可读摘要。
- 升级：验收条件缺失 · 测试策略和用例冲突

## 完成提示

完成后向用户展示：

```
✅ 测试阶段完成！testing/contract.md + testing/test-cases.md 已生成。

下一步你可以：
  发布规划 — 规划发布流程（灰度 + 回滚 + 监控）
  自然语言       — 直接说"生成代码"进入构建阶段
```
