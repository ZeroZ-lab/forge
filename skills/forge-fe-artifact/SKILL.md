---
name: fe-artifact
description: 前端代码投影——从 DESIGN.md、frontend contract 和 modules 生成页面、组件、hooks 与样式。用户说"生成前端"、"做页面"、"写组件"或 codegen 遇到前端文件时触发。
disable-model-invocation: true
---

# Fe Artifact — 前端代码投影

## 职责

把前端文档投影成可运行、可验收的前端代码。它是 codegen 的前端子协议，负责把设计系统、交互规格、API 合约和组件规格落到页面与组件。

## 上下游边界

**上游**：`DESIGN.md`、interaction-spec、frontend/contract.md、frontend/modules/*.md、api/modules/*.md、plan.md。

**下游**：前端源码、样式、hooks、基础测试，交给 fe-accept 和 review。

不重新做产品决策，不改 API 合约，不绕过 `DESIGN.md` 自行发明视觉语言。

## 核心方法论

五层翻译：

1. **意图层**：页面目的、用户任务、主次操作。
2. **接口层**：API、类型、错误、加载和空状态。
3. **状态层**：本地状态、远端状态、派生状态、持久状态。
4. **视图层**：布局、组件、交互、响应式。
5. **适配层**：性能、可访问性、错误恢复、边界设备。

详细规则见 `references/fe-artifact-protocol.md`。

## 读取阶段

生成前必须读取：

- `DESIGN.md`：token、组件模式、页面结构。
- frontend/contract.md：前端边界和模块索引。
- frontend/modules/*.md：组件职责、props、状态、交互。
- api/modules/*.md：请求、响应、错误码。
- plan.md：任务顺序和验证方式。

读完后先复述生成范围、输入文档、将写入的文件和不确定点。

## 生成阶段

按 plan 的任务顺序生成：

1. 类型和 API client。
2. hooks 和状态管理。
3. 组件和页面。
4. 样式和响应式。
5. 测试或可验收检查。

关键逻辑必须引用文档来源，例如 `From: frontend/modules/tasks.md AC3`。

## 文件结构规则

文件结构从项目 `project.md` 和前端合约推导，不从个人偏好推导。若合约没有规定结构，优先复用现有项目模式。

每个文件职责单一：页面负责编排，组件负责展示和局部交互，hooks 负责数据和副作用，样式消费 token。

## 验证

生成后至少检查：

- API 类型、错误和加载状态是否完整。
- 组件 props 是否与 module 文档一致。
- 视觉是否消费 `DESIGN.md` token。
- keyboard、focus、disabled、loading、empty、error 状态是否可用。
- 移动端和桌面端是否不重叠、不溢出。

前端可运行时，必须启动本地预览并做真实截图或浏览器验证。

## 入口/出口条件

**入口**：已有前端合约或 codegen 正在处理前端任务。

**出口**：相关前端文件已生成，基础验证完成，剩余风险已记录。

## 红旗

- 没读 `DESIGN.md` 就写样式。
- 只写 happy path，没有 loading/error/empty。
- 组件 props 和 module 文档不一致。
- 页面结构和交互规格不一致。
- 移动端文本溢出或控件重叠。
- 视觉状态无法被 fe-accept 验收。

## 完成提示

```
前端投影完成：相关页面、组件、hooks 和样式已生成。

下一步：
  - 运行前端验收
  - 做独立审查
  - 继续测试策略
```
