# adaptive-kernel-runtime

> 将 Forge 的生产运行入口从固定生命周期主链迁移为 Kernel-first 自适应执行：Kernel 只约束目标、权限、范围、状态、证据和完成条件；模型可以直接行动，也可以按边际价值调用任意、多个或零个 Skill。

## Intent

Forge 0.52.0 以 `detail → codegen → review` 作为默认心智模型。它为较弱模型提供了稳定脚手架，但也把阶段、文档和自审路径预先施加给所有模型。随着模型能力增强，固定链会产生上下文税、路径锚定、重复审查和不必要产物，并与 Forge Next 已建立的 Kernel 非干扰边界、`adaptive-full` 零调用语义和动作路径中立 Outcome 冲突。

本 feature 完成 Forge Next B10 的生产运行契约迁移。迁移不声称 adaptive Skills 已被真实实验证明优于 Kernel-only；它只保证固定 Skill 路径不再成为生产完成条件，并保留 0.52.0 legacy chain 作为显式兼容和效果对照。

## Boundaries（非目标）

- **不在本 feature**：实现 B09 跨 repeat/arm 统计、模型排名或发布 effectiveness 结论。
- **不在本 feature**：新增 `kernel` Skill。Kernel 必须位于始终加载的项目/host 控制面，不能依赖模型选择调用。
- **不在本 feature**：删除任何已发布生命周期 Skill；它们继续作为可选能力和显式兼容入口。
- **不在本 feature**：把模型名、Skill 命中率、阶段完成或动作路径作为成功代理。
- **不在本 feature**：改变 B08 outcome evaluator、四臂证据语义或 0.52.0 legacy tree 绑定。
- **不在本 feature**：声称 Claude Code 与 Codex 已有同等的 always-on host enforcement；无始终加载项目指令的平台只能提供 best-effort Skill 协议。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | 新的共享运行契约明确 Kernel 六项职责、非干扰边界、直接行动与零 Skill 合法性，并禁止用 Skill/stage/action path 判定完成 | `tests/adaptive-runtime-contract.test.mjs` |
| AC2 | 根 `AGENTS.md` 与 init 生成的 `AGENTS.md` 模板默认采用 Kernel-first；清晰低风险任务可直接行动，Skill 只在边际收益高于加载/执行成本时使用 | `tests/adaptive-runtime-contract.test.mjs` |
| AC3 | Chain Owner 契约明确同一用户目标只有一个全局状态/CU owner；child Skill 只返回局部结果，不写重复 CU | `tests/adaptive-runtime-contract.test.mjs` + history ownership tests |
| AC4 | verification 与 independent review 分离：L0/L1 可做非独立 self-check，L2/L3 或 P0/P1 需要独立 reviewer/verifier；无独立条件时必须披露残余风险 | `tests/adaptive-runtime-contract.test.mjs` |
| AC5 | `detail`、`codegen`、`review` 和 `guide` 明确 use/skip/no-op 边界；不再把固定下一阶段作为生产完成条件 | 内容测试 + `npm run validate` |
| AC6 | Claude/Codex plugin metadata 和默认 prompt 描述自适应入口，不再将固定链包装为生产默认 | `tests/adaptive-runtime-contract.test.mjs` |
| AC7 | 0.52.0 `detail → codegen → review` 继续作为显式 legacy compatibility preset、skills-suite capability contract 和 effectiveness `legacy-chain` 基线，不能被静默改写为 adaptive | 现有 effectiveness tests + 新内容测试 |
| AC8 | README、usage、advanced、invocation policy 和 skill-suite 文档区分生产 adaptive runtime、可选能力与 legacy compliance harness | `npm run validate` + 内容测试 |
| AC9 | 字符预算指标把三 Skill 固定链标记为 legacy compatibility cost；总 SKILL.md 预算仍受硬门约束 | metrics tests + `npm run metrics:chars` |
| AC10 | 所有当前仓库门禁无回归；不把合同验证表述为真实 effectiveness | `npm test` / `npm run validate` / `npm run eval:skills` / `npm run eval:effectiveness` / `npm run metrics:chars` |

## Decisions

- **AK1：Kernel 不是 Skill。** 选择始终加载的 `AGENTS.md`/host instruction 作为生产控制面，shared concept 作为生成源。拒绝新增 mandatory `kernel` Skill，因为它仍可能未加载、被跳过或与其他 Skill 竞争上下文。
- **AK2：默认允许直接行动和零 Skill。** 模型按当前任务事实和边际价值选择任意、多个或零个 Skill；成功只由目标、权限、范围、安全、证据和完成状态决定。拒绝固定阶段命中率。
- **AK3：保留生命周期 Skill 的隐式发现，但取消隐式级联。** `description/when_to_use` 只描述独特价值和触发信号；选中一个 Skill 不自动要求下一个 Skill。
- **AK4：根代理是 Chain Owner。** 同一用户目标下，根代理维护全局目标、状态、权限、证据、review 独立性和唯一 CU；child Skill 只返回 changed files、decisions、risks、verification 和 unresolved items。
- **AK5：review 按风险升级。** Kernel verification 始终执行；L0/L1 self-check 不能称为独立 review，L2/L3 或 P0/P1 默认使用独立 reviewer/verifier。拒绝每个简单 patch 都复制完整 review 阶段。
- **AK6：legacy chain 只作显式兼容和实验基线。** `guide` 可推荐 legacy preset，skills-suite 继续验证固定能力合同，effectiveness suite 继续固定 0.52.0 tree；它们不定义生产默认。
- **AK7：B10 迁移与 effectiveness 声明分离。** 本 feature 可以移除生产动作路径约束，但不得据此声称 adaptive 优于 kernel-only；B09 与真实多 run 外部证据仍独立负责效果结论。
- **AK8：CU 是执行后的 evidence sink。** 它保留一次变更的审计价值，但不作为阶段控制器或要求模型预先采用某条思考路径。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 更弱模型跳过有价值 Skill | 输出质量下降或遗漏领域约束 | 保留隐式发现、精确 use/skip 信号和显式 legacy preset；用 effectiveness 分模型/场景复测 |
| 平台没有 always-on Kernel 控制面 | direct action 绕过 Forge 纪律 | init 生成最小 AGENTS；文档明确 best-effort 边界，不把 Skill 自述冒充 host enforcement |
| 旧 skills-suite 继续奖励 Skill 路径 | 使用者误认其为生产效果门 | 明确定位为 legacy capability compliance；真实效果只看 action-neutral effectiveness outcome |
| Review 放宽导致高风险漏审 | 安全或正确性回归 | L2/L3、P0/P1 独立复核硬门；无复核条件必须披露残余风险 |
| 多 Skill 同时运行产生重复 CU | 历史漂移 | Chain Owner 唯一写入；validator/test 固化 child 返回契约 |
| 生产默认变化破坏 0.52 用户心智 | 升级不兼容 | 保留显式 legacy preset、固定 tree 和迁移说明；不提供歧义自动 alias |
