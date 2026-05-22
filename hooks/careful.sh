#!/usr/bin/env bash
# Forge — careful hook
# Intercepts destructive Bash commands.
# Claude Code: prompts user (ask). Codex: blocks (deny).
set -u

input=$(cat)

# Detect platform
is_codex=0
permission_mode=$(printf '%s' "$input" | python3 -c 'import sys,json; d=json.loads(sys.stdin.read()); print(d.get("permission_mode",""))' 2>/dev/null || echo "")
if [ -n "$permission_mode" ]; then
  is_codex=1
fi

cmd=$(printf '%s' "$input" | python3 -c 'import sys,json; d=json.loads(sys.stdin.read()); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")

if [ -z "$cmd" ]; then
  printf '{}\n'
  exit 0
fi

# High-frequency destructive patterns
destructive_patterns=(
  'rm -rf'
  'rm -fr'
  'rm -Rf'
  'rm -r -f'
  'rm --recursive'
  'rm --force'
  'git push --force'
  'git push -f'
  'git reset --hard'
  'git checkout \.'
  'DROP TABLE'
  'TRUNCATE'
  'DELETE FROM'
  'drop table'
  'truncate table'
  'delete from'
  'terraform destroy'
  'kubectl delete'
  'docker system prune'
  'docker volume prune'
)

# Safe generated directories
is_safe_cleanup_targets() {
  python3 - "$1" <<'PY'
import os, shlex, sys

safe_roots = {
    "node_modules", ".next", "dist", "__pycache__", ".cache", "build",
    ".turbo", "coverage", ".gradle", "target", "vendor", "tmp", "temp",
}

try:
    parts = shlex.split(sys.argv[1])
except ValueError:
    sys.exit(1)

if not parts:
    sys.exit(1)

targets = []
if parts[0] == "rm":
    recursive = False
    saw_double_dash = False
    for index, part in enumerate(parts[1:], start=1):
        if saw_double_dash:
            targets.append(part)
            continue
        if part == "--":
            saw_double_dash = True
            continue
        if part.startswith("-"):
            recursive = recursive or "r" in part or "R" in part
            continue
        targets.append(part)
    if not recursive or not targets:
        sys.exit(1)
elif parts[0] == "git" and len(parts) >= 3 and parts[1] == "clean":
    has_force = False
    saw_double_dash = False
    for part in parts[2:]:
        if saw_double_dash:
            targets.append(part)
            continue
        if part == "--":
            saw_double_dash = True
            continue
        if part.startswith("-"):
            has_force = has_force or "f" in part
            continue
        targets.append(part)
    if not has_force or not targets:
        sys.exit(1)
else:
    sys.exit(1)

for target in targets:
    normalized = os.path.normpath(target)
    if os.path.isabs(normalized) or normalized == ".." or normalized.startswith("../"):
        sys.exit(1)
    root = normalized.split(os.sep, 1)[0]
    if root not in safe_roots:
        sys.exit(1)

sys.exit(0)
PY
}

if [ "$is_codex" -eq 1 ]; then
  decision="deny"
else
  decision="ask"
fi

for pattern in "${destructive_patterns[@]}"; do
  if printf '%s' "$cmd" | grep -qE "$pattern"; then
    if printf '%s' "$pattern" | grep -qE '^rm -r' && is_safe_cleanup_targets "$cmd"; then
      continue
    fi
    printf '{"permissionDecision":"%s","permissionDecisionReason":"[forge] 检测到破坏性命令: %s。"}\n' "$decision" "$pattern"
    exit 0
  fi
done

if printf '%s' "$cmd" | grep -qE '^git clean -'; then
  if is_safe_cleanup_targets "$cmd"; then
    printf '{}\n'
  else
    printf '{"permissionDecision":"%s","permissionDecisionReason":"[forge] 检测到未限定范围的 git clean。"}\n' "$decision"
  fi
  exit 0
fi

printf '{}\n'
