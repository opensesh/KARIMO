# /karimo:run — Execute PRD (Recommended)

Execute an approved PRD using feature branch workflow (v7.0). This command generates briefs, auto-reviews them, allows user iteration, and then orchestrates execution.

## Usage

```bash
/karimo:run --prd {slug} [--dry-run] [--skip-review] [--review-only] [--brief-only] [--resume] [--task {id}]
```

## Arguments

- `--prd {slug}` (required): The PRD slug to execute
- `--dry-run` (optional): Preview the execution plan without making changes
- `--skip-review` (optional): Skip brief review and execute immediately
- `--review-only` (optional): Generate briefs and review, stop without executing
- `--brief-only` (optional): Generate briefs only, stop before review
- `--resume` (optional): Resume execution after pausing
- `--task {id}` (optional): Execute only a specific task by ID

## What This Command Does (4 Phases)

KARIMO v7.0 introduces a 4-phase execution model with user iteration:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Brief Generation                                  │
│    Read research + PRD → Generate task briefs               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Auto-Review                                       │
│    Validate briefs → Challenge order/deps → Find gaps       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: User Iterate                                      │
│    Present recommendations → User feedback → Adjust briefs  │
│                    ↺ (loop until approved)                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Orchestrate                                       │
│    Execute tasks in waves → Create PRs → Validate           │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Brief Generation

1. **Load Research Context**
   - Read research findings from `.karimo/prds/{NNN}_{slug}/research/findings.md`
   - If missing: Warning but continue (legacy PRDs)

2. **Load PRD**
   - Read PRD from `.karimo/prds/{NNN}_{slug}/PRD_{slug}.md`
   - Load tasks from `tasks.yaml`

3. **Generate Task Briefs**
   - Spawn `karimo-brief-writer` agent
   - Generate briefs: `.karimo/prds/{NNN}_{slug}/briefs/*.md`
   - Each brief inherits research context

4. **Commit Briefs**
   ```bash
   git add .karimo/prds/{NNN}_{slug}/briefs/
   git commit -m "docs(karimo): generate task briefs for {slug}

   Generated {count} briefs with research context.

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

---

## Phase 2: Auto-Review

1. **Spawn Brief-Reviewer Agent**
   ```
   @karimo-brief-reviewer.md
   ```

2. **Challenge Briefs**
   - Task order makes sense?
   - Dependencies correctly specified?
   - File boundaries respected?
   - Gaps in coverage?
   - Conflicts between tasks?

3. **Generate Recommendations**
   - Create `recommendations.md` with findings
   - Categorize: Critical, Warning, Observation
   - Include suggested fixes

4. **Commit Review Findings**
   ```bash
   git add .karimo/prds/{NNN}_{slug}/recommendations.md
   git commit -m "docs(karimo): brief review findings for {slug}

   Critical: {n} | Warnings: {n} | Observations: {n}

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

---

## Phase 3: User Iterate

Present findings and allow user iteration:

```
╭──────────────────────────────────────────────────────────────╮
│  Brief Review Complete: {slug}                               │
╰──────────────────────────────────────────────────────────────╯

Generated {count} task briefs.

┌─────────────────────────────────────────────────────────────┐
│  Recommendations                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️  Critical ({n}):                                        │
│      • Task T002 should run before T001 (dependency issue)  │
│      • Task T004 references non-existent file               │
│                                                              │
│  ⚡ Warnings ({n}):                                         │
│      • Task T003 complexity may be underestimated           │
│                                                              │
│  ℹ️  Observations ({n}):                                    │
│      • Consider adding test for edge case X                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Options:
  1. Approve — Execute tasks as-is
  2. Apply fixes — Auto-correct critical issues, then execute
  3. Modify — Adjust briefs manually (opens editor)
  4. More research — Need additional context
  5. Cancel — Exit without executing

Your choice:
```

**Option 1 — Approve:**
- Proceed to Phase 4 (Orchestrate)

**Option 2 — Apply fixes:**
- Spawn `karimo-brief-corrector` to apply fixes
- Commit corrections:
  ```bash
  git add .karimo/prds/{NNN}_{slug}/briefs/ .karimo/prds/{NNN}_{slug}/tasks.yaml
  git commit -m "docs(karimo): apply brief corrections for {slug}

  Applied {n} critical fixes from review.

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```
- Proceed to Phase 4 (Orchestrate)

**Option 3 — Modify:**
- Accept user input for changes
- Regenerate affected briefs
- Loop back to Phase 2 (Auto-Review)

**Option 4 — More research:**
- Print: "Run `/karimo:research --prd {slug}` to add research context"
- Note: "Resume with `/karimo:run --prd {slug} --resume` after research completes"

**Option 5 — Cancel:**
- Exit without executing
- Briefs remain generated for later

---

## Phase 4: Orchestrate

After user approval:

1. **Create Feature Branch**
   - Branch: `feature/{prd-slug}` from main
   - Update `status.json` with `execution_mode: "feature-branch"`

2. **Execute Tasks in Waves**
   - Spawn `karimo-pm` agent (orchestrator)
   - Execute Wave 1 tasks in parallel (worktree isolation)
   - Wait for Wave 1 to complete
   - Execute Wave 2, etc.

3. **Create Task PRs**
   - Task PRs target feature branch (not main)
   - Labels: `karimo`, `karimo-{slug}`, `wave-{n}`, `complexity-{n}`

4. **Review Coordination** (Phase 2 adoption)
   - PM spawns `karimo-pm-reviewer` per task PR
   - PM-Reviewer handles Greptile/Code Review loops
   - PM-Reviewer spawns revision workers as needed
   - PM-Reviewer returns verdict (pass/fail/escalate)

5. **Finalization**
   - PM spawns `karimo-pm-finalizer` after all waves complete
   - PM-Finalizer handles cleanup, metrics, cross-PRD patterns
   - Set status to `ready-for-merge` when done
   - Print: "Run `/karimo:merge --prd {slug}` to create final PR"

### Agent Topology (v7.19)

Phase 4 uses a 3-agent architecture for maintainability:

```
┌─────────────────────────────────────────────────────────────┐
│  karimo-pm (Orchestrator)                                    │
│    • Wave execution loop                                     │
│    • Spawns worker agents                                    │
│    • Creates task PRs                                        │
│    • Delegates to specialized agents                         │
└─────────────────────────────────────────────────────────────┘
              │                              │
              │ per task PR                  │ once after all waves
              ↓                              ↓
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  karimo-pm-reviewer          │   │  karimo-pm-finalizer         │
│    • Review loops            │   │    • Cleanup (branches)       │
│    • Model escalation        │   │    • Metrics generation       │
│    • Revision workers        │   │    • Cross-PRD patterns       │
└─────────────────────────────┘   └─────────────────────────────┘
```

This decomposition keeps each agent focused (~500 lines) while maintaining clear handoff contracts.

---

## Research Integration

**Before brief generation**, KARIMO loads PRD research to inform briefs.

### Research Loading

1. Check PRD for `## Research Findings` section
2. Check for `research/findings.md` file
3. If found: Load into brief generation context
4. If missing: Warning but proceed (legacy PRDs)

### Legacy PRD Support

For PRDs created before v7.0 (without research):

```
⚠️  No research found for this PRD.

This PRD was created before v7.0 (research-first workflow).
Brief quality may be reduced.

Options:
  1. Continue without research
  2. Add research now (recommended)

Choice [1/2]:
```

---

## Benefits Over Direct-to-Main

- **Single production deployment** (vs 15+ with direct-to-main)
- **No deployment spam** (Vercel/Netlify/etc.)
- **Consolidated review** before main merge
- **Clean git history** with wave-based commits

---

## Skip Review

Use `--skip-review` to bypass brief review entirely:

```bash
/karimo:run --prd feature-name --skip-review
```

Execution proceeds directly from Phase 1 to Phase 4.

**When to skip:**
- You've already reviewed the PRD thoroughly
- Briefs are simple and low-risk
- You want to test the execution flow quickly

---

## Review Only

Use `--review-only` to stop after Phase 3:

```bash
/karimo:run --prd feature-name --review-only
```

**Use case:**
- Want to see potential issues before execution
- Need to manually review findings
- Gathering validation data for PRD improvements

After reviewing, run without `--review-only` to execute.

---

## Brief Only

Use `--brief-only` to stop after Phase 1:

```bash
/karimo:run --prd feature-name --brief-only
```

**Use case:**
- Just generate briefs for review
- Manual inspection before automated review
- Resume later with `--resume`

---

## Example

```bash
# List available PRDs
/karimo:run

# Execute specific PRD
/karimo:run --prd user-profiles

# Preview execution plan
/karimo:run --prd user-profiles --dry-run

# Generate briefs only
/karimo:run --prd user-profiles --brief-only

# Review but don't execute
/karimo:run --prd user-profiles --review-only
```

---

## After Execution

When all tasks complete, the feature branch is ready for final review:

```bash
# Create final PR to main
/karimo:merge --prd user-profiles
```

---

## Error Messages

### PRD Not Found

```
❌ Error: PRD 'user-auth' not found

Possible causes:
  1. PRD hasn't been created yet
  2. Wrong slug (check .karimo/prds/ for correct name)
  3. PRD was deleted or moved

How to fix:
  • List all PRDs: /karimo:dashboard
  • Start new feature: /karimo:research "user-auth"
  • Check PRD folder: ls .karimo/prds/

Need help? Run /karimo:help or check TROUBLESHOOTING.md
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
  • Complete approval: /karimo:plan --prd user-auth
  • Check status: cat .karimo/prds/*_user-auth/status.json
  • View PRD: cat .karimo/prds/*_user-auth/PRD_user-auth.md

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
  • Check execution status: /karimo:dashboard --prd user-auth
  • Resume execution: /karimo:run --prd user-auth --resume
  • Start fresh (deletes branch): git branch -D feature/user-auth && /karimo:run --prd user-auth

⚠️  Warning: Deleting the branch will lose all existing task PRs
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
  • Check task definition: cat .karimo/prds/*_user-auth/tasks.yaml | grep -A 10 "T001"
  • View PRD: cat .karimo/prds/*_user-auth/PRD_user-auth.md
  • Add research context: /karimo:research --prd user-auth
  • Check agent logs for specific error

If error persists:
  • Simplify task scope
  • Split into smaller tasks
  • Add more context to PRD
```

---

### Brief Review Found Critical Issues

```
❌ Error: Brief review found critical issues

Review findings require correction before execution.

Critical issues found: 3
  1. Task T001 references non-existent file: src/auth/login.ts
  2. Task T002 assumes Prisma, but project uses TypeORM
  3. Task T004 success criteria contradicts existing auth pattern

How to fix:
  • View findings: cat .karimo/prds/*_user-auth/recommendations.md
  • Choose "Apply fixes" to auto-correct
  • Or choose "Modify" for manual adjustment

To skip review (not recommended):
  /karimo:run --prd user-auth --skip-review
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
  • View tasks file: cat .karimo/prds/*_user-auth/tasks.yaml
  • Re-run interview: /karimo:plan --prd user-auth
  • Or add tasks manually to tasks.yaml

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

Then retry: /karimo:run --prd user-auth
```

**Not on main branch:**
```
❌ Error: Not on main branch

Feature branches must be created from main branch.

Current branch: feature/other-feature

How to fix:
  • Switch to main: git checkout main
  • Pull latest: git pull
  • Then retry: /karimo:run --prd user-auth

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

Then retry: /karimo:run --prd user-auth

Need help? Run /karimo:doctor
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:research` | Run research before planning (required) |
| `/karimo:plan` | Create PRD (before running) |
| `/karimo:merge` | Create final PR to main (after running) |
| `/karimo:dashboard` | Monitor execution progress |

---

## Technical Details

This command (v7.0) implements the 4-phase execution model:

- **Phase 1 — Brief Generation:** Spawns brief-writer with research context
- **Phase 2 — Auto-Review:** Spawns brief-reviewer for validation
- **Phase 3 — User Iterate:** Interactive approval/modification loop
- **Phase 4 — Orchestrate:** PM agent executes tasks in waves

**Key features:**
- Research-informed briefs from PRD research context
- Wave-based parallelization with worktree isolation
- User iteration loop before execution
- Git state reconciliation for crash recovery
- Task PRs target feature branch (consolidated with /karimo:merge)

**Legacy commands (deprecated):**
- `/karimo-execute` → Use `/karimo:run` instead
- `/karimo-orchestrate` → Use `/karimo:run` instead

---

*Generated by [KARIMO v7.0](https://github.com/opensesh/KARIMO)*
