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
    echo "Run /karimo:configure to set up the project"
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
    echo "Run /karimo:configure to set up GitHub settings."
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

## Asset Management Operations

KARIMO supports storing and tracking visual artifacts (images, screenshots, diagrams) throughout the PRD lifecycle. Assets are organized by stage (research/planning/execution) with lightweight metadata tracking.

**Asset management uses a standalone Node.js CLI script** located at `.karimo/scripts/karimo-assets.js`. This approach was chosen because:

1. Bash functions in markdown files cannot be sourced (triple-backtick code blocks)
2. Each Bash tool invocation is isolated (sourced functions wouldn't persist)
3. Node.js is required anyway for JSON manifest operations
4. Single source of truth (not duplicated across documentation)

### CLI Reference

```bash
node .karimo/scripts/karimo-assets.js <command> [arguments]
```

---

### add — Add an Asset

Download from URL or copy from local path, store in stage folder, update manifest.

```bash
node .karimo/scripts/karimo-assets.js add <prd-slug> <source> <stage> <description> <added-by>
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `prd-slug` | PRD identifier (e.g., "user-profiles") |
| `source` | URL or local file path to the asset |
| `stage` | Lifecycle stage: `research`, `planning`, or `execution` |
| `description` | Human-readable description for the asset |
| `added-by` | Agent or user name who added the asset |

**Example:**

```bash
# Add from URL
node .karimo/scripts/karimo-assets.js add user-profiles \
  "https://example.com/mockup.png" \
  planning \
  "Dashboard mockup" \
  "karimo-interviewer"

# Add from local file
node .karimo/scripts/karimo-assets.js add user-profiles \
  "/Users/me/Desktop/design.jpg" \
  planning \
  "Login screen design" \
  "karimo-interviewer"
```

**Output:**

```
✅ Asset stored: planning-dashboard-mockup-20260315151500.png
   Stage: planning
   Size: 128 KB
   ID: asset-001

Markdown reference:
![Dashboard mockup](./assets/planning/planning-dashboard-mockup-20260315151500.png)
```

**Features:**

- Downloads from URL or copies local files
- Generates timestamped filenames: `{stage}-{description}-{timestamp}.{ext}`
- SHA256 duplicate detection (warns if same content already exists)
- 10MB+ file size warning
- Supported types: png, jpg, jpeg, gif, svg, pdf, mp4
- Returns markdown reference for embedding in PRDs

---

### list — List Assets

Display all assets for a PRD with metadata.

```bash
node .karimo/scripts/karimo-assets.js list <prd-slug> [stage]
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `prd-slug` | PRD identifier |
| `stage` | Optional filter: `research`, `planning`, or `execution` |

**Example:**

```bash
# List all assets
node .karimo/scripts/karimo-assets.js list user-profiles

# List only planning assets
node .karimo/scripts/karimo-assets.js list user-profiles planning
```

**Output:**

```
Assets for PRD: user-profiles

Planning (2 assets):
  [asset-001] planning-dashboard-mockup-20260315151500.png
        Source: https://example.com/mockup.png
        Added: 2026-03-15 15:15:00 by karimo-interviewer
        Size: 128 KB

  [asset-002] planning-login-screen-20260315160000.png
        Source: /Users/me/Desktop/design.jpg (upload)
        Added: 2026-03-15 16:00:00 by karimo-interviewer
        Size: 85 KB

Research (1 asset):
  [asset-003] research-oauth2-flow-20260315143022.png
        Source: https://oauth.net/diagram.png
        Added: 2026-03-15 14:30:22 by karimo-researcher
        Size: 45 KB
```

---

### reference — Get Markdown Reference

Generate markdown reference for an asset by ID or filename.

```bash
node .karimo/scripts/karimo-assets.js reference <prd-slug> <identifier>
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `prd-slug` | PRD identifier |
| `identifier` | Asset ID (e.g., "asset-001") or filename |

**Example:**

```bash
# By ID
node .karimo/scripts/karimo-assets.js reference user-profiles asset-001

# By filename
node .karimo/scripts/karimo-assets.js reference user-profiles planning-mockup-20260315151500.png
```

**Output:**

```
![Dashboard mockup](./assets/planning/planning-dashboard-mockup-20260315151500.png)
```

---

### validate — Check Asset Integrity

Check that all assets in the manifest exist on disk and vice versa.

```bash
node .karimo/scripts/karimo-assets.js validate <prd-slug>
```

**Example:**

```bash
node .karimo/scripts/karimo-assets.js validate user-profiles
```

**Output (healthy):**

```
Asset Integrity Validation
──────────────────────────

PRD: user-profiles
  ✅ 3/3 assets validated

✅ All assets valid
```

**Output (issues found):**

```
Asset Integrity Validation
──────────────────────────

PRD: user-profiles
  ✅ 2/3 assets validated

Broken references:
  ❌ asset-003: research-oauth2-flow-20260315143022.png (file missing from disk)

Orphaned files:
  ⚠️  planning/old-mockup.png (not in manifest)

Run: rm <filepath> to remove orphaned assets

⚠️  Issues found: 1 broken, 0 size mismatches, 1 orphaned
```

---

### Agent Usage

Each agent uses assets at specific stages:

| Agent | Stage | Example |
|-------|-------|---------|
| karimo-researcher | `research` | Architecture diagrams, documentation screenshots |
| karimo-interviewer | `planning` | User-provided mockups, design files |
| karimo-pm | `execution` | Bug screenshots, error states |

**Agent invocation pattern:**

```bash
node .karimo/scripts/karimo-assets.js add "$PRD_SLUG" "$IMAGE_SOURCE" "$STAGE" "$DESCRIPTION" "$AGENT_NAME"
```

---

### Storage Structure

```
.karimo/prds/{slug}/
├── assets/
│   ├── research/       # Researcher-added assets
│   │   └── research-{desc}-{timestamp}.{ext}
│   ├── planning/       # Interviewer-added assets
│   │   └── planning-{desc}-{timestamp}.{ext}
│   └── execution/      # PM-added assets (runtime context)
│       └── execution-{desc}-{timestamp}.{ext}
└── assets.json         # Manifest with metadata
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
