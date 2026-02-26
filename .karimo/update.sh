#!/bin/bash

# KARIMO Update Script
# Two modes of operation:
#   1. Remote mode (default): Fetch latest release from GitHub
#   2. Local mode: Update from local KARIMO source directory
#
# Usage:
#   ./update.sh                    # Remote: fetch latest from GitHub
#   ./update.sh --check            # Remote: only check for updates
#   ./update.sh --local /path/to/KARIMO /path/to/project  # Local mode
#   ./update.sh --ci               # Non-interactive mode

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m' # No Color

# GitHub repository for releases
GITHUB_REPO="opensesh/KARIMO"
GITHUB_API="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"

# ==============================================================================
# ARGUMENT PARSING
# ==============================================================================

CHECK_ONLY=false
FORCE_UPDATE=false
CI_MODE=false
LOCAL_MODE=false
SOURCE_DIR=""
TARGET_DIR=""

show_help() {
    echo "KARIMO Update Script"
    echo ""
    echo "Usage:"
    echo "  ./update.sh                          Check for and apply updates from GitHub"
    echo "  ./update.sh --check                  Only check for updates, don't install"
    echo "  ./update.sh --force                  Update even if already on latest"
    echo "  ./update.sh --ci                     Non-interactive mode (auto-confirm)"
    echo "  ./update.sh --local <source> <target>  Update from local KARIMO source"
    echo ""
    echo "Examples:"
    echo "  # From within a project with KARIMO installed:"
    echo "  .karimo/update.sh"
    echo ""
    echo "  # From KARIMO source to a target project:"
    echo "  .karimo/update.sh --local . /path/to/project"
    echo ""
    echo "Files preserved (never modified):"
    echo "  - .karimo/config.yaml     (project configuration)"
    echo "  - .karimo/learnings.md    (compound learnings)"
    echo "  - .karimo/prds/*          (your PRD files)"
    echo "  - CLAUDE.md               (user-customized)"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --check)
            CHECK_ONLY=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --local)
            LOCAL_MODE=true
            SOURCE_DIR="$2"
            TARGET_DIR="$3"
            shift 3
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# ==============================================================================
# MANIFEST PARSING HELPERS (jq-free)
# ==============================================================================

manifest_list() {
    local key="$1"
    local manifest="$2"
    sed -n "/\"$key\"/,/]/p" "$manifest" | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

manifest_nested_list() {
    local key="$1"
    local manifest="$2"
    local parent="${key%%.*}"
    local child="${key#*.}"
    sed -n "/\"$parent\"/,/^[[:space:]]*}/p" "$manifest" | \
        sed -n "/\"$child\"/,/]/p" | grep '"' | grep -v "\"$child\"" | \
        sed 's/.*"\([^"]*\)".*/\1/'
}

manifest_get() {
    local key="$1"
    local manifest="$2"
    local parent="${key%%.*}"
    local child="${key#*.}"
    sed -n "/\"$parent\"/,/}/p" "$manifest" | \
        grep "\"$child\"" | head -1 | sed 's/.*"'"$child"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# ==============================================================================
# VERSION COMPARISON
# ==============================================================================

semver_compare() {
    local v1="${1#v}"
    local v2="${2#v}"

    local IFS='.'
    read -ra V1_PARTS <<< "$v1"
    read -ra V2_PARTS <<< "$v2"

    for i in 0 1 2; do
        local p1="${V1_PARTS[$i]:-0}"
        local p2="${V2_PARTS[$i]:-0}"

        if (( p1 > p2 )); then
            return 0  # v1 > v2
        elif (( p1 < p2 )); then
            return 2  # v1 < v2
        fi
    done

    return 1  # equal
}

# ==============================================================================
# HEADER
# ==============================================================================

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Update                                               │${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

# ==============================================================================
# MODE DETECTION
# ==============================================================================

if [ "$LOCAL_MODE" = true ]; then
    # Local mode: update from source directory to target
    if [ -z "$SOURCE_DIR" ] || [ -z "$TARGET_DIR" ]; then
        echo -e "${RED}Error: --local requires <source> and <target> paths${NC}"
        show_help
        exit 1
    fi

    # Resolve paths
    SOURCE_DIR="$(cd "$SOURCE_DIR" 2>/dev/null && pwd)"
    TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)"

    KARIMO_SOURCE="$SOURCE_DIR"
    PROJECT_ROOT="$TARGET_DIR"
    MANIFEST="$KARIMO_SOURCE/.karimo/MANIFEST.json"

    if [ ! -f "$KARIMO_SOURCE/.karimo/VERSION" ]; then
        echo -e "${RED}Error: KARIMO source not found at $KARIMO_SOURCE${NC}"
        exit 1
    fi

    if [ ! -f "$PROJECT_ROOT/.karimo/VERSION" ]; then
        echo -e "${RED}Error: KARIMO not installed at $PROJECT_ROOT${NC}"
        echo "Run install.sh first."
        exit 1
    fi

    CURRENT_VERSION=$(cat "$PROJECT_ROOT/.karimo/VERSION" | tr -d '[:space:]')
    LATEST_VERSION=$(cat "$KARIMO_SOURCE/.karimo/VERSION" | tr -d '[:space:]')

    echo -e "Mode: ${GREEN}Local update${NC}"
    echo -e "Source: $KARIMO_SOURCE"
    echo -e "Target: $PROJECT_ROOT"
    echo

else
    # Remote mode: fetch from GitHub
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

    # Check KARIMO is installed
    if [ ! -f "$SCRIPT_DIR/VERSION" ]; then
        echo -e "${RED}Error: VERSION file not found${NC}"
        echo "KARIMO may not be properly installed."
        exit 1
    fi

    CURRENT_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
    echo -e "Mode: ${GREEN}Remote update (GitHub)${NC}"
    echo -e "Project: $PROJECT_ROOT"
    echo
fi

echo -e "Current version: ${GREEN}${CURRENT_VERSION}${NC}"

# ==============================================================================
# FETCH LATEST VERSION
# ==============================================================================

if [ "$LOCAL_MODE" = true ]; then
    echo -e "Source version:  ${GREEN}${LATEST_VERSION}${NC}"
else
    echo -e "${DIM}Checking GitHub for updates...${NC}"

    RELEASE_INFO=$(curl -s -H "Accept: application/vnd.github.v3+json" "$GITHUB_API" 2>/dev/null)

    if [ -z "$RELEASE_INFO" ] || echo "$RELEASE_INFO" | grep -q '"message"'; then
        echo -e "${YELLOW}Warning: Could not fetch release info from GitHub${NC}"
        echo -e "${DIM}This might be a rate limit or network issue.${NC}"
        echo ""
        echo "You can manually update by:"
        echo "  1. Download latest release from https://github.com/${GITHUB_REPO}/releases"
        echo "  2. Run: .karimo/update.sh --local <downloaded-karimo> ."
        exit 1
    fi

    LATEST_VERSION=$(echo "$RELEASE_INFO" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    TARBALL_URL=$(echo "$RELEASE_INFO" | grep '"tarball_url"' | head -1 | sed 's/.*"tarball_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    LATEST_VERSION="${LATEST_VERSION#v}"
    echo -e "Latest version:  ${GREEN}${LATEST_VERSION}${NC}"
fi

echo

# ==============================================================================
# VERSION COMPARISON
# ==============================================================================

semver_compare "$LATEST_VERSION" "$CURRENT_VERSION"
COMPARE_RESULT=$?

if [ $COMPARE_RESULT -eq 1 ]; then
    echo -e "${GREEN}✓ You're on the latest version!${NC}"
    if [ "$FORCE_UPDATE" = false ]; then
        exit 0
    else
        echo -e "${YELLOW}Force update requested, continuing...${NC}"
        echo
    fi
elif [ $COMPARE_RESULT -eq 2 ]; then
    echo -e "${YELLOW}You're running a newer version than the latest release.${NC}"
    if [ "$FORCE_UPDATE" = false ]; then
        exit 0
    else
        echo -e "${YELLOW}Force update requested, continuing...${NC}"
        echo
    fi
else
    echo -e "${GREEN}Update available: ${CURRENT_VERSION} → ${LATEST_VERSION}${NC}"
    echo
fi

if [ "$CHECK_ONLY" = true ]; then
    echo "Run without --check to install the update."
    exit 0
fi

# ==============================================================================
# CONFIRM UPDATE
# ==============================================================================

echo "This update will:"
echo "  • Replace KARIMO commands, agents, skills, and templates"
echo "  • Update GitHub workflow files (existing ones only)"
echo ""
echo "These files are ${GREEN}preserved${NC} (never modified):"
echo "  • .karimo/config.yaml"
echo "  • .karimo/learnings.md"
echo "  • .karimo/prds/*"
echo "  • CLAUDE.md"
echo

if [ "$CI_MODE" = false ]; then
    read -p "Continue with update? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Update cancelled."
        exit 0
    fi
fi

# ==============================================================================
# DOWNLOAD (Remote mode only)
# ==============================================================================

if [ "$LOCAL_MODE" = false ]; then
    echo
    echo -e "${BLUE}Downloading KARIMO ${LATEST_VERSION}...${NC}"

    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    TARBALL_PATH="$TEMP_DIR/karimo.tar.gz"
    curl -sL "$TARBALL_URL" -o "$TARBALL_PATH"

    if [ ! -f "$TARBALL_PATH" ] || [ ! -s "$TARBALL_PATH" ]; then
        echo -e "${RED}Error: Failed to download release${NC}"
        exit 1
    fi

    echo "Extracting..."
    tar -xzf "$TARBALL_PATH" -C "$TEMP_DIR"

    KARIMO_SOURCE=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "*KARIMO*" | head -1)

    if [ -z "$KARIMO_SOURCE" ] || [ ! -d "$KARIMO_SOURCE" ]; then
        echo -e "${RED}Error: Could not find extracted KARIMO directory${NC}"
        exit 1
    fi

    MANIFEST="$KARIMO_SOURCE/.karimo/MANIFEST.json"
fi

# Verify manifest
if [ ! -f "$MANIFEST" ]; then
    echo -e "${RED}Error: MANIFEST.json not found${NC}"
    exit 1
fi

# ==============================================================================
# APPLY UPDATE
# ==============================================================================

echo
echo -e "${BLUE}Applying update...${NC}"

# Track counts
UPDATED_AGENTS=0
UPDATED_COMMANDS=0
UPDATED_SKILLS=0
UPDATED_TEMPLATES=0
UPDATED_WORKFLOWS=0

# Create directories if needed
mkdir -p "$PROJECT_ROOT/.claude/agents"
mkdir -p "$PROJECT_ROOT/.claude/commands"
mkdir -p "$PROJECT_ROOT/.claude/skills"
mkdir -p "$PROJECT_ROOT/.karimo/templates"
mkdir -p "$PROJECT_ROOT/.github/workflows"
mkdir -p "$PROJECT_ROOT/.github/ISSUE_TEMPLATE"

# Update agents
echo "  Updating agents..."
for agent in $(manifest_list "agents" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.claude/agents/$agent" ]; then
        cp "$KARIMO_SOURCE/.claude/agents/$agent" "$PROJECT_ROOT/.claude/agents/"
        UPDATED_AGENTS=$((UPDATED_AGENTS + 1))
    fi
done

# Update commands
echo "  Updating commands..."
for cmd in $(manifest_list "commands" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.claude/commands/$cmd" ]; then
        cp "$KARIMO_SOURCE/.claude/commands/$cmd" "$PROJECT_ROOT/.claude/commands/"
        UPDATED_COMMANDS=$((UPDATED_COMMANDS + 1))
    fi
done

# Update skills
echo "  Updating skills..."
for skill in $(manifest_list "skills" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.claude/skills/$skill" ]; then
        cp "$KARIMO_SOURCE/.claude/skills/$skill" "$PROJECT_ROOT/.claude/skills/"
        UPDATED_SKILLS=$((UPDATED_SKILLS + 1))
    fi
done

# Update templates
echo "  Updating templates..."
for template in $(manifest_list "templates" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.karimo/templates/$template" ]; then
        cp "$KARIMO_SOURCE/.karimo/templates/$template" "$PROJECT_ROOT/.karimo/templates/"
        UPDATED_TEMPLATES=$((UPDATED_TEMPLATES + 1))
    fi
done

# Update KARIMO_RULES.md
if [ -f "$KARIMO_SOURCE/.claude/KARIMO_RULES.md" ]; then
    echo "  Updating KARIMO_RULES.md..."
    cp "$KARIMO_SOURCE/.claude/KARIMO_RULES.md" "$PROJECT_ROOT/.claude/KARIMO_RULES.md"
fi

# Update workflows (only replace existing ones for optional, always update required)
echo "  Updating workflows..."
for workflow in $(manifest_nested_list "workflows.required" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.github/workflows/$workflow" ]; then
        cp "$KARIMO_SOURCE/.github/workflows/$workflow" "$PROJECT_ROOT/.github/workflows/"
        UPDATED_WORKFLOWS=$((UPDATED_WORKFLOWS + 1))
    fi
done
for workflow in $(manifest_nested_list "workflows.optional" "$MANIFEST"); do
    # Only update if already installed
    if [ -f "$PROJECT_ROOT/.github/workflows/$workflow" ] && [ -f "$KARIMO_SOURCE/.github/workflows/$workflow" ]; then
        cp "$KARIMO_SOURCE/.github/workflows/$workflow" "$PROJECT_ROOT/.github/workflows/"
        UPDATED_WORKFLOWS=$((UPDATED_WORKFLOWS + 1))
    fi
done

# Update issue template
ISSUE_TEMPLATE=$(manifest_get "other.issue_template" "$MANIFEST")
if [ -n "$ISSUE_TEMPLATE" ] && [ -f "$KARIMO_SOURCE/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" ]; then
    cp "$KARIMO_SOURCE/.github/ISSUE_TEMPLATE/$ISSUE_TEMPLATE" "$PROJECT_ROOT/.github/ISSUE_TEMPLATE/"
fi

# Update VERSION and MANIFEST
echo "  Updating version info..."
cp "$KARIMO_SOURCE/.karimo/VERSION" "$PROJECT_ROOT/.karimo/VERSION"
cp "$MANIFEST" "$PROJECT_ROOT/.karimo/MANIFEST.json"

# Update the update script itself
if [ -f "$KARIMO_SOURCE/.karimo/update.sh" ]; then
    cp "$KARIMO_SOURCE/.karimo/update.sh" "$PROJECT_ROOT/.karimo/update.sh"
    chmod +x "$PROJECT_ROOT/.karimo/update.sh"
fi

# ==============================================================================
# COMPLETE
# ==============================================================================

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Update Complete!                                            │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo -e "Updated to version: ${GREEN}${LATEST_VERSION}${NC}"
echo
echo "Updated files:"
echo "  • $UPDATED_AGENTS agents"
echo "  • $UPDATED_COMMANDS commands"
echo "  • $UPDATED_SKILLS skills"
echo "  • $UPDATED_TEMPLATES templates"
echo "  • $UPDATED_WORKFLOWS workflows"
echo "  • KARIMO_RULES.md"
echo "  • VERSION, MANIFEST.json"
echo
echo "Preserved (not modified):"
echo "  • .karimo/config.yaml"
echo "  • .karimo/learnings.md"
echo "  • .karimo/prds/*"
echo "  • CLAUDE.md"
echo
echo -e "${DIM}Run /karimo-doctor to verify the updated installation.${NC}"
