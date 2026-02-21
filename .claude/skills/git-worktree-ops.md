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

## Worktree Lifecycle (v2.1)

KARIMO v2.1 uses an **extended worktree lifecycle**. Worktrees persist through the review cycle and are only cleaned up after PR merge.

### Lifecycle Stages

| Stage | Status | Worktree |
|-------|--------|----------|
| Task starts | `running` | Created |
| PR created | `in-review` | **Retained** |
| Greptile revision | `needs-revision` | **Retained** |
| PR merged | `done` | Cleaned |
| PR closed | `done` (abandoned) | Cleaned after 24h TTL |

**Why retain until merge?** Tasks may need revision based on Greptile feedback or integration issues. Keeping the worktree avoids recreation overhead and preserves build caches.

## Removing Worktrees

### After Successful PR Merge

**Safe teardown sequence:**

```bash
# Step 1: Clean build artifacts first
rm -rf .worktrees/{prd-slug}/{task-id}/.next
rm -rf .worktrees/{prd-slug}/{task-id}/dist
rm -rf .worktrees/{prd-slug}/{task-id}/node_modules/.cache

# Step 2: Remove worktree
git worktree remove .worktrees/{prd-slug}/{task-id}

# Step 3: Prune stale references
git worktree prune

# Step 4: Delete local branch (remote branch deleted via PR merge)
git branch -d feature/{prd-slug}/{task-id}
```

### Artifact Hygiene

Build artifacts should be cleaned before worktree removal to avoid stale data:

| Framework | Artifacts to Clean |
|-----------|-------------------|
| Next.js | `.next/`, `out/` |
| React/Vite | `dist/`, `build/` |
| Node.js | `node_modules/.cache/` |
| TypeScript | `*.tsbuildinfo` |
| General | `coverage/`, `.turbo/` |

**DO NOT delete:**
- `node_modules/` — may be shared via symlink or pnpm store
- Source files — obviously

### Cleanup All Worktrees for PRD

```bash
# Remove all task worktrees
for dir in .worktrees/{prd-slug}/*/; do
  # Clean artifacts first
  rm -rf "$dir/.next" "$dir/dist" "$dir/node_modules/.cache"
  # Remove worktree
  git worktree remove "$dir"
done

# Prune any stale references
git worktree prune

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

### TTL-Based Cleanup

The PM Agent enforces TTL policies. If you need to manually clean up stale worktrees:

```bash
# Find worktrees with no recent commits
for dir in .worktrees/*/*/; do
  LAST_COMMIT=$(git -C "$dir" log -1 --format=%ci 2>/dev/null)
  if [ -z "$LAST_COMMIT" ]; then
    echo "Stale worktree (no commits): $dir"
  elif [ "$(date -d "$LAST_COMMIT" +%s)" -lt "$(date -d '7 days ago' +%s)" ]; then
    echo "Stale worktree (>7 days old): $dir"
  fi
done
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

4. **Persist worktrees through review cycles**
   - Do NOT cleanup after PR creation
   - Cleanup only after PR **merged**
   - This allows for revision loops without recreation

5. **Clean artifacts before worktree removal**
   - Remove `.next/`, `dist/`, cache directories
   - Do NOT remove `node_modules/` if using shared stores

6. **Respect TTL policies**
   - Merged PRs: immediate cleanup
   - Closed PRs: 24-hour TTL
   - Stale worktrees: 7-day TTL
   - Paused execution: 30-day TTL

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
