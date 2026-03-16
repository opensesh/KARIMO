# KARIMO Commands Overview (L1)

Quick reference for command selection. See `.abstract.md` files for L0 summaries, full `.md` files for L2 details.

---

## Core Workflow

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-research](commands/karimo-research.abstract.md)** | Research (required first step) | researcher, refiner |
| **[/karimo-plan](commands/karimo-plan.abstract.md)** | PRD interview | interviewer, investigator |
| **[/karimo-run](commands/karimo-run.abstract.md)** | Execute PRD tasks | pm, brief-writer, task agents |
| **[/karimo-merge](commands/karimo-merge.abstract.md)** | Final PR to main | coverage-reviewer |

---

## Configuration & Setup

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-configure](commands/karimo-configure.abstract.md)** | Project configuration | investigator |

---

## Monitoring & Diagnostics

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-dashboard](commands/karimo-dashboard.abstract.md)** | Execution monitoring | None (read-only) |
| **[/karimo-doctor](commands/karimo-doctor.abstract.md)** | Installation health check | None (read-only) |

---

## Feedback & Learning

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-feedback](commands/karimo-feedback.abstract.md)** | Capture learnings | interviewer, feedback-auditor |

---

## Maintenance

| Command | Purpose | Agents Invoked |
|---------|---------|----------------|
| **[/karimo-update](commands/karimo-update.abstract.md)** | Update KARIMO | None (runs script) |
| **[/karimo-help](commands/karimo-help.abstract.md)** | Documentation search | None (read-only) |

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

## Command Loading Protocol

1. **Quick scan**: Read this file (L1) to identify relevant commands
2. **Verify**: Read `.abstract.md` (L0) to confirm arguments and workflow
3. **Execute**: Full command definition loaded on invocation

**Token budget**: L1 (~300 tokens) + L0 (~150 tokens) = ~450 tokens for discovery

---

## File Locations

```
.claude/commands/
├── commands.overview.md            # This file (L1)
├── karimo-{name}.abstract.md       # L0 abstracts (10 files)
└── karimo-{name}.md                # L2 full definitions (10 files)
```

---

*Total commands: 10*
*Last updated: v7.8.0*
