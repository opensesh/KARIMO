#!/bin/bash
# KARIMO Config Migration: v1.0 → v2.0
#
# Date: 2026-03-11
# KARIMO Version: v5.0+
#
# Changes:
#   1. Add review.enabled and review.provider fields
#   2. Migrate greptile.enabled → review.enabled
#   3. Set review.provider based on greptile.enabled value
#   4. Rename execution.max_agents → execution.max_parallel_tasks
#   5. Update config_version to "2.0"
#
# Breaking Changes: None
# Rollback: Restore from backup if needed (backup created automatically)
#
# Usage:
#   ./v1-to-v2.example.sh /path/to/config.yaml
#
# Example:
#   ./v1-to-v2.example.sh .karimo/config.yaml

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="${1:-}"
FROM_VERSION="1.0"
TO_VERSION="2.0"

# Validation
if [ -z "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file path required${NC}"
    echo "Usage: $0 /path/to/config.yaml"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Check current version
current_version=$(grep -E "^config_version:" "$CONFIG_FILE" | sed 's/.*"\(.*\)".*/\1/' || echo "unknown")

if [ "$current_version" != "$FROM_VERSION" ] && [ "$current_version" != "unknown" ]; then
    echo -e "${YELLOW}Warning: Config version is $current_version, expected $FROM_VERSION${NC}"
    echo "This migration is designed for v$FROM_VERSION → v$TO_VERSION"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration aborted"
        exit 0
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "KARIMO Config Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "From: v$FROM_VERSION"
echo "To:   v$TO_VERSION"
echo "File: $CONFIG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Step 1: Create backup
BACKUP_FILE="${CONFIG_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Backup created: $BACKUP_FILE"

# Step 2: Create temporary file for modifications
TMP_FILE=$(mktemp)
trap "rm -f $TMP_FILE" EXIT

# Step 3: Migrate greptile → review
echo -e "\n${YELLOW}Migrating greptile config to review section...${NC}"

if grep -q "^greptile:" "$CONFIG_FILE"; then
    # Extract greptile.enabled value
    greptile_enabled=$(grep -A 10 "^greptile:" "$CONFIG_FILE" | grep "enabled:" | head -1 | awk '{print $2}')

    if [ -z "$greptile_enabled" ]; then
        greptile_enabled="false"
    fi

    echo "  - Found greptile.enabled: $greptile_enabled"

    # Determine review provider
    if [ "$greptile_enabled" = "true" ]; then
        review_provider="greptile"
    else
        review_provider="null"
    fi

    # Build new config with review section, removing greptile section
    awk -v enabled="$greptile_enabled" -v provider="$review_provider" '
    BEGIN { greptile_section = 0; review_added = 0 }

    # Skip greptile section
    /^greptile:/ {
        if (!review_added) {
            print "review:"
            print "  enabled: " enabled
            print "  provider: " provider
            print ""
            review_added = 1
        }
        greptile_section = 1
        next
    }

    # End of greptile section (new top-level key)
    greptile_section && /^[a-z]/ {
        greptile_section = 0
    }

    # Skip lines in greptile section
    greptile_section { next }

    # Print all other lines
    { print }
    ' "$CONFIG_FILE" > "$TMP_FILE"

    cp "$TMP_FILE" "$CONFIG_FILE"
    echo -e "  ${GREEN}✓${NC} Migrated greptile → review (provider: $review_provider)"
else
    echo "  - No greptile section found, adding default review config"

    # Add review section after config_version
    awk '
    /^config_version:/ {
        print
        print ""
        print "review:"
        print "  enabled: false"
        print "  provider: null"
        next
    }
    { print }
    ' "$CONFIG_FILE" > "$TMP_FILE"

    cp "$TMP_FILE" "$CONFIG_FILE"
    echo -e "  ${GREEN}✓${NC} Added default review section"
fi

# Step 4: Rename execution.max_agents → execution.max_parallel_tasks
echo -e "\n${YELLOW}Renaming execution.max_agents → execution.max_parallel_tasks...${NC}"

if grep -q "max_agents:" "$CONFIG_FILE"; then
    sed -i.tmp 's/max_agents:/max_parallel_tasks:/' "$CONFIG_FILE"
    rm -f "${CONFIG_FILE}.tmp"
    echo -e "  ${GREEN}✓${NC} Renamed max_agents → max_parallel_tasks"
else
    echo "  - No max_agents field found, skipping"
fi

# Step 5: Update config_version
echo -e "\n${YELLOW}Updating config_version...${NC}"

if grep -q "^config_version:" "$CONFIG_FILE"; then
    sed -i.tmp "s/config_version: \"$FROM_VERSION\"/config_version: \"$TO_VERSION\"/" "$CONFIG_FILE"
    sed -i.tmp "s/config_version: '$FROM_VERSION'/config_version: \"$TO_VERSION\"/" "$CONFIG_FILE"
    rm -f "${CONFIG_FILE}.tmp"
    echo -e "  ${GREEN}✓${NC} Updated: $FROM_VERSION → $TO_VERSION"
else
    # Add config_version at the top
    echo -e "config_version: \"$TO_VERSION\"\n$(cat $CONFIG_FILE)" > "$TMP_FILE"
    cp "$TMP_FILE" "$CONFIG_FILE"
    echo -e "  ${GREEN}✓${NC} Added config_version: $TO_VERSION"
fi

# Step 6: Validate YAML syntax
echo -e "\n${YELLOW}Validating YAML syntax...${NC}"

if command -v python3 &> /dev/null; then
    if python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} YAML is valid"
    else
        echo -e "  ${RED}✗${NC} YAML validation failed"
        echo -e "  ${YELLOW}Restoring from backup...${NC}"
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        echo -e "  ${GREEN}✓${NC} Restored from backup"
        exit 1
    fi
else
    echo -e "  ${YELLOW}!${NC} python3 not found, skipping YAML validation"
fi

# Step 7: Summary
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Migration Complete: v$FROM_VERSION → v$TO_VERSION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Changes applied:"
echo "  1. Migrated greptile config → review section"
echo "  2. Renamed max_agents → max_parallel_tasks"
echo "  3. Updated config_version to $TO_VERSION"
echo
echo "Backup: $BACKUP_FILE"
echo
echo "Next steps:"
echo "  - Verify config: /karimo-doctor"
echo "  - Check changes: diff $BACKUP_FILE $CONFIG_FILE"
echo "  - Rollback if needed: cp $BACKUP_FILE $CONFIG_FILE"
echo

exit 0
