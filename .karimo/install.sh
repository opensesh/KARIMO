#!/bin/bash

# KARIMO v2 Installation Script
# Installs KARIMO into a target project

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

# Target directory (default: current directory)
TARGET_DIR="${1:-.}"

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO v2 Installation                                      │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Check if target is a git repository
if [ ! -d "$TARGET_DIR/.git" ]; then
    echo -e "${YELLOW}Warning: Target is not a git repository.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for existing installation
if [ -d "$TARGET_DIR/.karimo" ] && [ -d "$TARGET_DIR/.claude/commands" ]; then
    echo -e "${YELLOW}KARIMO appears to already be installed.${NC}"
    read -p "Reinstall/update? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo -e "${GREEN}Installing KARIMO to: $TARGET_DIR${NC}"
echo

# Create directory structure
echo "Creating directories..."
mkdir -p "$TARGET_DIR/.claude/agents"
mkdir -p "$TARGET_DIR/.claude/commands"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.karimo/templates"
mkdir -p "$TARGET_DIR/.karimo/prds"
mkdir -p "$TARGET_DIR/.github/workflows"
mkdir -p "$TARGET_DIR/.github/ISSUE_TEMPLATE"

# Copy agents
echo "Copying agents..."
cp "$KARIMO_ROOT/.claude/agents/karimo-interviewer.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-investigator.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-reviewer.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-pm.md" "$TARGET_DIR/.claude/agents/"

# Copy commands
echo "Copying commands..."
cp "$KARIMO_ROOT/.claude/commands/plan.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/execute.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/feedback.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/status.md" "$TARGET_DIR/.claude/commands/"

# Copy skills
echo "Copying skills..."
cp "$KARIMO_ROOT/.claude/skills/git-worktree-ops.md" "$TARGET_DIR/.claude/skills/"
cp "$KARIMO_ROOT/.claude/skills/github-project-ops.md" "$TARGET_DIR/.claude/skills/"

# Copy templates
echo "Copying templates..."
cp "$KARIMO_ROOT/.karimo/templates/PRD_TEMPLATE.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/INTERVIEW_PROTOCOL.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/TASK_SCHEMA.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/STATUS_SCHEMA.md" "$TARGET_DIR/.karimo/templates/"

# Copy GitHub workflows
echo "Copying GitHub workflows..."
cp "$KARIMO_ROOT/.github/workflows/karimo-review.yml" "$TARGET_DIR/.github/workflows/"
cp "$KARIMO_ROOT/.github/workflows/karimo-integration.yml" "$TARGET_DIR/.github/workflows/"
cp "$KARIMO_ROOT/.github/workflows/karimo-sync.yml" "$TARGET_DIR/.github/workflows/"

# Copy issue template
echo "Copying issue template..."
cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/karimo-task.yml" "$TARGET_DIR/.github/ISSUE_TEMPLATE/"

# Create .gitkeep for prds directory
touch "$TARGET_DIR/.karimo/prds/.gitkeep"

# Append KARIMO_RULES to CLAUDE.md
echo "Updating CLAUDE.md..."
CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
RULES_FILE="$KARIMO_ROOT/.claude/KARIMO_RULES.md"

if [ -f "$CLAUDE_MD" ]; then
    # Check if KARIMO rules already exist
    if grep -q "## KARIMO Methodology Rules" "$CLAUDE_MD"; then
        echo -e "${YELLOW}KARIMO rules already in CLAUDE.md, skipping...${NC}"
    else
        echo "" >> "$CLAUDE_MD"
        echo "---" >> "$CLAUDE_MD"
        echo "" >> "$CLAUDE_MD"
        cat "$RULES_FILE" >> "$CLAUDE_MD"
        echo "  Added KARIMO rules to existing CLAUDE.md"
    fi
else
    # Create new CLAUDE.md with rules
    cat "$RULES_FILE" > "$CLAUDE_MD"
    echo "  Created CLAUDE.md with KARIMO rules"
fi

# Add empty KARIMO Learnings section if not present
if ! grep -q "## KARIMO Learnings" "$CLAUDE_MD"; then
    echo "" >> "$CLAUDE_MD"
    echo "---" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "## KARIMO Learnings" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "Rules learned from execution feedback. These are applied to all agent tasks." >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "### Patterns to Follow" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "_No patterns captured yet._" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "### Anti-Patterns to Avoid" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "_No anti-patterns captured yet._" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "### Rules" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "_No rules captured yet._" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "### Gotchas" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "_No gotchas captured yet._" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
fi

# Update .gitignore
echo "Updating .gitignore..."
GITIGNORE="$TARGET_DIR/.gitignore"

if [ -f "$GITIGNORE" ]; then
    # Add worktrees if not present
    if ! grep -q ".worktrees" "$GITIGNORE"; then
        echo "" >> "$GITIGNORE"
        echo "# KARIMO worktrees" >> "$GITIGNORE"
        echo ".worktrees/" >> "$GITIGNORE"
    fi
else
    echo "# KARIMO worktrees" > "$GITIGNORE"
    echo ".worktrees/" >> "$GITIGNORE"
fi

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Installation Complete!                                      │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "Installed files:"
echo "  .claude/agents/         4 agent definitions"
echo "  .claude/commands/       4 slash commands"
echo "  .claude/skills/         2 skill definitions"
echo "  .karimo/templates/      4 templates"
echo "  .github/workflows/      3 GitHub Actions"
echo "  .github/ISSUE_TEMPLATE/ 1 issue template"
echo "  CLAUDE.md               Updated with KARIMO rules"
echo "  .gitignore              Updated with .worktrees/"
echo
echo "Next steps:"
echo "  1. Run 'karimo init' to configure your project"
echo "  2. Run '/karimo:plan' to create your first PRD"
echo "  3. Run '/karimo:execute --prd {slug}' to start execution"
echo
echo "For more information, see: https://github.com/opensesh/KARIMO"
