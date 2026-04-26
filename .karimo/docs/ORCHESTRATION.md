# Orchestration Policy Layer

**Version:** 9.0.0
**Status:** Active

---

## Overview

The Orchestration Policy Layer provides configurable control over how KARIMO executes PRDs. Instead of hardcoded behavior, v9.0 introduces three configurable axes:

1. **Integration Cadence** — When worktree commits flow to feature branch
2. **Review Cadence** — When review tools fire and against what scope (Phase 2: v9.1)
3. **Gate Model** — Where PM halts for human review (Phase 3: v9.2)

This document focuses on **Integration Cadence** (Phase 1, v9.0).

---

## Execution Model Terminology

```
Worktree (task isolation)
    └── Task (unit of work, belongs to a wave)
            └── Wave (group of tasks that can run in parallel)
                    └── Gate (optional halt point after wave completes)
                            └── Feature Branch (accumulates all waves)
```

| Term | Definition |
|------|------------|
| **Worktree** | Isolated git worktree where a single task executes |
| **Task** | Unit of work assigned to a wave based on dependencies |
| **Wave** | Group of tasks that can run in parallel (no inter-dependencies) |
| **Gate** | Optional halt point after a wave for human review |
| **Feature Branch** | Accumulates all waves; eventually merges to main |

---

## Integration Cadence Options

The `integration.cadence` setting controls how task work flows to the feature branch.

### Worktree Cadence (Default)

```yaml
orchestration:
  integration:
    cadence: worktree
```

**Behavior:**
- Tasks execute in isolated worktrees
- Task commits merge to feature branch when wave completes
- No intermediate PRs between task and feature branch
- Fastest flow, minimal PR overhead

**Best for:**
- Most PRDs (10-30 tasks)
- Teams with established review workflows
- When wave-level review isn't needed

**Flow:**
```
task-1a (worktree) ──┐
task-1b (worktree) ──┼── wave completes ──► feature/{slug}
task-1c (worktree) ──┘
```

### Wave Cadence

```yaml
orchestration:
  integration:
    cadence: wave
```

**Behavior:**
- Tasks execute in isolated worktrees
- Wave PR created after all tasks in wave complete
- Wave PR targets feature branch
- Wave PR requires merge before next wave starts

**Best for:**
- Large PRDs (15+ tasks)
- Teams wanting wave-level review checkpoints
- Complex features with multiple integration points

**Flow:**
```
task-1a (worktree) ──┐
task-1b (worktree) ──┼── wave-pr ──► review ──► feature/{slug}
task-1c (worktree) ──┘
```

### Feature Cadence

```yaml
orchestration:
  integration:
    cadence: feature
```

**Behavior:**
- Tasks execute in worktrees
- Each task creates individual PR to feature branch
- Task PRs require merge before wave advances
- Most PR overhead, finest-grained review

**Best for:**
- Small PRDs (<8 tasks)
- Boilerplate or scaffolding tasks
- Teams wanting per-task review

**Flow:**
```
task-1a (worktree) ──► task-pr-1a ──► review ──► feature/{slug}
task-1b (worktree) ──► task-pr-1b ──► review ──► feature/{slug}
task-1c (worktree) ──► task-pr-1c ──► review ──► feature/{slug}
```

---

## Configuration

### Project Defaults

Set in `.karimo/config.yaml`:

```yaml
orchestration:
  version: 2                    # 1 = legacy, 2 = policy layer
  integration:
    cadence: worktree           # worktree | wave | feature
    auto_merge_on_green: true   # skip human if CI passes
```

### Per-PRD Override

Set in `.karimo/prds/{slug}/.execution_config.json`:

```json
{
  "orchestration_version": 2,
  "orchestration": {
    "integration": {
      "cadence": "wave",
      "auto_merge_on_green": true
    }
  }
}
```

Per-PRD settings override project defaults.

---

## PM Agent Behavior

The PM agent loads orchestration policy at startup:

```bash
load_orchestration_policy() {
  local config_file="${prd_path}/.execution_config.json"

  orchestration_version=$(jq -r '.orchestration_version // 1' "$config_file")

  if [ "$orchestration_version" = "2" ]; then
    integration_cadence=$(jq -r '.orchestration.integration.cadence // "worktree"' "$config_file")
    auto_merge_on_green=$(jq -r '.orchestration.integration.auto_merge_on_green // true' "$config_file")
  else
    # v1 legacy: use hardcoded worktree cadence
    integration_cadence="worktree"
    auto_merge_on_green=true
  fi
}
```

### Wave Completion

The `complete_wave()` function handles wave completion based on cadence:

| Cadence | Action |
|---------|--------|
| `worktree` | Merge wave tasks to feature branch directly |
| `wave` | Create wave PR, wait for merge, then continue |
| `feature` | Verify all task PRs merged, then continue |

---

## Backward Compatibility

### orchestration_version Field

| Version | Behavior |
|---------|----------|
| `1` (or missing) | Legacy hardcoded behavior (worktree cadence) |
| `2` | Policy layer active, reads orchestration config |

### Migration Path

Existing PRDs continue working unchanged:
- Missing `orchestration_version` → treated as `1`
- v1 PRDs use hardcoded worktree cadence
- No breaking changes to existing workflows

### Upgrading Mid-Flight PRDs

```bash
/karimo:run --prd {slug} --upgrade-orchestration
```

This prompts for cadence selection and updates `.execution_config.json`.

---

## Deprecation Timeline

| Version | Status |
|---------|--------|
| v9.0 | v1 fully supported, no warnings |
| v9.3 | v1 shows deprecation notice on load |
| v10.0 | v1 removed, migration required |

---

## Cadence Selection Heuristics

When selecting a cadence, consider:

| Factor | Worktree | Wave | Feature |
|--------|----------|------|---------|
| Task count | 10-30 | 15+ | <8 |
| Review needs | Low | Medium | High |
| PR overhead | Minimal | Medium | High |
| Review checkpoints | Wave gates only | Every wave | Every task |
| Complexity | Any | High | Low |

**Quick guide:**
- Default to `worktree` unless you have a specific reason
- Use `wave` for large PRDs where wave-level review adds value
- Use `feature` for small, boilerplate PRDs where task-level review is helpful

---

## Phase Roadmap

### Phase 1: Integration Cadence (v9.0) ✓

- `orchestration.integration.cadence`: worktree, wave, feature
- `orchestration.integration.auto_merge_on_green`: boolean
- PM agent cadence-aware wave completion

### Phase 2: Review Cadence (v9.1)

```yaml
orchestration:
  review:
    trigger: per-task           # per-task | per-wave | per-gate | on-umbrella
    scope: pr-diff              # pr-diff | wave-diff | cumulative
    skip_if_diff_under: 50      # skip review if PR has <50 lines
    providers:
      greptile:
        fire_at: [wave]
      code-review:
        fire_at: [umbrella]
```

### Phase 3: Gate Model + Inference (v9.2)

```yaml
orchestration:
  gates:
    model: pause                # pause | conditional | skip-on-pass
    auto_place: true            # infer gates during /karimo:plan
    max_waves_per_gate: 8       # inference heuristic
```

Inference engine will recommend orchestration settings based on PRD complexity.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [EXECUTION_CONFIG_SCHEMA.md](../templates/EXECUTION_CONFIG_SCHEMA.md) | Per-PRD config schema |
| [CONFIG_TEMPLATE.yaml](../templates/CONFIG_TEMPLATE.yaml) | Project config template |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |

---

*Generated by [KARIMO v9.0](https://github.com/opensesh/KARIMO)*
