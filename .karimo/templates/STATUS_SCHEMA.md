# Status Schema Reference

**Version:** 9.7.0
**Purpose:** Document the `status.json` format used by KARIMO v9.7
**Location:** `.karimo/prds/{slug}/status.json`

---

## Overview

Each PRD folder contains a `status.json` file that tracks execution state. This file is:
- Created by the reviewer agent when the PRD is finalized
- Updated continuously by the PM agent during execution
- Read by `/karimo:run` for resume scenarios
- Read by `/karimo:status` to display progress

**v9.5 Changes:**
- Added: `recalibrations` array for mid-PRD inference tracking
- Added: `gate_history` array for detailed gate tracking (v9.7 preparation)

**v5.0 Changes:**
- Added: `execution_mode`, `feature_branch`, `ready_for_merge_at`, `merged_to_main_at`
- Added: Task field `pr_target` (tracks PR base branch)
- Added: New PRD status values: `ready-for-merge`, `merging`
- Feature branch mode: PRs target feature branch, final PR to main
- Direct-to-main mode: PRs target main (v4.0 backward compatible)

**Backward Compatibility:**
- Missing `execution_mode` field defaults to "direct-to-main" (v4.0 behavior)
- v4.0 PRDs continue working without migration

---

## Initial State (After PRD Finalization)

```json
{
  "prd_slug": "user-profiles",
  "version": "5.0",
  "status": "ready",
  "execution_mode": "feature-branch",
  "feature_branch": "feature/user-profiles",
  "created_at": "2026-02-19T10:00:00Z",
  "tasks": {}
}
```

**Note:** In direct-to-main mode (v4.0 backward compatible), `execution_mode` is set to "direct-to-main" and `feature_branch` field is omitted.

---

## Active Execution State (Feature Branch Mode)

```json
{
  "prd_slug": "user-profiles",
  "version": "5.0",
  "status": "active",
  "execution_mode": "feature-branch",
  "feature_branch": "feature/user-profiles",
  "created_at": "2026-02-19T10:00:00Z",
  "started_at": "2026-02-19T10:30:00Z",
  "completed_at": null,
  "finalized_at": null,
  "ready_for_merge_at": null,
  "merged_to_main_at": null,

  "waves": {
    "1": { "status": "complete" },
    "2": { "status": "running" }
  },

  "tasks": {
    "1a": {
      "status": "done",
      "wave": 1,
      "branch": "user-profiles-1a",
      "pr_number": 42,
      "pr_target": "feature/user-profiles",
      "pr_labels": ["karimo", "karimo-user-profiles", "wave-1"],
      "model": "sonnet",
      "loops": 2,
      "greptile_score": 4,
      "started_at": "2026-02-19T10:31:00Z",
      "completed_at": "2026-02-19T10:45:00Z",
      "merged_at": "2026-02-19T10:55:00Z"
    },
    "1b": {
      "status": "done",
      "wave": 1,
      "branch": "user-profiles-1b",
      "pr_number": 43,
      "pr_target": "feature/user-profiles",
      "pr_labels": ["karimo", "karimo-user-profiles", "wave-1"],
      "model": "sonnet",
      "loops": 1,
      "greptile_score": 5,
      "started_at": "2026-02-19T10:32:00Z",
      "completed_at": "2026-02-19T10:50:00Z",
      "merged_at": "2026-02-19T10:58:00Z"
    },
    "2a": {
      "status": "running",
      "wave": 2,
      "branch": "user-profiles-2a",
      "pr_target": "feature/user-profiles",
      "model": "opus",
      "loops": 1,
      "started_at": "2026-02-19T11:00:00Z"
    },
    "2b": {
      "status": "queued",
      "wave": 2,
      "model": "sonnet"
    },
    "3a": {
      "status": "queued",
      "wave": 3,
      "model": "opus"
    }
  }
}
```

---

## Ready for Merge State (Feature Branch Mode)

```json
{
  "prd_slug": "user-profiles",
  "version": "5.0",
  "status": "ready-for-merge",
  "execution_mode": "feature-branch",
  "feature_branch": "feature/user-profiles",
  "created_at": "2026-02-19T10:00:00Z",
  "started_at": "2026-02-19T10:30:00Z",
  "completed_at": "2026-02-19T12:45:00Z",
  "ready_for_merge_at": "2026-02-19T12:45:00Z",
  "merged_to_main_at": null,

  "waves": {
    "1": { "status": "complete" },
    "2": { "status": "complete" },
    "3": { "status": "complete" }
  },

  "tasks": {
    "1a": {
      "status": "done",
      "wave": 1,
      "branch": "user-profiles-1a",
      "pr_number": 42,
      "pr_target": "feature/user-profiles",
      "pr_labels": ["karimo", "wave-1", "greptile-passed"],
      "model": "sonnet",
      "loops": 2,
      "greptile_score": 4,
      "started_at": "2026-02-19T10:31:00Z",
      "merged_at": "2026-02-19T10:55:00Z"
    }
  }
}
```

## Completed State (Feature Branch Mode)

```json
{
  "prd_slug": "user-profiles",
  "version": "5.0",
  "status": "complete",
  "execution_mode": "feature-branch",
  "feature_branch": "feature/user-profiles",
  "created_at": "2026-02-19T10:00:00Z",
  "started_at": "2026-02-19T10:30:00Z",
  "completed_at": "2026-02-19T12:45:00Z",
  "ready_for_merge_at": "2026-02-19T12:45:00Z",
  "merged_to_main_at": "2026-02-19T13:00:00Z",
  "finalized_at": "2026-02-19T13:05:00Z",

  "waves": {
    "1": { "status": "complete" },
    "2": { "status": "complete" },
    "3": { "status": "complete" }
  },

  "tasks": {
    "1a": {
      "status": "done",
      "wave": 1,
      "branch": "user-profiles-1a",
      "pr_number": 42,
      "pr_target": "feature/user-profiles",
      "pr_labels": ["karimo", "wave-1", "greptile-passed"],
      "model": "sonnet",
      "loops": 2,
      "greptile_score": 4,
      "started_at": "2026-02-19T10:31:00Z",
      "merged_at": "2026-02-19T10:55:00Z"
    }
  }
}
```

---

## Field Reference

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `prd_slug` | string | PRD identifier matching folder name |
| `version` | string | Schema version ("5.0") |
| `status` | string | Overall PRD status (see values below) |
| `execution_mode` | string | Execution model: "feature-branch" or "direct-to-main" (v5.0+) |
| `feature_branch` | string | Feature branch name (only in feature-branch mode, e.g., "feature/user-profiles") |
| `created_at` | ISO datetime | When PRD was finalized |
| `started_at` | ISO datetime | When execution started |
| `completed_at` | ISO datetime | When all tasks finished |
| `ready_for_merge_at` | ISO datetime | When ready-for-merge status set (feature-branch mode only) |
| `merged_to_main_at` | ISO datetime | When final PR merged to main (feature-branch mode only) |
| `finalized_at` | ISO datetime | When finalization step completed |
| `waves` | object | Map of wave number → wave state |
| `tasks` | object | Map of task ID → task state |
| `gate_reached` | object | Current gate info when status is `paused-at-gate` (v8.3+) |
| `gates_passed` | array | List of wave numbers where gates were completed (v8.3+) |
| `gate_history` | array | Detailed gate outcomes with condition evaluations (v9.7+) |
| `recalibrations` | array | Mid-PRD orchestration changes (v9.5+) |

### Gate Tracking Fields (v8.3+)

| Field | Type | Description |
|-------|------|-------------|
| `gate_reached.wave` | number | Wave number where gate was reached |
| `gate_reached.label` | string | Human-readable gate description |
| `gate_reached.reached_at` | ISO datetime | When gate was reached |
| `gates_passed` | number[] | Array of wave numbers with completed gates |

**Example (paused-at-gate state):**
```json
{
  "status": "paused-at-gate",
  "gate_reached": {
    "wave": 3,
    "label": "Review baseline metrics",
    "reached_at": "2026-04-25T10:30:00Z"
  },
  "gates_passed": [1]
}
```

### Recalibration Fields (v9.5+)

| Field | Type | Description |
|-------|------|-------------|
| `recalibrations` | array | Array of recalibration records |
| `recalibrations[].at_wave` | number | Wave number when recalibration occurred |
| `recalibrations[].timestamp` | ISO datetime | When recalibration was triggered |
| `recalibrations[].reason` | string | Trigger reason: `user_triggered`, `auto_detected` |
| `recalibrations[].action` | string | User action: `accepted`, `kept`, `customized` |
| `recalibrations[].changes` | object | Map of changed settings with `from` and `to` values |

**Example (recalibration record):**
```json
{
  "recalibrations": [
    {
      "at_wave": 4,
      "timestamp": "2026-04-26T10:30:00Z",
      "reason": "user_triggered",
      "action": "accepted",
      "changes": {
        "gate_model": { "from": "pause", "to": "conditional" },
        "review_trigger": { "from": "per-task", "to": "per-wave" },
        "complexity_threshold": { "from": 5, "to": 7 }
      }
    }
  ]
}
```

### Gate History Fields (v9.7+)

| Field | Type | Description |
|-------|------|-------------|
| `gate_history` | array | Array of gate outcome records |
| `gate_history[].wave` | number | Wave number where gate occurred |
| `gate_history[].label` | string | Human-readable gate description |
| `gate_history[].model` | string | Gate model used: `pause`, `conditional`, `skip-on-pass` |
| `gate_history[].reached_at` | ISO datetime | When gate was reached |
| `gate_history[].outcome` | string | Gate outcome: `auto-passed`, `human-approved`, `skipped` |
| `gate_history[].completed_at` | ISO datetime | When gate completed |
| `gate_history[].conditions_evaluated` | object | Map of condition results |
| `gate_history[].approved_by` | string | Who approved (for human-approved) |
| `gate_history[].notes` | string | User notes (for human-approved) |

**Example (gate history record):**
```json
{
  "gate_history": [
    {
      "wave": 3,
      "label": "Review core implementation",
      "model": "conditional",
      "reached_at": "2026-04-26T10:00:00Z",
      "outcome": "auto-passed",
      "completed_at": "2026-04-26T10:00:05Z",
      "conditions_evaluated": {
        "require_tests_pass": { "result": true, "details": "42 tests passed" },
        "require_build_pass": { "result": true, "details": "Build succeeded" },
        "max_critical_findings": { "result": true, "details": "0 P1 findings" }
      }
    },
    {
      "wave": 6,
      "label": "Pre-release validation",
      "model": "pause",
      "reached_at": "2026-04-26T14:30:00Z",
      "outcome": "human-approved",
      "completed_at": "2026-04-26T15:45:00Z",
      "approved_by": "user",
      "notes": "Approved after manual testing"
    }
  ]
}
```

### PRD Status Values

| Status | Meaning |
|--------|---------|
| `draft` | PRD in progress via /karimo:plan |
| `ready` | PRD approved, ready for execution |
| `active` | Execution in progress |
| `paused` | Execution paused (manual or usage limit) |
| `paused-wave-gate` | Wave gate failed, waiting for prior wave PRs to merge (v8.2+) |
| `paused-at-gate` | Human gate reached, waiting for user review and resume (v8.3+) |
| `ready-for-merge` | All tasks merged to feature branch, awaiting /karimo:merge (v5.0, feature-branch mode only) |
| `merging` | /karimo:merge in progress (v5.0, feature-branch mode only) |
| `complete` | All tasks merged, finalization done |
| `partial` | Some tasks failed, others complete |

### Wave Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Wave status: `pending`, `running`, `complete`, `blocked` |

### Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Task execution status (see values below) |
| `wave` | number | Wave number this task belongs to |
| `branch` | string | Branch name: `worktree/{prd-slug}-{task-id}` |
| `pr_number` | number | Pull request number (when created) |
| `pr_target` | string | PR base branch (feature branch or main, v5.0+) |
| `pr_labels` | string[] | Labels applied to the PR |
| `model` | string | Model assigned ("sonnet" or "opus") |
| `loops` | number | Number of execution loops |
| `greptile_score` | number | Final Greptile score (0-5) |
| `started_at` | ISO datetime | When task execution started |
| `completed_at` | ISO datetime | When worker finished |
| `merged_at` | ISO datetime | When PR was merged |
| `error` | string | Error message (if failed) |

### Greptile Review Fields (Final PR)

For tracking the final PR's Greptile review cycle (v7.13.0+):

| Field | Type | Description |
|-------|------|-------------|
| `greptile_review` | object | Greptile review tracking for final PR |
| `greptile_review.pr_number` | number | Final PR number |
| `greptile_review.status` | string | Review status (see values below) |
| `greptile_review.scores` | number[] | Array of scores from each review loop |
| `greptile_review.loop_count` | number | Current loop iteration (1-30, default max: 3) |
| `greptile_review.max_loops` | number | Maximum loops allowed (default: 3) |
| `greptile_review.threshold` | number | Target score (default: 5) |
| `greptile_review.current_model` | string | Model used for remediation ("sonnet" or "opus") |
| `greptile_review.started_at` | ISO datetime | When review started |
| `greptile_review.completed_at` | ISO datetime | When review completed |
| `greptile_review.passed` | boolean | Whether review passed (score >= threshold) |
| `greptile_review.early_exit_threshold` | number | Score that triggers early exit prompt (v7.20+) |
| `greptile_review.early_exit_used` | boolean | Whether user chose early exit (v7.20+) |

### Greptile Review Status Values

| Status | Meaning |
|--------|---------|
| `not-started` | Greptile review not yet triggered |
| `in-progress` | Review loop active |
| `passed` | Score met threshold |
| `failed` | Max loops exceeded, needs human review |
| `error` | Transient error (timeout, API failure) |

### Greptile Review Example

```json
{
  "prd_slug": "user-profiles",
  "status": "merging",
  "greptile_review": {
    "pr_number": 127,
    "status": "passed",
    "scores": [3, 4, 5],
    "loop_count": 3,
    "max_loops": 3,
    "threshold": 5,
    "early_exit_threshold": 4,
    "early_exit_used": false,
    "current_model": "opus",
    "started_at": "2026-03-18T10:00:00Z",
    "completed_at": "2026-03-18T10:45:00Z",
    "passed": true
  }
}
```

### Task Status Values

| Status | Meaning |
|--------|---------|
| `queued` | Waiting to start (dependencies not met or at capacity) |
| `running` | Worker agent actively executing |
| `paused` | Execution paused |
| `in-review` | PR created, awaiting merge |
| `awaiting-human` | No automated reviewer, waiting for manual review (v8.2+, provider: none with manual behavior) |
| `needs-revision` | Greptile review requested changes |
| `needs-human-review` | Failed 3 attempts, requires human |
| `done` | PR merged successfully |
| `failed` | Execution failed (see error field) |
| `blocked` | Waiting on failed dependency |
| `crashed` | Worker crashed before creating PR |

---

## State Transitions

### PRD State

**Feature Branch Mode (v5.0):**
```
draft ──► ready ──► active ──► ready-for-merge ──► merging ──► complete
             │         │              │
             │         ├──► paused ──►│
             │         │              │
             │         └──► partial   │
             │                        │
             └─ (/karimo:plan interactive review)
                                      │
                                      └─ (/karimo:merge)
```

**Direct-to-Main Mode (v4.0 compatible):**
```
draft ──► ready ──► active ──► complete
             │         │
             │         ├──► paused ──► active
             │         │
             │         └──► partial
             │
             └─ (/karimo:plan interactive review)
```

### Task State

```
queued ──► running ──► in-review ──► done
               │            │
               │            └──► needs-revision ──► running (retry)
               │                       │
               │                       └──► needs-human-review
               │
               └──► failed
               └──► crashed
               └──► paused ──► running (resume)
```

### Wave State

```
pending ──► running ──► complete
                │
                └──► blocked (if task fails)
```

---

## Git State Reconstruction

**Principle:** Git is truth. status.json is a cache.

When `/karimo:run` resumes or `/karimo:status` runs, derive actual state from git:

```bash
for task_id in tasks; do
  branch="${prd_slug}-${task_id}"

  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    pr_data=$(gh pr list --head "$branch" --json state,number,mergedAt --jq '.[0]')

    if [ -n "$pr_data" ]; then
      state=$(echo "$pr_data" | jq -r '.state')
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
      # Branch exists, no PR
      derived_status="crashed"
    fi
  else
    # No branch = queued
    derived_status="queued"
  fi
done
```

### Reconciliation Rules

| status.json | Git State | Action |
|-------------|-----------|--------|
| pending | branch + merged PR | Update to `done` |
| running | branch + merged PR | Update to `done` |
| running | branch, no PR | Mark `crashed`, delete branch, re-execute |
| done | no branch, no PR | Trust status.json (branch cleaned up) |
| any | PR with `needs-revision` | Update to `needs-revision` |

---

## Example: Failed Task

```json
{
  "2a": {
    "status": "failed",
    "wave": 2,
    "branch": "user-profiles-2a",
    "model": "opus",
    "loops": 5,
    "started_at": "2026-02-19T10:46:00Z",
    "error": "Build failed: Type error in src/components/ProfileForm.tsx:42"
  }
}
```

---

## Example: Needs Human Review (Greptile Hard Gate)

```json
{
  "2a": {
    "status": "needs-human-review",
    "wave": 2,
    "branch": "user-profiles-2a",
    "pr_number": 44,
    "pr_labels": ["karimo", "wave-2", "blocked-needs-human"],
    "model": "opus",
    "loops": 4,
    "greptile_scores": [2, 1, 2],
    "started_at": "2026-02-19T10:46:00Z"
  }
}
```

---

## Example: Crashed Task

```json
{
  "2b": {
    "status": "crashed",
    "wave": 2,
    "branch": "user-profiles-2b",
    "model": "sonnet",
    "loops": 1,
    "started_at": "2026-02-19T10:47:00Z"
  }
}
```

---

## Dashboard Queries

```bash
# All PRs for a feature
gh pr list --label karimo-{slug} --state all

# Merged PRs this month
gh pr list --label karimo --search "merged:>2026-02-01" --state merged

# PRs needing attention
gh pr list --label karimo,needs-revision
```

---

## Backward Compatibility

### v5.0 with v4.0 PRDs

v5.0 is fully backward compatible with v4.0 PRDs. When reading status.json:

1. Check `execution_mode` field
2. If missing or `"direct-to-main"`: Use v4.0 direct-to-main behavior
3. If `"feature-branch"`: Use v5.0 feature branch aggregation
4. PM agent detects mode automatically from status.json

**No migration required for existing v4.0 PRDs.**

### v4.0 with v3.x PRDs

When reading v3.x status.json:

1. Check `version` field (defaults to "3.0" if missing)
2. Ignore deprecated fields: `github_project_*`, `issue_number`, `worktree*`, `reconciliation_status`
3. Use `branch` format `worktree/{prd-slug}-{task-id}` (v5.0+) vs `{prd-slug}-{task-id}` (v4.x) vs `feature/{prd-slug}/{task-id}` (v3.x)

---

*Generated by [KARIMO v9.7](https://github.com/opensesh/KARIMO)*
