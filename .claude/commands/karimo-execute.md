# /karimo-execute — PRD Execution Command

Start autonomous execution of an approved PRD using the PM agent and worker team.

## Arguments

- `--prd {slug}` (optional): The PRD slug to execute. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--task {id}` (optional): Execute a single task instead of the full PRD.

## Prerequisites

Before execution, the PRD must be:
1. **Approved** via `/karimo-plan` (status: `ready`)

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
    Resume: /karimo-plan --resume token-studio

  003_auth-refactor     active    3/8 tasks complete
    Resume: /karimo-execute --prd auth-refactor

Run: /karimo-execute --prd user-profiles
```

**If `--prd` provided:**

Validate the PRD:
1. Check `.karimo/prds/{NNN}_{slug}/` exists
2. Verify `status.json` shows `status: "ready"`, `status: "approved"` (backward compat), or `status: "active"`
3. Load tasks and execution plan

### 2. Pre-Execution Checks

#### 2a. Validate GitHub Access

```bash
# 1. Validate GitHub MCP
# Use mcp__github__get_me to test connectivity
# If fails: "❌ GitHub MCP required but not available."

# 2. Validate gh CLI
gh auth status 2>/dev/null || { echo "❌ gh CLI authentication required."; exit 1; }

# 3. Validate label permissions (replaces project scope check)
gh label list --repo "$OWNER/$REPO" --limit 1 2>/dev/null || {
  echo "❌ Cannot access repository labels"
  echo "Fix: gh auth refresh -s repo"
  exit 1
}
```

#### 2b. Pre-flight Display

```
╭──────────────────────────────────────────────────────────────╮
│  Execute: user-profiles                                      │
╰──────────────────────────────────────────────────────────────╯

Status: ready
Tasks: 5 tasks across 3 waves

Pre-flight checks:
  ✓ GitHub MCP connected
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ✓ Repository access verified
  ✓ config.yaml loaded (commands, boundaries)

Ready to begin execution?
```

**Pre-flight validation commands:**

```bash
# 1. Detect CLAUDE.md path
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
else
    CLAUDE_MD=""
fi

# 2. Check git is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes detected"
  exit 1
fi

# 3. Check GitHub CLI authenticated
gh auth status 2>/dev/null || { echo "❌ GitHub CLI not authenticated"; exit 1; }

# 4. Check config.yaml exists
[ -f ".karimo/config.yaml" ] || { echo "❌ config.yaml missing"; exit 1; }

# 5. Parse GitHub config
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repo:" .karimo/config.yaml | head -1 | awk '{print $2}')

if [ -z "$OWNER" ] || [ "$OWNER" = "_pending_" ]; then
  echo "❌ GitHub owner not configured"
  echo "   Run /karimo-configure to set up GitHub settings"
  exit 1
fi

# 6. Validate label access
gh label list --repo "$OWNER/$REPO" --limit 1 2>/dev/null || {
  echo "❌ Cannot access repository labels"
  exit 1
}

echo "✓ Pre-flight checks passed"
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

  Wave 1:
    [1a] Create UserProfile component      complexity: 4  model: sonnet
    [1b] Add user type definitions         complexity: 2  model: sonnet

  Wave 2:
    [2a] Implement profile edit form       complexity: 5  model: opus
    [2b] Add avatar upload                 complexity: 4  model: sonnet

  Wave 3:
    [3a] Integration tests                 complexity: 3  model: sonnet

Options:
  1. Execute all — Begin autonomous execution
  2. Adjust briefs — Modify scope, add criteria
  3. Exclude tasks — Remove specific tasks from execution
  4. Cancel — Return without executing

Your choice:
```

### 3a. Commit Task Briefs

**After all briefs are generated, commit them as a unit before spawning the PM agent.**

```bash
git add .karimo/prds/{NNN}_{slug}/briefs/
git commit -m "docs(karimo): generate task briefs for {slug}

{count} briefs generated for PRD {slug}.

Waves:
- Wave 1: {task_ids}
- Wave 2: {task_ids}
- ...

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Rationale:** Brief generation is a distinct logical unit from PRD creation and from task execution. If the session is interrupted after briefs are generated but before workers start, the briefs are safely committed.

**Note:** Briefs use slug-based naming for searchability: `{task_id}_{slug}.md` (e.g., `1a_user-profiles.md`).

### 4. Dry Run Mode

If `--dry-run` is specified, show the execution plan without acting:

```
Execution Plan for: user-profiles

Tasks (5 approved):

  Wave 1 (parallel):
    [1a] Create UserProfile component      complexity: 4  model: sonnet
    [1b] Add user type definitions         complexity: 2  model: sonnet

  Wave 2 (parallel, after wave 1 merges):
    [2a] Implement profile edit form       complexity: 5  model: opus
    [2b] Add avatar upload                 complexity: 4  model: sonnet

  Wave 3 (after wave 2 merges):
    [3a] Integration tests                 complexity: 3  model: sonnet

Branch naming: {prd-slug}-{task-id}
  - user-profiles-1a, user-profiles-1b, etc.

PR target: main (direct)

Model distribution: 4 sonnet, 1 opus
Parallel opportunities: 4 tasks across 2 waves

Ready to execute? Run without --dry-run to start.
```

### 5. Resume Protocol

If `status.json` shows tasks already in progress, perform git state reconstruction:

**Git is truth. status.json is a cache.**

```
Resuming execution for: user-profiles

Reconciling state from git...

  [1a] status.json: running → git: merged (PR #42) → UPDATED to done
  [1b] status.json: pending → git: no branch → OK (queued)
  [2a] status.json: running → git: branch exists, no PR → CRASHED
       Action: delete branch, re-execute
  [2b] status.json: queued → git: no branch → OK (queued)
  [3a] status.json: queued → git: no branch → OK (queued)

State reconciliation complete.

Completed: 1/5 tasks
  ✓ [1a] Create UserProfile component (PR #42 merged)

Ready to Resume: 4 tasks
  ○ [1b] Add user type definitions (wave 1)
  ⟳ [2a] Implement profile edit form (crashed, will re-execute)
  ○ [2b] Add avatar upload (wave 2, waiting for wave 1)
  ○ [3a] Integration tests (wave 3, waiting for wave 2)

Continue execution?
```

**Reconciliation Algorithm:**

```bash
for task_id in $(get_task_ids); do
  branch="${prd_slug}-${task_id}"

  # Check if branch exists on remote
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    # Check for PR
    pr_data=$(gh pr list --head "$branch" --json state,number,mergedAt --jq '.[0]')

    if [ -n "$pr_data" ]; then
      state=$(echo "$pr_data" | jq -r '.state')
      if [ "$state" = "MERGED" ]; then
        # Task complete
        update_status "$task_id" "done"
      else
        labels=$(gh pr view "$branch" --json labels --jq '.labels[].name')
        if echo "$labels" | grep -q "needs-revision"; then
          update_status "$task_id" "needs-revision"
        else
          update_status "$task_id" "in-review"
        fi
      fi
    else
      # Branch exists, no PR → agent crashed mid-execution
      echo "[RECONCILE] $task_id: branch exists but no PR → marking crashed"
      git push origin --delete "$branch" 2>/dev/null || true
      update_status "$task_id" "queued"
    fi
  else
    # No branch = check status.json
    current_status=$(get_status "$task_id")
    if [ "$current_status" = "done" ]; then
      # Trust status.json (branch was cleaned up after merge)
      :
    else
      update_status "$task_id" "queued"
    fi
  fi
done
```

### 6. Phase 2: Spawn PM Agent

Hand off to the PM agent for execution:

```
@karimo-pm.md
```

Pass:
- Project configuration from `.karimo/config.yaml` and `.karimo/learnings.md`
- PRD status (approved tasks, excluded tasks)
- Brief file paths for each task
- Execution plan from `execution_plan.yaml`
- Execution mode (full PRD or single task)
- Reconciled status.json state

### 7. Wave-Ordered Execution

The PM agent:
1. Executes tasks wave by wave
2. For each task in the current wave:
   - Spawns worker agent with task brief
   - Worker operates in worktree (Claude Code handles via `isolation: worktree`)
   - Worker commits and pushes to `{prd-slug}-{task-id}` branch
   - PM creates PR to main
   - PR gets labels: `karimo`, `karimo-{prd-slug}`, `wave-{n}`, `complexity-{c}`
3. Waits for all wave PRs to merge before starting next wave
4. Updates findings.md between waves

### 8. Single Task Mode

If `--task {id}` is specified:
- Execute only that task
- Read its brief from `briefs/{task_id}_{slug}.md`
- Create PR directly to main
- Useful for retrying failed or crashed tasks

### 9. Completion & Finalization

When all tasks complete:

```
Execution Complete: user-profiles

Tasks: 5/5 complete
PRs Merged: 5
  - #42 [1a] Create UserProfile component ✓ (sonnet, 2 loops)
  - #43 [1b] Add user type definitions ✓ (sonnet, 1 loop)
  - #44 [2a] Implement profile edit form ✓ (opus, 3 loops)
  - #45 [2b] Add avatar upload ✓ (sonnet, 1 loop)
  - #46 [3a] Integration tests ✓ (sonnet, 2 loops)

Model Usage: 4 sonnet, 1 opus
Total Loops: 9
Duration: 1h 45m

Finalization:
  ✓ All branches deleted from remote
  ✓ metrics.json generated
  ✓ status.json updated to complete

Consider running /karimo-feedback to capture learnings.
```

## Dual Execution Mode Support

`/karimo-execute` works with **both** v5.0 and v4.0 execution modes:

### Feature Branch Mode (v5.0)

When `status.json` contains `"execution_mode": "feature-branch"`:
- PRs target `feature/{prd-slug}`
- PM agent uses feature branch as base
- Wave transitions check merges to feature branch
- Execution pauses at `ready-for-merge` status
- Use `/karimo-merge` to create final PR to main

**Created by:** `/karimo-orchestrate` (sets execution_mode automatically)

### Direct-to-Main Mode (v4.0)

When `status.json` is missing `execution_mode` or contains `"execution_mode": "direct-to-main"`:
- PRs target `main` directly
- PM agent uses main as base
- Wave transitions check merges to main
- Execution completes when all tasks done
- No feature branch created

**Created by:** Manual status.json creation or legacy `/karimo-execute` without orchestrate

### When to Use Each Mode

**Use Feature Branch Mode (v5.0) for:**
- Most PRDs (5+ tasks)
- Complex features
- When you want single production deployment
- When you want consolidated review before main merge

**Use Direct-to-Main Mode (v4.0) for:**
- Simple PRDs (1-3 tasks)
- Hotfixes
- Urgent changes
- Existing v4.0 workflows

### Command Usage

`/karimo-execute` is typically called by:
- `/karimo-orchestrate` (for feature branch mode)
- Manual invocation (for direct-to-main mode)

**For new PRDs, prefer `/karimo-orchestrate` over direct `/karimo-execute`.**

## Worker Flow (v4.0)

```
PM Agent                           Worker Agent
    │                                   │
    ├─ Spawn with brief path ──────────►│
    │   Branch: {prd-slug}-{task-id}    │
    │                                   │
    │            (Claude Code creates worktree automatically)
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
    │◄─────── Push to branch ───────────┤
    │                                   │
    ├─ Create PR to main ──────────────►│
    │   Labels: karimo, wave-1, etc.    │
    │                                   │
    │            (Claude Code cleans up worktree automatically)
    │                                   │
```

## Output Files

Execution updates these files:

```
.karimo/prds/{slug}/status.json    # Updated continuously
.karimo/prds/{slug}/findings.md    # Updated between waves
.karimo/prds/{slug}/metrics.json   # Generated at finalization
```

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | List available PRDs |
| PRD not ready | "Run /karimo-plan to approve first" |
| GitHub config missing | "Run /karimo-configure to set up GitHub settings" |
| Repository access denied | "Run `gh auth refresh -s repo`" |
| Task failed | Mark as failed, continue with independent tasks |
| Task crashed | Delete stale branch, re-execute |
| All tasks blocked | Report blockers, suggest intervention |
| Task stalled | Attempt model upgrade (Sonnet→Opus), pause if still failing |
| Loop limit reached | Pause task, request human intervention |

## PRD Status Flow

```
draft → ready → active → complete
          │        │
          │        └─► /karimo-execute (running)
          │
          └─► /karimo-plan (approval via interactive review)
```

Note: For backward compatibility, `approved` status is treated as equivalent to `ready`.
