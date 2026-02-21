#!/bin/bash

# KARIMO Update Script
# Updates KARIMO installation with diff preview

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

# Target directory (required argument)
TARGET_DIR="${1:-}"

# Show usage
usage() {
    echo "Usage: bash KARIMO/.karimo/update.sh /path/to/your/project"
    echo ""
    echo "Updates an existing KARIMO installation with changes from the source."
    echo "Shows a diff preview before applying any changes."
    echo ""
    echo "Files never updated:"
    echo "  - CLAUDE.md (user-customized)"
    echo "  - .karimo/config.yaml (project-specific)"
    echo "  - .gitignore (already configured)"
}

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
    echo -e "${YELLOW}Warning: Target is not a git repository.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
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

# If versions match, ask for confirmation
if [ "$SOURCE_VERSION" = "$INSTALLED_VERSION" ]; then
    echo -e "${YELLOW}Versions match. Force update anyway? [y/N]${NC}"
    read -p "" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 0
    fi
    echo
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

echo "  Scanning files..."
echo

# Compare agents
for agent in karimo-interviewer karimo-investigator karimo-reviewer karimo-brief-writer karimo-pm karimo-review-architect karimo-learn-auditor karimo-implementer karimo-tester karimo-documenter; do
    if [ -f "$KARIMO_ROOT/.claude/agents/${agent}.md" ]; then
        compare_file "$KARIMO_ROOT/.claude/agents/${agent}.md" "$TARGET_DIR/.claude/agents/${agent}.md" ".claude/agents/${agent}.md"
    fi
done

# Compare commands
for cmd in plan review execute status configure feedback learn doctor; do
    if [ -f "$KARIMO_ROOT/.claude/commands/${cmd}.md" ]; then
        compare_file "$KARIMO_ROOT/.claude/commands/${cmd}.md" "$TARGET_DIR/.claude/commands/${cmd}.md" ".claude/commands/${cmd}.md"
    fi
done

# Compare skills
for skill in git-worktree-ops github-project-ops karimo-code-standards karimo-testing-standards karimo-doc-standards; do
    if [ -f "$KARIMO_ROOT/.claude/skills/${skill}.md" ]; then
        compare_file "$KARIMO_ROOT/.claude/skills/${skill}.md" "$TARGET_DIR/.claude/skills/${skill}.md" ".claude/skills/${skill}.md"
    fi
done

# Compare KARIMO_RULES.md
compare_file "$KARIMO_ROOT/.claude/KARIMO_RULES.md" "$TARGET_DIR/.claude/KARIMO_RULES.md" ".claude/KARIMO_RULES.md"

# Compare templates
for template in PRD_TEMPLATE INTERVIEW_PROTOCOL TASK_SCHEMA STATUS_SCHEMA LEARN_INTERVIEW_PROTOCOL FINDINGS_TEMPLATE TASK_BRIEF_TEMPLATE; do
    if [ -f "$KARIMO_ROOT/.karimo/templates/${template}.md" ]; then
        compare_file "$KARIMO_ROOT/.karimo/templates/${template}.md" "$TARGET_DIR/.karimo/templates/${template}.md" ".karimo/templates/${template}.md"
    fi
done

# Compare workflows
for workflow in karimo-sync karimo-dependency-watch karimo-ci-integration karimo-greptile-review; do
    if [ -f "$KARIMO_ROOT/.github/workflows/${workflow}.yml" ]; then
        compare_file "$KARIMO_ROOT/.github/workflows/${workflow}.yml" "$TARGET_DIR/.github/workflows/${workflow}.yml" ".github/workflows/${workflow}.yml"
    fi
done

# Compare issue template
compare_file "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/karimo-task.yml" "$TARGET_DIR/.github/ISSUE_TEMPLATE/karimo-task.yml" ".github/ISSUE_TEMPLATE/karimo-task.yml"

# Compare VERSION file
compare_file "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION" ".karimo/VERSION"

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

echo -e "Apply these changes? [y/N] "
read -p "" -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    exit 0
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

# Copy modified agents
for agent in karimo-interviewer karimo-investigator karimo-reviewer karimo-brief-writer karimo-pm karimo-review-architect karimo-learn-auditor karimo-implementer karimo-tester karimo-documenter; do
    source_file="$KARIMO_ROOT/.claude/agents/${agent}.md"
    target_file="$TARGET_DIR/.claude/agents/${agent}.md"
    if [ -f "$source_file" ]; then
        for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
            if [[ "$entry" == ".claude/agents/${agent}.md"* ]]; then
                cp "$source_file" "$target_file"
                break
            fi
        done
    fi
done

# Copy modified commands
for cmd in plan review execute status configure feedback learn doctor; do
    source_file="$KARIMO_ROOT/.claude/commands/${cmd}.md"
    target_file="$TARGET_DIR/.claude/commands/${cmd}.md"
    if [ -f "$source_file" ]; then
        for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
            if [[ "$entry" == ".claude/commands/${cmd}.md"* ]]; then
                cp "$source_file" "$target_file"
                break
            fi
        done
    fi
done

# Copy modified skills
for skill in git-worktree-ops github-project-ops karimo-code-standards karimo-testing-standards karimo-doc-standards; do
    source_file="$KARIMO_ROOT/.claude/skills/${skill}.md"
    target_file="$TARGET_DIR/.claude/skills/${skill}.md"
    if [ -f "$source_file" ]; then
        for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
            if [[ "$entry" == ".claude/skills/${skill}.md"* ]]; then
                cp "$source_file" "$target_file"
                break
            fi
        done
    fi
done

# Copy KARIMO_RULES.md if modified
for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
    if [[ "$entry" == ".claude/KARIMO_RULES.md"* ]]; then
        cp "$KARIMO_ROOT/.claude/KARIMO_RULES.md" "$TARGET_DIR/.claude/KARIMO_RULES.md"
        break
    fi
done

# Copy modified templates
for template in PRD_TEMPLATE INTERVIEW_PROTOCOL TASK_SCHEMA STATUS_SCHEMA LEARN_INTERVIEW_PROTOCOL FINDINGS_TEMPLATE TASK_BRIEF_TEMPLATE; do
    source_file="$KARIMO_ROOT/.karimo/templates/${template}.md"
    target_file="$TARGET_DIR/.karimo/templates/${template}.md"
    if [ -f "$source_file" ]; then
        for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
            if [[ "$entry" == ".karimo/templates/${template}.md"* ]]; then
                cp "$source_file" "$target_file"
                break
            fi
        done
    fi
done

# Copy modified workflows
for workflow in karimo-sync karimo-dependency-watch karimo-ci-integration karimo-greptile-review; do
    source_file="$KARIMO_ROOT/.github/workflows/${workflow}.yml"
    target_file="$TARGET_DIR/.github/workflows/${workflow}.yml"
    if [ -f "$source_file" ]; then
        for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
            if [[ "$entry" == ".github/workflows/${workflow}.yml"* ]]; then
                cp "$source_file" "$target_file"
                break
            fi
        done
    fi
done

# Copy issue template if modified
for entry in "${MODIFIED_FILES[@]}" "${NEW_FILES[@]}"; do
    if [[ "$entry" == ".github/ISSUE_TEMPLATE/karimo-task.yml"* ]]; then
        cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/karimo-task.yml" "$TARGET_DIR/.github/ISSUE_TEMPLATE/karimo-task.yml"
        break
    fi
done

# Always update VERSION file
cp "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION"

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
