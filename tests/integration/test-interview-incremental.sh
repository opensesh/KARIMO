#!/bin/bash

# Integration Test: Incremental Interview Commits
# End-to-end test of 4-round interview with progressive commits

TEST_NAME="Incremental Interview Commits"
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

# Initial commit
echo "# Project" > README.md
git add README.md
git commit -q -m "Initial commit"

pass_test "Test repository initialized"

# Setup PRD directory
PRD_SLUG="test-feature"
PRD_DIR=".karimo/prds/$PRD_SLUG"
PRD_FILE="$PRD_DIR/PRD.md"
STATUS_FILE="$PRD_DIR/status.json"

mkdir -p "$PRD_DIR"

info "Simulating 4-round interview with incremental commits"

# Round 1: Framing
info "Round 1: Creating PRD with framing section"

cat > "$PRD_FILE" <<'EOF'
# PRD: Test Feature

## Executive Summary
**Problem Statement:** Need to test incremental commits
**Proposed Solution:** Create test feature
**Success Criteria:** All commits created correctly

## Scope
- In scope: Testing
- Out of scope: Production use
EOF

cat > "$STATUS_FILE" <<EOF
{
  "prd_slug": "$PRD_SLUG",
  "status": "interviewing",
  "interview_progress": {
    "round_1_framing": "completed",
    "round_2_requirements": "not_started"
  }
}
EOF

git add "$PRD_FILE" "$STATUS_FILE"
git commit -q -m "$(cat <<COMMIT
docs(karimo): add PRD framing for $PRD_SLUG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
COMMIT
)"

COMMIT_COUNT=$(git rev-list --count HEAD)
if [ "$COMMIT_COUNT" = "2" ]; then
    pass_test "Round 1 commit created (total: $COMMIT_COUNT commits)"
else
    fail_test "Round 1 commit count" "2" "$COMMIT_COUNT"
fi

# Verify commit message format
LAST_COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$LAST_COMMIT_MSG" | grep -q "docs(karimo): add PRD framing"; then
    pass_test "Round 1 commit message follows conventional format"
else
    fail_test "Round 1 commit format" "docs(karimo): add PRD framing..." "$LAST_COMMIT_MSG"
fi

if echo "$LAST_COMMIT_MSG" | grep -q "Co-Authored-By:"; then
    pass_test "Round 1 commit has Co-Authored-By footer"
else
    fail_test "Round 1 Co-Authored-By" "present" "missing"
fi

# Round 2: Requirements
info "Round 2: Appending requirements section"

cat >> "$PRD_FILE" <<'EOF'

## Goals & Requirements

### Functional Requirements
1. **FR-1:** Create git commits incrementally
2. **FR-2:** Follow conventional commit format

### Non-Functional Requirements
- **NFR-1:** All commits must be atomic
EOF

jq '.interview_progress.round_2_requirements = "completed" | .interview_progress.round_3_dependencies = "not_started"' "$STATUS_FILE" > "$STATUS_FILE.tmp"
mv "$STATUS_FILE.tmp" "$STATUS_FILE"

git add "$PRD_FILE" "$STATUS_FILE"
git commit -q -m "$(cat <<COMMIT
docs(karimo): add PRD requirements for $PRD_SLUG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
COMMIT
)"

COMMIT_COUNT=$(git rev-list --count HEAD)
if [ "$COMMIT_COUNT" = "3" ]; then
    pass_test "Round 2 commit created (total: $COMMIT_COUNT commits)"
else
    fail_test "Round 2 commit count" "3" "$COMMIT_COUNT"
fi

LAST_COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$LAST_COMMIT_MSG" | grep -q "docs(karimo): add PRD requirements"; then
    pass_test "Round 2 commit message follows conventional format"
else
    fail_test "Round 2 commit format" "docs(karimo): add PRD requirements..." "$LAST_COMMIT_MSG"
fi

# Round 3: Dependencies
info "Round 3: Appending dependencies section"

cat >> "$PRD_FILE" <<'EOF'

## Dependencies & Constraints

### Technical Dependencies
- Git repository
- Bash shell

### Milestones
1. Complete framing
2. Complete requirements
3. Complete dependencies
4. Complete retrospective
EOF

jq '.interview_progress.round_3_dependencies = "completed" | .interview_progress.round_4_retrospective = "not_started"' "$STATUS_FILE" > "$STATUS_FILE.tmp"
mv "$STATUS_FILE.tmp" "$STATUS_FILE"

git add "$PRD_FILE" "$STATUS_FILE"
git commit -q -m "$(cat <<COMMIT
docs(karimo): add PRD dependencies for $PRD_SLUG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
COMMIT
)"

COMMIT_COUNT=$(git rev-list --count HEAD)
if [ "$COMMIT_COUNT" = "4" ]; then
    pass_test "Round 3 commit created (total: $COMMIT_COUNT commits)"
else
    fail_test "Round 3 commit count" "4" "$COMMIT_COUNT"
fi

LAST_COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$LAST_COMMIT_MSG" | grep -q "docs(karimo): add PRD dependencies"; then
    pass_test "Round 3 commit message follows conventional format"
else
    fail_test "Round 3 commit format" "docs(karimo): add PRD dependencies..." "$LAST_COMMIT_MSG"
fi

# Round 4: Complete PRD
info "Round 4: Completing PRD with tasks"

cat >> "$PRD_FILE" <<'EOF'

## Retrospective & Learnings
- Pattern: Commit after each interview round
- Benefit: Git-based crash recovery

## Execution Plan
See tasks.yaml for task breakdown.
EOF

# Create tasks.yaml
cat > "$PRD_DIR/tasks.yaml" <<'EOF'
tasks:
  - id: task-1
    title: Test task
    complexity: 2
    type: implementation
    wave: 1
EOF

jq '.interview_progress.round_4_retrospective = "completed" | .status = "ready-for-execution"' "$STATUS_FILE" > "$STATUS_FILE.tmp"
mv "$STATUS_FILE.tmp" "$STATUS_FILE"

git add "$PRD_FILE" "$PRD_DIR/tasks.yaml" "$STATUS_FILE"
git commit -q -m "$(cat <<COMMIT
docs(karimo): complete PRD for $PRD_SLUG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
COMMIT
)"

COMMIT_COUNT=$(git rev-list --count HEAD)
if [ "$COMMIT_COUNT" = "5" ]; then
    pass_test "Round 4 commit created (total: $COMMIT_COUNT commits)"
else
    fail_test "Round 4 commit count" "5" "$COMMIT_COUNT"
fi

LAST_COMMIT_MSG=$(git log -1 --pretty=%B)
if echo "$LAST_COMMIT_MSG" | grep -q "docs(karimo): complete PRD"; then
    pass_test "Round 4 commit message follows conventional format"
else
    fail_test "Round 4 commit format" "docs(karimo): complete PRD..." "$LAST_COMMIT_MSG"
fi

# Verify all 4 interview commits exist
info "Verifying all 4 interview commits in git log"

INTERVIEW_COMMITS=$(git log --oneline | grep -c "docs(karimo):" || echo "0")
if [ "$INTERVIEW_COMMITS" = "4" ]; then
    pass_test "All 4 interview commits found in git log"
else
    fail_test "Interview commit count in log" "4" "$INTERVIEW_COMMITS"
fi

# Verify final PRD has all sections
info "Verifying final PRD completeness"

if grep -q "Executive Summary" "$PRD_FILE"; then
    pass_test "PRD contains Executive Summary (Round 1)"
else
    fail_test "PRD section" "Executive Summary" "missing"
fi

if grep -q "Goals & Requirements" "$PRD_FILE"; then
    pass_test "PRD contains Goals & Requirements (Round 2)"
else
    fail_test "PRD section" "Goals & Requirements" "missing"
fi

if grep -q "Dependencies & Constraints" "$PRD_FILE"; then
    pass_test "PRD contains Dependencies & Constraints (Round 3)"
else
    fail_test "PRD section" "Dependencies & Constraints" "missing"
fi

if grep -q "Retrospective & Learnings" "$PRD_FILE"; then
    pass_test "PRD contains Retrospective & Learnings (Round 4)"
else
    fail_test "PRD section" "Retrospective & Learnings" "missing"
fi

# Verify no uncommitted changes
info "Verifying clean git state"

if git diff --quiet && git diff --cached --quiet; then
    pass_test "No uncommitted markdown artifacts remain"
else
    fail_test "Git state" "clean" "uncommitted changes found"
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
