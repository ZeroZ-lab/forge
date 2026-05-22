---
name: forge-init
description: 项目初始化——一次对话完成业务对齐 + 技术选型 + 设计系统，生成 project.md + DESIGN.md。用户说"初始化项目"、"新项目"、"项目启动"、运行 /forge-init、或从零开始建立项目时触发。
---

# Forge Init — 项目初始化编排

一次对话完成三方对齐，生成项目级文件。

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 业务对齐**
加载 `business-alignment` skill，完成 BA1-BA5 决策点。

**Phase 2: 技术选型**
加载 `technical-design` skill，完成 TD1-TD5 决策点。

**Phase 3: 设计系统**
加载 `visual-design` skill，完成 V1-V5 决策点。

## 产出

```
my-project/
├── docs/project.md        # 技术决策 + 共享约束（来自 Phase 1+2）
├── DESIGN.md              # 设计系统（来自 Phase 3）
├── AGENTS.md              # AI 行为指令（从 project.md + DESIGN.md 投影）
└── CLAUDE.md              # Claude Code 入口（指向 AGENTS.md）
```

## 模板

| 文件 | 模板 | 来源 |
|------|------|------|
| docs/project.md | `forge-business-alignment/references/project-template.md` | Phase 1 business-alignment |
| DESIGN.md | `forge-visual-design/references/design-system-template.md` | Phase 3 visual-design |
| AGENTS.md | `${CLAUDE_SKILL_DIR}/references/agents-template.md` | Phase 1+2+3 投影 |
| CLAUDE.md | `${CLAUDE_SKILL_DIR}/references/claude-template.md` | 入口指针 |

## AGENTS.md 生成规则

从 Phase 1+2+3 的决策投影生成，不要手写。结构：

1. **角色** — 一句话定义项目身份
2. **技术栈** — 从 project.md 技术选型段提取
3. **命令** — 构建、测试、类型检查的具体命令
4. **项目结构** — 目录树
5. **工作流** — Forge 方法论（固定）
6. **代码标准** — 从 project.md 共享约束提取
7. **设计约束** — 从 DESIGN.md 提取核心值
8. **边界** — Always / Ask First / Never 三级
9. **历史维护** — 自动追加 changelog + timeline（固定）
10. **文档引用** — 关键文件指针

## CLAUDE.md 生成规则

极简入口，< 20 行：

```markdown
@AGENTS.md

# {项目名} — Claude Code 入口

## 上下文
- 技术决策 → docs/project.md
- 项目演进 → docs/timeline.md（每次开发前必读）
- 设计系统 → DESIGN.md
- 功能合约 → docs/features/<feature>/contract.md

## 开发流程
1. 读 AGENTS.md 了解技术栈和工作流
2. 读 docs/timeline.md 了解项目近期演进
3. 读相关 feature 的 contract.md + changelog.md
4. 按 contract.md 写代码，注释决策编号
5. 改完文档后自动追加 changelog.md + timeline.md
```

## 跳过规则

- 纯后端 API → 跳过 Phase 3
- 已有 project.md → 从缺失的 phase 开始
- 内部工具 → Phase 3 简化为最小设计系统

## 完成提示

完成后向用户展示：

```
✅ 项目初始化完成！project.md + DESIGN.md 已生成。

下一步你可以：
  /forge-define — 定义第一个功能的需求
  /forge-detail       — 跳过需求，直接做技术详设
  自然语言            — 直接说"做任务管理功能"
```
