# Status Schema Reference

**Version:** 2.1
**Purpose:** Document the `status.json` format used by KARIMO v2.1
**Location:** `.karimo/prds/{slug}/status.json`

---

## Overview

Each PRD folder contains a `status.json` file that tracks execution state. This file is:
- Created by the reviewer agent when the PRD is finalized
- Updated continuously by the PM agent during execution
- Read by `/karimo:execute` to resume or report status
- Read by `/karimo:status` to display progress

---

## Initial State (After PRD Finalization)

```json
{
  "prd_slug": "user-profiles",
  "status": "ready",
  "created_at": "2026-02-19T10:00:00Z",
  "tasks": {}
}
```

---

## Active Execution State

```json
{
  "prd_slug": "user-profiles",
  "status": "active",
  "created_at": "2026-02-19T10:00:00Z",
  "started_at": "2026-02-19T10:30:00Z",

  "github_project_url": "https://github.com/orgs/opensesh/projects/42",
  "github_project_number": 42,
  "feature_branch": "feature/user-profiles",
  "reconciliation_status": "pending",

  "tasks": {
    "1a": {
      "status": "done",
      "issue_number": 100,
      "pr_number": 42,
      "branch": "feature/user-profiles/1a",
      "worktree": ".worktrees/user-profiles/1a",
      "worktree_status": "cleaned",
      "worktree_created_at": "2026-02-19T10:31:00Z",
      "started_at": "2026-02-19T10:31:00Z",
      "completed_at": "2026-02-19T10:45:00Z",
      "merged_at": "2026-02-19T10:55:00Z",
      "model": "sonnet",
      "loop_count": 2
    },
    "1b": {
      "status": "in-review",
      "issue_number": 101,
      "pr_number": 43,
      "branch": "feature/user-profiles/1b",
      "worktree": ".worktrees/user-profiles/1b",
      "worktree_status": "active",
      "worktree_created_at": "2026-02-19T10:32:00Z",
      "started_at": "2026-02-19T10:32:00Z",
      "completed_at": "2026-02-19T10:50:00Z",
      "model": "sonnet",
      "loop_count": 1
    },
    "2a": {
      "status": "running",
      "issue_number": 102,
      "branch": "feature/user-profiles/2a",
      "worktree": ".worktrees/user-profiles/2a",
      "worktree_status": "active",
      "worktree_created_at": "2026-02-19T10:46:00Z",
      "started_at": "2026-02-19T10:46:00Z",
      "model": "opus",
      "loop_count": 1
    },
    "2b": {
      "status": "queued",
      "issue_number": 103,
      "model": "sonnet"
    },
    "3a": {
      "status": "blocked",
      "issue_number": 104,
      "blocked_by": ["2a", "2b"],
      "model": "opus"
    }
  }
}
```

---

## Completed State

```json
{
  "prd_slug": "user-profiles",
  "status": "complete",
  "created_at": "2026-02-19T10:00:00Z",
  "started_at": "2026-02-19T10:30:00Z",
  "completed_at": "2026-02-19T12:45:00Z",

  "github_project_url": "https://github.com/orgs/opensesh/projects/42",
  "github_project_number": 42,
  "feature_branch": "feature/user-profiles",
  "feature_pr_number": 50,
  "feature_merged_at": "2026-02-19T13:00:00Z",
  "reconciliation_status": "passed",

  "summary": {
    "total_tasks": 6,
    "successful": 6,
    "failed": 0,
    "total_loops": 12,
    "model_upgrades": 1,
    "duration_minutes": 135,
    "runtime_dependencies_discovered": 2
  },

  "tasks": {
    "1a": {
      "status": "done",
      "issue_number": 100,
      "pr_number": 42,
      "merged_at": "2026-02-19T11:00:00Z",
      "worktree_status": "cleaned",
      "model": "sonnet",
      "loop_count": 2
    }
    // ... all tasks with done status
  }
}
```

---

## Field Reference

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `prd_slug` | string | PRD identifier matching folder name |
| `status` | string | Overall PRD status (see values below) |
| `created_at` | ISO datetime | When PRD was finalized |
| `started_at` | ISO datetime | When execution started |
| `completed_at` | ISO datetime | When execution finished |
| `github_project_url` | string | URL to GitHub Project board |
| `github_project_number` | number | GitHub Project number |
| `feature_branch` | string | Main feature branch name |
| `feature_pr_number` | number | Feature PR to main (v2.1) |
| `feature_merged_at` | ISO datetime | When feature PR merged to main (v2.1) |
| `reconciliation_status` | string | Feature reconciliation status (v2.1) |
| `summary` | object | Completion summary (only when complete) |
| `tasks` | object | Map of task ID → task state |

### PRD Status Values

| Status | Meaning |
|--------|---------|
| `draft` | PRD in progress via /karimo:plan |
| `ready` | PRD finalized, ready for review |
| `approved` | PRD approved via /karimo:review, briefs generated |
| `active` | Execution in progress |
| `paused` | Execution paused (manual stop) |
| `complete` | All tasks finished successfully |
| `partial` | Some tasks failed, others complete |

### Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Task execution status (see values below) |
| `issue_number` | number | GitHub Issue number |
| `pr_number` | number | Pull request number (when created) |
| `branch` | string | Git branch name |
| `worktree` | string | Worktree path (while active) |
| `worktree_status` | string | Worktree lifecycle status (v2.1) |
| `worktree_created_at` | ISO datetime | When worktree was created (v2.1) |
| `started_at` | ISO datetime | When task execution started |
| `completed_at` | ISO datetime | When task finished |
| `merged_at` | ISO datetime | When PR was merged |
| `model` | string | Model assigned ("sonnet" or "opus") |
| `loop_count` | number | Number of execution loops |
| `error` | string | Error message (if failed) |
| `conflict_files` | string[] | Conflicting files (if needs-human-rebase) |
| `blocked_by` | string[] | Task IDs blocking this task |
| `revision_count` | number | Number of revision attempts (Phase 2) |
| `paused_at` | ISO datetime | When task was paused (if paused) |
| `paused_reason` | string | Reason for pause ("usage_limit", "stall", "manual") |

### Worktree Status Values (v2.1)

| Status | Meaning |
|--------|---------|
| `active` | Worktree exists and is in use |
| `pending-cleanup` | PR merged, cleanup scheduled |
| `cleaned` | Worktree has been removed |

### Reconciliation Status Values (v2.1)

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting Review/Architect reconciliation |
| `passed` | Reconciliation checklist passed |
| `failed` | Reconciliation found issues |

### Task Status Values

| Status | Meaning |
|--------|---------|
| `approved` | Task approved during /karimo:review, brief generated |
| `excluded` | Task excluded by user during /karimo:review |
| `queued` | Waiting to start (dependencies not met or at capacity) |
| `blocked` | Dependencies not yet complete |
| `running` | Worker agent actively executing |
| `paused` | Execution paused (usage limit, stall, or manual) |
| `in-review` | PR created, awaiting review/merge |
| `needs-revision` | Review requested changes (Phase 2) |
| `done` | PR merged successfully |
| `failed` | Execution failed (see error field) |
| `needs-human-rebase` | Merge conflicts require manual resolution |
| `skipped` | Task was skipped (user request during execution) |

### Summary Fields (Completion Only)

| Field | Type | Description |
|-------|------|-------------|
| `total_tasks` | number | Total tasks in PRD |
| `successful` | number | Tasks completed successfully |
| `failed` | number | Tasks that failed |
| `skipped` | number | Tasks skipped |
| `total_loops` | number | Sum of all loop counts |
| `model_upgrades` | number | Number of Sonnet→Opus upgrades |
| `duration_minutes` | number | Total execution time |

---

## State Transitions

```
draft ──► ready ──► approved ──► active ──► complete
                        │           │
                        │           ├──► paused ──► active
                        │           │
                        │           └──► partial
                        │
                        └─ (/karimo:review)
```

### Task State Transitions

```
approved ──► queued ──► blocked ──► running ──► in-review ──► done
    │                       │          │            │
    │                       │          │            └──► needs-revision ──► running
    │                       │          │
    │                       │          └──► paused ──► running (resume)
    │                       │          │
    │                       │          └──► failed
    │                       │          └──► needs-human-rebase
    │                       │
    │                       └──► skipped
    │
    └──► excluded (user chose to exclude)
```

---

## Example: Failed Task

```json
{
  "2a": {
    "status": "failed",
    "issue_number": 102,
    "branch": "feature/user-profiles/2a",
    "worktree": ".worktrees/user-profiles/2a",
    "started_at": "2026-02-19T10:46:00Z",
    "failed_at": "2026-02-19T11:02:00Z",
    "error": "Build failed: Type error in src/components/ProfileForm.tsx:42",
    "model": "opus",
    "loop_count": 5
  }
}
```

---

## Example: Needs Human Rebase

```json
{
  "2b": {
    "status": "needs-human-rebase",
    "issue_number": 103,
    "branch": "feature/user-profiles/2b",
    "worktree": ".worktrees/user-profiles/2b",
    "started_at": "2026-02-19T10:47:00Z",
    "conflict_at": "2026-02-19T11:10:00Z",
    "conflict_files": [
      "src/types/index.ts",
      "src/components/UserProfile.tsx"
    ],
    "model": "sonnet",
    "loop_count": 3
  }
}
```

---

## Usage Patterns

### Check if PRD is Ready

```javascript
const status = JSON.parse(fs.readFileSync('.karimo/prds/slug/status.json'));
if (status.status === 'ready' || status.status === 'active') {
  // Can execute
}
```

### Get Running Tasks

```javascript
const running = Object.entries(status.tasks)
  .filter(([_, task]) => task.status === 'running')
  .map(([id, _]) => id);
```

### Calculate Progress

```javascript
const total = Object.keys(status.tasks).length;
const done = Object.values(status.tasks)
  .filter(t => t.status === 'done').length;
const progress = (done / total) * 100;
```

### Get Ready Tasks

```javascript
const blocked = new Set();
Object.values(status.tasks).forEach(t => {
  if (t.blocked_by) t.blocked_by.forEach(id => blocked.add(id));
});

const ready = Object.entries(status.tasks)
  .filter(([id, task]) =>
    task.status === 'queued' &&
    !blocked.has(id)
  );
```

---

*Generated by [KARIMO v2](https://github.com/opensesh/KARIMO)*
