# /karimo-status — Execution Status Command

Display the current status of KARIMO PRDs and task execution with git state reconstruction.

## Usage

```
/karimo-status                  # Show all PRDs
/karimo-status --prd {slug}     # Show specific PRD details
/karimo-status --active         # Show only active PRDs
/karimo-status --reconcile      # Force git state reconstruction
```

## v4.0 Model

**Key principle:** Git is truth. status.json is a cache.

This command derives actual state from git and GitHub, not just status.json. If status.json conflicts with git reality, git wins and status.json is updated.

---

## Behavior

### 1. Load & Reconcile Status Data

For each PRD, load status.json and then validate against git:

```bash
# Load status.json as a hint
status_json=".karimo/prds/{slug}/status.json"

# Derive truth from git for each task
for task_id in $(get_task_ids); do
  branch="{slug}-${task_id}"

  # Check if branch exists on remote
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    # Check for PR
    pr_data=$(gh pr list --head "$branch" --json state,number,mergedAt --jq '.[0]')

    if [ -n "$pr_data" ]; then
      state=$(echo "$pr_data" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).state)")
      if [ "$state" = "MERGED" ]; then
        derived_status="done"
      else
        labels=$(gh pr view "$branch" --json labels --jq '.labels[].name')
        if echo "$labels" | grep -q "needs-revision"; then
          derived_status="needs-revision"
        else
          derived_status="in-review"
        fi
      fi
    else
      # Branch exists, no PR → agent crashed mid-execution
      derived_status="crashed"
    fi
  else
    # No branch = queued (unless status.json says done)
    current=$(get_status_from_json "$task_id")
    if [ "$current" = "done" ]; then
      derived_status="done"  # Trust status.json (branch cleaned after merge)
    else
      derived_status="queued"
    fi
  fi

  # Update status.json if reconciliation found discrepancy
  if [ "$derived_status" != "$(get_status_from_json "$task_id")" ]; then
    log_reconciliation "$task_id" "$derived_status"
    update_status_json "$task_id" "$derived_status"
  fi
done
```

### 2. Overview Display (No Arguments)

Show all PRDs with wave-based summary:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Wave 2 of 3 in progress
    Tasks: 4/5 done, 1 in-review
    PRs: #42 #43 #44 #45 merged, #46 open
    Models: 4 sonnet, 1 opus • Loops: 10

  002_token-studio           ready      ░░░░░░░░░░ 0%
    Tasks: 0/8 queued
    Ready for execution

  003_auth-refactor          complete   ██████████ 100%
    All 3 waves complete
    Tasks: 6/6 done
    Models: 5 sonnet, 1 opus • Loops: 14
    Finalized: 3 days ago

Run /karimo-status --prd {slug} for details.
```

### 3. Detailed PRD Display (--prd {slug})

Show full task breakdown by wave:

```
╭──────────────────────────────────────────────────────────────╮
│  PRD: user-profiles                                          │
╰──────────────────────────────────────────────────────────────╯

Status: active
Started: 2026-02-19 10:30 (2h 15m ago)
PR Dashboard: gh pr list --label karimo-user-profiles

Waves:

  Wave 1 ━━━━━━━━━━ complete

    ✓ [1a] Create UserProfile component
      PR #42 merged • sonnet • 2 loops

    ✓ [1b] Add user type definitions
      PR #43 merged • sonnet • 1 loop

  Wave 2 ━━━━━━━━░░ 75%

    ✓ [2a] Implement profile edit form
      PR #44 merged • opus • 3 loops

    ✓ [2b] Add avatar upload
      PR #45 merged • sonnet • 2 loops

    ⋯ [2c] Implement settings panel
      PR #46 in-review • sonnet • 1 loop
      Waiting for merge to complete wave

  Wave 3 ━━░░░░░░░░ pending

    ○ [3a] Integration tests
      Queued • opus • waiting for wave 2

Progress: ████████░░ 80% (4/5 tasks)
Models: 4 sonnet, 1 opus • Total Loops: 9

Next: Waiting for PR #46 to merge (completes wave 2)
```

### 4. Active Only (--active)

Filter to show only PRDs with `status: "active"`:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Active Executions                                    │
╰──────────────────────────────────────────────────────────────╯

  001_user-profiles          ████████░░ 80%
    Wave 2: 1 task in-review (PR #46)
    No stalled tasks

No blocked tasks.
```

### 5. Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Task complete (PR merged) |
| ⋯ | Task in progress (running or in-review) |
| ○ | Task queued (waiting for wave) |
| ✗ | Task failed |
| ⚠ | Task needs attention (revision, human review) |
| ◌ | Task blocked (dependency failed) |
| ⏰ | Task stale (exceeded threshold) |
| 💥 | Task crashed (branch exists, no PR) |

### 6. Staleness Thresholds

| State | Threshold | Interpretation |
|-------|-----------|----------------|
| `running` | > 4 hours | Agent likely crashed or disconnected |
| `in-review` | > 48 hours | PR may need attention |

Display stale tasks prominently:

```
  ⏰ [2a] Implement profile edit form           running (STALE: 6h 23m)
     ⚠ Agent may have crashed
     Action: Re-run /karimo-execute --prd user-profiles
```

### 7. Git State Reconciliation Display

When `--reconcile` is used or discrepancies are found:

```
Reconciliation Report for: user-profiles

  [1a] status.json: running → git: merged (PR #42) → UPDATED to done
  [1b] status.json: queued → git: no branch → OK
  [2a] status.json: running → git: branch exists, no PR → CRASHED
       Action: Will delete stale branch on next execute

  Discrepancies found: 2
  status.json updated: ✓
```

### 8. PR Status Integration

Fetch live PR status using labels:

```bash
# All PRs for a PRD
gh pr list --label karimo-{slug} --json number,state,title,labels

# Open PRs needing attention
gh pr list --label karimo-{slug} --state open

# PRs with revision needed
gh pr list --label karimo-{slug},needs-revision
```

Display:
- PR state (open, merged, closed)
- Review status (approved, changes requested, pending)
- CI status (passing, failing, pending)
- Greptile score (if label indicates)

### 9. Warnings and Blockers

Surface issues that need attention:

```
⚠️ Warnings:

  ⏰ Stale Tasks:
    [2c] Running for 6h 23m — agent may have crashed
         Re-run: /karimo-execute --prd user-profiles

    [2a] In-review for 3 days — PR may need attention
         Review: gh pr view 46

  💥 Crashed Tasks:
    [1c] Branch exists but no PR — execution interrupted
         Re-run: /karimo-execute --prd user-profiles --task 1c

✗ Blockers:

  None
```

Or if there are blockers:

```
✗ Blockers:

  [2c] needs-human-review — Failed Greptile 3 times
       PR #47 requires manual review

  [3b] failed — Build error after 5 loops
       Error: Type mismatch in ProfileForm.tsx
       Retry: /karimo-execute --prd user-profiles --task 3b
```

### 10. Execution Summary

Show loop and model usage:

```
Execution Summary:

  Duration: 2h 15m
  Total Loops: 9
  Model Usage: 4 sonnet, 1 opus
  Escalations: 1 (task 2a: greptile failure)

  Per Wave:
    Wave 1: 3 loops (2 tasks) ✓
    Wave 2: 5 loops (3 tasks) — 1 in-review
    Wave 3: 1 loop (1 task) — queued
```

### 11. Next Actions

Suggest what to do, prioritizing recovery:

```
Next Actions:

  1. ⏰ RECOVERY: Re-run execution to reconcile crashed tasks
     /karimo-execute --prd user-profiles

  2. Review PR #46 (wave 2 completion blocker)
     gh pr view 46

  3. Wave 3 will start automatically after wave 2 merges
```

### 12. JSON Output (--json)

For programmatic access:

```
/karimo-status --json
```

Returns:
```json
{
  "prds": [
    {
      "slug": "user-profiles",
      "version": "4.0",
      "status": "active",
      "progress": 0.8,
      "waves": {
        "1": { "status": "complete" },
        "2": { "status": "running" },
        "3": { "status": "pending" }
      },
      "tasks": {
        "total": 5,
        "done": 4,
        "in_progress": 1,
        "failed": 0
      },
      "execution": {
        "total_loops": 9,
        "model_usage": { "sonnet": 4, "opus": 1 },
        "escalations": 1
      },
      "started_at": "2026-02-19T10:30:00Z",
      "reconciliation": {
        "discrepancies": 0,
        "last_reconciled": "2026-02-19T12:45:00Z"
      }
    }
  ]
}
```

---

## Dashboard Queries

Quick access to PR state:

```bash
# All PRs for a PRD
gh pr list --label karimo-{slug} --state all

# All KARIMO PRs across repo
gh pr list --label karimo --state all

# PRs needing revision
gh pr list --label karimo,needs-revision

# PRs merged this month
gh pr list --label karimo --search "merged:>2026-02-01" --state merged
```

---

## Error States

### No PRDs Found

```
No PRDs found.

Create one with: /karimo-plan
```

### Config Missing

```
⚠ .karimo/config.yaml missing.

Run /karimo-configure to set up project configuration.
```

### GitHub Not Authenticated

```
⚠ GitHub CLI not authenticated.

PR status unavailable. Run: gh auth login
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-overview` | Cross-PRD oversight: blocked tasks, revision loops |
| `/karimo-execute` | Execute PRD with automatic state reconciliation |
| `/karimo-plan` | Create PRD with interactive approval |
