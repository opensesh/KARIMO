# /karimo:review — Cross-PRD Review Dashboard

Surface all tasks needing human attention and recently completed work across all active PRDs.

## Usage

```
/karimo:review                  # Cross-PRD dashboard: blocked, in-revision, completions
/karimo:review --prd {slug}     # Review and approve a specific PRD (pre-execution)
/karimo:review --pending        # List PRDs ready for approval
```

## Purpose

This command provides **human oversight touchpoints**:
1. **Default mode:** Cross-PRD dashboard showing blocked tasks, revision loops, and recent completions
2. **PRD mode:** Approve a finalized PRD and generate task briefs before execution
3. **Pending mode:** List PRDs waiting for initial approval

---

## Mode 1: Cross-PRD Dashboard (Default)

**If no arguments provided:**

Shows all tasks needing attention and recent completions across active PRDs.

### Dashboard Output

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Review                                               │
╰──────────────────────────────────────────────────────────────╯

🚫 Blocked — Needs Human Review
───────────────────────────────

  PRD: user-profiles
  Board: https://github.com/orgs/{org}/projects/{number}

    [2a] Implement profile edit form
         PR #44 · Greptile: 2/5, 2/5, 2/5 (3 attempts)
         Model: escalated sonnet → opus
         Blocked since: 2h ago
         → Review PR: https://github.com/{owner}/{repo}/pull/44

    [3b] Add notification preferences
         PR #47 · Greptile: 1/5, 2/5, 1/5 (3 attempts)
         Model: opus (no escalation — complexity 8)
         Blocked since: 45m ago
         → Review PR: https://github.com/{owner}/{repo}/pull/47


⚠️  In Revision — Active Loops
────────────────────────────────

  PRD: token-studio
  Board: https://github.com/orgs/{org}/projects/{number}

    [1c] Token validation logic
         PR #51 · Greptile: 2/5 (attempt 1 of 3)
         Model: escalated sonnet → opus
         → PR: https://github.com/{owner}/{repo}/pull/51


🔀 Needs Human Rebase
──────────────────────

  PRD: user-profiles
  Board: https://github.com/orgs/{org}/projects/{number}

    [2b] Add avatar upload
         Conflict files: src/types/index.ts, src/components/UserProfile.tsx
         → Branch: feature/user-profiles/2b


✅ Recently Completed
─────────────────────

  PRD: user-profiles (4/6 tasks done — 67%)
  Board: https://github.com/orgs/{org}/projects/{number}

    [1a] Create UserProfile component        ✓ merged 3h ago   PR #42
    [1b] Add user type definitions           ✓ merged 2h ago   PR #43
    [2c] Profile API endpoints               ✓ merged 1h ago   PR #45
    [2d] Profile page layout                 ✓ merged 30m ago  PR #46

  PRD: token-studio (2/8 tasks done — 25%)
  Board: https://github.com/orgs/{org}/projects/{number}

    [1a] Token schema types                  ✓ merged 4h ago   PR #49
    [1b] Token CRUD operations               ✓ merged 3h ago   PR #50


Summary: 2 blocked · 1 in revision · 1 needs rebase · 6 recently completed
```

### Data Sources

For each active PRD:
1. Read `.karimo/prds/{slug}/status.json` for task statuses
2. Read `github_project_url` from status.json for board links
3. Use `gh pr view {pr_number} --json url` to get PR URLs
4. Calculate time-ago from timestamps

### Empty States

If no items in a category, omit that section entirely.

If no active PRDs exist:
```
No active PRDs found. Run /karimo:plan to create one, or /karimo:execute to start one.
```

---

## Mode 2: PRD Approval (`--prd {slug}`)

**If `--prd` argument provided:**

Review and approve a specific PRD before execution begins. This creates a **human checkpoint** between planning and execution.

### Display PRD Summary

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Review: user-profiles                                   │
╰──────────────────────────────────────────────────────────────╯

Summary:
  {Brief narrative from PRD.md Executive Summary}

Requirements:
  Must (4):  R1, R2, R3, R4
  Should (2): R5, R6
  Could (0):  —

Tasks:

  [1a] Create UserProfile component        complexity: 4  must
       depends: none
       files: src/components/user/UserProfile.tsx, +2

  [1b] Add user type definitions           complexity: 2  must
       depends: none
       files: src/types/user.ts, +1

  [2a] Implement profile edit form         complexity: 5  must
       depends: 1a, 1b
       files: src/components/user/ProfileForm.tsx, +3

  [2b] Add avatar upload                   complexity: 4  should
       depends: 1a
       files: src/components/user/AvatarUpload.tsx, +2

  [3a] Integration tests                   complexity: 3  must
       depends: 2a, 2b
       files: src/__tests__/user-profile.test.tsx

Dependency Graph:
  [1a] ──┬──► [2a] ──┬──► [3a]
  [1b] ──┘    [2b] ──┘

Execution Plan:
  Batch 1 (parallel): [1a], [1b]
  Batch 2 (parallel): [2a], [2b]
  Batch 3 (sequential): [3a]

Total: 6 tasks, 24 complexity points (4 sonnet, 2 opus)
```

---

## Mode 3: List Pending PRDs (`--pending`)

**If `--pending` argument provided:**

Show PRDs with `status: "ready"` (awaiting initial approval):

```
PRDs Ready for Review:

  001_user-profiles     ready     6 tasks (4 must, 2 should)
    Created: 2 hours ago
    Total complexity: 24 points
    Models: 4 sonnet, 2 opus

  002_token-studio      ready     8 tasks (5 must, 3 should)
    Created: yesterday
    Total complexity: 32 points
    Models: 5 sonnet, 3 opus

Run: /karimo:review --prd user-profiles
```

---

## PRD Approval Flow (Mode 2 continued)

### Request Approval

Ask for explicit approval:

```
Review the tasks above. Are you ready to approve this PRD for execution?

Options:
  1. Approve all tasks
  2. Exclude specific tasks
  3. Return to planning (/karimo:plan --resume {slug})
  4. Cancel

Your choice:
```

### Handle Approval Options

**Option 1 — Approve all:**
- Proceed to brief generation for all tasks

**Option 2 — Exclude tasks:**
```
Enter task IDs to exclude (comma-separated):
> 2b

Excluding: [2b] Add avatar upload

Note: This will also exclude dependent tasks:
  - No dependent tasks found

Proceed with 5 tasks?
```

**Option 3 — Return to planning:**
- Direct user to `/karimo:plan --resume {slug}`
- Exit without changes

**Option 4 — Cancel:**
- Exit without changes

### Generate Task Briefs

For each approved task, spawn the `karimo-brief-writer` agent:

```
Generating task briefs...

  [1a] Creating brief... ✓
  [1b] Creating brief... ✓
  [2a] Creating brief... ✓
  [2b] Skipped (excluded)
  [3a] Creating brief... ✓

Briefs saved to: .karimo/prds/001_user-profiles/briefs/
```

Each brief is saved to:
```
.karimo/prds/{slug}/briefs/{task_id}.md
```

### Update Status

Update `status.json`:

```json
{
  "prd_slug": "user-profiles",
  "status": "approved",
  "approved_at": "ISO timestamp",
  "approved_tasks": ["1a", "1b", "2a", "3a"],
  "excluded_tasks": ["2b"],
  "tasks": {
    "1a": { "status": "approved" },
    "1b": { "status": "approved" },
    "2a": { "status": "approved" },
    "2b": { "status": "excluded" },
    "3a": { "status": "approved" }
  }
}
```

### Completion Message

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Approved: user-profiles                                 │
╰──────────────────────────────────────────────────────────────╯

Tasks approved: 5/6
Briefs generated: 5

The PRD is ready for execution. Run:

  /karimo:execute --prd user-profiles

Each task has a self-contained brief in:
  .karimo/prds/001_user-profiles/briefs/
```

## PRD Status Flow

```
draft → ready → approved → active → complete
         ↑        │
         │        └─► /karimo:execute
         │
         └─ /karimo:plan completion
```

The `approved` status is NEW — it indicates human sign-off before execution begins.

## Error States

### PRD Not Found

```
PRD not found: {slug}

Available PRDs:
  001_user-profiles
  002_token-studio

Run: /karimo:review --prd {slug}
```

### PRD Not Ready

```
PRD is not ready for review: {slug}

Current status: draft

The PRD needs to be finalized first. Run:
  /karimo:plan --resume {slug}
```

### PRD Already Approved

```
PRD already approved: {slug}

Approved at: {timestamp}
Tasks: 5 approved, 1 excluded

To re-review, reset the PRD:
  /karimo:status --prd {slug} --reset-approval

Or proceed to execution:
  /karimo:execute --prd {slug}
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Create or edit PRD |
| `/karimo:execute` | Execute approved PRD |
| `/karimo:status` | View execution status |
