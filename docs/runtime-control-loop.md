# Forge Runtime Control Loop

> 目标：定义 Forge 在运行时如何使用 24 个协议 skill 形成控制论 / MAPE-K 闭环。
> 关键边界：skills 是协议节点，不是控制系统本体；控制系统产生在执行这些协议的运行过程中。

## 1. 核心判断

Forge 不要求每个 skill 文件都完整实现 MAPE-K。`forge-api-design`、`forge-db-design`、`forge-define` 等 skill 本质上是决策协议，它们的职责是让运行时产出高质量 setpoint 文档。

Forge 真正需要满足的是运行时闭环：

```
用户任务
  -> skill 路由
  -> 读取项目状态
  -> 产出或更新文档
  -> 下游消费文档
  -> 代码投影或验收
  -> 发现偏差
  -> 偏差信号回流
  -> 修正文档 / 修正代码 / 改进方法论 / 请求人类决策
```

## 2. Runtime MAPE-K 映射

| MAPE-K 模块 | Forge 运行时含义 | 主要协议节点 |
|-------------|------------------|--------------|
| Monitor | 读取当前任务、项目文档、feature 文档、代码、测试结果、timeline/changelog、用户确认状态 | `forge-init`、`forge-detail`、`forge-codegen`、`forge-review`、`forge-fe-accept` |
| Analyze | 判断输入是否足够、文档是否漂移、代码是否偏离合约、偏差属于 L0/L1/L2 还是方法论缺陷 | `forge-codegen`、`forge-detail`、`forge-review`、`forge-learn` |
| Plan | 决定下一步走哪个阶段、是否级联更新、如何切任务、如何发布、是否等待人类决策 | `forge-plan`、`forge-detail`、`forge-deploy`、`forge-learn` |
| Execute | 生成文档、投影代码、生成前端、执行发布清单 | `forge-codegen`、`forge-fe-artifact`、`forge-deploy` |
| Knowledge | 提供方法论、模板、历史决策、偏差记录和共享约束 | `skills/shared/`、各 skill `references/`、`docs/timeline.md`、feature `changelog.md` |
| Feedback | 通过测试、validate、review、前端验收和用户确认判断结果是否达标 | `scripts/validate.mjs`、`forge-review`、`forge-fe-accept`、测试文档 |
| Recovery | 修代码、修文档、级联更新、回滚发布、聚合偏差并改进方法论、升级给人类决策 | `forge-codegen`、`forge-detail`、`forge-review`、`forge-learn`、`forge-deploy` |

## 3. 三层控制回路

### 快回路：单任务投影

```
contract.md / modules / plan
  -> forge-codegen
  -> src / tests
  -> 测试 + 四维对照
  -> L0 忽略 / L1 修正 / L2 中止
```

职责：

- `forge-codegen` 是 actuator + local controller。
- L1 偏差在当前任务内修正。
- L2 漂移不应靠代码硬补，必须停止并回到文档或人类决策。

### 中回路：单次迭代修正

```
codegen 偏差摘要 / review 漂移
  -> forge-detail
  -> contract 复查
  -> 下游依赖表检查
  -> 级联更新或等待人类决策
```

职责：

- `forge-detail` 是 contract controller。
- 同类 L1 连续出现时，优先怀疑 contract 盲区，而不是继续局部修代码。
- 上游改动影响下游时，必须显式呈现漂移点，不自动吞掉人类决策。

### 慢回路：跨项目方法论进化

```
review 偏差归因 / changelog / timeline
  -> forge-learn
  -> 聚合同类偏差
  -> 判断是否为 skill 方法论缺陷
  -> 提出修改建议
```

职责：

- `forge-review` 是 sensor + analyzer。
- `forge-learn` 是 meta-controller。
- 单次偏差不是方法论缺陷；同类偏差多次出现才进入 learn。

## 4. Runtime Role 分类

当前 `registry.yaml` 按运行时角色和 typed edges 记录 skill，而不是按“是否完整 MAPE-K”打分。该文件是 JSON-compatible YAML，保持严格 JSON 语法以便无依赖校验。

| 角色 | 含义 | 典型 skill |
|------|------|------------|
| setpoint-generator | 生成目标文档或决策文档 | `forge-define`、`forge-api-design`、`forge-db-design`、`forge-frontend-design` |
| orchestrator | 决定加载哪些协议、阶段如何衔接、何时跳过或等待人类确认 | `forge-init`、`forge-design`、`forge-detail`、`forge-test` |
| planner | 把 setpoint 转成任务、发布或改进计划 | `forge-plan`、`forge-deploy`、`forge-learn` |
| actuator | 把文档投影为代码、前端或发布动作 | `forge-codegen`、`forge-fe-artifact`、`forge-deploy` |
| sensor | 检查实现、设计、文档和运行结果是否偏离目标 | `forge-review`、`forge-fe-accept` |
| governance | 阻止错误投影、错误发布或错误方法论修改 | `forge-review`、`forge-learn` |
| knowledge | 提供模板、概念、评分标准、历史经验 | `skills/shared/`、`references/`、timeline/changelog |

## 5. 偏差信号

Forge 运行时至少需要保留这些信号：

| 信号 | 来源 | 处理 |
|------|------|------|
| L0 噪声 | `forge-codegen` 四维对照 | 忽略，不触发修正 |
| L1 偏差 | 测试失败、字段缺失、状态码不一致、边界遗漏 | 当前任务修正；同类重复时上报 `forge-detail` |
| L2 漂移 | contract 矛盾、需求根本歧义、setpoint 不完整 | 中止，等待文档修正或人类决策 |
| 文档漂移 | `forge-detail` 下游依赖检查、`forge-review` | 呈现影响范围，确认是否级联更新 |
| 方法论缺陷 | `forge-review` 归因为 skill 方法论，且多次出现 | 交给 `forge-learn` 聚合，不单次修改 skill |
| 发布风险 | `forge-deploy` 或 review 发现无回滚、无监控、无健康检查 | 阻塞发布，补 deploy contract |

## 6. 运行时必须停下来的情况

- 上游 setpoint 缺 WHY，却要进入 codegen。
- codegen 发现 L2 漂移。
- detail 发现下游漂移但影响范围不清。
- review 发现 P0/P1 且未修复。
- deploy 没有具体回滚路径或健康检查。
- learn 没有足够偏差证据却要修改 skill 方法论。

## 7. 维护约束

后续维护应优先保证运行时闭环，而不是把所有 skill 改成同一种文档形状：

1. `registry.yaml` 记录 runtime role、consumes、produces、signals_in、signals_out、escalates_when。
2. typed edges 是控制图事实源：`stage_next`、`feedback_to`、`quality_gates`、`signal_routes`。
3. `stage_next` 只表示默认阶段流；反馈和失败恢复必须放入 `feedback_to` 或 `signal_routes`。
4. `signal_routes.to` 如果不是 `forge-*` skill，必须属于允许的外部目标：`human decision`、`runtime release execution`、`skill maintenance`。
5. 编排 skill 保留运行时加载、跳过、恢复和人类确认规则。
6. `forge-detail` 维持中回路：接收 codegen/review 偏差信号，决定 contract 修正和级联更新。
7. `forge-review` 和 `forge-learn` 维持慢回路：偏差归因和方法论进化必须有证据链。
8. validator 和 tests 校验运行时控制面的静态完整性，不校验每个 skill 是否有 MAPE-K 标题。
