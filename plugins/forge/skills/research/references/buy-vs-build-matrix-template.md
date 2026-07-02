# Buy-vs-Build 矩阵 — <主题>

> research 在「标准件密集信号」场景的可选输出：按能力盘点生态标准件 → 选型 → 自研判定。非默认产物，非 durable artifact；接受的选型写回 `project.md` 共享决策表或 ADR，本矩阵是中间证据。

## 何时用

仅在出现**标准件密集信号**时输出——目标领域有成熟框架/组件库/SDK/ORM/认证服务/部署平台等生态：

- 前端应用（UI 框架 / 样式 / 组件库 / 高亮 / 内容渲染 / 状态 / 校验 / 部署）
- 管理后台、内容平台、SaaS MVP、内部工具、AI 工具站

**何时不填**（反普适化锚点）：后端核心服务、算法/模型选择、基础设施、数据一致性、安全敏感模块——这些领域标准件生态稀薄，强填会得到一堆空行噪音，应走 research 默认的算法菜单，不要套本矩阵。

> 简化规则：标准件选，不造；业务件拆，再造；转接件集中造；核心规则人定，AI 补。

---

## 版本信息

| 项目 | 值 |
|------|-----|
| 日期 | YYYY-MM-DD |
| 产品愿景 | （来自 goal.md / project.md） |
| 触发信号 | （前端 / SDK / ORM / 认证 / 部署 / ...） |

---

## 能力盘点

| 能力 | 候选标准件 | 选择理由 | 不适用场景 | 是否自研 | 决策 ID |
|------|----------|---------|-----------|---------|---------|
| 前端框架 | Next.js / Remix / Vite+React | | SSR 不需要时 | 不自研 | research_recommendation |
| 样式系统 | Tailwind / CSS Modules | | | 不自研 | research_recommendation |
| UI 组件 | shadcn/ui / Ant Design / MUI | | | 不自研 | research_recommendation |
| 状态管理 | Zustand / URL state / Redux | | | 轻量使用 | research_recommendation |
| 数据校验 | Zod / Valibot | | | 不自研 | research_recommendation |
| 部署 | Vercel / Docker / 自建 | | 合规要求自建机房 | 不自研 | research_recommendation |

**自研判定**（填入「是否自研」列的依据）：

| 类型 | 处理方式 |
|------|---------|
| 成熟框架已有 | 直接用标准件 |
| 组件库已有 | 直接组合，不自研 |
| 业务强相关 | 自研 / 让 AI 生成 |
| 数据转换逻辑 | 自研 adapter，集中到 mapper 层 |
| 重复样板代码 | 让 AI 批量生成 |
| 架构边界 | 人先设计，AI 辅助补全 |
| 安全 / 权限 / 支付 | 人严格审查，AI 不能自由发挥 |
| 核心复杂逻辑 | AI 可辅助，但必须测试验证 |

---

## 选型理由（每行候选重复以下结构）

**能力: <名称>**
- **推荐标准件**：
- **为什么选它**：（成熟度 / 生态 / 团队经验 / 上下文匹配）
- **什么情况下不适用**：（触发换选的条件）
- **耦合点**：（卡扣 = 类型 / Props / Schema / 事件协议，见 detail module 接口）

---

## 写回约定

- 接受的选型 → `project.md` 共享决策表（项目级）或 feature `goal.md` FD 决策（feature 级）。
- 难逆且反直觉的选型（如选择非主流框架）→ ADR。
- 本矩阵**不落 durable 文件**——默认对话输出；仅当研究证据有独立复核/交接责任时，并入 `research-brief.md` 而非另建文件。
