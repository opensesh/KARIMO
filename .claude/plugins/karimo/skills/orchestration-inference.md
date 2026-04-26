# KARIMO Orchestration Inference Skill

Inference engine for recommending orchestration settings based on PRD complexity metrics. Used by the interviewer agent during Round 2.6.

---

## Purpose

This skill analyzes PRD complexity metrics and recommends optimal orchestration settings:
- Integration cadence (worktree, wave, feature)
- Review cadence (trigger, scope, on_findings)
- Gate placement and model selection

The inference engine uses deterministic decision trees — no guessing or randomness.

---

## Inputs

The inference engine accepts the following metrics from complexity assessment:

| Input | Type | Description |
|-------|------|-------------|
| `task_count` | number | Total tasks in PRD |
| `wave_count` | number | Total waves (from execution plan) |
| `total_points` | number | Sum of task complexity scores |
| `high_risk_count` | number | Tasks with complexity 7+ |
| `require_review_files` | number | Tasks touching files in `require_review` |
| `review_provider` | string | Configured provider: greptile, code-review, none |

---

## Decision Trees

### Integration Cadence

```
IF task_count < 8:
  cadence = "feature"
  reason = "Small PRD benefits from per-task review visibility"

ELIF task_count >= 15 OR total_points >= 200:
  cadence = "wave"
  reason = "Large PRD benefits from wave-level review checkpoints"

ELSE:
  cadence = "worktree"
  reason = "Standard workflow — efficient for medium PRDs"
```

### Review Cadence

```
IF review_provider = "none":
  trigger = "per-task"
  scope = "pr-diff"
  reason = "Manual review at task level"

ELIF review_provider = "greptile":
  # Greptile is $30/month flat — trigger doesn't affect cost
  IF task_count >= 15:
    trigger = "per-wave"
    scope = "wave-diff"
    reason = "Flat rate makes wave-level review cost-effective"
  ELSE:
    trigger = "per-task"
    scope = "pr-diff"
    reason = "Per-task review for smaller PRDs"

ELIF review_provider = "code-review":
  # Code Review is ~$20/PR — trigger affects cost directly
  IF total_points >= 200:
    trigger = "per-gate"
    scope = "cumulative"
    reason = "Cost optimization for large PRD"
  ELIF task_count >= 10:
    trigger = "per-wave"
    scope = "wave-diff"
    reason = "Balanced cost/quality for medium PRD"
  ELSE:
    trigger = "per-task"
    scope = "pr-diff"
    reason = "Per-task review for small PRD"
```

### Gate Placement

```
IF wave_count < 4:
  gates = []
  reason = "Small PRD doesn't need gates"

ELIF wave_count >= 8:
  # Place gates every max_waves_per_gate waves
  gate_interval = min(max_waves_per_gate, wave_count / 2)
  gates = [wave for wave in range(gate_interval, wave_count, gate_interval)]
  reason = "Large PRD benefits from periodic checkpoints"

ELSE:
  # Single gate at midpoint for medium PRDs
  gates = [round(wave_count / 2)]
  reason = "Medium PRD benefits from midpoint checkpoint"
```

### Gate Model Selection

```
IF high_risk_count >= 3:
  model = "pause"
  reason = "High-risk tasks require human oversight"

ELIF high_risk_count >= 1:
  model = "conditional"
  reason = "Some risk — auto-pass if tests/build green"

ELIF require_review_files > 0:
  model = "conditional"
  reason = "Sensitive files benefit from conditional gating"

ELSE:
  model = "skip-on-pass"
  reason = "Low risk — skip gates if conditions met"
```

---

## Output Format

The inference engine returns a structured recommendation:

```yaml
orchestration_recommendation:
  integration:
    cadence: "wave"
    auto_merge_on_green: true
    reason: "18 tasks across 6 waves — wave-level PRs provide review checkpoints"

  review:
    trigger: "per-wave"
    scope: "wave-diff"
    skip_if_diff_under: 0
    on_findings: "halt"
    reason: "Greptile at $30/month makes per-wave cost-effective"

  gates:
    model: "conditional"
    auto_place: true
    conditions:
      require_tests_pass: true
      require_build_pass: true
      max_critical_findings: 0
    placements:
      - after_wave: 3
        label: "Review core implementation"
      - after_wave: 5
        label: "Validate integration layer"
    reason: "Based on dependency structure and complexity distribution"
```

---

## Gate Label Generation

When `auto_place: true`, generate meaningful gate labels based on wave content:

```
FOR each gate_wave in placements:
  tasks_in_wave = get_tasks_up_to_wave(gate_wave)

  IF tasks contain "auth", "security", "permission":
    label = "Security review checkpoint"
  ELIF tasks contain "test", "spec", "validate":
    label = "Test coverage checkpoint"
  ELIF tasks contain "api", "endpoint", "route":
    label = "API integration checkpoint"
  ELIF tasks contain "migrate", "schema", "database":
    label = "Data layer checkpoint"
  ELIF gate_wave == midpoint:
    label = "Midpoint review"
  ELIF gate_wave == final_wave - 1:
    label = "Pre-completion review"
  ELSE:
    label = "Review wave {gate_wave} implementation"
```

---

## Cost Estimation

Include cost estimates in recommendations when review_provider is configured:

### Greptile ($30/month flat)

```
trigger: any → cost: $30/month
Note: Trigger affects timing, not cost
```

### Code Review (~$20/PR)

```
trigger: per-task   → cost: task_count × $20
trigger: per-wave   → cost: wave_count × $20
trigger: per-gate   → cost: gate_count × $20
trigger: on-umbrella → cost: $20
```

---

## Usage in Interview

### Display Format (Round 2.6)

```
╭──────────────────────────────────────────────────────────────╮
│  Orchestration Recommendation                                │
╰──────────────────────────────────────────────────────────────╯

Based on complexity assessment ({task_count} tasks, {wave_count} waves, {total_points} points):

Integration Cadence: {cadence}
  {reason}

Review Cadence: trigger={trigger}, scope={scope}
  {reason}
  {cost estimate if applicable}

Gates: {gate_count} gates, model={model}
  {placements with labels}
  {reason}

─────────────────────────────────────────────────────────────────
[Y] Accept recommendations
[C] Customize settings
[S] Skip orchestration config (use defaults)
```

### Handling User Responses

**[Y] Accept:**
- Store recommendation in interview context
- Populate `.execution_config.json` during `/karimo:run`

**[C] Customize:**
Present each axis for override:

```
Integration Cadence:
  Current: wave
  Options: (1) worktree  (2) wave  (3) feature
  Selection [1/2/3]:

Review Cadence:
  Current: per-wave, wave-diff
  Trigger: (1) per-task  (2) per-wave  (3) per-gate  (4) on-umbrella
  Selection [1/2/3/4]:
  Scope: (1) pr-diff  (2) wave-diff  (3) cumulative
  Selection [1/2/3]:

Gate Model:
  Current: conditional
  Options: (1) pause  (2) conditional  (3) skip-on-pass
  Selection [1/2/3]:

Adjust gate placements? [y/N]:
```

**[S] Skip:**
- Use project defaults from `.karimo/config.yaml`
- No orchestration override stored

---

## Validation Rules

Before returning recommendations:

1. **Gate placement validation:**
   - Gates must be after waves that exist
   - No gate after final wave (execution completes naturally)
   - At least 2 waves between gates (avoid gate fatigue)

2. **Cadence compatibility:**
   - `trigger: per-gate` requires at least 1 gate
   - `scope: wave-diff` works best with `trigger: per-wave`
   - `scope: cumulative` works best with `trigger: per-gate` or `on-umbrella`

3. **Model compatibility:**
   - `skip-on-pass` only recommended when `high_risk_count = 0`
   - `pause` recommended when `high_risk_count >= 3`

---

## Example Scenarios

### Small Feature (5 tasks, 2 waves, 18 points)

```yaml
orchestration_recommendation:
  integration:
    cadence: "feature"
    reason: "Small PRD benefits from per-task review visibility"
  review:
    trigger: "per-task"
    scope: "pr-diff"
    reason: "Per-task review for smaller PRDs"
  gates:
    model: "skip-on-pass"
    placements: []
    reason: "Small PRD doesn't need gates"
```

### Medium Feature (12 tasks, 4 waves, 85 points, 1 high-risk)

```yaml
orchestration_recommendation:
  integration:
    cadence: "worktree"
    reason: "Standard workflow — efficient for medium PRDs"
  review:
    trigger: "per-wave"
    scope: "wave-diff"
    reason: "Balanced cost/quality for medium PRD"
  gates:
    model: "conditional"
    placements:
      - after_wave: 2
        label: "Midpoint review"
    reason: "Some risk — auto-pass if tests/build green"
```

### Large Feature (25 tasks, 8 waves, 280 points, 4 high-risk)

```yaml
orchestration_recommendation:
  integration:
    cadence: "wave"
    reason: "Large PRD benefits from wave-level review checkpoints"
  review:
    trigger: "per-gate"
    scope: "cumulative"
    reason: "Cost optimization for large PRD"
  gates:
    model: "pause"
    placements:
      - after_wave: 3
        label: "Review core implementation"
      - after_wave: 6
        label: "Validate integration layer"
    reason: "High-risk tasks require human oversight"
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ORCHESTRATION.md](../../../.karimo/docs/ORCHESTRATION.md) | Full orchestration policy reference |
| [EXECUTION_CONFIG_SCHEMA.md](../../../.karimo/templates/EXECUTION_CONFIG_SCHEMA.md) | Config schema |
| [INTERVIEW_PROTOCOL.md](../../../.karimo/templates/INTERVIEW_PROTOCOL.md) | Interview structure |

---

*Generated by [KARIMO v9.7](https://github.com/opensesh/KARIMO)*
