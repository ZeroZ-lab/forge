---
name: fe-artifact
description: Implements DESIGN.md, interaction specs, frontend specifications, and modules into pages, components, hooks, and styles.
when_to_use: Use by direct invocation or from codegen when documented frontend tasks need page, component, hook, style, or frontend test implementation from Forge specifications and design system goals.
---

# Fe Artifact — 前端实现

## 职责

把前端目标实现为可运行、可验收的前端代码。它是 codegen 的前端子协议，负责把设计系统、交互规格、API 合约和组件规格落到页面与组件。

历史证据统一遵循 `../shared/concepts/history-maintenance.md`。

## 执行纪律

- **D5**：不重新做产品决策，不改 API 合约，不绕过权威视觉约束自行发明视觉语言
- **D7**：前端可运行时必须启动本地预览并做真实验证，不凭猜测通过
- **D1**：关键逻辑必须引用文档来源（From: modules/tasks.md AC3）

## 上下游边界

**上游**：按需存在的 `DESIGN.md`、interaction-spec，以及 goal.md、modules/*.md 和当前执行任务序列。

**下游**：前端源码、样式、hooks、基础测试，交给 fe-accept 和 review。

不重新做产品决策，不改 API 合约，不绕过 `DESIGN.md` 自行发明视觉语言。

## 何时不使用
- 无前端规格（goal.md 无前端决策且无 modules/）
- 无任何权威视觉约束
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
- 每个页面/组件必须消费 goal/module 或 DESIGN.md 中的权威视觉约束，不自行发明视觉语言
- 每个组件必须有 loading/error/empty/disabled 状态
- 关键逻辑必须引用文档来源

## 读取阶段

生成前必须读取：

- 权威视觉约束：优先读取相关 goal/module；存在跨 feature `DESIGN.md` 时再读取。
- goal.md：前端边界和组件索引。
- modules/*.md：组件职责、props、状态、交互；API 模块含请求、响应、错误码。
- 当前对话/issue：任务顺序和验证方式（如有）。

读完后先复述生成范围、输入文档、将写入的文件和不确定点。

## 生成阶段

按当前任务序列生成；没有显式序列时从 goal 推导最小顺序：

1. 类型和 API client。
2. hooks 和状态管理。
3. 组件和页面。
4. 样式和响应式。
5. 测试或可验收检查。

关键逻辑必须引用文档来源，例如 `From: modules/tasks.md AC3`。

## 文件结构规则

文件结构从项目 `project.md` 和前端规格推导，不从个人偏好推导。若规格没有规定结构，优先复用现有项目模式。

每个文件职责单一：页面负责编排，组件负责展示和局部交互，hooks 负责数据和副作用，样式消费 token。

## 验证

生成后至少检查：

- API 类型、错误和加载状态是否完整。
- 组件 props 是否与 module 文档一致。
- 视觉是否消费权威 token/规则。
- keyboard、focus、disabled、loading、empty、error 状态是否可用。
- 移动端和桌面端是否不重叠、不溢出。

前端可运行时，必须启动本地预览并做真实截图或浏览器验证。

## 入口/出口条件

**入口**：已有前端规格或 codegen 正在处理前端任务。

**出口**：相关前端文件已生成，基础验证完成，剩余风险已记录。

## 历史维护

- 未声明由其他编排器拥有最终完成判定时，按 **standalone** 处理。
- 作为 **child** 时，返回 changed files、decisions、risks 和 verification evidence，does not write Change Unit；由明确的 orchestrator 统一持久化。
- 变更前/后阻塞及 retained mutation 的唯一写入者规则直接继承共享历史契约，不在本 skill 建立第二套规则。

## 运行时信号

- 输入：frontend task、design tokens
- 输出：frontend artifact ready、preview blocked
- 路由：详见本文件 frontmatter.signal_routes
- 升级：无法运行或预览 · 设计输入缺失

## 红旗清单
- 没读 DESIGN.md 就写样式 → 停止，先读 DESIGN.md 提取 Token
- 只写 happy path 没有 loading/error/empty → 强制补充所有状态
- 组件 props 和 module 文档不一致 → 以 module 文档为准，标注差异
- 页面结构与权威交互约束不一致 → 以 goal/module 或 gated interaction-spec 为准
- 移动端文本溢出或控件重叠 → 强制修复响应式布局
- 视觉状态无法被 fe-accept 验收 → 补充证据（截图/预览链接）

## 验证清单
- [ ] 是否读取了 DESIGN.md + goal.md + modules/*.md？
- [ ] API 类型、错误和加载状态是否完整？
- [ ] 组件 props 是否与 module 文档一致？
- [ ] 视觉是否消费 DESIGN.md Token（不自行发明颜色/间距）？
- [ ] 所有交互状态是否覆盖（loading/error/empty/disabled/success）？
- [ ] 移动端和桌面端是否无重叠、无横向溢出？
- [ ] 关键逻辑是否引用文档来源（From: modules/xxx.md AC3）？

## 完成提示

```
前端实现完成：相关页面、组件、hooks 和样式已生成。

下一步：
  - 运行前端验收
  - 做独立审查
  - 继续测试策略
```
