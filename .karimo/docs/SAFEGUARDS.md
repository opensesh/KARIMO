# KARIMO Safeguards

KARIMO enforces code quality and security through multiple layers: file boundaries, agent rules, worktree isolation, pre-PR validation, and automated code review.

---

## Safeguard Summary

| Safeguard | Description | Phase |
|-----------|-------------|-------|
| **File boundaries** | `never_touch` and `require_review` patterns | 1+ |
| **Agent rules** | Behavior constraints in KARIMO_RULES.md | 1+ |
| **Worktree isolation** | Each task runs in isolated directory | 1+ |
| **Branch assertion** | 4-layer pre-commit branch identity validation | 1+ (v7.6.0) |
| **Semantic loop detection** | Fingerprinting detects stuck tasks | 1+ (v7.7.0) |
| **Orphan detection** | Git-native cleanup of abandoned worktrees | 1+ (v7.7.0) |
| **Incremental PRD commits** | Crash recovery via git during planning | 1+ (v7.7.0) |
| **Enhanced merge reports** | Transparency in PR scope (docs vs code) | 1+ (v7.7.0) |
| **Pre-PR validation** | Build/typecheck before PR creation | 1+ |
| **Mandatory rebase** | Keeps task branches current | 1+ |
| **File overlap detection** | Prevents parallel conflicts | 1+ |
| **Scoped GitHub tokens** | Minimum required permissions | 1+ |
| **Automated review** | Code review via Greptile or Code Review | 2+ |
| **Revision loops** | Agent self-correction on findings/scores | 2+ |

---

## Execution Modes

KARIMO supports two execution modes with different safeguard profiles.

### Full Mode (Recommended)

Full GitHub integration with maximum traceability and safeguards.

**Traceability Chain:**
```
Feature Issue (Parent)
    └── Task Issue (Sub-issue)
        └── Linked Branch (via gh issue develop)
            └── Worktree (isolated execution)
                └── PR (Closes #issue_number)
                    └── Greptile Review (if configured)
                        └── Merge (auto-closes issue)
```

**Safeguards Enabled:**
- ✓ Sub-issue hierarchy (feature → tasks)
- ✓ Branch-issue linking (visible in GitHub UI)
- ✓ PR-based review workflow
- ✓ Automated board movement (via Projects automation)
- ✓ Wave field tracking
- ✓ Greptile code review (if configured)
- ✓ Revision loops with model escalation

**Configuration Required:**
```yaml
# .karimo/config.yaml
mode: full  # or omit (full is default)

github:
  owner: your-org-or-username
  owner_type: organization  # or personal
  repository: your-repo
  merge_strategy: squash    # squash | merge | rebase
```

### Fast Track Mode

Commit-only workflow for rapid development.

**Traceability Chain:**
```
status.json tracking
    └── Structured commit on main
        └── Format: [{prd-slug}][{task-id}] {title}
```

**Safeguards Enabled:**
- ✓ File boundaries (never_touch, require_review)
- ✓ Pre-commit validation (build, typecheck)
- ✓ Worktree isolation (optional)
- ✓ Commit format enforcement
- ✓ status.json state tracking

**Safeguards NOT Available:**
- ✗ GitHub Issues/PRs
- ✗ Sub-issue hierarchy
- ✗ Branch-issue linking
- ✗ Project board tracking
- ✗ Greptile review
- ✗ PR-based revision loops

**Configuration:**
```yaml
# .karimo/config.yaml
mode: fast-track

# github section optional/omitted
```

### Mode Selection Guide

| Factor | Full Mode | Fast Track |
|--------|-----------|------------|
| Team size | 2+ developers | Solo |
| Auditability needs | High | Low |
| GitHub integration | Required | Optional |
| Review workflow | PR-based | None |
| Execution speed | Slower (more overhead) | Faster |
| Setup complexity | Higher | Lower |
| Greptile available | Yes | No |

**Recommended for:**
- **Full Mode:** Production projects, team collaboration, projects requiring audit trails
- **Fast Track:** Prototyping, personal projects, projects without GitHub

---

## File Boundaries

KARIMO enforces file boundaries defined in `.karimo/config.yaml` to protect sensitive files.

### Never-Touch Files

Files that agents cannot modify under any circumstances:

```yaml
boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
    - "package-lock.json"
    - ".github/workflows/*"
    - "secrets/*"
```

If an agent attempts to modify a never-touch file:
1. Change is blocked
2. Task fails with boundary violation
3. Human intervention required

### Require-Review Files

Files that get flagged for human attention:

```yaml
boundaries:
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"
    - "*.config.js"
    - "security/*"
```

Changes to require-review files:
1. Are allowed to proceed
2. Get flagged in PR description
3. Require human review before merge

### Pattern Syntax

Patterns use glob syntax:

| Pattern | Matches |
|---------|---------|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` |
| `?` | Any single character |
| `*.ext` | All files with extension |
| `dir/*` | Direct children of dir |
| `dir/**` | All descendants of dir |

---

## Agent Rules

Agent behavior is constrained by rules defined in `.claude/plugins/karimo/KARIMO_RULES.md`.

### What Agents Cannot Do

- Modify files matching `never_touch` patterns
- Execute commands outside of task scope
- Access credentials directly
- Push to protected branches
- Merge PRs without review

### What Agents Must Do

- Work within assigned worktree
- Run pre-PR validation checks
- Create PRs (not direct pushes)
- Follow task boundaries from PRD

---

## Worktree Isolation

KARIMO uses Git worktrees to isolate task execution. Each task runs in its own worktree with its own branch.

### Directory Structure

```
.worktrees/
└── {prd-slug}/
    ├── {task-1a}/    # feature/{prd-slug}/1a branch
    ├── {task-1b}/    # feature/{prd-slug}/1b branch
    └── {task-2a}/    # feature/{prd-slug}/2a branch
```

### Branch Naming

| Branch Type | Format | Example |
|-------------|--------|---------|
| Feature branch | `feature/{prd-slug}` | `feature/user-profiles` |
| Task branch | `worktree/{prd-slug}-{task-id}` | `worktree/user-profiles-1a` |

### Worktree Lifecycle (v2.1)

1. **Create**: PM Agent creates worktree when task starts
2. **Work**: Task agent executes in isolated directory
3. **Validate**: Pre-PR checks run in worktree
4. **PR**: Created from task branch
5. **Persist**: Worktree retained through review cycles
6. **Cleanup**: Worktree removed after PR **merged** (not just created)

**Why persist until merge?** Tasks may need revision based on Greptile feedback or integration issues. Keeping the worktree avoids recreation overhead and preserves build caches.

### TTL Policies

| Scenario | TTL | Action |
|----------|-----|--------|
| PR merged | Immediate | Remove worktree |
| PR closed | 24 hours | Remove worktree |
| Stale worktree | 7 days | Remove worktree |
| Execution paused | 30 days | Remove worktree |

### Benefits

- **Parallel execution**: Multiple tasks work simultaneously
- **No contamination**: Task changes don't affect each other
- **Clean state**: Each task starts from clean branch
- **Easy recovery**: Failed tasks don't affect main branch
- **Revision support**: Worktrees persist for Greptile revision loops

---

## Parallel Execution Safety (v7.7.0)

KARIMO v7.7.0 includes three guardrails to prevent branch contamination during parallel PRD execution. These safety features ensure tasks maintain branch identity and don't commit to wrong branches under concurrent load.

### Branch Assertion (4 Layers)

KARIMO enforces branch identity through 4 non-bypassable validation layers:

**Layer 1: Task Brief Template**
- Visual execution context header in every task brief
- Mandatory pre-commit validation script
- Fails commit if branch mismatch detected

**Layer 2: KARIMO Rules**
- Section 2.1: Mandatory branch verification
- Non-negotiable pre-commit check
- Clear failure protocol (STOP, display, surface to user)

**Layer 3: PM Agent Spawn Wrapper**
- Identity enforcement in spawn prompt
- Visual context header
- Critical reminder before every commit

**Layer 4: Task Agents (6 agents)**
- All implementer/tester/documenter agents verify branch
- Reads expected branch from task brief execution context
- Blocks commit on mismatch

**Pre-commit Check:**
```bash
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="worktree/{prd-slug}-{task-id}"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "❌ KARIMO BRANCH GUARD FAILURE"
  echo "   Expected: $EXPECTED_BRANCH"
  echo "   Got:      $CURRENT_BRANCH"
  echo "   DO NOT COMMIT. Surface this error to the user immediately."
  exit 1
fi
```

### Semantic Loop Detection

**Purpose:** Detects when tasks are stuck in same state despite varied actions.

**Fingerprint Components:**
- Action type (commit, validation, file_read)
- Files touched (sorted list for consistency)
- Branch state (git HEAD SHA)
- Validation errors (normalized patterns)

**Detection Logic:**
```bash
# Generate fingerprint
fingerprint=$(cat <<EOF | sha256sum | cut -d' ' -f1
action: commit
files: $(git diff --name-only HEAD~1 HEAD 2>/dev/null | sort | tr '\n' ',')
branch: $(git rev-parse HEAD 2>/dev/null)
validation: $(git log -1 --format=%B | grep -oE 'ERROR:|FAILED:' | sort | tr '\n' ',')
EOF
)

# Compare with last 5 fingerprints
if fingerprint matches any of last 5:
  SEMANTIC LOOP DETECTED
```

**Circuit Breaker:**
- **After 3 loops:** Trigger stall detection
- **If Sonnet:** Escalate to Opus, reset loop count
- **If Opus:** Mark `needs-human-review`, notify user
- **Hard limit:** Max 5 total loops before human required

### Orphan Worktree Detection (v7.7.0)

**Tools:**
- `/karimo:doctor` (Check 6b: Worktree Health)
- `/karimo:dashboard` (Critical Alerts: ORPHANED)

**Git-Native Detection (no jq required):**
```bash
# Orphan Type 1: Branch exists but PRD folder deleted
for branch in $(git branch --list 'worktree/*' --format='%(refname:short)'); do
  prd_slug=$(echo "$branch" | sed 's|worktree/\(.*\)-[0-9][a-z]$|\1|')
  if [ ! -d ".karimo/prds/$prd_slug" ]; then
    orphans+=("$branch (PRD deleted)")
  fi
done

# Orphan Type 2: Branch exists but no open PR (stale)
for branch in $(git branch --list 'worktree/*' --format='%(refname:short)'); do
  if ! gh pr list --head "$branch" --state open --json number >/dev/null 2>&1; then
    orphans+=("$branch (no PR)")
  fi
done
```

**Cleanup:**
- `/karimo:doctor` offers automated cleanup with confirmation
- Deletes orphaned branches (local + remote)
- Prunes stale worktree references
- No manifest synchronization required

### Git-Native Progress Tracking

**Principle:** Git history is the source of truth. status.json is derived/cached metadata.

**PM Agent Behavior:**
- **Sole writer** of status.json
- Derives task status from git + GitHub (branches, PRs, labels)
- Validates status.json against git state on resume
- Detects drift and offers reconciliation

**Benefits:**
- Immune to agent confusion (agents can't corrupt status.json)
- Crash recovery via git history
- Dashboard shows accurate state from git log

### Concurrent Session Safety (v7.18.0)

Running multiple Claude Code sessions with git operations in the same repository during KARIMO execution can cause branch drift. The PM agent includes branch guards that detect and recover from this, but best practice is one KARIMO execution per repository at a time.

**Branch Guards:**

The PM agent uses `ensure_branch()` guards at 5 critical locations:
1. **Pre-wave loop** — Before each wave starts
2. **Pre-spawn** — Before spawning each worker
3. **Wave commit** — Before committing wave state
4. **Wave validation** — Before running validation
5. **Finalization** — Before final commit

If a branch mismatch is detected:
1. Guard attempts recovery via `git checkout`
2. If recovery succeeds, execution continues
3. If recovery fails, operation halts with clear error message
4. User must manually resolve and re-run

**If concurrent work is required:**
- Use separate clones for manual work
- Or wait for wave transitions (natural pause points)
- Never checkout branches while KARIMO is executing

**Worktree Cleanup (v7.18.0, enhanced v7.21.0):**

KARIMO v7.21.0 introduces a **hybrid hook system** for reliable cleanup:

### Native Hooks (Guaranteed Execution)

Configured in `.claude/settings.json`, these fire automatically via Claude Code runtime:

| Hook | When | What it Cleans |
|------|------|----------------|
| `WorktreeRemove` | Before worktree removal | Local + remote branches for the task |
| `SubagentStop` | After worker agent finishes | Prunes stale worktree references |
| `SessionEnd` | When session ends | Orphaned branches (`worktree/*-*`, `worktree-agent-*`) |

**Why native hooks?** They fire even if a session crashes mid-execution, guaranteeing cleanup that was previously only possible at orchestration points.

### Orchestration Cleanup (Belt-and-Suspenders)

In addition to native hooks, orchestration-level cleanup verifies:

1. **Wave-level verification:** After each wave completes, verifies branches were cleaned by native hooks and catches any missed.

2. **Finalizer verification:** At PRD completion, PM-Finalizer verifies all cleanup completed and catches edge cases.

### What Gets Cleaned

- KARIMO-pattern branches: `worktree/{prd-slug}-{task-id}`
- Claude Code internal branches: `worktree-agent-{hash}`
- Both local and remote branches
- Stale worktree references (via `git worktree prune`)

### TTL Policies (Future Implementation)

| Scenario | TTL | Action |
|----------|-----|--------|
| PR merged | Immediate | Native hook cleans |
| PR closed without merge | 24 hours | Session end hook cleans |
| Stale worktree | 7 days | Session end hook cleans |

---

## Pre-PR Validation

Before creating a PR, KARIMO runs validation checks using your configured commands.

### Checks Performed

| Check | Command | Required |
|-------|---------|----------|
| Build | `commands.build` | Yes |
| Typecheck | `commands.typecheck` | If configured |
| Lint | `commands.lint` | If configured |
| Test | `commands.test` | If configured |

### Two-Tier Merge Model (v2.1)

KARIMO uses a two-tier merge strategy with the Review/Architect Agent:

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
- Review/Architect validates each task integrates cleanly
- Greptile reviews code quality (Phase 2)
- PRs merge after validation passes

**Tier 2: Feature → Main (Human Gate)**
- Review/Architect prepares feature PR to `main`
- Full reconciliation checklist completed
- Human reviews and approves final merge
- This is the single human approval gate per feature

### Validation Flow

```
Task Complete → Rebase onto feature branch
                        │
                ┌───────┴───────┐
                │               │
           No Conflicts    Conflicts
                │               │
                ▼               ▼
           Run build      Review/Architect
           + typecheck    resolves or escalates
                │
        ┌───────┴───────┐
        │               │
     Pass            Fail
        │               │
        ▼               ▼
   Create PR      Mark task as
        │         pre-pr-failed
        ▼
   Review/Architect
   validates integration
```

### Feature Reconciliation

When all task PRs are merged, the Review/Architect performs:

- [ ] Full build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] No orphaned imports or dead code
- [ ] Shared interfaces consistent across tasks
- [ ] No boundary violations (`never_touch`)
- [ ] `require_review` files flagged in PR

### Mandatory Rebase

Before PR creation, KARIMO rebases the task branch onto the feature branch.

**Why rebase?** Without mandatory rebase, sibling branches become stale. If Task A merges first and Task B has an outdated base:
- Merge conflicts arise
- Task A's changes get overwritten
- Integration failures are hard to trace

**Three-Way Merge Conflict Resolution:**

Before escalating to human, KARIMO attempts automated resolution:

1. **Attempt `git merge --no-commit`** — Try merge before rebase
2. **Categorize conflicts:**
   - **Easy:** Imports, whitespace, lock files → auto-resolve
   - **Moderate:** Non-overlapping changes in same file → attempt resolution
   - **Hard:** Semantic conflicts, overlapping logic → escalate
3. **Auto-resolve easy conflicts** — Apply heuristics for common patterns
4. **Only escalate hard conflicts** — Mark as `needs-human-rebase`

**Conflict handling flow:**
1. Attempt three-way merge with auto-resolution
2. If hard conflicts remain → Task marked as `needs-human-rebase`
3. PM Agent moves to next task
4. Human resolves conflicts manually
5. Task can be resumed after resolution

### File Overlap Detection

Before launching parallel tasks, KARIMO checks `files_affected` for overlaps:

1. Parse `tasks.yaml` for each task's `files_affected`
2. Build file-to-task map
3. If multiple tasks touch same file → force sequential
4. Non-overlapping tasks can run in parallel

**Example:**

```yaml
# Task 1a
files_affected:
  - src/components/Button.tsx
  - src/components/Button.test.tsx

# Task 1b
files_affected:
  - src/components/Card.tsx    # No overlap → can run parallel

# Task 1c
files_affected:
  - src/components/Button.tsx  # Overlaps with 1a → runs sequential
```

---

## Your CI/CD Responsibility

KARIMO runs **your** validation commands — you own the test suite, build process, and quality gates.

### Configuration

```yaml
commands:
  build: "npm run build"      # Your build command
  lint: "npm run lint"        # Your lint command
  test: "npm test"            # Your test command
  typecheck: "npm run typecheck"  # Your typecheck command
```

### What This Means

- **KARIMO doesn't define quality** — your commands do
- **Agents learn your patterns** — through `.karimo/learnings/` (categorized directories)
- **Your CI stays authoritative** — GitHub Actions run your checks
- **Pre-PR validation uses your tools** — no KARIMO-specific tooling

### Teaching Agents Your Patterns

Use `/karimo:feedback` to capture project-specific conventions:

```
/karimo:feedback

> "Always use the existing Button component from src/components/ui/"
```

This creates entries in `.karimo/learnings/{category}/` that all future agents read.

---

## Automated Code Review

Automated code review is **optional but highly recommended**. It catches issues before human review and enables automated revision loops.

KARIMO supports two review providers — choose based on your workflow and budget.

### Provider Comparison

| Feature | Greptile | Claude Code Review |
|---------|----------|-------------------|
| **Pricing** | $30/month flat (14-day trial) | $15-25 per PR |
| **Review Style** | Score-based (0-5) | Finding-based (severity tags) |
| **Integration** | GitHub Actions workflow | Native Claude Code |
| **Auto-resolve** | Manual | Threads auto-resolve on fix |
| **Best for** | High PR volume (50+/month) | Low-medium PR volume |

### Setup

Run `/karimo:configure --review` to choose your provider interactively, or:

- `/karimo:configure --greptile` — Install Greptile workflow
- `/karimo:configure --code-review` — Setup Claude Code Review

---

### Option A: Greptile

**Score-based review via GitHub App with configurable threshold.**

**Prerequisites:**
- Greptile GitHub App installed: [app.greptile.com](https://app.greptile.com)
- Repository added and indexed in Greptile dashboard
- `.greptile/config.json` and `.greptile/rules.md` in repository (generated by `/karimo:configure --greptile`)

**How it works:**
```
PR Created with 'karimo' label
                    │
                    ▼
    karimo-greptile-trigger.yml fires
                    │
                    ▼
    Posts @greptileai comment
                    │
                    ▼
    Greptile GitHub App reviews PR
                    │
                    ▼
    Posts review with confidence score (0-5)
                    │
            ┌───────┴───────┐
            │               │
    Score ≥ threshold  Score < threshold
            │               │
            ▼               ▼
    greptile-passed    needs-revision
            │               │
            ▼               ▼
    Continue           Revision loop
                      (up to max_loops)
```

**Configurable threshold (v7.12):**

The threshold is configurable in `.karimo/config.yaml`:

```yaml
review:
  enabled: true
  provider: greptile
  threshold: 5           # Target score (1-5), default: 5
  max_revision_loops: 3  # Max attempts before human review
```

| Threshold | Quality Level | Recommended For |
|-----------|--------------|-----------------|
| 5/5 | Highest | Production, security-sensitive code |
| 4/5 | High | Standard development |
| 3/5 | Moderate | Rapid prototyping, non-critical features |

**Dashboard configuration (required):**

In addition to config files, configure Greptile in dashboard:

1. Navigate to `app.greptile.com/review/github`
2. Select repository → Code Review Agent section
3. Enable: PR Summary, Confidence Score, Issue Tables, Diagram, Comments Outside Diff
4. Link Custom Context → Add Context → File → `.greptile/rules.md`

**Note:** KARIMO auto-generates `.greptile/rules.md` with project-specific rules. You just need to link it in the dashboard so Greptile uses it during reviews.

**Score interpretation:**

| Score | vs Threshold | Action |
|-------|--------------|--------|
| ≥ threshold | Pass | Proceed to merge |
| < threshold | Fail | Enters revision loop |

---

### Option B: Claude Code Review

**Finding-based review with native Claude integration.**

**Prerequisites:**
- Claude Teams or Enterprise subscription
- Admin enables Code Review at `claude.ai/admin-settings/claude-code`
- Claude GitHub App installed on repository

**How it works:**
```
PR Created → Code Review multi-agent fleet activates
                    │
                    ▼
            Posts inline comments with severity markers
                    │
            ┌───────┴───────┬───────────────┐
            │               │               │
       No 🔴           Only 🟡/🟣        Has 🔴
       findings        findings         findings
            │               │               │
            ▼               ▼               ▼
         ✅ Pass       ✅ Pass*       🔄 Revision
                      (logged)           loop
```

*Nits are logged but don't block.

**Severity markers:**

| Marker | Level | Action |
|--------|-------|--------|
| 🔴 | Normal | Bug to fix before merge |
| 🟡 | Nit | Minor issue, worth fixing |
| 🟣 | Pre-existing | Bug in codebase, not from this PR |

**Customization:**
- `REVIEW.md` — Review-specific guidance (run `/karimo:configure --code-review` to create)
- `CLAUDE.md` — Shared project instructions

---

### Revision Loop (Both Providers)

When review finds issues, KARIMO enters a revision loop:

**Greptile Revision Flow (v7.13):**

KARIMO v7.13 introduces `/karimo:greptile-review`, a standalone command that owns the entire Greptile loop. This command is:
- Called automatically by `/karimo:merge` when Greptile is configured
- Can be run manually on any PR: `/karimo:greptile-review --pr 123`

```bash
# /karimo:greptile-review handles the full loop
while [ "$score" -lt "$threshold" ] && [ "$loop_count" -lt "$max_loops" ]; do
  1. Trigger @greptileai (if not already triggered)
  2. Wait for Greptile review (~3-10 minutes)
  3. Parse confidence score from review comment
  4. Extract P1/P2/P3 findings from inline comments
  5. If score < threshold:
     - Spawn karimo-greptile-remediator agent
     - Agent fixes ALL findings in batch commit
     - Push to PR branch
     - Greptile auto-reviews on push
     - Increment loop_count
     - Escalate model if needed (Sonnet → Opus)
done
```

**Benefits of standalone command:**
- Session independence (can be resumed if session ends)
- Batch fixes (single commit per loop, not multi-round trickling)
- Clear model escalation triggers
- Can be run on any PR, not just final merge PRs

**Attempt 1:**
1. PM Agent reads review feedback (score and P1/P2/P3 findings)
2. Re-spawns worker with prioritized feedback context
3. Worker makes targeted fixes (P1 first, then P2)
4. Updates PR with new commit
5. Greptile auto-reviews on push (synchronize event)

**After First Failure:**
- PM Agent escalates model (Sonnet → Opus) if P1 findings mention architecture
- No human intervention required
- Continues revision loop with upgraded model

**After max_revision_loops Failed Attempts (Hard Gate):**
- Task status changes to `needs-human-review`
- PR receives `blocked-needs-human` label
- Task removed from active execution queue
- Human must review and unblock

**Model Escalation Triggers:**

| Provider | Trigger | Action |
|----------|---------|--------|
| Greptile | Score < threshold AND P1 mentions "architecture", "design", "pattern" | Escalate to Opus |
| Greptile | Second failed attempt with Sonnet | Escalate to Opus |
| Greptile | Simple bugs (P1 mentions "null", "import", "undefined") | Retry same model |
| Code Review | 🔴 describes architectural issue | Escalate to Opus |
| Code Review | 🔴 describes simple bug | Retry same model |

```
Attempt 1 → Score < threshold
    │
    ▼
Check P1 findings for architectural keywords
    │
    ├── Architectural → Escalate to Opus
    │
    └── Simple bug → Retry same model
            │
            ▼
Attempt 2 → Score < threshold
    │
    ▼
If still Sonnet, escalate to Opus
    │
    ▼
Attempt 3 → Score < threshold
    │
    ▼
HARD GATE: needs-human-review
```

### Budget-Aware Revision Loops (v7.20+)

KARIMO v7.20 introduces smart early exit to help manage Greptile budget:

**Budget Context:**
- Greptile: $30/month for 50 PRs, then $1/PR after
- Each revision loop triggers a new Greptile review
- Extended loops (up to 30) can consume significant budget

**Smart Early Exit:**

When score reaches `threshold - 1` (e.g., 4/5 when threshold is 5), the command prompts:

```
╭────────────────────────────────────────────────╮
│  ⚡ Smart Early Exit Opportunity               │
╰────────────────────────────────────────────────╯

  Score 4/5 is often safe to merge.
  Continuing may improve score but costs additional review cycles.

  Options:
    1. Stop here (Recommended)
    2. Continue to 5/5
```

**Configuration:**

```yaml
# .karimo/config.yaml
review:
  provider: greptile
  threshold: 5
  max_revision_loops: 3

  # Extended (v7.20+)
  extended_loops:
    max_per_invocation: 30   # Hard cap when using --max-loops
    early_exit_threshold: 4  # Defaults to threshold - 1
    auto_mode: false         # Skip prompts (for CI/CD)
```

**CLI Flags:**

| Flag | Description |
|------|-------------|
| `--max-loops {1-30}` | Extend loop limit (default: 3) |
| `--early-exit {1-5}` | Custom early exit threshold |
| `--auto` / `--no-prompt` | Skip prompts, continue to threshold |

**Best Practices:**

1. **For production PRs:** Use default settings (3 loops, threshold 5)
2. **For stubborn PRs:** Use `--max-loops 10` with early exit prompts
3. **For CI/CD:** Use `--auto` to skip prompts
4. **Monitor budget:** Track PR volume vs $30 included quota

---

## Environment Isolation

Claude Code manages execution environment isolation. KARIMO agents inherit Claude Code's sandboxed environment automatically.

---

## GitHub Authentication

### Scoped Tokens

Use fine-grained personal access tokens with minimum permissions:

| Permission | Level | Why |
|------------|-------|-----|
| Issues | Read & Write | Task issues |
| Pull requests | Read & Write | PR creation |
| Projects | Read & Write | Status tracking |
| Contents | Read & Write | Branch/code work |
| Metadata | Read | Required for tokens |

### Permissions NOT Needed

- Actions
- Administration
- Secrets
- Variables
- Webhooks
- Deployments

### Setup

1. GitHub → Settings → Developer Settings → Fine-grained tokens
2. Repository access: "Only select repositories"
3. Set minimum permissions above
4. Expiration: 90 days (force rotation)

### Workflow Permissions

KARIMO workflows use minimal permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

---

## PR Labels

KARIMO uses PR labels for tracking and workflow integration.

| Label | Applied By | Provider | Meaning |
|-------|-----------|----------|---------|
| `karimo` | PM Agent | Both | Identifies KARIMO-managed PRs |
| `karimo-{prd-slug}` | PM Agent | Both | Feature grouping |
| `wave-{n}` | PM Agent | Both | Wave number for execution ordering |
| `complexity-{n}` | PM Agent | Both | Task complexity score |
| `needs-revision` | PM Agent | Both | Review requested changes |
| `greptile-passed` | Greptile workflow | Greptile | Score >= 3 |
| `greptile-needs-revision` | Greptile workflow | Greptile | Score < 3 |
| `blocked-needs-human` | PM Agent | Both | Hard gate after 3 attempts |

**Note:** Claude Code Review uses inline comments with severity markers (🔴, 🟡, 🟣) instead of labels. PM Agent reads these from PR review comments.

To enable automated review, run `/karimo:configure --review` to choose your provider.

---

## Rollback Protocol

KARIMO provides structured rollback capabilities for error recovery.

### Task-Level Rollback

When a task fails validation after 3 loops:

1. **Pre-commit SHA recorded** — `rollback_sha` captured before worker spawn
2. **Validation failure** — Build/typecheck fails after 3 attempts
3. **Auto-rollback** — Task branch reset to `rollback_sha`
4. **Status update** — Task marked `rolled_back` with reason

**Implementation:**

The `safe_commit()` function in `karimo-git-worktree-ops` skill handles safe commits:

```bash
safe_commit() {
  PRE_SHA=$(git rev-parse HEAD)
  git add -A && git commit -m "$MESSAGE"

  # Run validation
  if ! $BUILD_CMD; then
    git reset --hard $PRE_SHA
    return 1
  fi
}
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

### Status Fields

Rollback events tracked in `status.json`:
- Task: `rollback_sha`, `rolled_back`, `rolled_back_at`, `rollback_reason`
- Feature: `rollback_event` object

---

## Best Practices

### For Developers

1. **Review boundaries** — Check `never_touch` and `require_review` before running agents
2. **Audit learnings** — Review rules captured in `.karimo/learnings/`
3. **Rotate tokens** — Set short expiration on GitHub tokens
4. **Monitor PRs** — Review agent-created PRs before merge

### For Organizations

1. **Branch protection** — Require PR reviews before merge
2. **CODEOWNERS** — Define owners for sensitive directories
3. **Audit logs** — Monitor agent activity
4. **Access limits** — Use team-scoped tokens

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
