# GitHub Project Operations Skill

Patterns and commands for managing GitHub Projects and Issues in KARIMO execution.

## Overview

KARIMO uses GitHub Projects (V2) to track task execution. Each PRD gets a Project with Issues for each task, custom fields for tracking, and automated status updates.

## Tool Selection Guide

KARIMO uses a hybrid approach: **GitHub MCP** for issues/PRs and **gh CLI** for Projects v2.

| Operation | Tool | Rationale |
|-----------|------|-----------|
| Issue create/update | GitHub MCP | Better error handling, typed params |
| Issue comments | GitHub MCP | Native support |
| PR create/update | GitHub MCP | `Closes #X` linking built-in |
| PR review comments | GitHub MCP | Pending review support |
| Projects v2 | gh CLI | MCP doesn't support Projects |
| Labels | gh CLI | MCP is read-only for labels |
| CI/CD context | gh CLI | GitHub Actions requirement |

**Why this split:**
- GitHub MCP provides typed parameters, better error handling, and richer responses
- Projects v2 GraphQL API is only accessible via gh CLI (MCP doesn't support it)
- Labels require write access that MCP doesn't provide

## Prerequisites

- GitHub MCP server configured in Claude Code (for Full Mode)
- `gh` CLI installed and authenticated
- Repository write access
- Projects enabled for the repository/organization
- GitHub Configuration present in `.karimo/config.yaml` (run `/karimo-configure` if missing)

## Resolve Project Owner

**Read owner from CLAUDE.md, with fallback to config.yaml:**

```bash
# First detect CLAUDE.md path (case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f ".claude/claude.md" ]; then
    CLAUDE_MD=".claude/claude.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
elif [ -f "claude.md" ]; then
    CLAUDE_MD="claude.md"
else
    CLAUDE_MD=""
fi

# Try CLAUDE.md GitHub Configuration (if CLAUDE.md exists)
if [ -n "$CLAUDE_MD" ]; then
  OWNER_TYPE=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner Type |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
  OWNER=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
else
  OWNER_TYPE=""
  OWNER=""
fi

# Fall back to config.yaml if CLAUDE.md has _pending_ or is missing
if [ -z "$OWNER" ] || [ "$OWNER" = "_pending_" ]; then
  if [ -f .karimo/config.yaml ]; then
    OWNER_TYPE=$(grep "owner_type:" .karimo/config.yaml | head -1 | awk '{print $2}')
    OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
    echo "ℹ️  Using GitHub config from .karimo/config.yaml"
  fi
fi

# Set PROJECT_OWNER based on owner type
PROJECT_OWNER=$([[ "$OWNER_TYPE" == "personal" ]] && echo "@me" || echo "$OWNER")
```

**Validation:**

```bash
# Check if we have valid owner information from either source
if [ -z "$OWNER" ] || [ "$OWNER" = "_pending_" ]; then
  if [ -n "$CLAUDE_MD" ]; then
    echo "❌ GitHub Configuration not found"
    echo "   Not in $CLAUDE_MD and not in .karimo/config.yaml"
  else
    echo "❌ GitHub Configuration not found"
    echo "   CLAUDE.md not found and .karimo/config.yaml missing github section"
  fi
  echo "   Run /karimo-configure to set up GitHub settings"
  exit 1
fi

# Test project access
if ! gh project list --owner "$PROJECT_OWNER" --limit 1 &>/dev/null; then
  echo "❌ Cannot access projects for '$PROJECT_OWNER'"
  echo "   Fix: gh auth refresh -s project"
  exit 1
fi
```

---

## MCP Operations (Issues & PRs)

### Issue Creation via MCP

Use `mcp__github__issue_write` for creating issues:

```typescript
mcp__github__issue_write({
  method: "create",
  owner: "{owner}",
  repo: "{repo}",
  title: "[{task_id}] {task_title}",
  body: "## Task\n{description}\n\n## Acceptance Criteria\n{criteria}",
  labels: ["karimo", "priority:{priority}"]
})
```

**Response includes:** `{ number, url, id }`

Store the returned `number` in status.json for PR linking.

### Issue Update via MCP

```typescript
mcp__github__issue_write({
  method: "update",
  owner: "{owner}",
  repo: "{repo}",
  issue_number: {number},
  state: "closed",
  state_reason: "completed"  // or "not_planned"
})
```

### Issue Comments via MCP

```typescript
mcp__github__add_issue_comment({
  owner: "{owner}",
  repo: "{repo}",
  issue_number: {number},
  body: "## Status Update\n\n**Status:** Running\n**Model:** {model}"
})
```

### PR Creation via MCP

**CRITICAL:** Include `Closes #{issue_number}` in the body to auto-close the linked issue on merge.

```typescript
mcp__github__create_pull_request({
  owner: "{owner}",
  repo: "{repo}",
  title: "feat({task_id}): {task_title}",
  body: "Closes #{issue_number}\n\n## Summary\n{description}\n\n## Task\n{task_id}: {task_title}",
  head: "feature/{prd-slug}/{task-id}",
  base: "feature/{prd-slug}"
})
```

**Response includes:** `{ number, url, id, html_url }`

### PR Update via MCP

```typescript
mcp__github__update_pull_request({
  owner: "{owner}",
  repo: "{repo}",
  pullNumber: {number},
  body: "Updated description...",
  reviewers: ["{reviewer}"]
})
```

### PR Read via MCP

```typescript
// Get PR details
mcp__github__pull_request_read({
  method: "get",
  owner: "{owner}",
  repo: "{repo}",
  pullNumber: {number}
})

// Get PR status (checks, mergeable)
mcp__github__pull_request_read({
  method: "get_status",
  owner: "{owner}",
  repo: "{repo}",
  pullNumber: {number}
})

// Get PR review comments
mcp__github__pull_request_read({
  method: "get_review_comments",
  owner: "{owner}",
  repo: "{repo}",
  pullNumber: {number}
})
```

---

## CLI Operations (Projects v2)

Projects v2 requires gh CLI because GitHub MCP doesn't support the Projects GraphQL API.

## Project Setup

### Create Project (Idempotent)

**Always check if project exists before creating:**

```bash
# Read owner from CLAUDE.md (see "Resolve Project Owner" above)
PROJECT_OWNER=$([[ "$OWNER_TYPE" == "personal" ]] && echo "@me" || echo "$OWNER")
PROJECT_TITLE="KARIMO: {feature_name}"

# Check if project already exists (using gh CLI built-in --jq, no external jq)
EXISTING=$(gh project list --owner "$PROJECT_OWNER" --format json \
  --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" 2>/dev/null)

if [ -n "$EXISTING" ]; then
  # Reuse existing project
  PROJECT_NUMBER=$EXISTING
  echo "Using existing project #$PROJECT_NUMBER"
else
  # Create new project (using gh CLI built-in --jq)
  PROJECT_NUMBER=$(gh project create \
    --owner "$PROJECT_OWNER" \
    --title "$PROJECT_TITLE" \
    --format json --jq '.number')
  echo "Created new project #$PROJECT_NUMBER"
fi
```

**Response (when creating new):**
```json
{
  "id": "PVT_kwDOABC123...",
  "number": 1,
  "url": "https://github.com/orgs/{org}/projects/1",
  "title": "KARIMO: User Profiles"
}
```

Store the `number` and `url` in `status.json`.

### Add Custom Fields

KARIMO uses these custom fields for tracking:

| Field | Type | Values |
|-------|------|--------|
| `complexity` | Number | 1-10 |
| `depends_on` | Text | Task IDs (e.g., "1a, 1b") |
| `files_affected` | Text | File paths |
| `agent_status` | Single Select | See below |
| `pr_number` | Number | PR number |
| `revision_count` | Number | Retry count |

**Agent Status Values:**
- `queued` — Waiting to start
- `running` — Agent working
- `in-review` — PR created
- `needs-revision` — Changes requested
- `done` — PR merged
- `failed` — Execution failed
- `needs-human-rebase` — Conflicts need resolution

```bash
# Create single-select field
gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "agent_status" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "queued,running,in-review,needs-revision,done,failed,needs-human-rebase"

# Create number fields
gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "complexity" \
  --data-type "NUMBER"

gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "pr_number" \
  --data-type "NUMBER"

gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "revision_count" \
  --data-type "NUMBER"

# Create text fields
gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "depends_on" \
  --data-type "TEXT"

gh project field-create {project-number} \
  --owner "$PROJECT_OWNER" \
  --name "files_affected" \
  --data-type "TEXT"
```

## Issue Management

**Primary method: Use MCP** (see MCP Operations section above)

### Create Task Issue (CLI Fallback)

Use this only if MCP is unavailable:

```bash
gh issue create \
  --repo {owner}/{repo} \
  --title "[{task_id}] {task_title}" \
  --body "{issue_body}" \
  --label "karimo" \
  --label "{priority}" \
  --assignee "{assignee}"
```

**Issue Body Template:**

```markdown
## Task: {task_id}

{task_description}

### Success Criteria

{success_criteria as checklist}

### Files Affected

{files_affected as list}

### Agent Context

{agent_context}

---

**PRD:** {prd_slug}
**Complexity:** {complexity}/10
**Priority:** {priority}
**Depends On:** {depends_on or "None"}

---
*Created by KARIMO automated execution*
```

### Add Issue to Project

```bash
# Get issue node ID
ISSUE_ID=$(gh issue view {issue_number} --repo {owner}/{repo} --json id -q .id)

# Add to project
gh project item-add {project-number} \
  --owner "$PROJECT_OWNER" \
  --url "https://github.com/{owner}/{repo}/issues/{issue_number}"
```

### Update Issue Fields

```bash
# Get project item ID (using gh CLI built-in --jq, no external jq)
ITEM_ID=$(gh project item-list {project-number} --owner "$PROJECT_OWNER" --format json \
  --jq ".items[] | select(.content.number == {issue_number}) | .id")

# Update agent_status field
gh project item-edit \
  --project-id {project-id} \
  --id {item-id} \
  --field-id {status-field-id} \
  --single-select-option-id {option-id}

# Update number fields
gh project item-edit \
  --project-id {project-id} \
  --id {item-id} \
  --field-id {complexity-field-id} \
  --number {complexity}
```

### Add Comment to Issue

```bash
gh issue comment {issue_number} \
  --repo {owner}/{repo} \
  --body "{comment}"
```

**Status Update Comments:**

```markdown
## Agent Update

**Status:** Running
**Started:** {timestamp}
**Worktree:** `.worktrees/{prd-slug}/{task-id}`

Agent is now working on this task.
```

```markdown
## Agent Update

**Status:** Complete
**Duration:** {duration}
**PR:** #{pr_number}

Task completed. Review the PR for changes.
```

```markdown
## Agent Update

**Status:** Failed
**Error:** {error_message}

The agent encountered an error. Manual intervention may be required.
```

## Pull Request Management

**Primary method: Use MCP** (see MCP Operations section above)

### Create PR (CLI Fallback)

Use this only if MCP is unavailable:

```bash
gh pr create \
  --repo {owner}/{repo} \
  --base feature/{prd-slug} \
  --head feature/{prd-slug}/{task-id} \
  --title "[KARIMO] [{task_id}] {task_title}" \
  --body "{pr_body}" \
  --label "karimo"
```

**PR Body Template:**

```markdown
## 🤖 KARIMO Automated PR

**Task:** {task_id} — {task_title}
**PRD:** {prd_slug}
**Complexity:** {complexity}/10
**Model:** {model}

### Description

{task_description}

### Success Criteria

{success_criteria as checklist}

### Files Changed

{files list}

### Caution Files ⚠️

{only if files match require_review patterns}

### Pre-PR Validation

- [x] Build passes
- [x] Type check passes
- [ ] Lint check (via CI)
- [ ] Tests (via CI)

---

**Issue:** #{issue_number}
**Project:** {project_url}

---
*Generated by [KARIMO](https://github.com/opensesh/KARIMO)*
```

### Get PR Status

```bash
gh pr view {pr_number} \
  --repo {owner}/{repo} \
  --json state,mergeable,reviews,statusCheckRollup
```

**Response:**
```json
{
  "state": "OPEN",
  "mergeable": "MERGEABLE",
  "reviews": [...],
  "statusCheckRollup": [...]
}
```

### Merge PR

Merge strategy is configured in `.karimo/config.yaml` under `github.merge_strategy`:

```bash
# Read merge strategy from config
MERGE_STRATEGY=$(grep "merge_strategy:" .karimo/config.yaml | awk '{print $2}')
if [ -z "$MERGE_STRATEGY" ]; then
  MERGE_STRATEGY="squash"  # Default to squash
fi

# Merge using MCP
mcp__github__merge_pull_request({
  owner: "{owner}",
  repo: "{repo}",
  pullNumber: {pr_number},
  merge_method: "{MERGE_STRATEGY}"  # squash | merge | rebase
})
```

**Note:** In typical KARIMO workflows, PRs are merged manually or via CI automation after review. The merge_strategy setting documents the team's preference and is used when KARIMO performs automatic merges.

### Add Labels

```bash
gh pr edit {pr_number} \
  --repo {owner}/{repo} \
  --add-label "ready-for-review"

# Or remove labels
gh pr edit {pr_number} \
  --repo {owner}/{repo} \
  --remove-label "needs-revision"
```

### Request Review

```bash
gh pr edit {pr_number} \
  --repo {owner}/{repo} \
  --add-reviewer "{username}"
```

## Labels

KARIMO uses labels for tracking. Labels are created via gh CLI (MCP is read-only for labels).

### Label Initialization (Idempotent)

Run this at project setup to ensure all required labels exist. Uses `2>/dev/null || true` to ignore "already exists" errors:

```bash
# Read repo from config.yaml
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repository:" .karimo/config.yaml | head -1 | awk '{print $2}')

# KARIMO primary label
gh label create "karimo" \
  --repo "$OWNER/$REPO" \
  --description "KARIMO automated task" \
  --color "FE5102" 2>/dev/null || true

# Priority labels
gh label create "priority:must" \
  --repo "$OWNER/$REPO" \
  --description "Must-have requirement" \
  --color "B60205" 2>/dev/null || true

gh label create "priority:should" \
  --repo "$OWNER/$REPO" \
  --description "Should-have requirement" \
  --color "D93F0B" 2>/dev/null || true

gh label create "priority:could" \
  --repo "$OWNER/$REPO" \
  --description "Could-have requirement" \
  --color "FBCA04" 2>/dev/null || true

# Status labels
gh label create "needs-revision" \
  --repo "$OWNER/$REPO" \
  --description "Changes requested by review" \
  --color "0052CC" 2>/dev/null || true

gh label create "ready-for-review" \
  --repo "$OWNER/$REPO" \
  --description "Ready for code review" \
  --color "0E8A16" 2>/dev/null || true

gh label create "needs-human-rebase" \
  --repo "$OWNER/$REPO" \
  --description "Merge conflicts need resolution" \
  --color "D93F0B" 2>/dev/null || true

gh label create "needs-human-review" \
  --repo "$OWNER/$REPO" \
  --description "Requires human intervention" \
  --color "B60205" 2>/dev/null || true

gh label create "karimo-feature" \
  --repo "$OWNER/$REPO" \
  --description "KARIMO feature branch PR" \
  --color "FE5102" 2>/dev/null || true
```

### Compact Label Initialization

For use in scripts:

```bash
# Create KARIMO labels if missing (idempotent)
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repository:" .karimo/config.yaml | head -1 | awk '{print $2}')

for label in "karimo:FE5102" "priority:must:B60205" "priority:should:D93F0B" "priority:could:FBCA04" "needs-revision:0052CC" "ready-for-review:0E8A16" "needs-human-rebase:D93F0B" "needs-human-review:B60205" "karimo-feature:FE5102"; do
  name="${label%%:*}"
  rest="${label#*:}"
  if [[ "$rest" == *":"* ]]; then
    name="$name:${rest%%:*}"
    color="${rest#*:}"
  else
    color="$rest"
  fi
  gh label create "$name" --repo "$OWNER/$REPO" --color "$color" 2>/dev/null || true
done
```

### Individual Label Commands

```bash
# Create karimo label
gh label create "karimo" \
  --repo {owner}/{repo} \
  --description "KARIMO automated task" \
  --color "FE5102"

# Priority labels
gh label create "priority:must" \
  --repo {owner}/{repo} \
  --description "Must-have requirement" \
  --color "B60205"

gh label create "priority:should" \
  --repo {owner}/{repo} \
  --description "Should-have requirement" \
  --color "D93F0B"

gh label create "priority:could" \
  --repo {owner}/{repo} \
  --description "Could-have requirement" \
  --color "FBCA04"

# Status labels
gh label create "needs-revision" \
  --repo {owner}/{repo} \
  --description "Changes requested" \
  --color "0052CC"

gh label create "ready-for-review" \
  --repo {owner}/{repo} \
  --description "Ready for code review" \
  --color "0E8A16"

gh label create "needs-human-rebase" \
  --repo {owner}/{repo} \
  --description "Merge conflicts need resolution" \
  --color "D93F0B"
```

## Querying Project Data

### List Project Items

```bash
gh project item-list {project-number} \
  --owner "$PROJECT_OWNER" \
  --format json
```

### Get Project Fields

```bash
gh project field-list {project-number} \
  --owner "$PROJECT_OWNER" \
  --format json
```

### Filter by Status

```bash
# Using gh CLI built-in --jq (no external jq dependency)
gh project item-list {project-number} \
  --owner "$PROJECT_OWNER" \
  --format json \
  --jq '.items[] | select(.fieldValues.agent_status == "running")'
```

## Closing Out

### After All Tasks Complete

```bash
# Close the project (optional)
gh project close {project-number} --owner "$PROJECT_OWNER"

# Or mark as complete in description
gh project edit {project-number} \
  --owner "$PROJECT_OWNER" \
  --title "KARIMO: {feature_name} ✓ Complete"
```

### Link Project to Final PR

When creating the final merge PR (feature branch → main):

```markdown
## Feature Complete: {feature_name}

This PR merges all completed KARIMO tasks for {prd_slug}.

### Tasks Completed

{list of task PRs with links}

### Project Board

{project_url}

### Summary

- Total Tasks: {count}
- Models: {sonnet_count} sonnet, {opus_count} opus
- Total Loops: {loop_count}
- Duration: {duration}
```

## Error Handling

### Authentication Errors

```bash
# Check auth status
gh auth status

# Re-authenticate if needed
gh auth login
```

### Rate Limiting

```bash
# Check rate limit
gh api rate_limit

# If limited, wait or use conditional requests
```

### Project Not Found

```bash
# List available projects
gh project list --owner "$PROJECT_OWNER"

# Verify project exists
gh project view {project-number} --owner "$PROJECT_OWNER"
```
