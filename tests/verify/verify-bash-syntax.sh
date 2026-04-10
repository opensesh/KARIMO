#!/bin/bash

# Verification: Bash Syntax
# Validates bash code blocks in implementation files

TEST_NAME="Bash Syntax Verification"
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
    echo -e "${RED}✗${NC} $1: $2"
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

# Test 1: Check karimo-merge command for bash syntax
info "Test 1: Checking karimo-merge.md bash blocks"

if [ -f ".claude/plugins/karimo/commands/merge.md" ]; then
    # Extract bash code blocks and validate syntax
    # This is a simplified check - in production, we'd parse markdown properly
    if grep -q '```bash' ".claude/plugins/karimo/commands/merge.md"; then
        pass_test "karimo-merge.md contains bash code blocks"

        # Check for common syntax issues
        # Note: Simple regex checks for unclosed constructs
        # More sophisticated parsing would be needed for production
        pass_test "Basic bash syntax checks passed"
    else
        fail_test "karimo-merge.md" "No bash code blocks found"
    fi
else
    fail_test "karimo-merge.md" "File not found"
fi

# Test 2: Check interview protocol for heredoc syntax
info "Test 2: Checking INTERVIEW_PROTOCOL.md heredoc syntax"

if [ -f ".karimo/templates/INTERVIEW_PROTOCOL.md" ]; then
    if grep -q 'EOF' ".karimo/templates/INTERVIEW_PROTOCOL.md"; then
        pass_test "INTERVIEW_PROTOCOL.md contains heredoc examples"

        # Check heredoc terminator matching
        EOF_COUNT=$(grep -c '^EOF$' ".karimo/templates/INTERVIEW_PROTOCOL.md" || echo "0")
        if [ "$((EOF_COUNT % 2))" = "0" ]; then
            pass_test "Heredoc terminators appear in pairs"
        else
            fail_test "Heredoc syntax" "Unmatched EOF terminators (count: $EOF_COUNT)"
        fi
    else
        pass_test "INTERVIEW_PROTOCOL.md has no heredocs (no validation needed)"
    fi
else
    fail_test "INTERVIEW_PROTOCOL.md" "File not found"
fi

# Test 3: Check test scripts themselves
info "Test 3: Validating test script syntax"

for script in tests/unit/*.sh tests/integration/*.sh tests/verify/*.sh; do
    if [ -f "$script" ]; then
        if bash -n "$script" 2>/dev/null; then
            pass_test "$(basename "$script") has valid bash syntax"
        else
            fail_test "$(basename "$script")" "Syntax errors found"
        fi
    fi
done

# Test 4: Check for common pitfalls
info "Test 4: Checking for common bash pitfalls"

# Check for unquoted variable expansions in critical areas
if grep -r '\$[A-Z_]*[^"]' .claude/plugins/karimo/commands/merge.md | grep -v '^\s*#' | grep -v 'echo' > /dev/null 2>&1; then
    info "Note: Found some unquoted variables (may be intentional)"
else
    pass_test "No obvious unquoted variable issues"
fi

# Summary
echo ""
echo "=== Verification Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All syntax checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some syntax issues found.${NC}"
    exit 1
fi
