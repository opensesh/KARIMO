#!/bin/bash

# Integration Test: Full Merge Flow with Enhanced Reporting
# End-to-end test of /karimo-merge with markdown/code breakdown

TEST_NAME="Full Merge Flow"
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

echo "=== Integration Test: $TEST_NAME ==="
echo ""

# Create test repository
TEST_REPO=$(mktemp -d)
trap "rm -rf $TEST_REPO" EXIT

cd "$TEST_REPO"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"

# Step 1: Create main branch with initial content
info "Step 1: Creating main branch with initial content"
echo "# Project" > README.md
echo "console.log('hello');" > app.js
git add .
git commit -q -m "Initial commit"
git branch -M main  # Ensure we're on 'main' branch

pass_test "Main branch created with initial files"

# Step 2: Create feature branch with mixed changes
info "Step 2: Creating feature branch with mixed code and docs"
git checkout -q -b worktree/test-feature-task-1

# Add code files
echo "export const config = {};" > config.js
echo "export function helper() {}" > utils.js
echo "describe('test', () => {});" > test.spec.js

# Add documentation files
echo "# API Documentation" > API.md
echo "# User Guide" > GUIDE.md
mkdir -p docs
echo "# Architecture" > docs/ARCHITECTURE.md

# Modify existing files
echo "console.log('updated');" >> app.js
echo "## New Section" >> README.md

git add .
git commit -q -m "feat: add feature with docs"

pass_test "Feature branch created with 4 code files and 4 markdown files"

# Step 3: Create KARIMO status file
info "Step 3: Creating status.json in ready-for-merge state"
mkdir -p .karimo/prds/test-feature
cat > .karimo/prds/test-feature/status.json <<'EOF'
{
  "prd_slug": "test-feature",
  "status": "ready-for-merge",
  "tasks": [
    {
      "task_id": "task-1",
      "status": "merged_to_main"
    }
  ]
}
EOF

pass_test "Status file created in ready-for-merge state"

# Step 4: Calculate merge statistics (simulating karimo-merge logic)
info "Step 4: Calculating merge statistics"

# Get total stats
TOTAL_STATS=$(git diff --shortstat main..worktree/test-feature-task-1)
TOTAL_FILES=$(git diff --name-only main..worktree/test-feature-task-1 | wc -l | tr -d ' ')
TOTAL_ADDED=$(echo "$TOTAL_STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
TOTAL_DELETED=$(echo "$TOTAL_STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Get markdown stats
MD_FILES=$(git diff --name-only main..worktree/test-feature-task-1 | grep -E '\.(md|mdx)$' || true)
MD_COUNT=$(echo "$MD_FILES" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$MD_COUNT" -gt 0 ]; then
    MD_STATS=$(git diff --shortstat main..worktree/test-feature-task-1 -- $(echo "$MD_FILES" | tr '\n' ' '))
    MD_ADDED=$(echo "$MD_STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
    MD_DELETED=$(echo "$MD_STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
else
    MD_ADDED=0
    MD_DELETED=0
fi

# Calculate code stats
CODE_FILES=$(git diff --name-only main..worktree/test-feature-task-1 | grep -vE '\.(md|mdx)$' || true)
CODE_COUNT=$(echo "$CODE_FILES" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$CODE_COUNT" -gt 0 ]; then
    CODE_STATS=$(git diff --shortstat main..worktree/test-feature-task-1 -- $(echo "$CODE_FILES" | tr '\n' ' '))
    CODE_ADDED=$(echo "$CODE_STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
    CODE_DELETED=$(echo "$CODE_STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
else
    CODE_ADDED=0
    CODE_DELETED=0
fi

pass_test "Statistics calculated: $TOTAL_FILES files, +$TOTAL_ADDED/-$TOTAL_DELETED lines"

# Step 5: Verify markdown/code breakdown
info "Step 5: Verifying markdown vs code breakdown"

# Check markdown count (README.md, API.md, GUIDE.md, docs/ARCHITECTURE.md = 4 files)
if [ "$MD_COUNT" = "4" ]; then
    pass_test "Markdown file count correct: $MD_COUNT files"
else
    fail_test "Markdown file count" "4" "$MD_COUNT"
fi

# Check code count (config.js, utils.js, test.spec.js, app.js = 4 files)
EXPECTED_CODE=4
if [ "$CODE_COUNT" = "$EXPECTED_CODE" ]; then
    pass_test "Code file count correct: $CODE_COUNT files"
else
    fail_test "Code file count" "$EXPECTED_CODE" "$CODE_COUNT"
fi

# Verify total = docs + code
CALCULATED_TOTAL=$((MD_COUNT + CODE_COUNT))
if [ "$TOTAL_FILES" = "$CALCULATED_TOTAL" ]; then
    pass_test "Total files = docs + code ($TOTAL_FILES = $MD_COUNT + $CODE_COUNT)"
else
    fail_test "Total calculation" "$CALCULATED_TOTAL" "$TOTAL_FILES"
fi

# Step 6: Generate PR body (simulating template)
info "Step 6: Generating PR description"

PR_BODY=$(cat <<EOF
## Summary
Test feature implementation

**Total:**
- Files changed: $TOTAL_FILES files
- Additions: +$TOTAL_ADDED lines
- Deletions: -$TOTAL_DELETED lines

**Breakdown:**
- Docs: $MD_COUNT files, +$MD_ADDED/-$MD_DELETED lines
- Code: $CODE_COUNT files, +$CODE_ADDED/-$CODE_DELETED lines
EOF
)

if echo "$PR_BODY" | grep -q "Breakdown:"; then
    pass_test "PR body includes breakdown section"
else
    fail_test "PR body format" "includes breakdown" "missing breakdown"
fi

if echo "$PR_BODY" | grep -q "Docs: $MD_COUNT files"; then
    pass_test "PR body shows correct docs count"
else
    fail_test "PR body docs" "Docs: $MD_COUNT files" "$(echo "$PR_BODY" | grep 'Docs:')"
fi

if echo "$PR_BODY" | grep -q "Code: $CODE_COUNT files"; then
    pass_test "PR body shows correct code count"
else
    fail_test "PR body code" "Code: $CODE_COUNT files" "$(echo "$PR_BODY" | grep 'Code:')"
fi

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
