#!/bin/bash

# KARIMO v3 Installation Script
# Installs KARIMO into a target project
# Uses MANIFEST.json as the single source of truth for file inventory

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

# Verify manifest exists
if [ ! -f "$MANIFEST" ]; then
    echo -e "${RED}Error: MANIFEST.json not found at $MANIFEST${NC}"
    echo "KARIMO source may be corrupted. Please re-download."
    exit 1
fi

# ==============================================================================
# MANIFEST PARSING HELPERS (jq-free)
# ==============================================================================

# List items from a simple array in MANIFEST.json
# Usage: manifest_list "agents" [manifest_path]
manifest_list() {
  local key="$1"
  local manifest="${2:-$MANIFEST}"
  sed -n "/\"$key\"/,/]/p" "$manifest" | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

# Count items in a simple array
# Usage: manifest_count "agents" [manifest_path]
manifest_count() {
  manifest_list "$1" "$2" | wc -l | tr -d ' '
}

# List items from a nested array (e.g., workflows.required)
# Usage: manifest_nested_list "workflows.required" [manifest_path]
manifest_nested_list() {
  local key="$1"
  local manifest="${2:-$MANIFEST}"
  local parent="${key%%.*}"
  local child="${key#*.}"
  sed -n "/\"$parent\"/,/^[[:space:]]*}/p" "$manifest" | \
    sed -n "/\"$child\"/,/]/p" | grep '"' | grep -v "\"$child\"" | \
    sed 's/.*"\([^"]*\)".*/\1/'
}

# Get a simple string value from nested object
# Usage: manifest_get "other.rules" [manifest_path]
manifest_get() {
  local key="$1"
  local manifest="${2:-$MANIFEST}"
  local parent="${key%%.*}"
  local child="${key#*.}"
  sed -n "/\"$parent\"/,/}/p" "$manifest" | \
    grep "\"$child\"" | head -1 | sed 's/.*"'"$child"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# ==============================================================================
# ARGUMENT PARSING
# ==============================================================================

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

# Default target directory
TARGET_DIR="${TARGET_DIR:-.}"

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO v3 Installation                                      │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Check if target is a git repository
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

# Check Git version (worktrees require 2.5+)
GIT_VERSION=$(git --version | awk '{print $3}')
GIT_MAJOR=$(echo "$GIT_VERSION" | cut -d. -f1)
GIT_MINOR=$(echo "$GIT_VERSION" | cut -d. -f2)

if [ "$GIT_MAJOR" -lt 2 ] || { [ "$GIT_MAJOR" -eq 2 ] && [ "$GIT_MINOR" -lt 5 ]; }; then
    echo -e "${RED}Error: Git 2.5+ required for worktree support.${NC}"
    echo "Current version: $GIT_VERSION"
    echo "Please upgrade Git and try again."
    exit 1
fi

# Check for existing installation
if [ -d "$TARGET_DIR/.karimo" ] && [ -d "$TARGET_DIR/.claude/commands" ]; then
    if [ "$CI_MODE" = true ]; then
        echo "CI mode: overwriting existing installation"
    else
        echo -e "${YELLOW}KARIMO appears to already be installed.${NC}"
        echo -e "${YELLOW}This will overwrite all KARIMO command and agent files.${NC}"
        echo -e "${YELLOW}Use update.sh to preview changes first.${NC}"
        read -p "Reinstall anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
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

# ==============================================================================
# MANIFEST-DRIVEN FILE INSTALLATION
# ==============================================================================

# Copy agents from manifest
echo "Copying agents..."
AGENT_COUNT=0
for agent in $(manifest_list "agents"); do
    if [ -f "$KARIMO_ROOT/.claude/agents/$agent" ]; then
        cp "$KARIMO_ROOT/.claude/agents/$agent" "$TARGET_DIR/.claude/agents/"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Agent not found: $agent${NC}"
    fi
done
echo "  Copied $AGENT_COUNT agents"

# Copy commands from manifest
echo "Copying commands..."
COMMAND_COUNT=0
for cmd in $(manifest_list "commands"); do
    if [ -f "$KARIMO_ROOT/.claude/commands/$cmd" ]; then
        cp "$KARIMO_ROOT/.claude/commands/$cmd" "$TARGET_DIR/.claude/commands/"
        COMMAND_COUNT=$((COMMAND_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Command not found: $cmd${NC}"
    fi
done
echo "  Copied $COMMAND_COUNT commands"

# Copy skills from manifest
echo "Copying skills..."
SKILL_COUNT=0
for skill in $(manifest_list "skills"); do
    if [ -f "$KARIMO_ROOT/.claude/skills/$skill" ]; then
        cp "$KARIMO_ROOT/.claude/skills/$skill" "$TARGET_DIR/.claude/skills/"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Skill not found: $skill${NC}"
    fi
done
echo "  Copied $SKILL_COUNT skills"

# Copy templates from manifest
echo "Copying templates..."
TEMPLATE_COUNT=0
for template in $(manifest_list "templates"); do
    if [ -f "$KARIMO_ROOT/.karimo/templates/$template" ]; then
        cp "$KARIMO_ROOT/.karimo/templates/$template" "$TARGET_DIR/.karimo/templates/"
        TEMPLATE_COUNT=$((TEMPLATE_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Template not found: $template${NC}"
    fi
done
echo "  Copied $TEMPLATE_COUNT templates"

# Copy version tracking and manifest
echo "Setting version..."
cp "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION"
cp "$MANIFEST" "$TARGET_DIR/.karimo/MANIFEST.json"

# ==============================================================================
# WORKFLOW INSTALLATION (Tiered System)
# ==============================================================================

echo ""
echo -e "${BLUE}GitHub Workflow Installation${NC}"

# Track installed workflows
INSTALLED_SYNC="true"
INSTALLED_DEPENDENCY="true"
INSTALLED_CI="false"
INSTALLED_GREPTILE="false"

if [ "$CI_MODE" = true ]; then
    # CI mode: install all workflows from manifest without prompts
    echo "CI mode: installing all workflows from manifest"

    # Copy required workflows
    for workflow in $(manifest_nested_list "workflows.required"); do
        if [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
            cp "$KARIMO_ROOT/.github/workflows/$workflow" "$TARGET_DIR/.github/workflows/"
        fi
    done

    # Copy optional workflows (all in CI mode)
    # Note: Some workflows live in .karimo/workflow-templates/ to avoid running on the source repo
    for workflow in $(manifest_nested_list "workflows.optional"); do
        if [ -f "$KARIMO_ROOT/.karimo/workflow-templates/$workflow" ]; then
            cp "$KARIMO_ROOT/.karimo/workflow-templates/$workflow" "$TARGET_DIR/.github/workflows/"
        elif [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
            cp "$KARIMO_ROOT/.github/workflows/$workflow" "$TARGET_DIR/.github/workflows/"
        fi
    done

    INSTALLED_CI="true"
    INSTALLED_GREPTILE="true"
    echo -e "  ${GREEN}All workflows installed${NC}"
else
    # Interactive mode: prompt for optional workflows
    echo "KARIMO uses a three-tier workflow system:"
    echo ""

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
        cp "$KARIMO_ROOT/.karimo/workflow-templates/karimo-ci-integration.yml" "$TARGET_DIR/.github/workflows/"
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
        cp "$KARIMO_ROOT/.karimo/workflow-templates/karimo-greptile-review.yml" "$TARGET_DIR/.github/workflows/"
        INSTALLED_GREPTILE="true"
        echo -e "  ${GREEN}Installed${NC}"
    else
        echo -e "  ${YELLOW}Skipped${NC}"
    fi
    echo ""
fi

# Copy issue template
echo "Copying issue template..."
cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/karimo-task.yml" "$TARGET_DIR/.github/ISSUE_TEMPLATE/"

# Create .gitkeep for prds directory
touch "$TARGET_DIR/.karimo/prds/.gitkeep"

# Copy KARIMO_RULES.md to .claude/ (modular approach)
echo "Copying KARIMO rules..."
cp "$KARIMO_ROOT/.claude/KARIMO_RULES.md" "$TARGET_DIR/.claude/KARIMO_RULES.md"

# ==============================================================================
# AUTO-DETECTION SECTION
# ==============================================================================

# Initialize detected values with _pending_ (fallback)
DETECTED_RUNTIME="_pending_"
DETECTED_FRAMEWORK="_pending_"
DETECTED_PKG_MANAGER="_pending_"
DETECTED_BUILD="_pending_"
DETECTED_LINT="_pending_"
DETECTED_TEST="_pending_"
DETECTED_TYPECHECK="_pending_"
DETECTED_NEVER_TOUCH="_pending_"
DETECTED_REQUIRE_REVIEW="_pending_"
CONFIG_AUTODETECTED=false

if [ "$CI_MODE" = false ]; then
    echo ""
    echo "Auto-detecting project configuration..."

    # Detect package manager from lock files
    if [ -f "$TARGET_DIR/pnpm-lock.yaml" ]; then
        DETECTED_PKG_MANAGER="pnpm"
    elif [ -f "$TARGET_DIR/yarn.lock" ]; then
        DETECTED_PKG_MANAGER="yarn"
    elif [ -f "$TARGET_DIR/bun.lockb" ]; then
        DETECTED_PKG_MANAGER="bun"
    elif [ -f "$TARGET_DIR/package-lock.json" ]; then
        DETECTED_PKG_MANAGER="npm"
    elif [ -f "$TARGET_DIR/poetry.lock" ]; then
        DETECTED_PKG_MANAGER="poetry"
    elif [ -f "$TARGET_DIR/Pipfile.lock" ]; then
        DETECTED_PKG_MANAGER="pipenv"
    elif [ -f "$TARGET_DIR/requirements.txt" ]; then
        DETECTED_PKG_MANAGER="pip"
    elif [ -f "$TARGET_DIR/go.mod" ]; then
        DETECTED_PKG_MANAGER="go"
    elif [ -f "$TARGET_DIR/Cargo.lock" ]; then
        DETECTED_PKG_MANAGER="cargo"
    fi

    # Detect runtime
    if [ -f "$TARGET_DIR/package.json" ]; then
        if [ -f "$TARGET_DIR/bun.lockb" ]; then
            DETECTED_RUNTIME="Bun"
        elif [ -f "$TARGET_DIR/deno.json" ] || [ -f "$TARGET_DIR/deno.jsonc" ]; then
            DETECTED_RUNTIME="Deno"
        else
            DETECTED_RUNTIME="Node.js"
        fi
    elif [ -f "$TARGET_DIR/pyproject.toml" ] || [ -f "$TARGET_DIR/requirements.txt" ]; then
        DETECTED_RUNTIME="Python"
    elif [ -f "$TARGET_DIR/go.mod" ]; then
        DETECTED_RUNTIME="Go"
    elif [ -f "$TARGET_DIR/Cargo.toml" ]; then
        DETECTED_RUNTIME="Rust"
    fi

    # Detect framework (check for common config files/dependencies)
    if [ -f "$TARGET_DIR/next.config.js" ] || [ -f "$TARGET_DIR/next.config.mjs" ] || [ -f "$TARGET_DIR/next.config.ts" ]; then
        DETECTED_FRAMEWORK="Next.js"
    elif [ -f "$TARGET_DIR/nuxt.config.ts" ] || [ -f "$TARGET_DIR/nuxt.config.js" ]; then
        DETECTED_FRAMEWORK="Nuxt"
    elif [ -f "$TARGET_DIR/svelte.config.js" ]; then
        DETECTED_FRAMEWORK="SvelteKit"
    elif [ -f "$TARGET_DIR/astro.config.mjs" ] || [ -f "$TARGET_DIR/astro.config.ts" ]; then
        DETECTED_FRAMEWORK="Astro"
    elif [ -f "$TARGET_DIR/remix.config.js" ]; then
        DETECTED_FRAMEWORK="Remix"
    elif [ -f "$TARGET_DIR/vite.config.ts" ] || [ -f "$TARGET_DIR/vite.config.js" ]; then
        # Check if it's a React Vite project
        DETECTED_FRAMEWORK="Vite"
    elif [ -f "$TARGET_DIR/angular.json" ]; then
        DETECTED_FRAMEWORK="Angular"
    elif [ -f "$TARGET_DIR/vue.config.js" ]; then
        DETECTED_FRAMEWORK="Vue"
    fi

    # Extract commands from package.json (using grep/sed, no jq required)
    if [ -f "$TARGET_DIR/package.json" ]; then
        # Check for script presence using grep
        BUILD_SCRIPT=$(grep -o '"build"[[:space:]]*:' "$TARGET_DIR/package.json" 2>/dev/null | head -1)
        LINT_SCRIPT=$(grep -o '"lint"[[:space:]]*:' "$TARGET_DIR/package.json" 2>/dev/null | head -1)
        TEST_SCRIPT=$(grep -o '"test"[[:space:]]*:' "$TARGET_DIR/package.json" 2>/dev/null | head -1)
        TYPECHECK_SCRIPT=$(grep -o '"typecheck"[[:space:]]*:' "$TARGET_DIR/package.json" 2>/dev/null | head -1)
        TYPE_CHECK_SCRIPT=$(grep -o '"type-check"[[:space:]]*:' "$TARGET_DIR/package.json" 2>/dev/null | head -1)

        # Set detected commands with package manager prefix
        if [ -n "$BUILD_SCRIPT" ] && [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
            DETECTED_BUILD="${DETECTED_PKG_MANAGER} run build"
        fi
        if [ -n "$LINT_SCRIPT" ] && [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
            DETECTED_LINT="${DETECTED_PKG_MANAGER} run lint"
        fi
        if [ -n "$TEST_SCRIPT" ] && [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
            DETECTED_TEST="${DETECTED_PKG_MANAGER} run test"
        fi
        if [ -n "$TYPECHECK_SCRIPT" ] && [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
            DETECTED_TYPECHECK="${DETECTED_PKG_MANAGER} run typecheck"
        elif [ -n "$TYPE_CHECK_SCRIPT" ] && [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
            DETECTED_TYPECHECK="${DETECTED_PKG_MANAGER} run type-check"
        fi
    fi

    # Set default boundary patterns
    DETECTED_NEVER_TOUCH=".env*, *.lock, pnpm-lock.yaml, yarn.lock, package-lock.json"
    DETECTED_REQUIRE_REVIEW="migrations/**, auth/**, **/middleware.*"

    # Check if we have meaningful detections
    if [ "$DETECTED_RUNTIME" != "_pending_" ] || [ "$DETECTED_PKG_MANAGER" != "_pending_" ]; then
        CONFIG_AUTODETECTED=true
        echo -e "  ${GREEN}✓${NC} Package manager: ${DETECTED_PKG_MANAGER}"
        echo -e "  ${GREEN}✓${NC} Runtime: ${DETECTED_RUNTIME}"
        if [ "$DETECTED_FRAMEWORK" != "_pending_" ]; then
            echo -e "  ${GREEN}✓${NC} Framework: ${DETECTED_FRAMEWORK}"
        fi
        if [ "$DETECTED_BUILD" != "_pending_" ]; then
            echo -e "  ${GREEN}✓${NC} Commands detected from package.json"
        fi
    else
        echo -e "  ${YELLOW}Could not auto-detect project configuration${NC}"
        echo -e "  ${YELLOW}Run /karimo-configure after installation to set up${NC}"
    fi
fi

# ==============================================================================
# END AUTO-DETECTION
# ==============================================================================

# Add marker-delimited KARIMO section to CLAUDE.md
echo "Updating CLAUDE.md..."
CLAUDE_MD="$TARGET_DIR/CLAUDE.md"

# Check if KARIMO section already exists (using markers or legacy header)
if [ -f "$CLAUDE_MD" ] && grep -q "<!-- KARIMO:START" "$CLAUDE_MD"; then
    echo -e "${YELLOW}KARIMO section already in CLAUDE.md (with markers), skipping...${NC}"
elif [ -f "$CLAUDE_MD" ] && grep -q "## KARIMO" "$CLAUDE_MD"; then
    echo -e "${YELLOW}Legacy KARIMO section found in CLAUDE.md${NC}"
    echo "  Consider running uninstall.sh and reinstalling to use new marker format"
else
    # Append marker-delimited KARIMO section
    if [ -f "$CLAUDE_MD" ]; then
        echo "" >> "$CLAUDE_MD"
        echo "---" >> "$CLAUDE_MD"
        echo "" >> "$CLAUDE_MD"
    fi

    cat >> "$CLAUDE_MD" << 'EOF'
<!-- KARIMO:START - Do not edit between markers -->
## KARIMO

This project uses [KARIMO](https://github.com/opensesh/KARIMO) for PRD-driven autonomous development.

### Quick Reference

- **Commands:** Type `/karimo-` to see all commands
- **Agent rules:** `.claude/KARIMO_RULES.md`
- **Configuration:** `.karimo/config.yaml`
- **Learnings:** `.karimo/learnings.md`

### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | _pending_ |
| Owner | _pending_ |
| Repository | _pending_ |

_Run `/karimo-configure` to detect and populate these values._
<!-- KARIMO:END -->
EOF

    if [ -f "$CLAUDE_MD" ] && [ $(wc -c < "$CLAUDE_MD") -gt 100 ]; then
        echo "  Added KARIMO section to existing CLAUDE.md (with markers)"
        echo "  ────────────────────────────────────────────────────────"
        echo "  Added between <!-- KARIMO:START --> and <!-- KARIMO:END --> markers:"
        echo "    - Quick reference links"
        echo "    - GitHub Configuration table (pending values)"
        echo "  Total: ~20 lines"
    else
        echo "  Created CLAUDE.md with KARIMO section (with markers)"
    fi
fi

# Create learnings file if it doesn't exist
LEARNINGS_FILE="$TARGET_DIR/.karimo/learnings.md"
if [ ! -f "$LEARNINGS_FILE" ]; then
    cat > "$LEARNINGS_FILE" << 'LEARNEOF'
# KARIMO Learnings

_Rules learned from execution feedback via `/karimo-feedback` and `/karimo-learn`._

## Patterns to Follow

_No patterns captured yet._

## Anti-Patterns to Avoid

_No anti-patterns captured yet._
LEARNEOF
    echo "  Created .karimo/learnings.md"
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

# Get counts from manifest for summary
MANIFEST_AGENTS=$(manifest_count "agents")
MANIFEST_COMMANDS=$(manifest_count "commands")
MANIFEST_SKILLS=$(manifest_count "skills")
MANIFEST_TEMPLATES=$(manifest_count "templates")

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Installation Complete!                                      │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "Installed files:"
echo "  .claude/agents/           $MANIFEST_AGENTS agent definitions"
echo "  .claude/commands/         $MANIFEST_COMMANDS slash commands"
echo "  .claude/skills/           $MANIFEST_SKILLS skill definitions"
echo "  .claude/KARIMO_RULES.md   Agent behavior rules"
echo "  .karimo/templates/        $MANIFEST_TEMPLATES templates"
echo "  .karimo/VERSION           Version tracking"
echo "  .karimo/MANIFEST.json     File inventory"
echo "  .github/ISSUE_TEMPLATE/   1 issue template"
echo "  CLAUDE.md                 Updated with reference block"
echo "  .gitignore                Updated with .worktrees/"
echo
echo "Configuration:"
if [ "$CONFIG_AUTODETECTED" = true ]; then
    echo -e "  ${GREEN}✓${NC} Auto-detected project context"
    echo "    Runtime: ${DETECTED_RUNTIME}"
    echo "    Framework: ${DETECTED_FRAMEWORK}"
    echo "    Package manager: ${DETECTED_PKG_MANAGER}"
    echo "    Run /karimo-configure to save to .karimo/config.yaml"
else
    echo -e "  ${YELLOW}○${NC} Configuration pending"
    echo "    Run /karimo-configure to create config"
fi
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
echo "  1. Run '/karimo-doctor' to verify installation health"
if [ "$CONFIG_AUTODETECTED" = true ]; then
    echo "  2. Run '/karimo-plan' to create your first PRD"
    echo "  3. Run '/karimo-execute --prd {slug}' to start execution"
else
    echo "  2. Run '/karimo-configure' to complete configuration"
    echo "  3. Run '/karimo-plan' to create your first PRD"
fi
echo "  4. Run '/karimo-feedback' for quick single-rule capture"
echo "  5. Run '/karimo-learn' for periodic deep learning cycles"
if [ "$INSTALLED_GREPTILE" = "true" ]; then
    echo ""
    echo -e "${YELLOW}Note: Add GREPTILE_API_KEY to your repository secrets for Greptile review.${NC}"
fi
echo
echo "For more information, see: https://github.com/opensesh/KARIMO"
echo
echo "License: Apache 2.0 (see LICENSE in KARIMO source)"
echo "KARIMO installed files are licensed under Apache 2.0."
echo "Your project code remains under your own license."
