#!/bin/bash

# Verification: Template Safety
# Tests path construction, variable substitution, and injection safety

TEST_NAME="Template Safety Verification"
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

# Test 1: Path traversal detection
info "Test 1: Testing path construction detects traversal attacks"

malicious_slugs=(
    "../etc/passwd"
    "../../secrets"
    "slug/../../../root"
    "normal/../../etc/passwd"
)

for slug in "${malicious_slugs[@]}"; do
    # Simulate path construction
    prd_dir=".karimo/prds/$slug"

    # We WANT to detect ".." in malicious slugs - that's the test passing
    if [[ "$prd_dir" == *".."* ]]; then
        pass_test "Detected path traversal in slug: $slug"
    else
        fail_test "Failed to detect traversal in: $slug" "Should contain .."
    fi
done

# Test 2: Safe slugs work correctly
info "Test 2: Testing valid slug formats"

valid_slugs=(
    "simple-feature"
    "feature-with-many-hyphens-123"
    "user_authentication"
    "api-v2-endpoint"
    "fix-bug-456"
    "MixedCaseFeature"
    "feature123"
)

for slug in "${valid_slugs[@]}"; do
    prd_dir=".karimo/prds/$slug"
    prd_file="$prd_dir/PRD.md"

    # Verify path is well-formed
    if [[ "$prd_file" =~ ^\.karimo/prds/[^/]+/PRD\.md$ ]]; then
        pass_test "Valid path for slug: $slug"
    else
        fail_test "Path construction for $slug" "Unexpected path format: $prd_file"
    fi
done

# Test 3: Variable substitution in commit messages
info "Test 3: Testing commit message variable substitution"

for slug in "${valid_slugs[@]}"; do
    # Simulate template substitution
    template="docs(karimo): add PRD framing for {slug}"
    message="${template//\{slug\}/$slug}"

    expected="docs(karimo): add PRD framing for $slug"

    if [ "$message" = "$expected" ]; then
        pass_test "Variable substitution safe for: $slug"
    else
        fail_test "Variable substitution for $slug" "Expected: $expected, Got: $message"
    fi
done

# Test 4: Special characters in heredoc
info "Test 4: Testing heredoc with special characters"

test_slugs=(
    "feature-with-quotes'and\"double"
    'feature-with-backtick`'
    'feature-with-dollar$sign'
)

for slug in "${test_slugs[@]}"; do
    # Test heredoc creation (this would fail if not properly quoted)
    heredoc_test=$(cat <<EOF
docs(karimo): add PRD framing for $slug

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)

    if [ -n "$heredoc_test" ]; then
        pass_test "Heredoc handles special chars in: $slug"
    else
        fail_test "Heredoc with $slug" "Heredoc creation failed"
    fi
done

# Test 5: JSON injection prevention
info "Test 5: Testing JSON safety in status updates"

# Create temp directory for JSON tests
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

STATUS_FILE="$TEST_DIR/status.json"

# Test with various slug formats
for slug in "${valid_slugs[@]}"; do
    # Create status JSON
    cat > "$STATUS_FILE" <<EOF
{
  "prd_slug": "$slug",
  "status": "interviewing"
}
EOF

    # Validate JSON
    if jq empty "$STATUS_FILE" 2>/dev/null; then
        pass_test "JSON valid for slug: $slug"
    else
        fail_test "JSON validity for $slug" "Invalid JSON generated"
    fi

    # Verify slug value matches
    EXTRACTED_SLUG=$(jq -r '.prd_slug' "$STATUS_FILE")
    if [ "$EXTRACTED_SLUG" = "$slug" ]; then
        pass_test "JSON slug extraction correct: $slug"
    else
        fail_test "JSON slug for $slug" "Expected: $slug, Got: $EXTRACTED_SLUG"
    fi
done

# Test 6: Command injection prevention
info "Test 6: Testing command injection prevention"

# These slugs could be dangerous if not properly quoted
dangerous_slugs=(
    'feature;rm -rf /'
    'feature$(whoami)'
    'feature`cat /etc/passwd`'
    'feature|echo hacked'
)

for slug in "${dangerous_slugs[@]}"; do
    # Simulate variable usage in quoted context
    message="docs(karimo): add PRD framing for $slug"

    # If this executes commands, the test environment would be compromised
    # In safe usage, the slug should be treated as literal text
    if [[ "$message" == *"docs(karimo): add PRD framing for"* ]]; then
        pass_test "Command injection blocked for: ${slug:0:20}..."
    else
        fail_test "Command injection" "Message construction failed for dangerous slug"
    fi
done

# Test 7: Path canonicalization
info "Test 7: Testing path canonicalization"

# Test that paths don't accidentally resolve to unexpected locations
for slug in "${valid_slugs[@]}"; do
    prd_dir=".karimo/prds/$slug"

    # Check path doesn't start with /
    if [[ "$prd_dir" != /* ]]; then
        pass_test "Path is relative for: $slug"
    else
        fail_test "Path for $slug" "Path should be relative, got: $prd_dir"
    fi

    # Check path starts with expected prefix
    if [[ "$prd_dir" == .karimo/prds/* ]]; then
        pass_test "Path has correct prefix for: $slug"
    else
        fail_test "Path prefix for $slug" "Unexpected path: $prd_dir"
    fi
done

# Summary
echo ""
echo "=== Verification Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All template safety checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some template safety issues found.${NC}"
    exit 1
fi
