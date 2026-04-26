# Execution Config Schema Reference

**Version:** 9.4.0
**Purpose:** Document the `.execution_config.json` format used by KARIMO v9.4
**Location:** `.karimo/prds/{slug}/.execution_config.json`

---

## Overview

Each PRD folder contains an `.execution_config.json` file that stores execution-time configuration decisions. This file is:
- Created by `/karimo:run` during Phase 3.5 (Execution Configuration)
- Read by the PM agent at execution startup
- Used to control slicing, review cadence, gate model, and gate behavior

**v9.2 Updates:** This version adds gate model configuration with configurable behaviors (`pause`, `conditional`, `skip-on-pass`) and inference engine support for auto-placement.

**v9.1 Updates:** This version adds review cadence configuration with trigger, scope, skip threshold, and per-provider overrides.

**v9.0 Updates:** Added orchestration policy layer with integration cadence control.

---

## Full Schema

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "worktree",
      "auto_merge_on_green": true
    },
    "review": {
      "trigger": "per-wave",
      "scope": "wave-diff",
      "skip_if_diff_under": 50,
      "on_findings": "halt",
      "providers": {
        "greptile": { "fire_at": ["wave"], "on_findings": "halt" },
        "code-review": { "fire_at": ["umbrella"], "on_findings": "comment-only" }
      }
    },
    "gates": {
      "model": "conditional",
      "auto_place": true,
      "max_waves_per_gate": 8,
      "conditions": {
        "require_tests_pass": true,
        "require_build_pass": true,
        "max_critical_findings": 0,
        "custom": [
          { "expr": "coverage >= 80", "label": "Code coverage threshold" },
          { "expr": "lint_errors == 0", "label": "No lint errors" }
        ]
      },
      "placements": [
        {
          "after_wave": 3,
          "label": "Review core implementation",
          "model": "conditional",
          "review": {
            "trigger": true,
            "provider": "greptile",
            "scope": "cumulative"
          }
        },
        {
          "after_wave": 6,
          "label": "Validate integration",
          "model": "pause",
          "branches": [
            { "waves": [4, 5], "label": "Frontend track" },
            { "waves": [4, 5, 6], "label": "Backend track" }
          ],
          "merge_strategy": "all"
        }
      ]
    }
  },
  "models": {
    "default": "sonnet",
    "complexity_threshold": 5,
    "force_opus_tasks": ["1a", "2c"],
    "force_sonnet_tasks": ["3a"],
    "escalation": {
      "after_failures": 1,
      "triggers": ["architectural_issues", "type_system_issues"]
    }
  },
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
| `orchestration_version` | number | No | Orchestration policy version (1=legacy, 2=policy layer). Default: 1 |
| `orchestration` | object | No | Orchestration policy configuration (v9.0) |
| `models` | object | No | Model selection configuration (v9.3) |
| `slicing` | object | No | Slicing and gate configuration |
| `review` | object | No | Review frequency and provider settings |
| `model_override` | object | No | Task-level model overrides (legacy, use `models` instead) |
| `max_revision_loops` | number | No | Max revision attempts (default: 3) |
| `allow_bypass` | object | No | Classification bypass rules |

### Orchestration Object (v9.0)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `integration` | object | — | Integration cadence settings |

### Integration Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cadence` | string | "worktree" | Integration cadence: worktree, wave, feature |
| `auto_merge_on_green` | boolean | true | Skip human if CI passes |

### Integration Cadence Values

| Cadence | Behavior | Use Case |
|---------|----------|----------|
| `worktree` | Task commits in worktree → merge to feature when wave completes | Default, current behavior |
| `wave` | Task commits in worktree → wave-PR → feature branch | Medium/large PRDs, wave-level review checkpoints |
| `feature` | Task commits → individual PRs to feature branch | Small PRDs, boilerplate, limited scope |

### Review Object (v9.1)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `trigger` | string | "per-task" | When reviews fire |
| `scope` | string | "pr-diff" | What diff to review |
| `skip_if_diff_under` | number | 0 | Skip review if PR has fewer lines (0 = never skip) |
| `on_findings` | string | "halt" | Block merge or just comment |
| `providers` | object | {} | Per-provider overrides |

### Review Trigger Values (v9.1)

| Trigger | When Reviews Fire | Best For |
|---------|-------------------|----------|
| `per-task` | After each task PR | High scrutiny (default) |
| `per-wave` | After wave completes | Balanced |
| `per-gate` | Only at gates | Cost optimization |
| `on-umbrella` | Only final feature→main PR | Maximum savings |

### Review Scope Values (v9.1)

| Scope | What Gets Reviewed | Context Level |
|-------|-------------------|---------------|
| `pr-diff` | Single PR changes | Minimal (default) |
| `wave-diff` | All PRs in wave | Wave-level |
| `cumulative` | Changes since last review | Maximum |

### Review on_findings Values (v9.1)

| Value | Behavior |
|-------|----------|
| `halt` | Block merge until findings resolved (default) |
| `comment-only` | Post comments but allow merge |

### Review Providers Object (v9.1)

Per-provider overrides allow different providers to fire at different points:

| Field | Type | Description |
|-------|------|-------------|
| `fire_at` | string[] | When provider fires: "task", "wave", "gate", "umbrella" |
| `on_findings` | string | Provider-specific on_findings override |

### Gates Object (v9.2)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | string | "pause" | Default gate behavior: pause, conditional, skip-on-pass |
| `auto_place` | boolean | false | Enable inference-based gate placement |
| `max_waves_per_gate` | number | 8 | Max waves between gates (inference heuristic) |
| `conditions` | object | {} | Conditions for conditional/skip-on-pass |
| `placements` | array | [] | Gate definitions with optional per-gate model override |

### Gate Model Values (v9.2)

| Model | Behavior | Use Case |
|-------|----------|----------|
| `pause` | Always pause, require human resume | High-risk, critical decisions (default) |
| `conditional` | Auto-pass if conditions met, pause otherwise | Risk-aware automation |
| `skip-on-pass` | Skip gate entirely if conditions met | Low-risk, proven patterns |

### Gate Conditions Object (v9.2+)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `require_tests_pass` | boolean | true | All tests must pass |
| `require_build_pass` | boolean | true | Build must succeed |
| `max_critical_findings` | number | 0 | Max P1 findings allowed (0 = none) |
| `custom` | array | [] | Custom condition expressions (v9.4) |

### Custom Condition Object (v9.4)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expr` | string | Yes | Condition expression (e.g., "coverage >= 80") |
| `label` | string | Yes | Human-readable label for the condition |

### Supported Custom Expressions (v9.4)

| Expression Pattern | Description | Example |
|-------------------|-------------|---------|
| `coverage >= N` | Code coverage percentage threshold | `coverage >= 80` |
| `lint_errors == 0` | Zero lint errors required | `lint_errors == 0` |
| `bundle_size < Nkb` | Bundle size limit in kilobytes | `bundle_size < 500kb` |
| `type_errors == 0` | Zero TypeScript errors required | `type_errors == 0` |
| `security_score >= N` | Security scan score threshold | `security_score >= 90` |

### Gate Placement Object (v9.2+)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `after_wave` | number | Yes | Wave number after which gate triggers |
| `label` | string | Yes | Human-readable gate description |
| `model` | string | No | Per-gate model override (pause, conditional, skip-on-pass) |
| `review` | object | No | Per-gate review configuration (v9.4) |
| `branches` | array | No | Parallel branch definitions (v9.4) |
| `merge_strategy` | string | No | How parallel branches merge: all, any (v9.4) |

### Per-Gate Review Object (v9.4)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `trigger` | boolean | false | Force review at this gate |
| `provider` | string | — | Override default provider for this gate |
| `scope` | string | "pr-diff" | Review scope override for this gate |

### Parallel Branch Object (v9.4)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `waves` | number[] | Yes | Waves in this branch |
| `label` | string | Yes | Human-readable branch description |

### Merge Strategy Values (v9.4)

| Strategy | Behavior |
|----------|----------|
| `all` | Gate waits for ALL branches to complete (default) |
| `any` | Gate proceeds when ANY branch completes |

### Models Object (v9.3)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default` | string | "sonnet" | Default model for all tasks |
| `complexity_threshold` | number | 5 | Complexity >= N uses Opus |
| `force_opus_tasks` | string[] | [] | Task IDs to force to Opus |
| `force_sonnet_tasks` | string[] | [] | Task IDs to force to Sonnet |
| `escalation` | object | — | Escalation configuration |

### Models Escalation Object (v9.3)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `after_failures` | number | 1 | Failures before escalating to Opus |
| `triggers` | string[] | [] | Additional escalation triggers |

### Escalation Triggers (v9.3)

| Trigger | Description |
|---------|-------------|
| `architectural_issues` | Findings involving architecture, design patterns, structure |
| `type_system_issues` | Findings involving types, interfaces, contracts |
| `security_issues` | Findings involving security concerns |
| `performance_issues` | Findings involving performance problems |

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

### Minimal (No Slicing, v9.0)

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "worktree"
    }
  },
  "review": {
    "frequency": "per-task",
    "provider": "none"
  },
  "max_revision_loops": 3
}
```

### Wave Cadence with Review Checkpoints

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "wave",
      "auto_merge_on_green": true
    }
  },
  "slicing": {
    "enabled": true,
    "slice_count": 2,
    "gates": [
      { "after_wave": 3, "label": "Review core implementation" }
    ],
    "auto_pause_at_gates": true
  },
  "review": {
    "frequency": "per-wave",
    "provider": "greptile"
  },
  "max_revision_loops": 3
}
```

### Feature Cadence for Small PRDs

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "feature",
      "auto_merge_on_green": true
    }
  },
  "review": {
    "frequency": "per-task",
    "provider": "code-review"
  },
  "max_revision_loops": 3
}
```

### Legacy v8.3 (No Orchestration)

v8.3 PRDs without orchestration_version are treated as v1 (legacy):

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

### Review Cadence with Per-Provider Overrides (v9.1)

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "wave"
    },
    "review": {
      "trigger": "per-wave",
      "scope": "wave-diff",
      "skip_if_diff_under": 50,
      "on_findings": "halt",
      "providers": {
        "greptile": {
          "fire_at": ["wave"],
          "on_findings": "halt"
        },
        "code-review": {
          "fire_at": ["umbrella"],
          "on_findings": "comment-only"
        }
      }
    }
  },
  "review": {
    "provider": "greptile"
  }
}
```

### Skip Small Diffs (v9.1)

```json
{
  "configured_at": "2026-04-25T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "worktree"
    },
    "review": {
      "trigger": "per-task",
      "scope": "pr-diff",
      "skip_if_diff_under": 100,
      "on_findings": "halt"
    }
  },
  "review": {
    "provider": "code-review"
  }
}
```

### With Gate Model (v9.2)

```json
{
  "configured_at": "2026-04-26T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "wave"
    },
    "review": {
      "trigger": "per-wave",
      "scope": "wave-diff"
    },
    "gates": {
      "model": "conditional",
      "auto_place": true,
      "max_waves_per_gate": 8,
      "conditions": {
        "require_tests_pass": true,
        "require_build_pass": true,
        "max_critical_findings": 0
      },
      "placements": [
        { "after_wave": 3, "label": "Review core implementation" },
        { "after_wave": 6, "label": "Validate integration", "model": "pause" }
      ]
    }
  }
}
```

### Conditional Gates with Custom Thresholds (v9.2)

```json
{
  "configured_at": "2026-04-26T10:00:00Z",
  "orchestration_version": 2,
  "orchestration": {
    "gates": {
      "model": "skip-on-pass",
      "conditions": {
        "require_tests_pass": true,
        "require_build_pass": true,
        "max_critical_findings": 2
      },
      "placements": [
        { "after_wave": 4, "label": "Midpoint check", "model": "conditional" }
      ]
    }
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

## Migration from v8.3

v8.3 stored configuration without orchestration policy:

```json
// v8.3 format
{
  "configured_at": "...",
  "slicing": { ... },
  "review": { ... },
  "max_revision_loops": 3,
  "allow_bypass": { ... }
}
```

The PM agent handles backward compatibility:
- Missing `orchestration_version` → treated as `1` (legacy hardcoded behavior)
- Missing `orchestration.integration.cadence` → defaults to `"worktree"`
- v1 PRDs use current hardcoded behavior unchanged
- v2 defaults to `cadence: worktree` (same behavior, explicit config)

**v9.1 Review Cadence Compatibility:**
- Missing `orchestration.review` → legacy `review.frequency` mapping applied
- `review.frequency: per-task` → `orchestration.review.trigger: per-task`
- `review.frequency: per-wave` → `orchestration.review.trigger: per-wave`
- `review.frequency: per-slice` → `orchestration.review.trigger: per-gate` (renamed)
- Missing `scope` → defaults to `"pr-diff"`
- Missing `skip_if_diff_under` → defaults to `0` (never skip)
- Missing `on_findings` → defaults to `"halt"`

**v9.2 Gate Model Compatibility:**
- Missing `orchestration.gates` → uses `slicing.gates` with `pause` model
- `slicing.auto_pause_at_gates: true` → equivalent to `gates.model: pause`
- `slicing.gates[]` → maps directly to `orchestration.gates.placements[]`
- Missing `gates.model` → defaults to `"pause"`
- Missing `gates.auto_place` → defaults to `false`
- Missing `gates.conditions` → defaults to tests + build pass

### Upgrading Mid-Flight PRDs

Users can upgrade existing PRDs:

```bash
/karimo:run --prd {slug} --upgrade-orchestration
```

This prompts for new settings and updates `.execution_config.json` with:
- `orchestration_version: 2`
- User-selected orchestration config
- `policy_started_at_wave: N` (for partial migration)

### Deprecation Path

| Version | Behavior |
|---------|----------|
| v9.0 | v1 fully supported, no warnings |
| v9.3 | v1 shows deprecation notice on load |
| v10.0 | v1 removed, migration required |

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
| [ORCHESTRATION.md](../docs/ORCHESTRATION.md) | Full orchestration policy layer reference |
| [STATUS_SCHEMA.md](STATUS_SCHEMA.md) | Status tracking including `paused-at-gate` |
| [CONFIG_TEMPLATE.yaml](CONFIG_TEMPLATE.yaml) | Project-level config with slicing thresholds |
| [TOKEN-ECONOMICS.md](../docs/TOKEN-ECONOMICS.md) | Rationale for slicing and gates |

---

*Generated by [KARIMO v9.4](https://github.com/opensesh/KARIMO)*
