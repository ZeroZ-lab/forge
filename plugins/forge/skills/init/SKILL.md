---
name: init
description: Orchestrates full project initialization across business alignment, technical design, and design-system setup to produce project.md, DESIGN.md, AGENTS.md, and CLAUDE.md when needed.
when_to_use: Use when starting a new project, bootstrapping Forge docs, creating project-level technical/design decisions, or generating AGENTS.md/CLAUDE.md from project constraints.
---

# Init — 项目初始化编排

## 运行时角色

`init` 创建项目级控制面：业务承诺、技术约束、设计系统和 agent 行为入口。已有项目只补缺失段落，不重写已有决策。

## 执行纪律

- D3：现有文件和新决策冲突时停下等用户裁决。
- D4：分阶段推进，不跳 phase。
- D5：已有 `project.md` 只补缺口，不覆盖历史。

## 输入状态读取

检查 `docs/project.md`、`DESIGN.md`、`AGENTS.md`、`CLAUDE.md`、README、package/config、已有技术栈和用户目标。缺业务目标先走 business-alignment；纯后端可跳过 fe-system。

## 流程

1. business-alignment：明确用户、指标、资源、Go/No-Go。
2. technical-design：写技术约束和共享决策到 `docs/project.md`。
3. fe-system：有前端时写 `DESIGN.md`；无前端记录跳过原因。
4. 生成 `AGENTS.md`：从 project/DESIGN 投影执行纪律、路径、验证方式。
5. 生成 `CLAUDE.md`：指向 AGENTS 入口。
6. 历史维护：追加 changelog/timeline 和 Change Unit。

## 产出

- `docs/project.md`
- `DESIGN.md`（有前端）
- `AGENTS.md`
- `CLAUDE.md`

模板：`${CLAUDE_SKILL_DIR}/references/agents-template.md`、`${CLAUDE_SKILL_DIR}/references/claude-template.md`、`${CLAUDE_SKILL_DIR}/../shared/project-template.md`。

## 分支与恢复

- 已有 project：只做差距补全。
- 视觉方向冲突：给 2-3 个取舍，等用户确认。
- 技术栈已存在：跳过 TD1-TD2，验证约束和风险。
- 缺业务目标：先补 business-alignment。

## 跳过规则

已有完整 project/DESIGN/AGENTS/CLAUDE 时跳过；纯库或 CLI 可跳过 DESIGN；一次性脚本不需要完整 init。

## 入口/出口条件

入口：新项目、缺项目级文档或用户要求初始化。出口：项目级文件存在，冲突已解决，用户知道下一步 define/detail。

## 验证清单

- [ ] project 决策是否含理由和被拒方案？
- [ ] DESIGN 是否只在有前端时生成？
- [ ] AGENTS 是否包含执行纪律、目标文件、验证方式？
- [ ] CLAUDE 是否指向 AGENTS？
- [ ] 历史记录和 Change Unit 是否存在？

## 运行时信号

输出 project initialized、project docs completed、human decision needed。冲突或缺目标时停止。

## 完成提示

报告已生成/跳过的文件、冲突、假设、下一步 define/detail。
