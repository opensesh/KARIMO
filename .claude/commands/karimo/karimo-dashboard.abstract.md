# /karimo-dashboard

**Type:** Command
**Invokes:** None (read-only)

## Purpose

Comprehensive CLI dashboard for KARIMO monitoring. Shows system health, execution progress, and velocity analytics.

## Key Arguments

- (default): Full dashboard (all 5 sections)
- `--prd {slug}`: PRD-specific dashboard
- `--active`: Show only active PRDs
- `--blocked`: Show only blocked tasks
- `--alerts`: Minimal mode (alerts only)
- `--json`: JSON output for automation
- `--reconcile`: Force git state reconstruction

## Sections

1. **Executive Summary**: Health score, quick stats
2. **Critical Alerts**: Blocked/stale/crashed tasks
3. **Execution Velocity**: Completion rates, ETAs
4. **Resource Usage**: Model distribution
5. **Recent Activity**: Event timeline

---
*Full definition: `.claude/commands/karimo/karimo-dashboard.md` (1138 lines)*
