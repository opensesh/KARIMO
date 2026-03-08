# KARIMO Slash Commands

Reference for all KARIMO slash commands available in Claude Code.

---

## Command Summary

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Start PRD interview with interactive approval |
| `/karimo-overview` | Cross-PRD oversight dashboard |
| `/karimo-execute` | Execute tasks from PRD (brief gen + execution) |
| `/karimo-modify` | Modify approved PRD before execution |
| `/karimo-status` | View execution progress |
| `/karimo-configure` | Create or update project configuration |
| `/karimo-cd-config` | Configure CD provider to skip KARIMO branch previews |
| `/karimo-update` | Check for and apply KARIMO updates |
| `/karimo-feedback` | Quick capture of single learnings |
| `/karimo-learn` | Deep learning cycle (3 modes) |
| `/karimo-doctor` | Check installation health |
| `/karimo-test` | Installation smoke test |

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

## /karimo-overview

Surface all tasks needing human attention and recently completed work across all active PRDs.

### Usage

```
/karimo-overview              # Full dashboard view
/karimo-overview --blocked    # Show only blocked tasks
/karimo-overview --active     # Show only active PRDs with progress
/karimo-overview --deps       # Show cross-PRD dependency graph
```

### What It Shows

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Overview                                             │
╰──────────────────────────────────────────────────────────────╯

🚫 Blocked — Needs Human Review
───────────────────────────────

  PRD: user-profiles
    [2a] Implement profile edit form
         PR #44 · Greptile: 2/5, 2/5, 2/5 (3 attempts)
         → Review PR: https://github.com/owner/repo/pull/44

⚠️  In Revision — Active Loops
────────────────────────────────

  PRD: token-studio
    [1c] Token validation logic
         PR #51 · Greptile: 2/5 (attempt 1 of 3)

🔀 Needs Human Rebase
──────────────────────

  PRD: user-profiles
    [2b] Add avatar upload
         Conflict files: src/types/index.ts

✅ Recently Completed
─────────────────────

  PRD: user-profiles (4/6 tasks done — 67%)
    [1a] Create UserProfile component        ✓ merged 3h ago
    [1b] Add user type definitions           ✓ merged 2h ago
```

### Dependency Graph (`--deps`)

The `--deps` flag shows cross-PRD dependencies:

```
╭──────────────────────────────────────────────────────────────╮
│  Cross-PRD Dependency Graph                                  │
╰──────────────────────────────────────────────────────────────╯

user-profiles ──────► notifications
     │                     │
     └──────► auth-v2 ◄────┘

Blocking Relationships:
  • notifications blocked by: user-profiles
  • auth-v2 blocked by: user-profiles, notifications

Runtime Discoveries:
  • user-profiles/1b discovered dependency on auth-v2 types

Recommended Order:
  1. user-profiles
  2. notifications, auth-v2 (parallel)
```

### Why This Command Exists

This is the **primary daily oversight touchpoint** for KARIMO:
- **Blocked tasks** — Failed 3 Greptile attempts, need human intervention
- **Revision loops** — Tasks actively being revised
- **Rebase conflicts** — Merge conflicts requiring manual resolution
- **Completions** — Recently merged work
- **Dependencies** — Cross-PRD blocking relationships (with `--deps`)

Check this each morning or after a run completes.

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
```

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
| Initial KARIMO setup | Run during `/karimo-configure` or after |
| Previews failing on task PRs | `/karimo-cd-config` |
| Changing CD provider | `/karimo-cd-config` |
| Check current status | `/karimo-cd-config --check` |

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

Capture learnings to improve future agent execution.

### Usage

```
/karimo-feedback                           # Interactive single capture
/karimo-feedback --from-metrics {slug}     # Batch from PRD metrics

> {your observation}
```

### What It Does

1. **Receives** your observation
2. **Analyzes** and classifies
3. **Generates** actionable rule
4. **Appends** to `.karimo/learnings.md`

### Learning Categories

| Category | Use For |
|----------|---------|
| **Patterns to Follow** | Positive practices |
| **Anti-Patterns to Avoid** | Mistakes to prevent |
| **Rules** | Mandatory guidelines |
| **Gotchas** | Non-obvious constraints |

### Example

```
/karimo-feedback

> "The agent kept using inline styles instead of Tailwind classes"
```

Generates:

```markdown
### Anti-Patterns to Avoid

- **Never use inline styles** — Always use Tailwind utility classes.
  First flagged: 2026-02-19
```

### Tips

- Be specific about what went wrong
- Include file paths when relevant
- Mention the desired behavior

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

## /karimo-learn

Conduct a comprehensive three-mode learning cycle.

### Usage

```
/karimo-learn
```

### What It Does

Unlike `/karimo-feedback` (quick, single-rule capture), `/karimo-learn` is a deep investigation:

1. **Mode 1: Interview** (~25 min) — Opus-guided conversation
2. **Mode 2: Audit** (~10 min) — Agent investigates with evidence
3. **Mode 3: Review & Act** (~10 min) — Apply approved changes

### Learn Cycle Flow

```
INIT: Create .karimo/learn/{timestamp}/
    ↓
MODE 1: Interview (5 rounds)
  Pain points → Configuration → Workflow → Deep dive → Audit directives
    ↓
MODE 2: Audit (karimo-learn-auditor)
  Evidence from status.json, PR history, codebase
    ↓
MODE 3: Review & Act
  Present changes → Human approval → Apply to config/docs
    ↓
COMPLETE: Summary + commit
```

### Output

Creates `.karimo/learn/{timestamp}/`:
- `interview.md` — Pain points, audit directives
- `findings.md` — Evidence, root causes
- `action-plan.md` — Proposed changes
- `changes-applied.md` — What was applied

### When to Use

| Use `/karimo-feedback` | Use `/karimo-learn` |
|------------------------|---------------------|
| Single observation | Multiple issues |
| Immediate capture | Periodic review |
| ~2 minutes | ~45 minutes |
| No investigation | Evidence-based audit |

### Example

```
/karimo-learn

# Mode 1 Interview begins...
# 5 rounds of structured questions
# Produces audit directives

# Mode 2 Audit runs...
# Investigates with real evidence

# Mode 3 Review...
# Each change presented for approval
```

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
| `karimo-overview.md` | `/karimo-overview` |
| `karimo-execute.md` | `/karimo-execute` |
| `karimo-modify.md` | `/karimo-modify` |
| `karimo-status.md` | `/karimo-status` |
| `karimo-configure.md` | `/karimo-configure` |
| `karimo-cd-config.md` | `/karimo-cd-config` |
| `karimo-update.md` | `/karimo-update` |
| `karimo-feedback.md` | `/karimo-feedback` |
| `karimo-learn.md` | `/karimo-learn` |
| `karimo-doctor.md` | `/karimo-doctor` |
| `karimo-test.md` | `/karimo-test` |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [ARCHITECTURE.md](CODE/KARIMO/Repo/docs/ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
