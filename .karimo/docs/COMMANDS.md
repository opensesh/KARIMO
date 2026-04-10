# KARIMO Slash Commands

Reference for all KARIMO slash commands available in Claude Code.

**v7.0 Change:** Research is now required before planning. The new workflow is:
1. `/karimo:research "feature-name"` — Creates folder, runs research
2. `/karimo:plan --prd feature-name` — Uses research, creates PRD
3. `/karimo:run --prd feature-name` — 4-phase execution with user iterate loop

---

## Command Summary

### Core Workflow (v7.0)

| Command | Purpose |
|---------|---------|
| `/karimo:research "feature-name"` | **REQUIRED first step** — Creates PRD folder + runs research |
| `/karimo:plan --prd {slug}` | PRD interview using research context |
| `/karimo:run --prd {slug}` | 4-phase execution (briefs → review → iterate → orchestrate) |
| `/karimo:merge --prd {slug}` | Create final PR to main after execution |
| `/karimo:dashboard [--prd {slug}]` | Monitor progress (no arg = all PRDs, with arg = details) |
| `/karimo:feedback` | Intelligent feedback capture with auto-detection (simple or complex) |

### Setup & Maintenance

| Command | Purpose |
|---------|---------|
| `/karimo:configure` | Create or update project configuration |
| `/karimo:doctor [--test]` | Check installation health (--test for quick verification) |
| `/karimo:update` | Check for and apply KARIMO updates |

### Advanced

| Command | Purpose |
|---------|---------|
| `/karimo:greptile-review --pr {number}` | Standalone Greptile review loop |
| `/karimo:help` | Help and documentation search |

---

## /karimo:plan

Create a PRD through structured interview, using research context.

**v7.0 Change:** Requires `--prd {slug}` argument. Research must be run first.

### Usage

```bash
# Standard usage (research required)
/karimo:plan --prd {slug}

# Skip research (not recommended)
/karimo:plan --prd {slug} --skip-research

# Resume a draft
/karimo:plan --resume {slug}
```

### What It Does

1. **Load Research** — Reads findings from `/karimo:research`
2. **Investigation** — Scans codebase for patterns
3. **Conversation** — 4-round research-informed interview
4. **Review** — Validates and generates task DAG
5. **Interactive Approval** — Approve, modify, more research, or save as draft

### Interview Rounds

| Round | Focus | Questions |
|-------|-------|-----------|
| 1 | Framing | What are you building? (informed by research) |
| 2 | Requirements | What's in/out of scope? |
| 3 | Dependencies | Task ordering, file overlaps |
| 4 | Retrospective | Learnings from previous PRDs |

### Incremental Commits (v7.7+)

The interview now commits PRD sections progressively after each round:

1. **After Round 1 (Framing):** Commits executive summary
   - Commit: `docs(karimo): add PRD framing for {slug}`

2. **After Round 2 (Requirements):** Commits goals and requirements
   - Commit: `docs(karimo): add PRD requirements for {slug}`

3. **After Round 3 (Dependencies):** Commits dependencies and milestones
   - Commit: `docs(karimo): add PRD dependencies for {slug}`

4. **After Round 4 (Retrospective):** Commits complete PRD with tasks
   - Commit: `docs(karimo): complete PRD for {slug}`

All commits follow conventional commit format with `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` footer.

**Benefits:**
- Git history shows interview progression
- Crash recovery: PRD state preserved if interrupted
- No leftover uncommitted markdown artifacts
- Matches pattern used by research and task brief commits

### Approval Options

After the review round, you'll see a summary with options:
- **Approve** — Marks PRD as `ready` for execution
- **Modify** — Make changes and re-run the reviewer
- **More research** — Loop back to `/karimo:research --prd {slug}`
- **Save as draft** — Come back later with `/karimo:plan --resume {slug}`

### Output

Creates `.karimo/prds/{NNN}_{slug}/`:
- `PRD_{slug}.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `execution_plan.yaml` — Wave-based execution plan
- `status.json` — Execution tracking
- `research/` — Research artifacts (from `/karimo:research`)

### Example

```bash
# First run research
/karimo:research "user-profile-pages"

# Then plan with research context
/karimo:plan --prd user-profile-pages

> I want to add user profile pages where users can edit their
> name, avatar, and notification preferences.
```

---

## /karimo:research

**v7.0 Change:** This is now the **REQUIRED first step** before planning.

### Usage

```bash
# Start new feature (REQUIRED first step)
# Creates PRD folder and runs research
/karimo:research "feature-name"

# Add research to existing PRD (iterate loop)
/karimo:research --prd {slug}

# Refine research based on annotations
/karimo:research --refine --prd {slug}

# Research with constraints
/karimo:research "feature-name" --internal-only    # Skip external research
/karimo:research "feature-name" --external-only    # Skip codebase research
```

### What It Does

**Feature Init Mode** (bare feature-name):
1. Sanitizes feature name to slug
2. Creates PRD folder: `.karimo/prds/{slug}/`
3. Creates research subfolder structure
4. Interactive questions about research focus
5. Internal codebase research (patterns, structure)
6. External web search and documentation
7. Saves findings to `research/findings.md`
8. Commits research: "docs(karimo): init research for {slug}"
9. Outputs: "Continue with `/karimo:plan --prd {slug}`"

**PRD-Scoped Mode** (--prd flag):
1. Loads existing research context
2. Offers to import general research
3. Interactive questions about additional research focus
4. Appends to existing research artifacts
5. Enhances PRD with `## Research Findings` section (if PRD exists)
6. Commits: "docs(karimo): add research findings to PRD {slug}"

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
/karimo:research --refine --prd {slug}
```

Agent processes annotations and updates PRD.

### Integration with Workflow

**During /karimo:plan:**
After PRD approval, you're prompted:
```
Import existing research? [list of .karimo/research/*.md]
Run research on this PRD? [Y/n] (recommended)
```

**During /karimo:run:**
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
/karimo:research "React authentication patterns"

# Research for specific PRD (recommended workflow)
/karimo:plan
# ... PRD approved ...
# ... Prompted for research, accept ...
# Research runs automatically

# Manual PRD research
/karimo:research --prd user-profiles

# Refine after adding annotations
/karimo:research --refine --prd user-profiles
```

### Related Documentation

- [RESEARCH.md](RESEARCH.md) — Complete research methodology guide
- [ANNOTATION_GUIDE.md](../templates/ANNOTATION_GUIDE.md) — Annotation syntax reference

---

## /karimo:dashboard

Comprehensive CLI dashboard for KARIMO monitoring with system health, execution insights, and velocity analytics.

### Usage

```bash
/karimo:dashboard              # Full dashboard (all 5 sections)
/karimo:dashboard --active     # Show only active PRDs with progress
/karimo:dashboard --blocked    # Show only blocked tasks
/karimo:dashboard --deps       # Show cross-PRD dependency graph
/karimo:dashboard --prd {slug} # PRD-specific dashboard
/karimo:dashboard --alerts     # Show only Critical Alerts section
/karimo:dashboard --activity   # Extended activity feed (last 50 events)
/karimo:dashboard --json       # JSON output for scripting/automation
/karimo:dashboard --refresh    # Force refresh (bypass cache)
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
    → Action: /karimo:run --prd token-studio

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
- **Git Reconciliation** — Derives truth from git state (via `--reconcile` flag)
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
/karimo:dashboard           # System health, what needs attention, progress
/karimo:dashboard --prd X   # Wave-level task details (deep dive)
/karimo:run --prd X         # Resume/start execution
```

**Post-execution:**
```bash
/karimo:dashboard --activity # Review execution history
/karimo:dashboard --prd X    # PRD-specific metrics and insights
/karimo:feedback             # Capture learnings
```

---

## /karimo:run

Execute tasks from an approved PRD using the 4-phase execution model (v7.0).

### Usage

```bash
/karimo:run --prd {slug}
/karimo:run --prd {slug} --dry-run
/karimo:run --prd {slug} --skip-review
/karimo:run --prd {slug} --review-only
/karimo:run --prd {slug} --brief-only
```

### What It Does (4 Phases)

```
Phase 1: Brief Generation
  → Read research + PRD → Generate task briefs

Phase 2: Auto-Review
  → Validate briefs → Challenge order/deps → Find gaps

Phase 3: User Iterate
  → Present recommendations → User feedback → Adjust briefs
  ↺ (loop until approved)

Phase 4: Orchestrate
  → Execute tasks in waves → Create PRs → Validate
```

### Arguments

| Flag | Required | Description |
|------|----------|-------------|
| `--prd {slug}` | Yes | PRD slug to execute |
| `--dry-run` | No | Preview execution plan without making changes |
| `--skip-review` | No | Skip Phase 2-3, execute immediately after briefs |
| `--review-only` | No | Stop after Phase 3 (no execution) |
| `--brief-only` | No | Stop after Phase 1 (no review or execution) |
| `--resume` | No | Resume after pausing |

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
/karimo:run --prd feature-name --skip-review
```

**When to skip:**
- You've already reviewed the PRD thoroughly
- Briefs are simple and low-risk
- You want to test the execution flow quickly

#### Review Only

Use `--review-only` to review briefs without executing:

```
/karimo:run --prd feature-name --review-only
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
Final PR will be created with: /karimo:merge --prd user-profiles

Execution started in background...
```

### Next Step

When all tasks complete and status is `ready-for-merge`:

```
/karimo:merge --prd user-profiles
```

---

## /karimo:merge

Consolidate feature branch changes and create final PR to main (completes v5.0 workflow).

### Usage

```
/karimo:merge --prd {slug}
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
- `/karimo:run` completed successfully
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

### Enhanced PR Descriptions (v7.7+)

The final PR description includes a markdown/code breakdown to distinguish documentation changes from production code:

```markdown
**Total:**
- Files changed: 49 files
- Additions: +8544 lines
- Deletions: -512 lines

**Breakdown:**
- Docs: 12 files (4 new), +3200/-50 lines
- Code: 37 files, +5344/-462 lines
```

This breakdown helps:
- Distinguish documentation updates from production code changes
- Accurately assess actual implementation complexity
- Provide transparency in PR scope for reviewers

**File Classification:**
- **Docs:** Files with `.md` or `.mdx` extensions
- **Code:** All other files (JS, TS, Python, etc.)

### Benefits vs Direct-to-Main

| Metric | Feature Branch | Direct-to-Main |
|--------|----------------|----------------|
| Production deployments | 1 (final PR) | 15+ (one per task) |
| Preview deployment emails | ~2 events | ~38 events |
| Git history | Clean (1 feature commit) | Verbose (15+ task commits) |
| Review consolidation | Single comprehensive review | Scattered across task PRs |
| Rollback | Single revert | Multiple reverts needed |

---

## /karimo:greptile-review

Execute the full Greptile review cycle on a PR, looping until score meets threshold or circuit breaker triggers. Supports extended loops (up to 30) with smart early exit to save budget (v7.20+).

### Usage

```bash
# Standard usage (reads config from config.yaml)
/karimo:greptile-review --pr 123

# Override threshold and max loops
/karimo:greptile-review --pr 123 --threshold 4 --max-loops 2

# Extended loops with budget-aware early exit (v7.20+)
/karimo:greptile-review --pr 123 --max-loops 10

# CI/CD mode (no prompts, auto-continue to threshold)
/karimo:greptile-review --pr 123 --max-loops 10 --auto
```

### What It Does

1. **Trigger** — Posts @greptileai comment if not already triggered
2. **Poll** — Waits for Greptile review (10 min timeout)
3. **Parse** — Extracts score and P1/P2/P3 findings
4. **Smart Exit** — Prompts for early exit when score reaches threshold-1 (v7.20+)
5. **Remediate** — Spawns `karimo-greptile-remediator` to fix findings
6. **Loop** — Repeats until score >= threshold (max 30 loops)
7. **Report** — Returns exit code for calling command

### Arguments

| Flag | Required | Description |
|------|----------|-------------|
| `--pr {number}` | Yes | PR number to review |
| `--threshold {1-5}` | No | Target score (default: from config.yaml or 5) |
| `--max-loops {1-30}` | No | Maximum attempts (default: from config.yaml or 3) |
| `--early-exit {1-5}` | No | Score at which to prompt for early exit (default: threshold - 1) |
| `--auto` | No | Skip early exit prompts, continue to threshold or max loops |
| `--no-prompt` | No | Alias for --auto (for CI/CD environments) |

### Smart Early Exit (v7.20+)

When the score reaches `threshold - 1` (e.g., 4/5 when threshold is 5), the command prompts:

```
╭────────────────────────────────────────────────╮
│  ⚡ Smart Early Exit Opportunity               │
╰────────────────────────────────────────────────╯

  Current score: 4/5
  Target: 5/5
  Early exit threshold: 4/5

  Score 4/5 is often safe to merge.
  Continuing may improve score but costs additional review cycles.

  Options:
    1. Stop here (Recommended) → Exit with greptile-passed label
    2. Continue to 5/5 → Continue revision loop
```

**Budget reminder:** Greptile is $30/month for 50 PRs, then $1/PR after.

Use `--auto` to skip prompts and continue automatically to threshold (useful for CI/CD).

### Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Passed (score >= threshold OR early exit accepted) | PR ready for merge |
| `1` | Transient error | Retry later |
| `2` | Needs human | Max loops exceeded |

### Model Escalation

The remediator agent automatically escalates from Sonnet to Opus when:

- P1 findings mention "architecture", "design", "pattern"
- P1 findings mention "type system", "interface", "contract"
- Second failed attempt with Sonnet

### Standalone vs Integration

**Standalone:** Run on any PR to get Greptile fixes:
```bash
/karimo:greptile-review --pr 456
```

**Integration:** Called by `/karimo:merge` after PR creation:
```bash
# In /karimo:merge Section 8b:
/karimo:greptile-review --pr $pr_number --internal
```

### When to Use

| Scenario | Recommended |
|----------|-------------|
| After `/karimo:merge` | Automatic (built-in) |
| On any PR needing review | Manual invocation |
| Re-running failed review | Manual with `--pr` |
| Testing review flow | Manual with overrides |

### Prerequisites

- Greptile configured: `review.provider: greptile` in config.yaml
- Greptile GitHub App installed on repository
- Repository indexed in Greptile dashboard

---

## /karimo:configure

Create or update configuration in `.karimo/config.yaml` (single source of truth).

### Usage

```
/karimo:configure              # Create new config or update existing
/karimo:configure --reset      # Start fresh, ignore existing config
/karimo:configure --cd         # Configure CD provider to skip KARIMO branches
/karimo:configure --check      # Show current configuration status
```

### Flags

| Flag | Description |
|------|-------------|
| `--reset` | Start fresh, ignore existing config |
| `--greptile` | Setup Greptile: generate project-specific rules and install workflow |
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

| Use `/karimo:configure` | Use `/karimo:plan` |
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

## /karimo:update

Check for and apply KARIMO updates from GitHub releases.

### Usage

```
/karimo:update              # Check for updates and install if available
/karimo:update --check      # Only check, don't install
/karimo:update --force      # Update even if already on latest
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
| Commands | `.claude/plugins/karimo/commands/*.md` |
| Agents | `.claude/plugins/karimo/agents/*.md` |
| Skills | `.claude/plugins/karimo/skills/*.md` |
| Templates | `.karimo/templates/*.md` |
| Rules | `.claude/plugins/karimo/KARIMO_RULES.md` |
| Workflows | `.github/workflows/karimo-*.yml` (existing only) |

### What Is Preserved

These files are **never modified** by updates:

| File | Reason |
|------|--------|
| `.karimo/config.yaml` | Your project configuration |
| `.karimo/learnings/` | Your accumulated learnings (categorized) |
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
  • .karimo/learnings/
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
| Check if updates available | `/karimo:update --check` |
| Apply updates | `/karimo:update` |
| Force reinstall | `/karimo:update --force` |
| CI/automated pipelines | `bash .karimo/update.sh --ci` |

---

## /karimo:feedback

Intelligent feedback capture with automatic complexity detection and adaptive investigation.

### Usage

```
/karimo:feedback                           # Interactive with auto-detection
/karimo:feedback --from-metrics {slug}     # Batch from PRD metrics
/karimo:feedback --undo                    # Remove recent learnings

> {your observation}
```

### What It Does

**Auto-detects complexity** and adapts approach:

**Simple Path (70% of cases, < 5 min):**
1. **Analyzes** feedback for clarity
2. **Asks** 0-3 clarifying questions (if needed)
3. **Generates** actionable rule immediately
4. **Creates** entry in `.karimo/learnings/{category}/`

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
/karimo:feedback

> "Never use inline styles — always use Tailwind classes"
```

**Result:** Rule generated immediately and created in `.karimo/learnings/anti-patterns/`:

```markdown
**Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
Reference existing components for class patterns.

**Context:** Inline styles bypass the design system.
**Added:** 2026-03-11
```

### Complex Path Example

```
/karimo:feedback

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
/karimo:feedback --from-metrics user-profiles
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

Approved rules are batch-created in `.karimo/learnings/{category}/`.

---

## /karimo:doctor

Check the health of a KARIMO installation and detect configuration drift.

### Usage

```
/karimo:doctor
```

### What It Does

Runs 8 diagnostic checks (read-only, never modifies files):

1. **Version Status** — Check for KARIMO updates
2. **Environment** — Claude Code, GitHub CLI, Git, Greptile
3. **Installation** — All expected files present
4. **Configuration** — CLAUDE.md has KARIMO section, config.yaml exists, learnings/ exists, no drift
5. **Sanity** — Commands exist, boundary patterns match files
6. **Execution Mode** — Validate execution mode configuration
7. **Execution Health** — Detect stale tasks and orphaned worktrees
8. **Asset Integrity** — Validate asset manifests and file consistency

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
  ✅ learnings/        Present (categorized)
  ✅ No drift          Config matches project state

...

Check 8: Asset Integrity
────────────────────────

PRD: user-profiles
  ✅ 5/5 assets validated

PRD: token-studio
  ✅ 3/3 assets validated
  ⚠️  1 orphaned file: assets/planning/old-mockup.png

Summary:
  ✅ 8 assets validated across 2 PRDs
  ⚠️  1 orphan (non-blocking)

Summary
───────

  ✅ All 8 checks passed

  KARIMO installation is healthy.
```

**Check 8: Asset Integrity**

Validates asset storage across all PRDs:
- All manifest assets exist on disk
- All disk assets are tracked in manifest
- No orphaned or broken references
- File sizes match manifest

Example output:
```
Check 8: Asset Integrity
────────────────────────

PRD: user-profiles
  ✅ 5/5 assets validated

PRD: token-studio
  ⚠️  1 orphaned file: assets/planning/old-mockup.png

Summary:
  ✅ 8 assets validated
  ⚠️  1 orphan (non-blocking)
```

**Recommendations mapping:**
- Missing KARIMO section → `/karimo:configure`
- Configuration drift → `/karimo:configure`
- `_pending_` placeholders → `/karimo:configure`
- Missing files → Re-run installer
- Orphaned assets → Remove manually: `rm <filepath>`
- Broken asset references → Re-download asset or remove from manifest
- Asset size mismatch → Re-download asset

### When to Use

- After installing KARIMO
- Before running your first PRD
- When commands aren't working as expected
- Anytime something seems wrong

---

## Command Locations

Commands are defined in `.claude/commands/`:

| File | Command |
|------|---------|
| `karimo-configure.md` | `/karimo:configure` |
| `karimo-dashboard.md` | `/karimo:dashboard` |
| `karimo-doctor.md` | `/karimo:doctor [--test]` |
| `karimo-feedback.md` | `/karimo:feedback` |
| `karimo-help.md` | `/karimo:help` |
| `karimo-merge.md` | `/karimo:merge` |
| `karimo-plan.md` | `/karimo:plan` |
| `karimo-research.md` | `/karimo:research` |
| `karimo-run.md` | `/karimo:run` |
| `karimo-update.md` | `/karimo:update` |

---

## Deprecated Commands

The following commands have been consolidated:

| Old Command | New Command |
|-------------|-------------|
| `/karimo:status` | `/karimo:dashboard` |
| `/karimo:status --prd X` | `/karimo:dashboard --prd X` |
| `/karimo:status --reconcile` | `/karimo:dashboard --reconcile` |
| `/karimo-test` | `/karimo:doctor --test` |
| `/karimo-plugin` | Deferred (no plugin ecosystem yet) |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
