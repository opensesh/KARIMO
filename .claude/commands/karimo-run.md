# /karimo-run — Execute PRD (Recommended)

Execute an approved PRD using feature branch workflow (v5.6). This is the recommended execution command that consolidates execution and orchestration with research integration.

## Usage

```bash
/karimo-run [--prd {slug}] [--dry-run] [--skip-review] [--review-only] [--brief-only] [--resume] [--skip-research] [--require-research] [--task {id}]
```

## Arguments

- `--prd {slug}` (optional): The PRD slug to execute. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--skip-review` (optional): Skip pre-execution brief review and execute immediately after brief generation.
- `--review-only` (optional): Generate briefs and run review, then stop without executing. Allows manual correction before proceeding.
- `--brief-only` (optional): Generate briefs and stop before execution. Use --resume to continue later.
- `--resume` (optional): Resume execution after pausing at brief generation.
- `--skip-research` (optional): Skip research recommendation if no research exists. Not recommended.
- `--require-research` (optional): Enforce research requirement, fail if no research found.
- `--task {id}` (optional): Execute only a specific task by ID.

## What This Command Does

1. **Checks for research** — Verifies PRD has research findings (recommended)
2. **Creates feature branch** — `feature/{prd-slug}` from main
3. **Generates task briefs** — Self-contained instructions for each task (inherits PRD research)
4. **Reviews briefs (optional)** — Validates briefs against codebase reality
5. **Applies corrections (optional)** — Fixes issues found during review
6. **Executes tasks in waves** — Parallel execution where possible
7. **Creates PRs** — Task PRs target feature branch (not main)
8. **Prepares for final merge** — Run `/karimo-merge` when complete

## Research Integration (v5.6)

**Before brief generation**, KARIMO checks for PRD research to ensure high-quality briefs.

### Research Check Logic

When `/karimo-run --prd {slug}` is executed:

1. **Check PRD for Research Findings section**
   - Read `PRD_{slug}.md`
   - Look for `## Research Findings` section

2. **If research exists:**
   - ✓ Proceed with brief generation
   - Briefs will inherit research context from PRD
   - Research-informed patterns, libraries, issues embedded in briefs

3. **If no research found:**
   - Display recommendation prompt:
     ```
     ⚠️  No research found for this PRD.

     KARIMO works best with research-informed briefs.
     Research discovers patterns, identifies issues, and provides
     concrete implementation guidance.

     Recommendation: /karimo-research --prd {slug}

     Options:
       1. Run research now (recommended)
       2. Continue without research

     Choice [1/2]:
     ```

4. **If user chooses "Run research now" (1):**
   - Execute `/karimo-research --prd {slug}`
   - Research completes and enhances PRD
   - Continue to brief generation with research context

5. **If user chooses "Continue without research" (2):**
   - Warn: "⚠️  Continuing without research. This may result in lower-quality briefs and increased execution errors."
   - Proceed to brief generation without research context

### Bypass Research Requirement

Use `--skip-research` to bypass the research prompt:

```bash
/karimo-run --prd user-profiles --skip-research
```

**Note:** Not recommended. Research significantly improves brief quality and reduces execution errors.

### Enforce Research Requirement

Use `--require-research` to fail if no research exists:

```bash
/karimo-run --prd user-profiles --require-research
```

Fails with error if `## Research Findings` section not found in PRD.

## Benefits Over Direct-to-Main

- **Single production deployment** (vs 15+ with direct-to-main)
- **No deployment spam** (Vercel/Netlify/etc.)
- **Consolidated review** before main merge
- **Clean git history** with wave-based commits

## Pre-Execution Review Workflow

After generating task briefs, KARIMO offers an optional pre-execution review to validate briefs against codebase reality:

### Default Behavior (Recommended)

```
Options:
  1. Review briefs (recommended) — Validate against codebase
  2. Skip review — Execute immediately
  3. Cancel — Exit without executing
```

**If you choose "Review briefs":**

1. **Investigation:** Agent validates assumptions, success criteria, and configurations against actual codebase
2. **Findings:** Produces document with critical/warning/observation categories
3. **Correction:** Choose to apply fixes automatically or proceed anyway

**Benefits:**
- Catches incorrect assumptions before execution
- Prevents contradictory success criteria
- Validates configuration prerequisites
- Significantly increases execution success rate

### Skip Review

Use `--skip-review` to bypass the review gate entirely:

```bash
/karimo-run --prd feature-name --skip-review
```

**When to skip:**
- You've already reviewed the PRD thoroughly
- Briefs are simple and low-risk
- You want to test the execution flow quickly

### Review Only

Use `--review-only` to review briefs without executing:

```bash
/karimo-run --prd feature-name --review-only
```

**Use case:**
- Want to see potential issues before committing to execution
- Need to manually review findings before proceeding
- Want to gather validation data for PRD improvements

After reviewing, run without `--review-only` to apply corrections and execute.

## Example

```bash
# List available PRDs
/karimo-run

# Execute specific PRD
/karimo-run --prd user-profiles

# Preview execution plan
/karimo-run --prd user-profiles --dry-run
```

## After Execution

When all tasks complete, the feature branch is ready for final review:

```bash
# Create final PR to main
/karimo-merge --prd user-profiles
```

## Technical Details

This command (v5.6+) consolidates execution and orchestration logic:
- **Research integration:** Checks for PRD research before brief generation
- **Brief generation:** Spawns brief-writer agent with PRD research context
- **Feature branch workflow:** Uses v5.0 feature branch aggregation model
- **PM orchestration:** Spawns PM agent for autonomous wave-based execution
- **Git state reconciliation:** Handles resume from any execution state
- **Wave-based parallelization:** Executes independent tasks in parallel waves
- **PR creation:** Task PRs target feature branch (consolidated with /karimo-merge)

**Legacy commands (deprecated in v5.7):**
- `/karimo-execute` → Use `/karimo-run` instead
- `/karimo-orchestrate` → Use `/karimo-run` instead

**Note:** For v5.6, `/karimo-run` still delegates to `/karimo-orchestrate` internally but adds research checking. Full consolidation in v6.0.

## Error Messages

### PRD Not Found

```
❌ Error: PRD 'user-auth' not found

Possible causes:
  1. PRD hasn't been created yet
  2. Wrong slug (check .karimo/prds/ for correct name)
  3. PRD was deleted or moved

How to fix:
  • List all PRDs: /karimo-status
  • Create new PRD: /karimo-plan
  • Check PRD folder: ls .karimo/prds/

Need help? Run /karimo-help or check TROUBLESHOOTING.md
```

---

### PRD Not Approved

```
❌ Error: PRD 'user-auth' is not approved for execution

Current status: draft

Possible causes:
  1. PRD interview not completed
  2. PRD saved but not approved
  3. PRD was modified after approval

How to fix:
  • Complete approval: /karimo-plan --resume user-auth
  • Check status: cat .karimo/prds/user-auth/status.json
  • View PRD: cat .karimo/prds/user-auth/prd.md

A PRD must have status: ready before execution.
```

---

### Feature Branch Already Exists

```
❌ Error: Feature branch 'feature/user-auth' already exists

This PRD has already been started.

Possible causes:
  1. Execution was started previously
  2. Manual feature branch creation
  3. Previous execution failed mid-way

How to fix:
  • Check execution status: /karimo-status --prd user-auth
  • Resume execution: /karimo-run --prd user-auth --resume
  • Start fresh (deletes branch): git branch -D feature/user-auth && /karimo-run --prd user-auth

⚠️  Warning: Deleting the branch will lose all existing task PRs
```

---

### Research Required But Missing

```
❌ Error: Research required but not found for PRD 'user-auth'

The --require-research flag was used, but this PRD has no research findings.

How to fix:
  1. Run research: /karimo-research --prd user-auth
  2. Remove --require-research flag to proceed without research (not recommended)

Why research matters:
  • Discovers existing patterns and conventions
  • Identifies potential implementation issues
  • Provides library and dependency recommendations
  • Significantly improves brief quality and reduces errors

Recommendation: Run /karimo-research before execution
```

---

### Brief Generation Failed

```
❌ Error: Brief generation failed for task 'T001'

Brief-writer agent encountered an error.

Possible causes:
  1. Insufficient PRD context for task
  2. Task references non-existent files
  3. Task dependencies unclear or circular
  4. Agent timeout or resource limits

How to fix:
  • Check task definition: cat .karimo/prds/user-auth/tasks.yaml | grep -A 10 "T001"
  • View PRD: cat .karimo/prds/user-auth/prd.md
  • Improve task description: /karimo-modify --prd user-auth
  • Check agent logs for specific error

If error persists:
  • Simplify task scope
  • Split into smaller tasks
  • Add more context to PRD
```

---

### Pre-Execution Review Failed

```
❌ Error: Pre-execution review found critical issues

Review findings require correction before execution can proceed.

Critical issues found: 3
  1. Task T001 references non-existent file: src/auth/login.ts
  2. Task T002 assumes Prisma, but project uses TypeORM
  3. Task T004 success criteria contradicts existing auth pattern

How to fix:
  • View findings: cat .karimo/prds/user-auth/findings.md
  • Apply corrections automatically: (re-run /karimo-run, choose "apply corrections")
  • Or fix manually: /karimo-modify --prd user-auth

After fixing, run again: /karimo-run --prd user-auth

To skip review (not recommended):
  /karimo-run --prd user-auth --skip-review
```

---

### No Tasks In PRD

```
❌ Error: No tasks found in PRD 'user-auth'

The tasks.yaml file is empty or missing.

Possible causes:
  1. PRD was approved before task decomposition
  2. tasks.yaml was deleted or corrupted
  3. Task generation failed during interview

How to fix:
  • View tasks file: cat .karimo/prds/user-auth/tasks.yaml
  • Re-run interview: /karimo-plan --resume user-auth
  • Or modify PRD: /karimo-modify --prd user-auth

A PRD must have at least 1 task to execute.
```

---

### Git Errors

**Uncommitted changes:**
```
❌ Error: Uncommitted changes in working directory

Git requires a clean working directory before creating feature branches.

Files with changes:
  M src/components/Button.tsx
  M package.json
  ?? src/new-file.ts

How to fix:
  • Commit changes: git add -A && git commit -m "your message"
  • Or stash changes: git stash
  • Or discard changes: git checkout -- . (caution!)

Then retry: /karimo-run --prd user-auth
```

**Not on main branch:**
```
❌ Error: Not on main branch

Feature branches must be created from main branch.

Current branch: feature/other-feature

How to fix:
  • Switch to main: git checkout main
  • Pull latest: git pull
  • Then retry: /karimo-run --prd user-auth

If you want to branch from non-main:
  1. Merge to main first
  2. Or manually create feature branch from current branch (not recommended)
```

**GitHub CLI not authenticated:**
```
❌ Error: GitHub CLI not authenticated

KARIMO requires gh CLI for PR management.

How to fix:
  1. Install gh: brew install gh (macOS) or see https://cli.github.com
  2. Authenticate: gh auth login
  3. Verify: gh auth status

Then retry: /karimo-run --prd user-auth

Need help? Run /karimo-doctor
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Create PRD (before running) |
| `/karimo-merge` | Create final PR to main (after running) |
| `/karimo-status` | Monitor execution progress |
| `/karimo-orchestrate` | Original command name (equivalent) |

---

*Generated by [KARIMO v5.2](https://github.com/opensesh/KARIMO)*
