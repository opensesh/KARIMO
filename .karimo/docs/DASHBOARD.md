# KARIMO Monitoring (Phase 3)

## Overview

KARIMO uses GitHub-native tooling for project oversight — no separate dashboard needed.

| Tool | Purpose |
|------|---------|
| **`/karimo-status`** | Execution state per PRD |
| **`/karimo-overview`** | Cross-PRD oversight |
| **GitHub PR queries** | All KARIMO PRs and status |
| **Claude Code analytics** | Review usage (if using Code Review) |

## Why GitHub-Native?

- **Zero additional infrastructure** — Use what you already have
- **Real-time** — GitHub is the source of truth
- **Team access** — Anyone with repo access can view
- **Integrations** — Works with existing GitHub workflows
- **Offline capable** — Works via `gh` CLI

## Dashboard Queries

```bash
# All PRs for a feature
gh pr list --label karimo-{slug} --state all

# All KARIMO PRs this month
gh pr list --label karimo --search "merged:>2026-02-01" --state merged

# PRs needing attention
gh pr list --label karimo,needs-revision

# PRs blocked by hard gate
gh pr list --label blocked-needs-human

# Wave-based tracking
gh pr list --label karimo,wave-1
```

## Views

### /karimo-overview

Cross-PRD oversight dashboard showing:
- Blocked tasks needing attention
- Revision loops in progress
- Recent completions
- Stale task detection

### /karimo-status --prd {slug}

Per-PRD execution state:
- Per-task breakdown
- PR status integration
- Model usage and loop counts
- Wave progress

### Claude Code Analytics (Code Review users)

If using Claude Code Review, access analytics at `claude.ai/admin-settings`:
- Review usage and spend
- Cost per PR
- Monthly totals

## Design Philosophy

KARIMO maximizes existing tooling rather than building custom dashboards:
- PRs are the source of truth for task completion
- Labels enable filtering without custom infrastructure
- CLI queries provide instant visibility
- Analytics live where they're already tracked
