# /karimo:execute — PRD Execution Command

Start autonomous execution of a finalized PRD using the PM agent and worker team.

## Arguments

- `--prd {slug}` (optional): The PRD slug to execute. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--task {id}` (optional): Execute a single task instead of the full PRD.

## Behavior

### 1. PRD Selection

**If no `--prd` argument:**

List available finalized PRDs from `.karimo/prds/`:

```
Available PRDs:

  001_user-profiles     ready     6 tasks (4 must, 2 should)
  002_token-studio      active    3/8 tasks complete
  003_auth-refactor     draft     Not ready for execution

Run: /karimo:execute --prd user-profiles
```

**If `--prd` provided:**

Validate the PRD exists and is ready:
1. Check `.karimo/prds/{NNN}_{slug}/` exists
2. Verify `status.json` shows `status: "ready"` or `status: "active"`
3. Load `tasks.yaml`, `dag.json`, and `PRD.md`

### 2. Load Execution Context

Read and validate:
- `.karimo/config.yaml` — Project settings, boundaries, cost limits
- `.karimo/prds/{slug}/tasks.yaml` — Task definitions
- `.karimo/prds/{slug}/dag.json` — Dependency graph
- `.karimo/prds/{slug}/PRD.md` — Narrative context
- `.karimo/prds/{slug}/status.json` — Current execution state

### 3. Dry Run Mode

If `--dry-run` is specified, show the execution plan without acting:

```
Execution Plan for: user-profiles

Feature Branch: feature/user-profiles
GitHub Project: Will be created

Tasks (6 total):

  Batch 1 (parallel):
    [1a] Create UserProfile component      complexity: 4  ~$12 ceiling
    [1b] Add user type definitions         complexity: 2  ~$6 ceiling

  Batch 2 (parallel, after 1a, 1b):
    [2a] Implement profile edit form       complexity: 5  ~$15 ceiling
    [2b] Add avatar upload                 complexity: 4  ~$12 ceiling

  Batch 3 (sequential):
    [3a] Integration tests                 complexity: 3  ~$9 ceiling

  Batch 4 (sequential):
    [4a] Documentation                     complexity: 2  ~$6 ceiling

Estimated total: $60 ceiling
Parallel opportunities: 4 tasks across 2 batches

Ready to execute? Run without --dry-run to start.
```

### 4. Spawn PM Agent

Hand off to the PM agent with full context:

```
@karimo-pm.md
```

Pass:
- Project config
- PRD content (tasks, DAG, narrative)
- Current status (for resume scenarios)
- Execution mode (full PRD or single task)

### 5. Single Task Mode

If `--task {id}` is specified:
- Execute only that task
- Skip GitHub Project setup
- Create PR directly to feature branch
- Useful for retrying failed tasks or manual intervention

### 6. Resume Behavior

If `status.json` shows tasks already in progress:

```
Resuming execution for: user-profiles

Completed: 2/6 tasks
  ✓ [1a] Create UserProfile component
  ✓ [1b] Add user type definitions

In Progress: 1 task
  ⋯ [2a] Implement profile edit form (PR #42 - in review)

Ready to Start: 2 tasks
  ○ [2b] Add avatar upload
  ○ [3a] Integration tests (blocked by 2a, 2b)

Continue execution?
```

### 7. Execution Handoff

The PM agent takes over and:
1. Creates/updates GitHub Project
2. Creates feature branch if needed
3. Sets up worktrees for parallel tasks
4. Spawns worker agents per task
5. Monitors progress and creates PRs
6. Updates status.json continuously

### 8. Completion

When all tasks complete, the PM agent:
1. Cleans up worktrees
2. Updates status.json to `complete`
3. Reports final summary:

```
Execution Complete: user-profiles

Tasks: 6/6 complete
PRs Created: 6
  - #42 [1a] Create UserProfile component ✓ merged
  - #43 [1b] Add user type definitions ✓ merged
  - #44 [2a] Implement profile edit form ✓ merged
  - #45 [2b] Add avatar upload ✓ merged
  - #46 [3a] Integration tests ✓ merged
  - #47 [4a] Documentation ✓ merged

Total Cost: $38.50 (ceiling was $60)
Duration: 2h 15m

Feature branch `feature/user-profiles` ready for final review.
```

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
| PRD not ready (draft) | "Run /karimo:plan to finalize this PRD" |
| Config missing | "Run karimo init first" |
| Task failed | Mark as failed, continue with independent tasks |
| All tasks blocked | Report blockers, suggest intervention |
| Budget exceeded | Pause execution, report status |
