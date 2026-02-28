# Metrics Schema Reference

**Version:** 1.0
**Purpose:** Document the `metrics.json` format generated at PRD completion
**Location:** `.karimo/prds/{slug}/metrics.json`

---

## Overview

After PRD execution completes, the PM agent generates a `metrics.json` file containing execution metrics. This data enables:
- Telemetry and performance tracking
- Learning automation (identifying high-loop tasks)
- Post-execution analysis
- Complexity estimation improvement

---

## Schema

```json
{
  "prd_slug": "user-profiles",
  "version": "1.0",
  "generated_at": "2026-02-20T15:30:00Z",

  "duration": {
    "total_minutes": 135,
    "started_at": "2026-02-20T10:00:00Z",
    "completed_at": "2026-02-20T12:15:00Z",
    "per_wave": {
      "1": 25,
      "2": 55,
      "3": 40,
      "4": 15
    }
  },

  "loops": {
    "total": 18,
    "average_per_task": 3.0,
    "per_task": {
      "1a": 1,
      "1b": 2,
      "2a": 5,
      "2b": 3,
      "3a": 4,
      "3b": 3
    },
    "high_loop_tasks": ["2a", "3a"],
    "threshold": 3
  },

  "models": {
    "sonnet_count": 4,
    "opus_count": 2,
    "escalations": [
      {
        "task_id": "2a",
        "from": "sonnet",
        "to": "opus",
        "reason": "Greptile flagged architectural integration issues",
        "at_loop": 2
      }
    ]
  },

  "greptile": {
    "enabled": true,
    "scores": {
      "1a": [4],
      "1b": [3, 4],
      "2a": [2, 2, 3],
      "2b": [4],
      "3a": [1, 2, 3],
      "3b": [5]
    },
    "average_final_score": 3.67,
    "hard_gates": [],
    "revision_rounds": 5
  },

  "outcomes": {
    "total_tasks": 6,
    "successful": 6,
    "failed": 0,
    "skipped": 0,
    "needs_human_review": 0
  },

  "runtime_dependencies": {
    "discovered": 2,
    "resolved": 2,
    "deferred": 0,
    "entries": [
      {
        "from_task": "2a",
        "dependency": "auth middleware",
        "classification": "SCOPE-GAP",
        "resolution": "valid"
      }
    ]
  },

  "learning_candidates": {
    "high_loop_tasks": ["2a", "3a"],
    "escalated_tasks": ["2a"],
    "hard_gate_tasks": [],
    "runtime_dependency_tasks": ["2a"],
    "suggested_learnings": [
      {
        "task_id": "2a",
        "reason": "high_loops",
        "details": "5 loops before passing validation",
        "suggested_learning": "Task complexity may have been underestimated for profile form validation patterns"
      },
      {
        "task_id": "2a",
        "reason": "runtime_dependency",
        "details": "Discovered missing auth middleware",
        "suggested_learning": "Always check for authentication requirements during PRD planning for API tasks"
      }
    ]
  }
}
```

---

## Field Reference

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `prd_slug` | string | PRD identifier |
| `version` | string | Metrics schema version |
| `generated_at` | ISO datetime | When metrics were generated |
| `duration` | object | Timing information |
| `loops` | object | Loop count statistics |
| `models` | object | Model usage statistics |
| `greptile` | object | Greptile review statistics (if enabled) |
| `outcomes` | object | Task outcome summary |
| `runtime_dependencies` | object | Dependency discovery tracking |
| `learning_candidates` | object | Tasks flagged for learning capture |

---

### Duration Object

| Field | Type | Description |
|-------|------|-------------|
| `total_minutes` | number | Total execution time |
| `started_at` | ISO datetime | When execution started |
| `completed_at` | ISO datetime | When execution finished |
| `per_wave` | object | Map of wave number to minutes |

---

### Loops Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Sum of all task loop counts |
| `average_per_task` | number | Average loops per task |
| `per_task` | object | Map of task ID to loop count |
| `high_loop_tasks` | string[] | Tasks exceeding threshold |
| `threshold` | number | Loop count threshold (default: 3) |

---

### Models Object

| Field | Type | Description |
|-------|------|-------------|
| `sonnet_count` | number | Tasks completed with Sonnet |
| `opus_count` | number | Tasks completed with Opus |
| `escalations` | array | Model escalation events |

#### Escalation Entry

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task that was escalated |
| `from` | string | Original model ("sonnet") |
| `to` | string | Escalated model ("opus") |
| `reason` | string | Why escalation occurred |
| `at_loop` | number | Loop count when escalated |

---

### Greptile Object

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether Greptile was active |
| `scores` | object | Map of task ID to score array |
| `average_final_score` | number | Average of final scores |
| `hard_gates` | string[] | Tasks that hit hard gate (3 failures) |
| `revision_rounds` | number | Total revision attempts |

---

### Outcomes Object

| Field | Type | Description |
|-------|------|-------------|
| `total_tasks` | number | Total tasks in PRD |
| `successful` | number | Tasks that completed successfully |
| `failed` | number | Tasks that failed |
| `skipped` | number | Tasks that were skipped |
| `needs_human_review` | number | Tasks requiring human intervention |

---

### Runtime Dependencies Object

| Field | Type | Description |
|-------|------|-------------|
| `discovered` | number | Total dependencies discovered |
| `resolved` | number | Dependencies resolved |
| `deferred` | number | Dependencies deferred |
| `entries` | array | Dependency details |

#### Dependency Entry

| Field | Type | Description |
|-------|------|-------------|
| `from_task` | string | Task that discovered dependency |
| `dependency` | string | What was needed |
| `classification` | string | WITHIN-PRD, SCOPE-GAP, CROSS-FEATURE |
| `resolution` | string | valid, false_positive, deferred, resequenced |

---

### Learning Candidates Object

| Field | Type | Description |
|-------|------|-------------|
| `high_loop_tasks` | string[] | Tasks with loops > threshold |
| `escalated_tasks` | string[] | Tasks that required model upgrade |
| `hard_gate_tasks` | string[] | Tasks that hit Greptile hard gate |
| `runtime_dependency_tasks` | string[] | Tasks that discovered dependencies |
| `suggested_learnings` | array | Auto-generated learning suggestions |

#### Suggested Learning Entry

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Relevant task |
| `reason` | string | Why flagged (high_loops, escalation, hard_gate, runtime_dependency) |
| `details` | string | Specific context |
| `suggested_learning` | string | Auto-generated learning text |

---

## Generation Logic

The PM agent generates `metrics.json` in Step 7d after all tasks complete:

### 1. Collect Duration Metrics

```javascript
const duration = {
  total_minutes: Math.round((completed_at - started_at) / 60000),
  started_at: status.started_at,
  completed_at: new Date().toISOString(),
  per_wave: calculateWaveDurations(status.tasks)
};
```

### 2. Calculate Loop Statistics

```javascript
const loops = {
  total: Object.values(tasks).reduce((sum, t) => sum + t.loop_count, 0),
  average_per_task: total / Object.keys(tasks).length,
  per_task: Object.fromEntries(
    Object.entries(tasks).map(([id, t]) => [id, t.loop_count])
  ),
  high_loop_tasks: Object.entries(tasks)
    .filter(([_, t]) => t.loop_count > 3)
    .map(([id, _]) => id),
  threshold: 3
};
```

### 3. Track Model Usage

```javascript
const models = {
  sonnet_count: Object.values(tasks).filter(t => t.current_model === 'sonnet').length,
  opus_count: Object.values(tasks).filter(t => t.current_model === 'opus').length,
  escalations: Object.entries(tasks)
    .filter(([_, t]) => t.model_escalated)
    .map(([id, t]) => ({
      task_id: id,
      from: t.original_model,
      to: t.current_model,
      reason: t.escalation_reason,
      at_loop: t.loop_count - (t.revision_count || 0)
    }))
};
```

### 4. Aggregate Greptile Scores

```javascript
const greptile = {
  enabled: !!process.env.GREPTILE_API_KEY,
  scores: Object.fromEntries(
    Object.entries(tasks)
      .filter(([_, t]) => t.greptile_scores?.length)
      .map(([id, t]) => [id, t.greptile_scores])
  ),
  average_final_score: calculateAverageFinalScore(tasks),
  hard_gates: Object.entries(tasks)
    .filter(([_, t]) => t.status === 'needs-human-review')
    .map(([id, _]) => id),
  revision_rounds: Object.values(tasks)
    .reduce((sum, t) => sum + (t.revision_count || 0), 0)
};
```

### 5. Identify Learning Candidates

```javascript
const learning_candidates = {
  high_loop_tasks: loops.high_loop_tasks,
  escalated_tasks: models.escalations.map(e => e.task_id),
  hard_gate_tasks: greptile.hard_gates,
  runtime_dependency_tasks: runtime_dependencies.entries.map(e => e.from_task),
  suggested_learnings: generateLearnings(tasks, runtime_dependencies)
};
```

---

## Usage

### By `/karimo-feedback --from-metrics`

```bash
/karimo-feedback --from-metrics user-profiles
```

Reads `metrics.json` and presents `suggested_learnings` for user confirmation.

### By PM Agent

After completion, PM presents:

```
📊 Execution Metrics

Duration: 135 minutes across 4 waves
Loops: 18 total (avg 3.0 per task)
  High-loop tasks: 2a, 3a
Models: 4 Sonnet, 2 Opus (1 escalation)
Greptile: 3.67 avg final score, 5 revision rounds

Suggested learnings from this execution:
  1. [2a] High loops (5) — Profile form validation patterns may be more complex than estimated
  2. [2a] Runtime dependency — Always check authentication requirements for API tasks

Capture these learnings? [Y/n/select]
```

---

## Example: Minimal Metrics (Fast Track)

```json
{
  "prd_slug": "quick-fix",
  "version": "1.0",
  "generated_at": "2026-02-20T15:30:00Z",

  "duration": {
    "total_minutes": 12,
    "started_at": "2026-02-20T15:18:00Z",
    "completed_at": "2026-02-20T15:30:00Z",
    "per_wave": {
      "1": 12
    }
  },

  "loops": {
    "total": 3,
    "average_per_task": 1.0,
    "per_task": {
      "1a": 1,
      "1b": 1,
      "1c": 1
    },
    "high_loop_tasks": [],
    "threshold": 3
  },

  "models": {
    "sonnet_count": 3,
    "opus_count": 0,
    "escalations": []
  },

  "greptile": {
    "enabled": false
  },

  "outcomes": {
    "total_tasks": 3,
    "successful": 3,
    "failed": 0,
    "skipped": 0,
    "needs_human_review": 0
  },

  "runtime_dependencies": {
    "discovered": 0,
    "resolved": 0,
    "deferred": 0,
    "entries": []
  },

  "learning_candidates": {
    "high_loop_tasks": [],
    "escalated_tasks": [],
    "hard_gate_tasks": [],
    "runtime_dependency_tasks": [],
    "suggested_learnings": []
  }
}
```

---

*This schema enables telemetry and automated learning capture for KARIMO executions.*
