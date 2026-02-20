# Status Schema Reference

**Version:** 2.0
**Purpose:** Document the `status.json` format used by KARIMO v2
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

  "tasks": {
    "1a": {
      "status": "done",
      "issue_number": 100,
      "pr_number": 42,
      "branch": "feature/user-profiles/1a",
      "worktree": ".worktrees/user-profiles/1a",
      "started_at": "2026-02-19T10:31:00Z",
      "completed_at": "2026-02-19T10:45:00Z",
      "iterations_used": 3,
      "max_iterations": 11
    },
    "1b": {
      "status": "in-review",
      "issue_number": 101,
      "pr_number": 43,
      "branch": "feature/user-profiles/1b",
      "worktree": ".worktrees/user-profiles/1b",
      "started_at": "2026-02-19T10:32:00Z",
      "completed_at": "2026-02-19T10:50:00Z"
    },
    "2a": {
      "status": "running",
      "issue_number": 102,
      "branch": "feature/user-profiles/2a",
      "worktree": ".worktrees/user-profiles/2a",
      "started_at": "2026-02-19T10:46:00Z"
    },
    "2b": {
      "status": "queued",
      "issue_number": 103
    },
    "3a": {
      "status": "blocked",
      "issue_number": 104,
      "blocked_by": ["2a", "2b"]
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

  "summary": {
    "total_tasks": 6,
    "successful": 6,
    "failed": 0,
    "total_iterations_used": 18,
    "duration_minutes": 135
  },

  "tasks": {
    "1a": {
      "status": "done",
      "issue_number": 100,
      "pr_number": 42,
      "merged_at": "2026-02-19T11:00:00Z",
      "iterations_used": 3,
      "max_iterations": 11
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
| `started_at` | ISO datetime | When task execution started |
| `completed_at` | ISO datetime | When task finished |
| `merged_at` | ISO datetime | When PR was merged |
| `iterations_used` | number | Actual iterations used |
| `iterations` | number | Number of agent iterations |
| `error` | string | Error message (if failed) |
| `conflict_files` | string[] | Conflicting files (if needs-human-rebase) |
| `blocked_by` | string[] | Task IDs blocking this task |
| `revision_count` | number | Number of revision attempts |

### Task Status Values

| Status | Meaning |
|--------|---------|
| `approved` | Task approved during /karimo:review, brief generated |
| `excluded` | Task excluded by user during /karimo:review |
| `queued` | Waiting to start (dependencies not met or at capacity) |
| `blocked` | Dependencies not yet complete |
| `running` | Worker agent actively executing |
| `in-review` | PR created, awaiting review/merge |
| `needs-revision` | Review requested changes |
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
| `total_iterations_used` | number | Sum of all iterations used |
| `total_iterations` | number | Sum of all iterations |
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
    "iterations_used": 5,
    "max_iterations": 13
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
    "iterations_used": 4,
    "max_iterations": 11
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
