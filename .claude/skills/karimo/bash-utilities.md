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

### karimo_add_asset()

Download from URL or copy from local path, store in stage folder, update manifest.

```bash
# karimo_add_asset - Add an asset to a PRD with metadata tracking
# Arguments:
#   $1 = prd_slug
#   $2 = source (URL or local file path)
#   $3 = stage (research|planning|execution)
#   $4 = description (human-readable)
#   $5 = added_by (agent name, e.g., "karimo-researcher")
# Returns: Markdown reference string
karimo_add_asset() {
  local prd_slug="$1"
  local source="$2"
  local stage="$3"
  local description="$4"
  local added_by="$5"

  # Validate inputs
  if [ -z "$prd_slug" ] || [ -z "$source" ] || [ -z "$stage" ] || [ -z "$description" ] || [ -z "$added_by" ]; then
    echo "❌ Usage: karimo_add_asset <prd_slug> <source> <stage> <description> <added_by>"
    return 1
  fi

  # Validate stage
  if [[ ! "$stage" =~ ^(research|planning|execution)$ ]]; then
    echo "❌ Invalid stage: $stage (must be research, planning, or execution)"
    return 1
  fi

  # Find PRD folder
  local prd_dir=$(ls -d .karimo/prds/*_${prd_slug} 2>/dev/null | head -1)
  if [ -z "$prd_dir" ]; then
    prd_dir=".karimo/prds/${prd_slug}"
    if [ ! -d "$prd_dir" ]; then
      echo "❌ PRD not found: $prd_slug"
      return 1
    fi
  fi

  # Create assets directory structure
  local assets_dir="${prd_dir}/assets/${stage}"
  mkdir -p "$assets_dir"

  # Determine if source is URL or local path
  local source_type="upload"
  if [[ "$source" =~ ^https?:// ]]; then
    source_type="url"
  fi

  # Extract file extension
  local ext="${source##*.}"

  # Validate file type
  case "$ext" in
    png|jpg|jpeg|gif|svg|pdf|mp4|PNG|JPG|JPEG|GIF|SVG|PDF|MP4)
      ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
      ;;
    *)
      echo "⚠️  Unsupported file type: $ext"
      echo "Supported types: png, jpg, jpeg, gif, svg, pdf, mp4"
      return 1
      ;;
  esac

  # Generate timestamped filename
  local timestamp=$(date -u +"%Y%m%d%H%M%S")
  local safe_description=$(echo "$description" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
  local filename="${stage}-${safe_description}-${timestamp}.${ext}"
  local filepath="${assets_dir}/${filename}"

  # Download or copy file
  if [ "$source_type" = "url" ]; then
    echo "Downloading asset from URL..."
    # Try curl first, fallback to wget
    if command -v curl >/dev/null 2>&1; then
      if ! curl -sL "$source" -o "$filepath"; then
        echo "❌ Download failed: $source"
        return 1
      fi
    elif command -v wget >/dev/null 2>&1; then
      if ! wget -q "$source" -O "$filepath"; then
        echo "❌ Download failed: $source"
        return 1
      fi
    else
      echo "❌ Neither curl nor wget found. Install one to download assets."
      return 1
    fi
  else
    # Copy local file
    if [ ! -f "$source" ]; then
      echo "❌ File not found: $source"
      return 1
    fi
    cp "$source" "$filepath"
  fi

  # Get file size (cross-platform)
  local size
  if stat -f%z "$filepath" >/dev/null 2>&1; then
    size=$(stat -f%z "$filepath")  # macOS
  else
    size=$(stat -c%s "$filepath")  # Linux/WSL
  fi

  # Warn if file is large
  if [ "$size" -gt 10485760 ]; then
    local size_mb=$((size / 1048576))
    echo "⚠️  Large file: ${size_mb} MB. Consider compression or external hosting."
  fi

  # Calculate SHA256 hash (cross-platform)
  local hash
  if command -v shasum >/dev/null 2>&1; then
    hash=$(shasum -a 256 "$filepath" | awk '{print $1}')
  elif command -v sha256sum >/dev/null 2>&1; then
    hash=$(sha256sum "$filepath" | awk '{print $1}')
  else
    echo "⚠️  shasum/sha256sum not found. Skipping duplicate detection."
    hash=""
  fi

  # Initialize or read manifest
  local manifest="${prd_dir}/assets.json"
  if [ ! -f "$manifest" ]; then
    echo '{"version":"1.0","assets":[]}' > "$manifest"
  fi

  # Check for duplicate hash
  if [ -n "$hash" ] && grep -q "\"sha256\": \"$hash\"" "$manifest" 2>/dev/null; then
    echo "⚠️  Duplicate detected: This asset content already exists in the PRD"
    local existing_file=$(grep -B5 "\"sha256\": \"$hash\"" "$manifest" | grep '"filename"' | head -1 | sed 's/.*: "//' | sed 's/".*//')
    echo "   Existing: $existing_file"
    echo "   New: $filename"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      rm "$filepath"
      return 1
    fi
  fi

  # Generate asset ID
  local asset_count=$(grep -c '"id":' "$manifest" 2>/dev/null || echo "0")
  local asset_id=$(printf "asset-%03d" $((asset_count + 1)))

  # Get MIME type
  local mime_type
  case "$ext" in
    png) mime_type="image/png" ;;
    jpg|jpeg) mime_type="image/jpeg" ;;
    gif) mime_type="image/gif" ;;
    svg) mime_type="image/svg+xml" ;;
    pdf) mime_type="application/pdf" ;;
    mp4) mime_type="video/mp4" ;;
    *) mime_type="application/octet-stream" ;;
  esac

  # ISO timestamp for JSON
  local iso_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Check Node.js availability for JSON operations
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not found. Required for JSON operations."
    echo "Install Node.js: https://nodejs.org/"
    rm "$filepath"
    return 1
  fi

  # Update manifest using Node.js
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('${manifest}', 'utf8'));
    manifest.assets.push({
      id: '${asset_id}',
      filename: '${filename}',
      originalSource: '${source}',
      sourceType: '${source_type}',
      stage: '${stage}',
      timestamp: '${iso_timestamp}',
      addedBy: '${added_by}',
      description: '${description}',
      referencedIn: [],
      size: ${size},
      mimeType: '${mime_type}',
      sha256: '${hash}'
    });
    fs.writeFileSync('${manifest}', JSON.stringify(manifest, null, 2));
  "

  # Generate markdown reference
  local md_reference="![${description}](./assets/${stage}/${filename})"

  echo "✅ Asset stored: ${filename}"
  echo "   Stage: ${stage}"
  echo "   Size: $((size / 1024)) KB"
  echo "   Reference: ${md_reference}"
  echo ""

  # Return markdown reference for embedding
  echo "$md_reference"
}

# Usage:
# karimo_add_asset "user-profiles" "https://example.com/mockup.png" "planning" "Dashboard mockup" "karimo-interviewer"
# karimo_add_asset "user-profiles" "/Users/me/Desktop/design.jpg" "planning" "Login screen" "karimo-interviewer"
```

### karimo_list_assets()

Display all assets for a PRD with metadata.

```bash
# karimo_list_assets - List all assets for a PRD
# Arguments:
#   $1 = prd_slug
#   $2 = stage (optional filter: research|planning|execution)
# Returns: Formatted list of assets
karimo_list_assets() {
  local prd_slug="$1"
  local stage_filter="${2:-}"

  # Find PRD folder
  local prd_dir=$(ls -d .karimo/prds/*_${prd_slug} 2>/dev/null | head -1)
  if [ -z "$prd_dir" ]; then
    prd_dir=".karimo/prds/${prd_slug}"
    if [ ! -d "$prd_dir" ]; then
      echo "❌ PRD not found: $prd_slug"
      return 1
    fi
  fi

  local manifest="${prd_dir}/assets.json"
  if [ ! -f "$manifest" ]; then
    echo "No assets found for PRD: $prd_slug"
    return 0
  fi

  # Check Node.js availability
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not found. Required for JSON operations."
    return 1
  fi

  # Use Node.js to format asset list
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('${manifest}', 'utf8'));
    const assets = manifest.assets || [];
    const stageFilter = '${stage_filter}';

    if (assets.length === 0) {
      console.log('No assets found for PRD: ${prd_slug}');
      process.exit(0);
    }

    // Group by stage
    const byStage = assets.reduce((acc, asset) => {
      if (!stageFilter || asset.stage === stageFilter) {
        if (!acc[asset.stage]) acc[asset.stage] = [];
        acc[asset.stage].push(asset);
      }
      return acc;
    }, {});

    console.log('Assets for PRD: ${prd_slug}');
    console.log('');

    for (const [stage, stageAssets] of Object.entries(byStage)) {
      console.log(\`\${stage.charAt(0).toUpperCase() + stage.slice(1)} (\${stageAssets.length} asset\${stageAssets.length !== 1 ? 's' : ''}):\`);
      stageAssets.forEach(asset => {
        const sizeMB = (asset.size / 1048576).toFixed(2);
        const sizeKB = (asset.size / 1024).toFixed(0);
        const sizeDisplay = asset.size > 1048576 ? \`\${sizeMB} MB\` : \`\${sizeKB} KB\`;
        const sourceDisplay = asset.sourceType === 'url' ? asset.originalSource : \`\${asset.originalSource} (upload)\`;

        console.log(\`  [\${asset.id}] \${asset.filename}\`);
        console.log(\`        Source: \${sourceDisplay}\`);
        console.log(\`        Added: \${asset.timestamp.replace('T', ' ').replace('Z', '')} by \${asset.addedBy}\`);
        console.log(\`        Size: \${sizeDisplay}\`);
        if (asset.referencedIn && asset.referencedIn.length > 0) {
          console.log(\`        Referenced in: \${asset.referencedIn.join(', ')}\`);
        }
        console.log('');
      });
    }
  "
}

# Usage:
# karimo_list_assets "user-profiles"
# karimo_list_assets "user-profiles" "planning"
```

### karimo_get_asset_reference()

Generate markdown reference for an asset by ID or filename.

```bash
# karimo_get_asset_reference - Get markdown reference for an asset
# Arguments:
#   $1 = prd_slug
#   $2 = identifier (asset ID like "asset-001" or filename)
# Returns: Markdown reference string
karimo_get_asset_reference() {
  local prd_slug="$1"
  local identifier="$2"

  if [ -z "$prd_slug" ] || [ -z "$identifier" ]; then
    echo "❌ Usage: karimo_get_asset_reference <prd_slug> <identifier>"
    return 1
  fi

  # Find PRD folder
  local prd_dir=$(ls -d .karimo/prds/*_${prd_slug} 2>/dev/null | head -1)
  if [ -z "$prd_dir" ]; then
    prd_dir=".karimo/prds/${prd_slug}"
    if [ ! -d "$prd_dir" ]; then
      echo "❌ PRD not found: $prd_slug"
      return 1
    fi
  fi

  local manifest="${prd_dir}/assets.json"
  if [ ! -f "$manifest" ]; then
    echo "❌ No assets manifest found for PRD: $prd_slug"
    return 1
  fi

  # Check Node.js availability
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not found. Required for JSON operations."
    return 1
  fi

  # Use Node.js to find asset and generate reference
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('${manifest}', 'utf8'));
    const assets = manifest.assets || [];
    const identifier = '${identifier}';

    // Find by ID or filename
    const asset = assets.find(a => a.id === identifier || a.filename === identifier);

    if (!asset) {
      console.error('❌ Asset not found: ${identifier}');
      process.exit(1);
    }

    const reference = \`![\${asset.description}](./assets/\${asset.stage}/\${asset.filename})\`;
    console.log(reference);
  "
}

# Usage:
# karimo_get_asset_reference "user-profiles" "asset-001"
# karimo_get_asset_reference "user-profiles" "planning-mockup-20260315151500.png"
```

### karimo_validate_assets()

Check asset integrity (files exist, manifest is valid).

```bash
# karimo_validate_assets - Validate asset integrity for a PRD
# Arguments:
#   $1 = prd_slug
# Returns: Validation report with status
karimo_validate_assets() {
  local prd_slug="$1"

  if [ -z "$prd_slug" ]; then
    echo "❌ Usage: karimo_validate_assets <prd_slug>"
    return 1
  fi

  # Find PRD folder
  local prd_dir=$(ls -d .karimo/prds/*_${prd_slug} 2>/dev/null | head -1)
  if [ -z "$prd_dir" ]; then
    prd_dir=".karimo/prds/${prd_slug}"
    if [ ! -d "$prd_dir" ]; then
      echo "❌ PRD not found: $prd_slug"
      return 1
    fi
  fi

  local manifest="${prd_dir}/assets.json"
  local assets_dir="${prd_dir}/assets"

  # Check if manifest exists
  if [ ! -f "$manifest" ]; then
    echo "No assets manifest found for PRD: $prd_slug"
    return 0
  fi

  # Check Node.js availability
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not found. Required for JSON operations."
    return 1
  fi

  # Validate using Node.js
  node -e "
    const fs = require('fs');
    const path = require('path');

    const manifest = JSON.parse(fs.readFileSync('${manifest}', 'utf8'));
    const assets = manifest.assets || [];
    const assetsDir = '${assets_dir}';
    const prdDir = '${prd_dir}';

    let validCount = 0;
    let brokenCount = 0;
    let sizeMismatchCount = 0;
    const brokenRefs = [];
    const sizeMismatches = [];

    // Validate manifest entries
    assets.forEach(asset => {
      const filepath = path.join(prdDir, 'assets', asset.stage, asset.filename);

      if (!fs.existsSync(filepath)) {
        brokenCount++;
        brokenRefs.push(\`  ❌ \${asset.id}: \${asset.filename} (file missing from disk)\`);
      } else {
        const stats = fs.statSync(filepath);
        if (stats.size !== asset.size) {
          sizeMismatchCount++;
          sizeMismatches.push(\`  ⚠️  \${asset.id}: Size mismatch (manifest: \${asset.size}, disk: \${stats.size})\`);
        }
        validCount++;
      }
    });

    // Find orphaned files (on disk but not in manifest)
    const orphanedFiles = [];
    if (fs.existsSync(assetsDir)) {
      const stages = ['research', 'planning', 'execution'];
      stages.forEach(stage => {
        const stageDir = path.join(assetsDir, stage);
        if (fs.existsSync(stageDir)) {
          const files = fs.readdirSync(stageDir);
          files.forEach(file => {
            const isTracked = assets.some(a => a.filename === file && a.stage === stage);
            if (!isTracked) {
              orphanedFiles.push(\`  ⚠️  \${stage}/\${file} (not in manifest)\`);
            }
          });
        }
      });
    }

    // Print report
    console.log('Asset Integrity Validation');
    console.log('──────────────────────────');
    console.log('');
    console.log(\`PRD: \${prd_slug}\`);
    console.log(\`  ✅ \${validCount}/\${assets.length} assets validated\`);

    if (brokenCount > 0) {
      console.log('');
      console.log('Broken references:');
      brokenRefs.forEach(ref => console.log(ref));
    }

    if (sizeMismatchCount > 0) {
      console.log('');
      console.log('Size mismatches:');
      sizeMismatches.forEach(mismatch => console.log(mismatch));
    }

    if (orphanedFiles.length > 0) {
      console.log('');
      console.log('Orphaned files:');
      orphanedFiles.forEach(file => console.log(file));
      console.log('');
      console.log('Run: rm <filepath> to remove orphaned assets');
    }

    console.log('');

    if (brokenCount === 0 && sizeMismatchCount === 0 && orphanedFiles.length === 0) {
      console.log('✅ All assets valid');
    } else {
      console.log(\`⚠️  Issues found: \${brokenCount} broken, \${sizeMismatchCount} size mismatches, \${orphanedFiles.length} orphaned\`);
    }

    // Exit code reflects validation status
    process.exit(brokenCount > 0 ? 1 : 0);
  " "${prd_slug}"
}

# Usage:
# karimo_validate_assets "user-profiles"
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
