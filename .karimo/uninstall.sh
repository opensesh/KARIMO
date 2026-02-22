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

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Uninstall                                            │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Check if KARIMO is installed
if [ ! -d "$TARGET_DIR/.karimo" ] && [ ! -f "$TARGET_DIR/.claude/KARIMO_RULES.md" ]; then
    echo -e "${YELLOW}KARIMO does not appear to be installed in this directory.${NC}"
    exit 0
fi

echo -e "${YELLOW}This will remove KARIMO from: $TARGET_DIR${NC}"
echo
echo "The following will be removed:"
echo "  - .karimo/ directory (templates, PRDs, config)"
echo "  - .claude/agents/karimo-*.md (10 agents)"
echo "  - .claude/commands/{plan,review,execute,status,configure,feedback,learn,doctor}.md"
echo "  - .claude/skills/{git-worktree-ops,github-project-ops,karimo-code-standards,karimo-testing-standards,karimo-doc-standards}.md"
echo "  - .claude/KARIMO_RULES.md"
echo "  - .github/workflows/karimo-*.yml"
echo "  - .github/ISSUE_TEMPLATE/karimo-task.yml"
echo "  - KARIMO Framework section from CLAUDE.md"
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

# Remove KARIMO agents
echo "Removing KARIMO agents..."
AGENT_FILES=(
    "karimo-interviewer.md"
    "karimo-investigator.md"
    "karimo-reviewer.md"
    "karimo-brief-writer.md"
    "karimo-pm.md"
    "karimo-review-architect.md"
    "karimo-learn-auditor.md"
    "karimo-implementer.md"
    "karimo-tester.md"
    "karimo-documenter.md"
)
for agent in "${AGENT_FILES[@]}"; do
    if [ -f "$TARGET_DIR/.claude/agents/$agent" ]; then
        rm "$TARGET_DIR/.claude/agents/$agent"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

# Remove KARIMO commands
echo "Removing KARIMO commands..."
COMMAND_FILES=(
    "plan.md"
    "review.md"
    "execute.md"
    "status.md"
    "configure.md"
    "feedback.md"
    "learn.md"
    "doctor.md"
)
for cmd in "${COMMAND_FILES[@]}"; do
    if [ -f "$TARGET_DIR/.claude/commands/$cmd" ]; then
        rm "$TARGET_DIR/.claude/commands/$cmd"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

# Remove KARIMO skills
echo "Removing KARIMO skills..."
SKILL_FILES=(
    "git-worktree-ops.md"
    "github-project-ops.md"
    "karimo-code-standards.md"
    "karimo-testing-standards.md"
    "karimo-doc-standards.md"
)
for skill in "${SKILL_FILES[@]}"; do
    if [ -f "$TARGET_DIR/.claude/skills/$skill" ]; then
        rm "$TARGET_DIR/.claude/skills/$skill"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

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

# Strip KARIMO Framework section from CLAUDE.md
CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
if [ -f "$CLAUDE_MD" ] && grep -q "## KARIMO Framework" "$CLAUDE_MD"; then
    echo "Removing KARIMO section from CLAUDE.md..."

    # Create a temporary file
    TEMP_FILE=$(mktemp)

    # Use awk to remove everything from "## KARIMO Framework" to end of file
    # or to the next "---" separator (whichever comes first)
    awk '
    /^## KARIMO Framework/ { skip = 1; next }
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
