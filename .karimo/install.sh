#!/bin/bash

# KARIMO v2 Installation Script
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

# Verify jq is available (required for manifest parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Parse arguments
SKIP_CONFIG=false
CI_MODE=false
TARGET_DIR=""

for arg in "$@"; do
    case $arg in
        --skip-config)
            SKIP_CONFIG=true
            ;;
        --ci)
            CI_MODE=true
            SKIP_CONFIG=true  # CI mode implies skip-config
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
for agent in $(jq -r '.agents[]' "$MANIFEST"); do
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
for cmd in $(jq -r '.commands[]' "$MANIFEST"); do
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
for skill in $(jq -r '.skills[]' "$MANIFEST"); do
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
for template in $(jq -r '.templates[]' "$MANIFEST"); do
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
    for workflow in $(jq -r '.workflows.required[]' "$MANIFEST"); do
        if [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
            cp "$KARIMO_ROOT/.github/workflows/$workflow" "$TARGET_DIR/.github/workflows/"
        fi
    done

    # Copy optional workflows (all in CI mode)
    for workflow in $(jq -r '.workflows.optional[]' "$MANIFEST"); do
        if [ -f "$KARIMO_ROOT/.github/workflows/$workflow" ]; then
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

if [ "$SKIP_CONFIG" = false ]; then
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

    # Extract commands from package.json (using jq if available)
    if [ -f "$TARGET_DIR/package.json" ] && command -v jq &> /dev/null; then
        # Extract script names
        BUILD_SCRIPT=$(jq -r '.scripts.build // empty' "$TARGET_DIR/package.json" 2>/dev/null)
        LINT_SCRIPT=$(jq -r '.scripts.lint // empty' "$TARGET_DIR/package.json" 2>/dev/null)
        TEST_SCRIPT=$(jq -r '.scripts.test // empty' "$TARGET_DIR/package.json" 2>/dev/null)
        TYPECHECK_SCRIPT=$(jq -r '.scripts.typecheck // .scripts["type-check"] // empty' "$TARGET_DIR/package.json" 2>/dev/null)

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
            if [ -n "$(jq -r '.scripts.typecheck // empty' "$TARGET_DIR/package.json" 2>/dev/null)" ]; then
                DETECTED_TYPECHECK="${DETECTED_PKG_MANAGER} run typecheck"
            else
                DETECTED_TYPECHECK="${DETECTED_PKG_MANAGER} run type-check"
            fi
        fi
    elif [ -f "$TARGET_DIR/package.json" ]; then
        echo -e "  ${YELLOW}Note: jq not installed, limited command detection${NC}"
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
        echo -e "  ${YELLOW}Run /karimo:configure after installation to set up${NC}"
    fi
fi

# ==============================================================================
# END AUTO-DETECTION
# ==============================================================================

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

    cat >> "$CLAUDE_MD" << EOF
## KARIMO Framework

This project uses KARIMO for autonomous development.

### Project Context

| Setting | Value |
|---------|-------|
| Runtime | ${DETECTED_RUNTIME} |
| Framework | ${DETECTED_FRAMEWORK} |
| Package Manager | ${DETECTED_PKG_MANAGER} |

### Commands

| Type | Command |
|------|---------|
| Build | ${DETECTED_BUILD} |
| Lint | ${DETECTED_LINT} |
| Test | ${DETECTED_TEST} |
| Typecheck | ${DETECTED_TYPECHECK} |

### Boundaries

**Never Touch:**
- ${DETECTED_NEVER_TOUCH}

**Require Review:**
- ${DETECTED_REQUIRE_REVIEW}

### Slash Commands

- `/karimo:plan` — Start PRD interview (auto-detects on first run)
- `/karimo:review` — Review and approve PRD before execution
- `/karimo:overview` — Cross-PRD oversight: blocked tasks, revision loops
- `/karimo:execute` — Run tasks from PRD
- `/karimo:status` — View execution state
- `/karimo:configure` — Create or update configuration
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

# ==============================================================================
# CREATE CONFIG.YAML (if auto-detection succeeded)
# ==============================================================================

CONFIG_CREATED=false
if [ "$SKIP_CONFIG" = false ] && [ "$CONFIG_AUTODETECTED" = true ]; then
    echo "Creating configuration file..."

    # Get project name from directory
    PROJECT_NAME=$(basename "$(cd "$TARGET_DIR" && pwd)")

    cat > "$TARGET_DIR/.karimo/config.yaml" << EOF
# KARIMO Configuration
# Generated by install.sh on $(date +%Y-%m-%d)
# Edit with /karimo:configure or manually

project:
  name: ${PROJECT_NAME}
  runtime: ${DETECTED_RUNTIME}
  framework: ${DETECTED_FRAMEWORK}
  package_manager: ${DETECTED_PKG_MANAGER}

commands:
  build: "${DETECTED_BUILD}"
  lint: "${DETECTED_LINT}"
  test: "${DETECTED_TEST}"
  typecheck: "${DETECTED_TYPECHECK}"

boundaries:
  never_touch:
    - ".env*"
    - "*.lock"
    - "pnpm-lock.yaml"
    - "yarn.lock"
    - "package-lock.json"
  require_review:
    - "migrations/**"
    - "auth/**"
    - "**/middleware.*"

execution:
  default_model: sonnet
  max_parallel: 3
  pre_pr_checks:
    - build
    - typecheck
    - lint

cost:
  escalate_after_failures: 1
  max_attempts: 3
  greptile_enabled: false
EOF
    CONFIG_CREATED=true
    echo -e "  ${GREEN}✓${NC} Created .karimo/config.yaml"
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
MANIFEST_AGENTS=$(jq '.agents | length' "$MANIFEST")
MANIFEST_COMMANDS=$(jq '.commands | length' "$MANIFEST")
MANIFEST_SKILLS=$(jq '.skills | length' "$MANIFEST")
MANIFEST_TEMPLATES=$(jq '.templates | length' "$MANIFEST")

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
if [ "$CONFIG_CREATED" = true ]; then
    echo -e "  ${GREEN}✓${NC} .karimo/config.yaml    Auto-detected and created"
    echo "    Runtime: ${DETECTED_RUNTIME}"
    echo "    Framework: ${DETECTED_FRAMEWORK}"
    echo "    Package manager: ${DETECTED_PKG_MANAGER}"
elif [ "$SKIP_CONFIG" = true ]; then
    echo -e "  ${YELLOW}○${NC} Configuration skipped (--skip-config)"
    echo "    Run /karimo:configure to set up project configuration"
else
    echo -e "  ${YELLOW}○${NC} Configuration pending"
    echo "    Run /karimo:configure to set up project configuration"
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
echo "  1. Run '/karimo:doctor' to verify installation health"
if [ "$CONFIG_CREATED" = true ]; then
    echo "  2. Run '/karimo:plan' to create your first PRD"
    echo "  3. Run '/karimo:execute --prd {slug}' to start execution"
else
    echo "  2. Run '/karimo:configure' to set up project configuration"
    echo "  3. Run '/karimo:plan' to create your first PRD"
fi
echo "  4. Run '/karimo:feedback' for quick single-rule capture"
echo "  5. Run '/karimo:learn' for periodic deep learning cycles"
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
