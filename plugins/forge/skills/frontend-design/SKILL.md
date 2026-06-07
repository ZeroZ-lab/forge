---
name: frontend-design
description: Reviews and designs frontend component structure, page architecture, data flow, state boundaries, cache strategy, and API consumption. Use for lightweight frontend design review or full frontend-design stage execution.
when_to_use: Use when the user asks how to split components, structure pages, manage UI state, consume APIs, cache or retry data requests, design frontend modules, or review whether frontend architecture is reasonable.
---
# Frontend Design — 详设阶段（前端层）
## 职责
设计页面和数据的交互架构——组件拆分 + 数据流。
**核心洞察**：前端设计的核心不是"页面长什么样"（那是 fe-system），而是"页面怎么拆、数据怎么流、状态怎么管"。
**方法论**：组件驱动设计——页面拆解 → 数据流明确 → 约束一致性。
## 执行纪律

- **D1**：FE1-FE5 每个决策记录选择 + 理由 + 被拒方案
- **D5**：只设计组件行为和数据流，不涉及外观（fe-system）和接口层（api-design）
- **D4**：团队经验 > 技术先进性，不要过度拆分

## 方法论：组件驱动设计
1. **页面拆解** — 把页面拆成组件树，每层职责单一
2. **数据流明确** — 区分服务端状态（来自 API）和客户端状态（UI 交互）
3. **约束一致性** — 样式、交互、错误处理在整个产品中保持一致
每个决策点都是这套方法论的一个切面。
## 与上下游的边界
**上游**：读 interaction-spec（交互规格）+ notes/api.md（接口合约）+ DESIGN.md（设计系统）
**下游**：notes/frontend.md + modules/*.md 交给 plan 阶段（任务分解）和代码生成
**和 api-design 的切法**：
- api-design 定义**接口合约**（端点+请求+响应）
- frontend-design 定义**怎么消费接口**（数据请求+缓存+状态管理）
**和 fe-system 的切法**：
- fe-system 定义**组件长什么样**（外观、色彩、间距）
- frontend-design 定义**组件怎么工作**（行为、数据流、状态）
## AI 的角色
| 决策点 | AI 角色 | 行为 |
|--------|---------|------|
| FE1 框架 | 技术评估者 | 根据团队经验、SEO 需求、项目周期推荐框架 |
| FE2 状态管理 | 数据流分析者 | 从数据共享需求推导状态管理方案 |
| FE3 样式方案 | 设计系统集成者 | 根据设计系统推荐能消费 Design Token 的样式方案 |
| FE4 数据请求 | 缓存策略者 | 根据 API 调用量和实时需求推荐请求/缓存方案 |
| FE5 表单方案 | 复杂度评估者 | 从表单数量和复杂度推荐表单库和验证方案 |
## 决策点
### 前置判断：项目类型
开始 FE1-FE5 之前先判断项目类型：
| 项目类型 | 特征 | 决策点 |
|---------|------|--------|
| 传统 Web 应用 | DOM 组件、路由、API 调用、表单 | FE1-FE5 全部适用 |
| 创意编码 / Canvas / WebGL | 全屏 Canvas、渲染循环、无 DOM 组件 | FE1 + FE2 适用，FE3-FE5 替换为下方 FE3'-FE5' |
**判断方法**：页面主体是 DOM 元素还是 Canvas/WebGL？如果有 API 调用和表单 → 传统 Web。如果主体是渲染循环且无 DOM 交互 → 创意编码。
---
### FE1: 框架
**问**：团队最熟悉什么？需要 SEO？长期维护还是短期验证？公司级约束？
**不变原则**：团队经验 > 技术先进性 · SEO 决定是否必须 SSR/SSG · 框架迁移成本极高
**记录**：框架 + 版本 + 构建工具 + 选择理由 + 被拒方案
### FE2: 状态管理
**问**：多少数据跨页面共享？数据来自 API 还是用户操作？需要撤销/重做？
**不变原则**：服务端状态和客户端状态是不同的东西 · 服务端状态用缓存/请求库 · 客户端状态用状态管理库 · 状态越少越好
**记录**：方案 + 全局状态清单预估 + 选择理由 + 被拒方案
### FE3: 样式方案
**问**：有设计稿或设计系统？需要暗色模式/多主题？团队擅长 CSS 还是 JS？
**不变原则**：样式隔离 > 样式复用 · 设计系统存在时必须能消费 Design Token · 运行时有开销的方案在大规模应用中会成为瓶颈
**记录**：方案 + 设计 token 来源 + 选择理由 + 被拒方案
### FE4: 数据请求
**问**：大概多少 API 调用？需要实时推送？用户能接受旧数据吗？
**不变原则**：API 调用越多越需要统一的请求/缓存/重试机制 · 手写 fetch 项目变大后会失控 · 实时数据需要独立通信通道
**记录**：方案 + 缓存策略 + 选择理由 + 被拒方案
### FE5: 表单方案
**问**：大概多少表单？有动态增减字段？验证规则需要和后端共享？
**不变原则**：表单是前端最复杂的部分之一 · 验证规则共享能消除前后端不一致 · 非受控组件在大量字段时性能远好于受控组件
**记录**：方案 + 共享 schema 来源 + 选择理由 + 被拒方案
---
### 创意编码替代决策点（FE3'-FE5'）
> 仅当项目类型为创意编码 / Canvas / WebGL 时使用，替代 FE3-FE5。
### FE3': 渲染引擎
**问**：Canvas 2D / WebGL / Three.js / p5.js？性能需求？需要后处理效果？
**不变原则**：2D 体验用 Canvas 2D（够用且轻量） · 需要 3D 或后处理用 WebGL/Three.js · 创意编码优先 p5.js
**记录**：引擎 + 选择理由 + 被拒方案
### FE4': 输入处理
**问**：鼠标 / 触摸 / 摄像头 / 传感器？需要手部/面部追踪？坐标怎么映射？
**不变原则**：输入方案由交互方式决定 · 归一化坐标统一映射到画布尺寸 · 外部输入（摄像头/传感器）异步不阻塞渲染循环
**记录**：输入方案 + 坐标映射策略 + 选择理由 + 被拒方案
### FE5': 动画系统
**问**：程序化动画 / 预制帧 / 物理引擎？时间驱动 / 帧驱动？
**不变原则**：程序化动画扩展性最强（加行为只需写逻辑） · 帧驱动简化状态机逻辑 · 物理引擎对简单场景过度工程
**记录**：动画方案 + 帧率预算 + 选择理由 + 被拒方案
---
## 引导技巧
**组件拆解**："这个页面能拆成哪些独立的部分？"
**状态分类**："这个数据来自 API 还是 UI 交互？"
**样式隔离**："这个样式会影响其他组件吗？"
**表单简化**："这个表单能拆成更小的组件吗？"
## 文档约束
**产出必须包含**：
1. **FE1-FE5 决策**：每个选择 + 理由 + 被拒方案
2. **技术选型表**：所有依赖 + 版本
3. **共享约束**：性能 + 可访问性
4. **模块索引**：每个页面/组件一个 module 文件
### 模块文件格式
每个页面/组件交付：需求 · 验收条件 · 页面结构（组件树）· 数据流（hooks/queries/mutations）· 状态管理（store）· 表单（schema）· 模块特有约束
### 命名约定
- 文件名：PascalCase
- 导出：named export
- Props：类型定义与组件同文件
### 目录结构
```
src/
├── components/     # 可复用组件
├── pages/          # 页面组件（路由级）
├── hooks/          # 自定义 hooks
├── stores/         # 状态 stores
├── lib/            # 工具函数
└── types/          # 共享类型（从 api/ 复用）
```
## 模板
使用前端专用模板：
- `${CLAUDE_SKILL_DIR}/../shared/frontend-goal-template.md` — frontend/goal.md 结构（FE1-FE5 决策 + 前端约束 + 组件索引）
- `${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md` — frontend/modules/*.md 结构（组件结构 + 数据消费 + 依赖）
- `${CLAUDE_SKILL_DIR}/../shared/changelog-template.md` — changelog.md 结构
## 与 project.md 的关系
- project.md 已列出的技术选型 → notes/frontend.md 引用不重复
- notes/frontend.md 只补充前端特有的依赖（如 @react-spring/three、Lucide React）
- 格式：`> 完整技术栈见 project.md，以下为前端补充`
- FE1-FE5 的框架选型如果和 project.md 的前端框架一致，直接引用不重复
## 入口/出口条件
**入口**：有 project.md + PRD.md + interaction-spec.md，或用户已有技术选型、需求和交互设计
**出口**：notes/frontend.md（FE1-FE5 完整）+ modules/*.md + 技术选型表 + 共享约束

**缺失处理**：
- 无 interaction-spec.md → 从 PRD 推导最小交互路径，标注"无交互规格，组件行为需用户确认"
- 无 DESIGN.md → 跳过 FE3 样式方案决策（使用框架默认样式），标注"无设计系统"
- notes/api.md 缺失 → 要求先完成 API 详设，或标注"接口待定义"

## 运行时信号
- 输入：API contract、design tokens、interaction spec
- 输出：frontend specification、component modules
- 路由：详见 `registry.yaml` 的 `forge-frontend-design` 节点；本节只保留人类可读摘要。
- 升级：API 合约缺失 · DESIGN.md 缺失 · 状态方案冲突
## 何时不使用
纯后端 API · 已有完整前端详设 · 简单管理后台（可简化决策流程）
## 红旗清单
- 没有选择理由 → 强制补充（"为什么选这个框架？被拒方案是什么？"）
- 服务端状态和客户端状态混在一起 → 强制分离（"哪些数据来自 API？哪些是 UI 状态？"）
- 没有设计系统但选了运行时 CSS 方案 → 强制评估（"样式怎么保持一致？"）
- 表单数量多但没有表单方案 → 强制补充（"表单验证怎么做？"）
- 没有数据请求策略 → 强制评估（"API 调用怎么缓存？怎么重试？"）
- 和 fe-system 职责重叠 → 拉回（"这是外观还是行为？"）
- module 文件缺少模板必需节（入口 / 公共接口 / 组件结构 / 数据消费 / 内部函数 / 依赖关系）→ 强制补充，参照 `${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`
- 模块索引中的页面/组件没有对应的 module 文件 → 强制补充或从索引移除
## 验证清单
- [ ] FE1-FE5 是否都有选择 + 理由 + 被拒方案？
- [ ] 服务端状态和客户端状态是否分离？
- [ ] 样式方案是否能消费 DESIGN.md 的 Design Token？
- [ ] 每个页面/组件是否有对应的 module 文件？
- [ ] 组件树是否清晰（每层职责单一）？
- [ ] 数据流是否明确（hooks / queries / mutations）？
- [ ] 是否有性能约束（首屏加载、交互响应）？
- [ ] 每个 module 文件是否包含模板必需节（入口 / 公共接口 / 组件结构 / 数据消费 / 内部函数 / 依赖关系）？
## 历史维护（自动）
完成后自动执行：
1. **追加 feature changelog.md**：
   ```markdown
   ### v{版本} — {日期} — 前端详设
   - **触发**：{用户说的一句话}
   - **产出**：notes/frontend.md（FE1-FE5）+ {N} 个页面/组件 modules
   ```
2. **追加 docs/timeline.md**：
   ```markdown
   ### {日期} — {feature} 前端详设
   - 新增：notes/frontend.md + modules/
   ```
3. **检查膨胀**：超 100 行时归档。
## 完成提示
```
✅ 前端详设完成！notes/frontend.md + modules/ 已生成。

下一步你可以：
  plan 阶段  — 进入任务分解（垂直切片 + 依赖图 + 测试推导）
```

