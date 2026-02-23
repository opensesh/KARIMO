# /karimo:execute — PRD Execution Command

Start autonomous execution of an approved PRD using the PM agent and worker team.

## Arguments

- `--prd {slug}` (optional): The PRD slug to execute. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--task {id}` (optional): Execute a single task instead of the full PRD.

## Prerequisites

Before execution, the PRD must be:
1. **Approved** via `/karimo:plan` (status: `ready`)

Note: For backward compatibility, `approved` status is treated as equivalent to `ready`.

## Behavior

### 1. PRD Selection

**If no `--prd` argument:**

List available PRDs from `.karimo/prds/`:

```
Available PRDs:

  001_user-profiles     ready     5 tasks
    Approved: 2 hours ago
    Ready to execute

  002_token-studio      draft     — Not yet approved
    Resume: /karimo:plan --resume token-studio

  003_auth-refactor     active    3/8 tasks complete
    Resume: /karimo:execute --prd auth-refactor

Run: /karimo:execute --prd user-profiles
```

**If `--prd` provided:**

Validate the PRD:
1. Check `.karimo/prds/{NNN}_{slug}/` exists
2. Verify `status.json` shows `status: "ready"`, `status: "approved"` (backward compat), or `status: "active"`
3. Load tasks and execution plan

### 2. Pre-Execution Checks

```
╭──────────────────────────────────────────────────────────────╮
│  Execute: user-profiles                                      │
╰──────────────────────────────────────────────────────────────╯

Status: ready
Tasks: 5 tasks

Pre-flight checks:
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ✓ GitHub owner: opensesh (organization)
  ✓ GitHub Project permissions verified
  ✓ CLAUDE.md loaded (commands, boundaries)

Ready to begin execution?
```

**Pre-flight validation commands:**

Run these checks before spawning the PM agent:

```bash
# 1. Check git is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes detected"
  exit 1
fi

# 2. Check GitHub CLI authenticated
gh auth status 2>/dev/null || { echo "❌ GitHub CLI not authenticated"; exit 1; }

# 3. Check GitHub Configuration exists in CLAUDE.md
if ! grep -q "### GitHub Configuration" CLAUDE.md; then
  echo "❌ GitHub Configuration not found"
  exit 1
fi

# 4. Parse and validate project scope
OWNER=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
OWNER_TYPE=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner Type |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')

if [ "$OWNER_TYPE" = "personal" ]; then
  gh project list --owner @me --limit 1 2>/dev/null || {
    echo "❌ GitHub Project permissions denied"
    echo "Fix: gh auth refresh -s project"
    exit 1
  }
else
  gh project list --owner "$OWNER" --limit 1 2>/dev/null || {
    echo "❌ GitHub Project permissions denied"
    echo "Cannot access projects for '$OWNER'"
    echo "Fix: gh auth refresh -s project"
    exit 1
  }
fi

# 5. Verify CLAUDE.md has commands and boundaries
grep -q "### Commands" CLAUDE.md || { echo "❌ Commands section missing"; exit 1; }
```

**If GitHub Configuration is missing:**

```
Pre-flight checks:
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ❌ GitHub Configuration not found

GitHub Configuration is required for GitHub Project creation.
Run /karimo:configure to set up GitHub settings.
```

**If GitHub Project access is denied:**

```
Pre-flight checks:
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ✓ GitHub owner: opensesh (organization)
  ❌ GitHub Project permissions denied

Cannot access projects for 'opensesh'.
Fix: gh auth refresh -s project
```

### 3. Phase 1: Brief Generation

If briefs don't exist yet, generate them before execution:

```
Generating task briefs for: user-profiles

  [1a] Create UserProfile component... ✓
  [1b] Add user type definitions... ✓
  [2a] Implement profile edit form... ✓
  [2b] Add avatar upload... ✓
  [3a] Integration tests... ✓

Briefs saved to: .karimo/prds/001_user-profiles/briefs/
```

For each task, spawn the brief-writer agent:

```
@karimo-brief-writer.md
```

Pass:
- Task definition from `tasks.yaml`
- Relevant sections from `PRD.md`
- Project configuration from `CLAUDE.md`

After brief generation, present review options:

```
╭──────────────────────────────────────────────────────────────╮
│  Brief Review: user-profiles                                 │
╰──────────────────────────────────────────────────────────────╯

Generated: 5 briefs

  [1a] Create UserProfile component      complexity: 4  model: sonnet
  [1b] Add user type definitions         complexity: 2  model: sonnet
  [2a] Implement profile edit form       complexity: 5  model: opus
  [2b] Add avatar upload                 complexity: 4  model: sonnet
  [3a] Integration tests                 complexity: 3  model: sonnet

Options:
  1. Execute all — Begin autonomous execution
  2. Adjust briefs — Modify scope, add criteria
  3. Exclude tasks — Remove specific tasks from execution
  4. Cancel — Return without executing

Your choice:
```

**Option 1 — Execute all:**
- Proceed to Phase 2 (PM Agent execution)

**Option 2 — Adjust briefs:**
- Accept user modifications
- Re-generate affected brief(s)
- Loop back to present updated options

**Option 3 — Exclude tasks:**
```
Enter task IDs to exclude (comma-separated):
> 2b

Excluding: [2b] Add avatar upload

Note: This will also exclude dependent tasks:
  - No dependent tasks found

Proceed with 4 tasks?
```

**Option 4 — Cancel:**
- Exit without executing
- Briefs remain on disk for later execution

> **Note:** To add, remove, or restructure tasks (not just adjust briefs),
> use `/karimo:modify --prd {slug}` first, then re-run execute.

---

### 4. Dry Run Mode

If `--dry-run` is specified, show the execution plan without acting:

```
Execution Plan for: user-profiles

Feature Branch: feature/user-profiles
GitHub Project: Will be created

Tasks (5 approved):

  Batch 1 (parallel):
    [1a] Create UserProfile component      complexity: 4  model: sonnet
    [1b] Add user type definitions         complexity: 2  model: sonnet

  Batch 2 (parallel, after 1a, 1b):
    [2a] Implement profile edit form       complexity: 5  model: opus

  Batch 3 (sequential):
    [3a] Integration tests                 complexity: 3  model: sonnet

Excluded tasks:
  [2b] Add avatar upload (user excluded)

Model distribution: 4 sonnet, 1 opus
Parallel opportunities: 3 tasks across 2 batches

Ready to execute? Run without --dry-run to start.
```

### 5. Phase 2: Spawn PM Agent

Hand off to the PM agent for execution:

```
@karimo-pm.md
```

Pass:
- Project configuration from `.karimo/config.yaml` (commands, boundaries) and `.karimo/learnings.md`
- PRD status (approved tasks, excluded tasks)
- Brief file paths for each task
- Execution plan from `execution_plan.yaml`
- Execution mode (full PRD or single task)

### 6. Brief-Based Execution

The PM agent:
1. Creates feature branch and GitHub Project
2. For each ready task:
   - Creates worktree
   - Reads the task brief from `briefs/{task_id}.md`
   - Spawns worker agent with **only the brief** as context
   - Worker has everything needed in the brief
3. Monitors progress via status.json
4. Creates PRs when tasks complete
5. Unblocks dependent tasks

### 7. Single Task Mode

If `--task {id}` is specified:
- Execute only that task
- Read its brief from `briefs/{task_id}.md`
- Skip GitHub Project setup
- Create PR directly to feature branch
- Useful for retrying failed tasks

### 8. Resume Behavior

If `status.json` shows tasks already in progress:

```
Resuming execution for: user-profiles

Completed: 2/5 tasks
  ✓ [1a] Create UserProfile component
  ✓ [1b] Add user type definitions

In Progress: 1 task
  ⋯ [2a] Implement profile edit form (PR #42 - in review)

Ready to Start: 1 task
  ○ [3a] Integration tests (blocked by 2a)

Excluded: 1 task
  ✗ [2b] Add avatar upload

Continue execution?
```

### 9. Execution Handoff

The PM agent takes over and:
1. Creates/updates GitHub Project
2. Creates feature branch if needed
3. Sets up worktrees for parallel tasks
4. **Passes brief file path to each worker**
5. Workers read their brief and execute
6. Monitors progress and creates PRs
7. Updates status.json continuously

### 10. Completion

When all approved tasks complete, the PM agent:
1. Cleans up worktrees
2. Updates status.json to `complete`
3. Reports final summary:

```
Execution Complete: user-profiles

Tasks: 5/5 approved tasks complete
PRs Created: 5
  - #42 [1a] Create UserProfile component ✓ merged (sonnet, 2 loops)
  - #43 [1b] Add user type definitions ✓ merged (sonnet, 1 loop)
  - #44 [2a] Implement profile edit form ✓ merged (opus, 3 loops)
  - #46 [3a] Integration tests ✓ merged (sonnet, 2 loops)

Excluded (not executed):
  - [2b] Add avatar upload

Model Usage: 3 sonnet, 1 opus
Total Loops: 8
Duration: 2h 15m

Feature branch `feature/user-profiles` ready for final review.
```

## Brief-Based Worker Flow

```
PM Agent                           Worker Agent
    │                                   │
    ├─ Create worktree ────────────────►│
    │                                   │
    ├─ Pass brief path ────────────────►│
    │   briefs/1a.md                    │
    │                                   │
    │                              ┌────┴────┐
    │                              │ Read    │
    │                              │ brief   │
    │                              └────┬────┘
    │                                   │
    │                              ┌────┴────┐
    │                              │ Execute │
    │                              │ task    │
    │                              └────┬────┘
    │                                   │
    │◄─────── Commit changes ───────────┤
    │                                   │
    ├─ Create PR ──────────────────────►│
    │                                   │
```

The worker agent **only sees the brief** — not the full PRD, not other tasks. This isolation ensures:
- Clear scope boundaries
- No confusion about what to build
- Portable execution (any agent can run any brief)

## Output Files

Execution updates these files:

```
.karimo/prds/{slug}/status.json    # Updated continuously
.worktrees/{slug}/                 # Temporary worktrees (cleaned up)
```

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | List available PRDs |
| PRD not ready | "Run /karimo:plan to approve first" |
| GitHub config missing | "Run /karimo:configure to set up GitHub settings" |
| GitHub project access denied | "Run `gh auth refresh -s project` to add project scope" |
| Task failed | Mark as failed, continue with independent tasks |
| All tasks blocked | Report blockers, suggest intervention |
| Task stalled | Attempt model upgrade (Sonnet→Opus), pause if still failing |
| Loop limit reached | Pause task, request human intervention |

## PRD Status Flow

```
draft → ready → active → complete
          │        │
          │        └─► /karimo:execute (running)
          │
          └─► /karimo:plan (approval via interactive review)
```

Note: For backward compatibility, `approved` status is treated as equivalent to `ready`.
