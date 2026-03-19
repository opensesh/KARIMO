# /karimo:greptile-review — Standalone Greptile Review Loop

Execute the full Greptile review cycle on a PR, looping until score meets threshold or circuit breaker triggers.

## Arguments

- `--pr <number>` (required): The PR number to review.
- `--threshold <1-5>` (optional): Target score (default: from config.yaml or 5).
- `--max-loops <1-5>` (optional): Maximum revision attempts (default: from config.yaml or 3).

## Usage

```bash
# Standard usage (reads config from config.yaml)
/karimo:greptile-review --pr 123

# Override threshold and max loops
/karimo:greptile-review --pr 123 --threshold 4 --max-loops 2

# Called by /karimo:merge (internal use)
/karimo:greptile-review --pr 123 --internal
```

## Prerequisites

1. **Greptile configured** — `review.provider: greptile` in `.karimo/config.yaml`
2. **Greptile GitHub App installed** — On the repository
3. **Repository indexed** — In Greptile dashboard (app.greptile.com)
4. **PR exists and is open** — Cannot review closed or merged PRs

## Behavior

### Step 1: Initialize

```bash
# Load configuration
review_provider=$(yq '.review.provider' .karimo/config.yaml)
threshold=${THRESHOLD:-$(yq '.review.threshold // 5' .karimo/config.yaml)}
max_loops=${MAX_LOOPS:-$(yq '.review.max_revision_loops // 3' .karimo/config.yaml)}

# Validate Greptile is configured
if [ "$review_provider" != "greptile" ]; then
  echo "❌ Greptile not configured"
  echo "   Run: /karimo:configure --greptile"
  exit 1
fi

# Validate PR exists and is open
pr_state=$(gh pr view $pr_number --json state --jq '.state')
if [ "$pr_state" != "OPEN" ]; then
  echo "❌ PR #$pr_number is not open (state: $pr_state)"
  exit 1
fi

# Get PR metadata for context
pr_branch=$(gh pr view $pr_number --json headRefName --jq '.headRefName')
pr_base=$(gh pr view $pr_number --json baseRefName --jq '.baseRefName')
pr_title=$(gh pr view $pr_number --json title --jq '.title')

echo "╭────────────────────────────────────────────────╮"
echo "│  Greptile Review: PR #$pr_number"
echo "╰────────────────────────────────────────────────╯"
echo ""
echo "  Branch: $pr_branch → $pr_base"
echo "  Title: $pr_title"
echo "  Threshold: ${threshold}/5"
echo "  Max loops: $max_loops"
echo ""
```

### Step 2: Worktree Cleanup Verification (Belt-and-Suspenders)

Before starting review, verify no stale worktrees exist that could interfere:

```bash
# Extract PRD slug from branch name if available
# Branch naming: worktree/{prd-slug}-{task-id} or feature/{prd-slug}
prd_slug=""
if [[ "$pr_branch" =~ ^worktree/([^-]+) ]]; then
  prd_slug="${BASH_REMATCH[1]}"
elif [[ "$pr_branch" =~ ^feature/(.+)$ ]]; then
  prd_slug="${BASH_REMATCH[1]}"
fi

if [ -n "$prd_slug" ] && [ -d ".worktrees/${prd_slug}" ]; then
  stale_count=$(find ".worktrees/${prd_slug}" -type d -mindepth 1 2>/dev/null | wc -l | tr -d ' ')

  if [ "$stale_count" -gt 0 ]; then
    echo "⚠️  Found $stale_count stale worktrees for ${prd_slug}"
    echo "   Cleaning up before review..."

    for wt in .worktrees/${prd_slug}/*; do
      if [ -d "$wt" ]; then
        git worktree remove "$wt" 2>/dev/null || true
        echo "   Removed: $(basename $wt)"
      fi
    done

    git worktree prune
    echo "   ✓ Worktree cleanup complete"
    echo ""
  fi
fi
```

### Step 3: Trigger Greptile Review

```bash
# Check if @greptileai comment already exists
existing_trigger=$(gh pr view $pr_number --json comments --jq '
  .comments[] | select(.body | test("@greptileai")) | .createdAt
' | head -1)

if [ -z "$existing_trigger" ]; then
  echo "Triggering Greptile review..."
  gh pr comment $pr_number --body "@greptileai"
  echo "  ✓ @greptileai comment added"
else
  echo "  ✓ @greptileai already triggered at $(echo $existing_trigger | cut -d'T' -f1)"
fi
```

### Step 4: Wait for Greptile Review

```bash
echo ""
echo "Waiting for Greptile to review PR..."

review_found=false
for i in {1..20}; do
  # Get all comments containing confidence score
  latest_review=$(gh pr view $pr_number --json comments --jq '
    .comments | map(select(.body | test("confidence.*[0-5]/5|[0-5]/5.*confidence"))) | last | .body
  ')

  if [ -n "$latest_review" ] && [ "$latest_review" != "null" ]; then
    review_found=true
    break
  fi

  echo "  Waiting... (attempt $i/20, ~$((i * 30))s elapsed)"
  sleep 30
done

if [ "$review_found" = false ]; then
  echo ""
  echo "╭────────────────────────────────────────────────╮"
  echo "│  ⚠️  Greptile Review Timeout                    │"
  echo "╰────────────────────────────────────────────────╯"
  echo ""
  echo "Greptile review not received within 10 minutes."
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check https://app.greptile.com for your repo"
  echo "  2. Verify the Greptile GitHub App is installed"
  echo "  3. Run /karimo:configure --greptile to reconfigure"
  echo ""
  echo "Exit code: 1 (transient error)"
  exit 1
fi
```

### Step 5: Review Loop

```bash
loop_count=0
current_model="sonnet"

while [ $loop_count -lt $max_loops ]; do
  loop_count=$((loop_count + 1))

  echo ""
  echo "────────────────────────────────────────────────"
  echo "Review Loop $loop_count of $max_loops"
  echo "────────────────────────────────────────────────"

  # Parse score from latest Greptile comment
  # Use tail -1 to get most recent score (e.g., "Previous: 2/5, Now: 4/5" → 4)
  latest_review=$(gh pr view $pr_number --json comments --jq '
    .comments | map(select(.body | test("confidence.*[0-5]/5|[0-5]/5.*confidence"))) | last | .body
  ')

  score=$(echo "$latest_review" | grep -oE '[0-5]/5' | tail -1 | cut -d'/' -f1)
  score=${score:-0}

  echo "  Current score: ${score}/5 (threshold: ${threshold}/5)"

  # Check if passed
  if [ "$score" -ge "$threshold" ]; then
    echo ""
    echo "╭────────────────────────────────────────────────╮"
    echo "│  ✓ Greptile Review Passed                      │"
    echo "╰────────────────────────────────────────────────╯"
    echo ""
    echo "  Score: ${score}/5 (threshold: ${threshold}/5)"
    echo "  Loops: $loop_count"
    echo ""

    # Add passed label
    gh pr edit $pr_number --add-label "greptile-passed" 2>/dev/null || true

    # Remove any revision labels
    gh pr edit $pr_number --remove-label "needs-revision" 2>/dev/null || true
    gh pr edit $pr_number --remove-label "greptile-needs-revision" 2>/dev/null || true

    echo "Exit code: 0 (passed)"
    exit 0
  fi

  echo "  Score below threshold, extracting findings..."

  # Extract P1/P2/P3 findings from inline review comments
  OWNER=$(yq '.github.owner' .karimo/config.yaml)
  REPO=$(yq '.github.repository' .karimo/config.yaml)

  findings=$(gh api "repos/${OWNER}/${REPO}/pulls/${pr_number}/comments" --jq '
    .[] | select(.body | test("P[123]:")) |
    "- " + (.path // "general") + ":" + ((.line // .original_line // "N/A") | tostring) + " " + .body
  ' 2>/dev/null || true)

  p1_findings=$(echo "$findings" | grep -E 'P1:' || true)
  p2_findings=$(echo "$findings" | grep -E 'P2:' || true)
  p3_findings=$(echo "$findings" | grep -E 'P3:' || true)

  p1_count=$(echo "$p1_findings" | grep -c '^' 2>/dev/null || echo "0")
  p2_count=$(echo "$p2_findings" | grep -c '^' 2>/dev/null || echo "0")
  p3_count=$(echo "$p3_findings" | grep -c '^' 2>/dev/null || echo "0")

  echo ""
  echo "  Findings breakdown:"
  echo "    P1 Critical: $p1_count"
  echo "    P2 Important: $p2_count"
  echo "    P3 Minor: $p3_count"

  # Check if this is last loop
  if [ $loop_count -ge $max_loops ]; then
    echo ""
    echo "╭────────────────────────────────────────────────╮"
    echo "│  ❌ Human Review Required                       │"
    echo "╰────────────────────────────────────────────────╯"
    echo ""
    echo "  Score: ${score}/5 (threshold: ${threshold}/5)"
    echo "  Loops exhausted: $loop_count of $max_loops"
    echo ""
    echo "  Remaining findings require human attention."
    echo "  PR: https://github.com/${OWNER}/${REPO}/pull/${pr_number}"
    echo ""

    # Add blocked label
    gh pr edit $pr_number --add-label "blocked-needs-human" 2>/dev/null || true

    echo "Exit code: 2 (needs human)"
    exit 2
  fi

  # Determine model based on findings
  # Escalate to Opus for architectural issues
  if echo "$p1_findings" | grep -qiE 'architecture|design|pattern|type system|interface|contract'; then
    current_model="opus"
    echo "  → Escalating to Opus (architectural findings detected)"
  elif [ $loop_count -gt 1 ] && [ "$current_model" = "sonnet" ]; then
    current_model="opus"
    echo "  → Escalating to Opus (second failed attempt)"
  fi

  # Create findings brief for remediator
  findings_brief=$(cat <<EOF
# Greptile Remediation Brief

## Context
- PR: #${pr_number}
- Branch: ${pr_branch}
- Review Loop: ${loop_count}
- Current Score: ${score}/5
- Target: ${threshold}/5
- Model: ${current_model}

## Findings to Address

### P1 Critical (MUST FIX)
${p1_findings:-"None"}

### P2 Important (SHOULD FIX)
${p2_findings:-"None"}

### P3 Minor (OPTIONAL)
${p3_findings:-"None"}

## Instructions

1. Checkout the PR branch: ${pr_branch}
2. Fix ALL P1 findings (required)
3. Fix P2 findings if feasible
4. P3 findings are optional but recommended
5. Run validation (build, typecheck, lint, test)
6. Create atomic commit with summary
7. Push to PR branch

## Validation Commands

$(yq '.commands | to_entries | map("- " + .key + ": " + .value) | join("\n")' .karimo/config.yaml 2>/dev/null || echo "See config.yaml for commands")

EOF
)

  echo ""
  echo "  Spawning greptile-remediator agent (model: $current_model)..."

  # Spawn remediator agent
  # The agent will:
  # 1. Checkout PR branch
  # 2. Fix findings in batch
  # 3. Run validation
  # 4. Commit and push

  # Use Task tool to spawn karimo-greptile-remediator
  # Pass findings_brief as context

  # After agent completes, wait for Greptile re-review
  echo "  Agent completed, waiting for Greptile re-review..."

  # Wait for new review (Greptile auto-reviews on push)
  sleep 30  # Give Greptile time to start

  old_score=$score
  for retry in {1..10}; do
    new_review=$(gh pr view $pr_number --json comments --jq '
      .comments | map(select(.body | test("confidence.*[0-5]/5"))) | last | .body
    ')

    new_score=$(echo "$new_review" | grep -oE '[0-5]/5' | tail -1 | cut -d'/' -f1)
    new_score=${new_score:-0}

    if [ "$new_score" != "$old_score" ] || [ "$retry" -ge 10 ]; then
      echo "  New score received: ${new_score}/5"
      break
    fi

    echo "  Waiting for re-review... (attempt $retry/10)"
    sleep 30
  done
done
```

### Step 6: Report Summary

```bash
echo ""
echo "╭────────────────────────────────────────────────╮"
echo "│  Greptile Review Summary                        │"
echo "╰────────────────────────────────────────────────╯"
echo ""
echo "  PR: #${pr_number}"
echo "  Final Score: ${score}/5"
echo "  Threshold: ${threshold}/5"
echo "  Loops: ${loop_count}"
echo "  Model: ${current_model}"
echo ""

if [ "$score" -ge "$threshold" ]; then
  echo "  Status: ✓ PASSED"
  exit 0
else
  echo "  Status: ❌ NEEDS HUMAN REVIEW"
  exit 2
fi
```

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | Passed (score >= threshold) | PR ready for merge |
| `1` | Transient error (timeout, API error) | Retry later |
| `2` | Needs human (max loops exceeded) | Review PR manually |

---

## Integration with /karimo:merge

This command is invoked by `/karimo:merge` after PR creation:

```bash
# In merge.md, Section 8b:
if [ "$review_provider" = "greptile" ]; then
  /karimo:greptile-review --pr $pr_number --internal
  greptile_result=$?

  case $greptile_result in
    0) echo "✓ Greptile review passed" ;;
    1) echo "⚠️ Greptile review had transient error" ;;
    2) echo "❌ Greptile review requires human attention" ;;
  esac
fi
```

---

## Standalone Usage

Can also be run independently on any PR:

```bash
# Review any PR with Greptile
/karimo:greptile-review --pr 456

# Override settings
/karimo:greptile-review --pr 456 --threshold 4 --max-loops 2
```

---

## Agent Selection

When spawning the remediator agent:

| Complexity | Agent |
|------------|-------|
| Default | karimo-greptile-remediator (Sonnet) |
| Escalated | karimo-greptile-remediator (Opus) |

**Escalation triggers:**
- P1 findings mention "architecture", "design", "pattern"
- P1 findings mention "type system", "interface", "contract"
- Second failed attempt with Sonnet

---

## Labels Applied

| Label | When |
|-------|------|
| `greptile-passed` | Score >= threshold |
| `needs-revision` | Score < threshold, revision in progress |
| `blocked-needs-human` | Max loops exceeded |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Greptile not configured" | Run `/karimo:configure --greptile` |
| "Review not received" | Check app.greptile.com for repo status |
| "PR is not open" | Only open PRs can be reviewed |
| "No findings extracted" | Greptile may use different format; check PR comments |

---

*Generated by [KARIMO](https://github.com/opensesh/KARIMO)*
