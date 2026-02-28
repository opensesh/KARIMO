# KARIMO Bash Utilities Skill

Reusable bash patterns and helper functions for KARIMO agents. These utilities avoid external dependencies (like jq) and work across all target environments.

---

## Overview

KARIMO agents often need to:
- Parse YAML configuration files
- Read/update JSON status files
- Update GitHub Project board statuses
- Perform validation checks

This skill provides standardized, reusable patterns for these operations.

---

## YAML Configuration Parsing

### parse_yaml_field()

Extract a field from `.karimo/config.yaml` without external dependencies.

```bash
# parse_yaml_field - Extract a field value from YAML config
# Arguments: $1 = field path (e.g., "github.owner", "mode", "commands.build")
# Returns: Field value or empty string
parse_yaml_field() {
  local FIELD="$1"
  local CONFIG_FILE=".karimo/config.yaml"

  if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    return 1
  fi

  # Handle nested fields (e.g., "github.owner")
  if [[ "$FIELD" == *"."* ]]; then
    local PARENT=$(echo "$FIELD" | cut -d'.' -f1)
    local CHILD=$(echo "$FIELD" | cut -d'.' -f2-)

    # Find the section and extract the nested field
    grep -A20 "^${PARENT}:" "$CONFIG_FILE" | \
      grep "^  ${CHILD}:" | head -1 | \
      sed 's/.*:[[:space:]]*//' | \
      sed 's/^["'"'"']//' | sed 's/["'"'"']$//'
  else
    # Simple top-level field
    grep "^${FIELD}:" "$CONFIG_FILE" | head -1 | \
      sed 's/.*:[[:space:]]*//' | \
      sed 's/^["'"'"']//' | sed 's/["'"'"']$//'
  fi
}

# Usage examples:
# MODE=$(parse_yaml_field "mode")
# OWNER=$(parse_yaml_field "github.owner")
# BUILD_CMD=$(parse_yaml_field "commands.build")
```

### Quick Config Patterns

For common config fields, use these one-liners:

```bash
# Execution mode (full or fast-track)
MODE=$(grep "^mode:" .karimo/config.yaml 2>/dev/null | awk '{print $2}')
[ -z "$MODE" ] && MODE="full"

# GitHub settings
OWNER=$(grep "^  owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
OWNER_TYPE=$(grep "^  owner_type:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "^  repository:" .karimo/config.yaml | head -1 | awk '{print $2}')

# Project owner for gh CLI
if [ "$OWNER_TYPE" = "personal" ]; then
  PROJECT_OWNER="@me"
else
  PROJECT_OWNER="$OWNER"
fi

# Commands
BUILD_CMD=$(grep "^  build:" .karimo/config.yaml | head -1 | sed 's/.*build:[[:space:]]*//')
TEST_CMD=$(grep "^  test:" .karimo/config.yaml | head -1 | sed 's/.*test:[[:space:]]*//')
LINT_CMD=$(grep "^  lint:" .karimo/config.yaml | head -1 | sed 's/.*lint:[[:space:]]*//')
TYPECHECK_CMD=$(grep "^  typecheck:" .karimo/config.yaml | head -1 | sed 's/.*typecheck:[[:space:]]*//')
```

---

## JSON Status File Operations

### read_status_field()

Read fields from `status.json` without jq dependency.

```bash
# read_status_field - Read a root-level field from status.json
# Arguments: $1 = field name, $2 = status file path (optional, defaults to current PRD)
# Returns: Field value or empty string
read_status_field() {
  local FIELD="$1"
  local STATUS_FILE="${2:-.karimo/prds/${PRD_SLUG}/status.json}"

  if [ ! -f "$STATUS_FILE" ]; then
    echo ""
    return 1
  fi

  # Handle string fields
  grep -o "\"${FIELD}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$STATUS_FILE" | \
    head -1 | \
    sed 's/.*:[[:space:]]*"//' | \
    sed 's/"$//'
}

# read_status_number - Read a numeric field from status.json
# Arguments: $1 = field name, $2 = status file path (optional)
# Returns: Number or empty string
read_status_number() {
  local FIELD="$1"
  local STATUS_FILE="${2:-.karimo/prds/${PRD_SLUG}/status.json}"

  if [ ! -f "$STATUS_FILE" ]; then
    echo ""
    return 1
  fi

  grep -o "\"${FIELD}\"[[:space:]]*:[[:space:]]*[0-9]*" "$STATUS_FILE" | \
    head -1 | \
    grep -o '[0-9]*$'
}

# Usage examples:
# STATUS=$(read_status_field "status")
# PROJECT_NUM=$(read_status_number "github_project_number")
```

### read_task_field()

Read fields from a specific task within status.json.

```bash
# read_task_field - Read a field from a specific task
# Arguments: $1 = task_id, $2 = field name, $3 = status file path (optional)
# Returns: Field value or empty string
read_task_field() {
  local TASK_ID="$1"
  local FIELD="$2"
  local STATUS_FILE="${3:-.karimo/prds/${PRD_SLUG}/status.json}"

  if [ ! -f "$STATUS_FILE" ]; then
    echo ""
    return 1
  fi

  # Find task block and extract field
  # Works for string fields
  grep -A10 "\"${TASK_ID}\"" "$STATUS_FILE" | \
    grep -o "\"${FIELD}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | \
    head -1 | \
    sed 's/.*:[[:space:]]*"//' | \
    sed 's/"$//'
}

# read_task_number - Read a numeric field from a task
read_task_number() {
  local TASK_ID="$1"
  local FIELD="$2"
  local STATUS_FILE="${3:-.karimo/prds/${PRD_SLUG}/status.json}"

  if [ ! -f "$STATUS_FILE" ]; then
    echo ""
    return 1
  fi

  grep -A10 "\"${TASK_ID}\"" "$STATUS_FILE" | \
    grep -o "\"${FIELD}\"[[:space:]]*:[[:space:]]*[0-9]*" | \
    head -1 | \
    grep -o '[0-9]*$'
}

# Usage examples:
# ISSUE_NUM=$(read_task_number "1a" "issue_number")
# TASK_STATUS=$(read_task_field "2a" "status")
```

---

## GitHub Project Status Updates

### update_project_status()

Update the `agent_status` field on a GitHub Project board item. Use this to maintain real-time Kanban visibility.

```bash
# update_project_status - Updates the agent_status field on GitHub Project
# Arguments: $1 = task_id, $2 = status
# Valid statuses: queued, running, in-review, needs-revision, needs-human-review, done, failed, needs-human-rebase, paused
update_project_status() {
  local TASK_ID="$1"
  local STATUS="$2"
  local STATUS_FILE=".karimo/prds/${PRD_SLUG}/status.json"

  # Skip if not in full mode
  if [ "$MODE" != "full" ]; then return 0; fi

  # Get project info from status.json
  local PROJECT_NUMBER=$(read_status_number "github_project_number" "$STATUS_FILE")

  if [ -z "$PROJECT_NUMBER" ]; then return 0; fi

  # Get owner from config (uses patterns from YAML section)
  local OWNER=$(grep "^  owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
  local OWNER_TYPE=$(grep "^  owner_type:" .karimo/config.yaml | head -1 | awk '{print $2}')

  local PROJECT_OWNER
  if [ "$OWNER_TYPE" = "personal" ]; then
    PROJECT_OWNER="@me"
  else
    PROJECT_OWNER="$OWNER"
  fi

  # Find task's issue number from status.json
  local ISSUE_NUMBER=$(read_task_number "$TASK_ID" "issue_number" "$STATUS_FILE")

  if [ -z "$ISSUE_NUMBER" ]; then return 0; fi

  # Find project item ID for this task's issue
  local ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json \
    --jq ".items[] | select(.content.number == $ISSUE_NUMBER) | .id" 2>/dev/null)

  if [ -z "$ITEM_ID" ]; then return 0; fi

  # Get project ID and field info
  local PROJECT_ID=$(gh project list --owner "$PROJECT_OWNER" --format json \
    --jq ".projects[] | select(.number == $PROJECT_NUMBER) | .id" 2>/dev/null)

  local FIELD_ID=$(gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json \
    --jq '.fields[] | select(.name == "agent_status") | .id' 2>/dev/null)

  local OPTION_ID=$(gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json \
    --jq ".fields[] | select(.name == \"agent_status\") | .options[] | select(.name == \"$STATUS\") | .id" 2>/dev/null)

  if [ -n "$PROJECT_ID" ] && [ -n "$FIELD_ID" ] && [ -n "$OPTION_ID" ]; then
    gh project item-edit --project-id "$PROJECT_ID" --id "$ITEM_ID" \
      --field-id "$FIELD_ID" --single-select-option-id "$OPTION_ID" 2>/dev/null
  fi
}
```

### Status Transition Points

Call `update_project_status` at these transition points:

| Transition | Call |
|------------|------|
| Task added to project | `update_project_status "$TASK_ID" "queued"` |
| Worker spawned | `update_project_status "$TASK_ID" "running"` |
| PR created | `update_project_status "$TASK_ID" "in-review"` |
| Greptile failure | `update_project_status "$TASK_ID" "needs-revision"` |
| 3 failed attempts | `update_project_status "$TASK_ID" "needs-human-review"` |
| Merge conflicts | `update_project_status "$TASK_ID" "needs-human-rebase"` |
| PR merged | `update_project_status "$TASK_ID" "done"` |
| Task failed | `update_project_status "$TASK_ID" "failed"` |
| Task paused | `update_project_status "$TASK_ID" "paused"` |

---

## Validation Helpers

### check_config_exists()

Verify KARIMO configuration is present.

```bash
# check_config_exists - Verify config file exists
# Returns: 0 if exists, 1 if not
check_config_exists() {
  if [ ! -f ".karimo/config.yaml" ]; then
    echo "❌ KARIMO configuration not found"
    echo "Run /karimo-configure to set up the project"
    return 1
  fi
  return 0
}
```

### check_github_config()

Verify GitHub configuration is present (for full mode).

```bash
# check_github_config - Verify GitHub config is present
# Returns: 0 if configured, 1 if not
check_github_config() {
  local OWNER=$(grep "^  owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
  local REPO=$(grep "^  repository:" .karimo/config.yaml | head -1 | awk '{print $2}')

  if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
    echo "❌ GitHub configuration not found in .karimo/config.yaml"
    echo ""
    echo "GitHub Projects require owner configuration."
    echo "Run /karimo-configure to set up GitHub settings."
    return 1
  fi
  return 0
}
```

### check_prd_exists()

Verify a PRD folder exists.

```bash
# check_prd_exists - Verify PRD folder exists
# Arguments: $1 = prd_slug
# Returns: 0 if exists, 1 if not
check_prd_exists() {
  local PRD_SLUG="$1"

  # Find PRD folder (may have numeric prefix)
  local PRD_DIR=$(ls -d .karimo/prds/*_${PRD_SLUG} 2>/dev/null | head -1)

  if [ -z "$PRD_DIR" ] || [ ! -d "$PRD_DIR" ]; then
    # Try without prefix
    PRD_DIR=".karimo/prds/${PRD_SLUG}"
    if [ ! -d "$PRD_DIR" ]; then
      echo "❌ PRD not found: $PRD_SLUG"
      echo ""
      echo "Available PRDs:"
      ls -1 .karimo/prds/ 2>/dev/null | sed 's/^/  - /'
      return 1
    fi
  fi

  echo "$PRD_DIR"
  return 0
}
```

---

## Time Utilities

### time_ago()

Convert ISO timestamp to human-readable "time ago" format.

```bash
# time_ago - Convert timestamp to human-readable format
# Arguments: $1 = ISO timestamp
# Returns: Human-readable string (e.g., "2h ago", "3d ago")
time_ago() {
  local TIMESTAMP="$1"

  if [ -z "$TIMESTAMP" ]; then
    echo "never"
    return
  fi

  # Parse timestamp and calculate difference
  local THEN=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${TIMESTAMP%Z}" +%s 2>/dev/null || \
               date -d "$TIMESTAMP" +%s 2>/dev/null)
  local NOW=$(date +%s)
  local DIFF=$((NOW - THEN))

  if [ $DIFF -lt 60 ]; then
    echo "just now"
  elif [ $DIFF -lt 3600 ]; then
    echo "$((DIFF / 60))m ago"
  elif [ $DIFF -lt 86400 ]; then
    echo "$((DIFF / 3600))h ago"
  elif [ $DIFF -lt 604800 ]; then
    echo "$((DIFF / 86400))d ago"
  else
    echo "$((DIFF / 604800))w ago"
  fi
}

# Usage:
# time_ago "2026-02-20T14:30:00Z"
# Output: "2h ago"
```

### is_stale()

Check if a timestamp exceeds a staleness threshold.

```bash
# is_stale - Check if timestamp is older than threshold
# Arguments: $1 = ISO timestamp, $2 = threshold in hours
# Returns: 0 if stale, 1 if not
is_stale() {
  local TIMESTAMP="$1"
  local THRESHOLD_HOURS="$2"

  if [ -z "$TIMESTAMP" ]; then
    return 1
  fi

  local THEN=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${TIMESTAMP%Z}" +%s 2>/dev/null || \
               date -d "$TIMESTAMP" +%s 2>/dev/null)
  local NOW=$(date +%s)
  local DIFF=$((NOW - THEN))
  local THRESHOLD_SECS=$((THRESHOLD_HOURS * 3600))

  if [ $DIFF -gt $THRESHOLD_SECS ]; then
    return 0
  fi
  return 1
}

# Usage:
# if is_stale "$STARTED_AT" 4; then
#   echo "Task has been running for more than 4 hours"
# fi
```

---

## Complex JSON Operations

For operations that require complex JSON manipulation, use Node.js one-liners. Node.js is available in most KARIMO target projects.

```bash
# Read nested task field
node -e "
  const s = JSON.parse(require('fs').readFileSync('${STATUS_FILE}', 'utf8'));
  console.log(s.tasks['${TASK_ID}']?.status || '');
"

# Count tasks by status
node -e "
  const s = JSON.parse(require('fs').readFileSync('${STATUS_FILE}', 'utf8'));
  const counts = {};
  Object.values(s.tasks || {}).forEach(t => {
    counts[t.status] = (counts[t.status] || 0) + 1;
  });
  console.log(JSON.stringify(counts));
"

# Get all done tasks
node -e "
  const s = JSON.parse(require('fs').readFileSync('${STATUS_FILE}', 'utf8'));
  const done = Object.entries(s.tasks || {})
    .filter(([_, t]) => t.status === 'done')
    .map(([id, _]) => id);
  console.log(done.join(' '));
"
```

---

## Best Practices

1. **Always set PRD_SLUG and STATUS_FILE** before using helpers:
   ```bash
   PRD_SLUG="user-profiles"
   STATUS_FILE=".karimo/prds/${PRD_SLUG}/status.json"
   ```

2. **Check mode before GitHub operations:**
   ```bash
   if [ "$MODE" = "full" ]; then
     update_project_status "$TASK_ID" "running"
   fi
   ```

3. **Handle missing files gracefully:**
   ```bash
   if ! check_config_exists; then
     exit 1
   fi
   ```

4. **Use gh CLI's --jq flag** for GitHub API queries (built-in, no external jq):
   ```bash
   gh project list --owner "$OWNER" --format json --jq '.projects[].number'
   ```

5. **Fall back to Node.js** for complex JSON operations.

---

*This skill provides standardized bash utilities for KARIMO agents.*
