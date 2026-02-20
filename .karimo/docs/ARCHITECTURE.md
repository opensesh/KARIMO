# KARIMO Architecture

**Version:** 2.0
**Status:** Active

---

## Overview

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight — all through slash commands.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## What KARIMO Is

KARIMO v2 is a **configuration framework**, not a compiled application:

- **Agents**: Markdown files defining specialized agent roles
- **Commands**: Slash command definitions for Claude Code
- **Skills**: Reusable capabilities agents can invoke
- **Templates**: PRD, task, and status schemas
- **Workflows**: GitHub Actions for automation

Everything is installed into your project via `install.sh` — no binaries, no build step.

---

## Installation Architecture

### What Gets Installed

When you run `bash KARIMO/.karimo/install.sh /path/to/project`, these files are copied:

```
Target Project/
├── .claude/
│   ├── agents/
│   │   ├── karimo-interviewer.md    # PRD interview conductor
│   │   ├── karimo-investigator.md   # Codebase pattern scanner
│   │   ├── karimo-reviewer.md       # PRD validation and DAG generation
│   │   ├── karimo-pm.md             # Task coordination (never writes code)
│   │   └── karimo-learn-auditor.md  # Learning investigation agent
│   ├── commands/
│   │   ├── plan.md                  # /karimo:plan
│   │   ├── review.md                # /karimo:review
│   │   ├── execute.md               # /karimo:execute
│   │   ├── status.md                # /karimo:status
│   │   ├── feedback.md              # /karimo:feedback
│   │   └── learn.md                 # /karimo:learn
│   ├── skills/
│   │   ├── git-worktree-ops.md      # Worktree management
│   │   └── github-project-ops.md    # GitHub Projects via gh CLI
│   └── KARIMO_RULES.md              # Agent behavior rules
│
├── .karimo/
│   ├── templates/
│   │   ├── PRD_TEMPLATE.md
│   │   ├── INTERVIEW_PROTOCOL.md
│   │   ├── TASK_SCHEMA.md
│   │   ├── STATUS_SCHEMA.md
│   │   ├── LEARN_INTERVIEW_PROTOCOL.md
│   │   ├── FINDINGS_TEMPLATE.md
│   │   └── TASK_BRIEF_TEMPLATE.md
│   └── prds/                        # Created PRDs stored here
│
├── .github/
│   ├── workflows/
│   │   ├── karimo-review.yml        # Greptile code review
│   │   ├── karimo-integration.yml   # Build/test validation
│   │   └── karimo-sync.yml          # Status sync on merge
│   └── ISSUE_TEMPLATE/
│       └── karimo-task.yml          # Task issue template
│
├── CLAUDE.md                        # Modified with reference block
└── .gitignore                       # Updated with .worktrees/
```

### How CLAUDE.md is Modified

Instead of appending the full `KARIMO_RULES.md` content (~210 lines), `install.sh` uses a **modular reference approach**:

1. **Copies** `KARIMO_RULES.md` to `.claude/KARIMO_RULES.md` (separate file)
2. **Appends** a concise reference block (~20 lines) to `CLAUDE.md`:

```markdown
---

## KARIMO Framework

This project uses KARIMO for autonomous development.

**Commands:**
- `/karimo:plan` — Start PRD interview
- `/karimo:execute` — Run tasks from PRD
- `/karimo:status` — View execution state
- `/karimo:feedback` — Capture learnings

**Rules:** See `.claude/KARIMO_RULES.md` for agent behavior rules

**Learnings:** Captured below via `/karimo:feedback`

## KARIMO Learnings

_Rules learned from execution feedback._

### Patterns to Follow

_No patterns captured yet._

### Anti-Patterns to Avoid

_No anti-patterns captured yet._
```

### Conflict Handling

If the user already has a `## KARIMO Framework` section in their `CLAUDE.md`, `install.sh` skips the append to avoid duplicates.

---

## System Flow

```
┌──────────────┐    ┌───────────────┐    ┌────────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐
│   Interview  │ →  │   PRD + DAG   │ →  │   Approve  │ →  │   Execute   │ →  │   Review   │ →  │   Merge   │
│  (/plan)     │    │  (generated)  │    │  (/review) │    │   (agents)  │    │ (Greptile) │    │   (PR)    │
└──────────────┘    └───────────────┘    └────────────┘    └─────────────┘    └────────────┘    └───────────┘
```

### Interview Phase (`/karimo:plan`)

1. **Intake**: User provides initial context
2. **Investigator**: Scans codebase for patterns
3. **Conversational**: 5-round structured interview
4. **Reviewer**: Validates and generates task DAG

**Output**: `.karimo/prds/{slug}/` containing:
- `PRD.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `dag.json` — Dependency graph
- `status.json` — Execution tracking
- `findings.md` — Cross-task discoveries (populated during execution)
- `task-briefs/` — Generated briefs per task (created during execution)

### Approve Phase (`/karimo:review`)

1. User reviews PRD and task breakdown
2. Approves or excludes specific tasks
3. Brief Writer generates self-contained briefs per task
4. Status updated to `approved`

**Output**: `.karimo/prds/{slug}/briefs/{task_id}.md` for each approved task

### Execution Phase (`/karimo:execute`)

1. PM Agent reads `dag.json` for dependencies
2. Creates worktrees at `.worktrees/{prd-slug}/{task-id}`
3. Spawns agents for ready tasks (respects `max_parallel`)
4. Propagates findings between dependent tasks
5. Creates PRs when tasks complete

### Review Phase (Phase 2)

GitHub Actions automate review when Greptile is configured:

1. **karimo-review.yml**: Triggers Greptile on PR open
2. **karimo-integration.yml**: Runs validation on review pass
3. **karimo-sync.yml**: Updates status on merge

---

## Agent Architecture

### Agent Roles

| Agent | Purpose | Model | Writes Code? |
|-------|---------|-------|--------------|
| **Interviewer** | Conducts PRD interview | Sonnet | No |
| **Investigator** | Scans codebase for patterns | Sonnet | No |
| **Reviewer** | Validates PRD, generates DAG | Opus | No |
| **Brief Writer** | Generates task briefs | Sonnet | No |
| **PM Agent** | Coordinates task execution | Sonnet | No |
| **Learn Auditor** | Investigates learning directives | Sonnet | No |
| **Task Agent** | Executes individual tasks | — | Yes |

The PM Agent coordinates but never writes code. Task agents are spawned by PM to execute work in isolated worktrees.

### Model Routing

KARIMO agents use YAML frontmatter to specify which Claude model to use:

```yaml
---
name: karimo-reviewer
description: Validates completed PRDs...
model: opus
tools: Read, Grep, Glob
---
```

**Model assignments:**
- **Opus**: Deep reasoning tasks (reviewer for PRD validation)
- **Sonnet**: Coordination and generation (interviewer, investigator, brief-writer, pm)
- **Worker agents**: Inherit from parent or use project default

This enables efficient usage — expensive models only where reasoning quality matters.

### Agent Rules

All agents follow rules defined in `.claude/KARIMO_RULES.md`:

- **Boundary enforcement**: `never_touch` files are blocked
- **Review flagging**: `require_review` files are highlighted
- **Finding propagation**: Discoveries shared between tasks
- **Worktree discipline**: Each task in isolated branch

---

## Worktree Architecture

KARIMO uses Git worktrees for task isolation:

```
.worktrees/
└── {prd-slug}/
    ├── {task-1a}/    # feature/{prd-slug}/1a branch
    ├── {task-1b}/    # feature/{prd-slug}/1b branch
    └── {task-2a}/    # feature/{prd-slug}/2a branch
```

### Branch Naming

- **Feature branch**: `feature/{prd-slug}` (base for all tasks)
- **Task branch**: `feature/{prd-slug}/{task-id}` (per-task work)

### Worktree Lifecycle

1. **Create**: When task starts
2. **Work**: Agent executes in isolated directory
3. **PR**: Created from task branch
4. **Cleanup**: Worktree removed after PR creation

---

## GitHub Integration

### GitHub Projects

Tasks sync to GitHub Projects for visibility:
- Issues created for each task
- Labels indicate status (ready, running, blocked, done)
- Milestone tracks PRD completion

### Pull Requests

PRs are created with KARIMO metadata:
- Task ID, complexity, model assignment
- Files affected, caution files flagged
- Validation checklist (build, typecheck)
- Link back to PRD and task definition

---

## Configuration

KARIMO reads optional configuration from `.karimo/config.yaml`:

```yaml
project:
  name: "my-project"

commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"

execution:
  max_parallel: 3

models:
  simple: "sonnet"
  complex: "opus"
  threshold: 5

boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
  require_review:
    - "src/auth/*"
```

See [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) for full documentation.

---

## Learning Architecture

KARIMO uses a two-scope compound learning system:

### Scope 1: Quick Capture (`/karimo:feedback`)

Immediate capture of single observations:
- Developer describes pattern or mistake
- Agent generates actionable rule
- Rule appended to `CLAUDE.md`
- Time: ~2 minutes

### Scope 2: Deep Learning (`/karimo:learn`)

Comprehensive three-mode investigation cycle:

| Mode | Agent | Output |
|------|-------|--------|
| 1. Interview | Opus | `interview.md` with audit directives |
| 2. Audit | karimo-learn-auditor | `findings.md` with evidence |
| 3. Review & Act | Human + Agent | Applied changes to config/docs |

Key features:
- Evidence-based investigation (status.json, PR history, codebase)
- Per-change approval gate
- Continuity across cycles ("Last time you flagged X...")
- Time: ~45 minutes

Learnings are stored in `CLAUDE.md` under `## KARIMO Learnings`, making them available to all future agent invocations.

See [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) for full documentation.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [PHASES.md](PHASES.md) | Adoption phases explained |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [SAFEGUARDS.md](SAFEGUARDS.md) | Worktrees, validation, Greptile |
| [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) | Two-layer learning system |
| [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) | Full configuration guide |
