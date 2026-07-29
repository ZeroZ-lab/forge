---
name: shared
description: Internal Forge knowledge package containing templates, rubrics, red flags, concepts, and output specifications. Do not invoke as a lifecycle protocol.
when_to_use: Never as a user-facing protocol. Read specific files here only when another Forge skill references a shared template, rubric, concept, red flag, or output specification.
disable-model-invocation: true
---

# Shared — 内部知识包

`shared` 不是 Forge 生命周期 skill，不进入 registry，也不产生独立阶段产物。

## 用途

- 为其他 Forge skill 提供模板、rubric、concept、red flag 和 output specification。
- 只在上游 skill 明确引用具体文件时按需读取。
- `concepts/adaptive-runtime.md` 定义始终加载 Kernel、可选 Skill、Chain Owner 和独立复核边界，供项目指令与 lifecycle Skill 共同引用。

## 边界

- 不直接响应用户任务。
- 不替代始终加载的项目/host Kernel，也不替代任何用户选择的能力。
- 不产生自己的项目产物或 Change Unit。
