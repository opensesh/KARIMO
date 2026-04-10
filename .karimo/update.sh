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

# ==============================================================================
# SELF-REPLACEMENT GUARD
# ==============================================================================
# This script replaces itself during updates. Bash reads scripts by byte offset,
# not by loading the entire file. If the file changes mid-execution, bash reads
# from misaligned positions causing syntax errors. Fix: re-exec from a temp copy.

if [ -z "$KARIMO_UPDATE_REEXEC" ]; then
    # Preserve original paths BEFORE re-exec (temp file loses BASH_SOURCE context)
    export KARIMO_ORIGINAL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    export KARIMO_ORIGINAL_PROJECT_ROOT="$(dirname "$KARIMO_ORIGINAL_SCRIPT_DIR")"

    tmp_script=$(mktemp)
    cp "$0" "$tmp_script"
    chmod +x "$tmp_script"
    export KARIMO_UPDATE_REEXEC=1
    exec bash "$tmp_script" "$@"
fi

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
    echo "  - .karimo/learnings/      (compound learnings)"
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

manifest_get() {
    local key="$1"
    local manifest="$2"
    local parent="${key%%.*}"
    local child="${key#*.}"
    sed -n "/\"$parent\"/,/}/p" "$manifest" | \
        grep "\"$child\"" | head -1 | sed 's/.*"'"$child"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# Remove files not in manifest (handles renames/deletions)
# Works with v8 plugin structure (plugins/karimo/*/*.md files)
cleanup_stale_files() {
    local category="$1"  # agents, commands, or skills
    local manifest_file="$2"
    local project_root="$3"
    local removed=0

    # Get list of files that SHOULD exist (from manifest)
    local expected_files=$(manifest_list "$category" "$manifest_file")

    # Check each *.md file in plugins/karimo/{category}/
    local plugin_dir="$project_root/.claude/plugins/karimo/$category"
    if [ -d "$plugin_dir" ]; then
        for file in "$plugin_dir"/*.md; do
            [ -f "$file" ] || continue
            local filename=$(basename "$file")
            local rel_path="plugins/karimo/$category/$filename"

            # If not in manifest, remove it
            if ! echo "$expected_files" | grep -qx "$rel_path"; then
                echo "    Removing stale: $rel_path" >&2
                rm "$file"
                removed=$((removed + 1))
            fi
        done
    fi

    echo $removed
}

# Remove deprecated files listed in MANIFEST.json deprecated section
cleanup_deprecated() {
    local target_dir="$1"
    local manifest_file="$2"
    local removed=0

    echo "  Cleaning up deprecated files..." >&2

    # Parse deprecated section from manifest for each category
    for category in commands agents skills; do
        local deprecated=$(sed -n '/"deprecated"/,/^[[:space:]]*}/p' "$manifest_file" | \
            sed -n "/\"$category\"/,/]/p" | grep '"' | grep -v "\"$category\"" | \
            sed 's/.*"\([^"]*\)".*/\1/')

        for file in $deprecated; do
            local path="$target_dir/.claude/$category/$file"
            if [ -f "$path" ]; then
                echo "    Removing deprecated: $file" >&2
                rm "$path"
                removed=$((removed + 1))
            fi
        done
    done

    # Handle abstract_files section (cleanup from v7.9.0 subfolder structure)
    local deprecated_abstracts=$(sed -n '/"deprecated"/,/^[[:space:]]*}/p' "$manifest_file" | \
        sed -n '/"abstract_files"/,/]/p' | grep '"' | grep -v '"abstract_files"' | \
        sed 's/.*"\([^"]*\)".*/\1/')

    for file in $deprecated_abstracts; do
        # Check in all three locations (agents, commands, skills)
        for category in agents commands skills; do
            local path="$target_dir/.claude/$category/$file"
            if [ -f "$path" ]; then
                echo "    Removing abstract: $file" >&2
                rm "$path"
                removed=$((removed + 1))
            fi
        done
    done

    # Handle templates separately (different path)
    local deprecated_templates=$(sed -n '/"deprecated"/,/^[[:space:]]*}/p' "$manifest_file" | \
        sed -n '/"templates"/,/]/p' | grep '"' | grep -v '"templates"' | \
        sed 's/.*"\([^"]*\)".*/\1/')

    for file in $deprecated_templates; do
        local path="$target_dir/.karimo/templates/$file"
        if [ -f "$path" ]; then
            echo "    Removing deprecated template: $file" >&2
            rm "$path"
            removed=$((removed + 1))
        fi
    done

    # Remove empty karimo/ subfolders (migration from v7.9.0)
    for category in agents commands skills; do
        if [ -d "$target_dir/.claude/$category/karimo" ]; then
            if [ -z "$(ls -A "$target_dir/.claude/$category/karimo")" ]; then
                echo "    Removing empty karimo/ subfolder from $category..." >&2
                rmdir "$target_dir/.claude/$category/karimo"
            fi
        fi
    done

    # Remove empty worktrees directory if it exists
    if [ -d "$target_dir/.claude/worktrees" ]; then
        if [ -z "$(ls -A "$target_dir/.claude/worktrees")" ]; then
            echo "    Removing empty worktrees directory..." >&2
            rmdir "$target_dir/.claude/worktrees"
        fi
    fi

    # Ensure .worktrees/ is in .gitignore
    if [ -f "$target_dir/.gitignore" ]; then
        if ! grep -q "^\.worktrees/$" "$target_dir/.gitignore"; then
            echo "    Adding .worktrees/ to .gitignore..." >&2
            echo ".worktrees/" >> "$target_dir/.gitignore"
        fi
    fi

    if [ $removed -gt 0 ]; then
        echo "    Removed $removed deprecated file(s)" >&2
    fi
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
    # Use preserved paths from pre-reexec, fallback to calculation if not set
    SCRIPT_DIR="${KARIMO_ORIGINAL_SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
    PROJECT_ROOT="${KARIMO_ORIGINAL_PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"

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
echo "  • Replace KARIMO commands, agents, skills, templates, and scripts"
echo "  • Update GitHub workflow files (existing ones only)"
echo ""
echo "These files are ${GREEN}preserved${NC} (never modified):"
echo "  • .karimo/config.yaml"
echo "  • .karimo/learnings/  (your accumulated learnings)"
echo "  • .karimo/prds/*"
echo "  • CLAUDE.md (your content outside KARIMO markers)"
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
UPDATED_SCRIPTS=0
UPDATED_WORKFLOWS=0

# Create directories if needed (v8+ plugin structure)
mkdir -p "$PROJECT_ROOT/.claude/plugins/karimo/agents"
mkdir -p "$PROJECT_ROOT/.claude/plugins/karimo/commands"
mkdir -p "$PROJECT_ROOT/.claude/plugins/karimo/skills"
mkdir -p "$PROJECT_ROOT/.claude/plugins/karimo/.claude-plugin"
mkdir -p "$PROJECT_ROOT/.karimo/templates"
mkdir -p "$PROJECT_ROOT/.karimo/scripts"
mkdir -p "$PROJECT_ROOT/.karimo/learnings/patterns"
mkdir -p "$PROJECT_ROOT/.karimo/learnings/anti-patterns"
mkdir -p "$PROJECT_ROOT/.karimo/learnings/project-notes"
mkdir -p "$PROJECT_ROOT/.karimo/learnings/execution-rules"
mkdir -p "$PROJECT_ROOT/.karimo/findings/by-prd"
mkdir -p "$PROJECT_ROOT/.karimo/findings/by-pattern"
mkdir -p "$PROJECT_ROOT/.github/workflows"
mkdir -p "$PROJECT_ROOT/.github/ISSUE_TEMPLATE"

# Migrate flat learnings.md to directory structure if needed
if [ -f "$PROJECT_ROOT/.karimo/learnings.md" ] && [ ! -f "$PROJECT_ROOT/.karimo/learnings/index.md" ]; then
    echo "  Migrating learnings.md to directory structure..."
    # Create index.md with migration note
    cat > "$PROJECT_ROOT/.karimo/learnings/index.md" << 'LEARNEOF'
# KARIMO Learnings Index

_Categorized learnings for efficient retrieval. Migrated from learnings.md._

## Categories

| Category | Description | Entries |
|----------|-------------|---------|
| [patterns](patterns/) | Positive practices to replicate | 0 |
| [anti-patterns](anti-patterns/) | Mistakes to avoid | 0 |
| [project-notes](project-notes/) | Project-specific context | 0 |
| [execution-rules](execution-rules/) | Mandatory guidelines | 0 |

## Migration Note

The previous `learnings.md` content has been preserved at `.karimo/learnings.md.bak`.
Review and migrate entries to appropriate category directories using `/karimo-feedback`.

---
*Last updated: $(date +%Y-%m-%d)*
LEARNEOF
    # Backup old file
    mv "$PROJECT_ROOT/.karimo/learnings.md" "$PROJECT_ROOT/.karimo/learnings.md.bak"
    echo "    Backed up old learnings.md to learnings.md.bak"
fi

# Ensure learnings directory has required files
if [ ! -f "$PROJECT_ROOT/.karimo/learnings/index.md" ]; then
    cp "$KARIMO_SOURCE/.karimo/learnings/index.md" "$PROJECT_ROOT/.karimo/learnings/" 2>/dev/null || true
fi
if [ ! -f "$PROJECT_ROOT/.karimo/learnings/TEMPLATE.md" ]; then
    cp "$KARIMO_SOURCE/.karimo/learnings/TEMPLATE.md" "$PROJECT_ROOT/.karimo/learnings/" 2>/dev/null || true
fi
for category in patterns anti-patterns project-notes execution-rules; do
    if [ ! -f "$PROJECT_ROOT/.karimo/learnings/$category/index.md" ]; then
        cp "$KARIMO_SOURCE/.karimo/learnings/$category/index.md" "$PROJECT_ROOT/.karimo/learnings/$category/" 2>/dev/null || true
    fi
done

# Ensure findings directory has required files
if [ ! -f "$PROJECT_ROOT/.karimo/findings/index.md" ]; then
    cp "$KARIMO_SOURCE/.karimo/findings/index.md" "$PROJECT_ROOT/.karimo/findings/" 2>/dev/null || true
fi
if [ ! -f "$PROJECT_ROOT/.karimo/findings/PROMOTION_GUIDE.md" ]; then
    cp "$KARIMO_SOURCE/.karimo/findings/PROMOTION_GUIDE.md" "$PROJECT_ROOT/.karimo/findings/" 2>/dev/null || true
fi
for subdir in by-prd by-pattern; do
    if [ ! -f "$PROJECT_ROOT/.karimo/findings/$subdir/index.md" ]; then
        cp "$KARIMO_SOURCE/.karimo/findings/$subdir/index.md" "$PROJECT_ROOT/.karimo/findings/$subdir/" 2>/dev/null || true
    fi
done

# ==============================================================================
# MIGRATE TO v8 PLUGIN STRUCTURE
# ==============================================================================
# Handles migration from:
#   - v7.x karimo/ subfolder → v8+ plugins/karimo/ structure
#   - Old flat files → v8+ plugins/karimo/ structure

migrate_to_v8_plugin() {
    local project_root="$1"
    local migrated=0

    echo "  Checking for v7 to v8 migration..."

    # Migrate agents from .claude/agents/karimo/ to .claude/plugins/karimo/agents/
    if [ -d "$project_root/.claude/agents/karimo" ]; then
        echo "    Migrating agents to plugin structure..."
        for file in "$project_root/.claude/agents/karimo"/*.md; do
            [ -f "$file" ] || continue
            local filename=$(basename "$file")
            mv "$file" "$project_root/.claude/plugins/karimo/agents/$filename"
            migrated=$((migrated + 1))
        done
        rmdir "$project_root/.claude/agents/karimo" 2>/dev/null || true
    fi

    # Migrate commands from .claude/commands/karimo/ to .claude/plugins/karimo/commands/
    if [ -d "$project_root/.claude/commands/karimo" ]; then
        echo "    Migrating commands to plugin structure..."
        for file in "$project_root/.claude/commands/karimo"/*.md; do
            [ -f "$file" ] || continue
            local filename=$(basename "$file")
            mv "$file" "$project_root/.claude/plugins/karimo/commands/$filename"
            migrated=$((migrated + 1))
        done
        rmdir "$project_root/.claude/commands/karimo" 2>/dev/null || true
    fi

    # Migrate skills from .claude/skills/karimo/ to .claude/plugins/karimo/skills/
    if [ -d "$project_root/.claude/skills/karimo" ]; then
        echo "    Migrating skills to plugin structure..."
        for file in "$project_root/.claude/skills/karimo"/*.md; do
            [ -f "$file" ] || continue
            local filename=$(basename "$file")
            mv "$file" "$project_root/.claude/plugins/karimo/skills/$filename"
            migrated=$((migrated + 1))
        done
        rmdir "$project_root/.claude/skills/karimo" 2>/dev/null || true
    fi

    # Migrate KARIMO_RULES.md from .claude/ to .claude/plugins/karimo/
    if [ -f "$project_root/.claude/KARIMO_RULES.md" ]; then
        echo "    Migrating KARIMO_RULES.md to plugin structure..."
        mv "$project_root/.claude/KARIMO_RULES.md" "$project_root/.claude/plugins/karimo/KARIMO_RULES.md"
        migrated=$((migrated + 1))
    fi

    # Clean up empty karimo directories
    for category in agents commands skills; do
        if [ -d "$project_root/.claude/$category/karimo" ]; then
            if [ -z "$(ls -A "$project_root/.claude/$category/karimo")" ]; then
                rmdir "$project_root/.claude/$category/karimo" 2>/dev/null || true
            fi
        fi
    done

    if [ $migrated -gt 0 ]; then
        echo "    Migrated $migrated files to v8 plugin structure"
    else
        echo "    No v7 files to migrate"
    fi
}

# Run v8 migration
migrate_to_v8_plugin "$PROJECT_ROOT"

# Update agents (v8 plugin structure)
echo "  Updating agents..."
for agent in $(manifest_list "agents" "$MANIFEST"); do
    src="$KARIMO_SOURCE/.claude/$agent"
    dst="$PROJECT_ROOT/.claude/$agent"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        UPDATED_AGENTS=$((UPDATED_AGENTS + 1))
    fi
done

# Update commands (v8 plugin structure)
echo "  Updating commands..."
for cmd in $(manifest_list "commands" "$MANIFEST"); do
    src="$KARIMO_SOURCE/.claude/$cmd"
    dst="$PROJECT_ROOT/.claude/$cmd"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        UPDATED_COMMANDS=$((UPDATED_COMMANDS + 1))
    fi
done

# Update skills (v8 plugin structure)
echo "  Updating skills..."
for skill in $(manifest_list "skills" "$MANIFEST"); do
    src="$KARIMO_SOURCE/.claude/$skill"
    dst="$PROJECT_ROOT/.claude/$skill"
    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        UPDATED_SKILLS=$((UPDATED_SKILLS + 1))
    fi
done

# Cleanup stale files (handles renames/deletions)
echo "  Cleaning up stale files..."
CLEANED_AGENTS=$(cleanup_stale_files "agents" "$MANIFEST" "$PROJECT_ROOT")
CLEANED_COMMANDS=$(cleanup_stale_files "commands" "$MANIFEST" "$PROJECT_ROOT")
CLEANED_SKILLS=$(cleanup_stale_files "skills" "$MANIFEST" "$PROJECT_ROOT")
# Templates use different naming pattern, check manually
CLEANED_TEMPLATES=0

TOTAL_CLEANED=$((CLEANED_AGENTS + CLEANED_COMMANDS + CLEANED_SKILLS + CLEANED_TEMPLATES))
if [ $TOTAL_CLEANED -gt 0 ]; then
    echo "    Removed $CLEANED_AGENTS stale agents, $CLEANED_COMMANDS commands, $CLEANED_SKILLS skills, $CLEANED_TEMPLATES templates"
fi

# Remove deprecated files (manifest-driven)
cleanup_deprecated "$PROJECT_ROOT" "$MANIFEST"

# Update templates
echo "  Updating templates..."
for template in $(manifest_list "templates" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.karimo/templates/$template" ]; then
        cp "$KARIMO_SOURCE/.karimo/templates/$template" "$PROJECT_ROOT/.karimo/templates/"
        UPDATED_TEMPLATES=$((UPDATED_TEMPLATES + 1))
    fi
done

# Update scripts
echo "  Updating scripts..."
for script in $(manifest_list "scripts" "$MANIFEST"); do
    if [ -f "$KARIMO_SOURCE/.karimo/scripts/$script" ]; then
        cp "$KARIMO_SOURCE/.karimo/scripts/$script" "$PROJECT_ROOT/.karimo/scripts/"
        UPDATED_SCRIPTS=$((UPDATED_SCRIPTS + 1))
    fi
done

# Update KARIMO_RULES.md (v8 plugin structure)
if [ -f "$KARIMO_SOURCE/.claude/plugins/karimo/KARIMO_RULES.md" ]; then
    echo "  Updating KARIMO_RULES.md..."
    cp "$KARIMO_SOURCE/.claude/plugins/karimo/KARIMO_RULES.md" "$PROJECT_ROOT/.claude/plugins/karimo/KARIMO_RULES.md"
fi

# Update plugin.json
if [ -f "$KARIMO_SOURCE/.claude/plugins/karimo/.claude-plugin/plugin.json" ]; then
    echo "  Updating plugin.json..."
    cp "$KARIMO_SOURCE/.claude/plugins/karimo/.claude-plugin/plugin.json" "$PROJECT_ROOT/.claude/plugins/karimo/.claude-plugin/plugin.json"
fi

# Update plugin README
if [ -f "$KARIMO_SOURCE/.claude/plugins/karimo/README.md" ]; then
    cp "$KARIMO_SOURCE/.claude/plugins/karimo/README.md" "$PROJECT_ROOT/.claude/plugins/karimo/README.md"
fi

# ==============================================================================
# GREPTILE SETUP (when review_provider: greptile is configured)
# ==============================================================================

setup_greptile() {
    local config_file="$PROJECT_ROOT/.karimo/config.yaml"

    # Check if config exists and has greptile as review provider
    if [ ! -f "$config_file" ]; then
        return 0
    fi

    # Check for review_provider: greptile (handles both old and new config formats)
    if ! grep -qE "review_provider:\s*greptile|provider:\s*greptile" "$config_file"; then
        return 0
    fi

    echo "  Setting up Greptile integration..."

    # Step 1: Migrate old greptile.json to new .greptile/ structure
    if [ -f "$PROJECT_ROOT/greptile.json" ] && [ ! -f "$PROJECT_ROOT/.greptile/config.json" ]; then
        echo "    Migrating greptile.json to .greptile/config.json..."
        mkdir -p "$PROJECT_ROOT/.greptile"
        mv "$PROJECT_ROOT/greptile.json" "$PROJECT_ROOT/.greptile/config.json"
    fi

    # Step 2: Create .greptile directory if missing
    if [ ! -d "$PROJECT_ROOT/.greptile" ]; then
        mkdir -p "$PROJECT_ROOT/.greptile"
    fi

    # Step 3: Install config.json if missing
    if [ ! -f "$PROJECT_ROOT/.greptile/config.json" ]; then
        if [ -f "$KARIMO_SOURCE/.karimo/templates/greptile/config.json" ]; then
            echo "    Installing .greptile/config.json..."
            cp "$KARIMO_SOURCE/.karimo/templates/greptile/config.json" "$PROJECT_ROOT/.greptile/"
        fi
    fi

    # Step 4: Check rules.md status
    if [ ! -f "$PROJECT_ROOT/.greptile/rules.md" ]; then
        echo ""
        echo "    ⚠️  .greptile/rules.md missing"
        echo "       Run /karimo:configure --greptile to generate project-specific rules"
        echo ""
    elif grep -q "GENERIC_TEMPLATE" "$PROJECT_ROOT/.greptile/rules.md" 2>/dev/null; then
        # Detect generic template (contains placeholder text)
        echo ""
        echo "    ⚠️  .greptile/rules.md contains generic template"
        echo "       Run /karimo:configure --greptile to generate project-specific rules"
        echo ""
    fi

    # Step 5: Install workflow if missing
    local workflow_src="$KARIMO_SOURCE/.karimo/workflow-templates/karimo-greptile-trigger.yml"
    local workflow_dst="$PROJECT_ROOT/.github/workflows/karimo-greptile-review.yml"

    if [ -f "$workflow_src" ] && [ ! -f "$workflow_dst" ]; then
        echo "    Installing karimo-greptile-review.yml workflow..."
        mkdir -p "$PROJECT_ROOT/.github/workflows"
        cp "$workflow_src" "$workflow_dst"
        UPDATED_WORKFLOWS=$((UPDATED_WORKFLOWS + 1))
    fi

    echo "    Greptile integration configured"
}

# Run Greptile setup if configured
setup_greptile

# Update optional workflows if already installed (from .github/workflows/)
# Note: karimo-ci.yml is a source repo workflow only (validates MANIFEST.json)
# It should NOT be copied to target projects
echo "  Updating workflows..."
for workflow in "$KARIMO_SOURCE"/.github/workflows/karimo-*.yml; do
    [ -f "$workflow" ] || continue
    workflow_name=$(basename "$workflow")
    [ "$workflow_name" = "karimo-ci.yml" ] && continue  # Already handled above
    if [ -f "$PROJECT_ROOT/.github/workflows/$workflow_name" ]; then
        cp "$workflow" "$PROJECT_ROOT/.github/workflows/"
        UPDATED_WORKFLOWS=$((UPDATED_WORKFLOWS + 1))
    fi
done

# Update optional workflows if already installed (from .karimo/workflow-templates/)
for workflow in "$KARIMO_SOURCE"/.karimo/workflow-templates/karimo-*.yml; do
    [ -f "$workflow" ] || continue
    workflow_name=$(basename "$workflow")
    if [ -f "$PROJECT_ROOT/.github/workflows/$workflow_name" ]; then
        cp "$workflow" "$PROJECT_ROOT/.github/workflows/"
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
if ! cp -f "$KARIMO_SOURCE/.karimo/VERSION" "$PROJECT_ROOT/.karimo/VERSION"; then
    echo -e "${RED}Error: Failed to update VERSION file${NC}"
    exit 1
fi
if ! cp -f "$MANIFEST" "$PROJECT_ROOT/.karimo/MANIFEST.json"; then
    echo -e "${RED}Error: Failed to update MANIFEST.json${NC}"
    exit 1
fi

# Verify the updates
UPDATED_VERSION=$(cat "$PROJECT_ROOT/.karimo/VERSION" | tr -d '[:space:]')
if [ "$UPDATED_VERSION" != "$LATEST_VERSION" ]; then
    echo -e "${RED}Error: VERSION file update verification failed${NC}"
    echo "  Expected: $LATEST_VERSION"
    echo "  Got: $UPDATED_VERSION"
    exit 1
fi

# Update the update script itself
if [ -f "$KARIMO_SOURCE/.karimo/update.sh" ]; then
    cp "$KARIMO_SOURCE/.karimo/update.sh" "$PROJECT_ROOT/.karimo/update.sh"
    chmod +x "$PROJECT_ROOT/.karimo/update.sh"
fi

# ==============================================================================
# VERIFY/FIX GITIGNORE (handles incomplete prior installs)
# ==============================================================================

GITIGNORE="$PROJECT_ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
    if ! grep -q ".worktrees" "$GITIGNORE"; then
        echo "  Adding .worktrees/ to .gitignore..."
        echo "" >> "$GITIGNORE"
        echo "# KARIMO worktrees" >> "$GITIGNORE"
        echo ".worktrees/" >> "$GITIGNORE"
    fi
else
    echo "  Creating .gitignore with .worktrees/..."
    echo "# KARIMO worktrees" > "$GITIGNORE"
    echo ".worktrees/" >> "$GITIGNORE"
fi

# ==============================================================================
# VERIFY/FIX CLAUDE.MD KARIMO SECTION (handles incomplete prior installs)
# ==============================================================================

# Check all possible locations for CLAUDE.md (case-insensitive)
if [ -f "$PROJECT_ROOT/.claude/CLAUDE.md" ]; then
    CLAUDE_MD="$PROJECT_ROOT/.claude/CLAUDE.md"
elif [ -f "$PROJECT_ROOT/.claude/claude.md" ]; then
    CLAUDE_MD="$PROJECT_ROOT/.claude/claude.md"
elif [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
elif [ -f "$PROJECT_ROOT/claude.md" ]; then
    CLAUDE_MD="$PROJECT_ROOT/claude.md"
else
    CLAUDE_MD=""
fi

if [ -n "$CLAUDE_MD" ]; then
    if ! grep -q "<!-- KARIMO:START" "$CLAUDE_MD" && ! grep -q "## KARIMO" "$CLAUDE_MD"; then
        echo "  Adding KARIMO section to CLAUDE.md..."
        echo "" >> "$CLAUDE_MD"
        echo "---" >> "$CLAUDE_MD"
        echo "" >> "$CLAUDE_MD"
        cat >> "$CLAUDE_MD" << 'CLAUDEEOF'
<!-- KARIMO:START - Do not edit between markers -->
## KARIMO

This project uses [KARIMO](https://github.com/opensesh/KARIMO) for PRD-driven autonomous development.

### Quick Reference

- **Commands:** Type `/karimo-` to see all commands
- **Agent rules:** `.claude/plugins/karimo/KARIMO_RULES.md`
- **Configuration:** `.karimo/config.yaml`
- **Learnings:** `.karimo/learnings/`

### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | _pending_ |
| Owner | _pending_ |
| Repository | _pending_ |

_Run `/karimo-configure` to detect and populate these values._
<!-- KARIMO:END -->
CLAUDEEOF
    fi
fi

# ==============================================================================
# GIT AUTO-COMMIT
# ==============================================================================

attempt_git_commit() {
    # Check if this is a git repository
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        return 0  # Silent skip if not a git repo
    fi

    # Check if there are KARIMO-related changes
    cd "$PROJECT_ROOT"
    if ! git status --porcelain | grep -q -E "^\s*(M|A|D)\s+(.claude/|.karimo/|CLAUDE.md)"; then
        return 0  # No KARIMO changes to commit
    fi

    # Count updated components for commit message
    local updated_count=0
    updated_count=$((UPDATED_AGENTS + UPDATED_COMMANDS + UPDATED_SKILLS + UPDATED_TEMPLATES + UPDATED_SCRIPTS + UPDATED_WORKFLOWS))

    # Build commit message
    local commit_message="chore(karimo): update to v${LATEST_VERSION}

Auto-update via update.sh from v${CURRENT_VERSION} to v${LATEST_VERSION}

Updated components:
- ${UPDATED_AGENTS} agents
- ${UPDATED_COMMANDS} commands
- ${UPDATED_SKILLS} skills
- ${UPDATED_TEMPLATES} templates
- ${UPDATED_SCRIPTS} scripts
- ${UPDATED_WORKFLOWS} workflows
- KARIMO_RULES.md
- VERSION, MANIFEST.json

Co-Authored-By: KARIMO Update Script <noreply@opensession.co>"

    # Auto-commit (no prompt needed)
    echo "  Committing KARIMO updates..."

    # Stage only KARIMO files (v8 plugin structure)
    git add \
        .claude/plugins/karimo/ \
        .karimo/templates/ \
        .karimo/scripts/ \
        .karimo/VERSION \
        .karimo/MANIFEST.json \
        .karimo/update.sh \
        .github/workflows/karimo-*.yml \
        CLAUDE.md 2>/dev/null || true

    # Also stage removal of old v7 paths if they were deleted
    git add -u .claude/agents/karimo/ .claude/commands/karimo/ .claude/skills/karimo/ .claude/KARIMO_RULES.md 2>/dev/null || true

    # Create commit
    if git commit -m "$commit_message" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Committed KARIMO updates to git"
    else
        # Commit failed (pre-commit hook, etc.) - show warning but don't fail update
        echo -e "${YELLOW}⚠${NC}  Git commit failed, but update completed successfully"
        echo -e "${DIM}   You may need to commit the changes manually.${NC}"
    fi
}

# Attempt to commit KARIMO updates
attempt_git_commit

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
echo "  • $UPDATED_SCRIPTS scripts"
echo "  • $UPDATED_WORKFLOWS workflows"
echo "  • KARIMO_RULES.md"
echo "  • VERSION, MANIFEST.json"
if [ $TOTAL_CLEANED -gt 0 ]; then
    echo ""
    echo "Cleaned up $TOTAL_CLEANED stale files"
fi
echo
echo "Preserved (not modified):"
echo "  • .karimo/config.yaml"
echo "  • .karimo/learnings/  (your accumulated learnings)"
echo "  • .karimo/prds/*"
echo "  • CLAUDE.md (your content outside KARIMO markers)"
echo
echo -e "${DIM}Run /karimo-doctor to verify the updated installation.${NC}"
