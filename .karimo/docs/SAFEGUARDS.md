# KARIMO Safeguards

KARIMO enforces code quality and security through multiple layers: file boundaries, agent rules, worktree isolation, pre-PR validation, and automated code review.

---

## Safeguard Summary

| Safeguard | Description | Phase |
|-----------|-------------|-------|
| **File boundaries** | `never_touch` and `require_review` patterns | 1+ |
| **Agent rules** | Behavior constraints in KARIMO_RULES.md | 1+ |
| **Worktree isolation** | Each task runs in isolated directory | 1+ |
| **Pre-PR validation** | Build/typecheck before PR creation | 1+ |
| **Mandatory rebase** | Keeps task branches current | 1+ |
| **File overlap detection** | Prevents parallel conflicts | 1+ |
| **Environment sandboxing** | Filtered environment variables | 1+ |
| **Scoped GitHub tokens** | Minimum required permissions | 1+ |
| **Greptile review** | Automated code quality checks | 2+ |
| **Revision loops** | Agent self-correction on low scores | 2+ |

---

## File Boundaries

KARIMO enforces file boundaries defined in `CLAUDE.md` to protect sensitive files.

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

Agent behavior is constrained by rules defined in `.claude/KARIMO_RULES.md`.

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
| Task branch | `feature/{prd-slug}/{task-id}` | `feature/user-profiles/1a` |

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

**Conflict handling:** If rebase conflicts occur:
1. Task marked as `needs-human-rebase`
2. PM Agent moves to next task
3. Human resolves conflicts manually
4. Task can be resumed after resolution

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
- **Agents learn your patterns** — through CLAUDE.md learnings
- **Your CI stays authoritative** — GitHub Actions run your checks
- **Pre-PR validation uses your tools** — no KARIMO-specific tooling

### Teaching Agents Your Patterns

Use `/karimo:feedback` to capture project-specific conventions:

```
/karimo:feedback

> "Always use the existing Button component from src/components/ui/"
```

This appends rules to `CLAUDE.md` that all future agents read.

---

## Automated Code Review (Greptile)

Greptile integration is **optional but highly recommended**. It acts as a force multiplier — catching issues before human review and enabling automated revision loops.

### Why Greptile?

- **Catches issues early** — Before human review time is spent
- **Enables self-correction** — Agents can revise based on feedback
- **Consistent standards** — Same quality bar for every PR
- **Reduces review burden** — Humans focus on architecture, not style

### Review Flow

```
PR Created → karimo-review.yml triggers
                    │
                    ▼
            Greptile analyzes PR
                    │
                    ▼
            Posts review comment
                    │
            ┌───────┴───────┐
            │               │
        Score ≥ 4      Score < 4
            │               │
            ▼               ▼
    Add label:        Add label:
    review-passed     needs-revision
            │               │
            ▼               ▼
    Integration      Agent reads
    checks run       feedback
                          │
                          ▼
                     Revises code
                          │
                          ▼
                     Updates PR
                          │
                     (max 3 attempts)
```

### Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 4-5 | Good | Proceed to integration |
| 3 | Acceptable | Review flagged issues |
| 1-2 | Needs work | Automatic revision loop |

### Revision Loop Mechanics

When Greptile scores a PR below 4, KARIMO enters a revision loop:

1. Agent reads Greptile feedback
2. Analyzes specific issues flagged
3. Makes targeted fixes
4. Updates PR with new commit
5. Greptile re-reviews

**Loop awareness:**
- Maximum 5 loops per task before human intervention required
- Stall detection triggers after 3 loops without progress
- Model upgrade (Sonnet → Opus) may be attempted on stall
- After loop limit exhausted → mark for human review

### Setup

1. Get a Greptile API key from [greptile.com](https://greptile.com)
2. Add `GREPTILE_API_KEY` to your GitHub repository secrets
3. Ensure `karimo` label exists on your repository
4. PRs with `karimo` label trigger automated review

---

## Environment Sandboxing

Task agents receive a filtered environment to prevent accidental credential exposure.

### Always Included

Safe environment variables passed to agents:

| Variable | Purpose |
|----------|---------|
| `PATH` | Command execution |
| `HOME` | User directory |
| `TERM` | Terminal type |
| `SHELL` | Shell preference |
| `USER` | Username |
| `LANG`, `LC_ALL` | Locale settings |
| `TZ` | Timezone |
| `EDITOR`, `VISUAL` | Text editor |

### Always Excluded

Sensitive variables never passed to task agents:

| Variable | Why Excluded |
|----------|--------------|
| `GITHUB_TOKEN` | Repository access |
| `AWS_ACCESS_KEY_ID` | Cloud credentials |
| `AWS_SECRET_ACCESS_KEY` | Cloud credentials |
| `DATABASE_URL` | Database access |
| `OPENAI_API_KEY` | API credentials |
| `ANTHROPIC_API_KEY` | API credentials |
| `*_SECRET*` | Pattern for secrets |

### Custom Safe Variables

Add project-specific safe variables in config:

```yaml
sandbox:
  safe_env:
    - "NODE_ENV"
    - "DEBUG"
    - "LOG_LEVEL"
```

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

## GitHub Actions Workflows

### karimo-review.yml

Triggered on PR open/synchronize with `karimo` label:

- Calls Greptile API for code review
- Posts review as PR comment
- Adds `review-passed` or `needs-revision` label

### karimo-integration.yml

Triggered when PR has `review-passed` label:

- Runs build, lint, test, typecheck
- Adds `ready-to-merge` label on success
- Adds `integration-failed` label on failure

### karimo-sync.yml

Triggered when KARIMO PR is merged:

- Updates `status.json` with completion
- Creates final merge PR when all tasks done
- Updates GitHub Project board

---

## Best Practices

### For Developers

1. **Review boundaries** — Check `never_touch` and `require_review` before running agents
2. **Audit learnings** — Review rules captured in CLAUDE.md
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
