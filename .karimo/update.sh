#!/bin/bash

# KARIMO Update Script
# Updates KARIMO installation with diff preview
# Uses MANIFEST.json as the single source of truth

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (where KARIMO source lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KARIMO_ROOT="$(dirname "$SCRIPT_DIR")"
MANIFEST="$SCRIPT_DIR/MANIFEST.json"

# Parse arguments
CI_MODE=false
TARGET_DIR=""

for arg in "$@"; do
    case $arg in
        --ci)
            CI_MODE=true
            ;;
        *)
            if [ -z "$TARGET_DIR" ]; then
                TARGET_DIR="$arg"
            fi
            ;;
    esac
done

# Show usage
usage() {
    echo "Usage: bash KARIMO/.karimo/update.sh [--ci] /path/to/your/project"
    echo ""
    echo "Updates an existing KARIMO installation with changes from the source."
    echo "Shows a diff preview before applying any changes."
    echo ""
    echo "Options:"
    echo "  --ci    CI mode: auto-confirm updates without prompts"
    echo ""
    echo "Files never updated:"
    echo "  - CLAUDE.md (user-customized)"
    echo "  - .karimo/config.yaml (project-specific)"
    echo "  - .gitignore (already configured)"
}

# Verify manifest exists
if [ ! -f "$MANIFEST" ]; then
    echo -e "${RED}Error: MANIFEST.json not found at $MANIFEST${NC}"
    echo "KARIMO source may be corrupted. Please re-download."
    exit 1
fi

# Verify jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Update                                               │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Step 1: Validate inputs

if [ -z "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory required${NC}"
    echo
    usage
    exit 1
fi

# Check KARIMO source exists
if [ ! -f "$KARIMO_ROOT/.karimo/VERSION" ]; then
    echo -e "${RED}Error: KARIMO source not found at $KARIMO_ROOT${NC}"
    echo "Expected .karimo/VERSION file in KARIMO root"
    exit 1
fi

# Check target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Check target is a git repo
if [ ! -d "$TARGET_DIR/.git" ]; then
    if [ "$CI_MODE" = true ]; then
        echo "CI mode: target is not a git repository, continuing anyway"
    else
        echo -e "${YELLOW}Warning: Target is not a git repository.${NC}"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Check KARIMO is installed (VERSION file or KARIMO_RULES.md exists)
INSTALLED=false
if [ -f "$TARGET_DIR/.karimo/VERSION" ]; then
    INSTALLED=true
elif [ -f "$TARGET_DIR/.claude/KARIMO_RULES.md" ]; then
    INSTALLED=true
fi

if [ "$INSTALLED" = false ]; then
    echo -e "${RED}Error: KARIMO is not installed in this project${NC}"
    echo ""
    echo "KARIMO installation not detected. Please run install.sh first:"
    echo ""
    echo "  bash KARIMO/.karimo/install.sh $TARGET_DIR"
    exit 1
fi

# Step 2: Compare versions

SOURCE_VERSION=$(cat "$KARIMO_ROOT/.karimo/VERSION" | tr -d '[:space:]')

if [ -f "$TARGET_DIR/.karimo/VERSION" ]; then
    INSTALLED_VERSION=$(cat "$TARGET_DIR/.karimo/VERSION" | tr -d '[:space:]')
else
    INSTALLED_VERSION="pre-tracking"
fi

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Update Preview                                       │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "  Source version:    $SOURCE_VERSION"
echo "  Installed version: $INSTALLED_VERSION"
echo

# If versions match, ask for confirmation (unless CI mode)
if [ "$SOURCE_VERSION" = "$INSTALLED_VERSION" ]; then
    if [ "$CI_MODE" = true ]; then
        echo "CI mode: versions match, proceeding with update"
    else
        echo -e "${YELLOW}Versions match. Force update anyway? [y/N]${NC}"
        read -p "" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Update cancelled."
            exit 0
        fi
        echo
    fi
fi

# Step 3: Diff and present changes

# Arrays to track file statuses
declare -a NEW_FILES
declare -a MODIFIED_FILES
declare -a UNCHANGED_FILES

# Function to compare files and count line changes
compare_file() {
    local source_file="$1"
    local target_file="$2"
    local display_path="$3"

    if [ ! -f "$target_file" ]; then
        NEW_FILES+=("$display_path")
        return
    fi

    if diff -q "$source_file" "$target_file" > /dev/null 2>&1; then
        UNCHANGED_FILES+=("$display_path")
    else
        # Calculate line changes
        local added=$(diff "$target_file" "$source_file" 2>/dev/null | grep -c "^>" || echo "0")
        local removed=$(diff "$target_file" "$source_file" 2>/dev/null | grep -c "^<" || echo "0")
        MODIFIED_FILES+=("$display_path|+$added -$removed lines")
    fi
}

echo "  Scanning files using manifest..."
echo

# Compare agents from manifest
for agent in $(jq -r '.agents[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.claude/agents/$agent" ]; then
        compare_file "$KARIMO_ROOT/.claude/agents/$agent" "$TARGET_DIR/.claude/agents/$agent" ".claude/agents/$agent"
    fi
done

# Compare commands from manifest
for cmd in $(jq -r '.commands[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.claude/commands/$cmd" ]; then
        compare_file "$KARIMO_ROOT/.claude/commands/$cmd" "$TARGET_DIR/.claude/commands/$cmd" ".claude/commands/$cmd"
    fi
done

# Compare skills from manifest
for skill in $(jq -r '.skills[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.claude/skills/$skill" ]; then
        compare_file "$KARIMO_ROOT/.claude/skills/$skill" "$TARGET_DIR/.claude/skills/$skill" ".claude/skills/$skill"
    fi
done

# Compare KARIMO_RULES.md
RULES_FILE=$(jq -r '.other.rules' "$MANIFEST")
compare_file "$KARIMO_ROOT/.claude/$RULES_FILE" "$TARGET_DIR/.claude/$RULES_FILE" ".claude/$RULES_FILE"

# Compare templates from manifest
for template in $(jq -r '.templates[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.karimo/templates/$template" ]; then
        compare_file "$KARIMO_ROOT/.karimo/templates/$template" "$TARGET_DIR/.karimo/templates/$template" ".karimo/templates/$template"
    fi
done

# Compare required workflows from manifest
for workflow in $(jq -r '.workflows.required[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
        compare_file "$KARIMO_ROOT/.github/workflows/$workflow" "$TARGET_DIR/.github/workflows/$workflow" ".github/workflows/$workflow"
    fi
done

# Compare optional workflows from manifest
for workflow in $(jq -r '.workflows.optional[]' "$MANIFEST"); do
    if [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
        compare_file "$KARIMO_ROOT/.github/workflows/$workflow" "$TARGET_DIR/.github/workflows/$workflow" ".github/workflows/$workflow"
    fi
done

# Compare issue template
ISSUE_TEMPLATE=$(jq -r '.other.issue_template' "$MANIFEST")
compare_file "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" "$TARGET_DIR/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" ".github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE"

# Compare VERSION and MANIFEST files
compare_file "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION" ".karimo/VERSION"
compare_file "$KARIMO_ROOT/.karimo/MANIFEST.json" "$TARGET_DIR/.karimo/MANIFEST.json" ".karimo/MANIFEST.json"

# Display changes
echo "  Changes:"
echo

# Show modified files
for entry in "${MODIFIED_FILES[@]}"; do
    file="${entry%%|*}"
    changes="${entry##*|}"
    printf "    ${YELLOW}MODIFIED${NC}  %-45s (%s)\n" "$file" "$changes"
done

# Show new files
for file in "${NEW_FILES[@]}"; do
    printf "    ${GREEN}NEW${NC}       %s\n" "$file"
done

# Show unchanged count (not each file)
if [ ${#UNCHANGED_FILES[@]} -gt 0 ]; then
    printf "    unchanged ${#UNCHANGED_FILES[@]} files\n"
fi

echo
echo "  Files to update: $((${#MODIFIED_FILES[@]} + ${#NEW_FILES[@]}))"
echo "  Files unchanged: ${#UNCHANGED_FILES[@]}"
echo
echo "  ${YELLOW}WILL NOT TOUCH:${NC}"
echo "    CLAUDE.md           (user-customized)"
echo "    .karimo/config.yaml (project-specific)"
echo "    .gitignore          (already configured)"
echo

# Step 4: User confirmation

# If no changes to apply
if [ $((${#MODIFIED_FILES[@]} + ${#NEW_FILES[@]})) -eq 0 ]; then
    echo -e "${GREEN}No updates needed. All files are up to date.${NC}"
    exit 0
fi

if [ "$CI_MODE" = true ]; then
    echo "CI mode: auto-applying changes"
else
    echo -e "Apply these changes? [y/N] "
    read -p "" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 0
    fi
fi

echo

# Step 5: Apply changes

echo "Applying updates..."

# Create directories if needed
mkdir -p "$TARGET_DIR/.claude/agents"
mkdir -p "$TARGET_DIR/.claude/commands"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.karimo/templates"
mkdir -p "$TARGET_DIR/.github/workflows"
mkdir -p "$TARGET_DIR/.github/ISSUE_TEMPLATE"

# Helper function to check if file should be copied
should_copy() {
    local path="$1"
    for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
        if [[ "$entry" == "$path"* ]]; then
            return 0
        fi
    done
    return 1
}

# Copy modified agents from manifest
for agent in $(jq -r '.agents[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.claude/agents/$agent"
    target_file="$TARGET_DIR/.claude/agents/$agent"
    if [ -f "$source_file" ] && should_copy ".claude/agents/$agent"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy modified commands from manifest
for cmd in $(jq -r '.commands[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.claude/commands/$cmd"
    target_file="$TARGET_DIR/.claude/commands/$cmd"
    if [ -f "$source_file" ] && should_copy ".claude/commands/$cmd"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy modified skills from manifest
for skill in $(jq -r '.skills[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.claude/skills/$skill"
    target_file="$TARGET_DIR/.claude/skills/$skill"
    if [ -f "$source_file" ] && should_copy ".claude/skills/$skill"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy KARIMO_RULES.md if modified
RULES_FILE=$(jq -r '.other.rules' "$MANIFEST")
if should_copy ".claude/$RULES_FILE"; then
    cp "$KARIMO_ROOT/.claude/$RULES_FILE" "$TARGET_DIR/.claude/$RULES_FILE"
fi

# Copy modified templates from manifest
for template in $(jq -r '.templates[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.karimo/templates/$template"
    target_file="$TARGET_DIR/.karimo/templates/$template"
    if [ -f "$source_file" ] && should_copy ".karimo/templates/$template"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy modified workflows from manifest (required)
for workflow in $(jq -r '.workflows.required[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.github/workflows/$workflow"
    target_file="$TARGET_DIR/.github/workflows/$workflow"
    if [ -f "$source_file" ] && should_copy ".github/workflows/$workflow"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy modified workflows from manifest (optional)
for workflow in $(jq -r '.workflows.optional[]' "$MANIFEST"); do
    source_file="$KARIMO_ROOT/.github/workflows/$workflow"
    target_file="$TARGET_DIR/.github/workflows/$workflow"
    if [ -f "$source_file" ] && should_copy ".github/workflows/$workflow"; then
        cp "$source_file" "$target_file"
    fi
done

# Copy issue template if modified
ISSUE_TEMPLATE=$(jq -r '.other.issue_template' "$MANIFEST")
if should_copy ".github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE"; then
    cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" "$TARGET_DIR/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE"
fi

# Always update VERSION and MANIFEST files
cp "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION"
cp "$KARIMO_ROOT/.karimo/MANIFEST.json" "$TARGET_DIR/.karimo/MANIFEST.json"

# Step 6: Post-update summary

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Update Complete!                                            │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "  Updated to: $SOURCE_VERSION"
echo "  Files changed: $((${#MODIFIED_FILES[@]} + ${#NEW_FILES[@]}))"
echo
echo "  Recommended next steps:"
echo "    1. Review changes: git diff"
echo "    2. Run /karimo:doctor to verify installation"
echo "    3. Commit: git add -A && git commit -m \"chore: update KARIMO to $SOURCE_VERSION\""
echo
