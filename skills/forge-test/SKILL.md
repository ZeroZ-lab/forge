---
name: test
description: 测试阶段编排——测试策略 + 测试用例，一次对话完成测试规划。用户说"做测试"、"测试阶段"、"测试规划"、运行 /test、或需要从 contract.md 产出测试策略和测试用例时触发。
---

# Forge Test — 测试阶段编排

一次对话完成测试策略 + 测试用例。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 测试策略**
加载 `forge-test-strategy` skill，走完 T1-T5 方法论步骤。

**Phase 2: 测试用例**
加载 `forge-test-cases` skill，走完 TC1-TC5 方法论步骤。

## 产出

```
docs/features/<feature>/
├── testing/
│   ├── contract.md          # 测试策略（来自 Phase 1）
│   └── test-cases.md        # 测试用例（来自 Phase 2）
```

## 跳过规则

- 已有 testing/contract.md → Phase 1 只更新 feature 相关的部分
- /plan 已自动推导 testing/test-cases.md → Phase 2 只补充遗漏场景

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`forge-test-strategy` 和 `forge-test-cases` 作为子阶段时不单独追加历史。超 100 行时归档。

## 完成提示

完成后向用户展示：

```
✅ 测试阶段完成！testing/contract.md + testing/test-cases.md 已生成。

下一步你可以：
  /deploy  — 规划发布流程（灰度 + 回滚 + 监控）
  自然语言       — 直接说"生成代码"进入构建阶段
```
