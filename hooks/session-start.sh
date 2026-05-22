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
- Skill 不教模型做事，而是在关键决策点引导人类选择，把决策固化成 contract.md。
- 每个决策记录：选了什么、为什么选、拒绝什么。

工作流：
- 用户说「设计 API」「设计数据模型」等 → 加载对应 skill
- Skill 引导决策对话，产出 docs/features/<feature>/contract.md
- 后续实现从 contract.md 生成

CANON.md 包含 3 条不可变宪法。AGENTS.md 是项目入口。"

escaped=$(printf '%s' "$boot_message" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$escaped"
