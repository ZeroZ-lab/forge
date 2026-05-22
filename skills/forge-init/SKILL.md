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

## 跳过规则

- 纯后端 API → 跳过 Phase 3
- 已有 project.md → 从缺失的 phase 开始
- 内部工具 → Phase 3 简化为最小设计系统

## 完成提示

完成后向用户展示：

```
✅ 项目初始化完成！project.md + DESIGN.md 已生成。

下一步你可以：
  /forge-requirements — 定义第一个功能的需求
  /forge-detail       — 跳过需求，直接做技术详设
  自然语言            — 直接说"做任务管理功能"
```
