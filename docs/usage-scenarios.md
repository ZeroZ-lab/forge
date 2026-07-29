# Forge Usage Scenarios

> 默认是 Kernel-first：先守住目标、权限、范围、状态、证据和完成条件；模型可直接行动，也可按边际价值调用任意、多个或零个 Skill。

## 一句话规则

- 目标清晰、低风险：direct action，完成最小实现、验证和 self-check。
- 行为边界或共享合同不清：按需使用 `define` / `detail`。
- 技术信息可能过时或存在高不确定性：按需使用 `research`。
- 多模块、有依赖或需要并行：按需使用 `plan`。
- 高风险测试治理：按需使用 `test`。
- 发布、灰度、迁移、回滚：按需使用 `deploy`。
- L0/L1：self-check 不称为独立 review。
- L2/L3 或 P0/P1：complete/release-ready 前必须独立 reviewer/verifier。
- 多个 feature 并行：状态放 issue tracker / project board。
- 有保留修改：Chain Owner 汇总一个 Change Unit，child Skill 不重复写。

选择一个 Skill 不自动要求下一个 Skill。Skill 命中、阶段完成和动作路径都不是 success 证据。

## 场景例子

### 1. 清晰的小功能

例子：任务详情页增加“复制任务链接”按钮，现有交互、组件和测试模式足够明确。

推荐：

```text
读取用户目标、现有代码和测试
→ direct action
→ 运行最窄验证
→ L1 self-check
```

不为进入流程创建 PRD、plan 或 module；只有行为合同需要跨 consumer 持久共享时才补 goal。

### 2. 边界不清的功能

例子：增加“标签 + 筛选 + 权限限制”，但角色权限和空状态尚未定义。

可选能力：

```text
define / detail（补目标和共享合同）
→ Chain Owner 重新判断
→ direct action 或按需 plan
→ verification
→ 独立 review（L2）
```

`define/detail` 的出口只是建议，不自动触发后继。

### 3. 局部 bugfix

例子：`dueDate` 为空时创建任务返回 500。

推荐：

```text
建立 red-capable 复现
→ 最小修复
→ 修复后回归
→ self-check 或按风险独立 review
```

若正确测试 seam 或合同边界不清，可选 `codegen` bugfix playbook、`detail` 或 `test-cases`。无法建立反馈循环时 safe stop，不猜根因制造代码变更。

### 4. 新项目

例子：产品、技术栈和交互都未定义。

可选：

```text
init（生成 project 与 always-on AGENTS Kernel）
brainstorm / business-alignment / technical-design / design（按缺口）
```

初始化完成后仍回到 adaptive runtime，不要求把每个 feature 走完整生命周期。

### 5. 高风险发布

例子：支付、权限迁移或生产数据回填。

要求：

- 明确权限、安全、迁移和回滚边界；
- 可选 `technical-design` / `plan` / `test` / `deploy`；
- 独立 reviewer/verifier 是 complete/release-ready 的硬门；
- 无独立边界时保持 partial/正确阻塞并披露残余风险。

### 6. 显式 Legacy compatibility

用户明确要求 Forge 0.52.0 行为，或运行固定 capability benchmark 时：

```text
legacy-chain: detail → codegen → review
```

它只用于兼容、教学和 effectiveness 对照，不是 production default，也不能证明 adaptive Skills 的真实效果。

## 决策表

| 当前情况 | 默认动作 | 可选 Skill |
|---|---|---|
| 目标和完成条件清晰 | direct action | 无，零调用合法 |
| 用户可见行为或范围不清 | 先补合同 | `define` / `detail` |
| 技术事实可能过时 | 先取当前证据 | `research` |
| 多模块依赖复杂 | 切垂直片和关键路径 | `plan` |
| 实现型 bugfix | red → fix → green | `codegen` bugfix lens |
| 需要独立审查 | 独立上下文 findings-first | `review` |
| 生产发布或迁移 | 风险、回滚、监控 | `deploy` |
| 方法论偏差反复出现 | 重审目标或归档方法缺口 | `think` / `learn` |

## 最短记忆版

```text
Kernel 永远在
direct action 永远合法
Skill 永远可选
verification 永远需要
高风险独立复核
Chain Owner 只写一个 CU
legacy chain 只在显式要求时使用
```
