#!/bin/bash

# Unit Test: Merge Statistics Calculation
# Tests git diff calculations, markdown filtering, and arithmetic operations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="Merge Statistics Calculation"
PASS_COUNT=0
FAIL_COUNT=0

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
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

# Create temporary test repository
TEST_REPO=$(mktemp -d)
trap "rm -rf $TEST_REPO" EXIT

cd "$TEST_REPO"
git init -q
git config user.email "test@example.com"
git config user.name "Test User"

echo "=== Unit Test: $TEST_NAME ==="
echo ""

# Test 1: Calculate additions/deletions from git diff
info "Test 1: Calculate additions/deletions from git diff"
echo "line 1" > file1.txt
echo "line 2" >> file1.txt
echo "line 3" >> file1.txt
git add file1.txt
git commit -q -m "Initial commit"
git branch -M main  # Ensure we're on 'main' branch

echo "line 4" >> file1.txt
echo "line 5" >> file1.txt
git add file1.txt
git commit -q -m "Add 2 lines"

# Simulate the git diff stat parsing
DIFF_OUTPUT=$(git diff HEAD~1..HEAD --shortstat)
if echo "$DIFF_OUTPUT" | grep -q "2 insertions"; then
    pass_test "Git diff correctly shows 2 insertions"
else
    fail_test "Git diff insertions calculation" "2 insertions" "$DIFF_OUTPUT"
fi

# Test 2: Filter markdown files correctly
info "Test 2: Filter markdown files (.md, .mdx)"
git checkout -q -b feature
echo "# Doc" > README.md
echo "# MDX" > component.mdx
echo "code" > script.js
git add .
git commit -q -m "Add mixed files"

MD_FILES=$(git diff --name-only main..feature | grep -E '\.(md|mdx)$' || true)
NON_MD_FILES=$(git diff --name-only main..feature | grep -vE '\.(md|mdx)$' || true)

MD_COUNT=$(echo "$MD_FILES" | grep -v '^$' | wc -l | tr -d ' ')
NON_MD_COUNT=$(echo "$NON_MD_FILES" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$MD_COUNT" = "2" ]; then
    pass_test "Correctly identified 2 markdown files"
else
    fail_test "Markdown file count" "2" "$MD_COUNT"
fi

if [ "$NON_MD_COUNT" = "1" ]; then
    pass_test "Correctly identified 1 code file"
else
    fail_test "Code file count" "1" "$NON_MD_COUNT"
fi

# Test 3: Separate new files from modified files
info "Test 3: Separate new files from modified files"
echo "modified" >> README.md
echo "# New doc" > NEW.md
git add .
git commit -q -m "Modify existing and add new"

DIFF_FILES=$(git diff --name-status main..feature)
NEW_FILES=$(echo "$DIFF_FILES" | grep '^A' | wc -l | tr -d ' ')
MODIFIED_FILES=$(echo "$DIFF_FILES" | grep '^M' | wc -l | tr -d ' ')

# We have 4 new files: README.md, component.mdx, script.js, NEW.md
if [ "$NEW_FILES" = "4" ]; then
    pass_test "Correctly identified 4 new files (A status)"
else
    fail_test "New file count" "4" "$NEW_FILES"
fi

# README.md was added then modified, so it shows as A, not M
if [ "$MODIFIED_FILES" = "0" ]; then
    pass_test "Correctly identified 0 modified files (files added in branch)"
else
    fail_test "Modified file count" "0" "$MODIFIED_FILES"
fi

# Test 4: Handle edge case - no markdown files
info "Test 4: Edge case - no markdown files"
# Create code-only branch from main (not from feature)
git checkout -q main
git checkout -q -b code-only
echo "code" > app.py
echo "test" > test.py
git add .
git commit -q -m "Code only"

MD_FILES=$(git diff --name-only main..code-only | grep -E '\.(md|mdx)$' || true)
MD_COUNT=$(echo "$MD_FILES" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$MD_COUNT" = "0" ]; then
    pass_test "Edge case: no markdown files handled (count = 0)"
else
    fail_test "No markdown edge case" "0" "$MD_COUNT"
fi

# Test 5: Handle edge case - only markdown files
info "Test 5: Edge case - only markdown files"
git checkout -q main
git checkout -q -b docs-only
echo "# Guide" > guide.md
echo "# API" > api.md
git add .
git commit -q -m "Docs only"

CODE_FILES=$(git diff --name-only main..docs-only | grep -vE '\.(md|mdx)$' || true)
CODE_COUNT=$(echo "$CODE_FILES" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$CODE_COUNT" = "0" ]; then
    pass_test "Edge case: only markdown files handled (code count = 0)"
else
    fail_test "Only markdown edge case" "0" "$CODE_COUNT"
fi

# Test 6: Verify total = docs + code
info "Test 6: Verify arithmetic - total = docs + code"
git checkout -q feature

TOTAL_FILES=$(git diff --name-only main..feature | wc -l | tr -d ' ')
MD_FILES=$(git diff --name-only main..feature | grep -E '\.(md|mdx)$' | wc -l | tr -d ' ')
CODE_FILES=$(git diff --name-only main..feature | grep -vE '\.(md|mdx)$' | wc -l | tr -d ' ')

CALCULATED_TOTAL=$((MD_FILES + CODE_FILES))

if [ "$TOTAL_FILES" = "$CALCULATED_TOTAL" ]; then
    pass_test "Arithmetic verified: total ($TOTAL_FILES) = docs ($MD_FILES) + code ($CODE_FILES)"
else
    fail_test "Total calculation" "total=$CALCULATED_TOTAL" "total=$TOTAL_FILES (docs=$MD_FILES, code=$CODE_FILES)"
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
