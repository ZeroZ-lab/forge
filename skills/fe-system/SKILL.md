---
name: fe-system
description: Designs or reviews project visual systems, DESIGN.md, tokens, color, typography, spacing, component states, and visual language. Use for lightweight design-system decisions or full fe-system execution.
when_to_use: Use when the user asks about design system, DESIGN.md, colors, typography, spacing, CSS tokens, component visual states, brand feel, visual direction, or updating shared frontend design rules.
---

# Fe System — 设计系统落地

## 职责

从业务目标、交互规格和产品气质推导项目级设计系统，产出 `DESIGN.md`。这是决策 skill，不直接写组件代码。

## 执行纪律

- **D3**：视觉方向给出 2-3 个选项和代价，等人类确认后再建 Token
- **D5**：不写具体页面实现，不生成前端源码，不把组件库名称当成设计系统
- **D1**：每个设计决策（色彩、字体、间距）记录理由和被拒方案

## 上下游边界

**上游**：`docs/project.md`、PRD、interaction-spec、用户提供的品牌或参考产品。

**下游**：`DESIGN.md` 交给 frontend-design、fe-artifact、fe-accept 和后续代码生成。

不写具体页面实现，不生成前端源码，不把当前流行组件库写成永久原则。

## 核心方法论

三层 Token：

1. **Primitive**：原始色值、字号、间距、阴影、圆角。
2. **Semantic**：primary、surface、danger、text-muted 等语义 token。
3. **Component**：button、input、card、table、dialog 等组件 token。

设计系统要能回答：这个产品应该给人什么感觉、页面如何组织、组件如何复用、状态如何表达、未来 AI 如何一致地生成界面。

详细步骤和检查表见 `references/fe-system-protocol.md`。

## 流程

1. **定意图**：确认用户、产品气质、页面类型、品牌限制。
2. **找参考**：必要时搜索当前同类产品，提炼可复用模式，不复制表层风格。
3. **判页面**：区分工具、SaaS、内容、营销、游戏、数据面板等页面类型。
4. **做选择**：给出 2-3 个视觉方向和代价，等待人类确认。
5. **建 Token**：生成 primitive、semantic、component 三层 token。
6. **建模式库**：定义布局、导航、表单、列表、反馈和空状态模式。
7. **验证**：检查可访问性、响应式、密度、状态覆盖和跨页面一致性。
8. **预览**：如用户需要，生成设计预览供确认。

## 决策点

- **S1 色彩系统**：主色、辅助色、语义色、背景层级、对比度。**记录**：色彩选择 + 理由 + 被拒方案
- **S2 字体系统**：字体族、字号层级、行高、字重。**记录**：字体选择 + 理由 + 被拒方案
- **S3 间距系统**：基准网格、容器宽度、section 节奏、组件内距。**记录**：间距选择 + 理由 + 被拒方案
- **S4 页面结构**：导航、内容区、侧栏、工具栏、表格或卡片密度。**记录**：结构选择 + 理由 + 被拒方案
- **S5 组件模式**：按钮、输入、选择、表格、弹窗、状态反馈。**记录**：组件选择 + 理由 + 被拒方案

## 产出

`DESIGN.md` 必须包含：

- 产品气质和设计原则
- 三层 token
- 页面结构模式
- 核心组件模式
- 交互状态
- 响应式规则
- 可访问性要求

模板：`references/design-system-template.md`

## 入口/出口条件

**入口**：有项目目标、目标用户和至少一个页面类型；或已有 `DESIGN.md` 需要更新。

**出口**：`DESIGN.md` 已生成或更新，人类确认关键视觉方向，后续 skill 可直接消费 token。

## 运行时信号

- 输入：product tone、page archetype
- 输出：design tokens、component patterns
- 路由：详见 `registry.yaml` 的 `forge-fe-system` 节点；本节只保留人类可读摘要。
- 升级：视觉方向冲突 · 已有 DESIGN.md 冲突

## 何时不使用
- 纯后端 API（无前端界面）
- 已有完整的 DESIGN.md 且不需要更新
- 使用现成 UI 框架不做定制（直接用框架默认样式）
- 原型验证阶段（不需要设计系统）

## 红旗清单
- 只给颜色不给语义 Token → 强制补充（"primary 用在哪些组件上？"）
- 只有审美词没有组件和状态规则 → 强制补充（"hover/focus/disabled/error/empty 怎么表达？"）
- 把组件库名称当成设计系统 → 纠正（"Tailwind ≠ 设计系统，设计系统是 WHY + Token"）
- 未区分工具型界面和营销型界面 → 强制区分（"这是工具还是内容？密度和留白不同"）
- 未覆盖交互状态 → 强制补充（"hover/focus/disabled/loading/error/empty 都设计了吗？"）
- 未验证移动端和可访问性 → 强制验证（"移动端布局？对比度？"）

## 验证清单

- [ ] 是否有明确产品气质？
- [ ] 是否有 primitive、semantic、component 三层 token？
- [ ] 是否覆盖核心组件和交互状态？
- [ ] 是否说明页面结构和响应式规则？
- [ ] 是否能被 frontend-design 和 fe-artifact 直接消费？
- [ ] Component Token 引用的 Semantic Token 是否都已定义？（交叉验证）
- [ ] Component Token 是否覆盖交互模式库中所有核心组件？

## 历史维护

完成后追加 `docs/timeline.md`；若是 feature 级设计变更，也追加对应 feature 的 `changelog.md`。

## 完成提示

```
设计系统已完成：DESIGN.md 已生成或更新。

下一步：
  - 做技术详设
  - 生成前端代码
  - 做前端验收
```
