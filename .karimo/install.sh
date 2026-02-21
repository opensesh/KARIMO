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
cp "$KARIMO_ROOT/.claude/agents/karimo-brief-writer.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-pm.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-review-architect.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-learn-auditor.md" "$TARGET_DIR/.claude/agents/"
# Task agents
cp "$KARIMO_ROOT/.claude/agents/karimo-implementer.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-tester.md" "$TARGET_DIR/.claude/agents/"
cp "$KARIMO_ROOT/.claude/agents/karimo-documenter.md" "$TARGET_DIR/.claude/agents/"

# Copy commands
echo "Copying commands..."
cp "$KARIMO_ROOT/.claude/commands/plan.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/review.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/execute.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/feedback.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/status.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/learn.md" "$TARGET_DIR/.claude/commands/"
cp "$KARIMO_ROOT/.claude/commands/doctor.md" "$TARGET_DIR/.claude/commands/"

# Copy skills
echo "Copying skills..."
cp "$KARIMO_ROOT/.claude/skills/git-worktree-ops.md" "$TARGET_DIR/.claude/skills/"
cp "$KARIMO_ROOT/.claude/skills/github-project-ops.md" "$TARGET_DIR/.claude/skills/"
# Task agent skills
cp "$KARIMO_ROOT/.claude/skills/karimo-code-standards.md" "$TARGET_DIR/.claude/skills/"
cp "$KARIMO_ROOT/.claude/skills/karimo-testing-standards.md" "$TARGET_DIR/.claude/skills/"
cp "$KARIMO_ROOT/.claude/skills/karimo-doc-standards.md" "$TARGET_DIR/.claude/skills/"

# Copy templates
echo "Copying templates..."
cp "$KARIMO_ROOT/.karimo/templates/PRD_TEMPLATE.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/INTERVIEW_PROTOCOL.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/TASK_SCHEMA.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/STATUS_SCHEMA.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/LEARN_INTERVIEW_PROTOCOL.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/FINDINGS_TEMPLATE.md" "$TARGET_DIR/.karimo/templates/"
cp "$KARIMO_ROOT/.karimo/templates/TASK_BRIEF_TEMPLATE.md" "$TARGET_DIR/.karimo/templates/"

# Copy GitHub workflows (Three-Tier System)
echo ""
echo -e "${BLUE}GitHub Workflow Installation${NC}"
echo "KARIMO uses a three-tier workflow system:"
echo ""

# Track installed workflows
INSTALLED_SYNC="true"
INSTALLED_DEPENDENCY="true"
INSTALLED_CI="false"
INSTALLED_GREPTILE="false"

# Tier 1: Always installed (required)
echo "Tier 1 (Required):"
echo "  - karimo-sync.yml: Status sync on PR merge"
echo "  - karimo-dependency-watch.yml: Runtime dependency alerts"
cp "$KARIMO_ROOT/.github/workflows/karimo-sync.yml" "$TARGET_DIR/.github/workflows/"
cp "$KARIMO_ROOT/.github/workflows/karimo-dependency-watch.yml" "$TARGET_DIR/.github/workflows/"
echo -e "  ${GREEN}Installed${NC}"
echo ""

# Tier 2: CI Integration (default Y)
echo "Tier 2 (CI Integration):"
echo "  - karimo-ci-integration.yml: Observes your existing CI, labels PRs"
echo "  - This workflow does NOT run build commands - it watches external CI"
echo ""
read -p "Install CI integration workflow? (Y/n) " -n 1 -r CI_RESPONSE
echo ""
if [[ ! $CI_RESPONSE =~ ^[Nn]$ ]]; then
    cp "$KARIMO_ROOT/.github/workflows/karimo-ci-integration.yml" "$TARGET_DIR/.github/workflows/"
    INSTALLED_CI="true"
    echo -e "  ${GREEN}Installed${NC}"
else
    echo -e "  ${YELLOW}Skipped${NC}"
fi
echo ""

# Tier 3: Greptile Review (default N)
echo "Tier 3 (Greptile Review):"
echo "  - karimo-greptile-review.yml: Automated code review via Greptile"
echo "  - Requires GREPTILE_API_KEY secret in your repository"
echo ""
read -p "Install Greptile review workflow? (y/N) " -n 1 -r GREPTILE_RESPONSE
echo ""
if [[ $GREPTILE_RESPONSE =~ ^[Yy]$ ]]; then
    cp "$KARIMO_ROOT/.github/workflows/karimo-greptile-review.yml" "$TARGET_DIR/.github/workflows/"
    INSTALLED_GREPTILE="true"
    echo -e "  ${GREEN}Installed${NC}"
else
    echo -e "  ${YELLOW}Skipped${NC}"
fi
echo ""

# Copy issue template
echo "Copying issue template..."
cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/karimo-task.yml" "$TARGET_DIR/.github/ISSUE_TEMPLATE/"

# Create .gitkeep for prds directory
touch "$TARGET_DIR/.karimo/prds/.gitkeep"

# Copy KARIMO_RULES.md to .claude/ (modular approach)
echo "Copying KARIMO rules..."
cp "$KARIMO_ROOT/.claude/KARIMO_RULES.md" "$TARGET_DIR/.claude/KARIMO_RULES.md"

# Add reference block to CLAUDE.md (concise ~20 lines instead of full rules)
echo "Updating CLAUDE.md..."
CLAUDE_MD="$TARGET_DIR/CLAUDE.md"

# Check if KARIMO section already exists
if [ -f "$CLAUDE_MD" ] && grep -q "## KARIMO Framework" "$CLAUDE_MD"; then
    echo -e "${YELLOW}KARIMO section already in CLAUDE.md, skipping...${NC}"
else
    # Append KARIMO reference block
    if [ -f "$CLAUDE_MD" ]; then
        echo "" >> "$CLAUDE_MD"
        echo "---" >> "$CLAUDE_MD"
        echo "" >> "$CLAUDE_MD"
    fi

    cat >> "$CLAUDE_MD" << 'EOF'
## KARIMO Framework

This project uses KARIMO for autonomous development.

### Project Context

| Setting | Value |
|---------|-------|
| Runtime | _pending_ |
| Framework | _pending_ |
| Package Manager | _pending_ |

### Commands

| Type | Command |
|------|---------|
| Build | _pending_ |
| Lint | _pending_ |
| Test | _pending_ |
| Typecheck | _pending_ |

### Boundaries

**Never Touch:**
- _pending_

**Require Review:**
- _pending_

### Slash Commands

- `/karimo:plan` — Start PRD interview (auto-detects on first run)
- `/karimo:review` — Cross-PRD dashboard and PRD approval
- `/karimo:execute` — Run tasks from PRD
- `/karimo:status` — View execution state
- `/karimo:feedback` — Quick capture of single learnings
- `/karimo:learn` — Deep learning cycle with investigation
- `/karimo:doctor` — Check installation health and diagnose issues

### Workflows

| Workflow | Tier | Status |
|----------|------|--------|
| karimo-sync.yml | 1 (Required) | Installed |
| karimo-dependency-watch.yml | 1 (Required) | Installed |
| karimo-ci-integration.yml | 2 (CI) | WORKFLOW_CI_STATUS |
| karimo-greptile-review.yml | 3 (Greptile) | WORKFLOW_GREPTILE_STATUS |

**Rules:** See `.claude/KARIMO_RULES.md` for agent behavior rules

## KARIMO Learnings

_Rules learned from execution feedback._

### Patterns to Follow

_No patterns captured yet._

### Anti-Patterns to Avoid

_No anti-patterns captured yet._
EOF

    # Replace workflow status placeholders
    if [ "$INSTALLED_CI" = "true" ]; then
        sed -i.bak 's/WORKFLOW_CI_STATUS/Installed/' "$CLAUDE_MD"
    else
        sed -i.bak 's/WORKFLOW_CI_STATUS/Not installed/' "$CLAUDE_MD"
    fi

    if [ "$INSTALLED_GREPTILE" = "true" ]; then
        sed -i.bak 's/WORKFLOW_GREPTILE_STATUS/Installed/' "$CLAUDE_MD"
    else
        sed -i.bak 's/WORKFLOW_GREPTILE_STATUS/Not installed/' "$CLAUDE_MD"
    fi

    # Clean up backup file created by sed
    rm -f "${CLAUDE_MD}.bak"

    if [ -f "$CLAUDE_MD" ] && [ $(wc -c < "$CLAUDE_MD") -gt 100 ]; then
        echo "  Added KARIMO reference block to existing CLAUDE.md"
    else
        echo "  Created CLAUDE.md with KARIMO reference block"
    fi
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

# Count installed workflows
WORKFLOW_COUNT=2
if [ "$INSTALLED_CI" = "true" ]; then
    WORKFLOW_COUNT=$((WORKFLOW_COUNT + 1))
fi
if [ "$INSTALLED_GREPTILE" = "true" ]; then
    WORKFLOW_COUNT=$((WORKFLOW_COUNT + 1))
fi

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Installation Complete!                                      │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "Installed files:"
echo "  .claude/agents/           10 agent definitions"
echo "  .claude/commands/         7 slash commands"
echo "  .claude/skills/           5 skill definitions"
echo "  .claude/KARIMO_RULES.md   Agent behavior rules"
echo "  .karimo/templates/        7 templates"
echo "  .github/ISSUE_TEMPLATE/   1 issue template"
echo "  CLAUDE.md                 Updated with reference block"
echo "  .gitignore                Updated with .worktrees/"
echo
echo "Workflows installed: ${WORKFLOW_COUNT}"
echo "  Tier 1 (Required):"
echo "    - karimo-sync.yml"
echo "    - karimo-dependency-watch.yml"
if [ "$INSTALLED_CI" = "true" ]; then
    echo "  Tier 2 (CI Integration):"
    echo "    - karimo-ci-integration.yml"
fi
if [ "$INSTALLED_GREPTILE" = "true" ]; then
    echo "  Tier 3 (Greptile Review):"
    echo "    - karimo-greptile-review.yml"
fi
echo
echo "Next steps:"
echo "  1. Run '/karimo:doctor' to verify installation health"
echo "  2. Run '/karimo:plan' to create your first PRD"
echo "  3. Run '/karimo:execute --prd {slug}' to start execution"
echo "  4. Run '/karimo:feedback' for quick single-rule capture"
echo "  5. Run '/karimo:learn' for periodic deep learning cycles"
if [ "$INSTALLED_GREPTILE" = "true" ]; then
    echo ""
    echo -e "${YELLOW}Note: Add GREPTILE_API_KEY to your repository secrets for Greptile review.${NC}"
fi
echo
echo "For more information, see: https://github.com/opensesh/KARIMO"
