# KARIMO Dashboard (Phase 3)

## Overview

KARIMO uses GitHub-native tooling for project oversight:
- **GitHub Projects** — Kanban board for task status visualization
- **`/karimo:status`** — Detailed execution state per PRD
- **`/karimo:overview`** — Cross-PRD oversight dashboard

## Why GitHub-Native?

- Zero additional infrastructure
- No auth/deployment complexity
- GitHub Projects already has dependency visualization
- Works offline via `gh` CLI

## Views

### GitHub Projects Board

- Auto-created per PRD
- Tasks as issues with status columns
- Dependencies visible via linked issues

### /karimo:overview

- Blocked tasks needing attention
- Revision loops in progress
- Recent completions
- Stale task detection

### /karimo:status --prd {slug}

- Per-task breakdown
- PR status integration
- Model usage and loop counts

## Future Considerations

A dedicated web dashboard may be added if GitHub Projects proves insufficient.
