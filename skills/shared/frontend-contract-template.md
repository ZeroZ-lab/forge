# frontend-contract-template.md — 前端 contract 模板

> forge-frontend-design 专用。产出 frontend/contract.md。
> 只放前端特有的决策（FE#）和组件索引。共享数据模型、编排、下游依赖在 feature/contract.md。
> 目标：~80 行，几乎不变。

---

# Frontend Contract — <Feature Name>

> 前端技术合约：FE1-FE5 决策 + 前端约束 + 组件索引。
> 共享数据模型、编排、下游依赖在 feature/contract.md。

## 前端决策

> 完整技术栈见 project.md，以下只记前端特有的决策。
> 项目类型为创意编码 / Canvas / WebGL 时，FE3-FE5 替换为 FE3'（渲染引擎）、FE4'（输入处理）、FE5'（动画系统）。

| # | 决策 | 选择 | 详情 |
|---|------|------|------|
| FE1 | 框架 | | Next.js / Nuxt / Vite + React / ... |
| FE2 | 状态管理 | | Zustand / Redux / Jotai / ... |
| FE3 | 样式方案 | | Tailwind / CSS Modules / Styled Components / ... |
| FE4 | 数据请求 | | fetch + cache / SWR / TanStack Query / ... |
| FE5 | 表单方案 | | React Hook Form / Formik / 不需要 |

### FE1: 框架

**选择**：  
**理由**：  
**拒绝**：

### FE2: 状态管理

**选择**：  
**理由**：  
**拒绝**：  
**状态分类**：
- 服务端状态：（来自 API 的数据）
- 客户端状态：（UI 交互状态）

### FE3: 样式方案

**选择**：  
**理由**：  
**拒绝**：  
**Token 来源**：（DESIGN.md CSS 变量 / 自定义 / 无设计系统）

### FE4: 数据请求

**选择**：  
**理由**：  
**拒绝**：  
**缓存策略**：（内存缓存 / HTTP 缓存 / SWR / 无 API）

### FE5: 表单方案

**选择**：  
**理由**：  
**拒绝**：

---

## 组件 Props / 类型

> 前端组件的接口定义。跨领域共享的数据模型在 feature/contract.md。

```typescript
interface SharedType {
  field: type
}
```

---

## 前端约束

> 前端特有的约束。共享约束在 feature/contract.md。

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
frontend/contract.md ──→ src/types/ (前端类型)
                          src/stores/ (状态管理)

modules/<name>.md ────→ src/components/<Name>.tsx
                         src/hooks/use<Name>.ts
```
