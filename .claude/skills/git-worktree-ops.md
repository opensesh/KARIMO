# Git Worktree Operations Skill

Patterns and commands for managing git worktrees in KARIMO execution.

## Overview

KARIMO uses git worktrees to enable parallel task execution. Each task gets its own worktree with an isolated working directory, allowing multiple agents to work simultaneously without conflicts.

## Directory Structure

```
project-root/
├── .worktrees/
│   └── {prd-slug}/
│       ├── {task-id-1}/    # Worktree for task 1a
│       ├── {task-id-2}/    # Worktree for task 1b
│       └── ...
├── .karimo/
│   └── prds/
│       └── {slug}/
│           └── status.json  # Tracks worktree locations
└── ... (normal project files)
```

## Creating Worktrees

### Create Feature Branch (Once per PRD)

Before creating task worktrees, ensure the feature branch exists:

```bash
# Create feature branch from main
git checkout -b feature/{prd-slug} main
git push -u origin feature/{prd-slug}

# Return to main for worktree operations
git checkout main
```

### Create Task Worktree

```bash
# Pattern:
git worktree add .worktrees/{prd-slug}/{task-id} \
  -b feature/{prd-slug}/{task-id} \
  feature/{prd-slug}

# Example:
git worktree add .worktrees/user-profiles/1a \
  -b feature/user-profiles/1a \
  feature/user-profiles
```

**Arguments:**
- `.worktrees/{prd-slug}/{task-id}` — Path for new worktree
- `-b feature/{prd-slug}/{task-id}` — Create new branch with this name
- `feature/{prd-slug}` — Start from this branch (the feature branch)

### Verify Worktree Created

```bash
# List all worktrees
git worktree list

# Check specific worktree
ls -la .worktrees/{prd-slug}/{task-id}

# Verify branch
cd .worktrees/{prd-slug}/{task-id}
git branch --show-current
# Should output: feature/{prd-slug}/{task-id}
```

## Working in Worktrees

### Agent Execution

Worker agents execute in their assigned worktree:

```bash
cd .worktrees/{prd-slug}/{task-id}

# Agent makes changes...
# Agent commits with conventional commits

git add .
git commit -m "feat({scope}): {description}

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Keeping Up to Date

Before creating a PR, rebase onto the latest feature branch:

```bash
cd .worktrees/{prd-slug}/{task-id}

# Fetch latest
git fetch origin

# Rebase onto feature branch
git rebase feature/{prd-slug}
```

## Handling Conflicts

### Detecting Conflicts

```bash
cd .worktrees/{prd-slug}/{task-id}
git fetch origin

# Attempt rebase
git rebase feature/{prd-slug}

# If conflict:
# error: could not apply abc123...
# CONFLICT (content): Merge conflict in src/file.ts
```

### Conflict Response

When conflicts occur, DO NOT resolve automatically. Instead:

1. **Abort the rebase:**
   ```bash
   git rebase --abort
   ```

2. **Mark task status:**
   ```json
   {
     "tasks": {
       "1a": {
         "status": "needs-human-rebase",
         "conflict_files": ["src/file.ts"],
         "conflict_at": "ISO timestamp"
       }
     }
   }
   ```

3. **Update GitHub Issue:**
   Add comment explaining the conflict and which files need resolution.

4. **Continue with other tasks:**
   Don't block execution waiting for conflict resolution.

### Manual Conflict Resolution

User can resolve conflicts manually:

```bash
cd .worktrees/{prd-slug}/{task-id}

# Start rebase again
git rebase feature/{prd-slug}

# Resolve conflicts in editor
# Then:
git add .
git rebase --continue

# After resolution, update status.json manually or re-run task
```

## Pre-PR Validation

Before creating a PR, run validation in the worktree:

```bash
cd .worktrees/{prd-slug}/{task-id}

# Run build (from config.commands.build)
# Example: npm run build

# Run typecheck (from config.commands.typecheck, if configured)
# Example: npm run typecheck

# Check for boundary violations
git diff --name-only feature/{prd-slug}..HEAD
# Compare against config.boundaries.never_touch
```

### Validation Failure Response

If validation fails:

1. **Log the error:**
   ```json
   {
     "tasks": {
       "1a": {
         "status": "failed",
         "error": "Build failed: Type error in src/component.tsx",
         "failed_at": "ISO timestamp"
       }
     }
   }
   ```

2. **Do not create PR**

3. **Update GitHub Issue with failure details**

## Removing Worktrees

### After Successful PR Merge

```bash
# Remove worktree
git worktree remove .worktrees/{prd-slug}/{task-id}

# If worktree has uncommitted changes (shouldn't happen):
git worktree remove --force .worktrees/{prd-slug}/{task-id}

# Delete local branch (remote branch deleted via PR merge)
git branch -d feature/{prd-slug}/{task-id}
```

### Cleanup All Worktrees for PRD

```bash
# Remove all task worktrees
for dir in .worktrees/{prd-slug}/*/; do
  git worktree remove "$dir"
done

# Remove PRD worktree directory
rmdir .worktrees/{prd-slug}

# If .worktrees is empty, remove it too
rmdir .worktrees 2>/dev/null || true
```

### Prune Stale Worktrees

If worktrees were deleted manually without using `git worktree remove`:

```bash
git worktree prune
```

## Branch Naming Convention

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Feature branch | `feature/{prd-slug}` | `feature/user-profiles` |
| Task branch | `feature/{prd-slug}/{task-id}` | `feature/user-profiles/1a` |

## Safety Rules

1. **Never force-push to shared branches**
   - Feature branch is shared; use merge, not force-push
   - Task branches are individual; can force-push if needed (rare)

2. **Never work in main worktree during execution**
   - All agent work happens in `.worktrees/`
   - Main worktree stays clean for human work

3. **Always check worktree state before operations**
   ```bash
   git worktree list
   git status  # in specific worktree
   ```

4. **Clean up on completion**
   - Remove worktrees after PR merge
   - Don't leave stale worktrees

## Troubleshooting

### Worktree Already Exists

```bash
# Error: '.worktrees/prd/task' already exists
# Solution: Remove and recreate
git worktree remove .worktrees/{prd-slug}/{task-id}
git worktree add .worktrees/{prd-slug}/{task-id} ...
```

### Branch Already Exists

```bash
# Error: branch 'feature/prd/task' already exists
# Solution: Delete the branch first
git branch -D feature/{prd-slug}/{task-id}
# Then create worktree
```

### Locked Worktree

```bash
# Error: worktree is locked
# Check lock reason:
cat .git/worktrees/{task-id}/locked

# Unlock if safe:
git worktree unlock .worktrees/{prd-slug}/{task-id}
```

### Detached HEAD in Worktree

```bash
# If worktree ends up in detached HEAD state:
cd .worktrees/{prd-slug}/{task-id}
git checkout feature/{prd-slug}/{task-id}
```
