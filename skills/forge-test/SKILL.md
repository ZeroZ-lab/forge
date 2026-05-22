---
name: forge-test
description: 测试阶段编排——测试策略 + 测试用例，一次对话完成测试规划。用户说"做测试"、"测试阶段"、"测试规划"、运行 /forge-test、或需要从 contract.md 产出测试策略和测试用例时触发。
---

# Forge Test — 测试阶段编排

一次对话完成测试策略 + 测试用例。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 测试策略**
加载 `test-strategy` skill，完成 T1-T5 决策点。

**Phase 2: 测试用例**
加载 `test-cases` skill，完成 TC1-TC5 决策点。

## 产出

```
docs/features/<feature>/
├── testing/
│   ├── contract.md          # 测试策略（来自 Phase 1）
│   └── test-cases.md        # 测试用例（来自 Phase 2）
```

## 跳过规则

- 已有 testing/contract.md → Phase 1 只更新 feature 相关的部分
- /forge-plan 已自动推导 test-cases.md → Phase 2 只补充遗漏场景

## 历史维护（自动）

完成后自动执行，不需要人工触发：

1. **追加 feature changelog.md**：
   ```markdown
   ### v{版本} — {日期} — 测试规划
   - **触发**：{用户说的一句话}
   - **产出**：testing/contract.md + test-cases.md（{N} 个测试用例）
   ```

2. **追加 docs/timeline.md**：
   ```markdown
   ### {日期} — {feature} 测试规划
   - 新增：testing/contract.md + test-cases.md
   ```

3. **检查膨胀**：timeline.md 或 changelog.md 超过 100 行时，旧记录归档。

## 完成提示

完成后向用户展示：

```
✅ 测试阶段完成！testing/contract.md + test-cases.md 已生成。

下一步你可以：
  /forge-deploy  — 规划发布流程（灰度 + 回滚 + 监控）
  自然语言       — 直接说"生成代码"进入构建阶段
```
