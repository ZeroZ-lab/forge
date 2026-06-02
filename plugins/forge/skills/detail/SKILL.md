---
name: detail
description: Orchestrates the full detail stage across multiple domain contracts to produce contract.md and modules. Use only when the user explicitly asks for detail stage or cross-domain contracts must be coordinated.
when_to_use: Use when the user says technical detail design, detail stage, full contract design, coordinate multiple domain contracts, turn PRD or design docs into technical contracts, or resolve cross-domain contract drift.
---

# Forge Detail — 详设阶段编排

根据项目上下文按需加载领域 skill，产出技术合约文档。

## 运行时角色

`detail` 是中回路 controller。它把上游 PRD、project、DESIGN 和偏差信号转成可投影的 contract，并在 codegen/review 发现漂移时负责 contract 复查和级联更新决策。

运行时闭环参考 `docs/runtime-control-loop.md`；偏差报告结构参考 `${CLAUDE_SKILL_DIR}/../shared/output-contracts/deviation-report.md`。

**Phase 0 例外**：`detail` 的 Phase 0（Feature 骨架创建）和 Phase 4（索引同步 + Module 结构校验）是编排器自己的 domain work——创建 feature/contract.md 作为跨领域共享骨架，维护 project.md 索引。没有单独的 skill 负责 feature 级共享决策和 project.md 索引维护。

## 执行纪律

- **D3**：前端存在性不确定 → 暂停询问；L2 setpoint 漂移 → 中止详设，列矛盾点等人类决策
- **D5**：只加载项目需要的领域 skill（有前端→3 个，纯后端→2 个）
- **D2**：漂移检测以文档为源头，漂移点呈现给用户决策，AI 不自动修改下游文档

## 何时不使用
- 只有一个模块的简单功能（直接使用 api-design 或 frontend-design）
- 已有完整的 contract.md + modules/（无需重新详设）
- 用户只想改一个端点（L1 patch，直接用 api-design）

## 加载判断

先确定加载哪些 skill：

1. 读 project.md 技术选型 → 有没有前端框架？
2. 读已有文档 → 有没有 frontend/ 目录？
3. 如果不确定 → 问用户："这个项目有前端吗？"

**加载组合**：
- **有前端** → `api-design` + `db-design` + `frontend-design`
- **纯后端** → `api-design` + `db-design`
- **纯前端** → `frontend-design`

## 输入状态读取

开始前读取：

- `docs/project.md` 的技术选型、共享约束和核心算法（如有）
- `PRD.md` 或等价需求说明（检查是否有 AC 编号，有则 contract 验收条件可追溯）
- `DESIGN.md` 和 interaction-spec（如有前端）
- 已有 feature `contract.md`、领域 contract 和 modules
- `codegen` 偏差摘要或 `review` 漂移报告（如本次由偏差触发）
- **交叉验证**：读 project.md 工程约束中的测试策略 → 确认即将生成的 contract.md 不与之矛盾（如 project.md 写了 "≥80% 覆盖率"，contract 不能暗示不需要测试）

## 分支与恢复

- 缺 PRD/需求输入 → 不直接写 contract，先要求补需求或明确走最小 detail。
- 前端存在性不确定 → 暂停询问，不默认加载 frontend-design。
- 由同类 L1 偏差触发 → 先复查对应 contract/module 盲区，再决定是否改代码。
- 发现 L2 setpoint 漂移 → 中止详设输出，列出需要人类决策的矛盾点。
- 下游漂移影响范围不清 → 不自动级联修改，先输出漂移报告。

## 红旗清单
- 前端存在性不确定 → 暂停询问（不默认加载 frontend-design）
- PRD 缺失 → 不直接写 contract，先要求补需求或明确走最小 detail
- 由同类 L1 偏差触发 → 先复查 contract 盲区，再决定是否改代码
- L2 setpoint 漂移 → 中止详设，列出矛盾点等用户决策
- feature/contract.md 的 FD# 与 project.md 的 PD# 编号冲突 → 重新分配编号
- 下游漂移影响范围不清 → 不自动级联修改，先输出漂移报告

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 0: Feature 骨架创建**（必选）
创建 feature/contract.md 作为跨领域共享骨架。
1. 从 project.md 提取共享约束和技术选型（含 TD6 工程约束：模块边界规则、public API 约定 → 指导 module 结构）
2. 从 PRD.md 提取核心场景和验收条件摘要
3. 从 project.md「核心算法」（如有）提取算法决策
4. 按 `${CLAUDE_SKILL_DIR}/../shared/contract-template.md` 生成 feature/contract.md：
   - 共享决策（FD#）：跨领域的决策
   - 共享数据模型：跨模块的类型定义
   - 共享约束：性能/安全/兼容性
   - 编排：入口 + 启动序列 + 事件绑定
   - 领域索引：列出后续 Phase 会创建的领域
5. 向用户确认 feature/contract.md 后再进入领域设计

**Phase 1: API 设计**（如有后端）
加载 `api-design` skill，走完 API1-API7 方法论步骤。先确定资源模型、端点、错误、权限、幂等、并发和认证。

**Phase 2: 数据库设计**（如有后端）
加载 `db-design` skill，走完 DB1-DB5 方法论步骤。数据库设计消费 Phase 1 的资源模型和查询模式，不在缺少 API 合约时先行表设计。

**Phase 3: 前端设计**（如有前端）
加载 `frontend-design` skill，走完 FE1-FE5 方法论步骤。

**Phase 4: 索引同步**（必选）
1. 读 project.md Feature 索引
2. 对比本次生成的 feature 目录
3. 如索引缺失该 feature → 追加条目（Feature 名 + 目录路径 + 状态 + 说明）
4. 如索引有已删除的 feature → 标注提醒用户确认删除
5. 如索引的 feature 名称/路径与实际不符 → 修正
6. 检查 project.md 共享决策（PD#）与本次 feature contract（FD#）无编号冲突
7. **Module 结构校验**：扫描所有 modules/*.md 文件，检查是否包含共享模板的必需节：
   - 后端模块（`${CLAUDE_SKILL_DIR}/../shared/module-template.md`）：入口 · 公共接口 · 内部函数 · 依赖关系 · 接口合约
   - 前端模块（`${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`）：入口 · 公共接口 · 组件结构 · 数据消费 · 内部函数 · 依赖关系
   - 缺失必需节 → 列出缺失文件和缺失节，要求补充后再进入下一步

8. **Module Spec 生成**（如 modules/*.md 不存在）：
   对 feature/contract.md 模块索引中的每个模块：
   a. 检查 `modules/<name>.md` 是否存在
   b. 不存在 → 按领域对应模板生成骨架（后端用 `${CLAUDE_SKILL_DIR}/../shared/module-template.md`，前端用 `${CLAUDE_SKILL_DIR}/../shared/frontend-module-template.md`）
   c. 骨架内容从 contract.md 共享数据模型投影：
      - 模块专属的数据模型子集（输入/输出类型）
      - 公共接口签名（从 contract 编排的调用链推导）
      - 验收条件（从 PRD 对应 US 的 AC 编号追溯，格式 `AC-{US编号}-{序号}`，如 AC-01-1）
      - 依赖关系（从编排调用链推导：该模块 import 了哪些其他模块）
   d. 模块数 ≥ 5 → **必须生成** module specs，不允许跳过
   e. 模块数 < 5 → 可选生成，但 contract.md 模块索引需包含完整接口签名（而非仅一行描述）

**contract.md 共享数据模型节制规则**：
- 只放**跨模块共享**的核心类型（如 Point/Rect/CommandResult 等基础结构）
- 模块专属的输入/输出类型 → 放 `modules/<name>.md` 数据模型段
- 如果模块有独立 module spec → contract.md 只列类型名 + 一行说明，不展开字段
- contract.md 目标 ~100 行，含完整数据模型时 ≤ 200 行

## 漂移检测

所有 Phase 完成后，检查跨文档一致性：

1. 读每个领域 contract.md 的「下游依赖」表（如有）
2. 逐一检查下游文档的依赖内容是否仍与当前 contract 一致
3. 汇总：
   - **一致**：记录"下游已同步"
   - **漂移**：列出偏移点和位置，提示用户确认级联更新

**不变原则**：
- 下游依赖表为空或不存在 → 跳过，不报错
- 漂移 ≠ 错误——上游改了下游没跟，可能需要更新也可能不需要
- 漂移点呈现给用户决策，AI 不自动修改下游文档

**偏差信号接收**：如果 codegen 偏差摘要中同类 L1 偏差连续 ≥ 2 个任务出现，建议复查 contract 对应部分——偏差可能是 contract 盲区而非代码问题。

## 运行时信号

- 输入：repeated L1 from forge-codegen、document drift from forge-review
- 输出：contract updated、downstream drift report、human decision needed
- 路由：详见 `registry.yaml` 的 `forge-detail` 节点；本节只保留人类可读摘要。
- 升级：contract ambiguity · downstream drift needs decision · frontend presence unclear

## 产出

```
docs/features/<feature>/
├── contract.md              # feature 级共享骨架（必选）
├── api/                     # 有后端时
│   ├── contract.md
│   └── modules/*.md
├── frontend/                # 有前端时
│   ├── contract.md
│   └── modules/*.md
└── database/                # 有后端时
    └── contract.md
```

## 历史维护（自动）

完成后追加 `docs/timeline.md` + feature `changelog.md`（一条汇总记录）。`api-design`、`db-design`、`frontend-design` 作为子阶段时不单独追加历史。超 100 行时归档。

**更新 docs/status.md**：③详设 → `✅`，下一阶段（④任务）→ `🔄`。如有跳过的阶段（如 ②设计），标注 `⏭️跳过（原因）`。如有依赖的 feature，更新依赖列。

## 验证清单
- [ ] feature/contract.md（FD#）是否包含共享决策 + 共享数据模型 + 共享约束？
- [ ] 所有加载的领域 skill 产出是否完整（API1-API7 / DB1-DB5 / FE1-FE5）？
- [ ] FD# 与 PD# / API# / DB# / FE# 是否无编号冲突？
- [ ] project.md Feature 索引是否已同步？
- [ ] 漂移检测是否已完成？
- [ ] 所有 modules/*.md 是否包含模板必需节？

## 出口条件

完成后必须满足：
- 所有加载的领域 skill 产出完整（api/contract.md API1-API7 / frontend/contract.md FE1-FE5 / database/contract.md DB1-DB5）
- feature/contract.md（FD#）与各领域 contract（FE# / API# / DB#）无编号冲突
- project.md Feature 索引已同步（Phase 4）
- project.md 共享决策（PD#）与 feature contract（FD#）无编号冲突
- 漂移检测已完成（如有下游依赖表）
- 所有 modules/*.md 包含模板必需节（Phase 4 第 7 步校验）

## 完成提示

完成后向用户展示：

```
✅ 详设完成！contract.md + modules/ 已生成。

下一步你可以：
  plan 阶段    — 把详设拆成可执行任务
  自然语言       — 直接说"生成代码"跳过任务分解
```
