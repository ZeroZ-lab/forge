---
name: test-cases
description: Derives concrete test scenarios from acceptance criteria, business rules, normal paths, boundaries, errors, and test data needs. Use for lightweight test-case gaps or full test-cases artifact generation.
when_to_use: Use when the user asks what to test, wants test cases, scenario coverage, acceptance-condition mapping, edge cases, error cases, test data, or missing coverage in testing/test-cases.md.
phase: test
type: domain
role: goal-refiner
triggers:
  - "写测试用例"
  - "测试场景"
  - "测试覆盖"
avoid_when:
  - "只有文档没有代码"
  - "已有完整测试用例"
  - "纯文档项目"
consumes:
  - "goal.md"
  - "modules/*.md"
  - "plan.md"
  - "testing/strategy.md"
  - "docs/change-units/CU-*.md"
produces:
  - "testing/test-cases.md"
  - "docs/change-units/CU-*.md"
signals_in:
  - "acceptance criteria"
  - "test strategy"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "test case goal"
  - "change_unit.updated"
escalates_when:
  - "验收条件不可测试"
  - "测试数据不可重复构造"
output_contract:
  - "测试范围矩阵"
  - "正常路径"
  - "边界情况"
  - "错误处理"
  - "测试数据"
maturity: stable
stage_next:
  - codegen
  - review
feedback_to:
  - define
  - plan
  - test-strategy
quality_gates:
  - review
signal_routes:
  - signal: "test case goal"
    to: codegen
    when: "tests should be projected with code"
  - signal: "test case goal"
    to: review
    when: "review needs acceptance coverage evidence"
---

# Test Cases — 测试阶段

## 职责

从详设文档（goal.md + modules/）的验收条件和业务规则推导出完整的测试用例。

**核心洞察**：测试用例不是代码的翻译，是验收条件的可执行版本。好的测试覆盖 = 验收条件全覆盖 + 边界情况 + 错误处理，缺一不可。

**方法论**：映射 → 正常 → 边界 → 错误 → 数据。

## 执行纪律

- **D2**：测试范围从验收条件推导，不从代码推导
- **D7**：测试数据必须可重复，测试之间必须隔离
- **D5**：只定义测试场景，不涉及测试策略（test-strategy）和测试代码（codegen）

## 与上下游的边界

**上游**：读 goal.md + modules/（验收条件 + 业务规则）+ plan.md（任务序列）
**下游**：testing/test-cases.md 交给 codegen（测试代码生成）和 test-strategy（测试策略）

**和 test-strategy 的切法**：test-strategy 定义**怎么测**（类型+覆盖+Mock），test-cases 定义**测什么**（具体用例）
**和 codegen 的切法**：test-cases 定义测试场景（输入+预期+验证点），codegen 按场景生成测试代码

## 方法论：场景覆盖

### TC1: 映射（Map）

从验收条件建立测试范围矩阵——确保每个验收条件都有对应测试。

**核心问题**：goal.md 里有哪些验收条件？每个验收条件需要几个测试？优先级是什么？

**不变原则**：
- 测试范围从验收条件推导，不从代码推导（代码是 HOW，验收条件是 WHAT）
- 每个验收条件至少 1 个测试，核心验收条件 3+ 个测试
- P0（核心功能）> P1（重要功能）> P2（边缘功能）

**记录**：测试范围矩阵（验收条件 → 测试用例 → 优先级）+ **优先级理由**（为什么这个 AC 是 P0？）

**AC 编号规则**：
- 验收条件编号来自上游：define 阶段的 PRD 编号为 `AC-{US编号}-{序号}`（如 AC-01-1），detail 阶段的 modules 可能重新编号为 `AC1, AC2, ...`
- 测试范围矩阵的"验收条件"列必须引用 AC 编号，不用自然语言描述
- **追溯链**：PRD US-XX → [AC-XX →] test-cases TC-XXX
  - 如果 modules 有 AC 编号 → 引用 module AC 编号
  - 如果 modules 无 AC 编号 → 引用 PRD AC 编号（如 "→ US-01/AC-01-1"）
  - 每个测试用例分组标题标注来源：`### inspect 测试用例（→ US-01）`

### TC2: 正常（Happy Path）

为每个验收条件定义正常路径——功能在正常输入下按预期工作。

**核心问题**：正常流程是什么？预期输入和输出？有哪些变体（不同角色、不同数据）？

**不变原则**：
- 正常路径是测试的基础，必须最先定义
- 测试数据要真实（"完成项目报告"不是"test123"）
- 正常路径的变体也要覆盖（不同角色、不同数据类型）

**记录**：正常路径测试清单（输入 + 预期输出 + 验证点）

### TC3: 边界（Edge Cases）

识别每个功能的边界值——空值、最大值、最小值、初始状态、并发。

**核心问题**：输入的边界值？（空字符串、超长文本、特殊字符）状态的边界？（空列表、满页、状态转换的临界点）并发边界？（同时操作同一资源）

**不变原则**：
- 边界情况是 bug 的高发区——"应该没问题但实际有问题"的地方
- 边界值要具体（"title = 255 字符"不是"很长的标题"）
- 并发场景必须考虑（竞态条件、死锁、数据不一致）

**记录**：边界测试清单（边界值 + 预期行为 + 验证点）

### TC4: 错误（Error Handling）

定义每种错误类型的处理方式——输入错误、权限错误、系统错误、超时。

**核心问题**：可能的错误有哪些？错误怎么处理？（返回错误码、显示提示、重试、降级）错误信息对用户有用吗？

**不变原则**：
- 错误处理是用户体验的关键——用户看到的不该是堆栈跟踪
- 每种错误至少 1 个测试（该重试的重试、该报错的报错、该降级的降级）
- 错误信息要有用（"标题不能为空"不是"Error occurred"）

**记录**：错误测试清单（错误类型 + 触发条件 + 预期响应）

### TC5: 数据（Test Data）

设计测试数据的构造、隔离和清理策略。

**核心问题**：测试数据怎么构造？（工厂、fixture、seed）测试间数据要隔离吗？测试后数据要清理吗？

**不变原则**：
- 测试数据必须可重复（每次跑结果一样）
- 测试之间必须隔离（A 测试不能影响 B 测试）
- 测试后必须清理（事务回滚、独立数据库、或 mock）

**记录**：测试数据清单（数据构造 + 隔离策略 + 清理策略）

## AI 的角色

| 阶段 | AI 角色 | 行为 |
|------|---------|------|
| 映射 | 验收条件解析者 | 读 goal.md，建立验收条件到测试用例的映射矩阵 |
| 正常 | 正常路径设计者 | 从验收条件推导正常流程的输入输出和验证点 |
| 边界 | 边界猎手 | 识别空值、最大值、并发等边界情况 |
| 错误 | 错误场景设计者 | 从错误类型推导错误处理和用户提示 |
| 数据 | 数据策略设计者 | 从测试需求推导数据构造、隔离和清理策略 |

## 引导技巧

**优先级判断**："这个功能挂了，用户会怎样？"——代价越大优先级越高
**边界判断**："如果用户输入极端值会怎样？"——空字符串、超长文本、特殊字符
**并发判断**："两个用户同时操作会怎样？"——竞态条件、数据覆盖
**错误判断**："出错了用户看到什么？"——堆栈跟踪不算错误信息

## 产出结构

```
docs/features/<feature>/
└── testing/
    ├── strategy.md     # 测试策略（来自 test-strategy）
    └── test-cases.md   # 测试范围矩阵 + 测试用例清单 + 数据策略
```

## 文档约束

**testing/test-cases.md 必须包含**：测试范围矩阵 · 正常/边界/错误测试用例 · 数据构造+隔离+清理策略 · 优先级（P0/P1/P2）
**testing/test-cases.md 不应包含**：具体测试代码（codegen）· 测试框架选择（test-strategy）· CI/CD 配置（deploy）

**行数约束**：test-cases.md ≤ 200 行。超出时拆分：
- 主文件保留：版本信息 · 测试范围矩阵 · P0 用例 · 优先级汇总 · 执行顺序
- P1/P2 用例 → `test-cases/p1-cases.md`
- 边界 + 错误用例 → `test-cases/edge-errors.md`
- 测试数据策略 → `test-cases/data-strategy.md`

## 模板

使用 `${CLAUDE_SKILL_DIR}/references/test-cases-template.md` 作为产出结构参考。

## 入口/出口条件

**入口**：有 goal.md + modules/ + plan.md（或用户已有代码）
**出口**：testing/test-cases.md 已生成 · 所有验收条件都有测试用例 · 正常+边界+错误全覆盖 · 数据策略已确定 · test-cases.md ≤ 200 行

**缺失处理**：
- 验收条件未编号 → 先补充 AC 编号（`AC-{US编号}-{序号}` 格式，追溯至 PRD），不凭空写测试
- goal.md 存在但 modules/ 为空 → 从 goal.md 推导，标注"模块文档缺失"

**交叉验证**：
- 读 testing/strategy.md 覆盖矩阵 → 提取"可自动化"的模块列表
- 读 test-cases.md 测试范围矩阵 → 提取覆盖的 AC 列表
- 覆盖矩阵中有但 test-cases 无 → 补充或标注"手动验证"

## 运行时信号

- 输入：`define.acceptance_criteria` + `test_strategy.test_strategy`
- 输出：`test_cases.test_case_plan`
- 路由：详见本文件 frontmatter.signal_routes
- 升级：验收条件不可测试 · 测试数据不可重复构造

## 何时不使用

只有文档没有代码 · 已有完整测试用例 · 纯文档项目

## 红旗清单

- 验收条件没有测试用例 → 强制补充
- 只有正常路径 → 强制补充边界和错误
- 测试数据不可重复 → 强制隔离
- 测试之间互相影响 → 强制隔离
- 测试后不清理 → 强制清理

## 验证清单

- [ ] 所有验收条件是否都有测试用例？
- [ ] 正常路径是否完整覆盖（含变体）？
- [ ] 边界情况是否覆盖（空值、最大值、最小值、并发）？
- [ ] 错误处理是否覆盖（输入、权限、系统、超时）？
- [ ] 测试数据是否可重复、隔离、清理？
- [ ] 每个测试用例是否有优先级（P0/P1/P2）？

## 历史维护（自动）

完成后追加 `docs/timeline.md`：`### {日期} — {feature} 测试用例 · testing/test-cases.md（{N} 验收条件 → {M} 测试用例）`。追加 `changelog.md`。超 100 行时归档。作为 `test` 或 `plan` 子阶段运行时不单独追加历史，由编排 skill 写汇总记录。

## 完成提示

```
✅ 测试用例完成！testing/test-cases.md 已生成。

下一步你可以：
  代码生成 — 按测试用例生成测试代码
  发布规划 — 灰度 + 回滚 + 监控
  自然语言        — 直接说"生成代码"
```

