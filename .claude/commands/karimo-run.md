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

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Create PRD (before running) |
| `/karimo-merge` | Create final PR to main (after running) |
| `/karimo-status` | Monitor execution progress |
| `/karimo-orchestrate` | Original command name (equivalent) |

---

*Generated by [KARIMO v5.2](https://github.com/opensesh/KARIMO)*
