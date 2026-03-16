#!/bin/bash

# KARIMO Feature Testing Suite
# Runs all unit, integration, and verification tests

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_TESTS=()

# Navigate to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     KARIMO Feature Testing Suite - v7.7.0                  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}     Enhanced Merge Reports & Incremental PRD Commits        ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

run_test() {
    local test_file=$1
    local test_name=$2

    echo -e "${YELLOW}Running: $test_name${NC}"
    echo "─────────────────────────────────────────────────────────────"

    if bash "$test_file"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        ((TOTAL_PASS++))
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        ((TOTAL_FAIL++))
        FAILED_TESTS+=("$test_name")
    fi

    echo ""
}

# Unit Tests
echo -e "${BLUE}═══ Unit Tests ═══${NC}"
echo ""

if [ -d "tests/unit" ]; then
    for test in tests/unit/*.sh; do
        if [ -f "$test" ]; then
            test_name=$(basename "$test" .sh)
            run_test "$test" "$test_name"
        fi
    done
else
    echo -e "${RED}✗ Unit test directory not found${NC}"
    ((TOTAL_FAIL++))
fi

# Integration Tests
echo -e "${BLUE}═══ Integration Tests ═══${NC}"
echo ""

if [ -d "tests/integration" ]; then
    for test in tests/integration/*.sh; do
        if [ -f "$test" ]; then
            test_name=$(basename "$test" .sh)
            run_test "$test" "$test_name"
        fi
    done
else
    echo -e "${RED}✗ Integration test directory not found${NC}"
    ((TOTAL_FAIL++))
fi

# Verification Tests
echo -e "${BLUE}═══ Verification Tests ═══${NC}"
echo ""

if [ -d "tests/verify" ]; then
    for test in tests/verify/*.sh; do
        if [ -f "$test" ]; then
            test_name=$(basename "$test" .sh)
            run_test "$test" "$test_name"
        fi
    done
else
    echo -e "${RED}✗ Verification test directory not found${NC}"
    ((TOTAL_FAIL++))
fi

# Final Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}                     Test Summary                             ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_PASS + TOTAL_FAIL))

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TOTAL_PASS${NC}"
echo -e "Failed: ${RED}$TOTAL_FAIL${NC}"
echo ""

if [ $TOTAL_FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ✓ ALL TESTS PASSED - FEATURES READY FOR RELEASE           ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Test Coverage:"
    echo "  ✓ Merge statistics calculation"
    echo "  ✓ Interview commit messages"
    echo "  ✓ Full merge flow with enhanced reporting"
    echo "  ✓ Incremental interview commits (4 rounds)"
    echo "  ✓ Bash syntax validation"
    echo "  ✓ Commit format compliance"
    echo "  ✓ Template injection safety"
    echo ""
    echo "Next Steps:"
    echo "  1. Review documentation updates"
    echo "  2. Perform manual verification"
    echo "  3. Proceed with release preparation"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  ✗ SOME TESTS FAILED - REVIEW REQUIRED                      ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Failed Tests:"
    for failed in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}✗${NC} $failed"
    done
    echo ""
    echo "Action Required:"
    echo "  1. Review test output above"
    echo "  2. Fix identified issues"
    echo "  3. Re-run test suite"
    exit 1
fi
