# /karimo-orchestrate — Feature Branch Orchestration Command

> **⚠️ CONSOLIDATING:** This command is being consolidated into `/karimo-run` in v5.7+.
>
> **Recommended:** Use `/karimo-run` for the same functionality with research integration.
>
> **Benefits of `/karimo-run`:**
> - Research-informed briefs (improved quality)
> - Unified command interface
> - Additional flags: `--brief-only`, `--resume`, `--skip-research`, `--require-research`
>
> **To use recommended workflow:**
> 1. Run `/karimo-research --prd {slug}` to enhance PRD (recommended)
> 2. Run `/karimo-run --prd {slug}` to execute tasks
> 3. Run `/karimo-merge --prd {slug}` to create final PR
>
> This command remains available for backward compatibility but will be removed in v8.0.

---

Start autonomous execution of an approved PRD using feature branch aggregation (v5.0). Creates a feature branch, executes tasks, and prepares for final merge to main.

## Arguments

- `--prd {slug}` (optional): The PRD slug to orchestrate. If not provided, lists available PRDs.
- `--dry-run` (optional): Preview the execution plan without making changes.
- `--skip-review` (optional): Skip pre-execution review and execute immediately after brief generation.
- `--review-only` (optional): Generate briefs and run review, then stop without executing. Allows manual correction before proceeding.

## Prerequisites

Before orchestration, the PRD must be:
1. **Approved** via `/karimo-plan` (status: `ready`)

Note: For backward compatibility, `approved` status is treated as equivalent to `ready`.

## Behavior

### 1. PRD Selection

**If no `--prd` argument:**

List available PRDs from `.karimo/prds/`:

```
Available PRDs:

  001_user-profiles     ready     5 tasks
    Approved: 2 hours ago
    Ready to orchestrate

  002_token-studio      draft     — Not yet approved
    Resume: /karimo-plan --resume token-studio

  003_auth-refactor     active    3/8 tasks complete (feature-branch mode)
    Resume: /karimo-orchestrate --prd auth-refactor

Run: /karimo-orchestrate --prd user-profiles
```

**If `--prd` provided:**

Validate the PRD:
1. Check `.karimo/prds/{NNN}_{slug}/` exists
2. Verify `status.json` shows `status: "ready"`, `status: "approved"` (backward compat), or `status: "active"`
3. Load tasks and execution plan

### 2. Pre-Execution Checks

#### 2a. Validate GitHub Access

```bash
# 1. Validate GitHub MCP
# Use mcp__github__get_me to test connectivity
# If fails: "❌ GitHub MCP required but not available."

# 2. Validate gh CLI
gh auth status 2>/dev/null || { echo "❌ gh CLI authentication required."; exit 1; }

# 3. Validate label permissions
gh label list --repo "$OWNER/$REPO" --limit 1 2>/dev/null || {
  echo "❌ Cannot access repository labels"
  echo "Fix: gh auth refresh -s repo"
  exit 1
}
```

#### 2b. Pre-flight Display

```
╭──────────────────────────────────────────────────────────────╮
│  Orchestrate: user-profiles                                  │
╰──────────────────────────────────────────────────────────────╯

Mode: Feature Branch Aggregation (v5.0)
Feature Branch: feature/user-profiles (will be created)

Status: ready
Tasks: 5 tasks across 3 waves

Pre-flight checks:
  ✓ GitHub MCP connected
  ✓ Git repository clean
  ✓ GitHub CLI authenticated
  ✓ Repository access verified
  ✓ config.yaml loaded (commands, boundaries)

Benefits:
  • Single production deployment (vs 15+ with direct-to-main)
  • No Vercel/Netlify email spam
  • Consolidated review before main merge
  • Clean git history

Ready to begin orchestration?
```

**Pre-flight validation commands:**

```bash
# 1. Detect CLAUDE.md path
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
else
    CLAUDE_MD=""
fi

# 2. Check git is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes detected"
  exit 1
fi

# 3. Check GitHub CLI authenticated
gh auth status 2>/dev/null || { echo "❌ GitHub CLI not authenticated"; exit 1; }

# 4. Check config.yaml exists
[ -f ".karimo/config.yaml" ] || { echo "❌ config.yaml missing"; exit 1; }

# 5. Parse GitHub config
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repo:" .karimo/config.yaml | head -1 | awk '{print $2}')

if [ -z "$OWNER" ] || [ "$OWNER" = "_pending_" ]; then
  echo "❌ GitHub owner not configured"
  echo "   Run /karimo-configure to set up GitHub settings"
  exit 1
fi

# 6. Validate label access
gh label list --repo "$OWNER/$REPO" --limit 1 2>/dev/null || {
  echo "❌ Cannot access repository labels"
  exit 1
}

echo "✓ Pre-flight checks passed"
```

### 3. Feature Branch Creation

**Create feature branch from main before brief generation:**

```bash
# Get PRD slug from status.json
prd_slug=$(jq -r '.prd_slug' .karimo/prds/*/status.json | head -1)
feature_branch="feature/${prd_slug}"

# Ensure on main and up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b "$feature_branch"
git push -u origin "$feature_branch"

echo "✓ Feature branch created: $feature_branch"
```

**Update status.json with execution mode:**

```bash
# Add execution_mode and feature_branch fields
jq --arg branch "$feature_branch" \
  '. + {execution_mode: "feature-branch", feature_branch: $branch}' \
  .karimo/prds/{NNN}_{slug}/status.json > temp.json
mv temp.json .karimo/prds/{NNN}_{slug}/status.json

echo "✓ Execution mode: feature-branch"
echo "✓ Feature branch: $feature_branch"
```

**Commit status update:**

```bash
git add .karimo/prds/{NNN}_{slug}/status.json
git commit -m "feat(karimo): configure feature branch execution for ${prd_slug}

Execution mode: feature-branch
Feature branch: ${feature_branch}
Task PRs will target feature branch, not main.

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin "$feature_branch"
```

**Return to main for task execution:**

```bash
# PM agent and workers will use worktrees, so stay on main
git checkout main
```

### 4. Phase 1: Brief Generation

If briefs don't exist yet, generate them before execution:

```
Generating task briefs for: user-profiles

  [1a] Create UserProfile component... ✓
  [1b] Add user type definitions... ✓
  [2a] Implement profile edit form... ✓
  [2b] Add avatar upload... ✓
  [3a] Integration tests... ✓

Briefs saved to: .karimo/prds/001_user-profiles/briefs/
```

For each task, spawn the brief-writer agent:

```
@karimo-brief-writer.md
```

Pass:
- Task definition from `tasks.yaml`
- Relevant sections from `PRD.md`
- Project configuration from `CLAUDE.md`

After brief generation, present review options:

```
╭──────────────────────────────────────────────────────────────╮
│  Briefs Generated: user-profiles                             │
╰──────────────────────────────────────────────────────────────╯

5 task briefs created

  Wave 1:
    [1a] Create UserProfile component      complexity: 4  model: sonnet
    [1b] Add user type definitions         complexity: 2  model: sonnet

  Wave 2:
    [2a] Implement profile edit form       complexity: 5  model: opus
    [2b] Add avatar upload                 complexity: 4  model: sonnet

  Wave 3:
    [3a] Integration tests                 complexity: 3  model: sonnet

Options:
  1. Review briefs (recommended) — Validate against codebase
  2. Skip review — Execute immediately
  3. Cancel — Exit without executing

Your choice:
```

**Flag behavior:**
- If `--skip-review` provided: Skip to Phase 2 (PM agent spawn) immediately
- If `--review-only` provided: Continue to Phase 1.5 but stop after review (don't execute)

### 4a. Commit Task Briefs

**After all briefs are generated, commit them as a unit before spawning the PM agent.**

```bash
git add .karimo/prds/{NNN}_{slug}/briefs/
git commit -m "docs(karimo): generate task briefs for {slug}

{count} briefs generated for PRD {slug}.

Waves:
- Wave 1: {task_ids}
- Wave 2: {task_ids}
- ...

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Rationale:** Brief generation is a distinct logical unit from PRD creation and from task execution. If the session is interrupted after briefs are generated but before workers start, the briefs are safely committed.

**Note:** Briefs use slug-based naming for searchability: `{task_id}_{slug}.md` (e.g., `1a_user-profiles.md`).

### 4b. Phase 1.5: Pre-Execution Review Gate (Two-Stage)

After briefs are committed, offer pre-execution review to validate briefs against codebase reality.

**Skip if `--skip-review` flag provided.**

#### Stage 1: Investigation

If user chooses "Review briefs" (option 1):

1. **Create review directory:**
   ```bash
   mkdir -p .karimo/prds/{NNN}_{slug}/review/
   ```

2. **Spawn karimo-brief-reviewer agent:**
   ```
   @karimo-brief-reviewer.md
   ```

3. **Pass context to reviewer:**
   - PRD path: `.karimo/prds/{NNN}_{slug}/PRD_{slug}.md`
   - Briefs directory: `.karimo/prds/{NNN}_{slug}/briefs/`
   - Config path: `.karimo/config.yaml`
   - Learnings path: `.karimo/learnings.md` (if exists)

4. **Agent investigates and produces:**
   - Findings document: `.karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md`
   - Uses template: `.karimo/templates/PRE_EXECUTION_REVIEW_TEMPLATE.md`

5. **Commit findings immediately (atomic):**
   ```bash
   git add .karimo/prds/{NNN}_{slug}/review/
   git commit -m "docs(karimo): pre-execution review for {slug}

   Found {critical_count} critical findings, {warning_count} warnings.

   See review/PRD_REVIEW_pre-orchestration.md for details.

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

6. **Show findings summary to user:**
   ```
   ╭──────────────────────────────────────────────────────────────╮
   │  Review Complete: user-profiles                              │
   ╰──────────────────────────────────────────────────────────────╯

   Findings:
     Critical: 3 — Will likely cause execution failures
     Warnings: 2 — May cause issues
     Observations: 1 — FYI only

   Critical findings:
   - Finding 1: ESLint rule already at 'error' (Task 1a assumption incorrect)
   - Finding 2: Contradictory lint success criteria across Wave 1
   - Finding 3: Vitest projects not configured (Task 2b will fail)

   See: .karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md
   ```

#### Stage 2: Correction (Conditional)

After review commit, present correction options:

```
Options:
  1. Apply corrections (recommended) — Fix briefs automatically
  2. Skip corrections — Execute anyway (failures expected)
  3. Cancel — Exit for manual review

Your choice:
```

**If user chooses "Apply corrections" (option 1):**

1. **Spawn karimo-brief-corrector agent:**
   ```
   @karimo-brief-corrector.md
   ```

2. **Pass context to corrector:**
   - Findings path: `.karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md`
   - Briefs directory: `.karimo/prds/{NNN}_{slug}/briefs/`
   - PRD path: `.karimo/prds/{NNN}_{slug}/PRD_{slug}.md`
   - Tasks path: `.karimo/prds/{NNN}_{slug}/tasks.yaml`

3. **Agent applies corrections:**
   - Modifies task briefs based on findings
   - Updates PRD if needed
   - Creates new tasks if findings reveal missing work
   - Updates `tasks.yaml` if task structure changes

4. **Commit corrections (atomic):**
   ```bash
   git add .karimo/prds/{NNN}_{slug}/
   git commit -m "fix(karimo): apply pre-execution corrections for {slug}

   Applied {correction_count} corrections from review findings:
   - {correction_1_summary}
   - {correction_2_summary}
   - ...

   Modified:
   - {count} task briefs
   - {count} PRD sections (if any)
   - {count} new tasks created (if any)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

5. **Show correction summary:**
   ```
   Corrections Applied:

   Modified files:
   - BRIEF_1a.md (success criteria updated)
   - BRIEF_2b.md (config prerequisites added)
   - tasks.yaml (1 new task added: 1c-setup-vitest)

   Changes:
   - Finding 1: Updated Task 1a success criteria to reflect current state
   - Finding 2: Added timing qualifiers to Wave 1 success criteria
   - Finding 3: Created new Task 1c to configure vitest projects

   Skipped:
   - None (all critical findings corrected)

   Ready to proceed with execution.
   ```

6. **Proceed to Phase 2** (PM agent spawn)

**If user chooses "Skip corrections" (option 2):**

1. **Show warning:**
   ```
   ⚠️  Warning: Proceeding with {critical_count} critical findings

   Execution may fail due to unresolved issues. Findings are preserved
   in review/ directory for reference.

   Continue anyway?
   ```

2. **If confirmed:** Proceed to Phase 2 (PM agent spawn)

**If user chooses "Cancel" (option 3):**

Exit with message:
```
Review findings committed to git.

Next steps:
- Review findings: .karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md
- Edit briefs manually or re-run: /karimo-orchestrate --prd {slug}
```

**If `--review-only` flag provided:**

Stop after Stage 1 (findings commit), don't offer Stage 2 or execution.

Exit with message:
```
✓ Review complete

Findings: .karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md

Critical: {count} | Warnings: {count} | Observations: {count}

Next steps:
- Review findings document
- Apply corrections: /karimo-orchestrate --prd {slug}
- Or skip review: /karimo-orchestrate --prd {slug} --skip-review
```

#### Investigation Checklist (for Brief Reviewer)

The reviewer agent systematically checks:

1. **Assumption Validation:** Claims about current file states vs actual codebase
2. **Success Criteria Feasibility:** Cross-reference criteria for contradictions
3. **Configuration Prerequisites:** Verify configs exist (vitest projects, ESLint rules, etc.)
4. **File Structure:** Validate paths mentioned in briefs
5. **Dependency State:** Check wave ordering vs file overlaps
6. **Version Consistency:** Compare versions with existing patterns

#### Benefits of Pre-Execution Review

- **Early error detection:** Catch issues before wasting agent time/tokens
- **Higher success rate:** Workers start with accurate briefs
- **Reduced revision loops:** Fewer automated review failures from bad assumptions
- **Trust building:** Users gain confidence in KARIMO's thoroughness
- **Learning opportunity:** Findings feed into `.karimo/learnings.md` for future PRDs

### 5. Dry Run Mode

If `--dry-run` is specified, show the execution plan without acting:

```
Execution Plan for: user-profiles

Mode: Feature Branch Aggregation
Feature Branch: feature/user-profiles (will be created)

Tasks (5 approved):

  Wave 1 (parallel):
    [1a] Create UserProfile component      complexity: 4  model: sonnet
    [1b] Add user type definitions         complexity: 2  model: sonnet

  Wave 2 (parallel, after wave 1 merges to feature branch):
    [2a] Implement profile edit form       complexity: 5  model: opus
    [2b] Add avatar upload                 complexity: 4  model: sonnet

  Wave 3 (after wave 2 merges to feature branch):
    [3a] Integration tests                 complexity: 3  model: sonnet

Branch naming: {prd-slug}-{task-id}
  - user-profiles-1a, user-profiles-1b, etc.

PR target: feature/user-profiles (feature branch)
Final PR: feature/user-profiles → main (after /karimo-merge)

Model distribution: 4 sonnet, 1 opus
Parallel opportunities: 4 tasks across 2 waves

Ready to orchestrate? Run without --dry-run to start.
```

### 6. Resume Protocol

If `status.json` shows tasks already in progress, perform git state reconstruction:

**Git is truth. status.json is a cache.**

```
Resuming orchestration for: user-profiles

Reconciling state from git...

  [1a] status.json: running → git: merged to feature branch (PR #42) → UPDATED to done
  [1b] status.json: pending → git: no branch → OK (queued)
  [2a] status.json: running → git: branch exists, no PR → CRASHED
       Action: delete branch, re-execute
  [2b] status.json: queued → git: no branch → OK (queued)
  [3a] status.json: queued → git: no branch → OK (queued)

State reconciliation complete.

Completed: 1/5 tasks (merged to feature branch)
  ✓ [1a] Create UserProfile component (PR #42 merged)

Ready to Resume: 4 tasks
  ○ [1b] Add user type definitions (wave 1)
  ⟳ [2a] Implement profile edit form (crashed, will re-execute)
  ○ [2b] Add avatar upload (wave 2, waiting for wave 1)
  ○ [3a] Integration tests (wave 3, waiting for wave 2)

Continue orchestration?
```

**Reconciliation Algorithm:**

```bash
# Read feature branch from status.json
feature_branch=$(jq -r '.feature_branch' .karimo/prds/{NNN}_{slug}/status.json)

for task_id in $(get_task_ids); do
  branch="${prd_slug}-${task_id}"

  # Check if branch exists on remote
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    # Check for PR
    pr_data=$(gh pr list --head "$branch" --json state,number,mergedAt,baseRefName --jq '.[0]')

    if [ -n "$pr_data" ]; then
      state=$(echo "$pr_data" | jq -r '.state')
      base=$(echo "$pr_data" | jq -r '.baseRefName')

      # Verify PR targets feature branch
      if [ "$base" != "$feature_branch" ]; then
        echo "[WARNING] Task $task_id PR targets $base instead of $feature_branch"
      fi

      if [ "$state" = "MERGED" ]; then
        # Task complete
        update_status "$task_id" "done"
      else
        labels=$(gh pr view "$branch" --json labels --jq '.labels[].name')
        if echo "$labels" | grep -q "needs-revision"; then
          update_status "$task_id" "needs-revision"
        else
          update_status "$task_id" "in-review"
        fi
      fi
    else
      # Branch exists, no PR → agent crashed mid-execution
      echo "[RECONCILE] $task_id: branch exists but no PR → marking crashed"
      git push origin --delete "$branch" 2>/dev/null || true
      update_status "$task_id" "queued"
    fi
  else
    # No branch = check status.json
    current_status=$(get_status "$task_id")
    if [ "$current_status" = "done" ]; then
      # Trust status.json (branch was cleaned up after merge)
      :
    else
      update_status "$task_id" "queued"
    fi
  fi
done
```

### 7. Phase 2: Spawn PM Agent

Hand off to the PM agent for execution:

```
@karimo-pm.md
```

Pass:
- Project configuration from `.karimo/config.yaml` and `.karimo/learnings.md`
- PRD status (approved tasks, excluded tasks)
- Brief file paths for each task
- Execution plan from `execution_plan.yaml`
- **Execution mode: feature-branch** (PM will read from status.json)

**PM Agent Behavior:**
- Detects `execution_mode: "feature-branch"` from status.json
- Creates PRs targeting feature branch (not main)
- Executes waves sequentially within feature branch
- On completion: Sets status to `ready-for-merge` (does NOT finalize)
- Preserves feature branch and task branches for `/karimo-merge`

### 8. Completion

When PM Agent completes all waves:

```
╭──────────────────────────────────────────────────────────────╮
│  Orchestration Complete: user-profiles                       │
╰──────────────────────────────────────────────────────────────╯

Status: ready-for-merge

Tasks Complete: 5/5
  ✓ [1a] Create UserProfile component (PR #42)
  ✓ [1b] Add user type definitions (PR #43)
  ✓ [2a] Implement profile edit form (PR #44)
  ✓ [2b] Add avatar upload (PR #45)
  ✓ [3a] Integration tests (PR #46)

All PRs merged to: feature/user-profiles

Model Usage:
  Sonnet: 4 tasks
  Opus:   1 task (0 escalations)

Duration: 45 minutes

Next Step: /karimo-merge --prd user-profiles
This will create the final PR: feature/user-profiles → main
```

### 9. Post-Orchestration Actions

**After orchestration completes:**

1. **status.json** updated to `status: "ready-for-merge"` by PM
2. **Feature branch** preserved (contains all task commits)
3. **Task branches** preserved (for reference, cleaned up after final merge)
4. **metrics.json** generated by PM

**User runs `/karimo-merge` for final consolidation and PR to main.**

---

## Error Handling

### Feature Branch Already Exists

```bash
if git ls-remote --heads origin "$feature_branch" | grep -q "$feature_branch"; then
  echo "⚠ Feature branch already exists: $feature_branch"
  echo "Options:"
  echo "  1. Resume execution (if PRD is active)"
  echo "  2. Delete and recreate (if you want to start fresh)"
  echo "  3. Cancel"
  read -p "Your choice: " choice
fi
```

### Git State Conflicts

If main has diverged from feature branch during execution:

```
⚠ Main branch has new commits since feature branch creation.

Feature branch: feature/user-profiles (created 2 hours ago)
Main branch: 3 new commits since then

Recommendation: Complete current orchestration, then rebase feature branch
before running /karimo-merge.

Continue orchestration?
```

### Partial Completion

If some tasks fail or are blocked:

```
Orchestration Incomplete: user-profiles

Completed: 3/5 tasks
Blocked: 2 tasks

  ✓ [1a] Create UserProfile component (PR #42)
  ✓ [1b] Add user type definitions (PR #43)
  ✓ [2a] Implement profile edit form (PR #44)
  ✗ [2b] Add avatar upload (failed)
  ○ [3a] Integration tests (blocked by 2b)

Options:
  - Fix task 2b manually and re-run: /karimo-orchestrate --prd user-profiles
  - Skip task 2b and unblock 3a: Requires manual intervention
  - Review failed task logs and retry
```

---

## Notes

- **v5.0 feature:** Feature branch orchestration is the default and recommended workflow.
- **Backward compatibility:** Use `/karimo-execute` for v4.0 direct-to-main mode.
- **Feature branch lifecycle:** Created by `/karimo-orchestrate`, merged by `/karimo-merge`, cleaned up after final merge.
- **No production deployments until final merge:** Task PRs target feature branch, avoiding deployment spam.

---

*Generated by [KARIMO v5](https://github.com/opensesh/KARIMO)*
