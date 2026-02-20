# /karimo:execute — PRD Execution Command

Start autonomous execution of an approved PRD using the PM agent and worker team.

## Arguments

- `--prd {slug}` (optional): The PRD slug to execute. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--task {id}` (optional): Execute a single task instead of the full PRD.

## Prerequisites

Before execution, the PRD must be:
1. **Finalized** via `/karimo:plan` (status: `ready`)
2. **Approved** via `/karimo:review` (status: `approved`)
3. **Briefs generated** in `.karimo/prds/{slug}/briefs/`

## Behavior

### 1. PRD Selection

**If no `--prd` argument:**

List available approved PRDs from `.karimo/prds/`:

```
Available PRDs:

  001_user-profiles     approved  5 tasks ready (1 excluded)
    Approved: 2 hours ago
    Briefs: 5/5 generated

  002_token-studio      ready     — Not yet approved
    Run: /karimo:review --prd token-studio

  003_auth-refactor     active    3/8 tasks complete
    Resume: /karimo:execute --prd auth-refactor

Run: /karimo:execute --prd user-profiles
```

**If `--prd` provided:**

Validate the PRD:
1. Check `.karimo/prds/{NNN}_{slug}/` exists
2. Verify `status.json` shows `status: "approved"` or `status: "active"`
3. Verify briefs exist in `briefs/` directory
4. Load task briefs and DAG

### 2. Pre-Execution Checks

```
╭──────────────────────────────────────────────────────────────╮
│  Execute: user-profiles                                      │
╰──────────────────────────────────────────────────────────────╯

Status: approved
Tasks: 5 approved, 1 excluded
Briefs: 5/5 ready

Pre-flight checks:
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ✓ Config loaded
  ✓ All briefs present

Ready to begin execution?
```

### 3. Dry Run Mode

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

### 4. Spawn PM Agent

Hand off to the PM agent with brief-based context:

```
@karimo-pm.md
```

Pass:
- Project config
- PRD status (approved tasks, excluded tasks)
- Brief file paths for each task
- Dependency graph from `dag.json`
- Execution mode (full PRD or single task)

### 5. Brief-Based Execution

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

### 6. Single Task Mode

If `--task {id}` is specified:
- Execute only that task
- Read its brief from `briefs/{task_id}.md`
- Skip GitHub Project setup
- Create PR directly to feature branch
- Useful for retrying failed tasks

### 7. Resume Behavior

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

### 8. Execution Handoff

The PM agent takes over and:
1. Creates/updates GitHub Project
2. Creates feature branch if needed
3. Sets up worktrees for parallel tasks
4. **Passes brief file path to each worker**
5. Workers read their brief and execute
6. Monitors progress and creates PRs
7. Updates status.json continuously

### 9. Completion

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
| PRD not approved | "Run /karimo:review to approve first" |
| Briefs missing | "Run /karimo:review to generate briefs" |
| Task failed | Mark as failed, continue with independent tasks |
| All tasks blocked | Report blockers, suggest intervention |
| Task stalled | Attempt model upgrade (Sonnet→Opus), pause if still failing |
| Loop limit reached | Pause task, request human intervention |

## PRD Status Flow

```
draft → ready → approved → active → complete
                   │          │
                   │          └─► /karimo:execute (running)
                   │
                   └─► /karimo:review (human approval)
```
