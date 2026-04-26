# Orchestration Policy Layer

**Version:** 9.1.0
**Status:** Active

---

## Overview

The Orchestration Policy Layer provides configurable control over how KARIMO executes PRDs. Instead of hardcoded behavior, v9.x introduces three configurable axes:

1. **Integration Cadence** — When worktree commits flow to feature branch (Phase 1: v9.0 ✓)
2. **Review Cadence** — When review tools fire and against what scope (Phase 2: v9.1 ✓)
3. **Gate Model** — Where PM halts for human review (Phase 3: v9.2)

This document covers **Integration Cadence** (v9.0) and **Review Cadence** (v9.1).

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

## Review Cadence (Phase 2: v9.1)

Review Cadence controls when reviews fire and what scope they cover.

### Configuration

```yaml
orchestration:
  review:
    trigger: per-task           # per-task | per-wave | per-gate | on-umbrella
    scope: pr-diff              # pr-diff | wave-diff | cumulative
    skip_if_diff_under: 0       # Skip review if PR has fewer lines (0 = never skip)
    on_findings: halt           # halt | comment-only

    # Per-provider overrides (optional)
    providers:
      greptile:
        fire_at: [wave]         # When this provider fires
        on_findings: halt
      code-review:
        fire_at: [umbrella]
        on_findings: comment-only
```

### Review Trigger Options

| Trigger | When Reviews Fire | Best For |
|---------|-------------------|----------|
| `per-task` | After each task PR | High scrutiny (default) |
| `per-wave` | After wave completes | Balanced cost/quality |
| `per-gate` | Only at gates | Cost optimization |
| `on-umbrella` | Only final feature→main PR | Maximum savings |

### Review Scope Options

| Scope | What Gets Reviewed | Context Level |
|-------|-------------------|---------------|
| `pr-diff` | Single PR changes | Minimal (default) |
| `wave-diff` | All PRs in wave combined | Wave-level |
| `cumulative` | Changes since last review | Maximum |

### Skip Small Diffs

Set `skip_if_diff_under` to skip reviews for trivial changes:

| Value | Behavior |
|-------|----------|
| `0` | Never skip (default) |
| `50` | Skip PRs under 50 lines |
| `100` | Skip PRs under 100 lines |

### on_findings Behavior

| Value | Behavior | Use Case |
|-------|----------|----------|
| `halt` | Block merge until findings resolved | Strict quality gate (default) |
| `comment-only` | Post findings as comments, allow merge | Advisory mode |

### Per-Provider Overrides

Different providers can fire at different points:

```yaml
providers:
  greptile:
    fire_at: [wave]           # Greptile reviews at wave completion
    on_findings: halt         # Block on greptile findings
  code-review:
    fire_at: [umbrella]       # Code Review at final PR only
    on_findings: comment-only # Advisory only
```

This allows cost optimization (Greptile flat rate at wave level) while getting comprehensive review (Code Review) at the umbrella level.

### PM Agent Behavior (v9.1)

The PM agent loads review cadence with `load_review_cadence()`:

```bash
load_review_cadence() {
  local config_file="${prd_path}/.execution_config.json"

  if [ "$orchestration_version" = "2" ]; then
    local has_orch_review=$(jq -r '.orchestration.review // empty' "$config_file")

    if [ -n "$has_orch_review" ]; then
      review_trigger=$(jq -r '.orchestration.review.trigger // "per-task"' "$config_file")
      review_scope=$(jq -r '.orchestration.review.scope // "pr-diff"' "$config_file")
      skip_if_diff_under=$(jq -r '.orchestration.review.skip_if_diff_under // 0' "$config_file")
      on_findings_default=$(jq -r '.orchestration.review.on_findings // "halt"' "$config_file")

      # Per-provider overrides
      greptile_fire_at=$(jq -r '.orchestration.review.providers.greptile.fire_at // []' "$config_file")
      code_review_fire_at=$(jq -r '.orchestration.review.providers["code-review"].fire_at // []' "$config_file")
    else
      # Legacy mapping from review.frequency
      case "$(jq -r '.review.frequency // "per-task"' "$config_file")" in
        "per-task") review_trigger="per-task" ;;
        "per-wave") review_trigger="per-wave" ;;
        "per-slice") review_trigger="per-gate" ;;
      esac
      review_scope="pr-diff"
      skip_if_diff_under=0
    fi
  fi
}
```

### PM-Reviewer Behavior (v9.1)

The PM-Reviewer handles scope-based diff generation and on_findings:

```bash
# Scope-based diff generation
get_review_diff() {
  case "$scope" in
    "pr-diff")   gh pr diff "$pr_number" ;;
    "wave-diff") # Combined diff from all wave PRs ;;
    "cumulative") git diff "$last_reviewed_sha"..HEAD ;;
  esac
}

# on_findings handling
handle_findings() {
  case "$on_findings" in
    "halt")
      [ -n "$findings" ] && verdict="fail"
      ;;
    "comment-only")
      [ -n "$findings" ] && gh pr comment "$pr_number" --body "..."
      verdict="pass"  # Allow merge despite findings
      ;;
  esac
}
```

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

**v9.1 Review Cadence Migration:**
- Missing `orchestration.review` → legacy `review.frequency` mapping applied
- `review.frequency: per-task` → `trigger: per-task`
- `review.frequency: per-wave` → `trigger: per-wave`
- `review.frequency: per-slice` → `trigger: per-gate` (renamed)
- Missing `scope` → defaults to `pr-diff`
- Missing `skip_if_diff_under` → defaults to `0`
- Missing `on_findings` → defaults to `halt`

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

### Phase 2: Review Cadence (v9.1) ✓

- `orchestration.review.trigger`: per-task, per-wave, per-gate, on-umbrella
- `orchestration.review.scope`: pr-diff, wave-diff, cumulative
- `orchestration.review.skip_if_diff_under`: line threshold
- `orchestration.review.on_findings`: halt, comment-only
- `orchestration.review.providers`: per-provider fire_at overrides
- PM agent review cadence loading
- PM-Reviewer scope-based diff and on_findings handling

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

*Generated by [KARIMO v9.1](https://github.com/opensesh/KARIMO)*
