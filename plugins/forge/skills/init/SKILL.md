---
name: init
description: Orchestrates full project initialization across business alignment, technical design, and design-system setup to generate project.md, DESIGN.md, AGENTS.md, and CLAUDE.md. Use only for explicit new-project initialization.
when_to_use: Use when the user asks to initialize a project, start a new project, create Forge project files, run init, bootstrap project-level decisions, or generate project instructions from business and technical choices.
phase: init
type: orchestrator
role: orchestrator
triggers:
  - "初始化项目"
  - "新项目"
  - "项目启动"
avoid_when:
  - "已有完整 project.md、DESIGN.md 和入口文件"
consumes:
  - "user project intent"
  - "existing docs/project.md"
  - "existing DESIGN.md"
  - "goal.md"
  - "docs/change-units/CU-*.md"
own_produces:
  - "goal.md"
  - "docs/change-units/CU-*.md"
orchestrated_produces:
  - "docs/project.md"
  - "DESIGN.md"
  - "AGENTS.md"
  - "CLAUDE.md"
signals_in:
  - "missing project files"
  - "change_unit.created"
  - "change_unit.updated"
signals_out:
  - "project initialized"
  - "phase skipped"
  - "change_unit.created"
  - "project_state.updated"
  - "goal_verification.init_completed"
  - "goal_coverage.updated"
  - "change_unit.updated"
escalates_when:
  - "已有文件与新决策冲突"
  - "无法判断是否有前端"
output_contract:
  - "项目级技术决策"
  - "设计系统"
  - "AI 行为入口"
maturity: needs-runtime-hardening
stage_next:
  - define
  - detail
  - fe-system
feedback_to:
  - brainstorm
quality_gates: []
signal_routes:
  - signal: "project initialized"
    to: define
    when: "requirements definition should start after project files exist"
  - signal: "phase skipped"
    to: detail
    when: "existing project files allow direct detailing"
  - signal: "change_unit.created"
    to: define
    when: "when initialization creates a project evolution record"
  - signal: "goal_verification.init_completed"
    to: codegen
    when: "when generated project docs can drive implementation"
---

# Forge Init — 项目初始化编排

一次对话完成三方对齐，生成项目级文件。

## 运行时角色

`init` 是项目级 orchestrator。它不替代子 skill 做决策，而是读取当前项目状态，决定哪些初始化协议需要执行、哪些可以跳过，以及什么时候需要人类确认。

运行时控制约束见 `${CLAUDE_SKILL_DIR}/../shared/concepts/control-loop.md`。

## 执行纪律

- **D3**：现有文件和新决策冲突 → 停止覆盖，输出冲突项等人类决策
- **D5**：已有 project.md → 只补缺失段落，不重写已记录决策
- **D4**：每个 phase 完成后确认再进入下一个，不跳 phase

## 输入状态读取

开始前读取：

- 是否已有 `docs/project.md`
- 是否已有 `DESIGN.md`
- 是否已有 `AGENTS.md` / `CLAUDE.md`
- 用户是否明确前端、后端、内部工具或纯文档项目
- 是否有 `idea-brief.md` 或等价业务方向说明

## 分支与恢复

- 已有 `docs/project.md` → 只补缺失段落，不重写已记录决策。
- 已有 `DESIGN.md` → Phase 3 只更新缺失或冲突部分，冲突必须呈现给用户确认。
- 无法判断是否有前端 → 暂停并询问，不默认生成前端设计系统。
- 现有项目文件和新决策冲突 → 停止覆盖，输出冲突项、影响范围和建议选择。
- 用户跳过某 phase → 记录跳过原因，确保下游知道对应输入可能缺失。
- 纯前端项目（技术选型无后端框架/数据库/ORM）→ project.md 跳过「服务划分」「部署架构（后端部分）」「性能指标（QPS/P99）」，共享约束省略多租户、API 超时等后端约束。
- project.md 的 Feature 索引初始为空表，不预填任何 feature 行——由第一次 detail 阶段自动填写。

## 红旗清单
- 已有文件与新决策冲突 → 停止覆盖，输出冲突项等用户决策（不自动合并）
- 无法判断是否有前端 → 暂停询问（不默认生成前端设计系统）
- 用户跳过某 phase → 记录跳过原因 + 标注下游可能缺失的输入
- 三个 phase 全跳过 → 确认是否真的需要 init，还是只需要补某个文件
- 生成 AGENTS.md 超过 100 行 → 强制精简（project.md 是源头，AGENTS.md 是生成物）

## 流程

按以下顺序依次执行，每个 phase 完成后向用户确认再进入下一个：

**Phase 1: 业务对齐**
加载 `business-alignment` skill，走完 BA1-BA4 方法论步骤。

**Phase 2: 技术选型**
加载 `technical-design` skill，走完 TD1-TD5 方法论步骤。

**Phase 3: 设计系统**
加载 `fe-system` skill，走完 S1-S5 方法论步骤。项目初始化没有 interaction-spec 时，按项目级模式生成 DESIGN.md：从业务目标、产品气质、目标用户和页面类型推导最小设计系统，不要求 feature 级交互规格。

## 产出

```
my-project/
├── docs/project.md        # 技术决策 + 共享约束（来自 Phase 1+2）
├── docs/status.md         # 项目状态（从 ${CLAUDE_SKILL_DIR}/../shared/status-template.md 初始化）
├── DESIGN.md              # 设计系统（来自 Phase 3）
├── AGENTS.md              # AI 行为指令（从 project.md + DESIGN.md 生成）
└── CLAUDE.md              # Claude Code 入口（指向 AGENTS.md）
```

**Phase 结束后**：按 `${CLAUDE_SKILL_DIR}/../shared/status-template.md` 创建 `docs/status.md`（如不存在）。已跳过的阶段标注 ⏭️ + 原因（如 "⏭️跳过（纯后端无前端）"）。

## 模板

| 文件 | 模板 | 来源 |
|------|------|------|
| docs/project.md | `${CLAUDE_SKILL_DIR}/../shared/project-template.md` | Phase 1 business-alignment |
| DESIGN.md | `${CLAUDE_SKILL_DIR}/../fe-system/references/design-system-template.md` | Phase 3 fe-system |
| AGENTS.md | `${CLAUDE_SKILL_DIR}/references/agents-template.md` | Phase 1+2+3 生成 |
| CLAUDE.md | `${CLAUDE_SKILL_DIR}/references/claude-template.md` | 入口指针 |

## AGENTS.md 生成规则

从 Phase 1+2+3 的决策生成，不要手写。结构：

1. **角色** — 一句话定义项目身份
2. **技术栈** — 从 project.md 技术选型段提取
3. **命令** — 构建、测试、类型检查的具体命令
4. **项目结构** — 从 project.md 工程约束的「模块边界」提取实际目录结构
   - 如果 project.md 定义了 workspace / monorepo / 多 crate 结构 → AGENTS.md 必须反映该结构，不使用假设的默认结构（如 src/）
   - 生成后与实际目录（`find` / `ls`）对照，不一致则修正
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
- 功能目标 → docs/features/<feature>/goal.md

## 开发流程
1. 读 AGENTS.md 了解技术栈和工作流
2. 读 docs/timeline.md 了解项目近期演进
3. 读相关 feature 的 goal.md + changelog.md
4. 按目标文档实现，注释决策编号（FD# feature 级 / PD# 项目级 / DB# 数据库级）
5. 改完文档后自动追加 changelog.md + timeline.md
```

## 跳过规则

- 纯后端 API → 跳过 Phase 3
- 已有 project.md → 从缺失的 phase 开始
- 内部工具 → Phase 3 简化为最小设计系统

## 何时不使用
- 已有完整的 project.md + DESIGN.md + AGENTS.md + CLAUDE.md（无需初始化）
- 只想做技术选型（直接使用 technical-design skill）
- 只想做设计系统（直接使用 fe-system skill）
- 已有项目，只想加新功能（使用 define 或 detail）

## 历史维护边界

`init` 作为编排 skill 负责写入本次初始化的一条 timeline 记录。被加载的子 skill 只更新对应产物内容；除非用户直接调用子 skill，否则不单独追加 timeline，避免同一次初始化生成多条重复历史。

## 入口/出口条件
**入口**：用户明确要初始化项目 · 或已有部分项目文件需要补齐
**出口**：project.md + DESIGN.md + AGENTS.md + CLAUDE.md 已生成/更新 · 用户确认进入 define 阶段

## 方法论
init 是编排器，不做独立决策。方法论 = 读状态 → 判断跳过 → 加载子 skill → 生成产物。
每个子 skill 有自己的方法论（business-alignment 的承诺四要素、technical-design 的约束→选项→权衡→验证、fe-system 的三层 Token）。
init 的方法论是：**不替代子 skill 做决策，只负责状态判断和项目初始化**。

## 验证清单
- [ ] project.md 是否包含业务目标（用户/指标/约束）+ 技术决策（架构/选型/部署）？
- [ ] DESIGN.md 是否包含三层 Token（primitive/semantic/component）？
- [ ] AGENTS.md 是否从 project.md + DESIGN.md 生成（不含独立决策）？
- [ ] AGENTS.md 项目结构是否与 project.md 工程约束中的模块边界一致？
- [ ] AGENTS.md 项目结构是否与实际目录（`find` / `ls`）一致？
- [ ] CLAUDE.md 是否 < 20 行且指向 AGENTS.md？
- [ ] 四个文件之间是否无矛盾（技术选型与项目类型匹配、设计系统与产品气质匹配）？
- [ ] Feature 索引是否为空表（不预填）？
- [ ] docs/status.md 是否已按 `${CLAUDE_SKILL_DIR}/../shared/status-template.md` 初始化？跳过的阶段是否标注 ⏭️ + 原因？

## 运行时信号

- 输入：missing project files
- 输出：project initialized、phase skipped
- 路由：详见本文件 frontmatter.signal_routes
- 升级：已有文件与新决策冲突 · 无法判断是否有前端

## 完成提示

完成后向用户展示：

```
✅ 项目初始化完成！project.md + DESIGN.md 已生成。

下一步你可以：
  define 阶段 — 定义第一个功能的需求
  detail 阶段       — 跳过需求，直接做技术详设
  自然语言            — 直接说"做任务管理功能"
```

