#!/bin/bash
# Triggered by Claude Code when KARIMO worker subagent stops
# Input: JSON on stdin

set -euo pipefail

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Only process KARIMO worker agents
case "$AGENT_TYPE" in
  karimo-implementer*|karimo-tester*|karimo-documenter*)
    # Prune any stale worktree references
    git worktree prune 2>/dev/null || true
    ;;
esac

exit 0
