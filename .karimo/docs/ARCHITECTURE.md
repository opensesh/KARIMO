# KARIMO Architecture

**Version:** 2.1
**Status:** Active

---

## Overview

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight — all through slash commands.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

### Design Principles

**Single-PRD scope.** KARIMO operates within one PRD at a time. Each PRD maps to one feature branch. Cross-feature dependencies are the human architect's responsibility — you sequence PRDs so that dependent features execute only after their prerequisites are merged to main. This is intentional: the goal isn't to produce a hundred features simultaneously, it's to let agents autonomously execute a few features at a time while building trust between you, the codebase, and the agents.

**Sequential feature execution.** If Feature 8 depends on Feature 3, you finish Feature 3's PRD cycle (plan → execute → review → merge to main) before starting Feature 8. You may run Features 1, 2, and 3 in parallel if they're independent, but Feature 8 waits. This matches how product teams actually ship.

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
│   │   ├── karimo-brief-writer.md   # Task brief generator
│   │   ├── karimo-pm.md             # Task coordination (never writes code)
│   │   ├── karimo-review-architect.md # Code-level integration
│   │   ├── karimo-learn-auditor.md  # Learning investigation agent
│   │   ├── karimo-implementer.md    # Task agent: coding tasks
│   │   ├── karimo-tester.md         # Task agent: test writing
│   │   └── karimo-documenter.md     # Task agent: documentation
│   ├── commands/
│   │   ├── plan.md                  # /karimo:plan
│   │   ├── review.md                # /karimo:review
│   │   ├── execute.md               # /karimo:execute
│   │   ├── status.md                # /karimo:status
│   │   ├── feedback.md              # /karimo:feedback
│   │   └── learn.md                 # /karimo:learn
│   ├── skills/
│   │   ├── git-worktree-ops.md      # Worktree management
│   │   ├── github-project-ops.md    # GitHub Projects via gh CLI
│   │   ├── karimo-code-standards.md     # Task agent skill
│   │   ├── karimo-testing-standards.md  # Task agent skill
│   │   └── karimo-doc-standards.md      # Task agent skill
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
│   │   ├── karimo-sync.yml              # Tier 1: Status sync on merge
│   │   ├── karimo-dependency-watch.yml  # Tier 1: Runtime dependency alerts
│   │   ├── karimo-ci-integration.yml    # Tier 2: Observes external CI (opt-in)
│   │   └── karimo-greptile-review.yml   # Tier 3: Greptile review (opt-in)
│   └── ISSUE_TEMPLATE/
│       └── karimo-task.yml              # Task issue template
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
┌──────────────┐    ┌───────────────┐    ┌────────────┐    ┌─────────────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐
│   Interview  │ →  │   PRD + DAG   │ →  │   Approve  │ →  │   Execute   │ →  │   Review   │ →  │ Reconcile   │ →  │   Merge   │
│  (/plan)     │    │  (generated)  │    │  (/review) │    │   (agents)  │    │ (Greptile) │    │ (Architect) │    │   (PR)    │
└──────────────┘    └───────────────┘    └────────────┘    └─────────────┘    └────────────┘    └─────────────┘    └───────────┘
```

### Two-Tier Merge Model

KARIMO uses a two-tier merge strategy:

```
Task PRs (automated)              Feature PR (human gate)
─────────────────────             ──────────────────────

task-branch-1a ─┐
                ├──► feature/{prd-slug} ──► main
task-branch-1b ─┘         ▲                  ▲
                          │                  │
              Review/Architect          Human Review
              validates integration     final approval
```

**Tier 1: Task → Feature Branch (Automated)**
- Task agents create PRs targeting `feature/{prd-slug}`
- Greptile reviews each task PR
- Review/Architect validates integration
- PRs merge automatically after validation passes

**Tier 2: Feature → Main (Human Gate)**
- Review/Architect prepares feature PR to `main`
- Full reconciliation checklist completed
- Human reviews and approves final merge
- This is the single human approval gate per feature

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

### Human Oversight (`/karimo:review`)

After execution completes (or during long runs), use `/karimo:review` to surface:
- Tasks blocked by Greptile review failures (needs human intervention)
- Tasks in active revision loops
- Tasks with merge conflicts (needs human rebase)
- Recently completed and merged tasks

This is the primary human oversight touchpoint — check it each morning or after a run completes.

---

## Agent Architecture

### Agent Roles

#### Coordination Agents

| Agent | Purpose | Model | Writes Code? |
|-------|---------|-------|--------------|
| **Interviewer** | Conducts PRD interview | Sonnet | No |
| **Investigator** | Scans codebase for patterns | Sonnet | No |
| **Reviewer** | Validates PRD, generates DAG | Opus | No |
| **Brief Writer** | Generates task briefs | Sonnet | No |
| **PM Agent** | Coordinates task execution | Sonnet | No |
| **Review/Architect** | Code-level integration and merge quality | Sonnet | Conflict resolution only |
| **Learn Auditor** | Investigates learning directives | Sonnet | No |

#### Task Agents

| Agent | Purpose | Model | Writes Code? |
|-------|---------|-------|--------------|
| **Implementer** | Executes coding tasks | Sonnet/Opus | Yes |
| **Tester** | Writes and maintains tests | Sonnet | Yes |
| **Documenter** | Creates and updates documentation | Sonnet | Yes (docs) |

The PM Agent coordinates but never writes code. Task agents are spawned by PM to execute work in isolated worktrees.

**Task Agent Selection:**
- PM analyzes task type from title/description
- Implementation tasks → `@karimo-implementer`
- Test-only tasks → `@karimo-tester`
- Documentation-only tasks → `@karimo-documenter`
- Mixed tasks → `@karimo-implementer` (handles inline)

The Review/Architect Agent handles code-level integration:
- Validates task PRs integrate cleanly with feature branch
- Resolves merge conflicts between parallel task branches
- Performs feature-level reconciliation before PR to main
- Only writes code for conflict resolution (not feature code)

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

KARIMO uses Git worktrees for task isolation. Each task gets complete disk isolation, enabling true parallel execution.

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

### Worktree Lifecycle (v2.1)

1. **Create**: When task starts
2. **Work**: Agent executes in isolated directory
3. **PR**: Created from task branch
4. **Persist**: Worktree retained through review cycles
5. **Cleanup**: Worktree removed after PR **merged** (not just created)

**Why persist until merge?** Tasks may need revision based on Greptile feedback or integration issues. Keeping the worktree avoids recreation overhead and preserves build caches.

### TTL & Garbage Collection

Worktrees should not persist indefinitely. The PM Agent enforces:

| Scenario | TTL | Action |
|----------|-----|--------|
| PR merged | Immediate | Remove worktree |
| PR closed (abandoned) | 24 hours | Remove worktree |
| Stale worktree (no commits) | 7 days | Remove worktree |
| Execution paused | 30 days | Remove worktree |

**Safe teardown sequence:**
```bash
# Remove worktree
git worktree remove .worktrees/{prd-slug}/{task-id}

# Prune stale references
git worktree prune

# Remove artifacts (if worktree was force-removed)
rm -rf .worktrees/{prd-slug}/{task-id}
```

### Artifact Hygiene

Build artifacts should be cleaned before PR creation to avoid bloating diffs:

```bash
# Common artifacts to clean (project-specific)
rm -rf .worktrees/{prd-slug}/{task-id}/.next
rm -rf .worktrees/{prd-slug}/{task-id}/dist
rm -rf .worktrees/{prd-slug}/{task-id}/node_modules/.cache
```

**Note:** The main `node_modules` should NOT be deleted if using shared dependency stores (see below).

### Shared Dependency Store (Recommended)

For large projects, use a shared dependency store to avoid reinstalling per worktree:

| Package Manager | Configuration |
|-----------------|---------------|
| **pnpm** | `pnpm-workspace.yaml` with shared store |
| **yarn** | Yarn PnP or `node_modules/.cache` sharing |
| **npm** | Symlinked `node_modules` (manual) |

This is a **project-level decision** — KARIMO doesn't mandate a specific package manager.

### Resource Estimation

| Concurrent Tasks | Est. Disk (typical) | Est. Disk (large monorepo) |
|------------------|---------------------|---------------------------|
| 3 | ~500MB | ~2GB |
| 5 | ~800MB | ~3.5GB |
| 10 | ~1.5GB | ~7GB |

Estimates assume shared dependency store. Without sharing, multiply by 3-5x.

---

## GitHub Integration

### Three-Tier Workflow System

KARIMO uses a portable three-tier workflow architecture. The key principle: **KARIMO never runs your build commands** — workflows observe external CI instead of executing their own build/lint/test.

| Tier | Workflow | Install | Purpose |
|------|----------|---------|---------|
| 1 | `karimo-sync.yml` | Always | Status sync on PR merge |
| 1 | `karimo-dependency-watch.yml` | Always | Runtime dependency alerts |
| 2 | `karimo-ci-integration.yml` | Opt-in (default Y) | Observes external CI, labels PRs |
| 3 | `karimo-greptile-review.yml` | Opt-in (default N) | Greptile code review |

### Label System

| Label | Applied By | Meaning |
|-------|-----------|---------|
| `ci-passed` | CI Integration | All external CI checks passed |
| `ci-failed` | CI Integration | One or more CI checks failed |
| `ci-skipped` | CI Integration | No external CI detected |
| `greptile-passed` | Greptile Review | Score >= 3 |
| `greptile-needs-revision` | Greptile Review | Score < 3 |
| `greptile-skipped` | Greptile Review | No API key configured |

### CI Detection (Hybrid Approach)

The CI Integration workflow uses two APIs to detect external CI:

1. **Check Runs API** (`github.rest.checks.listForRef`) — GitHub Actions, modern CI, GitHub Apps
2. **Combined Status API** (`github.rest.repos.getCombinedStatusForRef`) — Legacy external CI (Jenkins, Travis)

This hybrid approach covers ~95% of CI setups without external dependencies.

**Key details:**
- Initial 5-second wait (checks register async)
- 15-second polling interval
- 30-minute timeout
- Self-exclusion via regex: `/^KARIMO/i`, `/karimo-/i`
- Never blocks pipeline — timeout applies `ci-failed` label

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

KARIMO configuration lives in `CLAUDE.md`. On first `/karimo:plan`, the investigator agent auto-detects your project and populates these sections:

### Project Context

| Setting | Value |
|---------|-------|
| Runtime | node |
| Framework | next.js |
| Package Manager | pnpm |

### Commands

| Type | Command |
|------|---------|
| Build | `pnpm run build` |
| Lint | `pnpm run lint` |
| Test | `pnpm test` |
| Typecheck | `pnpm run typecheck` |

### Boundaries

**Never Touch:**
- `*.lock`
- `.env*`
- `migrations/`

**Require Review:**
- `src/auth/*`
- `*.config.js`

### Hardcoded Defaults

Some values are not configurable:
- **max_parallel:** 3 (concurrent tasks)
- **model threshold:** 5 (complexity < 5 → sonnet, >= 5 → opus)

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
| [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) | Two-scope learning system |
