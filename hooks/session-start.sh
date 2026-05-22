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

8 阶段 × 14 Skill：
- ⓪ 探索(brainstorm) → ① 定义(business-alignment, requirements)
- ② 设计(interaction, visual, technical) → ③ 详设(api, frontend, db)
- ④ 任务(plan) → ⑤ 构建(codegen) → ⑥ 测试(test-strategy, test-cases)
- ⑦ 交付(deploy)

6 个决策 Command：
- /brainstorm → /init → /define → /design → /detail → /plan
- 执行阶段（生成代码、写测试、发布）用自然语言触发。

AGENTS.md 是项目入口。"

escaped=$(printf '%s' "$boot_message" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$escaped"
