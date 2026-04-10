#!/bin/bash

# KARIMO Uninstall Script
# Removes KARIMO from a target project

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Target directory (default: current directory)
TARGET_DIR="${1:-.}"
MANIFEST="$TARGET_DIR/.karimo/MANIFEST.json"

# ==============================================================================
# MANIFEST PARSING HELPERS (jq-free)
# ==============================================================================

# List items from a simple array in MANIFEST.json
manifest_list() {
  local key="$1"
  local manifest="${2:-$MANIFEST}"
  if [ -f "$manifest" ]; then
    sed -n "/\"$key\"/,/]/p" "$manifest" | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
  fi
}

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Uninstall                                            │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Check if KARIMO is installed (v8 plugin structure or legacy v7)
if [ ! -d "$TARGET_DIR/.karimo" ] && [ ! -d "$TARGET_DIR/.claude/plugins/karimo" ] && [ ! -f "$TARGET_DIR/.claude/KARIMO_RULES.md" ]; then
    echo -e "${YELLOW}KARIMO does not appear to be installed in this directory.${NC}"
    exit 0
fi

echo -e "${YELLOW}This will remove KARIMO from: $TARGET_DIR${NC}"
echo
echo "The following will be removed:"
echo "  - .karimo/ directory (templates, PRDs)"
echo "  - .claude/plugins/karimo/ (v8 plugin structure)"
echo "  - .claude/agents/karimo/*.md (legacy v7 agents)"
echo "  - .claude/commands/karimo/*.md (legacy v7 commands)"
echo "  - .claude/skills/karimo/*.md (legacy v7 skills)"
echo "  - .claude/KARIMO_RULES.md (legacy v7)"
echo "  - .github/workflows/karimo-*.yml"
echo "  - .github/ISSUE_TEMPLATE/karimo-task.yml"
echo "  - KARIMO section from CLAUDE.md"
echo "  - .worktrees/ entry from .gitignore"
echo
echo -e "${RED}Warning: This action cannot be undone.${NC}"
echo -e "${RED}Warning: Any PRDs in .karimo/prds/ will be permanently deleted.${NC}"
echo
read -p "Are you sure you want to uninstall KARIMO? (yes/no) " -r CONFIRM
echo

if [[ ! "$CONFIRM" =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo -e "${GREEN}Uninstalling KARIMO...${NC}"
echo

# Track removed items
REMOVED_COUNT=0

# Remove .karimo/ directory
if [ -d "$TARGET_DIR/.karimo" ]; then
    echo "Removing .karimo/ directory..."
    rm -rf "$TARGET_DIR/.karimo"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove v8 plugin directory
if [ -d "$TARGET_DIR/.claude/plugins/karimo" ]; then
    echo "Removing .claude/plugins/karimo/ directory..."
    rm -rf "$TARGET_DIR/.claude/plugins/karimo"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove KARIMO agents (from manifest or fallback to pattern)
echo "Removing KARIMO agents..."
if [ -f "$MANIFEST" ]; then
    for agent in $(manifest_list "agents"); do
        if [ -f "$TARGET_DIR/.claude/agents/$agent" ]; then
            rm "$TARGET_DIR/.claude/agents/$agent"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
else
    # Fallback: remove all karimo-*.md files
    for agent in "$TARGET_DIR"/.claude/agents/karimo/*.md; do
        if [ -f "$agent" ]; then
            rm "$agent"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
fi

# Remove KARIMO commands (from manifest or fallback to known list)
echo "Removing KARIMO commands..."
if [ -f "$MANIFEST" ]; then
    for cmd in $(manifest_list "commands"); do
        if [ -f "$TARGET_DIR/.claude/commands/$cmd" ]; then
            rm "$TARGET_DIR/.claude/commands/$cmd"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
else
    # Fallback: known KARIMO commands
    for cmd in plan.md execute.md status.md configure.md feedback.md learn.md doctor.md overview.md modify.md test.md; do
        if [ -f "$TARGET_DIR/.claude/commands/$cmd" ]; then
            rm "$TARGET_DIR/.claude/commands/$cmd"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
fi

# Remove KARIMO skills (from manifest or fallback to known list)
echo "Removing KARIMO skills..."
if [ -f "$MANIFEST" ]; then
    for skill in $(manifest_list "skills"); do
        if [ -f "$TARGET_DIR/.claude/skills/$skill" ]; then
            rm "$TARGET_DIR/.claude/skills/$skill"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
else
    # Fallback: known KARIMO skills
    for skill in karimo-git-worktree-ops.md karimo-github-project-ops.md karimo-code-standards.md karimo-testing-standards.md karimo-doc-standards.md karimo-bash-utilities.md; do
        if [ -f "$TARGET_DIR/.claude/skills/$skill" ]; then
            rm "$TARGET_DIR/.claude/skills/$skill"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done
fi

# Remove KARIMO_RULES.md
if [ -f "$TARGET_DIR/.claude/KARIMO_RULES.md" ]; then
    echo "Removing KARIMO_RULES.md..."
    rm "$TARGET_DIR/.claude/KARIMO_RULES.md"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove GitHub workflows
echo "Removing KARIMO workflows..."
for workflow in "$TARGET_DIR"/.github/workflows/karimo-*.yml; do
    if [ -f "$workflow" ]; then
        rm "$workflow"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

# Remove issue template
if [ -f "$TARGET_DIR/.github/ISSUE_TEMPLATE/karimo-task.yml" ]; then
    echo "Removing issue template..."
    rm "$TARGET_DIR/.github/ISSUE_TEMPLATE/karimo-task.yml"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Strip KARIMO section from CLAUDE.md
# Check all possible locations for CLAUDE.md (case-insensitive, like install.sh)
if [ -f "$TARGET_DIR/.claude/CLAUDE.md" ]; then
    CLAUDE_MD="$TARGET_DIR/.claude/CLAUDE.md"
elif [ -f "$TARGET_DIR/.claude/claude.md" ]; then
    CLAUDE_MD="$TARGET_DIR/.claude/claude.md"
elif [ -f "$TARGET_DIR/CLAUDE.md" ]; then
    CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
elif [ -f "$TARGET_DIR/claude.md" ]; then
    CLAUDE_MD="$TARGET_DIR/claude.md"
else
    CLAUDE_MD=""
fi

# Check for marker-based section first (new format)
if [ -n "$CLAUDE_MD" ] && grep -q "<!-- KARIMO:START" "$CLAUDE_MD"; then
    echo "Removing KARIMO section from CLAUDE.md (marker-based)..."

    # Create a temporary file
    TEMP_FILE=$(mktemp)

    # Use sed to remove everything between markers (inclusive)
    sed '/<!-- KARIMO:START/,/KARIMO:END -->/d' "$CLAUDE_MD" > "$TEMP_FILE"

    # Also remove the --- separator if it precedes empty space at end of file
    # Remove trailing blank lines
    sed -i.bak -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "$TEMP_FILE" 2>/dev/null || \
    sed -i '' -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "$TEMP_FILE"

    # Remove trailing --- if present at end of file
    if tail -1 "$TEMP_FILE" | grep -q "^---$"; then
        head -n -1 "$TEMP_FILE" > "${TEMP_FILE}.tmp" && mv "${TEMP_FILE}.tmp" "$TEMP_FILE"
    fi

    # Replace original file
    mv "$TEMP_FILE" "$CLAUDE_MD"
    rm -f "${TEMP_FILE}.bak" "${CLAUDE_MD}.bak"

    REMOVED_COUNT=$((REMOVED_COUNT + 1))

# Fall back to legacy format (## KARIMO header without markers)
elif [ -n "$CLAUDE_MD" ] && grep -q "## KARIMO" "$CLAUDE_MD"; then
    echo "Removing KARIMO section from CLAUDE.md (legacy format)..."

    # Create a temporary file
    TEMP_FILE=$(mktemp)

    # Use awk to remove everything from "## KARIMO" to end of file
    # or to the next "---" separator (whichever comes first)
    awk '
    /^## KARIMO/ { skip = 1; next }
    skip && /^---$/ { skip = 0; next }
    !skip { print }
    ' "$CLAUDE_MD" > "$TEMP_FILE"

    # Also remove trailing "---" separator if it was added before KARIMO section
    # Remove trailing blank lines and the separator
    sed -i.bak -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "$TEMP_FILE" 2>/dev/null || \
    sed -i '' -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "$TEMP_FILE"

    # Remove trailing --- if present at end of file
    if tail -1 "$TEMP_FILE" | grep -q "^---$"; then
        head -n -1 "$TEMP_FILE" > "${TEMP_FILE}.tmp" && mv "${TEMP_FILE}.tmp" "$TEMP_FILE"
    fi

    # Replace original file
    mv "$TEMP_FILE" "$CLAUDE_MD"
    rm -f "${TEMP_FILE}.bak" "${CLAUDE_MD}.bak"

    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove .worktrees/ entry from .gitignore
GITIGNORE="$TARGET_DIR/.gitignore"
if [ -f "$GITIGNORE" ] && grep -q ".worktrees" "$GITIGNORE"; then
    echo "Removing .worktrees/ from .gitignore..."

    # Create a temporary file without KARIMO worktrees entries
    grep -v "^# KARIMO worktrees$" "$GITIGNORE" | grep -v "^\.worktrees/$" > "${GITIGNORE}.tmp"

    # Remove empty lines at end of file
    sed -i.bak -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "${GITIGNORE}.tmp" 2>/dev/null || \
    sed -i '' -e :a -e '/^\n*$/{ $d; N; ba' -e '}' "${GITIGNORE}.tmp"

    mv "${GITIGNORE}.tmp" "$GITIGNORE"
    rm -f "${GITIGNORE}.bak" "${GITIGNORE}.tmp.bak"

    REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Clean up empty directories
echo "Cleaning up empty directories..."

# Remove .claude subdirectories if empty
for dir in agents commands skills; do
    if [ -d "$TARGET_DIR/.claude/$dir" ] && [ -z "$(ls -A "$TARGET_DIR/.claude/$dir")" ]; then
        rmdir "$TARGET_DIR/.claude/$dir"
        echo "  Removed empty .claude/$dir/"
    fi
done

# Remove .claude if empty
if [ -d "$TARGET_DIR/.claude" ] && [ -z "$(ls -A "$TARGET_DIR/.claude")" ]; then
    rmdir "$TARGET_DIR/.claude"
    echo "  Removed empty .claude/"
fi

# Remove .github subdirectories if empty
if [ -d "$TARGET_DIR/.github/ISSUE_TEMPLATE" ] && [ -z "$(ls -A "$TARGET_DIR/.github/ISSUE_TEMPLATE")" ]; then
    rmdir "$TARGET_DIR/.github/ISSUE_TEMPLATE"
    echo "  Removed empty .github/ISSUE_TEMPLATE/"
fi

if [ -d "$TARGET_DIR/.github/workflows" ] && [ -z "$(ls -A "$TARGET_DIR/.github/workflows")" ]; then
    rmdir "$TARGET_DIR/.github/workflows"
    echo "  Removed empty .github/workflows/"
fi

# Remove .github if empty
if [ -d "$TARGET_DIR/.github" ] && [ -z "$(ls -A "$TARGET_DIR/.github")" ]; then
    rmdir "$TARGET_DIR/.github"
    echo "  Removed empty .github/"
fi

# Clean up stale worktree references
if [ -d "$TARGET_DIR/.git" ]; then
    echo "Cleaning up git worktree references..."
    cd "$TARGET_DIR" && git worktree prune 2>/dev/null || true
fi

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Uninstall Complete!                                         │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "Removed $REMOVED_COUNT KARIMO components."
echo
echo -e "${YELLOW}Note: Any .worktrees/ directory with active worktrees was NOT removed.${NC}"
echo -e "${YELLOW}Run 'git worktree list' to see active worktrees.${NC}"
echo
