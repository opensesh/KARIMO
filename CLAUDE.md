# KARIMO Configuration Guide

## What is KARIMO?

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Start PRD interview to capture requirements |
| `/karimo:review` | Cross-PRD dashboard: blocked tasks, revision loops, completions |
| `/karimo:review --prd {slug}` | Approve PRD and generate task briefs |
| `/karimo:execute --prd {slug}` | Execute approved tasks from a PRD |
| `/karimo:status` | View execution state and progress |
| `/karimo:feedback` | Quick capture of single learnings (~2 min) |
| `/karimo:learn` | Deep learning cycle with investigation (~45 min) |

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
- Integrate Greptile for code integrity checks (0-5 scale)
- Score ≥ 3 passes, < 3 triggers revision loop
- Model escalation (Sonnet → Opus) after first failure
- Hard gate after 3 failed attempts (needs human review)

**Optional but highly recommended.** Greptile acts as a force multiplier. Requires Greptile API key.

### Phase 3: Monitor & Review

**Coming soon.** Dashboard for team-wide visibility and oversight.

---

## Configuration

KARIMO configuration lives in this file (CLAUDE.md). On first `/karimo:plan`, the investigator agent auto-detects project context and populates the sections below.

Key settings (stored in sections above):
- **Project Context** — Runtime, framework, package manager
- **Commands** — Build, lint, test, typecheck commands
- **Boundaries** — Files agents must not touch or must flag for review

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
| `.claude/agents/` | 10 agent definitions (7 coordination + 3 task agents) |
| `.claude/commands/` | 6 slash commands (plan, review, execute, status, feedback, learn) |
| `.claude/skills/` | 5 skills (2 coordination + 3 task agent skills) |
| `.claude/KARIMO_RULES.md` | Agent behavior rules |
| `.karimo/templates/` | 7 templates (PRD, interview, task, status, dependencies, learn-interview, task-brief) |
| `.github/workflows/` | 4 GitHub Actions (review, integration, sync, dependency-watch) |

### Agent Types

**Coordination agents:** interviewer, investigator, reviewer, brief-writer, pm, review-architect, learn-auditor

**Task agents:** implementer, tester, documenter

### Skills

**Coordination skills:** git-worktree-ops, github-project-ops

**Task agent skills:** karimo-code-standards, karimo-testing-standards, karimo-doc-standards

---

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design and integration |
| [PHASES.md](.karimo/docs/PHASES.md) | Adoption phases explained |
| [COMMANDS.md](.karimo/docs/COMMANDS.md) | Slash command reference |
| [GETTING-STARTED.md](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [SAFEGUARDS.md](.karimo/docs/SAFEGUARDS.md) | Code integrity, security, Greptile |
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-layer learning system |

---

## KARIMO Learnings

_Rules learned from execution feedback. Populated by `/karimo:feedback`._

### Patterns to Follow

_No patterns captured yet._

### Anti-Patterns to Avoid

_No anti-patterns captured yet._
