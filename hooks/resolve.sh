#!/usr/bin/env bash
# Forge — resolve plugin root from any cwd
# Used by hooks to find the Forge installation directory.
set -u

resolve_plugin_root() {
  # 1. Environment variable (most reliable)
  if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "$CLAUDE_PLUGIN_ROOT/AGENTS.md" ]; then
    echo "$CLAUDE_PLUGIN_ROOT"
    return 0
  fi
  if [ -n "${CODEX_PLUGIN_ROOT:-}" ] && [ -f "$CODEX_PLUGIN_ROOT/AGENTS.md" ]; then
    echo "$CODEX_PLUGIN_ROOT"
    return 0
  fi

  # 2. Walk up from cwd
  local dir="${1:-.}"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/AGENTS.md" ] && [ -d "$dir/skills" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done

  # 3. Claude Code installed_plugins.json
  local installed="$HOME/.claude/plugins/installed_plugins.json"
  if [ -f "$installed" ]; then
    local path
    path=$(python3 -c "
import json, sys
data = json.load(open('$installed'))
for entry in data.get('plugins', {}).get('forge@forge', []):
    p = entry.get('installPath', '')
    if p: print(p); sys.exit(0)
" 2>/dev/null)
    if [ -n "$path" ] && [ -f "$path/AGENTS.md" ]; then
      echo "$path"
      return 0
    fi
  fi

  return 1
}
