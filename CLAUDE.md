# KARIMO Configuration Guide

## What is KARIMO?

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Start PRD interview with interactive approval |
| `/karimo-overview` | Cross-PRD oversight dashboard |
| `/karimo-execute --prd {slug}` | Execute tasks from a PRD (brief gen + execution) |
| `/karimo-modify --prd {slug}` | Modify an approved PRD before execution |
| `/karimo-status` | View execution state and progress |
| `/karimo-configure` | Create or update project configuration (~5 min) |
| `/karimo-update` | Check for and apply KARIMO updates from GitHub |
| `/karimo-feedback` | Quick capture of single learnings (~2 min) |
| `/karimo-learn` | Deep learning cycle with investigation (~45 min) |
| `/karimo-doctor` | Check installation health and diagnose issues |
| `/karimo-test` | Verify installation works end-to-end |

---

## Adoption Phases

KARIMO uses three optional adoption phases:

### Phase 1: Execute PRD
Your first planning process with KARIMO:
- Run `/karimo-plan` to create PRD through agent interviews
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

## Execution Mode

KARIMO offers two execution modes to accommodate different team needs:

### Full Mode (Recommended)

Full GitHub integration with issues, PRs, and Projects.

**Requirements:**
- GitHub MCP server configured in Claude Code
- gh CLI authenticated with `project` scope

**Benefits:**
- Complete traceability (task → issue → PR → merge)
- GitHub Projects visualization
- PR-based code review workflow
- Greptile integration for automated review
- Multi-feature management

### Fast Track Mode

Commit-only workflow without GitHub integration.

**Requirements:**
- git repository initialized
- No GitHub configuration needed

**Workflow:**
- Tasks become structured commits to main
- Commit format: `[{prd-slug}][{task-id}] {task-name}: {description}`
- No issues, PRs, or Projects

**Best for:** Small teams, rapid prototyping, solo developers

> **Note:** Fast Track trades traceability for speed. Use Full Mode for production projects where auditability matters.

---

## Configuration

KARIMO configuration lives in `.karimo/config.yaml`. On first `/karimo-plan` or `/karimo-configure`, the investigator agent auto-detects project context and populates the config file.

Key settings:
- **Mode** — `full` or `fast-track` execution mode
- **Project** — Runtime, framework, package manager
- **Commands** — Build, lint, test, typecheck commands
- **Boundaries** — Files agents must not touch (`never_touch`) or must flag for review (`require_review`)
- **GitHub** — Owner, repository, merge strategy (Full Mode only)
- **Learnings** — Patterns and anti-patterns stored in `.karimo/learnings.md`

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
| `.claude/agents/` | 13 agent definitions (7 coordination + 6 task agents) |
| `.claude/commands/` | 11 slash commands (plan, overview, execute, modify, status, configure, update, feedback, learn, doctor, test) |
| `.claude/skills/` | 6 skills (3 coordination + 3 task agent skills) |
| `.claude/KARIMO_RULES.md` | Agent behavior rules |
| `.karimo/templates/` | 9 templates (PRD, interview, task, status, dependencies, DAG, learn-interview, findings, task-brief) |
| `.github/workflows/` | 1 required (karimo-ci.yml) + optional workflows via `/karimo-configure` |

### Agent Types

**Coordination agents:** interviewer, investigator, reviewer, brief-writer, pm, review-architect, learn-auditor

**Task agents:** implementer, tester, documenter

### Skills

All skills use the `karimo-*` prefix for reliable update management and clear distinction from user-added files.

**Coordination skills:** karimo-git-worktree-ops, karimo-github-project-ops, karimo-bash-utilities

**Task agent skills:** karimo-code-standards, karimo-testing-standards, karimo-doc-standards

---

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design and integration |
| [COMMANDS.md](.karimo/docs/COMMANDS.md) | Slash command reference |
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-scope learning system |
| [DASHBOARD.md](.karimo/docs/DASHBOARD.md) | Dashboard spec (Phase 3) |
| [GETTING-STARTED.md](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [PHASES.md](.karimo/docs/PHASES.md) | Adoption phases explained |
| [SAFEGUARDS.md](.karimo/docs/SAFEGUARDS.md) | Code integrity, security, Greptile |

---

## Learnings

Project-specific learnings are stored in `.karimo/learnings.md` and populated via `/karimo-feedback` or `/karimo-learn`. This keeps CLAUDE.md minimal while providing agents with accumulated knowledge._
