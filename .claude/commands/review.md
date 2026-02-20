# /karimo:review — Human Review Checkpoint

Approve a finalized PRD and generate task briefs for execution.

## Usage

```
/karimo:review                  # List PRDs ready for review
/karimo:review --prd {slug}     # Review and approve a specific PRD
```

## Purpose

This command creates a **human checkpoint** between planning and execution. It ensures:
1. You've reviewed the PRD and task breakdown
2. You approve the execution plan before agents start working
3. Self-contained task briefs are generated for each task

## Behavior

### 1. List Available PRDs

**If no `--prd` argument:**

Show PRDs with `status: "ready"`:

```
PRDs Ready for Review:

  001_user-profiles     ready     6 tasks (4 must, 2 should)
    Created: 2 hours ago
    Total complexity: 24 points
    Iteration budget: 58 iterations

  002_token-studio      ready     8 tasks (5 must, 3 should)
    Created: yesterday
    Total complexity: 32 points
    Iteration budget: 76 iterations

Run: /karimo:review --prd user-profiles
```

### 2. Load and Display PRD Summary

**If `--prd` provided:**

Load PRD files and display summary:

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

Total: 6 tasks, 24 complexity points, 58 iteration budget
```

### 3. Request Approval

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

### 4. Handle Approval Options

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

### 5. Generate Task Briefs

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

### 6. Update Status

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

### 7. Completion Message

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
