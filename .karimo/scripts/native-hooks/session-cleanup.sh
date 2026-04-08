#!/bin/bash
# Triggered by Claude Code when session ends
# Final safety net for any orphaned resources

set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only run in project root (not in worktrees)
if [[ "$CWD" =~ \.worktrees/ ]]; then
  exit 0
fi

# Prune stale worktree references
git worktree prune 2>/dev/null || true

# Find and clean orphaned KARIMO branches (local)
for branch in $(git branch --list 'worktree/*-*' 2>/dev/null | tr -d ' '); do
  # Check if worktree exists for this branch
  if ! git worktree list | grep -q "$branch"; then
    git branch -D "$branch" 2>/dev/null || true
  fi
done

# Find and clean orphaned Claude Code internal branches
for branch in $(git branch --list 'worktree-agent-*' 2>/dev/null | tr -d ' '); do
  if ! git worktree list | grep -q "$branch"; then
    git branch -D "$branch" 2>/dev/null || true
  fi
done

exit 0
