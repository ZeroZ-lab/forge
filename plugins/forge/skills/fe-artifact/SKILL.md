---
name: fe-artifact
description: Implements DESIGN.md, interaction specs, frontend specifications, and modules into pages, components, hooks, and styles.
when_to_use: Use by direct invocation or from codegen when documented frontend tasks need page, component, hook, style, or frontend test implementation from Forge specifications and design system goals.
disable-model-invocation: false
phase: build
type: execution
role: executor
triggers:
  - "生成前端"
  - "做页面"
  - "写组件"
avoid_when:
  - "无前端任务"
  - "缺 DESIGN.md 且无法确认视觉规则"
consumes:
  - "DESIGN.md"
  - "interaction-spec.md"
  - "frontend/contract.md"
  - "frontend/modules/*.md"
  - "api/modules/*.md"
  - "plan.md"
  - "docs/change-units/CU-*.md"
  - "goal.md"
produces:
  - "frontend source files"
  - "frontend validation evidence"
  - "docs/change-units/CU-*.md"
signals_in:
  - "frontend task"
  - "design tokens"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "frontend artifact ready"
  - "preview blocked"
  - "change_unit.updated"
  - "goal_coverage.updated"
escalates_when:
  - "无法运行或预览"
  - "设计输入缺失"
output_contract:
  - "pages"
  - "components"
  - "hooks"
  - "styles"
  - "basic tests"
maturity: stable
stage_next:
  - fe-accept
  - review
feedback_to:
  - fe-system
  - frontend-design
quality_gates:
  - fe-accept
  - review
signal_routes:
  - signal: "frontend artifact ready"
    to: fe-accept
    when: "preview or acceptance can run"
  - signal: "preview blocked"
    to: human decision
    when: "frontend cannot be run or inspected"
---

# Fe Artifact — 前端实现

## 职责

把前端目标实现为可运行、可验收的前端代码。它是 codegen 的前端子协议，负责把设计系统、交互规格、API 合约和组件规格落到页面与组件。

## 执行纪律

- **D5**：不重新做产品决策，不改 API 合约，不绕过 DESIGN.md 自行发明视觉语言
- **D7**：前端可运行时必须启动本地预览并做真实验证，不凭猜测通过
- **D1**：关键逻辑必须引用文档来源（From: frontend/modules/tasks.md AC3）

## 上下游边界

**上游**：`DESIGN.md`、interaction-spec、notes/frontend.md、frontend/modules/*.md、api/modules/*.md、plan.md。

**下游**：前端源码、样式、hooks、基础测试，交给 fe-accept 和 review。

不重新做产品决策，不改 API 合约，不绕过 `DESIGN.md` 自行发明视觉语言。

## 何时不使用
- 无前端规格（notes/frontend.md 不存在）
- 无 DESIGN.md（设计系统未建立）
- 纯后端 API（无前端代码需要生成）
- codegen 未处理前端任务时不单独调用

## 核心方法论

五层翻译：

1. **意图层**：页面目的、用户任务、主次操作。
2. **接口层**：API、类型、错误、加载和空状态。
3. **状态层**：本地状态、远端状态、派生状态、持久状态。
4. **视图层**：布局、组件、交互、响应式。
5. **适配层**：性能、可访问性、错误恢复、边界设备。

详细规则见 `references/fe-artifact-protocol.md`。

**最小执行规则**（不读 protocol 文件时仍需遵守）：
- 每个页面/组件必须消费 DESIGN.md Token，不自行发明视觉语言
- 每个组件必须有 loading/error/empty/disabled 状态
- 关键逻辑必须引用文档来源

## 读取阶段

生成前必须读取：

- `DESIGN.md`：token、组件模式、页面结构。
- notes/frontend.md：前端边界和模块索引。
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

文件结构从项目 `project.md` 和前端规格推导，不从个人偏好推导。若规格没有规定结构，优先复用现有项目模式。

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

**入口**：已有前端规格或 codegen 正在处理前端任务。

**出口**：相关前端文件已生成，基础验证完成，剩余风险已记录。

## 运行时信号

- 输入：frontend task、design tokens
- 输出：frontend artifact ready、preview blocked
- 路由：详见本文件 frontmatter.signal_routes
- 升级：无法运行或预览 · 设计输入缺失

## 红旗清单
- 没读 DESIGN.md 就写样式 → 停止，先读 DESIGN.md 提取 Token
- 只写 happy path 没有 loading/error/empty → 强制补充所有状态
- 组件 props 和 module 文档不一致 → 以 module 文档为准，标注差异
- 页面结构和交互规格不一致 → 以 interaction-spec 为准
- 移动端文本溢出或控件重叠 → 强制修复响应式布局
- 视觉状态无法被 fe-accept 验收 → 补充证据（截图/预览链接）

## 验证清单
- [ ] 是否读取了 DESIGN.md + notes/frontend.md + frontend/modules/*.md + api/modules/*.md？
- [ ] API 类型、错误和加载状态是否完整？
- [ ] 组件 props 是否与 module 文档一致？
- [ ] 视觉是否消费 DESIGN.md Token（不自行发明颜色/间距）？
- [ ] 所有交互状态是否覆盖（loading/error/empty/disabled/success）？
- [ ] 移动端和桌面端是否无重叠、无横向溢出？
- [ ] 关键逻辑是否引用文档来源（From: frontend/modules/xxx.md AC3）？

## 完成提示

```
前端实现完成：相关页面、组件、hooks 和样式已生成。

下一步：
  - 运行前端验收
  - 做独立审查
  - 继续测试策略
```

