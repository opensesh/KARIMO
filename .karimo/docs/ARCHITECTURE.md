# KARIMO Architecture

**Version:** 3.5.0
**Status:** Active

---

## Overview

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight — all through slash commands.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

### Design Principles

**Single-PRD scope.** KARIMO operates within one PRD at a time. Each PRD maps to one feature branch. Cross-feature dependencies are the human architect's responsibility — you sequence PRDs so that dependent features execute only after their prerequisites are merged to main. This is intentional: the goal isn't to produce a hundred features simultaneously, it's to let agents autonomously execute a few features at a time while building trust between you, the codebase, and the agents.

**Sequential feature execution.** If Feature 8 depends on Feature 3, you finish Feature 3's PRD cycle (plan → execute → review → merge to main) before starting Feature 8. You may run Features 1, 2, and 3 in parallel if they're independent, but Feature 8 waits. This matches how product teams actually ship.

---

## Manifest System

KARIMO uses `.karimo/MANIFEST.json` as the single source of truth for installed files. This enables:

- **Consistent installation**: `install.sh` reads from manifest, not hardcoded lists
- **Version tracking**: Manifest includes version number for update detection
- **Clean updates**: Update script uses manifest to detect and remove stale files
- **Easy maintenance**: Adding new files requires only updating MANIFEST.json

### Manifest Structure

```json
{
  "version": "3.5.3",
  "agents": ["karimo-brief-writer.md", "karimo-documenter.md", ...],
  "commands": ["karimo-configure.md", "karimo-doctor.md", ...],
  "skills": ["karimo-git-worktree-ops.md", ...],
  "templates": ["PRD_TEMPLATE.md", ...],
  "other": {
    "rules": "KARIMO_RULES.md",
    "issue_template": "karimo-task.yml"
  }
}
```

> **Note:** KARIMO installs zero workflows by default. Greptile integration is available via `/karimo-configure --greptile`.

---

## What KARIMO Is

KARIMO is a **configuration framework**, not a compiled application:

- **Agents**: Markdown files defining specialized agent roles
- **Commands**: Slash command definitions for Claude Code
- **Skills**: Reusable capabilities agents can invoke
- **Templates**: PRD, task, and status schemas
- **Manifest**: JSON file tracking all components

Everything is installed into your project via `install.sh` — no binaries, no build step, no workflows by default.

---

## Installation Architecture

### What Gets Installed

When you run `bash KARIMO/.karimo/install.sh /path/to/project`, files are copied based on `.karimo/MANIFEST.json`:

```
Target Project/
├── .claude/
│   ├── agents/                      # 13 agents from manifest
│   │   ├── karimo-interviewer.md    # PRD interview conductor
│   │   ├── karimo-investigator.md   # Codebase pattern scanner
│   │   ├── karimo-reviewer.md       # PRD validation and DAG generation
│   │   ├── karimo-brief-writer.md   # Task brief generator
│   │   ├── karimo-pm.md             # Task coordination (never writes code)
│   │   ├── karimo-review-architect.md # Code-level integration
│   │   ├── karimo-learn-auditor.md  # Learning investigation agent
│   │   ├── karimo-implementer.md    # Task agent: coding (Sonnet)
│   │   ├── karimo-implementer-opus.md # Task agent: coding (Opus)
│   │   ├── karimo-tester.md         # Task agent: tests (Sonnet)
│   │   ├── karimo-tester-opus.md    # Task agent: tests (Opus)
│   │   ├── karimo-documenter.md     # Task agent: docs (Sonnet)
│   │   └── karimo-documenter-opus.md # Task agent: docs (Opus)
│   ├── commands/                    # 11 commands from manifest
│   │   ├── plan.md                  # /karimo-plan (with interactive review)
│   │   ├── overview.md              # /karimo-overview (cross-PRD oversight)
│   │   ├── execute.md               # /karimo-execute (brief gen + execution)
│   │   ├── modify.md                # /karimo-modify (modify PRD before execution)
│   │   ├── status.md                # /karimo-status
│   │   ├── configure.md             # /karimo-configure
│   │   ├── update.md                # /karimo-update
│   │   ├── feedback.md              # /karimo-feedback
│   │   ├── learn.md                 # /karimo-learn
│   │   ├── doctor.md                # /karimo-doctor
│   │   └── test.md                  # /karimo-test
│   ├── skills/                      # 5 skills from manifest
│   │   ├── karimo-git-worktree-ops.md      # Worktree management
│   │   ├── karimo-github-project-ops.md    # GitHub Projects via gh CLI
│   │   ├── karimo-code-standards.md     # Task agent skill
│   │   ├── karimo-testing-standards.md  # Task agent skill
│   │   └── karimo-doc-standards.md      # Task agent skill
│   └── KARIMO_RULES.md              # Agent behavior rules
│
├── .karimo/
│   ├── MANIFEST.json                # Single source of truth
│   ├── VERSION                      # Version tracking
│   ├── templates/                   # 9 templates from manifest
│   │   ├── PRD_TEMPLATE.md
│   │   ├── INTERVIEW_PROTOCOL.md
│   │   ├── TASK_SCHEMA.md
│   │   ├── STATUS_SCHEMA.md
│   │   ├── DEPENDENCIES_TEMPLATE.md
│   │   ├── EXECUTION_PLAN_SCHEMA.md
│   │   ├── LEARN_INTERVIEW_PROTOCOL.md
│   │   ├── FINDINGS_TEMPLATE.md
│   │   └── TASK_BRIEF_TEMPLATE.md
│   └── prds/                        # Created PRDs stored here
│
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── karimo-task.yml              # Task issue template
│
├── CLAUDE.md                        # Modified with minimal reference block (~8 lines)
└── .gitignore                       # Updated with .worktrees/
```

**CI Mode:** For non-interactive installation (CI/CD pipelines), use the `--ci` flag:
```bash
bash KARIMO/.karimo/install.sh --ci /path/to/project
```

### How CLAUDE.md is Modified

KARIMO follows Anthropic's best practice of keeping CLAUDE.md minimal. `install.sh` uses a **modular approach**:

1. **Copies** `KARIMO_RULES.md` to `.claude/KARIMO_RULES.md` (agent behavior rules)
2. **Creates** `.karimo/config.yaml` (project configuration — filled by `/karimo-configure`)
3. **Creates** `.karimo/learnings.md` (compound learnings — filled by `/karimo-feedback`)
4. **Appends** a minimal reference block (~8 lines) to `CLAUDE.md`:

```markdown
---

## KARIMO

This project uses [KARIMO](https://github.com/opensesh/KARIMO) for PRD-driven autonomous development.

- **Agent rules:** `.claude/KARIMO_RULES.md`
- **Config & PRDs:** `.karimo/`
- **Learnings:** `.karimo/learnings.md`
- **All commands prefixed** `karimo:` — type `/karimo-` to see available commands
```

### Conflict Handling

If the user already has a `## KARIMO` section in their `CLAUDE.md`, `install.sh` skips the append to avoid duplicates.

---

## System Flow

```
┌─────────────────────────────────────────┐    ┌─────────────────────────────────────────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐
│            /karimo-plan                 │    │           /karimo-execute               │    │   Review   │    │ Reconcile   │    │   Merge   │
│  Interview → PRD → Review → Approve     │ →  │  Brief Gen → Agent Execution → PRs     │ →  │ (Greptile) │ →  │ (Architect) │ →  │   (PR)    │
└─────────────────────────────────────────┘    └─────────────────────────────────────────┘    └────────────┘    └─────────────┘    └───────────┘
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

### Interview Phase (`/karimo-plan`)

1. **Intake**: User provides initial context
2. **Investigator**: Scans codebase for patterns
3. **Conversational**: 5-round structured interview
4. **Reviewer**: Validates and generates task DAG
5. **Interactive Review**: User approves, modifies, or saves as draft

**Output**: `.karimo/prds/{slug}/` containing:
- `PRD.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `execution_plan.yaml` — Wave-based execution plan
- `status.json` — Execution tracking (status: `ready` when approved)
- `findings.md` — Cross-task discoveries (populated during execution)

### Execution Phase (`/karimo-execute`)

**Phase 1: Brief Generation**
1. Brief Writer generates self-contained briefs per task
2. User reviews briefs, can adjust or exclude tasks
3. Briefs saved to `.karimo/prds/{slug}/briefs/`

**Phase 2: Task Execution**

1. PM Agent reads `execution_plan.yaml` for wave-based scheduling
2. PM Agent reads pre-generated briefs from `.karimo/prds/{slug}/briefs/`
3. Creates worktrees at `.worktrees/{prd-slug}/{task-id}`
4. Spawns agents for ready tasks (respects `max_parallel`)
5. Propagates findings between dependent tasks
6. Creates PRs when tasks complete

**Output**: `.karimo/prds/{slug}/briefs/{task_id}.md` for each approved task

### Review Phase (Phase 2)

When automated review is enabled via `/karimo-configure --review`:

**Option A: Greptile** (`/karimo-configure --greptile`)
- `karimo-greptile-review.yml` triggers Greptile review on PR open
- Greptile scores PRs (0-5 scale)
- Score < 3 triggers agent revision loop

**Option B: Claude Code Review** (`/karimo-configure --code-review`)
- Code Review activates automatically on PR
- Posts inline comments with severity markers (🔴 🟡 🟣)
- 🔴 findings trigger agent revision loop

### Human Oversight (`/karimo-overview`)

After execution completes (or during long runs), use `/karimo-overview` to surface:
- Tasks blocked by Greptile review failures (needs human intervention)
- Tasks in active revision loops
- Tasks with merge conflicts (needs human rebase)
- Recently completed and merged tasks
- Cross-PRD dependency graph (with `--deps` flag)

The `--deps` flag displays:
- `cross_feature_blockers` from all PRDs
- Runtime discoveries from `dependencies.md`
- Dependency graph with blocking relationships
- Recommended execution order

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

KARIMO uses a dual-model system for task agents. Each agent type has a Sonnet variant (complexity 1-4) and an Opus variant (complexity 5+):

| Agent | Complexity | Purpose | Model | Writes Code? |
|-------|------------|---------|-------|--------------|
| **Implementer** | 1-4 | Standard coding tasks | Sonnet | Yes |
| **Implementer (Opus)** | 5+ | Complex coding tasks | Opus | Yes |
| **Tester** | 1-4 | Standard test writing | Sonnet | Yes |
| **Tester (Opus)** | 5+ | Complex test suites | Opus | Yes |
| **Documenter** | 1-4 | Standard documentation | Sonnet | Yes (docs) |
| **Documenter (Opus)** | 5+ | Complex documentation | Opus | Yes (docs) |

The PM Agent coordinates but never writes code. Task agents are spawned by PM to execute work in isolated worktrees.

**Task Agent Selection:**
- PM analyzes task type from title/description and complexity from task definition
- Implementation tasks → `karimo-implementer` (or `karimo-implementer-opus` for complexity 5+)
- Test-only tasks → `karimo-tester` (or `karimo-tester-opus` for complexity 5+)
- Documentation-only tasks → `karimo-documenter` (or `karimo-documenter-opus` for complexity 5+)
- Mixed tasks → `karimo-implementer` (handles inline)

**Model Assignment:**
| Complexity | Model | Rationale |
|------------|-------|-----------|
| 1-4 | Sonnet | Efficient for straightforward tasks |
| 5+ | Opus | Complex reasoning, multi-file coordination |

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

### Workflows

KARIMO installs zero workflows by default. Your existing CI (GitHub Actions, CircleCI, Jenkins, etc.) handles builds — KARIMO focuses on orchestration.

**Optional Greptile integration:**
```
/karimo-configure --greptile
```

This installs `karimo-greptile-review.yml` for automated code review. Requires `GREPTILE_API_KEY` secret.

See [PHASES.md](PHASES.md) for adoption guidance.

### Label System

| Label | Applied By | Meaning |
|-------|-----------|---------|
| `greptile-passed` | Greptile Review | Score >= 3 |
| `greptile-needs-revision` | Greptile Review | Score < 3 |
| `greptile-skipped` | Greptile Review | No API key configured |
| `karimo/task` | PM Agent | Marks PR as KARIMO task |
| `karimo/wave-N` | PM Agent | Indicates task's execution wave |
| `karimo/complexity-N` | PM Agent | Task complexity rating (1-5) |

### GitHub Projects

Tasks sync to GitHub Projects for visibility:
- Feature issue created as parent with task issues linked as sub-issues
- Custom fields: `complexity`, `wave`, `agent_status`, `pr_number`, `model`
- Wave field enables filtering tasks by execution wave

**Real-Time Status Updates**

The PM Agent updates the `agent_status` field in real-time as tasks progress through execution:

| Status | When Set | Meaning |
|--------|----------|---------|
| `queued` | Task added to project | Ready to start, waiting for dependencies |
| `running` | Worker agent spawned | Agent actively working on task |
| `in-review` | PR created | Awaiting code review |
| `needs-revision` | Greptile score < 3 | Revision loop active |
| `needs-human-review` | 3 failed attempts | Hard gate, human intervention required |
| `done` | PR merged | Task complete (set by `karimo-sync.yml`) |

This ensures the Kanban board reflects actual execution state, not just post-merge updates. The `update_project_status` helper in `karimo-pm.md` handles all status transitions.

### Pull Requests

PRs are created with KARIMO metadata:
- Task ID, complexity, model assignment
- Files affected, caution files flagged
- Validation checklist (build, typecheck)
- Link back to PRD and task definition

---

## Configuration

KARIMO configuration lives in `.karimo/config.yaml`. Run `/karimo-configure` to auto-detect your project and populate this file:

```yaml
# Example .karimo/config.yaml
project:
  name: my-project
  runtime: node
  framework: next.js
  package_manager: pnpm

commands:
  build: pnpm run build
  lint: pnpm run lint
  test: pnpm test
  typecheck: pnpm run typecheck

boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
  require_review:
    - "src/auth/*"
    - "*.config.js"

github:
  owner_type: organization
  owner: myorg
  repository: my-project

execution:
  default_model: sonnet
  max_parallel: 3
  pre_pr_checks:
    - build
    - typecheck
    - lint

cost:
  escalate_after_failures: 1
  max_attempts: 3

# Review provider: none | greptile | code-review
review_provider: none
```

### Hardcoded Defaults

Some values are not configurable:
- **model threshold:** 5 (complexity < 5 → sonnet, >= 5 → opus)

---

## Metrics & Telemetry

KARIMO generates execution metrics for analysis and learning automation.

### metrics.json

At PRD completion, a `metrics.json` file is generated in the PRD folder containing:

```json
{
  "prd_slug": "user-profiles",
  "completed_at": "2026-02-27T15:30:00Z",
  "duration": {
    "total_minutes": 45,
    "waves": { "1": 12, "2": 18, "3": 15 }
  },
  "loop_counts": {
    "total": 8,
    "by_task": { "1a": 1, "1b": 3, "2a": 4 },
    "high_loop_tasks": ["2a"]
  },
  "model_usage": {
    "sonnet_tasks": 4,
    "opus_tasks": 2,
    "escalations": 1
  },
  "greptile_scores": {
    "1a": [4], "1b": [2, 3, 4], "2a": [2, 2, 3]
  },
  "learning_candidates": [
    { "task_id": "2a", "reason": "high_loop_count", "context": "..." },
    { "task_id": "1b", "reason": "model_escalation", "context": "..." }
  ]
}
```

### Learning Candidates

The PM Agent automatically identifies tasks that warrant learning capture:
- **High loop count** — Tasks requiring 3+ revision attempts
- **Model escalation** — Tasks that required Sonnet → Opus upgrade
- **Low Greptile scores** — Tasks with initial score < 2

Use `/karimo-feedback --from-metrics` to batch-process these candidates.

**Reference:** `.karimo/templates/METRICS_SCHEMA.md`

---

## Error Recovery

KARIMO provides structured error recovery at task and feature levels.

### Task-Level Rollback

When a task fails validation after 3 loops:

1. **Pre-commit SHA recorded** — `rollback_sha` captured before worker spawn
2. **Validation failure** — Build/typecheck fails after 3 attempts
3. **Auto-rollback** — Task branch reset to `rollback_sha`
4. **Status update** — Task marked `rolled_back` with reason

The `safe_commit()` function in `karimo-git-worktree-ops` handles this:
```bash
# Record pre-commit SHA → Commit → Validate → Revert if fails
```

### Feature-Level Rollback

When integration fails after all tasks complete:

1. **Integration check fails** — Feature branch doesn't build/test
2. **Identify culprit** — Last merged task PR
3. **Revert merge** — Create revert commit on feature branch
4. **Re-queue task** — Task status reset to `ready`

### Decision Tree

```
Task Failure
    │
    ▼
Retry (same model)
    │
    ├── Pass → Continue
    │
    └── Fail → Escalate (Sonnet → Opus)
                  │
                  ├── Pass → Continue
                  │
                  └── Fail (3x) → Rollback
                                    │
                                    └── Human review required
```

### Status Tracking

Rollback events are tracked in `status.json`:
- Task-level: `rollback_sha`, `rolled_back`, `rolled_back_at`, `rollback_reason`
- Feature-level: `rollback_event` object

**Reference:** `.karimo/templates/STATUS_SCHEMA.md`

---

## Learning Architecture

KARIMO uses a two-scope compound learning system:

### Scope 1: Quick Capture (`/karimo-feedback`)

Immediate capture of single observations:
- Developer describes pattern or mistake
- Agent generates actionable rule
- Rule appended to `.karimo/learnings.md`
- Time: ~2 minutes

### Scope 2: Deep Learning (`/karimo-learn`)

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

Learnings are stored in `.karimo/learnings.md`, making them available to all future agent invocations.

See [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) for full documentation.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [PHASES.md](PHASES.md) | Adoption phases explained |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [SAFEGUARDS.md](SAFEGUARDS.md) | Worktrees, validation, Greptile |
| [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) | Two-scope learning system |
