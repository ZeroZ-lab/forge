---
name: shared
description: Internal Forge knowledge package containing templates, rubrics, red flags, concepts, and output contracts. Do not invoke as a lifecycle protocol.
when_to_use: Never as a user-facing protocol. Read specific files here only when another Forge skill references a shared template, rubric, concept, red flag, or output contract.
disable-model-invocation: false
---

# Shared — 内部知识包

`shared` 不是 Forge 生命周期 skill，不进入 registry，也不产生独立阶段产物。

## 用途

- 为其他 Forge skill 提供模板、rubric、concept、red flag 和 output contract。
- 只在上游 skill 明确引用具体文件时按需读取。

## 边界

- 不直接响应用户任务。
- 不替代 `forge-detail`、`forge-codegen`、`forge-review` 等正式协议。
- 不产生自己的 timeline/changelog 记录。
