# /karimo:status — Execution Status Command

Display the current status of KARIMO PRDs and task execution.

## Usage

```
/karimo:status                  # Show all PRDs
/karimo:status --prd {slug}     # Show specific PRD details
/karimo:status --active         # Show only active PRDs
```

## Behavior

### 1. Load Status Data

Read from:
- `.karimo/prds/*/status.json` — All PRD execution states
- GitHub Projects (if configured) — Live PR status
- `.karimo/config.yaml` — Iteration limits for comparison

### 2. Overview Display (No Arguments)

Show all PRDs with summary:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 in-review
    PRs: #42 merged, #43 merged, #44 merged, #45 merged, #46 in-review
    Iterations: 12/20 used
    Started: 2h 15m ago

  002_token-studio           approved   ░░░░░░░░░░ 0%
    Tasks: 0/8 done
    Briefs: 8/8 ready
    Status: Ready for execution

  003_auth-refactor          complete   ██████████ 100%
    Tasks: 6/6 done
    Iterations: 18/22 used
    Completed: 3 days ago

Run /karimo:status --prd {slug} for details.
```

### 3. Detailed PRD Display (--prd {slug})

Show full task breakdown:

```
╭──────────────────────────────────────────────────────────────╮
│  PRD: user-profiles                                          │
╰──────────────────────────────────────────────────────────────╯

Status: active
Feature Branch: feature/user-profiles
GitHub Project: https://github.com/orgs/.../projects/42
Started: 2026-02-19 10:30 (2h 15m ago)

Tasks:

  ✓ [1a] Create UserProfile component          done
    PR #42 merged • 3 iterations
    Completed 1h 45m ago

  ✓ [1b] Add user type definitions             done
    PR #43 merged • 2 iterations
    Completed 1h 30m ago

  ✓ [2a] Implement profile edit form           done
    PR #44 merged • 5 iterations
    Completed 45m ago

  ✓ [2b] Add avatar upload                     done
    PR #45 merged • 3 iterations
    Completed 30m ago

  ⋯ [3a] Integration tests                     in-review
    PR #46 awaiting review
    Greptile score: 8/10
    Started 20m ago

Progress: ████████░░ 80% (4/5 tasks)
Iterations: 13/20 used (65%)

Dependency Graph:
  [1a] ──┬──► [2a] ──┬──► [3a]
  [1b] ──┘    [2b] ──┘

Next: Waiting for PR #46 review
```

### 4. Active Only (--active)

Filter to show only PRDs with `status: "active"`:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Active Executions                                    │
╰──────────────────────────────────────────────────────────────╯

  001_user-profiles          ████████░░ 80%
    1 task in-review (PR #46)
    Iterations: 13/20 used

No blocked tasks.
```

### 5. Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Task complete (PR merged) |
| ⋯ | Task in progress (running or in-review) |
| ○ | Task queued (waiting to start) |
| ✗ | Task failed |
| ⚠ | Task needs attention (conflicts, revision) |
| ◌ | Task blocked (waiting on dependencies) |

### 6. PR Status Integration

For active PRDs, fetch live PR status:

```bash
gh pr list --repo {owner}/{repo} --label karimo --json number,state,reviews,statusCheckRollup
```

Display:
- Review status (approved, changes requested, pending)
- CI status (passing, failing, pending)
- Greptile score (if available)

### 7. Iteration Summary

Show iteration tracking:

```
Iteration Summary:

  Used:     13
  Limit:    20
  Progress: ████████░░░░░░░░░░░░ 65%

  Per Task:
    [1a] 3/7 iterations
    [1b] 2/7 iterations
    [2a] 5/13 iterations
    [2b] 3/11 iterations
    [3a] -/9 iterations
```

### 8. Warnings and Blockers

Surface issues that need attention:

```
⚠ Warnings:

  [2a] Approaching iteration limit (85%)
  [3a] PR #46 has been in-review for 2 hours

✗ Blockers:

  None
```

Or if there are blockers:

```
✗ Blockers:

  [2c] needs-human-rebase — Conflicts in src/types/index.ts
       Run: cd .worktrees/user-profiles/2c && git rebase feature/user-profiles

  [3b] failed — Build error: Type mismatch in ProfileForm.tsx
       Retry: /karimo:execute --prd user-profiles --task 3b
```

### 9. Next Actions

Suggest what to do:

```
Next Actions:

  1. Review PR #46 for task [3a]
  2. Resolve conflicts in task [2c] (needs-human-rebase)
  3. Retry failed task [3b]: /karimo:execute --prd user-profiles --task 3b
```

### 10. JSON Output (--json)

For programmatic access:

```
/karimo:status --json
```

Returns:
```json
{
  "prds": [
    {
      "slug": "user-profiles",
      "status": "active",
      "progress": 0.8,
      "tasks": {
        "total": 5,
        "done": 4,
        "in_progress": 1,
        "failed": 0
      },
      "iterations": {
        "used": 13,
        "limit": 20
      },
      "started_at": "2026-02-19T10:30:00Z",
      "github_project_url": "..."
    }
  ]
}
```

## Error States

### No PRDs Found

```
No PRDs found.

Create one with: /karimo:plan
```

### Config Missing

```
⚠ No .karimo/config.yaml found.

Iteration tracking using defaults. Run: karimo init
```

### GitHub Not Authenticated

```
⚠ GitHub CLI not authenticated.

PR status unavailable. Run: gh auth login
```
