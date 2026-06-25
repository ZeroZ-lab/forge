# Forge Usage Scenarios

> 默认先走最短链。只有当信息不够、任务变复杂、或需要治理时，才展开更多阶段。

## 一句话规则

- 不清楚做什么：先 `define`
- 不清楚怎么做：加 `research`
- 清楚要做什么：进 `detail`
- detail 写完：进 `codegen`
- 实现出来：进 `review`
- 任务很多或有依赖：加 `plan`
- 风险高或要沉淀测试资产：加 `test`
- 要发布、灰度、回滚、监控：加 `deploy`
- 多个 feature 并行：使用 issue tracker / project board
- 要追溯项目演进：读取 `docs/change-units/`

## 场景例子

### 1. 新项目从 0 到 1

例子：做一个团队任务管理 SaaS，产品范围、交互和技术栈都还没定。

推荐流程：
`brainstorm -> init -> define -> research(按需) -> design -> detail -> plan -> codegen -> test -> review -> deploy`

为什么：

- 目标还模糊，要先发散和收敛
- 项目级技术和设计规范还不存在
- 后续会有多 feature、多轮迭代，前面的决策值得沉淀

### 2. 已有项目，中等新功能

例子：给现有任务系统加“标签 + 筛选 + 权限限制”。

推荐流程：
`define -> detail -> plan -> codegen -> review`

按需再加：

- `test`：测试要求高时
- `deploy`：上线风险高时

为什么：

- 需求本身还需要澄清
- 会跨 API、前端、数据库，适合先拆任务

### 3. 已有项目，小功能迭代

例子：任务详情页增加“复制任务链接”按钮。

推荐流程：
`detail -> codegen -> review`

为什么：

- 需求明确
- 影响范围小
- 不值得先写独立 `PRD.md`；任务序列留在对话/issue

### 4. 加一个很小的端点或模块

例子：新增 `GET /tasks/:id/history` 接口。

推荐流程：
`detail -> codegen`

为什么：

- 主要是局部 contract 变更
- 如果实现直接，review 可以保持轻量

### 5. Bugfix

例子：创建任务时报 500，原因是 `dueDate` 为空时 schema 崩了。

推荐流程：
`detail -> codegen -> review`

判断重点：

- 如果是实现偏差：修 code
- 如果是 contract 漏了边界：先补 `detail`，再修 code

### 6. 高风险或治理场景

例子：上线支付功能、做多 feature 协调、同类错误反复出现。

默认从主链开始，再按需补：

- 加 `plan`：任务复杂，需要切片、依赖、并行
- 加 `test`：需要独立测试策略和测试用例
- 加 `deploy`：需要灰度、回滚、监控
- 多 feature 状态交给 issue tracker / project board
- 项目级决策演进由 project/ADR + Change Units 承担
- 进 `think`：需要深度推演

## 决策表

| 当前情况 | 进入哪一步 | 不进入哪一步 |
|---|---|---|
| 需求已经很清楚，只差补实现 | `detail` | 不先开 `define` |
| 需求描述还有明显歧义 | `define` | 不直接 `codegen` |
| 技术方案不确定，比如实时、搜索、推荐、协作 | `research` | 不直接拍板进 `detail` |
| 只是小功能迭代 | `detail -> codegen -> review` | 不默认开 `plan/test/deploy` |
| 会跨前后端或数据库，且改动不止一个点 | `detail`，通常再加 `plan` | 不只改一个 module 就开工 |
| 任务很多、存在依赖、要并行 | `plan` | 不直接让 `codegen` 自由展开 |
| 只是局部 bugfix | `detail -> codegen -> review` | 不默认走完整生命周期 |
| bug 暴露出需求或边界没写清 | 回到 `define` 或 `detail` | 不只补代码 |
| 需要正式测试策略和测试用例沉淀 | `test` | 不把测试要求全塞进 `review` |
| 需要发布、灰度、回滚、监控 | `deploy` | 不把上线动作混进 `codegen/review` |
| 多个 feature 并行推进 | 使用 issue tracker / project board | 不创建项目内状态事实副本 |
| 需要记录项目级演进或跨 feature 决策 | 更新 project/ADR，并写 Change Unit | CU 提供历史和验证证据 |
| 同类偏差反复出现 2-3 次 | 重新审视 `define`/`detail` 目标定义 | 不一直局部打补丁 |

## 最短记忆版

- 新项目：全链路
- 新功能：`define -> detail -> codegen -> review`
- 小功能：`detail -> codegen -> review`
- 小端点：`detail -> codegen`
- bugfix：`detail -> codegen -> review`
- 高风险上线：在上面基础上加 `plan/test/deploy`
