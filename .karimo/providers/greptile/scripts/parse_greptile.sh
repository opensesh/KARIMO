#!/bin/bash
# Parse Greptile review results
#
# Environment variables:
#   PR_NUMBER — Pull request number
#   REPO_OWNER — Repository owner
#   REPO_NAME — Repository name
#   THRESHOLD — Pass threshold (1-5)
#
# Output (stdout):
#   score=N           — Greptile score (1-5)
#   passed=true|false — Whether score meets threshold
#   p1_count=N        — P1 (critical) finding count
#   p2_count=N        — P2 (important) finding count
#   p3_count=N        — P3 (optional) finding count

set -e

# Get PR comments
comments=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[].body' 2>/dev/null)

# Find Greptile review comment with confidence score
greptile_review=$(echo "$comments" | grep -E 'confidence.*[0-5]/5|[0-5]/5.*confidence' | tail -1 || true)

if [ -z "$greptile_review" ]; then
  echo "score=0"
  echo "passed=false"
  echo "error=no_review_found"
  exit 0
fi

# Parse confidence score (format: X/5 or confidence: X/5)
score=$(echo "$greptile_review" | grep -oE '[0-5]/5' | tail -1 | cut -d'/' -f1)
score=${score:-0}

# Get inline comments (findings)
findings=$(gh api "repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/comments" --jq '
  .[] | select(.body | test("P[123]:")) | .body
' 2>/dev/null || true)

# Count by priority
p1_count=$(echo "$findings" | grep -c 'P1:' || echo "0")
p2_count=$(echo "$findings" | grep -c 'P2:' || echo "0")
p3_count=$(echo "$findings" | grep -c 'P3:' || echo "0")

# Determine pass/fail
threshold="${THRESHOLD:-5}"
if [ "$score" -ge "$threshold" ]; then
  passed="true"
else
  passed="false"
fi

# Output results
echo "score=$score"
echo "passed=$passed"
echo "p1_count=$p1_count"
echo "p2_count=$p2_count"
echo "p3_count=$p3_count"
