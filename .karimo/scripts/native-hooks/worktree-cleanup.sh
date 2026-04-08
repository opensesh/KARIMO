#!/bin/bash
# Triggered by Claude Code when worktree is removed
# Input: JSON on stdin with session_id, cwd, hook_event_name

set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.cwd // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Skip if not a KARIMO worktree
if [[ ! "$WORKTREE_PATH" =~ \.worktrees/ ]]; then
  exit 0
fi

# Extract PRD slug and task ID from path
# Pattern: .worktrees/{prd-slug}/{task-id}/
PRD_SLUG=$(echo "$WORKTREE_PATH" | sed -n 's|.*\.worktrees/\([^/]*\)/.*|\1|p')
TASK_ID=$(echo "$WORKTREE_PATH" | sed -n 's|.*\.worktrees/[^/]*/\([^/]*\)/.*|\1|p')

if [ -z "$PRD_SLUG" ] || [ -z "$TASK_ID" ]; then
  exit 0
fi

BRANCH="worktree/${PRD_SLUG}-${TASK_ID}"

# Cleanup local branch
git branch -D "$BRANCH" 2>/dev/null || true

# Cleanup remote branch (if exists)
git push origin --delete "$BRANCH" 2>/dev/null || true

# Log cleanup
echo "Cleaned up: $BRANCH (worktree: $WORKTREE_PATH)" >&2

exit 0
