# KARIMO Dashboard (Level 5)

A standalone Next.js application focused on visualization, review, and merge decisions. It does not control execution — that's the CLI's job. The dashboard is a read-heavy command center that pulls state from GitHub Projects and cost data from SQLite.

> **Note:** The dashboard is not built until Level 5. Until then, GitHub Projects Kanban + terminal output serve the same purpose.

---

## Overview

The dashboard presents a consistent UX regardless of project. Whether you're running one project or five, the views are the same: Phase Overview, Dependency Graph, Merge Report, Cost Tracker. Projects are filterable. When you start a new project, its phases appear in the same interface with the same interactions.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js |
| UI Components | Untitled UI component library (all views except DAG) |
| DAG Visualization | React Flow (interactive dependency graph) |
| Data Sources | GitHub Projects API (task state, PR data, Greptile reviews) + SQLite (cost tracking) |
| Storage | SQLite via better-sqlite3 — cost tracking and run history (the only data the dashboard owns) |
| Deployment | Vercel (separate project from your target repo — internal dev tool, shareable via URL) |

---

## Dashboard Views

### 1. Phase Overview

- Shows all phases for the active project with status and progress
- Project selector/filter at the top — all feature phases visible, filterable
- Click into a phase to see its dependency graph and task list
- Phase-level progress bar: done tasks / total tasks

### 2. Dependency Graph

Interactive DAG visualization built with React Flow:

- Nodes represent tasks, edges represent `depends_on` relationships
- Color-coded nodes by status:
  - Ready: green
  - Blocked: gray
  - In Progress: blue
  - In Review: yellow
  - Done: checkmark
  - Failed: red
- Click a node to see: task details, PR link, Greptile score, agent logs, estimated cost
- React Flow handles layout (dagre algorithm), zoom/pan, and mini-map
- Data source: GitHub Projects custom fields + PR API

```
Feature 1: Auth System
  [1a] DB schema ─────┬──────► [1b] API routes ────► [1d] UI components
                      │                                    ▲
                      └──────► [1c] Middleware ────────────┘
```

### 3. Merge Report

The primary action surface — where you make merge decisions every morning:

- All PRs from the current/last run
- Greptile scores with pass/fail indicators
- One-click merge button (calls `gh pr merge --squash` via API, protected by confirmation token)
- Dependency-aware merge ordering suggestion (merge 1a before 1b, etc.)
- Diff summary per PR
- `review-pending` indicator — tasks awaiting Greptile or manual review
- `require_review` indicator — PRs touching caution files shown with warning badge

### 4. Cost Tracker

- Per-task breakdown: task name, iterations used, duration, estimated cost
- Per-phase cumulative cost
- Running total across all phases
- Trend chart: cost per run over time
- Budget alerts: configurable threshold (e.g., warn if a single task exceeds $20)
- Engine column — shows which engine ran each task
- Cost confidence — shows whether cost was `direct`, `estimated`, or `fallback`
- Data source: SQLite (the one thing the dashboard owns that GitHub Projects doesn't)

### Additional Indicators

- `review-pending` tasks are flagged for manual review
- `require_review` PRs shown with warning badge
- Assignee filter — filter tasks by `assigned_to` field

---

## Dashboard Authentication

All endpoints require API key authentication. The merge endpoint has additional confirmation token protection (see [SECURITY.md](./SECURITY.md) for details on the confirmation token flow).

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/phases` | Phase list with status (from GitHub Projects) |
| `GET /api/tasks/:phaseId` | Tasks for a phase with dependency info |
| `GET /api/tasks/:taskId/logs` | Agent logs for a task |
| `GET /api/prd/:phaseId` | PRD content for a phase |
| `POST /api/prd/:phaseId/sync` | Sync PRD tasks to GitHub Issues + Project |
| `POST /api/merge/:prNumber` | Merge a PR (wraps `gh pr merge`, requires confirmation token) |
| `GET /api/merge/:prNumber/confirm` | Get confirmation token for merge (60s TTL) |
| `GET /api/costs/summary` | Cost summary (per-task, per-phase, total) |
| `GET /api/costs/history` | Historical cost data for charts |

The dashboard refreshes from GitHub API on page load or manual refresh. No WebSockets, no real-time polling. Keep it simple — you check it in the morning or when a run finishes.

---

## Before Level 5

Until the dashboard is built, you can use:

1. **GitHub Projects Kanban** — Native board view shows all task statuses
2. **Terminal output** — `karimo status` prints current state
3. **GitHub PR list** — Direct access to PRs for review

The dashboard is a convenience layer, not a requirement for KARIMO to function.

---

## Related Documentation

- [LEVELS.md](./LEVELS.md) — Dashboard is a Level 5 feature
- [SECURITY.md](./SECURITY.md) — Dashboard authentication and confirmation tokens
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview showing dashboard integration
