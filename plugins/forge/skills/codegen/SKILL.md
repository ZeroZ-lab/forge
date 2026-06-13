---
name: codegen
description: Implements goals into src and tests, verifying results meet stated criteria.
when_to_use: Use by direct invocation or as a child protocol when the user explicitly asks to generate implementation from Forge goals, run the build phase, or implement documented tasks into code and tests.
---

# Codegen — 构建阶段

## 职责

从 `goal.md + modules/*.md` 和可选 `plan.md` 生成最小可运行代码与测试。codegen 不重新做产品或技术决策；它把目标实现出来，并用运行验证证明目标达成。

## 执行纪律

- D4：范围不超出当前任务和对应 module，不引入未要求抽象。
- D5：只读相关文档和代码；无关问题只记录。
- D7：生成后验证，不用猜测替代证据。
- D8：同类问题连续 ≥2 次，建议回到 detail 复查目标。
- D9：代码变更完成前必须有运行证据；无法运行标记 `⚠️ 未验证`。

## 上下游边界

上游：`project.md`、`goal.md`、`modules/*.md`、`plan.md`、`DESIGN.md`（如有前端）、历史风险。下游：`src/`、`tests/`、验证摘要和 Trace Report。遇到前端组件/页面/hooks/样式时加载 `fe-artifact`。

## 方法论：读→生→验→修

### 第一步：读（Read）

读取目标文档、任务顺序、共享约束、设计系统和既有代码。识别 PD#/FD#/DB#/AC 编号；跳过读取直接写代码视为目标漂移风险。

### 第二步：生（Generate）

按 `plan.md` 拓扑顺序执行；没有 plan 时从 goal 推导最小任务序列并声明。每个任务只改完成当前验收所需文件。业务逻辑来自 modules，接口和数据模型来自 goal，目录结构来自 project。

推导规则：

| 来源 | 目标 |
|------|------|
| goal 端点/数据模型 | routes、schemas、db schema |
| modules 业务规则/边界 | services、unit tests |
| goal 验收条件 | route/e2e tests |
| project 技术选型 | package/config |
| DESIGN + 前端 modules | components/pages/hooks/styles |

关键逻辑注释来源编号：`FD#` 优先，必要时补 `PD#`、`DB#`、`AC#`。

### 第三步：验（Verify）

先做运行验证，再做目标对照：

1. 编译/类型/语法检查。
2. 服务或核心入口可启动。
3. 至少一个核心健康或主路径响应正常。
4. 运行当前任务相关测试。
5. 对照 goal/modules：端点、字段、状态码、错误格式、权限、幂等、共享约束。

简单任务任务末对照一次；复杂任务或验收 ≥3 项时分步对照。运行验证失败不得声明完成。

### 第四步：修（Fix）

失败时判断根因：代码实现、文档歧义、文档未同步、范围蔓延。代码错就修代码；文档缺口先补文档并记录历史；修正后回到验证。3 轮仍不收敛时停止并交给用户决策。

每个任务输出验证摘要：`自动修正 N · 中止 M · 待确认 K · 归因：skill / 文档 / 代码 / 范围`。

## 实现规则

- 严格按任务序列，不跳任务、不合并任务。
- 路由不写业务逻辑，服务不管 HTTP，测试覆盖验收和边界。
- AI 补充实现细节必须能从文档约束推导；不能推导则标注假设或回到 detail。
- `src/` 和 `tests/` 结构从 goal/project 推导，不从个人偏好推导。
- 不生成 docs、deploy、监控配置，除非目标明确要求。

## 入口/出口条件

入口：有 `goal.md`，最好有 `modules/*.md + plan.md`；goal-quality 至少满足源完整性和可重构性。缺 plan 时声明 AI 推导任务顺序；缺 modules 时声明模块文档缺失并从 goal 推导。

出口：相关 `src/ + tests/` 已生成；运行验证、相关测试、目标对照通过；无法验证的部分明确标记；用户确认或阻塞项已交出。

## 运行时信号

- 输入：detail feature goal；plan task sequence。
- 输出：generated code；verification summary；repeat issue signal。
- 升级：目标矛盾、需求歧义、修正 3 轮不收敛、范围蔓延。

## 何时不使用

纯文档任务、已有完整代码且只需 review、用户只要求测试策略或发布规划。

## 红旗清单

- 未读目标文档就改代码。
- 运行验证未执行却声明完成。
- 代码和 goal/modules 不一致。
- 测试只验证实现细节，不覆盖 AC。
- 关键逻辑无决策编号。
- 添加 goal 之外的新功能或依赖。
- 多租户、权限、软删除等共享约束未注入。

## 验证清单

- [ ] 是否读完相关目标文档和既有代码？
- [ ] 文件结构是否由 goal/project 推导？
- [ ] 是否有运行验证（编译/启动/核心响应）？
- [ ] 相关测试是否通过，目标对照是否一致？
- [ ] 关键逻辑是否注释 FD#/PD#/DB#/AC#？
- [ ] 修正循环是否收敛，同类问题是否上报？
- [ ] Trace Report 是否与 CU 完成证据对齐？

## 历史维护（自动）

完成后追加 feature `changelog.md` 和 `docs/timeline.md`，并生成 `docs/features/<feature>/trace-<date>.md`。Trace 只抽取验证摘要和 CU 证据，不新增事实采集；模板见 `${CLAUDE_SKILL_DIR}/../shared/trace-template.md`。

## 完成提示

报告已改文件、运行验证命令、测试结果、目标对照结果、未验证风险和下一步 review/deploy 建议。
