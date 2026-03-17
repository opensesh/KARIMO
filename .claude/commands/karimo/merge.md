# /karimo:merge — Feature Branch Merge Command

Consolidate feature branch changes and create final PR to main. This completes the v5.0 feature branch workflow after all task PRs have been merged.

## Arguments

- `--prd {slug}` (required): The PRD slug to merge.
- `--skip-validation` (optional): Skip validation suite (use with caution).
- `--auto-merge` (optional): Automatically merge PR after creation (requires passing validation).

## Prerequisites

Before merge, the PRD must be:
1. **Orchestrated** via `/karimo:run` (execution_mode: "feature-branch")
2. **All tasks complete** (status: "ready-for-merge")
3. **Feature branch exists** with all task commits

## Behavior

### 1. Validation

Verify the PRD is ready for merge:

```bash
# 1. Check status.json
status=$(jq -r '.status' .karimo/prds/{NNN}_{slug}/status.json)
execution_mode=$(jq -r '.execution_mode' .karimo/prds/{NNN}_{slug}/status.json)
feature_branch=$(jq -r '.feature_branch' .karimo/prds/{NNN}_{slug}/status.json)

if [ "$status" != "ready-for-merge" ]; then
  echo "❌ PRD not ready for merge (status: $status)"
  echo "   Expected: ready-for-merge"
  echo "   Hint: Run /karimo:run --prd {slug} first"
  exit 1
fi

if [ "$execution_mode" != "feature-branch" ]; then
  echo "❌ PRD not using feature branch mode"
  echo "   This command is for v5.0 feature branch workflow only"
  echo "   For direct-to-main PRDs, tasks are already merged"
  exit 1
fi

# 2. Check feature branch exists
if ! git ls-remote --heads origin "$feature_branch" | grep -q "$feature_branch"; then
  echo "❌ Feature branch not found: $feature_branch"
  exit 1
fi

# 3. Check all tasks merged to feature branch
open_prs=$(gh pr list --label karimo-${prd_slug} --base "$feature_branch" --state open --json number --jq 'length')
if [ "$open_prs" -gt 0 ]; then
  echo "❌ $open_prs task PRs still open to feature branch"
  gh pr list --label karimo-${prd_slug} --base "$feature_branch" --state open
  echo "   Wait for all task PRs to merge before running /karimo:merge"
  exit 1
fi

echo "✓ PRD ready for merge"
```

### 2. Pre-Merge Display

```
╭──────────────────────────────────────────────────────────────╮
│  Merge Review: user-profiles                                 │
╰──────────────────────────────────────────────────────────────╯

Feature Branch: feature/user-profiles
Target: main

Tasks Complete: 5/5
  ✓ [1a] Create UserProfile component (PR #42)
  ✓ [1b] Add user type definitions (PR #43)
  ✓ [2a] Implement profile edit form (PR #44)
  ✓ [2b] Add avatar upload (PR #45)
  ✓ [3a] Integration tests (PR #46)

All PRs merged to feature branch ✓

Checking out feature branch...
```

### 3. Checkout Feature Branch

```bash
# Fetch latest and checkout feature branch
git fetch origin
git checkout "$feature_branch"
git pull origin "$feature_branch"

echo "✓ On feature branch: $feature_branch"
```

### 4. Generate Consolidated Diff

**Show unified diff from feature branch to main:**

```bash
# Get diff stats
files_changed=$(git diff main..."$feature_branch" --stat | tail -1)
additions=$(git diff main..."$feature_branch" --numstat | awk '{sum+=$1} END {print sum}')
deletions=$(git diff main..."$feature_branch" --numstat | awk '{sum+=$2} END {print sum}')

# Calculate markdown-specific statistics
md_files_changed=$(git diff main..."$feature_branch" --name-status | grep -E '\.(md|mdx)$' | wc -l | awk '{print $1}')
md_files_created=$(git diff main..."$feature_branch" --name-status | grep -E '^A.*\.(md|mdx)$' | wc -l | awk '{print $1}')

# Calculate markdown line additions/deletions
md_stats=$(git diff main..."$feature_branch" --numstat | grep -E '\.(md|mdx)$')
if [ -n "$md_stats" ]; then
  md_additions=$(echo "$md_stats" | awk '{sum+=$1} END {print sum}')
  md_deletions=$(echo "$md_stats" | awk '{sum+=$2} END {print sum}')
else
  md_additions=0
  md_deletions=0
fi

# Calculate code-only statistics (total minus markdown)
code_files_changed=$(($(git diff main..."$feature_branch" --name-status | wc -l | awk '{print $1}') - md_files_changed))
code_additions=$((additions - md_additions))
code_deletions=$((deletions - md_deletions))

echo "Consolidated Changes:"
echo "  Files changed: $files_changed"
echo "  Additions: +${additions} lines"
echo "  Deletions: -${deletions} lines"
echo ""
```

**Present file-level summary:**

```bash
git diff main..."$feature_branch" --name-status | while read status file; do
  case $status in
    A) echo "  + $file (new)" ;;
    M) echo "  ~ $file (modified)" ;;
    D) echo "  - $file (deleted)" ;;
  esac
done
```

### 5. Run Validation Suite

**Execute validation commands from config.yaml:**

```
Running validation suite...

  → Build... ✓ (12s)
  → Typecheck... ✓ (3s)
  → Lint... ✓ (2s)
  → Tests... ✓ (18s)
    15 tests, all passing

✓ All validations passed
```

**Validation logic:**

```bash
# Load validation commands from config.yaml
build_cmd=$(yq '.commands.build' .karimo/config.yaml)
typecheck_cmd=$(yq '.commands.typecheck' .karimo/config.yaml)
lint_cmd=$(yq '.commands.lint' .karimo/config.yaml)
test_cmd=$(yq '.commands.test' .karimo/config.yaml)

validation_failed=false

# Run build
if [ -n "$build_cmd" ] && [ "$build_cmd" != "null" ]; then
  echo "  → Build..."
  if eval "$build_cmd" > /tmp/karimo-build.log 2>&1; then
    echo "    ✓ Build passed"
  else
    echo "    ✗ Build failed"
    cat /tmp/karimo-build.log
    validation_failed=true
  fi
fi

# Run typecheck
if [ -n "$typecheck_cmd" ] && [ "$typecheck_cmd" != "null" ]; then
  echo "  → Typecheck..."
  if eval "$typecheck_cmd" > /tmp/karimo-typecheck.log 2>&1; then
    echo "    ✓ Typecheck passed"
  else
    echo "    ✗ Typecheck failed"
    cat /tmp/karimo-typecheck.log
    validation_failed=true
  fi
fi

# Run lint
if [ -n "$lint_cmd" ] && [ "$lint_cmd" != "null" ]; then
  echo "  → Lint..."
  if eval "$lint_cmd" > /tmp/karimo-lint.log 2>&1; then
    echo "    ✓ Lint passed"
  else
    echo "    ✗ Lint failed"
    cat /tmp/karimo-lint.log
    validation_failed=true
  fi
fi

# Run tests
if [ -n "$test_cmd" ] && [ "$test_cmd" != "null" ]; then
  echo "  → Tests..."
  if eval "$test_cmd" > /tmp/karimo-test.log 2>&1; then
    echo "    ✓ Tests passed"
    # Parse test count from output
    test_count=$(grep -oP '\d+(?= tests?)' /tmp/karimo-test.log | head -1)
    if [ -n "$test_count" ]; then
      echo "      $test_count tests, all passing"
    fi
  else
    echo "    ✗ Tests failed"
    cat /tmp/karimo-test.log
    validation_failed=true
  fi
fi

if [ "$validation_failed" = true ]; then
  echo ""
  echo "❌ Validation failed"
  echo "   Fix issues on feature branch and retry: /karimo:merge --prd {slug}"
  exit 1
fi

echo ""
echo "✓ All validations passed"
```

**If `--skip-validation` is provided:**

```
⚠ Skipping validation suite (--skip-validation)

WARNING: Proceeding without validation may introduce issues to main.
Only use this flag if you've manually verified the feature branch.
```

### 5b. Coverage Analysis (Conditional)

**Detect if coverage reports exist and spawn coverage reviewer:**

```bash
# Detect coverage format (codebase-agnostic)
coverage_file=""
format=""

if [ -f "coverage/coverage-summary.json" ]; then
  coverage_file="coverage/coverage-summary.json"
  format="istanbul"
elif [ -f "coverage/lcov.info" ]; then
  coverage_file="coverage/lcov.info"
  format="lcov"
elif [ -f "coverage.xml" ]; then
  coverage_file="coverage.xml"
  format="cobertura"
elif [ -f ".coverage" ]; then
  coverage_file=".coverage"
  format="python"
fi

# If coverage exists, spawn coverage review agent
if [ -n "$coverage_file" ]; then
  echo "Coverage report detected: $coverage_file (format: $format)"
  echo "Spawning coverage reviewer..."

  # Spawn karimo-coverage-reviewer agent to analyze coverage and add PR comments
  # Agent will:
  # 1. Parse coverage report
  # 2. Cross-reference with task briefs for intentionally uncovered lines
  # 3. Add explanatory comment to PR
fi
```

**If no coverage report found:**
```
Note: No coverage report detected. Skipping coverage analysis.
```

---

### 6. Integration Analysis

**Detect potential integration issues:**

```bash
# Check for files modified in both feature branch and main since divergence
merge_base=$(git merge-base main "$feature_branch")
feature_files=$(git diff --name-only "$merge_base" "$feature_branch")
main_files=$(git diff --name-only "$merge_base" main)

conflicts=$(comm -12 <(echo "$feature_files" | sort) <(echo "$main_files" | sort))

if [ -n "$conflicts" ]; then
  echo "Integration Notes:"
  echo "  ⚠ Files modified in both feature branch and main:"
  echo "$conflicts" | while read file; do
    echo "    - $file"
  done
  echo ""
  echo "  Recommendation: Review these files for merge conflicts"
else
  echo "Integration Notes:"
  echo "  ✓ No conflicts with current main"
fi
```

**Check for dependency changes:**

```bash
# Check if package.json or similar changed
if git diff main..."$feature_branch" --name-only | grep -qE 'package\.json|Gemfile|requirements\.txt|go\.mod|Cargo\.toml'; then
  echo "  ⚠ Dependencies changed"
  echo "    Review dependency updates before merging"
fi
```

### 7. Present Merge Review

**Consolidated review for user approval:**

```
╭──────────────────────────────────────────────────────────────╮
│  Feature Branch Review: user-profiles                        │
╰──────────────────────────────────────────────────────────────╯

Tasks Complete: 5/5
  ✓ [1a] Create UserProfile component (PR #42)
  ✓ [1b] Add user type definitions (PR #43)
  ✓ [2a] Implement profile edit form (PR #44)
  ✓ [2b] Add avatar upload (PR #45)
  ✓ [3a] Integration tests (PR #46)

Consolidated Changes:
  Files changed: 12 files changed, 450 insertions(+), 23 deletions(-)
  Additions: +450 lines
  Deletions: -23 lines

Validation:
  ✓ Build passes
  ✓ Typecheck passes
  ✓ Lint passes
  ✓ Tests pass (15 tests, all passing)

Integration Notes:
  - UserProfile types used across 3 components
  - Avatar upload integrated with ProfileForm
  - No conflicts with current main

Ready to create final PR: feature/user-profiles → main?
[y/N]
```

### 8. Create Final PR

**After user approval:**

```bash
# Parse GitHub config
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repo:" .karimo/config.yaml | head -1 | awk '{print $2}')

# Generate PR body
pr_body="## KARIMO Feature Branch Merge

**PRD:** ${prd_slug}
**Mode:** Feature Branch Aggregation (v5.0)

### Summary

This PR consolidates ${task_count} completed tasks from the feature branch into a single production deployment.

### Tasks Completed

$(jq -r '.tasks | to_entries | map("- [" + .key + "] " + .value.title + " (PR #" + (.value.pr_number | tostring) + ")") | join("\n")' .karimo/prds/{NNN}_{slug}/status.json)

### Changes

**Total:**
- Files changed: ${files_changed}
- Additions: +${additions} lines
- Deletions: -${deletions} lines

**Breakdown:**
- Docs: ${md_files_changed} files (${md_files_created} new), +${md_additions}/-${md_deletions} lines
- Code: ${code_files_changed} files, +${code_additions}/-${code_deletions} lines

### Validation

- ✓ Build passes
- ✓ Typecheck passes
- ✓ Lint passes
- ✓ Tests pass (${test_count} tests)

### Model Usage

- Sonnet: ${sonnet_count} tasks
- Opus: ${opus_count} tasks

---
🤖 Generated by [KARIMO v5](https://github.com/opensesh/KARIMO)
"

# Create PR via GitHub MCP
pr_number=$(gh pr create \
  --repo "$OWNER/$REPO" \
  --head "$feature_branch" \
  --base main \
  --title "feat(${prd_slug}): Complete feature implementation" \
  --body "$pr_body" \
  --label "karimo,karimo-${prd_slug},final-merge" \
  | grep -oP '(?<=pull/)\d+')

echo "✓ Final PR created: #$pr_number"
echo "   View: https://github.com/$OWNER/$REPO/pull/$pr_number"
```

### 8b. Greptile Review (One Auto Loop, Then Human)

**If `review.provider: greptile` in config.yaml, run ONE automatic revision loop:**

This runs immediately after PR creation. The flow is:
1. Trigger @greptileai
2. Wait for score
3. If < threshold: ONE automatic revision attempt
4. After revision: if still < threshold → human review required (no more auto-loops)

```bash
# Check if Greptile is configured
review_provider=$(grep -A 3 'review:' .karimo/config.yaml 2>/dev/null | grep 'provider:' | awk '{print $2}')

if [ "$review_provider" != "greptile" ]; then
  echo "Note: No Greptile review configured. Skipping automated review."
  # Continue to human review
else
  # Read config
  threshold=$(grep -A 5 'review:' .karimo/config.yaml | grep 'threshold:' | awk '{print $2}')
  threshold=${threshold:-5}

  echo "Starting Greptile review..."
  echo "  Threshold: ${threshold}/5"
  echo "  Mode: One automatic revision, then human review"
fi
```

**Step 1: Trigger @greptileai**

```bash
# Check if @greptileai comment already exists
comments=$(gh pr view $pr_number --json comments --jq '.comments[].body')

if ! echo "$comments" | grep -q '@greptileai'; then
  echo "Triggering Greptile review..."
  gh pr comment $pr_number --body "@greptileai"
  echo "  ✓ @greptileai comment added"
else
  echo "  ✓ @greptileai already triggered"
fi
```

**Step 2: Wait for Greptile review**

```bash
echo "Waiting for Greptile to review PR..."

review_found=false
for i in {1..20}; do
  comments=$(gh pr view $pr_number --json comments --jq '.comments[].body')

  # Look for Greptile review with confidence score
  if echo "$comments" | grep -qE 'confidence.*[0-5]/5|[0-5]/5.*confidence'; then
    review_found=true
    break
  fi

  echo "  Waiting... (attempt $i/20)"
  sleep 30
done

if [ "$review_found" = false ]; then
  echo ""
  echo "╭────────────────────────────────────────────────╮"
  echo "│  ⚠ Greptile Review Timeout                     │"
  echo "╰────────────────────────────────────────────────╯"
  echo ""
  echo "Greptile review not received within 10 minutes."
  echo "This may indicate:"
  echo "  - Greptile GitHub App not installed on this repo"
  echo "  - Repository not indexed in Greptile dashboard"
  echo "  - Greptile service outage"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check https://app.greptile.com for your repo"
  echo "  2. Verify the Greptile GitHub App is installed"
  echo "  3. Run /karimo:configure --greptile to reconfigure"
  echo ""
  echo "Proceeding to human review without Greptile score."
  # Continue to human review
fi
```

**Step 3: Parse initial score**

```bash
# Extract the most recent Greptile review
greptile_review=$(gh pr view $pr_number --json comments --jq '
  .comments | map(select(.body | test("confidence.*[0-5]/5|[0-5]/5.*confidence"))) | last | .body
')

# Parse confidence score (tail -1 to get most recent if multiple scores present)
score=$(echo "$greptile_review" | grep -oE '[0-5]/5' | tail -1 | cut -d'/' -f1)
score=${score:-0}

echo "Greptile score: ${score}/5 (threshold: ${threshold}/5)"
```

**Step 4: First check — if passes, done**

```bash
if [ "$score" -ge "$threshold" ]; then
  echo ""
  echo "╭────────────────────────────────────────────────╮"
  echo "│  ✓ Greptile Review Passed                      │"
  echo "╰────────────────────────────────────────────────╯"
  echo "  Score: ${score}/5 (threshold: ${threshold}/5)"
  echo ""
  echo "PR is ready for human review."
  # Continue to human review (PR ready to merge)
fi
```

**Step 5: ONE automatic revision attempt (if score < threshold)**

```bash
if [ "$score" -lt "$threshold" ]; then
  echo ""
  echo "╭────────────────────────────────────────────────╮"
  echo "│  Automatic Revision (1 of 1)                   │"
  echo "╰────────────────────────────────────────────────╯"
  echo ""
  echo "Score ${score}/5 is below threshold ${threshold}/5."
  echo "Starting ONE automatic revision attempt..."

  # Extract P1/P2 findings from inline review comments
  findings=$(gh api repos/{owner}/{repo}/pulls/${pr_number}/comments --jq '
    .[] | select(.body | test("P[123]:")) |
    "- " + (.path // "general") + ":" + (.line // "N/A" | tostring) + " " + .body
  ')

  p1_findings=$(echo "$findings" | grep -E 'P1:' || true)
  p2_findings=$(echo "$findings" | grep -E 'P2:' || true)

  echo ""
  echo "Findings to address:"
  if [ -n "$p1_findings" ]; then
    echo "  P1 (Critical):"
    echo "$p1_findings" | sed 's/^/    /'
  fi
  if [ -n "$p2_findings" ]; then
    echo "  P2 (Important):"
    echo "$p2_findings" | sed 's/^/    /'
  fi

  # Spawn Review/Architect agent to fix findings
  echo ""
  echo "Spawning Review/Architect agent to fix findings..."

  # The agent receives context:
  # > Greptile review score: {score}/5 (threshold: {threshold}/5)
  # > Fix these issues in priority order:
  # > {p1_findings}
  # > {p2_findings}

  # Agent makes fixes and commits to feature branch
  # ... Review/Architect agent execution ...

  # Push changes
  git push origin "$feature_branch"
  echo "  ✓ Fixes pushed to $feature_branch"

  # Wait for Greptile to auto-review (triggered by push)
  echo ""
  echo "Waiting for Greptile re-review..."
  sleep 30  # Give Greptile time to start

  new_score=$score
  for i in {1..10}; do
    # Get latest Greptile comment (after our push)
    latest_review=$(gh pr view $pr_number --json comments --jq '
      .comments | map(select(.body | test("confidence.*[0-5]/5"))) | last | .body
    ')

    check_score=$(echo "$latest_review" | grep -oE '[0-5]/5' | tail -1 | cut -d'/' -f1)

    if [ "$check_score" != "$score" ]; then
      new_score=$check_score
      echo "  New score: ${new_score}/5"
      break
    fi

    echo "  Waiting for re-review... (attempt $i/10)"
    sleep 30
  done
fi
```

**Step 6: Report result after revision**

```bash
echo ""
if [ "$new_score" -ge "$threshold" ]; then
  echo "╭────────────────────────────────────────────────╮"
  echo "│  ✓ Greptile Review Passed (After Revision)     │"
  echo "╰────────────────────────────────────────────────╯"
  echo "  Score: ${new_score}/5 (threshold: ${threshold}/5)"
  echo ""
  echo "PR is ready for human review."
else
  echo "╭────────────────────────────────────────────────╮"
  echo "│  Human Review Required                         │"
  echo "╰────────────────────────────────────────────────╯"
  echo ""
  echo "  Score: ${new_score}/5 (threshold: ${threshold}/5)"
  echo "  Automatic revision attempted but score still below threshold."
  echo ""
  echo "  Remaining findings require human attention."
  echo "  Review the PR and address issues manually, or accept current score."
  echo ""
  echo "  Options:"
  echo "    1. Review Greptile findings and fix manually"
  echo "    2. Accept the current score and merge"
  echo "    3. Close the PR and revisit the PRD"
fi
```

**Display summary:**

```
╭──────────────────────────────────────────────────────────────╮
│  Greptile Review Complete                                     │
╰──────────────────────────────────────────────────────────────╯

  Score: 5/5 ✓
  Threshold: 5/5
  Revision: 1 attempt (passed after revision)

  Automated fixes applied:
    - Removed unused import (UserProfile.tsx:12)
    - Added type narrowing (ProfileForm.tsx:45)
    - Fixed null check (api/profile.ts:89)

PR #47 is ready for human review.
View: https://github.com/org/repo/pull/47
```

### 9. Update Status

**Mark PRD as merging:**

```bash
jq --arg pr "$pr_number" --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '.status = "merging" | .final_pr_number = ($pr | tonumber) | .final_pr_created_at = $timestamp' \
  .karimo/prds/{NNN}_{slug}/status.json > temp.json
mv temp.json .karimo/prds/{NNN}_{slug}/status.json

git add .karimo/prds/{NNN}_{slug}/status.json
git commit -m "chore(karimo): mark ${prd_slug} as merging

Final PR: #${pr_number}
Status: ready-for-merge → merging

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin "$feature_branch"
```

### 10. Auto-Merge (Optional)

**If `--auto-merge` is provided:**

```bash
# Wait for CI checks to pass
echo "Waiting for CI checks..."
gh pr checks "$pr_number" --watch

# Check all checks passed
if gh pr checks "$pr_number" | grep -q "fail"; then
  echo "❌ CI checks failed, cannot auto-merge"
  echo "   Review PR and merge manually: https://github.com/$OWNER/$REPO/pull/$pr_number"
  exit 1
fi

# Merge PR
gh pr merge "$pr_number" --squash --delete-branch

echo "✓ PR merged and feature branch deleted"
```

**Otherwise:**

```
Final PR created: #${pr_number}
View: https://github.com/$OWNER/$REPO/pull/$pr_number

Next steps:
  1. Review the PR
  2. Merge when ready (recommended: squash merge)
  3. Feature branch will be deleted after merge

When PR is merged, KARIMO will automatically:
  - Update status.json to "complete"
  - Record merge timestamp
  - Clean up task branches
```

### 11. Post-Merge Cleanup (Synchronous)

**This runs immediately after final PR merges — no webhook dependency.**

```bash
# For --auto-merge: runs after gh pr merge succeeds
# For manual merge: poll for merge completion
if [ "$auto_merge" != "true" ]; then
  echo "Waiting for PR #${pr_number} to merge..."
  while true; do
    state=$(gh pr view "$pr_number" --json state --jq '.state')
    [ "$state" = "MERGED" ] && break
    [ "$state" = "CLOSED" ] && { echo "PR closed without merge"; exit 1; }
    sleep 10
  done
fi

# Update status.json to complete
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ... update status.json ...

# Delete any remaining worktree branches (safety net)
# New naming: worktree/{prd-slug}-{task-id}
for task_id in $(jq -r '.tasks | keys[]' .karimo/prds/{NNN}_{slug}/status.json); do
  branch="worktree/${prd_slug}-${task_id}"
  git push origin --delete "$branch" 2>/dev/null || true
done

# Also clean up any legacy worktree-agent-* branches (Claude Code internal)
git ls-remote --heads origin 2>/dev/null | grep -E "worktree[-/]" | \
  awk -F'/' '{print $NF}' | while read branch; do
    git push origin --delete "$branch" 2>/dev/null || true
  done

# Clean up remaining worktrees
if [ -d ".worktrees/${prd_slug}" ]; then
  for wt in .worktrees/${prd_slug}/*; do
    git worktree remove "$wt" 2>/dev/null || true
  done
  rmdir ".worktrees/${prd_slug}" 2>/dev/null || true
fi

git worktree prune
echo "✓ Post-merge cleanup complete"
```

**Present completion summary:**

```
╭──────────────────────────────────────────────────────────────╮
│  Feature Complete: user-profiles                             │
╰──────────────────────────────────────────────────────────────╯

Status: complete
Final PR: #47 (merged to main)

Tasks: 5/5 complete
Duration: 45 minutes
Production Deployments: 1 (vs 15+ with direct-to-main)

Model Usage:
  Sonnet: 4 tasks
  Opus:   1 task (0 escalations)

Branch Cleanup:
  ✓ feature/user-profiles (deleted)
  ✓ worktree/user-profiles-1a (deleted)
  ✓ worktree/user-profiles-1b (deleted)
  ✓ worktree/user-profiles-2a (deleted)
  ✓ worktree/user-profiles-2b (deleted)
  ✓ worktree/user-profiles-3a (deleted)

Consider running /karimo:feedback to capture learnings.
```

---

## Error Handling

### Validation Failures

```
❌ Validation failed: Tests failed

Test output:
  FAIL src/components/ProfileForm.test.tsx
    ● ProfileForm › should handle avatar upload

      Expected mock function to have been called with:
        {uploadUrl: "http://example.com"}
      But was called with:
        {uploadUrl: undefined}

Fix the issue on feature branch and retry:
  1. Checkout feature branch: git checkout feature/user-profiles
  2. Fix failing tests
  3. Push changes: git push origin feature/user-profiles
  4. Retry merge: /karimo:merge --prd user-profiles
```

### Merge Conflicts with Main

```
⚠ Merge conflicts detected

Main branch has diverged since feature branch creation:
  - 3 new commits on main
  - 2 files conflict: src/types/user.ts, src/components/UserProfile.tsx

Resolution:
  1. Rebase feature branch on main:
     git checkout feature/user-profiles
     git rebase main
  2. Resolve conflicts
  3. Force push: git push --force-with-lease origin feature/user-profiles
  4. Retry merge: /karimo:merge --prd user-profiles

Or use GitHub's merge UI to resolve conflicts in PR.
```

### Feature Branch Missing

```
❌ Feature branch not found: feature/user-profiles

This PRD's feature branch has been deleted or never created.

Check:
  - Was /karimo:run run for this PRD?
  - Was the feature branch accidentally deleted?

Recovery:
  - If tasks are complete but branch missing, create PR manually
  - If tasks incomplete, restart with /karimo:run --prd user-profiles
```

---

## Notes

- **Final PR recommended merge method:** Squash merge (consolidates all task commits into one)
- **GitHub auto-delete:** Configure GitHub to auto-delete branches after merge
- **CI/CD:** Final PR triggers production deployment (one deployment per PRD)
- **Greptile review:** Semi-automatic. If configured, KARIMO triggers @greptileai, parses findings, and attempts ONE automatic revision. If still below threshold after revision, human review is required.
- **Human review:** Required after (1) Greptile passes, (2) one revision attempt fails, or (3) Greptile times out
- **Branch cleanup:** Task branches deleted after final PR merges

---

*Generated by [KARIMO v5](https://github.com/opensesh/KARIMO)*
