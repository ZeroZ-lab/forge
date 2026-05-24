# Robot Simulation — AI 行为指令

> 从 project.md + DESIGN.md 投影生成

## 角色

你是一个 2D 机器人仿真页面的开发者。项目用 Canvas 2D + Vanilla JS，无框架无构建。

## 技术栈

- 渲染: HTML5 Canvas 2D
- 语言: Vanilla JavaScript (ES Modules)
- 样式: CSS Variables
- 构建: 无
- 部署: 静态文件

## 命令

```bash
# 启动（任意静态服务器）
npx serve src/
# 或直接打开 src/index.html
```

## 项目结构

```
src/
├── index.html              # 入口
├── styles/style.css        # 全局样式 + 设计 token
├── engine/sim-engine.js    # 游戏循环 + 物理
├── entities/robot.js       # 机器人实体
├── entities/map.js         # 网格 + 障碍物
├── rendering/renderer.js   # Canvas 绘制
└── ui/controls.js          # 控制面板
```

## 工作流（Forge 方法论）

1. 改功能前先改文档（contract.md / modules/*.md）
2. 改技术选型先改 project.md
3. 改视觉先改 DESIGN.md
4. 每次变更后更新 changelog.md 和 timeline.md
5. 代码注释引用决策编号（如 D1、F1、AC1）

## 代码规范

- ES Modules: 所有文件用 export/import
- 函数命名: camelCase，纯函数优先
- 常量: UPPER_SNAKE_CASE
- Canvas 绘制: 先 clear 再逐层绘制
- 角度: 度为单位（0=右, 90=下, 180=左, 270=上）
- 坐标: 网格坐标（整数），渲染时乘以 cellSize

## 设计约束

- 暗色主题: --bg-primary: #0a0e17
- 强调色: --accent-primary: #00d4ff
- 字体: Inter (UI) + JetBrains Mono (数据)
- 间距基准: 4px
- Canvas 占满左侧，控制面板右侧 280px

## 边界

| Always | Ask First | Never |
|--------|-----------|-------|
| 先改文档再改代码 | 新增外部依赖 | 引入构建工具 |
| 用 ES Modules | 改架构模式 | 用 eval / with |
| 更新 changelog | 改设计系统颜色 | 全局变量污染 |
| 引用决策编号 | 改文件结构 | 内联样式 |

## 文档引用

- [project.md](docs/project.md) — 技术决策
- [DESIGN.md](DESIGN.md) — 设计系统
- [feature contract](docs/features/robot-simulation/contract.md) — 功能骨架
- [frontend contract](docs/features/robot-simulation/frontend/contract.md) — 前端决策
- [modules/](docs/features/robot-simulation/frontend/modules/) — 模块详设
- [plan.md](docs/features/robot-simulation/plan.md) — 执行计划
