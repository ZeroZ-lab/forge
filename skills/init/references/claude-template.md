@AGENTS.md

# {项目名} — Claude Code 入口

## 上下文

- 技术决策 → docs/project.md
- 项目演进 → docs/timeline.md（每次开发前必读）
- 设计系统 → DESIGN.md
- 功能合约 → docs/features/<feature>/contract.md
- 功能历史 → docs/features/<feature>/changelog.md

## 开发流程

1. 读 AGENTS.md 了解技术栈和工作流
2. 读 docs/timeline.md 了解项目近期演进
3. 读相关 feature 的 contract.md + changelog.md
4. 按 contract.md 写代码，注释决策编号（FD# / PD# / DB#）
5. 改完文档后自动追加 changelog.md + timeline.md
