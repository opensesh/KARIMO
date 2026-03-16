# KARIMO CLI Dashboard (Phase 3)

## Overview

KARIMO Phase 3 provides comprehensive monitoring through a CLI-native dashboard — no separate web interface needed.

The `/karimo:dashboard` command replaces the planned web dashboard with a fast, integrated CLI solution that provides:

- **System health scoring** — 0-100 score based on task success, loop efficiency, and blocked counts
- **Critical alerts** — Immediate attention needed for blocked, stale, or crashed tasks
- **Execution velocity** — Completion rate, loop efficiency trends, and project ETAs
- **Resource usage** — Model distribution, loop patterns, parallel capacity utilization
- **Activity timeline** — Recent events across all PRDs

## Why CLI-Native?

| Benefit | Description |
|---------|-------------|
| **Zero setup** | Built into KARIMO, no server deployment required |
| **Fast** | < 2s render with caching, < 1s with valid cache |
| **Integrated** | Same terminal as `/karimo:dashboard`, `/karimo:run` |
| **Scriptable** | JSON output for automation (`--json` flag) |
| **Offline capable** | Works without network (except GitHub API calls) |

## Quick Start

```bash
# Full dashboard (all 5 sections)
/karimo:dashboard

# Minimal mode (alerts only)
/karimo:dashboard --alerts

# PRD-specific insights
/karimo:dashboard --prd user-profiles

# Extended activity feed
/karimo:dashboard --activity

# JSON for automation
/karimo:dashboard --json
```

## Dashboard Sections

### 1. Executive Summary

High-level system health and quick stats at a glance.

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard                              Updated: 45s ago    │
│  System Health: ████████░░ 85%                 Active: 2 PRDs      │
╰────────────────────────────────────────────────────────────────────╯

📊 QUICK SUMMARY
────────────────
  PRDs:       3 total (2 active, 1 complete)
  Tasks:      42 total (28 done, 8 running, 4 queued, 2 blocked)
  Progress:   ████████░░ 67% complete
  Models:     28 Sonnet, 12 Opus (30% escalation rate)

  ✅ Next completions:
    • user-profiles Wave 2 (~2h, 1 task remaining)
    • token-studio Wave 1 (~6h, 6 tasks queued)
```

**Metrics:**
- **Health Score** — 0-100 weighted score (task success 30%, review efficiency 25%, stalled penalty 20%, parallel utilization 15%, blocked penalty 10%)
- **Cross-PRD Totals** — All PRDs, tasks, completion %
- **Model Distribution** — Sonnet vs Opus counts, escalation rate
- **ETA Projections** — Based on current velocity

### 2. Critical Alerts

Tasks requiring immediate human intervention.

```
🚨 CRITICAL ALERTS — Needs Immediate Attention
───────────────────────────────────────────────

  [user-profiles / 2a] BLOCKED — 3 failed Greptile attempts
    → PR #44 needs human review
    → Blocked for: 2h 15m
    → Action: gh pr view 44

  [token-studio / 1c] STALE — Running for 6h 23m
    → Agent may have crashed
    → Action: /karimo:run --prd token-studio --task 1c

  Total: 2 items requiring human intervention
```

**Alert Types:**
- **BLOCKED** — Failed 3 Greptile attempts, needs manual review
- **STALE** — Running > 4h or in-review > 48h
- **CRASHED** — Branch exists without PR (agent crashed mid-execution)
- **CONFLICTS** — PR has merge conflicts

### 3. Execution Velocity

Completion rate, loop efficiency, and project ETAs.

```
📊 EXECUTION VELOCITY — Last 7 Days
────────────────────────────────────

  Completion Rate:    ████████████░░ 42 tasks (6/day avg)
  Loop Efficiency:    ████████░░░░░ 2.8 avg (improving ↓)
  First-Time Pass:    █████░░░░░░░ 45% (↑ from 38%)
  Review Pass Rate:   ██████████░░ 82% (Greptile avg: 3.2)

  Wave Progress:
    user-profiles:    Wave 2 of 3  ████████░░ 80%
    token-studio:     Wave 1 of 4  ███░░░░░░░ 25%

  ETA Projections:
    user-profiles:    ~2h (Wave 2: 1 task remaining)
    token-studio:     ~6h (Wave 1: 6 tasks queued)
```

**Metrics:**
- **Completion Rate** — Tasks/day average over last 7 days
- **Loop Efficiency** — Average loops per task (lower is better)
- **First-Time Pass** — % of tasks completing in 1 loop
- **Review Pass Rate** — % passing Greptile on first attempt
- **Wave Progress** — Per-PRD wave completion status
- **ETA Projections** — Based on current velocity

### 4. Resource Usage

Model distribution, loop patterns, parallel capacity.

```
⚙️  RESOURCE USAGE — Current Cycle
──────────────────────────────────

  Model Distribution:   Sonnet: 28 tasks (70%)  Opus: 12 tasks (30%)
  Escalations:          4 tasks (10% escalation rate)
  Parallel Capacity:    2/3 slots utilized (67%)

  Loop Distribution:
    1 loop:  ████████████████ 20 tasks (50%)
    2 loops: ████████ 12 tasks (30%)
    3 loops: ████ 6 tasks (15%)
    4+ loops: ██ 2 tasks (5%)  ← Learning candidates
```

**Metrics:**
- **Model Distribution** — Sonnet vs Opus task counts and percentages
- **Escalations** — Tasks that escalated from Sonnet to Opus
- **Parallel Capacity** — Active tasks vs `max_parallel` config
- **Loop Distribution** — Histogram of tasks by loop count

### 5. Recent Activity

Timeline of events across all PRDs.

```
📋 RECENT ACTIVITY — Last 10 Events
────────────────────────────────────

  3m ago   [user-profiles] Task 2c completed (PR #46 merged)
  12m ago  [token-studio] Task 1b needs revision (Greptile: 2/5)
  15m ago  [user-profiles] Wave 2 completed
  28m ago  [token-studio] Task 1a escalated (sonnet → opus)
  1h ago   [user-profiles] Task 2b completed (PR #45 merged)
```

**Event Types:**
- Task completed (PR merged)
- Task needs revision (Greptile feedback)
- Wave completed
- Model escalation
- Task started
- PR created

---

## Command Flags

### Display Modes

```bash
# Full dashboard (default)
/karimo:dashboard

# Minimal mode (alerts only)
/karimo:dashboard --alerts

# Extended activity (50 events instead of 10)
/karimo:dashboard --activity

# PRD-specific dashboard
/karimo:dashboard --prd user-profiles
```

### Filters (Inherited from `/karimo-overview`)

```bash
# Show only active PRDs
/karimo:dashboard --active

# Show only blocked tasks
/karimo:dashboard --blocked

# Show cross-PRD dependency graph
/karimo:dashboard --deps
```

### Output Formats

```bash
# Default (human-readable)
/karimo:dashboard

# JSON output for automation
/karimo:dashboard --json

# Force refresh (bypass cache)
/karimo:dashboard --refresh
```

---

## Performance

### Caching Strategy

- **Cache location:** `.karimo/dashboard-cache.json`
- **TTL:** 2 minutes
- **Performance targets:**
  - < 2s with 3 active PRDs
  - < 5s with 10+ PRDs
  - < 1s with valid cache

### Cache Invalidation

Cache is invalidated on:
- Any `/karimo:run` run
- Any `status.json` update
- Manual `--refresh` flag
- Cache age > 2 minutes

---

## Workflow Integration

### Active Monitoring (During Execution)

```bash
/karimo:dashboard           # System health, alerts, progress
/karimo:dashboard --prd X      # Wave-level task details (deep dive)
/karimo:run --prd X     # Resume/start execution
```

### Post-Execution Analysis

```bash
/karimo:dashboard --activity # Review execution history
/karimo:dashboard --prd X    # PRD-specific metrics and insights
/karimo:feedback             # Capture learnings
```

---

## Comparison with Other Tools

| Tool | Focus | When to Use |
|------|-------|-------------|
| `/karimo:dashboard` | Cross-PRD overview, health, velocity, alerts | Active monitoring, post-execution analysis |
| `/karimo:dashboard` | Single PRD deep dive, wave details | Debugging specific PRD, wave-level task tracking |
| `gh pr list` | GitHub PR queries | Integration with external tools, CI/CD |

---

## Data Sources

The dashboard aggregates data from:

1. **status.json** — Task statuses, wave progress, timestamps
2. **metrics.json** — Loop counts, Greptile scores, model usage (for completed PRDs)
3. **Git state** — Branch existence, PR status (via `gh` CLI)
4. **GitHub API** — PR labels, merge status, mergeable status
5. **config.yaml** — `max_parallel`, project settings

### Git State Reconciliation

**Principle:** Git is truth. status.json is a cache.

The dashboard uses the same reconciliation logic as `/karimo:dashboard`:
- Branch exists + PR merged → Task done
- Branch exists + no PR → Task crashed
- No branch + status.json says done → Trust status.json (branch cleaned)
- PR has `needs-revision` label → Update status to `needs-revision`

---

## GitHub Queries (Still Available)

The dashboard complements (not replaces) GitHub queries:

```bash
# All PRs for a feature
gh pr list --label karimo-{slug} --state all

# All KARIMO PRs this month
gh pr list --label karimo --search "merged:>2026-03-01" --state merged

# PRs needing attention
gh pr list --label karimo,needs-revision

# PRs blocked by hard gate
gh pr list --label blocked-needs-human

# Wave-based tracking
gh pr list --label karimo,wave-1
```

---

## Migration from `/karimo-overview`

### What Changed

`/karimo-overview` is **deprecated** and replaced by `/karimo:dashboard`.

All functionality preserved:
- Blocked tasks → **Critical Alerts** section
- Revision loops → **Critical Alerts** section
- Recently completed → **Recent Activity** section
- Dependency graph → `--deps` flag (unchanged)

New functionality added:
- Executive Summary with health scoring
- Execution Velocity metrics
- Resource Usage analytics
- Enhanced activity timeline

### Migration Path

**Old:**
```bash
/karimo-overview              # Blocked tasks, revision loops, recently completed
/karimo-overview --blocked    # Only blocked tasks
/karimo-overview --active     # Only active PRDs
/karimo-overview --deps       # Dependency graph
```

**New:**
```bash
/karimo:dashboard             # Full dashboard (5 sections)
/karimo:dashboard --blocked   # Only blocked tasks (same)
/karimo:dashboard --active    # Only active PRDs (same)
/karimo:dashboard --deps      # Dependency graph (same)
/karimo:dashboard --alerts    # Minimal mode (new)
/karimo:dashboard --prd X     # PRD-specific dashboard (new)
```

---

## Design Philosophy

KARIMO maximizes CLI-native tooling rather than building web dashboards:

- **PRs are the source of truth** for task completion
- **Git state** drives reconciliation, not status.json
- **Labels** enable filtering without custom infrastructure
- **CLI commands** provide instant visibility
- **Analytics** live where they're already tracked (GitHub, Claude Code)
- **Caching** optimizes performance without complexity

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [PHASES.md](PHASES.md) | Adoption phases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
