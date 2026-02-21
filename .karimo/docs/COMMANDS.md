# KARIMO Slash Commands

Reference for all KARIMO slash commands available in Claude Code.

---

## Command Summary

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Start PRD interview |
| `/karimo:review` | Cross-PRD dashboard and PRD approval |
| `/karimo:execute` | Execute tasks from PRD |
| `/karimo:status` | View execution progress |
| `/karimo:feedback` | Quick capture of single learnings |
| `/karimo:learn` | Deep learning cycle (3 modes) |

---

## /karimo:plan

Start a structured PRD interview to define a new feature.

### Usage

```
/karimo:plan
```

### What It Does

1. **Intake** — Receives your initial description
2. **Investigation** — Scans codebase for patterns
3. **Conversation** — 5-round structured interview
4. **Review** — Validates and generates task DAG

### Interview Rounds

| Round | Focus | Questions |
|-------|-------|-----------|
| 1 | Vision | What are you building? Why now? |
| 2 | Scope | What's in/out of scope? |
| 3 | Investigation | Agent scans codebase |
| 4 | Tasks | Break into executable units |
| 5 | Review | Validate and finalize |

### Output

Creates `.karimo/prds/{slug}/`:
- `prd.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `dag.json` — Dependency graph
- `status.json` — Execution tracking

### Example

```
/karimo:plan

> I want to add user profile pages where users can edit their
> name, avatar, and notification preferences.
```

---

## /karimo:review

Surface tasks needing human attention and approve PRDs for execution.

### Usage

```
/karimo:review                  # Cross-PRD dashboard (default)
/karimo:review --prd {slug}     # Review and approve a specific PRD
/karimo:review --pending        # List PRDs ready for approval
```

### Mode 1: Cross-PRD Dashboard (Default)

Shows all tasks needing attention and recent completions across active PRDs.

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Review                                               │
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

### Mode 2: PRD Approval (`--prd {slug}`)

Review and approve a specific PRD before execution begins.

```
/karimo:review --prd user-profiles
```

What It Does:
1. **Display** PRD summary with task breakdown
2. **Request approval** — approve all, exclude tasks, or return to planning
3. **Generate briefs** — self-contained task briefs for each approved task
4. **Update status** — marks PRD as `approved`

### Mode 3: List Pending (`--pending`)

Show PRDs waiting for initial approval.

```
/karimo:review --pending

PRDs Ready for Review:

  001_user-profiles     ready     6 tasks (4 must, 2 should)
  002_token-studio      ready     8 tasks (5 must, 3 should)

Run: /karimo:review --prd user-profiles
```

### Why This Command Exists

This is the **primary human oversight touchpoint** for KARIMO:
- **Blocked tasks** — Failed 3 Greptile attempts, need human intervention
- **Revision loops** — Tasks actively being revised
- **Rebase conflicts** — Merge conflicts requiring manual resolution
- **Completions** — Recently merged work

Check this each morning or after a run completes.

---

## /karimo:execute

Execute tasks from a finalized PRD.

### Usage

```
/karimo:execute --prd {slug}
```

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `--prd {slug}` | Yes | PRD slug to execute |
| `--task {id}` | No | Execute specific task only |
| `--dry-run` | No | Preview without executing |

### What It Does

1. **Reads** `dag.json` for dependencies
2. **Creates** feature branch and worktrees
3. **Spawns** agents for ready tasks
4. **Monitors** progress and propagates findings
5. **Creates** PRs when tasks complete

### Execution Flow

```
Parse DAG → Create Worktrees → Execute Tasks → Pre-PR Checks → Create PRs
```

### Example

```
/karimo:execute --prd user-profiles
```

### Dry Run

Preview what would happen without executing:

```
/karimo:execute --prd user-profiles --dry-run
```

---

## /karimo:status

View execution progress across all PRDs.

### Usage

```
/karimo:status
```

### Options

| Option | Description |
|--------|-------------|
| `--prd {slug}` | Show specific PRD only |
| `--verbose` | Include task details |

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 running
    PRs: #42 (merged), #43 (open), #44 (open)

  002_notifications          pending    ░░░░░░░░░░ 0%
    Tasks: 0/3 done
    Waiting for: user-profiles completion
```

### Task States

| State | Description |
|-------|-------------|
| `pending` | Not yet started |
| `ready` | Dependencies met, can run |
| `running` | Agent executing |
| `in-review` | PR created, awaiting review |
| `needs-revision` | Review requested changes |
| `needs-human-review` | Failed 3 Greptile attempts |
| `done` | Completed successfully |
| `failed` | Execution failed |
| `blocked` | Dependencies not met |
| `needs-human-rebase` | Merge conflicts |

---

## /karimo:feedback

Capture learnings to improve future agent execution.

### Usage

```
/karimo:feedback

> {your observation}
```

### What It Does

1. **Receives** your observation
2. **Analyzes** and classifies
3. **Generates** actionable rule
4. **Appends** to CLAUDE.md

### Learning Categories

| Category | Use For |
|----------|---------|
| **Patterns to Follow** | Positive practices |
| **Anti-Patterns to Avoid** | Mistakes to prevent |
| **Rules** | Mandatory guidelines |
| **Gotchas** | Non-obvious constraints |

### Example

```
/karimo:feedback

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

---

## /karimo:learn

Conduct a comprehensive three-mode learning cycle.

### Usage

```
/karimo:learn
```

### What It Does

Unlike `/karimo:feedback` (quick, single-rule capture), `/karimo:learn` is a deep investigation:

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

| Use `/karimo:feedback` | Use `/karimo:learn` |
|------------------------|---------------------|
| Single observation | Multiple issues |
| Immediate capture | Periodic review |
| ~2 minutes | ~45 minutes |
| No investigation | Evidence-based audit |

### Example

```
/karimo:learn

# Mode 1 Interview begins...
# 5 rounds of structured questions
# Produces audit directives

# Mode 2 Audit runs...
# Investigates with real evidence

# Mode 3 Review...
# Each change presented for approval
```

---

## Command Locations

Commands are defined in `.claude/commands/`:

| File | Command |
|------|---------|
| `plan.md` | `/karimo:plan` |
| `review.md` | `/karimo:review` |
| `execute.md` | `/karimo:execute` |
| `status.md` | `/karimo:status` |
| `feedback.md` | `/karimo:feedback` |
| `learn.md` | `/karimo:learn` |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
