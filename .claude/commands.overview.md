# KARIMO Commands Overview

Quick reference for command selection.

---

## Core Workflow

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-research](commands/karimo-research.md)** | Research (required first step) | researcher, refiner |
| **[/karimo-plan](commands/karimo-plan.md)** | PRD interview | interviewer, investigator |
| **[/karimo-run](commands/karimo-run.md)** | Execute PRD tasks | pm, brief-writer, task agents |
| **[/karimo-merge](commands/karimo-merge.md)** | Final PR to main | coverage-reviewer |

---

## Configuration & Setup

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-configure](commands/karimo-configure.md)** | Project configuration | investigator |

---

## Monitoring & Diagnostics

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-dashboard](commands/karimo-dashboard.md)** | Execution monitoring | None (read-only) |
| **[/karimo-doctor](commands/karimo-doctor.md)** | Installation health check | None (read-only) |

---

## Feedback & Learning

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-feedback](commands/karimo-feedback.md)** | Capture learnings | interviewer, feedback-auditor |

---

## Maintenance

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-update](commands/karimo-update.md)** | Update KARIMO | None (runs script) |
| **[/karimo-help](commands/karimo-help.md)** | Documentation search | None (read-only) |

---

## Command Flow

```
/karimo-research "feature-name"     # 1. Research (creates PRD folder)
        │
        ▼
/karimo-plan --prd feature-name     # 2. Planning (creates PRD + tasks)
        │
        ▼
/karimo-run --prd feature-name      # 3. Execution (briefs → tasks → PRs)
        │
        ▼
/karimo-merge --prd feature-name    # 4. Merge (final PR to main)
```

---

## File Locations

```
.claude/commands/
├── commands.overview.md            # This file
└── karimo-{name}.md                # Full definitions (10 files)
```

---

*Total commands: 10*
*Last updated: v7.10.0*
