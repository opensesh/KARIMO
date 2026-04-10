#!/bin/bash

# KARIMO v3 Installation Script
# Installs KARIMO into a target project
# Uses MANIFEST.json as the single source of truth for file inventory
#
# Usage:
#   bash install.sh                    # Auto-detect (git root or current dir)
#   bash install.sh /path/to/project   # Explicit path
#   bash install.sh --ci               # CI mode (non-interactive)
#
# Auto-detection priority:
#   1. Git repository root (if in a git repo)
#   2. Current directory (if not in a git repo)
#   3. Explicit path (if provided as argument)

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

# Auto-detect target directory if not provided
if [ -z "$TARGET_DIR" ]; then
    # Try to detect git root first
    if GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
        TARGET_DIR="$GIT_ROOT"
        echo -e "${BLUE}Auto-detected git repository root: $TARGET_DIR${NC}"
    else
        # Fall back to current directory
        TARGET_DIR="."
        echo -e "${BLUE}Using current directory (not a git repo): $(pwd)${NC}"
    fi
else
    # Explicit path provided by user
    echo -e "${BLUE}Using specified path: $TARGET_DIR${NC}"
fi

echo
echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO v3 Installation                                      │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Resolve to absolute path for clearer messaging
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# Prevent self-installation (installing KARIMO into its own source)
if [ "$TARGET_DIR" = "$KARIMO_ROOT" ]; then
    echo -e "${RED}Error: Cannot install KARIMO into its own source directory.${NC}"
    echo "Please run from your target project directory:"
    echo "  cd /path/to/your/project"
    echo "  bash /path/to/KARIMO/.karimo/install.sh"
    echo
    echo "Or specify an explicit path:"
    echo "  bash $0 /path/to/your/project"
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
        # Get current and new versions
        CURRENT_VERSION=$(cat "$TARGET_DIR/.karimo/VERSION" 2>/dev/null | tr -d '[:space:]')
        NEW_VERSION=$(cat "$KARIMO_ROOT/.karimo/VERSION" | tr -d '[:space:]')

        # Get counts from manifest
        AGENT_CNT=$(manifest_count "agents")
        CMD_CNT=$(manifest_count "commands")
        SKILL_CNT=$(manifest_count "skills")
        TMPL_CNT=$(manifest_count "templates")
        SCRIPT_CNT=$(manifest_count "scripts")

        echo -e "${YELLOW}KARIMO is already installed.${NC}"
        echo ""
        echo -e "Current version: ${GREEN}${CURRENT_VERSION:-unknown}${NC}"
        echo -e "New version:     ${GREEN}${NEW_VERSION}${NC}"
        echo ""
        echo "this will update:"
        echo "  • ${AGENT_CNT} agents"
        echo "  • ${CMD_CNT} commands"
        echo "  • ${SKILL_CNT} skills"
        echo "  • ${TMPL_CNT} templates"
        echo "  • ${SCRIPT_CNT} scripts"
        echo "  • KARIMO_RULES.md"
        echo "  • CLAUDE.md (KARIMO section)"
        echo ""
        echo "preserved (not modified):"
        echo "  • .karimo/config.yaml"
        echo "  • .karimo/learnings.md"
        echo "  • .karimo/prds/*"
        echo "  • CLAUDE.md (your content outside KARIMO markers)"
        echo ""
        echo -e "\033[2m💡 Tip: Use update.sh for routine updates (shows diff preview).\033[0m"
        echo -e "\033[2m   Use install.sh for full reinstall.\033[0m"
        echo ""
        read -p "Continue with reinstall? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
fi

echo -e "${GREEN}Installing KARIMO to: $TARGET_DIR${NC}"
echo

# Create directory structure (v8 plugin structure)
echo "Creating directories..."
mkdir -p "$TARGET_DIR/.claude/plugins/karimo/agents"
mkdir -p "$TARGET_DIR/.claude/plugins/karimo/commands"
mkdir -p "$TARGET_DIR/.claude/plugins/karimo/skills"
mkdir -p "$TARGET_DIR/.claude/plugins/karimo/.claude-plugin"
mkdir -p "$TARGET_DIR/.karimo/templates"
mkdir -p "$TARGET_DIR/.karimo/scripts"
mkdir -p "$TARGET_DIR/.karimo/prds"
mkdir -p "$TARGET_DIR/.karimo/findings/by-prd"
mkdir -p "$TARGET_DIR/.karimo/findings/by-pattern"
mkdir -p "$TARGET_DIR/.github/ISSUE_TEMPLATE"

# ==============================================================================
# MANIFEST-DRIVEN FILE INSTALLATION
# ==============================================================================

# Copy agents from manifest (v8 plugin structure)
echo "Copying agents..."
AGENT_COUNT=0
for agent in $(manifest_list "agents"); do
    src="$KARIMO_ROOT/.claude/$agent"
    dst="$TARGET_DIR/.claude/$agent"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Agent not found: $agent${NC}"
    fi
done
echo "  Copied $AGENT_COUNT agents"

# Copy commands from manifest (v8 plugin structure)
echo "Copying commands..."
COMMAND_COUNT=0
for cmd in $(manifest_list "commands"); do
    src="$KARIMO_ROOT/.claude/$cmd"
    dst="$TARGET_DIR/.claude/$cmd"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        COMMAND_COUNT=$((COMMAND_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Command not found: $cmd${NC}"
    fi
done
echo "  Copied $COMMAND_COUNT commands"

# Copy skills from manifest (v8 plugin structure)
echo "Copying skills..."
SKILL_COUNT=0
for skill in $(manifest_list "skills"); do
    src="$KARIMO_ROOT/.claude/$skill"
    dst="$TARGET_DIR/.claude/$skill"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Skill not found: $skill${NC}"
    fi
done
echo "  Copied $SKILL_COUNT skills"

# Copy templates from manifest (supports subfolders)
echo "Copying templates..."
TEMPLATE_COUNT=0
for template in $(manifest_list "templates"); do
    src="$KARIMO_ROOT/.karimo/templates/$template"
    dst="$TARGET_DIR/.karimo/templates/$template"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        TEMPLATE_COUNT=$((TEMPLATE_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Template not found: $template${NC}"
    fi
done
echo "  Copied $TEMPLATE_COUNT templates"

# Copy scripts from manifest
echo "Copying scripts..."
SCRIPT_COUNT=0
for script in $(manifest_list "scripts"); do
    src="$KARIMO_ROOT/.karimo/scripts/$script"
    dst="$TARGET_DIR/.karimo/scripts/$script"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
    else
        echo -e "  ${YELLOW}Warning: Script not found: $script${NC}"
    fi
done
echo "  Copied $SCRIPT_COUNT scripts"

# Copy version tracking and manifest
echo "Setting version..."
cp "$KARIMO_ROOT/.karimo/VERSION" "$TARGET_DIR/.karimo/VERSION"
cp "$MANIFEST" "$TARGET_DIR/.karimo/MANIFEST.json"

# Copy issue template (read filename from manifest)
echo "Copying issue template..."
ISSUE_TEMPLATE=$(manifest_get "other.issue_template")
cp "$KARIMO_ROOT/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" "$TARGET_DIR/.github/ISSUE_TEMPLATE/"

# Create .gitkeep for prds directory
touch "$TARGET_DIR/.karimo/prds/.gitkeep"

# Copy KARIMO_RULES.md to plugin directory (v8 plugin structure)
echo "Copying KARIMO rules..."
cp "$KARIMO_ROOT/.claude/plugins/karimo/KARIMO_RULES.md" "$TARGET_DIR/.claude/plugins/karimo/KARIMO_RULES.md"

# Copy plugin manifest
echo "Copying plugin manifest..."
cp "$KARIMO_ROOT/.claude/plugins/karimo/.claude-plugin/plugin.json" "$TARGET_DIR/.claude/plugins/karimo/.claude-plugin/plugin.json"

# Copy plugin README
cp "$KARIMO_ROOT/.claude/plugins/karimo/README.md" "$TARGET_DIR/.claude/plugins/karimo/README.md"

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
    elif [ -f "$TARGET_DIR/bun.lock" ] || [ -f "$TARGET_DIR/bun.lockb" ]; then
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
        if [ -f "$TARGET_DIR/bun.lock" ] || [ -f "$TARGET_DIR/bun.lockb" ]; then
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
        echo -e "  ${YELLOW}Run /karimo:configure after installation to set up${NC}"
    fi
fi

# ==============================================================================
# END AUTO-DETECTION
# ==============================================================================

# Add marker-delimited KARIMO section to CLAUDE.md
echo "Updating CLAUDE.md..."

# Check all possible locations for CLAUDE.md (case-insensitive)
# Claude Code projects may use either root or .claude/ directory
# Some projects use lowercase claude.md
if [ -f "$TARGET_DIR/.claude/CLAUDE.md" ]; then
    CLAUDE_MD="$TARGET_DIR/.claude/CLAUDE.md"
    echo "  Found CLAUDE.md at .claude/CLAUDE.md"
elif [ -f "$TARGET_DIR/.claude/claude.md" ]; then
    CLAUDE_MD="$TARGET_DIR/.claude/claude.md"
    echo "  Found claude.md at .claude/claude.md"
elif [ -f "$TARGET_DIR/CLAUDE.md" ]; then
    CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
    echo "  Found CLAUDE.md at root"
elif [ -f "$TARGET_DIR/claude.md" ]; then
    CLAUDE_MD="$TARGET_DIR/claude.md"
    echo "  Found claude.md at root"
else
    CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
fi

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

- **Commands:** Type `/karimo:` to see all commands
- **Agent rules:** `.claude/plugins/karimo/KARIMO_RULES.md`
- **Configuration:** `.karimo/config.yaml`
- **Learnings:** `.karimo/learnings/`

### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | _pending_ |
| Owner | _pending_ |
| Repository | _pending_ |

_Run `/karimo:configure` to detect and populate these values._
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

# Create learnings directory structure if it doesn't exist
LEARNINGS_DIR="$TARGET_DIR/.karimo/learnings"
if [ ! -d "$LEARNINGS_DIR" ]; then
    echo "Creating learnings directory structure..."
    mkdir -p "$LEARNINGS_DIR/patterns"
    mkdir -p "$LEARNINGS_DIR/anti-patterns"
    mkdir -p "$LEARNINGS_DIR/project-notes"
    mkdir -p "$LEARNINGS_DIR/execution-rules"

    # Copy learnings index and template from source
    if [ -f "$KARIMO_ROOT/.karimo/learnings/index.md" ]; then
        cp "$KARIMO_ROOT/.karimo/learnings/index.md" "$LEARNINGS_DIR/"
        cp "$KARIMO_ROOT/.karimo/learnings/TEMPLATE.md" "$LEARNINGS_DIR/"
        cp "$KARIMO_ROOT/.karimo/learnings/patterns/index.md" "$LEARNINGS_DIR/patterns/"
        cp "$KARIMO_ROOT/.karimo/learnings/anti-patterns/index.md" "$LEARNINGS_DIR/anti-patterns/"
        cp "$KARIMO_ROOT/.karimo/learnings/project-notes/index.md" "$LEARNINGS_DIR/project-notes/"
        cp "$KARIMO_ROOT/.karimo/learnings/execution-rules/index.md" "$LEARNINGS_DIR/execution-rules/"
        echo "  Created .karimo/learnings/ directory structure"
    else
        echo -e "  ${YELLOW}Warning: Learnings templates not found in source${NC}"
    fi
fi

# Create legacy learnings.md symlink for backward compatibility
LEARNINGS_LEGACY="$TARGET_DIR/.karimo/learnings.md"
if [ ! -f "$LEARNINGS_LEGACY" ] && [ ! -L "$LEARNINGS_LEGACY" ]; then
    cat > "$LEARNINGS_LEGACY" << 'LEARNEOF'
# KARIMO Learnings (Legacy)

**This file is deprecated.** Learnings are now stored in `.karimo/learnings/` directory.

See `.karimo/learnings/index.md` for the new structure.

---

_Kept for backward compatibility. Agents now read from `.karimo/learnings/`._
LEARNEOF
    echo "  Created legacy .karimo/learnings.md (deprecated notice)"
fi

# Create findings directory structure if it doesn't exist
FINDINGS_DIR="$TARGET_DIR/.karimo/findings"
if [ ! -f "$FINDINGS_DIR/index.md" ]; then
    echo "Creating findings directory structure..."
    if [ -f "$KARIMO_ROOT/.karimo/findings/index.md" ]; then
        cp "$KARIMO_ROOT/.karimo/findings/index.md" "$FINDINGS_DIR/"
        cp "$KARIMO_ROOT/.karimo/findings/PROMOTION_GUIDE.md" "$FINDINGS_DIR/"
        cp "$KARIMO_ROOT/.karimo/findings/by-prd/index.md" "$FINDINGS_DIR/by-prd/"
        cp "$KARIMO_ROOT/.karimo/findings/by-pattern/index.md" "$FINDINGS_DIR/by-pattern/"
        echo "  Created .karimo/findings/ directory structure"
    else
        echo -e "  ${YELLOW}Warning: Findings templates not found in source${NC}"
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

# Get counts from manifest for summary
MANIFEST_AGENTS=$(manifest_count "agents")
MANIFEST_COMMANDS=$(manifest_count "commands")
MANIFEST_SKILLS=$(manifest_count "skills")
MANIFEST_TEMPLATES=$(manifest_count "templates")
MANIFEST_SCRIPTS=$(manifest_count "scripts")

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Installation Complete!                                      │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo "Installed files:"
echo "  .claude/plugins/karimo/agents/    $MANIFEST_AGENTS agent definitions"
echo "  .claude/plugins/karimo/commands/  $MANIFEST_COMMANDS slash commands (/karimo:*)"
echo "  .claude/plugins/karimo/skills/    $MANIFEST_SKILLS skill definitions"
echo "  .claude/plugins/karimo/KARIMO_RULES.md  Agent behavior rules"
echo "  .karimo/templates/                $MANIFEST_TEMPLATES templates"
echo "  .karimo/scripts/                  $MANIFEST_SCRIPTS CLI scripts"
echo "  .karimo/VERSION                   Version tracking"
echo "  .karimo/MANIFEST.json             File inventory"
echo "  .github/ISSUE_TEMPLATE/           1 issue template"
echo "  CLAUDE.md                         Updated with reference block"
echo "  .gitignore                        Updated with .worktrees/"
echo
echo "Configuration:"
if [ "$CONFIG_AUTODETECTED" = true ]; then
    echo -e "  ${GREEN}✓${NC} Auto-detected project context"
    echo "    Runtime: ${DETECTED_RUNTIME}"
    echo "    Framework: ${DETECTED_FRAMEWORK}"
    echo "    Package manager: ${DETECTED_PKG_MANAGER}"
    echo "    Run /karimo:configure to save to .karimo/config.yaml"
else
    echo -e "  ${YELLOW}○${NC} Configuration pending"
    echo "    Run /karimo:configure to create config"
fi
echo
echo "Next steps:"
echo "  1. Run '/karimo:doctor' to verify installation health"
if [ "$CONFIG_AUTODETECTED" = true ]; then
    echo "  2. Run '/karimo:plan' to create your first PRD"
    echo "  3. Run '/karimo:run --prd {slug}' to start execution"
else
    echo "  2. Run '/karimo:configure' to complete configuration"
    echo "  3. Run '/karimo:plan' to create your first PRD"
fi
echo "  4. Run '/karimo:feedback' to capture learnings"
echo "  5. Run '/karimo:status' to monitor progress"
echo
echo "For more information, see: https://github.com/opensesh/KARIMO"
echo
echo "License: Apache 2.0 (see LICENSE in KARIMO source)"
echo "KARIMO installed files are licensed under Apache 2.0."
echo "Your project code remains under your own license."
