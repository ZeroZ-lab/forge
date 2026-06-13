---
name: frontend-design
description: Reviews and designs frontend component structure, page architecture, data flow, state boundaries, cache strategy, and API consumption. Use for lightweight frontend design review or full frontend-design stage execution.
when_to_use: Use when the user asks how to split components, structure pages, manage UI state, consume APIs, cache or retry data requests, design frontend modules, or review whether frontend architecture is reasonable.
---

# Frontend Design — 前端详设

## 职责

定义前端怎么工作：页面结构、组件边界、数据流、状态、请求缓存和表单。外观归 `fe-system`，接口归 `api-design`。

## 执行纪律

- D1：FE 决策必须记录选择、理由、被拒方案。
- D4：团队经验优先，不为技术先进性过度拆分。
- D5：只设计行为和数据流，不改 API 合约、不重做视觉系统。

## 输入/输出

输入：interaction spec、`goal.md` API 决策、`modules/*.md` 合约、`DESIGN.md`。输出：FE1-FE5 决策、组件/页面 module specs、技术选型表、性能和可访问性约束。

## 决策点

### 前置判断：项目类型

- 传统 Web：DOM、路由、API、表单 → FE1-FE5。
- 创意编码 / Canvas / WebGL：渲染循环为主体 → FE1-FE2 + FE3'-FE5'。

### FE1: 框架

问团队经验、SEO、周期和公司约束。记录框架、版本、构建工具、理由和被拒方案。

### FE2: 状态管理

区分服务端状态和客户端状态。记录全局状态清单、缓存/状态库、撤销重做需求和拒绝方案。

### FE3: 样式方案

选择能消费 Design Token 的方案；无 `DESIGN.md` 时标注缺失，不发明视觉语言。

### FE4: 数据请求

按 API 数量、实时性、旧数据容忍度决定 fetch/cache/retry/realtime 策略。

### FE5: 表单方案

按表单数量、动态字段、前后端 schema 共享需求选择方案。

### 创意编码替代决策点（FE3'-FE5'）

### FE3': 渲染引擎

Canvas 2D / WebGL / Three.js / p5.js；按 2D/3D、后处理、性能预算选择。

### FE4': 输入处理

鼠标、触摸、摄像头、传感器；坐标归一化到画布尺寸，外部输入异步处理。

### FE5': 动画系统

程序化动画、帧动画或物理引擎；记录帧率预算和拒绝方案。

## 文档约束

每个页面/组件 module 必须包含：需求、验收条件、组件树、数据消费、状态、表单、依赖和模块约束。模板：`${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`；goal 模板：`${CLAUDE_SKILL_DIR}/../shared/frontend-goal-template.md`。

命名：文件 PascalCase；导出 named export；Props 与组件同文件。project.md 已有技术栈时引用不重复，只补前端特有依赖并标注使用方。

## 入口/出口条件

入口：有需求、交互或技术选型；缺 API 合约时先回 api-design 或标注接口待定。出口：FE 决策、组件索引、module specs、技术选型表和共享约束完整。

## 红旗清单

- 服务端状态和 UI 状态混在一起。
- 没有数据请求/缓存策略。
- 无设计系统却选高运行时样式方案。
- 同一 Props/interface 在 goal 与 module 重复定义且不一致；按 `${CLAUDE_SKILL_DIR}/../shared/concepts/reference-not-repeat.md` 取 module spec 为权威。
- 静默否决 PRD 点名技术；必须回 define 升级。
- 技术选型表依赖无使用方。
- module 缺入口 / 公共接口 / 组件结构 / 数据消费 / 内部函数 / 依赖关系。

## 验证清单

- [ ] FE1-FE5 或 FE3'-FE5' 是否完整？
- [ ] 服务端状态、客户端状态、请求缓存是否分离？
- [ ] 每个组件/page 是否有 module 或完整内联接口？
- [ ] 技术依赖是否有使用方？
- [ ] 性能、可访问性和错误状态是否有约束？

## 历史维护

完成后追加 feature changelog 和 `docs/timeline.md`。超过 100 行时归档。
