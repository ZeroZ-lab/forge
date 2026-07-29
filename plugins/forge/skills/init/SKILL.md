---
name: init
description: Optional Forge project bootstrap for explicit initialization of shared docs, decisions, and runtime instructions.
when_to_use: Use when the user explicitly asks to initialize/adopt Forge, generate project AGENTS/CLAUDE instructions, or establish independently reviewed project-level contracts.
---

# Init — 项目初始化编排

## 运行时角色

`init` 创建项目级控制面：业务承诺、技术约束、设计系统和 always-on Kernel 行为入口。已有项目只补缺失段落，不重写已有决策。

## 执行纪律

- D3：现有文件和新决策冲突时停下等用户裁决。
- D4：分阶段推进，不跳 phase。
- D5：已有 `project.md` 只补缺口，不覆盖历史。

## 输入状态读取

检查 `docs/project.md`、`DESIGN.md`、`AGENTS.md`、`CLAUDE.md`、README、package/config、已有技术栈和用户目标。缺业务目标先走 business-alignment；纯后端明确记录 `skip frontend` 决策和理由，跳过 fe-system、DESIGN.md 与 AGENTS 前端章节。

## 流程

1. business-alignment：明确用户、指标、资源、Go/No-Go。
2. technical-design：写技术约束和共享决策到 `docs/project.md`。
3. fe-system：非后端新项目默认写 `DESIGN.md` seed；视觉未确认时写 2-3 个方向和 `[NEEDS CONFIRMATION]` token/模式，不固化成最终品牌；无前端跳过。
4. 生成 `AGENTS.md`：从 project/DESIGN 投影 Kernel 边界、直接行动/零 Skill 合法性、Chain Owner、风险复核和验证方式。
5. 生成 `CLAUDE.md`：指向 AGENTS 入口。
6. 产物与历史：遵循 `${CLAUDE_SKILL_DIR}/../shared/concepts/artifact-policy.md` 和 `${CLAUDE_SKILL_DIR}/../shared/concepts/history-maintenance.md`，由 init 在所有项目级出口条件通过后汇总一个 Change Unit。

## 产出

- `docs/project.md`
- `DESIGN.md`（非后端新项目 seed 或独立跨 feature 设计系统）
- `AGENTS.md`
- `CLAUDE.md`

模板：`${CLAUDE_SKILL_DIR}/references/agents-template.md`、`${CLAUDE_SKILL_DIR}/references/claude-template.md`、`${CLAUDE_SKILL_DIR}/../shared/project-template.md`。

## 分支与恢复

- 已有 project：只做差距补全。
- 视觉方向冲突：给 2-3 个取舍，等用户确认。
- 技术栈已存在：跳过 TD1-TD2，验证约束和风险。
- 缺业务目标：先补 business-alignment。

## 跳过规则

已有完整 project/DESIGN/AGENTS/CLAUDE 时跳过；纯后端、纯库或 CLI 可跳过 DESIGN；跳过时在 project 决策中写明 `skip frontend` / 无 UI 理由；非后端项目不因视觉未确认跳过 DESIGN，而是生成待确认 seed；一次性脚本不需要完整 init。

## 入口/出口条件

入口：新项目、缺项目级文档或用户要求初始化。出口：项目级文件存在，冲突已解决，用户知道可直接行动或按信号使用 define/detail 等可选能力。

## 验证清单

- [ ] project 决策是否含理由和被拒方案？
- [ ] DESIGN 是否只在通过独立产物门时生成？
- [ ] AGENTS 是否包含 Kernel 非干扰边界、直接行动、Chain Owner、执行纪律、目标文件和验证方式？
- [ ] CLAUDE 是否指向 AGENTS？
- [ ] 有持久变更时 Change Unit 是否存在？

## 运行时信号

输出 project initialized、project docs completed、human decision needed。冲突或缺目标时停止。

## 完成提示

报告已生成/跳过的文件、冲突、假设，以及可直接行动或按需加载的能力。
