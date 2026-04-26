# Token Economics & Slicing Rationale

**Version:** 9.7.0
**Purpose:** Document the token economics behind KARIMO's slicing and gate system

---

## Overview

Large PRDs benefit from strategic checkpoints (gates) for both token efficiency and execution quality. This document explains the economics behind slicing recommendations and when gates provide value beyond the ceremony overhead.

---

## The Problem: Context Window Pressure

Claude Code has a ~1M token context window. For large PRDs, continuous execution creates pressure:

**Without gates:**
- PM agent maintains full context throughout execution
- Context grows with each wave (findings, status updates, learnings)
- At ~860K tokens, compaction fires and summarizes early context
- Specific decisions and rationale from early waves get compressed

**With gates:**
- Each slice starts with fresh context
- PM bootstrap cost is fixed (~50-65K per slice)
- No compaction during slice execution
- Decision lineage preserved in disk artifacts

---

## Token Budget Breakdown

### PM Bootstrap Cost Per Slice

When a slice begins, the PM agent loads:

| Component | Tokens (approx) |
|-----------|-----------------|
| Agent prompt + KARIMO_RULES.md | ~8-12K |
| PRD document | ~15-25K (varies by PRD size) |
| tasks.yaml | ~15-25K (varies by task count) |
| execution_plan.yaml | ~1-2K |
| status.json | ~1K |
| Gate artifacts (if resuming) | ~3-5K each |
| **Total bootstrap** | **~50-65K** |

This represents **5-6% of the 1M context window** — a manageable fixed cost per slice.

### Worker Token Economics

Workers spawn in **separate context windows**:
- Each worker: ~15-25K tokens (task brief + context)
- Workers don't share PM's context
- No pressure on PM thread from worker operations
- For a 25-task slice: ~75 separate worker contexts, distributed

### Continuous vs Sliced Comparison

**64-task PRD example (real case study):**

| Approach | PM Context Growth | Compaction Events | Decision Preservation |
|----------|-------------------|-------------------|----------------------|
| Continuous | ~860K → compaction | 2+ times | Lossy (early decisions summarized) |
| 4 slices | ~200K max per slice | 0 | Full fidelity in artifacts |

---

## The 5 Wins Beyond Tokens

Slicing with gates provides benefits beyond token efficiency:

### 1. Decision Lineage Feeds Forward

Slice 1 findings are baked into Slice 2 briefs as concrete artifacts, not summarized context. The PM reads `findings.md` from disk, not from compressed conversation history.

### 2. No Compaction Lossiness

Specific decisions survive verbatim:
- "We chose library X because Y" — preserved in findings
- "Task 2a uncovered pattern Z" — preserved in findings
- "Integration required approach W" — preserved in findings

Without gates, these become "previous tasks established patterns" after compaction.

### 3. Recovery Surface

When something goes wrong:
- **Without gates:** Debug in a context that's been compacted multiple times
- **With gates:** Start a clean chat, load artifacts, resume from known state

Each gate is a clean recovery checkpoint.

### 4. Human Review Budget

**Without gates:** Review all 64 tasks at once (overwhelming)
**With gates:** Review 15-20 tasks at each checkpoint (manageable)

Gates transform mega-review into focused checkpoints.

### 5. Cost Control on Review

For Greptile ($30/month flat):
- Frequency doesn't affect monthly cost
- But per-wave economics only feasible with gates (batch reviews at checkpoints)

For Claude Code Review (~$20/PR):
- Per-task: 64 × $20 = $1,280
- Per-wave: ~10 × $20 = $200
- Per-slice: 4 × $20 = $80

Gates enable per-slice review for 94% cost reduction.

---

## When Gates Pay Off vs Add Ceremony

### Gates Add Value When:

| Condition | Why Gates Help |
|-----------|----------------|
| ≥15 tasks | Enough work that context pressure matters |
| ≥8 waves | Sequential dependencies create context growth |
| ≥100 complexity points | Higher complexity = more findings = more context |
| `require_review` files touched | Human checkpoint before modifying sensitive files |
| Cross-feature dependencies | Gate before integrating external changes |

### Gates Add Unnecessary Ceremony When:

| Condition | Skip Gates |
|-----------|------------|
| <15 tasks | Context stays manageable |
| Simple changes | Low complexity = low context growth |
| Fast iteration needed | Gates add latency for human review |
| Prototype/spike work | Optimize for speed, not quality |

---

## Slicing Thresholds

Based on empirical observation:

| Metric | Threshold | Recommendation |
|--------|-----------|----------------|
| Tasks | <15 | No slicing needed |
| Tasks | 15-29 | Consider 2 slices (1 gate) |
| Tasks | 30-49 | Recommend 3 slices (2 gates) |
| Tasks | 50+ | Strong recommend 4+ slices |
| Complexity points | <100 | No slicing needed |
| Complexity points | 100-199 | Consider 2 slices |
| Complexity points | 200-299 | Recommend 3 slices |
| Complexity points | 300+ | Strong recommend 4+ slices |
| Waves | <8 | No slicing needed |
| Waves | ≥8 | Slicing recommended |

These thresholds are configurable in `.karimo/config.yaml`:

```yaml
slicing:
  thresholds:
    no_slicing: 15
    two_slices: 30
    three_slices: 50
  complexity_thresholds:
    no_slicing: 100
    two_slices: 200
    three_slices: 300
  wave_threshold: 8
```

---

## Gate Boundary Selection

**Good gate boundaries** are waves that produce human-interpretable artifacts:

| Gate Type | Examples |
|-----------|----------|
| Audit complete | "Review baseline metrics", "Validate current state" |
| Classification done | "Approve categorization", "Confirm priority ranking" |
| Foundation ready | "Foundation components verified", "Core APIs stable" |
| Integration checkpoint | "External integrations validated" |

**Avoid gating after:**
- Trivial tasks (setup, config changes)
- Incomplete features (half-built UI)
- Dependency-only tasks (library updates)

The interviewer identifies gate candidates by scanning for keywords:
- "audit", "review", "baseline", "classify", "analyze", "assess"
- Tasks with outputs requiring human interpretation

---

## Practical Guidelines

### For PRD Authors

1. **Accept slicing recommendations** unless you have a specific reason to override
2. **Name gates meaningfully** — "Review baseline metrics" > "Gate 1"
3. **Plan for gate reviews** — Each gate is a human checkpoint, budget the time

### For PM Agents

1. **Load execution config at startup** — Respect slicing decisions
2. **Check gates after each wave** — Don't skip configured gates
3. **Write findings to disk** — Don't rely on context for cross-wave knowledge

### For Cost Optimization

1. **Use per-slice review** for large PRDs with gates
2. **Use per-wave review** for medium PRDs without gates
3. **Use per-task review** for small PRDs or critical features

---

## Case Study: PRD 016

A real-world PRD that validated the slicing system:

**PRD 016 Stats:**
- 64 tasks
- 38 waves
- 4 recommended slices
- ~300+ complexity points

**Continuous Execution (hypothetical):**
- PM context would reach ~860K tokens
- Compaction would fire at least twice
- Early decisions (waves 1-10) would be summarized
- Debugging issues in wave 30+ would require reconstructing lost context

**Sliced Execution (actual):**
- 4 slices with 3 gates
- ~200K max context per slice
- Zero compaction events
- All decisions preserved in disk artifacts
- Each gate provided human review checkpoint

**Result:** Claude automatically recommended slicing during the interview, validating that the complexity assessment logic correctly identifies large PRDs that benefit from gates.

---

## Summary

| Factor | Without Gates | With Gates |
|--------|---------------|------------|
| Context pressure | High (compaction risk) | Low (fresh per slice) |
| Decision preservation | Lossy (summarized) | Full fidelity (disk artifacts) |
| Recovery surface | Complex (compacted context) | Clean (checkpoint state) |
| Human review | Overwhelming (all at once) | Focused (per checkpoint) |
| Review cost | Higher (per-task) | Lower (per-slice) |
| Setup overhead | None | Gate configuration |
| Execution latency | Continuous | Pauses at gates |

**Recommendation:** Accept slicing recommendations for PRDs with ≥15 tasks, ≥8 waves, or ≥100 complexity points. The token efficiency and quality benefits outweigh the gate ceremony overhead.

---

*Generated by [KARIMO v8.3](https://github.com/opensesh/KARIMO)*
