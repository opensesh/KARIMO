#!/bin/bash

# Verification: Commit Format
# Validates conventional commit format and Co-Authored-By footers

TEST_NAME="Commit Format Verification"
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

# Calculate REPO_ROOT before changing directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Create test repository to validate commit message templates
TEST_REPO=$(mktemp -d)
trap "rm -rf $TEST_REPO" EXIT

cd "$TEST_REPO"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"

# Test 1: Validate commit message templates in INTERVIEW_PROTOCOL.md
info "Test 1: Checking interview commit message templates"

if [ -f "$REPO_ROOT/.karimo/templates/INTERVIEW_PROTOCOL.md" ]; then
    # Check for conventional commit format in templates
    if grep -q 'docs(karimo):' "$REPO_ROOT/.karimo/templates/INTERVIEW_PROTOCOL.md"; then
        pass_test "INTERVIEW_PROTOCOL.md uses conventional commit format"
    else
        fail_test "Interview commit format" "Expected 'docs(karimo):' format not found"
    fi

    # Check for Co-Authored-By in templates
    if grep -q 'Co-Authored-By: Claude' "$REPO_ROOT/.karimo/templates/INTERVIEW_PROTOCOL.md"; then
        pass_test "INTERVIEW_PROTOCOL.md includes Co-Authored-By footer"
    else
        fail_test "Interview Co-Authored-By" "Footer not found in protocol"
    fi
else
    fail_test "INTERVIEW_PROTOCOL.md" "File not found"
fi

# Test 2: Validate all commit types match conventional format
info "Test 2: Validating commit type patterns"

commit_patterns=(
    "docs(karimo): add PRD framing for {slug}"
    "docs(karimo): add PRD requirements for {slug}"
    "docs(karimo): add PRD dependencies for {slug}"
    "docs(karimo): complete PRD for {slug}"
)

for pattern in "${commit_patterns[@]}"; do
    # Replace {slug} with test value
    commit_msg="${pattern//\{slug\}/test-feature}"

    # Test conventional commit regex: type(scope): description
    if echo "$commit_msg" | grep -qE '^[a-z]+\([a-z-]+\): .+$'; then
        pass_test "Format valid: $commit_msg"
    else
        fail_test "Commit pattern" "Invalid format: $commit_msg"
    fi
done

# Test 3: Test actual commit creation with templates
info "Test 3: Creating test commits with template format"

echo "test" > file.txt
git add file.txt

for i in 1 2 3 4; do
    SLUG="test-feature"

    case $i in
        1) MSG="docs(karimo): add PRD framing for $SLUG" ;;
        2) MSG="docs(karimo): add PRD requirements for $SLUG" ;;
        3) MSG="docs(karimo): add PRD dependencies for $SLUG" ;;
        4) MSG="docs(karimo): complete PRD for $SLUG" ;;
    esac

    COMMIT_BODY=$(cat <<EOF
$MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)

    echo "line $i" >> file.txt
    git add file.txt
    git commit -q -m "$COMMIT_BODY"

    # Verify commit was created
    LAST_MSG=$(git log -1 --pretty=%B)

    if echo "$LAST_MSG" | head -n1 | grep -qE '^[a-z]+\([a-z-]+\): .+$'; then
        pass_test "Commit $i: conventional format validated"
    else
        fail_test "Commit $i format" "First line doesn't match pattern"
    fi

    if echo "$LAST_MSG" | grep -q 'Co-Authored-By:'; then
        pass_test "Commit $i: Co-Authored-By footer present"
    else
        fail_test "Commit $i Co-Authored-By" "Footer missing"
    fi
done

# Test 4: Verify commit log shows all commits
info "Test 4: Verifying git log integrity"

KARIMO_COMMITS=$(git log --oneline | grep -c 'docs(karimo):' || echo "0")

if [ "$KARIMO_COMMITS" = "4" ]; then
    pass_test "All 4 commits found in git log"
else
    fail_test "Commit count in log" "Expected 4, found $KARIMO_COMMITS"
fi

# Test 5: Check commit message length (first line should be < 72 chars)
info "Test 5: Checking commit message length constraints"

git log --pretty=%s | while read -r subject; do
    LENGTH=${#subject}
    if [ "$LENGTH" -le 72 ]; then
        pass_test "Commit subject length OK: $LENGTH chars"
    else
        fail_test "Commit subject length" "Subject too long: $LENGTH chars (max 72)"
    fi
done

# Summary
echo ""
echo "=== Verification Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All commit format checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some commit format issues found.${NC}"
    exit 1
fi
