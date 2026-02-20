# KARIMO Code Integrity

Code integrity is enforced at multiple points in the pipeline to ensure agents don't break existing functionality and that changes are properly reviewed before merging.

---

## Safeguard Summary

| Safeguard | When It Runs | Phase |
|-----------|--------------|-------|
| Boundary enforcement | During task execution | 1+ |
| Git worktree isolation | Task start | 1+ |
| Pre-PR validation | Before PR creation | 1+ |
| File overlap detection | Before parallel tasks | 1+ |
| Mandatory rebase | Before PR creation | 1+ |
| Greptile review | After PR creation | 2+ |
| Revision loops | On low review score | 2+ |

---

## Git Worktrees

KARIMO uses Git worktrees to isolate task execution. Each task runs in its own worktree with its own branch.

### Directory Structure

```
.worktrees/
└── {prd-slug}/
    ├── {task-1a}/    # feature/{prd-slug}/1a branch
    ├── {task-1b}/    # feature/{prd-slug}/1b branch
    └── {task-2a}/    # feature/{prd-slug}/2a branch
```

### Branch Naming

| Branch Type | Format | Example |
|-------------|--------|---------|
| Feature branch | `feature/{prd-slug}` | `feature/user-profiles` |
| Task branch | `feature/{prd-slug}/{task-id}` | `feature/user-profiles/1a` |

### Worktree Lifecycle

1. **Create**: PM Agent creates worktree when task starts
2. **Work**: Task agent executes in isolated directory
3. **Validate**: Pre-PR checks run in worktree
4. **PR**: Created from task branch
5. **Cleanup**: Worktree removed after PR creation

### Benefits

- **Parallel execution**: Multiple tasks work simultaneously
- **No contamination**: Task changes don't affect each other
- **Clean state**: Each task starts from clean branch
- **Easy recovery**: Failed tasks don't affect main branch

---

## Boundary Enforcement

KARIMO enforces file boundaries defined in `.karimo/config.yaml`:

### Never-Touch Files

Files that agents cannot modify under any circumstances:

```yaml
boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
    - "package-lock.json"
```

If an agent attempts to modify a never-touch file:
1. Change is blocked
2. Task fails with boundary violation
3. Human intervention required

### Require-Review Files

Files that get flagged for human attention:

```yaml
boundaries:
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"
    - "*.config.js"
```

Changes to require-review files:
1. Are allowed to proceed
2. Get flagged in PR description
3. Require human review before merge

---

## Pre-PR Validation

Before creating a PR, KARIMO runs validation checks:

### Checks Performed

| Check | Command | Required |
|-------|---------|----------|
| Build | `commands.build` | Yes |
| Typecheck | `commands.typecheck` | If configured |
| Lint | `commands.lint` | If configured |
| Test | `commands.test` | If configured |

### Validation Flow

```
Task Complete → Rebase onto feature branch
                        │
                ┌───────┴───────┐
                │               │
           No Conflicts    Conflicts
                │               │
                ▼               ▼
           Run build      Mark task as
           + typecheck    needs-human-rebase
                │
        ┌───────┴───────┐
        │               │
     Pass            Fail
        │               │
        ▼               ▼
   Create PR      Mark task as
                  pre-pr-failed
```

### Configuration

```yaml
commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"
```

---

## Mandatory Rebase

Before PR creation, KARIMO rebases the task branch onto the feature branch:

### Why Rebase?

Without mandatory rebase, sibling branches become stale. If Task A merges first and Task B has an outdated base:
- Merge conflicts arise
- Task A's changes get overwritten
- Integration failures are hard to trace

### Conflict Handling

If rebase conflicts occur:
1. Task marked as `needs-human-rebase`
2. PM Agent moves to next task
3. Human resolves conflicts manually
4. Task can be resumed after resolution

---

## File Overlap Detection

Before launching parallel tasks, KARIMO checks `files_affected` for overlaps:

### How It Works

1. Parse `tasks.yaml` for each task's `files_affected`
2. Build file-to-task map
3. If multiple tasks touch same file → force sequential
4. Non-overlapping tasks can run in parallel

### Example

```yaml
# Task 1a
files_affected:
  - src/components/Button.tsx
  - src/components/Button.test.tsx

# Task 1b
files_affected:
  - src/components/Card.tsx    # No overlap → can run parallel

# Task 1c
files_affected:
  - src/components/Button.tsx  # Overlaps with 1a → runs sequential
```

---

## Greptile Review (Phase 2)

When Greptile is configured, PRs get automated code review:

### Review Flow

```
PR Created → karimo-review.yml triggers
                    │
                    ▼
            Greptile analyzes PR
                    │
                    ▼
            Posts review comment
                    │
            ┌───────┴───────┐
            │               │
        Score ≥ 4      Score < 4
            │               │
            ▼               ▼
    Add label:        Add label:
    review-passed     needs-revision
            │               │
            ▼               ▼
    Integration      Agent reads
    checks run       feedback
                          │
                          ▼
                     Revises code
                          │
                          ▼
                     Updates PR
                          │
                     (max 3 attempts)
```

### Review Criteria

Greptile scores PRs on:
- Code quality and consistency
- Test coverage
- Security considerations
- Documentation
- Performance implications

### Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 4-5 | Good | Proceed to integration |
| 3 | Acceptable | Review flagged issues |
| 1-2 | Needs work | Automatic revision loop |

---

## Revision Loops (Phase 2)

When Greptile scores a PR below 4, KARIMO enters a revision loop:

### Loop Mechanics

1. Agent reads Greptile feedback
2. Analyzes specific issues flagged
3. Makes targeted fixes
4. Updates PR with new commit
5. Greptile re-reviews

### Loop Awareness

- Maximum 5 loops per task before human intervention required
- Stall detection triggers after 3 loops without progress
- Model upgrade (Sonnet → Opus) may be attempted on stall
- After loop limit exhausted → mark for human review

### Configuration

```yaml
models:
  simple: "sonnet"      # Complexity 1-4
  complex: "opus"       # Complexity 5-10
  threshold: 5          # Complexity boundary
```

---

## GitHub Actions Workflows

### karimo-review.yml

Triggered on PR open/synchronize with `karimo` label:

```yaml
- Calls Greptile API for code review
- Posts review as PR comment
- Adds review-passed or needs-revision label
```

### karimo-integration.yml

Triggered when PR has `review-passed` label:

```yaml
- Runs build, lint, test, typecheck
- Adds ready-to-merge label on success
- Adds integration-failed label on failure
```

### karimo-sync.yml

Triggered when KARIMO PR is merged:

```yaml
- Updates status.json with completion
- Creates final merge PR when all tasks done
- Updates GitHub Project board
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
| [SECURITY.md](SECURITY.md) | Agent boundaries |
| [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) | Configuration guide |
