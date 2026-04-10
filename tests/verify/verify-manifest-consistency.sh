#!/bin/bash

# Verification: MANIFEST Consistency
# Validates that MANIFEST.json counts match actual files in the source repository

TEST_NAME="MANIFEST Consistency Verification"
PASS_COUNT=0
FAIL_COUNT=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass_test() {
    echo -e "${GREEN}✓${NC} $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail_test() {
    echo -e "${RED}✗${NC} $1"
    echo "  $2"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "=== Verification: $TEST_NAME ==="
echo ""

# Navigate to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Verify MANIFEST.json exists
if [ ! -f ".karimo/MANIFEST.json" ]; then
    fail_test "MANIFEST.json" "File not found at .karimo/MANIFEST.json"
    exit 1
fi

info "Test 1: Checking MANIFEST.json integrity"

# Helper function to count items in a JSON array (jq-free)
# The main arrays start after line 99 (after deprecated section)
manifest_count() {
    local key="$1"
    # Tail from line 99 to skip deprecated, then parse the specific array
    tail -n +99 .karimo/MANIFEST.json | sed -n "/^  \"$key\"/,/^  \]/p" | grep -c '".*\.md\|\.json"' || echo "0"
}

# Helper function to list items in a JSON array (jq-free)
# The main arrays start after line 99 (after deprecated section)
manifest_list() {
    local key="$1"
    # Tail from line 99 to skip deprecated, then parse the specific array
    tail -n +99 .karimo/MANIFEST.json | sed -n "/^  \"$key\"/,/^  \]/p" | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

# Test 1: Verify agent counts (v8 plugin structure)
info "Test 1a: Checking agent counts"

MANIFEST_AGENTS=$(manifest_count "agents")
ACTUAL_AGENTS=$(ls -1 .claude/plugins/karimo/agents/*.md 2>/dev/null | wc -l | tr -d ' ')

if [ "$MANIFEST_AGENTS" = "$ACTUAL_AGENTS" ]; then
    pass_test "Agent count matches: $ACTUAL_AGENTS agents"
else
    fail_test "Agent count mismatch" "MANIFEST: $MANIFEST_AGENTS, Actual: $ACTUAL_AGENTS"
fi

# Test 2: Verify command counts (v8 plugin structure)
info "Test 1b: Checking command counts"

MANIFEST_COMMANDS=$(manifest_count "commands")
ACTUAL_COMMANDS=$(ls -1 .claude/plugins/karimo/commands/*.md 2>/dev/null | wc -l | tr -d ' ')

if [ "$MANIFEST_COMMANDS" = "$ACTUAL_COMMANDS" ]; then
    pass_test "Command count matches: $ACTUAL_COMMANDS commands"
else
    fail_test "Command count mismatch" "MANIFEST: $MANIFEST_COMMANDS, Actual: $ACTUAL_COMMANDS"
fi

# Test 3: Verify skill counts (v8 plugin structure)
info "Test 1c: Checking skill counts"

MANIFEST_SKILLS=$(manifest_count "skills")
ACTUAL_SKILLS=$(ls -1 .claude/plugins/karimo/skills/*.md 2>/dev/null | wc -l | tr -d ' ')

if [ "$MANIFEST_SKILLS" = "$ACTUAL_SKILLS" ]; then
    pass_test "Skill count matches: $ACTUAL_SKILLS skills"
else
    fail_test "Skill count mismatch" "MANIFEST: $MANIFEST_SKILLS, Actual: $ACTUAL_SKILLS"
fi

# Test 4: Verify template counts (includes .md and .json files)
info "Test 1d: Checking template counts"

MANIFEST_TEMPLATES=$(manifest_count "templates")
ACTUAL_TEMPLATES_MD=$(ls -1 .karimo/templates/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_TEMPLATES_JSON=$(ls -1 .karimo/templates/*.json 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_TEMPLATES=$((ACTUAL_TEMPLATES_MD + ACTUAL_TEMPLATES_JSON))

if [ "$MANIFEST_TEMPLATES" = "$ACTUAL_TEMPLATES" ]; then
    pass_test "Template count matches: $ACTUAL_TEMPLATES templates"
else
    fail_test "Template count mismatch" "MANIFEST: $MANIFEST_TEMPLATES, Actual: $ACTUAL_TEMPLATES ($ACTUAL_TEMPLATES_MD .md + $ACTUAL_TEMPLATES_JSON .json)"
fi

# Test 5: Verify all MANIFEST agents exist (v8 plugin paths)
info "Test 2: Verifying all MANIFEST agents exist on disk"

MISSING_AGENTS=()
for agent in $(manifest_list "agents"); do
    if [ ! -f ".claude/$agent" ]; then
        MISSING_AGENTS+=("$agent")
    fi
done

if [ ${#MISSING_AGENTS[@]} -eq 0 ]; then
    pass_test "All MANIFEST agents exist on disk"
else
    fail_test "Missing agents" "${MISSING_AGENTS[*]}"
fi

# Test 6: Verify all MANIFEST commands exist (v8 plugin paths)
info "Test 3: Verifying all MANIFEST commands exist on disk"

MISSING_COMMANDS=()
for cmd in $(manifest_list "commands"); do
    if [ ! -f ".claude/$cmd" ]; then
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -eq 0 ]; then
    pass_test "All MANIFEST commands exist on disk"
else
    fail_test "Missing commands" "${MISSING_COMMANDS[*]}"
fi

# Test 7: Verify all MANIFEST skills exist (v8 plugin paths)
info "Test 4: Verifying all MANIFEST skills exist on disk"

MISSING_SKILLS=()
for skill in $(manifest_list "skills"); do
    if [ ! -f ".claude/$skill" ]; then
        MISSING_SKILLS+=("$skill")
    fi
done

if [ ${#MISSING_SKILLS[@]} -eq 0 ]; then
    pass_test "All MANIFEST skills exist on disk"
else
    fail_test "Missing skills" "${MISSING_SKILLS[*]}"
fi

# Test 8: Verify all MANIFEST templates exist
info "Test 5: Verifying all MANIFEST templates exist on disk"

MISSING_TEMPLATES=()
for template in $(manifest_list "templates"); do
    if [ ! -f ".karimo/templates/$template" ]; then
        MISSING_TEMPLATES+=("$template")
    fi
done

if [ ${#MISSING_TEMPLATES[@]} -eq 0 ]; then
    pass_test "All MANIFEST templates exist on disk"
else
    fail_test "Missing templates" "${MISSING_TEMPLATES[*]}"
fi

# Test 9: Verify new PM agents exist (v8 plugin structure)
info "Test 6: Verifying PM agent topology"

if [ -f ".claude/plugins/karimo/agents/pm.md" ]; then
    pass_test "PM agent exists: pm.md"
else
    fail_test "PM agent missing" "pm.md not found"
fi

if [ -f ".claude/plugins/karimo/agents/pm-reviewer.md" ]; then
    pass_test "PM-Reviewer agent exists: pm-reviewer.md"
else
    fail_test "PM-Reviewer agent missing" "pm-reviewer.md not found"
fi

if [ -f ".claude/plugins/karimo/agents/pm-finalizer.md" ]; then
    pass_test "PM-Finalizer agent exists: pm-finalizer.md"
else
    fail_test "PM-Finalizer agent missing" "pm-finalizer.md not found"
fi

# Test 10: Verify deprecated templates are in deprecated array
info "Test 7: Verifying deprecated items are tracked"

# Check that deprecated templates are in the deprecated array
DEPRECATED_TEMPLATES=$(sed -n '/\"deprecated\"/,/^[[:space:]]*}/p' .karimo/MANIFEST.json | sed -n '/\"templates\"/,/]/p' | grep -E '^\s*"' | grep -v '"templates"' | wc -l | tr -d ' ')

if [ "$DEPRECATED_TEMPLATES" -gt 0 ]; then
    pass_test "Deprecated templates tracked: $DEPRECATED_TEMPLATES items"
else
    info "No deprecated templates tracked (may be expected)"
fi

# Test 11: Verify VERSION matches MANIFEST version
info "Test 8: Verifying VERSION matches MANIFEST"

VERSION_FILE=$(cat .karimo/VERSION 2>/dev/null | tr -d '[:space:]')
MANIFEST_VERSION=$(grep '"version"' .karimo/MANIFEST.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')

if [ "$VERSION_FILE" = "$MANIFEST_VERSION" ]; then
    pass_test "VERSION ($VERSION_FILE) matches MANIFEST ($MANIFEST_VERSION)"
else
    fail_test "Version mismatch" "VERSION: $VERSION_FILE, MANIFEST: $MANIFEST_VERSION"
fi

# Summary
echo ""
echo "=== Verification Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All MANIFEST consistency checks passed!${NC}"
    echo ""
    echo "Source repository state:"
    echo "  Agents:    $ACTUAL_AGENTS"
    echo "  Commands:  $ACTUAL_COMMANDS"
    echo "  Skills:    $ACTUAL_SKILLS"
    echo "  Templates: $ACTUAL_TEMPLATES"
    echo "  Version:   $VERSION_FILE"
    exit 0
else
    echo -e "${RED}MANIFEST consistency issues found!${NC}"
    echo ""
    echo "This indicates a mismatch between MANIFEST.json and actual files."
    echo "Update MANIFEST.json or add missing files before release."
    exit 1
fi
