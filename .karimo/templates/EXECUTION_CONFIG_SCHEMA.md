# Execution Config Schema Reference

**Version:** 8.3.0
**Purpose:** Document the `.execution_config.json` format used by KARIMO v8.3
**Location:** `.karimo/prds/{slug}/.execution_config.json`

---

## Overview

Each PRD folder contains an `.execution_config.json` file that stores execution-time configuration decisions. This file is:
- Created by `/karimo:run` during Phase 3.5 (Execution Configuration)
- Read by the PM agent at execution startup
- Used to control slicing, review frequency, model overrides, and gate behavior

**v8.3 Introduction:** This schema is new in v8.3, replacing the simpler configuration stored in earlier versions.

---

## Full Schema

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "slicing": {
    "enabled": true,
    "slice_count": 3,
    "gates": [
      { "after_wave": 2, "label": "Review baseline metrics" },
      { "after_wave": 5, "label": "Validate core functionality" }
    ],
    "auto_pause_at_gates": true
  },
  "review": {
    "frequency": "per-wave",
    "provider": "greptile",
    "estimated_cost": 90.00
  },
  "model_override": {
    "enabled": true,
    "force_opus_tasks": ["1a", "2c"],
    "force_sonnet_tasks": ["3a"]
  },
  "max_revision_loops": 3,
  "allow_bypass": {
    "future_work_overlap": true,
    "false_positive_factual": true
  }
}
```

---

## Field Reference

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `configured_at` | ISO datetime | Yes | When configuration was set |
| `slicing` | object | No | Slicing and gate configuration |
| `review` | object | No | Review frequency and provider settings |
| `model_override` | object | No | Task-level model overrides |
| `max_revision_loops` | number | No | Max revision attempts (default: 3) |
| `allow_bypass` | object | No | Classification bypass rules |

### Slicing Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | false | Whether slicing is active |
| `slice_count` | number | 1 | Number of slices |
| `gates` | array | [] | Gate definitions |
| `auto_pause_at_gates` | boolean | false | Auto-pause at each gate |

### Gate Object

| Field | Type | Description |
|-------|------|-------------|
| `after_wave` | number | Wave number after which gate triggers |
| `label` | string | Human-readable gate description |

### Review Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `frequency` | string | "per-task" | Review frequency: per-task, per-wave, per-slice |
| `provider` | string | "none" | Review provider: none, greptile, code-review |
| `estimated_cost` | number | 0 | Estimated review cost (informational) |

### Model Override Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | false | Whether overrides are active |
| `force_opus_tasks` | string[] | [] | Task IDs to force to Opus |
| `force_sonnet_tasks` | string[] | [] | Task IDs to force to Sonnet |

### Allow Bypass Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `future_work_overlap` | boolean | true | Allow pass for future-wave file references |
| `false_positive_factual` | boolean | true | Allow pass for config contradictions |

---

## Review Frequency Values

| Value | Behavior | Cost Impact |
|-------|----------|-------------|
| `per-task` | Review each task PR individually | Highest |
| `per-wave` | Consolidated review after wave completes | Medium |
| `per-slice` | Review only at gate checkpoints | Lowest |

---

## Example Configurations

### Minimal (No Slicing)

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "review": {
    "frequency": "per-task",
    "provider": "none"
  },
  "max_revision_loops": 3
}
```

### With Slicing and Gates

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "slicing": {
    "enabled": true,
    "slice_count": 3,
    "gates": [
      { "after_wave": 2, "label": "Review baseline metrics" },
      { "after_wave": 5, "label": "Validate core functionality" }
    ],
    "auto_pause_at_gates": true
  },
  "review": {
    "frequency": "per-wave",
    "provider": "greptile",
    "estimated_cost": 90.00
  },
  "max_revision_loops": 3
}
```

### With Model Overrides

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "model_override": {
    "enabled": true,
    "force_opus_tasks": ["1a", "2c"],
    "force_sonnet_tasks": []
  },
  "review": {
    "frequency": "per-task",
    "provider": "code-review"
  }
}
```

### Cost-Optimized (Per-Slice Review)

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "slicing": {
    "enabled": true,
    "slice_count": 4,
    "gates": [
      { "after_wave": 3, "label": "Foundation complete" },
      { "after_wave": 6, "label": "Core features verified" },
      { "after_wave": 8, "label": "Integration validated" }
    ],
    "auto_pause_at_gates": true
  },
  "review": {
    "frequency": "per-slice",
    "provider": "greptile",
    "estimated_cost": 30.00
  }
}
```

---

## PM Agent Usage

The PM agent reads this configuration at startup:

```bash
# Load execution config
load_execution_config() {
  local config_file=".karimo/prds/${prd_slug}/.execution_config.json"

  if [ -f "$config_file" ]; then
    slicing_enabled=$(jq -r '.slicing.enabled // false' "$config_file")
    review_frequency=$(jq -r '.review.frequency // "per-task"' "$config_file")
    auto_pause_at_gates=$(jq -r '.slicing.auto_pause_at_gates // false' "$config_file")
    # ... etc
  fi
}
```

### Gate Check After Wave

```bash
# Check if wave has a configured gate
gate_label=$(jq -r --arg wave "$wave_number" \
  '.slicing.gates[] | select(.after_wave == ($wave | tonumber)) | .label // empty' \
  "$config_file")

if [ -n "$gate_label" ] && [ "$auto_pause_at_gates" = "true" ]; then
  # Pause at gate
  update_status "paused-at-gate"
fi
```

### Model Override Check

```bash
# Get effective model for task
get_task_model() {
  local task_id="$1"
  local default_model="$2"

  if jq -e --arg tid "$task_id" '.model_override.force_opus_tasks | index($tid)' "$config_file" >/dev/null; then
    echo "opus"
  elif jq -e --arg tid "$task_id" '.model_override.force_sonnet_tasks | index($tid)' "$config_file" >/dev/null; then
    echo "sonnet"
  else
    echo "$default_model"
  fi
}
```

---

## Migration from v8.2

v8.2 stored a simpler configuration without slicing:

```json
// v8.2 format
{
  "configured_at": "...",
  "max_revision_loops": 3,
  "review_mode": "automated",
  "allow_bypass": { ... }
}
```

The PM agent handles backward compatibility:
- Missing `slicing` → treated as `enabled: false`
- Missing `review.frequency` → defaults to `"per-task"`
- Missing `model_override` → no overrides applied

No migration script needed — the PM agent reads what's available.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [STATUS_SCHEMA.md](STATUS_SCHEMA.md) | Status tracking including `paused-at-gate` |
| [CONFIG_TEMPLATE.yaml](CONFIG_TEMPLATE.yaml) | Project-level config with slicing thresholds |
| [TOKEN-ECONOMICS.md](../docs/TOKEN-ECONOMICS.md) | Rationale for slicing and gates |

---

*Generated by [KARIMO v8.3](https://github.com/opensesh/KARIMO)*
