# KARIMO Configuration Guide

## What is KARIMO?

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Start PRD interview to capture requirements |
| `/karimo:execute --prd {slug}` | Execute tasks from a PRD |
| `/karimo:status` | View execution state and progress |
| `/karimo:feedback` | Capture learnings from completed work |

---

## Adoption Phases

KARIMO uses three optional adoption phases:

### Phase 1: Execute PRD
Your first planning process with KARIMO:
- Run `/karimo:plan` to create PRD through agent interviews
- Agent teams coordinate task execution
- GitHub Projects integration for tracking
- Git worktrees and feature branches by default
- PRs created for each completed task

**This is where everyone starts.** Phase 1 is fully functional out of the box.

### Phase 2: Automate Review
Add automated code review to your workflow:
- Integrate Greptile for code integrity checks
- Ranking system enables agentic revision loops
- Score < 4 triggers automated revision attempts

**Optional upgrade.** Requires Greptile API key.

### Phase 3: Monitor & Review
Connect to a dashboard for oversight:
- Review all features, issues, and status
- Visualize dependencies and progress
- Team-wide visibility into execution

**Future phase.** Dashboard to be built.

---

## Configuration

KARIMO configuration lives in `.karimo/config.yaml`. For full reference, see [docs/CONFIG-REFERENCE.md](.karimo/docs/CONFIG-REFERENCE.md).

Key settings:
- **boundaries.never_touch** — Files agents must not modify
- **boundaries.require_review** — Files flagged for human review
- **commands.build/lint/test** — Validation commands
- **execution.max_parallel** — Concurrent agent limit

---

## Agent Rules

Agent behavior is governed by `.claude/KARIMO_RULES.md`. This file defines:
- Task execution boundaries
- Git worktree conventions
- PR creation guidelines
- Finding propagation between tasks

---

## Installed Components

When you run `install.sh`, these files are added:

| Location | Contents |
|----------|----------|
| `.claude/agents/` | 4 agent definitions (interviewer, investigator, pm, reviewer) |
| `.claude/commands/` | 4 slash commands (plan, execute, status, feedback) |
| `.claude/skills/` | 2 skills (git-worktree-ops, github-project-ops) |
| `.claude/KARIMO_RULES.md` | Agent behavior rules |
| `.karimo/templates/` | PRD, task, and status schemas |
| `.github/workflows/` | GitHub Actions for review and sync |

---

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design and integration |
| [PHASES.md](.karimo/docs/PHASES.md) | Adoption phases explained |
| [COMMANDS.md](.karimo/docs/COMMANDS.md) | Slash command reference |
| [GETTING-STARTED.md](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [CODE-INTEGRITY.md](.karimo/docs/CODE-INTEGRITY.md) | Worktrees, branches, Greptile |
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-layer learning system |

---

## KARIMO Learnings

_Rules learned from execution feedback. Populated by `/karimo:feedback`._

### Patterns to Follow

_No patterns captured yet._

### Anti-Patterns to Avoid

_No anti-patterns captured yet._
