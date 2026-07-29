# Forge Skill 调用与路由策略

> 验证日期：2026-07-29
> 目标：在 Claude Code 和 Codex 中保持一致的用户体验，同时使用各平台真实支持的调用控制面。

## 已验证能力

| 能力 | Claude Code | Codex |
|------|-------------|-------|
| 显式调用 | `/skill-name` | `$skill-name` 或 skill selector |
| 隐式调用依据 | skill metadata 与描述 | `description` |
| 禁止隐式调用 | `SKILL.md` frontmatter：`disable-model-invocation: true` | `agents/openai.yaml`：`policy.allow_implicit_invocation: false` |
| 渐进披露 | metadata 后按需加载正文 | name、description、path 后按需加载 `SKILL.md` |
| 插件分发 | `.claude-plugin/plugin.json` 显式枚举 | `.codex-plugin/plugin.json` 指向 skills 目录 |

官方来源：

- Claude Code Skills：https://docs.anthropic.com/en/docs/claude-code/skills
- Codex Agent Skills：https://developers.openai.com/codex/skills
- Codex Plugin Build：https://developers.openai.com/codex/plugins/build

## 兼容性决策

### IP1：不扩展跨平台通用 frontmatter

选择：`name`、`description`、`when_to_use` 继续作为 Forge 通用发现字段；平台调用策略放在各自支持的位置。

理由：

- Claude 的 `disable-model-invocation` 不是 Codex 的调用策略字段。
- Codex 的 `agents/openai.yaml` 是产品特定 metadata，Claude 不消费。
- 把平台字段混成一个“通用标准”会产生未经验证的兼容性承诺。

拒绝：只写 `disable-model-invocation` 并假设 Codex 同样生效。

验证备注：Codex 的单平台 `quick_validate.py` 会拒绝 Claude 专属 frontmatter。Forge 因此使用仓库 validator 校验受控的跨平台字段超集，而不是把任一平台 validator 当作共同 schema。

### IP2：保留生命周期 Skill 的隐式发现，但禁止默认级联

选择：`detail`、`codegen`、`review` 及其他生命周期 skill 继续允许自然语言触发。

理由：领域能力仍需要渐进发现，但 production default 是 Kernel-first：模型可以直接行动，也可调用任意、多个或零个 Skill。description 只表达独特价值和 use/skip 信号；选中一个 Skill 不自动要求后继，Skill 命中不进入完成判定。

拒绝：把全部能力改成显式而失去发现；继续把 `detail → codegen → review` 当生产默认；用模型名静态决定可用能力。

### IP3：只收紧无副作用的建议层与内部知识层

| 分类 | Skill | 调用策略 |
|------|-------|----------|
| 显式建议层 | `guide` | Claude/Codex 均禁止隐式调用 |
| 派生视图层 | `architecture-view` | Claude/Codex 均禁止隐式调用 |
| 内部知识层 | `shared` | 不进入 Claude manifest；Codex 禁止隐式调用 |
| 生命周期能力 | 其余正式 skill | 保留隐式发现，由 description/when_to_use 控制；零调用合法、无隐式级联 |

### IP4：Kernel 不进入 Skill registry

Kernel 必须由项目 `AGENTS.md` 或等价 always-loaded host policy 承担，只管理目标、权限、范围、状态、证据和完成条件。不得新增 mandatory `kernel` Skill，也不得把 Skill-only 安装描述为 host-enforced Kernel。

### IP5：Legacy chain 只显式选择

Forge 0.52.0 `detail → codegen → review` 作为兼容 preset 和 effectiveness `legacy-chain` 基线保留。只有用户明确要求 legacy/full lifecycle，或固定 capability benchmark 正在运行时才采用；不能从普通自然语言任务静默切换到 legacy。

## 描述与上下文预算

- description 前置主要动作和真正不同的触发分支。
- 同义触发词不重复堆叠。
- 所有分支都需要的动作留在 `SKILL.md`。
- 单一分支的长规则进入该 skill 的 `references/`。
- Codex 初始 skills 列表存在上下文预算，因此新增 skill 必须证明独立触发价值。

## 验证要求

新增或改变调用策略时必须：

1. 增加至少一个正向触发 fixture。
2. 增加至少一个不应触发的 forbidden behavior。
3. 运行 `node scripts/evaluate-skills.mjs`。
4. 运行相关真实 benchmark；无法运行时明确标记未验证。
5. 不用单平台结果声称跨平台行为一致。
