#!/bin/bash

# KARIMO Release Script
# =====================
# Handles the entire release process atomically to prevent orphaned releases.
#
# Usage:
#   ./release.sh <version> [--dry-run]
#
# Example:
#   ./release.sh 8.3.0
#   ./release.sh 8.3.0 --dry-run
#
# This script:
#   1. Validates version format
#   2. Checks for uncommitted changes
#   3. Updates VERSION and MANIFEST.json
#   4. Prompts for CHANGELOG entry (or uses existing)
#   5. Commits all version changes
#   6. Creates and pushes tag
#   7. Creates GitHub release
#   8. Verifies release via API
#
# CRITICAL: Never move tags after release creation. If you need to include
# additional commits, delete the release and tag, then re-run this script.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

# Configuration
GITHUB_REPO="opensesh/KARIMO"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ==============================================================================
# ARGUMENT PARSING
# ==============================================================================

VERSION=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "KARIMO Release Script"
            echo ""
            echo "Usage: ./release.sh <version> [--dry-run]"
            echo ""
            echo "Arguments:"
            echo "  version    Semver version (e.g., 8.3.0)"
            echo "  --dry-run  Preview changes without executing"
            echo ""
            echo "Example:"
            echo "  ./release.sh 8.3.0"
            exit 0
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$1"
            else
                echo -e "${RED}Error: Unknown argument: $1${NC}"
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version required${NC}"
    echo "Usage: ./release.sh <version> [--dry-run]"
    exit 1
fi

# ==============================================================================
# VALIDATION
# ==============================================================================

echo -e "${BLUE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│  KARIMO Release: v${VERSION}                                      ${NC}"
echo -e "${BLUE}╰──────────────────────────────────────────────────────────────╯${NC}"
echo

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo
fi

# Validate version format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo -e "${RED}Error: Invalid version format. Use semver (e.g., 8.3.0)${NC}"
    exit 1
fi

# Check we're in the right directory
if [ ! -f "$PROJECT_ROOT/.karimo/VERSION" ]; then
    echo -e "${RED}Error: Not in KARIMO source repository${NC}"
    exit 1
fi

# Check for uncommitted changes
cd "$PROJECT_ROOT"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Uncommitted changes detected${NC}"
    echo "Commit or stash changes before releasing."
    git status --short
    exit 1
fi

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}Error: Not on main branch (on: $CURRENT_BRANCH)${NC}"
    echo "Switch to main before releasing."
    exit 1
fi

# Check tag doesn't already exist
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag v$VERSION already exists${NC}"
    echo ""
    echo "To re-release this version:"
    echo "  1. Delete the release: gh release delete v$VERSION --yes"
    echo "  2. Delete the tag: git tag -d v$VERSION && git push origin :refs/tags/v$VERSION"
    echo "  3. Re-run this script"
    exit 1
fi

# Check release doesn't already exist
if gh release view "v$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}Error: Release v$VERSION already exists on GitHub${NC}"
    exit 1
fi

CURRENT_VERSION=$(cat "$PROJECT_ROOT/.karimo/VERSION" | tr -d '[:space:]')
echo -e "Current version: ${GREEN}${CURRENT_VERSION}${NC}"
echo -e "New version:     ${GREEN}${VERSION}${NC}"
echo

# ==============================================================================
# CHANGELOG CHECK
# ==============================================================================

echo -e "${BLUE}Checking CHANGELOG.md...${NC}"

if ! grep -q "## \[$VERSION\]" "$PROJECT_ROOT/CHANGELOG.md"; then
    echo -e "${YELLOW}Warning: No CHANGELOG entry found for v$VERSION${NC}"
    echo ""
    echo "Add a changelog entry before releasing:"
    echo ""
    echo "## [$VERSION] - $(date +%Y-%m-%d)"
    echo ""
    echo "### Added"
    echo "- ..."
    echo ""
    echo "### Changed"
    echo "- ..."
    echo ""
    echo "### Fixed"
    echo "- ..."
    echo ""

    if [ "$DRY_RUN" = false ]; then
        read -p "Continue without changelog entry? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Add changelog entry and re-run."
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓${NC} CHANGELOG entry found"
fi

# ==============================================================================
# UPDATE VERSION FILES
# ==============================================================================

echo
echo -e "${BLUE}Updating version files...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${DIM}  Would update .karimo/VERSION to $VERSION${NC}"
    echo -e "${DIM}  Would update .karimo/MANIFEST.json version to $VERSION${NC}"
    echo -e "${DIM}  Would update plugin.json version to $VERSION${NC}"
    echo -e "${DIM}  Would update marketplace.json version to $VERSION${NC}"
else
    # Update VERSION file
    echo "$VERSION" > "$PROJECT_ROOT/.karimo/VERSION"
    echo -e "${GREEN}✓${NC} Updated .karimo/VERSION"

    # Update MANIFEST.json
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$PROJECT_ROOT/.karimo/MANIFEST.json"
    echo -e "${GREEN}✓${NC} Updated .karimo/MANIFEST.json"

    # Update plugin.json
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
        "$PROJECT_ROOT/.claude/plugins/karimo/.claude-plugin/plugin.json"
    echo -e "${GREEN}✓${NC} Updated plugin.json"

    # Update marketplace.json (both occurrences)
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/g" \
        "$PROJECT_ROOT/.claude-plugin/marketplace.json"
    echo -e "${GREEN}✓${NC} Updated marketplace.json"
fi

# ==============================================================================
# COMMIT VERSION CHANGES
# ==============================================================================

echo
echo -e "${BLUE}Committing version changes...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${DIM}  Would commit: chore(release): bump version to $VERSION${NC}"
else
    git add "$PROJECT_ROOT/.karimo/VERSION" "$PROJECT_ROOT/.karimo/MANIFEST.json" \
        "$PROJECT_ROOT/.claude/plugins/karimo/.claude-plugin/plugin.json" \
        "$PROJECT_ROOT/.claude-plugin/marketplace.json"

    # Check if changelog was modified
    if git diff --cached --name-only | grep -q "CHANGELOG.md"; then
        git add "$PROJECT_ROOT/CHANGELOG.md"
    fi

    git commit -m "$(cat <<EOF
chore(release): bump version to $VERSION

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
    echo -e "${GREEN}✓${NC} Committed version bump"
fi

# ==============================================================================
# CREATE AND PUSH TAG
# ==============================================================================

echo
echo -e "${BLUE}Creating tag v$VERSION...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${DIM}  Would create tag: v$VERSION${NC}"
    echo -e "${DIM}  Would push to origin${NC}"
else
    git tag "v$VERSION"
    echo -e "${GREEN}✓${NC} Created tag v$VERSION"

    git push origin main
    echo -e "${GREEN}✓${NC} Pushed to origin/main"

    git push origin "v$VERSION"
    echo -e "${GREEN}✓${NC} Pushed tag v$VERSION"
fi

# ==============================================================================
# CREATE GITHUB RELEASE
# ==============================================================================

echo
echo -e "${BLUE}Creating GitHub release...${NC}"

# Extract changelog for this version
RELEASE_NOTES=""
if grep -q "## \[$VERSION\]" "$PROJECT_ROOT/CHANGELOG.md"; then
    # Extract content between this version header and the next version header
    RELEASE_NOTES=$(sed -n "/## \[$VERSION\]/,/## \[/p" "$PROJECT_ROOT/CHANGELOG.md" | head -n -1 | tail -n +2)
fi

if [ -z "$RELEASE_NOTES" ]; then
    RELEASE_NOTES="Release v$VERSION

See [CHANGELOG.md](https://github.com/$GITHUB_REPO/blob/main/CHANGELOG.md) for details.

## Upgrade

Run \`/karimo:update\` to upgrade your installation."
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${DIM}  Would create release: v$VERSION${NC}"
    echo -e "${DIM}  Release notes preview:${NC}"
    echo "$RELEASE_NOTES" | head -10 | sed 's/^/    /'
    [ $(echo "$RELEASE_NOTES" | wc -l) -gt 10 ] && echo "    ..."
else
    gh release create "v$VERSION" \
        --title "v$VERSION" \
        --notes "$RELEASE_NOTES"
    echo -e "${GREEN}✓${NC} Created GitHub release"
fi

# ==============================================================================
# VERIFY RELEASE
# ==============================================================================

echo
echo -e "${BLUE}Verifying release...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${DIM}  Would verify release via GitHub API${NC}"
else
    # Wait a moment for GitHub to propagate
    sleep 2

    # Verify via API
    LATEST_TAG=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    if [ "$LATEST_TAG" = "v$VERSION" ]; then
        echo -e "${GREEN}✓${NC} Verified: v$VERSION is latest release"
    else
        echo -e "${RED}✗${NC} Verification failed!"
        echo "  Expected: v$VERSION"
        echo "  Got: $LATEST_TAG"
        echo ""
        echo "The release may have been created incorrectly."
        echo "Check: https://github.com/$GITHUB_REPO/releases"
        exit 1
    fi

    # Verify tag points to HEAD
    TAG_COMMIT=$(git rev-parse "v$VERSION")
    HEAD_COMMIT=$(git rev-parse HEAD)

    if [ "$TAG_COMMIT" = "$HEAD_COMMIT" ]; then
        echo -e "${GREEN}✓${NC} Verified: Tag points to HEAD"
    else
        echo -e "${YELLOW}⚠${NC} Tag points to different commit than HEAD"
        echo "  Tag: $TAG_COMMIT"
        echo "  HEAD: $HEAD_COMMIT"
    fi
fi

# ==============================================================================
# COMPLETE
# ==============================================================================

echo
echo -e "${GREEN}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e "${GREEN}│  Release Complete!                                           │${NC}"
echo -e "${GREEN}╰──────────────────────────────────────────────────────────────╯${NC}"
echo
echo -e "Version: ${GREEN}v$VERSION${NC}"
echo -e "Release: ${BLUE}https://github.com/$GITHUB_REPO/releases/tag/v$VERSION${NC}"
echo
echo -e "${DIM}Users can now run /karimo:update to get this version.${NC}"
echo
echo -e "${YELLOW}IMPORTANT:${NC} Never move this tag after release creation."
echo "If you need to add commits, delete the release and tag first, then re-release."
