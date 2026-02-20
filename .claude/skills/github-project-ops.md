# GitHub Project Operations Skill

Patterns and commands for managing GitHub Projects and Issues in KARIMO execution.

## Overview

KARIMO uses GitHub Projects (V2) to track task execution. Each PRD gets a Project with Issues for each task, custom fields for tracking, and automated status updates.

## Prerequisites

- `gh` CLI installed and authenticated
- Repository write access
- Projects enabled for the repository/organization

## Project Setup

### Create Project

```bash
# For organization repos:
gh project create \
  --owner {org} \
  --title "KARIMO: {feature_name}" \
  --format json

# For personal repos:
gh project create \
  --owner @me \
  --title "KARIMO: {feature_name}" \
  --format json
```

**Response:**
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
  --owner {org} \
  --name "agent_status" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "queued,running,in-review,needs-revision,done,failed,needs-human-rebase"

# Create number fields
gh project field-create {project-number} \
  --owner {org} \
  --name "complexity" \
  --data-type "NUMBER"

gh project field-create {project-number} \
  --owner {org} \
  --name "pr_number" \
  --data-type "NUMBER"

gh project field-create {project-number} \
  --owner {org} \
  --name "revision_count" \
  --data-type "NUMBER"

# Create text fields
gh project field-create {project-number} \
  --owner {org} \
  --name "depends_on" \
  --data-type "TEXT"

gh project field-create {project-number} \
  --owner {org} \
  --name "files_affected" \
  --data-type "TEXT"
```

## Issue Management

### Create Task Issue

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
  --owner {org} \
  --url "https://github.com/{owner}/{repo}/issues/{issue_number}"
```

### Update Issue Fields

```bash
# Get project item ID
ITEM_ID=$(gh project item-list {project-number} --owner {org} --format json | \
  jq -r '.items[] | select(.content.number == {issue_number}) | .id')

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

### Create PR

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
**Cost Ceiling:** ${cost_ceiling}

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

Create these labels for KARIMO tracking:

```bash
# Create karimo label
gh label create "karimo" \
  --repo {owner}/{repo} \
  --description "KARIMO automated task" \
  --color "7057ff"

# Priority labels
gh label create "priority:must" \
  --repo {owner}/{repo} \
  --description "Must-have requirement" \
  --color "d73a4a"

gh label create "priority:should" \
  --repo {owner}/{repo} \
  --description "Should-have requirement" \
  --color "fbca04"

gh label create "priority:could" \
  --repo {owner}/{repo} \
  --description "Could-have requirement" \
  --color "0e8a16"

# Status labels
gh label create "needs-revision" \
  --repo {owner}/{repo} \
  --description "Changes requested" \
  --color "e4e669"

gh label create "ready-for-review" \
  --repo {owner}/{repo} \
  --description "Ready for code review" \
  --color "0052cc"

gh label create "needs-human-rebase" \
  --repo {owner}/{repo} \
  --description "Merge conflicts need resolution" \
  --color "d93f0b"
```

## Querying Project Data

### List Project Items

```bash
gh project item-list {project-number} \
  --owner {org} \
  --format json
```

### Get Project Fields

```bash
gh project field-list {project-number} \
  --owner {org} \
  --format json
```

### Filter by Status

```bash
gh project item-list {project-number} \
  --owner {org} \
  --format json | \
  jq '.items[] | select(.fieldValues.agent_status == "running")'
```

## Closing Out

### After All Tasks Complete

```bash
# Close the project (optional)
gh project close {project-number} --owner {org}

# Or mark as complete in description
gh project edit {project-number} \
  --owner {org} \
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
- Total Cost: ${total}
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
gh project list --owner {org}

# Verify project exists
gh project view {project-number} --owner {org}
```
