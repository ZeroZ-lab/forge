#!/usr/bin/env bash
# Forge — SessionStart hook
# Injects a compact boot message into every new session.
set -u

plugin_root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

if [ ! -f "$plugin_root/AGENTS.md" ]; then
  exit 0
fi

# Detect platform
is_codex=0
if [ ! -t 0 ]; then
  stdin_data=$(cat)
  if printf '%s' "$stdin_data" | python3 -c 'import sys,json; d=json.loads(sys.stdin.read()); print(d.get("permission_mode",""))' 2>/dev/null | grep -q .; then
    is_codex=1
  fi
fi

boot_message="Forge — 文档即源代码

核心原则：
- 文档是源代码，代码是投影。模型越强，同一份文档生成的代码越好。
- 决策留痕：每个技术选择记录选了什么、为什么选、拒绝什么。
- 人类决策，AI 执行：Skill 在关键决策点引导人类选择，把决策固化成 contract.md。

8 阶段 × 14 领域 Skill + 4 编排 Skill：
- ⓪ 探索(forge-brainstorm) → ① 定义(forge-business-alignment, forge-define)
- ② 设计(forge-interaction-design, forge-visual-design, forge-technical-design)
- ③ 详设(forge-api-design, forge-db-design, forge-frontend-design)
- ④ 任务(forge-plan) → ⑤ 构建(forge-codegen) → ⑥ 测试(forge-test-strategy, forge-test-cases)
- ⑦ 交付(forge-deploy)
- 编排(forge-init, forge-design, forge-detail, forge-test)

8 个决策 Command：
- /forge-brainstorm → /forge-init → /forge-define → /forge-design → /forge-detail → /forge-plan → /forge-test → /forge-deploy
- 执行阶段（生成代码、写测试、发布）用自然语言触发。

AGENTS.md 是项目入口。"

escaped=$(printf '%s' "$boot_message" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$escaped"
