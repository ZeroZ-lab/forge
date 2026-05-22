# Task Management — Frontend

> 依赖 api/ 端点合约，遵循共享约束。

## 决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| F1 | 框架 | React 19 | 生态最成熟，组件库丰富，配合 Next.js 可做 SSR | B（Vue 3）团队经验不足；C（Svelte 5）生态不够成熟 |
| F2 | 状态管理 | Zustand | 极简无 boilerplate，适合中小项目，与 React 配合好 | B（Redux Toolkit）boilerplate 多；C（Context）全局状态多了会乱 |
| F3 | 样式方案 | Tailwind CSS | 原子化 CSS，开发快，无运行时开销，约束一致性好 | B（CSS Modules）有运行时开销；C（手写）一致性差 |
| F4 | 数据请求 | TanStack Query | 缓存/重试/乐观更新内置，与 Zod 配合好，社区主流 | B（SWR）功能略少；C（原生 fetch）重复代码多 |
| F5 | 表单 | React Hook Form + Zod | 与 Zod 集成好，非受控组件性能优秀，社区主流 | B（Formik）性能不如 RHF；C（手写）重复多 |

---

## 技术选型

| 层 | 选择 | 理由 |
|---|------|------|
| Framework | React 19 | 生态成熟 |
| Build | Vite 6 | 快速 HMR，原生 ESM |
| Routing | React Router 7 | 标准路由方案 |
| State | Zustand | 极简状态管理 |
| Data Fetching | TanStack Query | 服务端状态管理 |
| Forms | React Hook Form | 高性能表单 |
| Validation | Zod | 与 API schema 共享 |
| Styling | Tailwind CSS 4 | 原子化 CSS |
| Icons | Lucide React | 一致的图标风格 |

---

## Frontend 专属约束

### 性能

- 首屏加载 < 1s（3G Fast）
- 列表滚动 60fps
- 路由切换无闪烁

### 可访问性

- 键盘导航支持
- ARIA 标签
- 焦点管理

### 依赖

- API 合约：`../api/contract.md`
- 共享类型：复用 api/ 中的 Task、Comment 类型定义

---

## 模块索引

| 模块 | 文件 | 说明 |
|------|------|------|
| Task List | modules/task-list.md | 任务列表页（分页、过滤、创建） |
| Task Detail | modules/task-detail.md | 任务详情页（编辑、评论） |
