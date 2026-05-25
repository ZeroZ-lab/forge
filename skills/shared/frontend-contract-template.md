# frontend-contract-template.md — 前端 contract 模板

> forge-frontend-design 专用。产出 frontend/contract.md。
> 决策编号使用 FD# 前缀（Feature Decision），与 project.md 的 PD# 区分。
> 目标：~80 行，几乎不变。

---

# Frontend Contract — <Feature Name>

> 前端技术合约：FD1-FD5 决策 + 共享约束 + 模块索引。

## 共享决策

> 完整技术栈见 project.md，以下只记前端特有的决策。

| # | 决策 | 选择 | 详情 |
|---|------|------|------|
| FD1 | 框架 | | Next.js / Nuxt / Vite + React / ... |
| FD2 | 状态管理 | | Zustand / Redux / Jotai / ... |
| FD3 | 样式方案 | | Tailwind / CSS Modules / Styled Components / ... |
| FD4 | 数据请求 | | fetch + cache / SWR / TanStack Query / ... |
| FD5 | 表单方案 | | React Hook Form / Formik / 不需要 |

### FD1: 框架

**选择**：  
**理由**：  
**拒绝**：

### FD2: 状态管理

**选择**：  
**理由**：  
**拒绝**：  
**状态分类**：
- 服务端状态：（来自 API 的数据）
- 客户端状态：（UI 交互状态）

### FD3: 样式方案

**选择**：  
**理由**：  
**拒绝**：  
**Token 来源**：（DESIGN.md CSS 变量 / 自定义 / 无设计系统）

### FD4: 数据请求

**选择**：  
**理由**：  
**拒绝**：  
**缓存策略**：（内存缓存 / HTTP 缓存 / SWR / 无 API）

### FD5: 表单方案

**选择**：  
**理由**：  
**拒绝**：

---

## 共享数据模型

> 跨组件共享的类型定义（store 类型、API 响应类型）。

```typescript
interface SharedType {
  field: type
}
```

---

## 共享约束

### 性能

- （帧率目标 / 首屏加载 / 交互响应时间）

### 可访问性

- （键盘导航 / aria 属性 / 颜色对比度）

---

## 技术选型

> 完整技术栈见 project.md，以下为前端补充依赖。

| 层 | 选择 | 版本 | 理由 |
|---|------|------|------|
| （前端特有依赖） | | | |

---

## 模块索引

| 模块 | 文件 | 核心组件 | 说明 |
|------|------|---------|------|
| | modules/xxx.md | | |

---

## 代码映射

```
contract.md ──────────→ src/types/ (共享类型)
                         src/stores/ (状态管理)

modules/<name>.md ────→ src/components/<Name>.tsx
                         src/hooks/use<Name>.ts
```

---

## 编排

> 入口文件 + 组件树 + 数据流。
> 详细结构使用 `skills/shared/contract-orchestration-template.md`。

### 入口文件

`src/<entry-file>` — 主页面/入口，组装所有组件。

### 组件树

```
entry-file
├── ComponentA
│   ├── SubComponent1
│   └── SubComponent2
└── ComponentB (条件渲染)
```

### 数据流

```
data-source → store (Zustand/Redux/...)
               ├── fieldA ← ComponentX 读取
               └── actionB() ← ComponentY 调用
```

---

## 下游依赖

| 下游文档 | 依赖内容 | 最后同步 |
|---------|---------|---------|
| contract.md | 数据模型、共享约束 | |
| interaction-spec.md | 组件交互规格 | |
| DESIGN.md | Token、样式 | |
