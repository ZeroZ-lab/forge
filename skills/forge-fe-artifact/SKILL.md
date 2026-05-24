---
name: forge-fe-artifact
description: 前端代码生成——从组件规格 + 设计系统生成生产级前端代码。forge-codegen 的前端子协议，用户说"生成前端代码"、"写组件"、或由 codegen 自动调用时触发。
---

# FE Artifact — 前端代码生成

## 职责

从详设文档（frontend/modules/*.md）和设计系统（DESIGN.md）生成生产级前端代码。

**核心洞察**：前端代码生成不是"按规格填模板"，是五层翻译——从意图到接口到状态到视图到适配。每层都是决策点，不跳层。跳层 = 生成能跑但不能维护的代码。

**和 forge-codegen 的关系**：fe-artifact 是 codegen 的前端子协议。codegen 遇到前端文件（组件、页面、hooks、样式）时加载 fe-artifact。codegen 负责通用投影规则（读→生→验→修），fe-artifact 负责前端特化的翻译逻辑。

## 与上下游的边界

**上游**：读 frontend/contract.md（F1-F5 技术选型）+ frontend/modules/*.md（组件规格）+ DESIGN.md（三层 Token + 交互模式）+ api/contract.md + api/modules/*.md（接口合约）+ project.md（技术栈）
**下游**：src/components/ + src/pages/ + src/hooks/ + src/stores/ + src/lib/ + src/types/

**和 forge-frontend-design 的切法**：
- frontend-design 定义**做什么**（组件拆分、数据流、状态管理方案）
- fe-artifact 定义**怎么做**（代码怎么写、为什么这样写）

**和 forge-fe-system 的切法**：
- fe-system 产出**可消费的 tokens 和模式**（设计约束）
- fe-artifact **消费** tokens 生成代码（代码实现）

**和 forge-fe-accept 的切法**：
- fe-artifact 生成代码 + 决策注释
- fe-accept 验收代码是否符合标准

## 核心方法论：五层翻译

```
① 意图层     这个组件解决用户什么问题？
     ↓
② 接口层     公共 props / events / slots 是什么？
     ↓
③ 状态层     状态归属在哪？生命周期怎么管理？
     ↓
④ 视图层     有哪些视觉状态？（idle / loading / error / empty / success）
     ↓
⑤ 适配层     响应式怎么折叠？暗色模式怎么切换？可访问怎么保证？
```

**不跳层。** 每层的输出是下一层的输入。跳过接口层直接写视图 = props 不明确，后面要改。跳过状态层直接写视图 = 状态散落各处，后面要重构。

## 五层翻译详解

### 第一层：意图层

**读什么**：frontend/modules/{name}.md 的"需求"和"验收条件"

**做什么**：用一句话总结组件的用户价值。这句话写在组件文件头注释里，让未来维护者 3 秒理解这个组件为什么存在。

**格式**：
```typescript
/**
 * TaskList — 团队协作中的任务浏览和管理
 *
 * 决策来源：frontend/modules/task-list.md
 */
```

**意图层强制规则**：
- 每个组件文件必须有意图层注释——没有 = 红旗，强制补充
- 意图必须回答「这个组件解决用户什么问题」，不是「这个组件是什么」
- 意图层注释必须在文件最顶部，在 import 语句之前

**反例**（不可接受）：
```typescript
/** TaskList 组件 */  // ❌ 没说解决什么问题
```

**正例**（可接受）：
```typescript
/** TaskList — 团队协作中的任务浏览和管理，支持筛选、排序、批量操作 */  // ✅ 用户价值清晰
```

### 第二层：接口层

**读什么**：frontend/modules/{name}.md 的"公共接口"和"依赖关系"

**做什么**：定义 TypeScript interface，区分必填 / 可选 / 默认值。每个 prop 带一行注释说明为什么存在。

**不变原则**：
- Props 最小化——能从其他 props 推导的不单独暴露
- 回调命名用 `on` 前缀 + 过去时（`onTaskSelect` 不是 `onSelectTask`）
- 可选 prop 必须有合理的默认值或明确的行为
- 不暴露内部实现（不传 `className` 控制内部布局）

**格式**：
```typescript
interface TaskListProps {
  projectId: string;                    // 必填，决定数据源
  filter?: TaskFilter;                  // 可选，默认显示全部
  onTaskSelect?: (id: string) => void;  // 可选，不传则不触发选择行为
}
```

### 第三层：状态层

**读什么**：frontend/contract.md 的 F2（状态管理方案）+ modules/{name}.md 的状态管理

**做什么**：决定每个状态归属在哪一层，以及数据获取策略。

**状态归属判断**：
```
只有这个组件用     → 本地 state（useState / useReducer）
父子组件共享       → props 提升（从父组件传下来）
跨页面共享         → 全局 store（按 F2 选型）
来自 API           → 服务端状态（按 F4 选型的请求库管理）
URL 相关           → URL params（searchParams / router state）
```

**不变原则**：
- 能本地就不提升，能提升就不全局——状态作用域越小越好
- 服务端状态和客户端状态用不同的管理方式
- 乐观更新要记录回滚策略

**注释格式**：
```typescript
// D3: 状态归属本地 — 选中态不需要跨组件共享，
//     如果后续需要批量操作再提升到 store
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### 第四层：视图层

**读什么**：frontend/modules/{name}.md 的"页面结构"（组件树）+ DESIGN.md 的交互模式库

**做什么**：实现五种视觉状态，每种状态都有明确的 UI 表达。

**五状态清单**：

| 状态 | 触发条件 | UI 表达 | 不用什么 |
|------|---------|--------|---------|
| idle | 初始 / 无操作 | 默认布局 | — |
| loading | 数据请求中 | 骨架占位 | spinner（列表场景骨架更自然） |
| error | 请求失败 / 操作失败 | 内联重试 | 全屏错误页（组件只是页面一部分） |
| empty | 数据为空 | 引导创建 | "暂无数据"（没有行动指引） |
| success | 数据正常 | 完整内容 | — |

**不变原则**：
- 五个状态都必须有明确的 UI 表达——漏掉 empty 或 error 是常见缺陷
- 状态互斥——不能同时显示 loading 和 empty
- 组件的加载态和页面的加载态不同——组件用骨架，页面用 skeleton layout
- 消费 DESIGN.md 的交互模式库——列表模式、表单模式、反馈模式已在设计系统中定义
- **跳过状态必须声明**——如果某个状态不适用（如同步读取无需 loading），必须在代码中写注释说明为什么跳过，并保留代码结构便于后续扩展

**跳过状态的声明格式**：
```typescript
// D2: 五状态 — loading（localStorage 同步读取，无需 loading 态）
//     如果后续改为异步存储（IndexedDB / API），在此处添加骨架屏
```

### 第五层：适配层

**读什么**：DESIGN.md 的响应式断点 + 移动端约束 + 暗色模式

**做什么**：实现响应式布局、暗色模式切换、可访问性保障。

**响应式策略**：
```
Mobile-first：先写移动端样式，用 min-width 增强桌面端
断点从内容推导：内容挤了/散了 = 需要断点，不是"到了 768px 就切"
折叠策略：导航 → 汉堡菜单 · 表格 → 横向滚动/卡片化 · 侧边栏 → 抽屉
```

**暗色模式**：消费 DESIGN.md 的三层 Token——组件层 token 不变，语义层自动切换。

**可访问性**：
- 所有交互元素有 keyboard 支持
- 有意义的 ARIA labels（不是每个 button 都加 aria-label）
- focus 管理（dialog 打开时 focus trap，关闭时 focus 回到触发元素）
- 色彩不作为唯一信息载体（错误不能只变红色，还要有图标/文字）

## 投影规则

codegen 通用投影规则的前端特化版。

| 文档来源 | 推导目标 | 推导方式 |
|---------|---------|---------|
| frontend/modules/*.md 需求 | 组件文件头注释 | 需求描述 → 一句话意图 |
| frontend/modules/*.md 公共接口 | TypeScript interface | 函数签名 → Props + Events |
| frontend/modules/*.md 状态管理 | useState / store / hook | 状态归属决策 → 代码实现 |
| frontend/modules/*.md 数据流 | 请求 hook / mutation | API 调用 → 请求库封装 |
| frontend/modules/*.md 页面结构 | JSX 组件树 | 组件拆分 → 嵌套结构 |
| DESIGN.md 交互模式 | 组件内部布局 | 模式库 → 组合规则 |
| DESIGN.md 组件 Token | CSS / 样式 | Token → 样式值 |
| DESIGN.md 响应式 | 媒体查询 / 条件渲染 | 断点策略 → 样式分支 |
| api/modules/*.md 端点 | API 调用函数 | 接口合约 → typed fetch |
| frontend/contract.md F1-F5 | 技术实现选型 | 框架/状态/样式方案 → import |

**注释规则**：每个关键逻辑分支注释对应的决策编号（D1-D7、AC1-AC8、F1-F5），让人类审查代码时可直接跳转文档理解 WHY。

## 文件结构规则

从 frontend/contract.md + project.md 推导，不从技术惯例推导。

```
src/
├── components/     # 可复用组件（被多个页面引用）
├── pages/          # 页面组件（路由级，一个路由 = 一个文件）
├── hooks/          # 自定义 hooks（跨组件的状态/逻辑复用）
├── stores/         # 全局状态 stores（按 F2 选型）
├── lib/            # 工具函数（纯函数，无副作用）
└── types/          # 共享类型（从 api/ 复用，不重复定义）
```

**不变原则**：
- 组件文件 = 组件 + Props interface + 相关 sub-components（一个文件解决一个组件）
- hooks 独立文件——不在组件文件里导出 hook
- 类型优先从 api/ 复用——前端不重新定义后端已有的类型
- 工具函数纯函数——不依赖 React、不依赖全局状态

## 生成流程

### 读取阶段

```
1. 读 project.md     → 技术栈、共享约束
2. 读 frontend/contract.md → F1-F5 选型（框架、状态、样式、请求、表单）
3. 读 DESIGN.md      → 三层 Token + 交互模式库 + 响应式规则
4. 读 api/contract.md + api/modules/*.md → 接口合约
5. 读 frontend/modules/{name}.md → 当前组件的规格
```

### 交接检查点（读取后、生成前）

读完 DESIGN.md 后，**先校验完整性，再生成代码**。不校验 = 生成时被迫硬编码。

```
DESIGN.md 完整性检查清单：
□ 三层 Token 都有（原始值 / 语义层 / 组件层）
□ CSS 变量输出段存在（:root { ... }）
□ 交互模式库至少覆盖当前组件类型（列表？表单？导航？反馈？）
□ 响应式断点已定义
□ 暗色模式已声明（支持 / 不支持）

缺失项处理：
- 缺三层结构 → 中止，提示用户先跑 fe-system
- 缺 CSS 变量 → 中止，提示用户补完 DESIGN.md
- 缺交互模式 → 降级生成，在代码注释标注「DESIGN.md 缺少 X 模式，此处为 AI 推断」
- 缺响应式断点 → 降级生成，使用行业默认值（640/768/1024），标注来源
```

**为什么需要交接检查点**：测试发现，当 DESIGN.md 缺少某个 Token（如标签筛选的渐变遮罩），fe-artifact 会直接硬编码实现。验收阶段才发现 = 返工。在读取阶段拦截 = 预防。

### 生成阶段

```
对每个 frontend/modules/{name}.md：
  1. 意图层：一句话总结 → 文件头注释
  2. 接口层：Props interface → TypeScript 定义
  3. 状态层：状态归属 → useState / store / hook
  4. 视图层：五状态 → JSX + 条件渲染
  5. 适配层：响应式 + 暗色 + 可访问 → CSS + ARIA
```

### 验证阶段

```
每个组件生成后：
  - 和 modules/{name}.md 对齐（验收条件是否全部覆盖）
  - 和 DESIGN.md 对齐（是否只用了 Token，没有硬编码值）
  - 和 api/contract.md 对齐（请求参数、返回值、错误码是否一致）
  - 检查五状态是否都实现
```

## AI 的角色

| 阶段 | AI 角色 | 行为 |
|------|---------|------|
| 读取 | 文档解析者 | 读所有上游文档，建立完整的生成上下文 |
| 意图 | 价值提炼者 | 从需求描述提炼一句话用户价值 |
| 接口 | API 设计者 | 从模块接口推导 TypeScript Props |
| 状态 | 数据流架构师 | 从状态归属决策生成状态管理代码 |
| 视图 | UI 实现者 | 从组件树和交互模式生成 JSX |
| 适配 | 响应式工程师 | 从断点策略生成适配代码 |
| 验证 | 一致性检查者 | 代码和文档对齐 + Token 合规检查 |

## 入口/出口条件

**入口**：有 frontend/contract.md + modules/*.md + DESIGN.md + api/contract.md（由 codegen 自动加载）
**出口**：src/components/ + src/pages/ + src/hooks/ + src/stores/ + src/lib/ 已生成 · 代码和文档对齐 · Token 合规 · 五状态全覆盖

## 何时不使用

纯后端 API · 没有前端详设文档（先走 forge-frontend-design）· 没有设计系统（先走 forge-fe-system）

## 红旗清单

- 跳过五层翻译中的某层 → 强制按层执行
- 硬编码设计值（`color: #3B82F6` 而不是 `var(--color-accent)`）→ 强制用 Token
- 五状态缺少任一 → 强制补全
- Props 接口过大（超过 8 个 prop）→ 强制拆分组件
- 状态归属不合理（本地状态放全局）→ 强制降级
- 没有注释决策编号 → 强制标注
- 可访问性缺失（交互元素无 keyboard 支持）→ 强制补充
- 移动端样式是桌面端缩放 → 强制 mobile-first
- 服务端状态用客户端状态管理 → 强制分离

## 验证清单

- [ ] 五层翻译是否完整执行（意图→接口→状态→视图→适配）？
- [ ] 每个组件是否有一句话意图注释？
- [ ] Props interface 是否最小化？
- [ ] 状态归属是否合理（能本地不全局）？
- [ ] 五状态是否全部实现（idle/loading/error/empty/success）？
- [ ] 是否只使用 DESIGN.md 的 Token（无硬编码值）？
- [ ] 响应式是否 mobile-first？
- [ ] 可访问性是否覆盖（keyboard nav + ARIA + focus management）？
- [ ] 关键逻辑是否注释了决策编号？
- [ ] 代码和 modules/*.md 验收条件是否对齐？

## 历史维护（自动）

由 codegen 统一维护。fe-artifact 作为 codegen 子协议时不单独追加历史。独立调用时追加 `docs/timeline.md`。

## 完成提示

```
✅ 前端代码生成完成！src/ 前端部分已生成。

下一步你可以：
  自然语言       — 说"验收前端"进入 fe-accept
  /forge-test    — 测试策略 + 测试用例
```
