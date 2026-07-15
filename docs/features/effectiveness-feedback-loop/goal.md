# effectiveness-feedback-loop

> 建立 Forge v0.49 方向的反馈闭环：独立 effectiveness contract、vertical slice 规则、buy-vs-build review lens、learn cross-project candidate 和 guide delegation 建议。

## Intent

Forge 目前有稳定的 compliance/regression suite，但它明确不证明真实项目有效性。v0.49 方向需要补运行反馈闭环，同时把“小孩版乐高城市”心智模型里的关键规则落到执行路径：按可验收切片搭、标准件优先选、委托只交证据、跨项目知识只候选不越界。

本 feature 不追求一次性证明 Forge 更优，只建立可验证的 held-out task contract 和最小运行规则补丁。

## Boundaries（非目标）

- **不在本 feature**：运行真实 Codex benchmark 或发布 effectiveness 结论。
- **不在本 feature**：新增默认生命周期阶段、状态看板或 `plan.md`。
- **不在本 feature**：自动写跨项目 memory、其他仓库或用户全局配置。
- **不在本 feature**：bump 发布版本、发布或 push。
- **不在 B02**：生产 report 构造器、跨引用语义校验、Evidence Envelope 有效性判断或 outcome scorer；分别由 B03、B06、B08 负责。
- **不在 B04**：四实验臂、模型选择、Evidence Envelope、外部 verifier 或 outcome 判定；分别由 B05、B06、B07、B08 负责。

## Done Criteria（可测）

| AC | 内容 | 验证 |
|----|------|------|
| AC1 | `evals/effectiveness-suite/` 存在并覆盖至少 5 类 held-out scenario；Forge Next B01 已扩展为含 direct-action 的 6 类 | `npm run eval:effectiveness` |
| AC2 | contract 明确 Forge/no-Forge、至少 2 repeats、5 个 review metrics，且不声称真实 effectiveness | 文档审查 + 测试 |
| AC3 | detail 规则明确 module/task 服务可独立验收的 vertical slice | `rg "vertical slice" plugins/forge/skills/detail/SKILL.md` |
| AC4 | review 有 buy-vs-build lens，能检查成熟生态场景下无理由自研 | `rg "Buy-vs-build lens" plugins/forge/skills/review/SKILL.md` |
| AC5 | learn 提供对话内 Cross-project candidates 格式，不落盘 | `rg "Cross-project candidates" plugins/forge/skills/learn/SKILL.md` |
| AC6 | guide 能基于 delegation matrix 给委托建议 | `rg "delegation matrix" plugins/forge/skills/guide/SKILL.md` |
| AC7 | 现有验证 gate 无回归 | `npm test` / `npm run validate` / `npm run eval:skills` / `npm run metrics:chars` |
| AC8 | effectiveness report v1 能追踪单次 model × arm × fixture × repeat 的受控条件、动作、能力遥测、证据来源、结果和成本；旧 skills-suite v2 不会被静默升级为效果证据 | `node --test tests/effectiveness-report-contract.test.mjs` |
| AC9 | B03 提供唯一生产 constructor/parser；两者共用 fail-closed schema、受信 experiment plan 与 report 内引用校验，未知/伪造 arm、缺失来源、目标错绑、悬空引用和非法版本均返回字段级 JSON Pointer | `node --test tests/effectiveness-report.test.mjs` |
| AC10 | B04 在源仓库外以 shallow workspace/private-capture clone 和独立 HOME/CODEX_HOME/TMPDIR 运行单次 attempt，启动前冻结调用方预选的中性 arm 并拒绝事后改标，主动约束 process/output/Git/diff，并以明确的 initial/final capture ceiling 保存 process、完整 workspace delta 与 artifact manifest；连续、并发、timeout、cancel、process error、final-capture/source-guard infra terminal 均隔离且只通过 B03 生成正式 report | `node --test tests/effectiveness-runner.test.mjs` |

## Decisions

- FD1：effectiveness suite 独立于 skills-suite。理由：skills-suite 是 compliance/regression，混入真实效果会污染语义。
- FD2：先做 contract validator，不做 scorer。理由：没有真实多轮 run report 前，评分会制造伪确定性。
- FD3：vertical slice 只补到 detail 的 module 粒度规则，不新增阶段。理由：默认链仍应短。
- FD4：learn cross-project candidate 只在对话输出。理由：跨项目归档需要目标 owner 和确认门。
- FD5：effectiveness report 以一次 attempt 为原子单位，不复用 skills-suite 的异构 `cases[]` 和 `triggered_skills` 合约。理由：配对统计需要同模型、同 fixture、同受控条件的一一可比记录，能力调用只能是遥测。
- FD6：report v1 是首个 effectiveness family；skills-suite v2 标记为 incompatible，缺失来源时要求重跑而非填充未知值。理由：模型、实验臂、workspace、budget、verifier 和证据来源无法从旧自述字段可靠恢复。
- FD7：生产入口只暴露 `createEffectivenessReport` 与 `parseEffectivenessReport`，并共用 schema、受信 experiment plan 与语义接受管线。plan 必须为 manifest 中每个 arm 固定 definition digest 和 capability policy；constructor 只生成 contract/version/report id 和无事实含义的空引用数组，不推断时间、模型、digest 或证据来源；schema 使用未实现关键字、非法 operand 或循环引用时 fail closed。理由：避免手工拼装伪造 arm/能力暴露或绕过引用检查，也避免测试 validator 与运行时 validator 漂移。
- FD8：B04 接受 clean source commit，以 shallow non-local workspace clone 和 runner-private capture Git 建立临时 capsule；B05 预选中性 arm，B04 只在 launch 前冻结其 plan definition/capability policy 并拒绝 adapter 改标，不选择具体实验臂；runner 独占 workspace/attempt execution/wall-time/arm-policy 注入，要求 launcher definition digest，并只把 command 与 workspace capture 标为 `tool_output`。正式 report 先校验 runner artifact 完整性，再经 B03 严格构造并原子落盘。理由：让相同受控配置可比较、并发不串状态，同时不把进程成功或模型 claim 提升为目标成功。

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| contract 被误读成效果证明 | 过度宣传 | README、docs、脚本输出均声明 no effectiveness claim |
| review lens 增加默认链字符 | token 预算压力 | 文案保持一行，metrics gate 验证 |
| held-out fixtures 变成 oracle 泄漏 | 评测失真 | 测试禁止 fixture 出现 oracle/scoring 内部词 |
| schema 形状通过但证据并不可信 | 错把结构有效当效果成立 | B02 只声明 wire contract；B03 校验引用，B06 校验证据，B08 才给 outcome 判定 |
| schema 演进超出运行时解释能力 | 新约束被静默忽略 | contract loader 拒绝未支持的 schema keyword、format、type 与失效本地引用 |
| capture ceiling 被误解为运行期 quota 或完整 OS sandbox | 进程可瞬时耗盘、主动脱离 process group 或访问其他宿主资源 | B04 字段明确命名为 `maxCapturedWorkspace*`；B05 必须启用宿主 sandbox 承担 live disk、CPU、内存、network、detached process 和 hostile-code containment |
| 外部并发写或恶意进程绕过 clone 修改 source | source 不再等于受控输入 | B04 对 HEAD/tree/refs/index 和含 ignored 文件的完整 worktree 做前后 guard 并降级为 `infrastructure_error`；不自动回滚以免删除用户并发修改，B05 host sandbox 负责阻止 hostile filesystem escape |
| 运行中 capture 失败 | 伪造完整 final snapshot 或丢失失败证据 | 降级为 `infrastructure_error`，保留 command/失败 summary，不写虚假的 diff/final digest，仍经 B03 生成 `no_output` report |
| evidence store 自身不可写或原子落盘失败 | 无法诚实发布完整 receipt/report | 返回 runner error，不把半成品称为正式 report；调用方修复存储后使用新 attempt id 重跑 |
