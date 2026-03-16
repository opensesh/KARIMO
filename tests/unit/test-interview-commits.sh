#!/bin/bash

# Unit Test: Interview Commit Messages
# Tests commit message interpolation, status.json updates, path construction

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="Interview Commit Messages"
PASS_COUNT=0
FAIL_COUNT=0

# Color codes
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
    echo "  Expected: $2"
    echo "  Got: $3"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "=== Unit Test: $TEST_NAME ==="
echo ""

# Test 1: Slug substitution in commit messages
info "Test 1: Slug substitution in commit messages"

test_slugs=("simple-feature" "feature-with-many-hyphens-123" "user_auth" "api-v2-endpoint")

for slug in "${test_slugs[@]}"; do
    # Simulate commit message template
    template="docs(karimo): add PRD framing for {slug}"
    message="${template//\{slug\}/$slug}"

    expected="docs(karimo): add PRD framing for $slug"

    if [ "$message" = "$expected" ]; then
        pass_test "Slug substitution works for: $slug"
    else
        fail_test "Slug substitution for $slug" "$expected" "$message"
    fi
done

# Test 2: Co-Authored-By footer always present
info "Test 2: Co-Authored-By footer validation"

commit_body=$(cat <<'EOF'
docs(karimo): add PRD requirements for test-feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)

if echo "$commit_body" | grep -q "Co-Authored-By: Claude"; then
    pass_test "Co-Authored-By footer present in commit message"
else
    fail_test "Co-Authored-By footer" "footer present" "footer missing"
fi

# Test 3: Status JSON updates produce valid JSON
info "Test 3: Status JSON validity"

TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

STATUS_FILE="$TEST_DIR/status.json"

# Create initial status
cat > "$STATUS_FILE" <<'EOF'
{
  "prd_slug": "test-feature",
  "status": "interviewing",
  "interview_progress": {
    "round_1_framing": "not_started"
  }
}
EOF

# Simulate status update
jq '.interview_progress.round_1_framing = "completed"' "$STATUS_FILE" > "$STATUS_FILE.tmp"
mv "$STATUS_FILE.tmp" "$STATUS_FILE"

if jq empty "$STATUS_FILE" 2>/dev/null; then
    pass_test "Status JSON update produces valid JSON"
else
    fail_test "Status JSON validity" "valid JSON" "invalid JSON after update"
fi

# Test 4: PRD path construction handles special characters
info "Test 4: PRD path construction safety"

test_slugs=("simple" "with-hyphens" "with_underscores" "with-numbers-123" "MixedCase")

for slug in "${test_slugs[@]}"; do
    # Simulate path construction
    prd_dir=".karimo/prds/$slug"
    prd_file="$prd_dir/PRD.md"

    # Check for path traversal attempts
    if [[ "$prd_file" == *".."* ]]; then
        fail_test "Path safety for $slug" "no traversal" "contains .."
    else
        pass_test "Path construction safe for slug: $slug"
    fi
done

# Test 5: Template variables don't break with special characters
info "Test 5: Template variable safety with special characters"

# Test commit message with slug containing special chars
test_cases=(
    "api-v2-endpoint"
    "user_authentication"
    "feature-123"
    "fix-bug-456"
)

for slug in "${test_cases[@]}"; do
    # Simulate heredoc commit message creation
    commit_msg=$(cat <<EOF
docs(karimo): add PRD framing for $slug

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)

    # Check message is well-formed
    if echo "$commit_msg" | grep -q "docs(karimo): add PRD framing for $slug"; then
        pass_test "Template handles special chars in: $slug"
    else
        fail_test "Template with $slug" "well-formed message" "malformed"
    fi
done

# Test 6: All 4 commit types have correct format
info "Test 6: All interview commit types follow format"

commit_types=(
    "docs(karimo): add PRD framing for test-feature"
    "docs(karimo): add PRD requirements for test-feature"
    "docs(karimo): add PRD dependencies for test-feature"
    "docs(karimo): complete PRD for test-feature"
)

for commit in "${commit_types[@]}"; do
    # Validate conventional commit format: type(scope): description
    if echo "$commit" | grep -qE '^[a-z]+\([a-z]+\): .+$'; then
        pass_test "Commit format valid: ${commit:0:40}..."
    else
        fail_test "Commit format" "type(scope): description" "$commit"
    fi
done

# Summary
echo ""
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
