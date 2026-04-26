# Orchestration Policy Layer

**Version:** 9.8.0
**Status:** Active

---

## Overview

The Orchestration Policy Layer provides configurable control over how KARIMO executes PRDs. Instead of hardcoded behavior, v9.x introduces configurable axes:

1. **Integration Cadence** — When worktree commits flow to feature branch (v9.0 ✓)
2. **Review Cadence** — When review tools fire and against what scope (v9.1 ✓)
3. **Gate Model** — Configurable gate behaviors with auto-placement (v9.2 ✓)
4. **Model Configuration** — Configurable model selection thresholds (v9.3 ✓)
5. **Gate Enhancements** — Custom conditions, per-gate review, parallel gates (v9.4 ✓)

This document covers all phases.

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

### Phase 3: Gate Model + Inference (v9.2) ✓

Configurable gate behavior with three models and an inference engine.

---

## Gate Model (Phase 3: v9.2)

The Gate Model controls how gates behave during execution.

### Configuration

```yaml
orchestration:
  gates:
    model: pause                # pause | conditional | skip-on-pass
    auto_place: true            # infer gates during /karimo:plan
    max_waves_per_gate: 8       # inference heuristic
    conditions:
      require_tests_pass: true  # All tests must pass
      require_build_pass: true  # Build must succeed
      max_critical_findings: 0  # Max P1 findings allowed
    placements:
      - after_wave: 3
        label: "Review core implementation"
        model: conditional      # Optional per-gate override
      - after_wave: 6
        label: "Validate integration"
        model: pause
```

### Gate Model Values

| Model | Behavior | Use Case |
|-------|----------|----------|
| `pause` | Always halt, require human resume | High-risk, critical decisions (default) |
| `conditional` | Auto-pass if conditions met, pause otherwise | Risk-aware automation |
| `skip-on-pass` | Skip gate entirely if conditions met | Low-risk, proven patterns |

### Gate Conditions

Conditions are evaluated when gate model is `conditional` or `skip-on-pass`:

| Condition | Default | Description |
|-----------|---------|-------------|
| `require_tests_pass` | true | All tests must pass |
| `require_build_pass` | true | Build must succeed |
| `max_critical_findings` | 0 | Max P1 findings allowed (0 = none) |

### PM Agent Behavior

```bash
# Load gate model (v9.2)
load_gate_model() {
  gate_model=$(jq -r '.orchestration.gates.model // "pause"' "$config_file")
  gate_auto_place=$(jq -r '.orchestration.gates.auto_place // false' "$config_file")
  # Load conditions...
}

# Evaluate conditions (v9.2)
evaluate_gate_conditions() {
  local all_pass=true
  # Check tests, build, findings...
  [ "$all_pass" = "true" ] && return 0 || return 1
}

# Check gate with model-aware behavior (v9.2)
check_gate() {
  case "$effective_model" in
    "pause")       # Always pause ;;
    "conditional") # Evaluate conditions, pause if fail ;;
    "skip-on-pass") # Evaluate conditions, skip if pass ;;
  esac
}
```

### New Status Values

| Status | Description |
|--------|-------------|
| `gate-evaluating` | Evaluating gate conditions |
| `gate-auto-passed` | Gate auto-passed (conditional/skip-on-pass) |
| `gate-skipped` | Gate skipped (skip-on-pass) |
| `paused-at-gate` | Gate paused for human (existing) |

---

## Inference Engine (v9.2)

The inference engine recommends orchestration settings during `/karimo:plan` (Round 2.6).

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| `task_count` | number | Total tasks in PRD |
| `wave_count` | number | Total waves |
| `total_points` | number | Sum of complexity scores |
| `high_risk_count` | number | Tasks with complexity 7+ |
| `require_review_files` | number | Tasks touching sensitive files |
| `review_provider` | string | Configured provider |

### Decision Trees

**Integration Cadence:**
- `task_count < 8` → `feature`
- `task_count >= 15 OR total_points >= 200` → `wave`
- Else → `worktree`

**Review Cadence:**
- `review_provider = greptile, task_count >= 15` → `per-wave`
- `review_provider = code-review, total_points >= 200` → `per-gate`
- Else → `per-task`

**Gate Placement:**
- `wave_count < 4` → No gates
- `wave_count >= 8` → Gates every `max_waves_per_gate` waves
- Else → Single gate at midpoint

**Gate Model:**
- `high_risk_count >= 3` → `pause`
- `high_risk_count >= 1` → `conditional`
- Else → `skip-on-pass`

### Output Format

```yaml
orchestration_recommendation:
  integration:
    cadence: "wave"
    reason: "18 tasks across 6 waves — wave-level PRs provide review checkpoints"
  review:
    trigger: "per-wave"
    scope: "wave-diff"
    reason: "Greptile at $30/month makes per-wave cost-effective"
  gates:
    model: "conditional"
    placements:
      - after_wave: 3
        label: "Review core implementation"
      - after_wave: 5
        label: "Validate integration layer"
    reason: "Based on dependency structure and complexity distribution"
```

### User Interaction

During Round 2.6, users can:
- **[Y] Accept** — Use recommendations as-is
- **[C] Customize** — Override specific settings
- **[S] Skip** — Use project defaults

---

---

## Gate Enhancements (Phase 4: v9.4)

### Custom Condition Expressions

Beyond preset conditions (tests, build, findings), v9.4 adds support for custom expressions:

```yaml
orchestration:
  gates:
    conditions:
      # Preset conditions
      require_tests_pass: true
      require_build_pass: true
      max_critical_findings: 0

      # Custom expressions (v9.4)
      custom:
        - expr: "coverage >= 80"
          label: "Code coverage threshold"
        - expr: "lint_errors == 0"
          label: "No lint errors"
        - expr: "bundle_size < 500kb"
          label: "Bundle size limit"
```

**Supported Expressions:**

| Pattern | Description |
|---------|-------------|
| `coverage >= N` | Code coverage percentage |
| `lint_errors == 0` | Zero lint errors |
| `type_errors == 0` | Zero TypeScript errors |
| `bundle_size < Nkb` | Bundle size limit |
| `security_score >= N` | Security scan score |

### Per-Gate Review Triggers

Different gates can have different review configurations:

```yaml
orchestration:
  gates:
    placements:
      - after_wave: 3
        label: "Core implementation review"
        model: conditional
        review:
          trigger: true              # Force review at this gate
          provider: greptile         # Override default provider
          scope: cumulative          # Review all changes since last gate
```

### Parallel Gate Branches

Gates can wait for parallel branches to complete:

```yaml
orchestration:
  gates:
    placements:
      - after_wave: 3
        label: "Review core"
        model: conditional
        branches:
          - waves: [4, 5]
            label: "Frontend track"
          - waves: [4, 5, 6]
            label: "Backend track"
        merge_strategy: all          # all | any
```

**Merge Strategies:**

| Strategy | Behavior |
|----------|----------|
| `all` | Gate waits for ALL branches to complete (default) |
| `any` | Gate proceeds when ANY branch completes |

---

## Backward Compatibility

### Gate Model Migration

| Legacy Field | New Field | Mapping |
|-------------|-----------|---------|
| `slicing.gates[]` | `orchestration.gates.placements[]` | Direct mapping |
| `slicing.auto_pause_at_gates: true` | `orchestration.gates.model: pause` | Boolean → model |
| (missing) | `orchestration.gates.model` | Default: `pause` |
| (missing) | `orchestration.gates.auto_place` | Default: `false` |
| (missing) | `orchestration.gates.conditions` | Default: tests + build pass |
| (missing) | `orchestration.gates.conditions.custom` | Default: `[]` (v9.4) |

Existing PRDs with `slicing.gates[]` continue to work — the PM agent checks both locations.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [EXECUTION_CONFIG_SCHEMA.md](../templates/EXECUTION_CONFIG_SCHEMA.md) | Per-PRD config schema |
| [CONFIG_TEMPLATE.yaml](../templates/CONFIG_TEMPLATE.yaml) | Project config template |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |

---

*Generated by [KARIMO v9.8](https://github.com/opensesh/KARIMO)*
