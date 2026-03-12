# KARIMO Slash Commands

Reference for all KARIMO slash commands available in Claude Code.

---

## Command Summary

### Core Workflow (Recommended)

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Start PRD interview with interactive approval |
| `/karimo-research [--prd {slug}]` | Conduct research (general or PRD-scoped) |
| `/karimo-run --prd {slug}` | Execute tasks (feature branch workflow, **recommended**) |
| `/karimo-merge --prd {slug}` | Create final PR to main after execution |
| `/karimo-modify --prd {slug}` | **[DEPRECATED]** Modify approved PRD (use direct editing) |
| `/karimo-status [--prd {slug}]` | Monitor progress (no arg = all PRDs, with arg = details) |
| `/karimo-feedback` | Intelligent feedback capture with auto-detection (simple or complex) |

### Setup & Maintenance

| Command | Purpose |
|---------|---------|
| `/karimo-configure` | Create or update project configuration |
| `/karimo-doctor` | Check installation health |
| `/karimo-test` | Installation smoke test |
| `/karimo-update` | Check for and apply KARIMO updates |

### Advanced

| Command | Purpose |
|---------|---------|
| `/karimo-dashboard` | Comprehensive CLI dashboard for KARIMO monitoring |

---

## /karimo-plan

Start a structured PRD interview to define a new feature, with interactive approval.

### Usage

```
/karimo-plan
```

### What It Does

1. **Intake** — Receives your initial description
2. **Investigation** — Scans codebase for patterns
3. **Conversation** — 5-round structured interview
4. **Review** — Validates and generates task DAG
5. **Interactive Approval** — Approve, modify, or save as draft

### Interview Rounds

| Round | Focus | Questions |
|-------|-------|-----------|
| 1 | Vision | What are you building? Why now? |
| 2 | Scope | What's in/out of scope? |
| 3 | Investigation | Agent scans codebase |
| 4 | Tasks | Break into executable units |
| 5 | Review | Validate and finalize |
| 6 | Approve | Confirm PRD is ready for execution |

### Approval Options

After the review round, you'll see a summary with options:
- **Approve** — Marks PRD as `ready` for execution
- **Modify** — Make changes and re-run the reviewer
- **Save as draft** — Come back later with `/karimo-plan --resume {slug}`

### Output

Creates `.karimo/prds/{slug}/`:
- `prd.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `execution_plan.yaml` — Wave-based execution plan
- `status.json` — Execution tracking

### Example

```
/karimo-plan

> I want to add user profile pages where users can edit their
> name, avatar, and notification preferences.
```

---

## /karimo-research

**NEW in v5.6:** Conduct research to enhance PRD quality and reduce execution errors.

### Usage

```bash
# General research (not tied to PRD)
/karimo-research "topic to research"

# PRD-scoped research (after PRD creation)
/karimo-research --prd {slug}

# Refine research based on annotations
/karimo-research --refine --prd {slug}

# Research with constraints
/karimo-research --prd {slug} --internal-only    # Skip external research
/karimo-research --prd {slug} --external-only    # Skip codebase research
```

### What It Does

**General Research Mode:**
1. Interactive questions about research focus
2. Internal codebase research (if relevant)
3. External web search and documentation
4. Saves to `.karimo/research/{topic}-{NNN}.md`
5. Updates research catalog in `.karimo/research/index.yaml`
6. Available for import into future PRDs

**PRD-Scoped Research Mode:**
1. Loads PRD context
2. Offers to import existing general research
3. Interactive questions about PRD research focus
4. Internal research (patterns, errors, dependencies)
5. External research (best practices, libraries)
6. Enhances PRD with `## Research Findings` section
7. Saves evidence to `.karimo/prds/{slug}/research/`
8. Commits enhanced PRD

### Research Focus Areas

When conducting PRD-scoped research, you can select:
- ☑ Existing patterns in codebase
- ☑ External best practices
- ☑ Library recommendations
- ☑ Error/gap identification
- ☑ Dependencies and integration points
- ☐ Performance considerations
- ☐ Security considerations

### Research Output

**PRD Enhanced with Findings:**
```markdown
## Research Findings

**Last Updated:** 2026-03-11T14:30:00Z
**Research Status:** Approved

### Implementation Context

**Existing Patterns (Internal):**
- Pattern name: Description (file:line)

**Best Practices (External):**
- Practice: Description with source

**Recommended Libraries:**
- Library (npm-package)
  - Purpose, version, why recommended

**Critical Issues:**
- ⚠️ Issue: Impact and fix

**Architectural Decisions:**
- Decision: Context, choice, rationale

### Task-Specific Notes

**Task 1a: Title**
- Patterns to follow
- Issues to address
- Implementation guidance
- Dependencies
```

### Refinement Workflow

Add inline annotations to research artifacts:

```html
<!-- ANNOTATION
type: question
text: "Should this pattern apply to API routes too?"
-->
```

Then refine:
```bash
/karimo-research --refine --prd {slug}
```

Agent processes annotations and updates PRD.

### Integration with Workflow

**During /karimo-plan:**
After PRD approval, you're prompted:
```
Import existing research? [list of .karimo/research/*.md]
Run research on this PRD? [Y/n] (recommended)
```

**During /karimo-run:**
If no research exists, you're prompted:
```
⚠️ No research found for this PRD.

Options:
  1. Run research now (recommended)
  2. Continue without research

Choice [1/2]:
```

Skip with `--skip-research` flag if needed.

### Benefits

- **Improved Brief Quality:** Reduces validation failures 40% → <20%
- **Pattern Discovery:** Find existing implementations agents should follow
- **Gap Identification:** Detect missing components before execution
- **Library Recommendations:** Concrete, evaluated tool suggestions
- **Knowledge Accumulation:** Build reusable pattern library

### Examples

```bash
# Explore authentication patterns (general)
/karimo-research "React authentication patterns"

# Research for specific PRD (recommended workflow)
/karimo-plan
# ... PRD approved ...
# ... Prompted for research, accept ...
# Research runs automatically

# Manual PRD research
/karimo-research --prd user-profiles

# Refine after adding annotations
/karimo-research --refine --prd user-profiles
```

### Related Documentation

- [RESEARCH.md](RESEARCH.md) — Complete research methodology guide
- [ANNOTATION_GUIDE.md](../templates/ANNOTATION_GUIDE.md) — Annotation syntax reference

---

## /karimo-dashboard

Comprehensive CLI dashboard for KARIMO monitoring with system health, execution insights, and velocity analytics.

### Usage

```bash
/karimo-dashboard              # Full dashboard (all 5 sections)
/karimo-dashboard --active     # Show only active PRDs with progress
/karimo-dashboard --blocked    # Show only blocked tasks
/karimo-dashboard --deps       # Show cross-PRD dependency graph
/karimo-dashboard --prd {slug} # PRD-specific dashboard
/karimo-dashboard --alerts     # Show only Critical Alerts section
/karimo-dashboard --activity   # Extended activity feed (last 50 events)
/karimo-dashboard --json       # JSON output for scripting/automation
/karimo-dashboard --refresh    # Force refresh (bypass cache)
```

### What It Shows

The dashboard has 5 comprehensive sections:

**1. Executive Summary** — System health score, quick stats, next completions

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard                              Updated: 45s ago    │
│  System Health: ████████░░ 85%                 Active: 2 PRDs      │
╰────────────────────────────────────────────────────────────────────╯

📊 QUICK SUMMARY
────────────────
  PRDs:       3 total (2 active, 1 complete)
  Tasks:      42 total (28 done, 8 running, 4 queued, 2 blocked)
  Progress:   ████████░░ 67% complete
  Models:     28 Sonnet, 12 Opus (30% escalation rate)

  ✅ Next completions:
    • user-profiles Wave 2 (~2h, 1 task remaining)
    • token-studio Wave 1 (~6h, 6 tasks queued)
```

**2. Critical Alerts** — Blocked, stale, crashed tasks needing intervention

```
🚨 CRITICAL ALERTS — Needs Immediate Attention
───────────────────────────────────────────────

  [user-profiles / 2a] BLOCKED — 3 failed Greptile attempts
    → PR #44 needs human review
    → Blocked for: 2h 15m
    → Action: gh pr view 44

  [token-studio / 1c] STALE — Running for 6h 23m
    → Agent may have crashed
    → Action: /karimo-execute --prd token-studio --task 1c

  Total: 2 items requiring human intervention
```

**3. Execution Velocity** — Completion rate, loop efficiency, wave progress, ETAs

```
📊 EXECUTION VELOCITY — Last 7 Days
────────────────────────────────────

  Completion Rate:    ████████████░░ 42 tasks (6/day avg)
  Loop Efficiency:    ████████░░░░░ 2.8 avg (improving ↓)
  First-Time Pass:    █████░░░░░░░ 45% (↑ from 38%)
  Review Pass Rate:   ██████████░░ 82% (Greptile avg: 3.2)

  Wave Progress:
    user-profiles:    Wave 2 of 3  ████████░░ 80%
    token-studio:     Wave 1 of 4  ███░░░░░░░ 25%

  ETA Projections:
    user-profiles:    ~2h (Wave 2: 1 task remaining)
    token-studio:     ~6h (Wave 1: 6 tasks queued)
```

**4. Resource Usage** — Model distribution, loop distribution, parallel capacity

```
⚙️  RESOURCE USAGE — Current Cycle
──────────────────────────────────

  Model Distribution:   Sonnet: 28 tasks (70%)  Opus: 12 tasks (30%)
  Escalations:          4 tasks (10% escalation rate)
  Parallel Capacity:    2/3 slots utilized (67%)

  Loop Distribution:
    1 loop:  ████████████████ 20 tasks (50%)
    2 loops: ████████ 12 tasks (30%)
    3 loops: ████ 6 tasks (15%)
    4+ loops: ██ 2 tasks (5%)  ← Learning candidates
```

**5. Recent Activity** — Timeline of events across all PRDs

```
📋 RECENT ACTIVITY — Last 10 Events
────────────────────────────────────

  3m ago   [user-profiles] Task 2c completed (PR #46 merged)
  12m ago  [token-studio] Task 1b needs revision (Greptile: 2/5)
  15m ago  [user-profiles] Wave 2 completed
  28m ago  [token-studio] Task 1a escalated (sonnet → opus)
  1h ago   [user-profiles] Task 2b completed (PR #45 merged)
```

### Features

- **Health Scoring** — 0-100 score based on task success, loop efficiency, stalled/blocked counts
- **Caching** — 2-minute cache for performance (< 1s with valid cache)
- **Git Reconciliation** — Derives truth from git state, same as `/karimo-status`
- **JSON Export** — `--json` flag for scripting and automation
- **Minimal Mode** — `--alerts` flag shows only critical alerts

### Why This Command Exists

This is the **primary monitoring touchpoint** for KARIMO:
- **Active monitoring** during execution — Check health, view alerts, track progress
- **Post-execution analysis** — Review velocity metrics, resource usage, activity timeline

Check this each morning or after execution runs complete.

### Workflow Integration

**During execution:**
```bash
/karimo-dashboard           # System health, what needs attention, progress
/karimo-status --prd X      # Wave-level task details (deep dive)
/karimo-execute --prd X     # Resume/start execution
```

**Post-execution:**
```bash
/karimo-dashboard --activity # Review execution history
/karimo-dashboard --prd X    # PRD-specific metrics and insights
/karimo-feedback             # Capture learnings
```

---

## /karimo-execute

Execute tasks from a finalized PRD. Two-phase flow: brief generation, then wave-ordered execution.

### Usage

```
/karimo-execute --prd {slug}
```

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `--prd {slug}` | No | PRD slug to execute (lists available if omitted) |
| `--task {id}` | No | Execute specific task only |
| `--dry-run` | No | Preview execution plan without making changes |

### What It Does

**Phase 1: Brief Generation**
1. **Generates** task briefs for each task
2. **Presents** briefs for user review
3. **Options**: Execute all, Adjust briefs, Exclude tasks, Cancel

**Phase 2: Execution (v4.0 Model)**
1. **Reconciles** status.json with git state (git is truth)
2. **Executes** tasks wave by wave (wave 2 waits for wave 1 to merge)
3. **Spawns** agents with `isolation: worktree` (Claude Code manages worktrees)
4. **Creates** PRs targeting main directly
5. **Applies** PR labels: `karimo`, `karimo-{prd-slug}`, `wave-{n}`, `complexity-{n}`
6. **Finalizes** on completion (metrics, cleanup)

### Execution Flow

```
Generate Briefs → User Review → Wave-Ordered Execution → PRs to Main → Finalize
```

### Resume Protocol

If `/karimo-execute` runs on an active PRD, it:
1. Derives truth from git state (not status.json)
2. Reconciles any discrepancies
3. Resumes from the correct wave

### Example

```
/karimo-execute --prd user-profiles
```

### Dry Run

Preview what would happen without executing:

```
/karimo-execute --prd user-profiles --dry-run
```

---

## /karimo-modify

Modify an approved PRD before execution — add, remove, or change tasks with automatic execution plan regeneration.

### Usage

```
/karimo-modify --prd {slug}
```

### What It Does

1. **Validates PRD status** — Only works on `ready` status (approved but not executing)
2. **Displays current structure** — Shows existing tasks organized by wave
3. **Accepts modifications** — Natural language input for changes:
   - Add new tasks with dependencies
   - Remove tasks (warns about orphaned dependencies)
   - Change dependencies
   - Split or merge tasks
   - Update task details (title, description, complexity)
4. **Regenerates execution plan** — Recomputes waves, validates no cycles
5. **Shows diff** — Added/removed/modified tasks, wave changes
6. **Confirms changes** — Save, continue editing, or discard

### Validation

- No dependency cycles
- All referenced task IDs must exist
- Required fields present

### Brief Handling

| Change Type | Brief Action |
|-------------|--------------|
| Added task | Generated at execution time |
| Removed task | Brief deleted |
| Modified task | Brief marked stale, regenerated at execution |

### When to Use

| Scenario | Command |
|----------|---------|
| PRD in draft, needs changes | `/karimo-plan --resume {slug}` |
| PRD approved, needs structural changes | `/karimo-modify --prd {slug}` |
| PRD executing, needs task adjustments | Adjust briefs in execute, or pause and modify |

---

## /karimo-run

Execute tasks from an approved PRD using feature branch workflow (v5.0). **This is the recommended execution command.**

> **Note:** This command delegates to `/karimo-orchestrate` with a more intuitive name.

### Usage

```
/karimo-run --prd {slug}
/karimo-run --prd {slug} --dry-run
/karimo-run --prd {slug} --skip-review
/karimo-run --prd {slug} --review-only
```

### What It Does

1. **Creates feature branch** — `feature/{prd-slug}` from main
2. **Generates task briefs** — Self-contained instructions for each task
3. **Reviews briefs (optional)** — Validates briefs against codebase reality
4. **Applies corrections (optional)** — Fixes issues found during review
5. **Executes tasks in waves** — Parallel execution where possible
6. **Creates PRs** — Task PRs target feature branch (not main)
7. **Prepares for final merge** — Run `/karimo-merge` when complete

### Arguments

| Flag | Required | Description |
|------|----------|-------------|
| `--prd {slug}` | Yes | PRD slug to execute |
| `--dry-run` | No | Preview execution plan without making changes |
| `--skip-review` | No | Skip pre-execution review and execute immediately |
| `--review-only` | No | Generate briefs and review, then stop without executing |

### Pre-Execution Review Workflow (New in v5.5.0)

After generating task briefs, KARIMO offers an optional pre-execution review to validate briefs against codebase reality.

#### Default Behavior (Recommended)

```
╭──────────────────────────────────────────────────────────────╮
│  Briefs Generated: user-profiles                             │
╰──────────────────────────────────────────────────────────────╯

5 task briefs created

Options:
  1. Review briefs (recommended) — Validate against codebase
  2. Skip review — Execute immediately
  3. Cancel — Exit without executing

Your choice:
```

**If you choose "Review briefs":**

**Stage 1: Investigation**
- Agent validates assumptions, success criteria, and configurations against actual codebase
- Produces findings document with critical/warning/observation categories
- Findings committed to git: `.karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md`

**Stage 2: Correction (Conditional)**
```
╭──────────────────────────────────────────────────────────────╮
│  Review Complete: user-profiles                              │
╰──────────────────────────────────────────────────────────────╯

Findings:
  Critical: 3 — Will likely cause execution failures
  Warnings: 2 — May cause issues
  Observations: 1 — FYI only

Critical findings:
- ESLint rule already at 'error' (Task 1a assumption incorrect)
- Contradictory lint success criteria across Wave 1
- Vitest projects not configured (Task 2b will fail)

Options:
  1. Apply corrections (recommended) — Fix briefs automatically
  2. Skip corrections — Execute anyway (failures expected)
  3. Cancel — Exit for manual review
```

If you choose "Apply corrections":
- Agent modifies briefs, PRD, or creates new tasks based on findings
- Corrections committed to git atomically
- Execution proceeds with corrected briefs

#### Review Benefits

- **Catches incorrect assumptions** before wasting agent time/tokens
- **Prevents contradictory success criteria** across tasks
- **Validates configuration prerequisites** exist (vitest projects, ESLint rules, etc.)
- **Significantly increases execution success rate**
- **Reduces automated review failures** (Greptile/Code Review)

#### Skip Review

Use `--skip-review` to bypass the review gate entirely:

```
/karimo-run --prd feature-name --skip-review
```

**When to skip:**
- You've already reviewed the PRD thoroughly
- Briefs are simple and low-risk
- You want to test the execution flow quickly

#### Review Only

Use `--review-only` to review briefs without executing:

```
/karimo-run --prd feature-name --review-only
```

**Use case:**
- Want to see potential issues before committing to execution
- Need to manually review findings before proceeding
- Want to gather validation data for PRD improvements

After reviewing, run without `--review-only` to apply corrections and execute.

### Output

```
╭──────────────────────────────────────────────────────────────╮
│  Orchestrate: user-profiles                                  │
╰──────────────────────────────────────────────────────────────╯

Mode: Feature Branch Aggregation (v5.0)
Feature Branch: feature/user-profiles (will be created)

✓ Created feature branch: feature/user-profiles
✓ Generated 5 task briefs
✓ Review complete: No critical findings
✓ Spawned PM agent for wave-based execution

Task PRs will target: feature/user-profiles
Final PR will be created with: /karimo-merge --prd user-profiles

Execution started in background...
```

### Next Step

When all tasks complete and status is `ready-for-merge`:

```
/karimo-merge --prd user-profiles
```

---

## /karimo-orchestrate

Create feature branch and execute all tasks with PRs targeting the feature branch (v5.0 feature branch mode).

> **Note:** `/karimo-run` is the recommended alias for this command. See `/karimo-run` documentation for full details including the new pre-execution review workflow (v5.1).

### Usage

```
/karimo-orchestrate --prd {slug}
/karimo-orchestrate --prd {slug} --dry-run
/karimo-orchestrate --prd {slug} --skip-review
/karimo-orchestrate --prd {slug} --review-only
```

### What It Does

1. **Creates feature branch** — `feature/{prd-slug}` from main
2. **Generates task briefs** — Self-contained instructions for each task (committed atomically)
3. **Reviews briefs (optional, v5.1)** — Validates briefs against codebase reality
4. **Applies corrections (optional, v5.1)** — Fixes issues found during review (committed atomically)
5. **Updates status.json** — Sets `execution_mode: "feature-branch"` and `feature_branch: "feature/{prd-slug}"`
6. **Spawns PM agent** — Executes tasks in wave order with PRs targeting feature branch
7. **Pauses at completion** — Sets status to `ready-for-merge` when all tasks done

### When to Use

**Use feature branch mode for:**
- Most PRDs (5+ tasks)
- Complex features requiring consolidated review
- When you want single production deployment (prevents 15+ preview deployments)
- When you want to review all changes together before merging to main

**Use direct-to-main mode (`/karimo-execute`) for:**
- Simple PRDs (1-3 tasks)
- Hotfixes or urgent changes
- Existing v4.0 workflows

### Arguments

| Flag | Required | Description |
|------|----------|-------------|
| `--prd {slug}` | Yes | PRD slug to orchestrate |
| `--dry-run` | No | Preview feature branch plan without execution |
| `--skip-review` | No | Skip pre-execution review and execute immediately (v5.1) |
| `--review-only` | No | Generate briefs and review, then stop without executing (v5.1) |

### Output

```
╭──────────────────────────────────────────────────────────────╮
│  Feature Branch Orchestration: user-auth                     │
╰──────────────────────────────────────────────────────────────╯

✓ Created feature branch: feature/user-auth
✓ Updated status.json with execution mode
✓ Spawned PM agent for wave-based execution

Task PRs will target: feature/user-auth
Final PR will be created with: /karimo-merge --prd user-auth

Execution started in background...
```

### Next Step

When all tasks complete and status is `ready-for-merge`:

```
/karimo-merge --prd {slug}
```

---

## /karimo-merge

Consolidate feature branch changes and create final PR to main (completes v5.0 workflow).

### Usage

```
/karimo-merge --prd {slug}
```

### What It Does

1. **Validates completion** — All task PRs merged to feature branch
2. **Generates diff** — Shows consolidated changes vs main
3. **Runs validation** — build, lint, typecheck, test suite
4. **Presents review** — Comprehensive summary for human approval
5. **Creates final PR** — `feature/{prd-slug}` → main
6. **Handles cleanup** — Post-merge branch cleanup

### Validation Checks

Before creating PR:
- ✓ All tasks marked `done` in status.json
- ✓ All task PRs merged to feature branch
- ✓ Build passes
- ✓ Linter passes
- ✓ Type checker passes
- ✓ Test suite passes
- ✓ No merge conflicts with main

### When to Use

Only use after:
- `/karimo-orchestrate` completed successfully
- PRD status is `ready-for-merge`
- You've reviewed the feature branch changes

### Output

```
╭──────────────────────────────────────────────────────────────╮
│  Feature Branch Merge: user-auth                             │
╰──────────────────────────────────────────────────────────────╯

✓ Validation passed:
  - All 6 tasks complete
  - All PRs merged to feature/user-auth
  - Build ✓  Lint ✓  Types ✓  Tests ✓

📊 Consolidated Changes:
  - 15 files changed
  - 842 insertions, 213 deletions
  - 8 new components, 3 updated

Created PR #127: feature/user-auth → main
Review: https://github.com/owner/repo/pull/127
```

### Benefits vs Direct-to-Main

| Metric | Feature Branch | Direct-to-Main |
|--------|----------------|----------------|
| Production deployments | 1 (final PR) | 15+ (one per task) |
| Preview deployment emails | ~2 events | ~38 events |
| Git history | Clean (1 feature commit) | Verbose (15+ task commits) |
| Review consolidation | Single comprehensive review | Scattered across task PRs |
| Rollback | Single revert | Multiple reverts needed |

---

## /karimo-status

View execution progress across all PRDs with git state reconstruction.

### Usage

```
/karimo-status
```

### Options

| Option | Description |
|--------|-------------|
| `--prd {slug}` | Show specific PRD only |
| `--active` | Show only active PRDs |
| `--reconcile` | Force git state reconstruction |
| `--json` | Output as JSON |

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Wave 2 of 3 in progress
    Tasks: 4/5 done, 1 in-review
    PRs: #42 #43 #44 #45 merged, #46 open

  002_notifications          ready      ░░░░░░░░░░ 0%
    Tasks: 0/3 queued
    Ready for execution
```

### Git State Reconstruction

v4.0 principle: **Git is truth. status.json is a cache.**

The status command derives actual state from git and GitHub, not just status.json. If they conflict, git wins and status.json is updated.

### Task States

| State | Description |
|-------|-------------|
| `queued` | Waiting for wave dependencies |
| `running` | Agent executing |
| `in-review` | PR created, awaiting merge |
| `needs-revision` | Review requested changes |
| `needs-human-review` | Failed 3 Greptile attempts |
| `done` | PR merged |
| `failed` | Execution failed |
| `blocked` | Waiting on failed dependency |
| `crashed` | Branch exists but no PR |

---

## /karimo-configure

Create or update configuration in `.karimo/config.yaml` (single source of truth).

### Usage

```
/karimo-configure              # Create new config or update existing
/karimo-configure --reset      # Start fresh, ignore existing config
/karimo-configure --cd         # Configure CD provider to skip KARIMO branches
/karimo-configure --check      # Show current configuration status
```

### Flags

| Flag | Description |
|------|-------------|
| `--reset` | Start fresh, ignore existing config |
| `--greptile` | Install Greptile workflow only |
| `--code-review` | Setup Claude Code Review (instructions only) |
| `--review` | Choose between review providers (interactive) |
| `--cd` | Configure CD provider to skip KARIMO branches |
| `--check` | Show current configuration status |

### What It Does

Walks through 6 configuration sections:

1. **Project Identity** — Runtime, framework, package manager
2. **Build Commands** — build, lint, test, typecheck commands
3. **File Boundaries** — Never-touch and require-review patterns
4. **GitHub Configuration** — Owner, repository, default branch
5. **Execution Settings** — Default model, parallelism, pre-PR checks
6. **Cost Controls** — Model escalation, max attempts, Greptile

On completion:
- Writes `.karimo/config.yaml` with all configuration values

### When to Use

| Use `/karimo-configure` | Use `/karimo-plan` |
|-------------------------|-------------------|
| Doctor found config issues | Creating a PRD |
| Changing config later | Config already in place |
| ~5 minutes | ~30 minutes |
| Writes config.yaml | Produces PRD + tasks |

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Configure                                            │
╰──────────────────────────────────────────────────────────────╯

Section 1 of 5: Project Identity
─────────────────────────────────

Detected: Node.js project with Next.js

  Project name: [my-project]
  Runtime: [Node.js 20]
  Framework: [Next.js 14]
  Package manager: [pnpm]

Accept these values? [Y/n/edit]
```

### config.yaml Structure

Writes to `.karimo/config.yaml`:

```yaml
project:
  name: my-project
  runtime: Node.js 20
  framework: Next.js 14
  package_manager: pnpm

commands:
  build: pnpm build
  lint: pnpm lint
  test: pnpm test
  typecheck: pnpm typecheck

boundaries:
  never_touch:
    - ".env*"
    - "*.lock"
  require_review:
    - "migrations/**"
    - "auth/**"

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

cost:
  escalate_after_failures: 1
  max_attempts: 3
  greptile_enabled: false
```

### Update Mode

When config already exists, shows current vs new values:

```
  Build command:
    Current: pnpm build
    New: [pnpm build] (press Enter to keep)
```

---

## /karimo-cd-config

**⚠️ DEPRECATED:** This command is now part of `/karimo-configure`. Use `/karimo-configure --cd` instead.

**Migration:**
- `/karimo-cd-config` → `/karimo-configure --cd` (configure CD provider)
- `/karimo-cd-config --check` → `/karimo-configure --check` (view configuration)

**This command will be removed in v6.0.**

---

Configure your continuous deployment provider to skip preview builds for KARIMO task branches.

### Usage

```
/karimo-cd-config              # Auto-detect and configure
/karimo-cd-config --provider vercel   # Skip detection, configure Vercel
/karimo-cd-config --check      # Show current configuration status
```

### Why This Matters

KARIMO task branches contain partial code that won't build in isolation:
- Task 1a adds types
- Task 1b adds the consumer that uses those types
- Building Task 1b alone fails (types don't exist yet)

**This is expected.** The code works once all wave tasks merge to main.

### What It Does

1. **Detects CD provider** — Checks for vercel.json, netlify.toml, render.yaml, etc.
2. **Presents options** — Configure ignore rule, accept noise, or learn more
3. **Applies configuration** — Adds ignore command to skip KARIMO branches
4. **Verifies** — Shows confirmation with test instructions

### Supported Providers

| Provider | Config File | Approach |
|----------|-------------|----------|
| Vercel | `vercel.json` | `ignoreCommand` field |
| Netlify | `netlify.toml` | `[build] ignore` field |
| Render | `render.yaml` | Dashboard config (comment added) |
| Railway | `railway.toml` | Dashboard config (comment added) |
| Fly.io | `fly.toml` | No action needed (no PR auto-deploy) |

### The Pattern

KARIMO task branches follow: `{prd-slug}-{task-id}` (e.g., `user-profiles-1a`)

**Regex:** `-[0-9]+[a-z]?$` (branches ending with dash-digit-optional-letter)

This matches all KARIMO branches while avoiding false positives on typical branch names.

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  CD Provider Configuration                                   │
╰──────────────────────────────────────────────────────────────╯

Detected: Vercel (vercel.json found)

✓ Updated vercel.json with KARIMO ignore rule

KARIMO task branches (e.g., user-profiles-1a) will skip preview deployments.
Non-KARIMO branches (feature/*, fix/*, etc.) will deploy normally.
```

### When to Use

| Scenario | Command |
|----------|---------|
| Initial KARIMO setup | Run during `/karimo-configure` (Step 7) or after with `--cd` |
| Previews failing on task PRs | `/karimo-configure --cd` |
| Changing CD provider | `/karimo-configure --cd` |
| Check current status | `/karimo-configure --check` |

### Related Documentation

- [CI-CD.md](CI-CD.md) — Full CI/CD integration documentation
- [SAFEGUARDS.md](SAFEGUARDS.md) — Code integrity and security

---

## /karimo-update

Check for and apply KARIMO updates from GitHub releases.

### Usage

```
/karimo-update              # Check for updates and install if available
/karimo-update --check      # Only check, don't install
/karimo-update --force      # Update even if already on latest
```

### What It Does

1. **Checks current version** from `.karimo/VERSION`
2. **Fetches latest release** from GitHub (`opensesh/KARIMO`)
3. **Compares versions** using semver
4. **Shows what will change** (if update available)
5. **Downloads and applies** after user confirmation

### Options

| Option | Description |
|--------|-------------|
| `--check` | Only check for updates, don't install |
| `--force` | Update even if already on latest version |
| `--ci` | Non-interactive mode (auto-confirm) |
| `--local <source> <target>` | Update from local KARIMO source |

### What Gets Updated

| Category | Files |
|----------|-------|
| Commands | `.claude/commands/*.md` |
| Agents | `.claude/agents/*.md` |
| Skills | `.claude/skills/*.md` |
| Templates | `.karimo/templates/*.md` |
| Rules | `.claude/KARIMO_RULES.md` |
| Workflows | `.github/workflows/karimo-*.yml` (existing only) |

### What Is Preserved

These files are **never modified** by updates:

| File | Reason |
|------|--------|
| `.karimo/config.yaml` | Your project configuration |
| `.karimo/learnings.md` | Your accumulated learnings |
| `.karimo/prds/*` | Your PRD files |
| `CLAUDE.md` | Your project instructions |

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Update                                               │
╰──────────────────────────────────────────────────────────────╯

Mode: Remote update (GitHub)
Project: /path/to/your/project

Current version: 3.2.0
Latest version:  3.3.0

Update available: 3.2.0 → 3.3.0

This update will:
  • Replace KARIMO commands, agents, skills, and templates
  • Update GitHub workflow files (existing ones only)

These files are preserved (never modified):
  • .karimo/config.yaml
  • .karimo/learnings.md
  • .karimo/prds/*
  • CLAUDE.md

Continue with update? (Y/n)
```

### Offline/Manual Updates

If GitHub is unreachable:

1. Download latest release from https://github.com/opensesh/KARIMO/releases
2. Extract the release
3. Run: `.karimo/update.sh --local <extracted-karimo> .`

### When to Use

| Scenario | Command |
|----------|---------|
| Check if updates available | `/karimo-update --check` |
| Apply updates | `/karimo-update` |
| Force reinstall | `/karimo-update --force` |
| CI/automated pipelines | `bash .karimo/update.sh --ci` |

---

## /karimo-feedback

Intelligent feedback capture with automatic complexity detection and adaptive investigation.

### Usage

```
/karimo-feedback                           # Interactive with auto-detection
/karimo-feedback --from-metrics {slug}     # Batch from PRD metrics
/karimo-feedback --undo                    # Remove recent learnings

> {your observation}
```

### What It Does

**Auto-detects complexity** and adapts approach:

**Simple Path (70% of cases, < 5 min):**
1. **Analyzes** feedback for clarity
2. **Asks** 0-3 clarifying questions (if needed)
3. **Generates** actionable rule immediately
4. **Appends** to `.karimo/learnings.md`

**Complex Path (30% of cases, 10-20 min):**
1. **Detects** investigation needed
2. **Conducts** adaptive interview (3-7 questions)
3. **Spawns** feedback-auditor for evidence gathering
4. **Creates** feedback document with findings
5. **Presents** recommended changes for approval
6. **Applies** approved changes to multiple files

### Complexity Detection

Analyzes your feedback for signals:

**Simple signals** (quick path):
- Specific file, component, or pattern mentioned
- Clear root cause stated
- Straightforward fix ("never do X", "always use Y")
- Single, well-defined issue

**Complex signals** (investigation path):
- Vague symptoms ("something's wrong", "keeps failing")
- Scope indicators ("all tests", "system-wide", "deployment")
- Investigation language ("figure out why", "not sure what's causing")
- Multiple related issues tangled together

### Simple Path Example

```
/karimo-feedback

> "Never use inline styles — always use Tailwind classes"
```

**Result:** Rule generated immediately and appended to `.karimo/learnings.md`:

```markdown
**Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
Reference existing components for class patterns.

**Context:** Inline styles bypass the design system.
**Added:** 2026-03-11
```

### Complex Path Example

```
/karimo-feedback

> "Tests failing on deploy but passing locally — investigate why"
```

**Result:** Adaptive interview → evidence gathering → feedback document created:

1. Interview asks 3-7 questions about problem scope, evidence, root cause, desired state
2. Feedback-auditor investigates CI/CD workflows, test config, PR history
3. Creates `.karimo/feedback/deploy-test-failures.md` with findings
4. Presents recommended changes (e.g., missing env vars in GitHub Actions)
5. Applies approved changes to multiple files

### Learning Categories

| Category | Use For |
|----------|---------|
| **Patterns to Follow** | Positive practices |
| **Anti-Patterns to Avoid** | Mistakes to prevent |
| **Rules** | Mandatory guidelines |
| **Gotchas** | Non-obvious constraints |

### Batch Mode: `--from-metrics`

After PRD execution completes, `metrics.json` contains auto-identified learning candidates. Use batch mode to process them:

```
/karimo-feedback --from-metrics user-profiles
```

This reads `.karimo/prds/user-profiles/metrics.json` and presents each candidate:

```
╭──────────────────────────────────────────────────────────────╮
│  Learning Candidate 1 of 3                                   │
├──────────────────────────────────────────────────────────────┤
│  Task: 2a (Profile edit form)                                │
│  Reason: high_loop_count (4 loops)                           │
│  Context: Greptile flagged missing error handling            │
│                                                              │
│  Suggested rule:                                             │
│  "Form components must include error state handling"         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [A]dd  [S]kip  [E]dit                                       │
╰──────────────────────────────────────────────────────────────╯
```

Approved rules are batch-appended to `.karimo/learnings.md`.

---

## /karimo-doctor

Check the health of a KARIMO installation and detect configuration drift.

### Usage

```
/karimo-doctor
```

### What It Does

Runs 5 diagnostic checks (read-only, never modifies files):

1. **Environment** — Claude Code, GitHub CLI, Git, Greptile
2. **Installation** — All expected files present
3. **Configuration** — CLAUDE.md has KARIMO section, config.yaml exists, learnings.md exists, no drift
4. **Sanity** — Commands exist, boundary patterns match files
5. **Phase Assessment** — Current adoption phase and PRD status

Check 3 now includes **drift detection**:
- Compares configured package manager in config.yaml vs actual lock files
- Compares configured commands in config.yaml vs package.json scripts
- Reports any mismatches with recommendations

### Output

Shows pass/fail status for each check with actionable recommendations:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Doctor                                               │
╰──────────────────────────────────────────────────────────────╯

Check 1: Environment
────────────────────

  ✅ Claude Code     Installed
  ✅ GitHub CLI      Authenticated as @username
  ✅ Git             v2.43.0 (worktree support)
  ℹ️  Greptile       Not configured (optional for Phase 2)

Check 3: Configuration
──────────────────────

  ✅ CLAUDE.md         KARIMO section present
  ✅ config.yaml       Present and valid
  ✅ learnings.md      Present
  ✅ No drift          Config matches project state

...

Summary
───────

  ✅ All 5 checks passed

  KARIMO installation is healthy.
```

**Recommendations mapping:**
- Missing KARIMO section → `/karimo-configure`
- Configuration drift → `/karimo-configure`
- `_pending_` placeholders → `/karimo-configure`
- Missing files → Re-run installer

### When to Use

- After installing KARIMO
- Before running your first PRD
- When commands aren't working as expected
- Anytime something seems wrong

---

## /karimo-test

Installation smoke test — verify KARIMO installation works without creating PRDs or spawning agents.

### Usage

```
/karimo-test
```

### What It Does

Runs 5 read-only validation tests:

| Test | Validates |
|------|-----------|
| 1. File Presence | All files from MANIFEST.json exist |
| 2. Template Parsing | Templates have valid markdown structure |
| 3. GitHub CLI | `gh auth status` succeeds |
| 4. State Files | `.karimo/state.json` is valid JSON (if exists) |
| 5. Integration | KARIMO section in CLAUDE.md, learnings.md exists, KARIMO_RULES.md exists |

### Output

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Installation Test                                    │
╰──────────────────────────────────────────────────────────────╯

Test 1: File Presence
  ✅ Agents: 13/13
  ✅ Commands: 10/10
  ✅ Skills: 5/5
  ✅ Templates: 9/9

...

Summary
───────

  ✅ 5/5 tests passed

  KARIMO installation verified.
```

### When to Use

| Scenario | Command |
|----------|---------|
| After fresh install | `/karimo-test` |
| Diagnose broken install | `/karimo-doctor` |
| Verify before first PRD | `/karimo-test` then `/karimo-plan` |

---

## Command Locations

Commands are defined in `.claude/commands/`:

| File | Command |
|------|---------|
| `karimo-plan.md` | `/karimo-plan` |
| `karimo-dashboard.md` | `/karimo-dashboard` |
| `karimo-execute.md` | `/karimo-execute` |
| `karimo-modify.md` | `/karimo-modify` |
| `karimo-status.md` | `/karimo-status` |
| `karimo-configure.md` | `/karimo-configure` |
| `karimo-cd-config.md` | `/karimo-cd-config` |
| `karimo-update.md` | `/karimo-update` |
| `karimo-feedback.md` | `/karimo-feedback` |
| `karimo-doctor.md` | `/karimo-doctor` |
| `karimo-test.md` | `/karimo-test` |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
