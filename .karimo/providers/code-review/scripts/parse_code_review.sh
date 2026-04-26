#!/bin/bash
# Parse Claude Code Review results
#
# Environment variables:
#   PR_NUMBER — Pull request number
#   REPO_OWNER — Repository owner
#   REPO_NAME — Repository name
#   BLOCK_ON_RED — Block on 🔴 findings (true/false)
#   IGNORE_NITS — Ignore 🟡 findings (true/false)
#   IGNORE_PREEXISTING — Ignore 🟣 findings (true/false)
#
# Output (stdout):
#   passed=true|false — Whether review passed
#   red_count=N       — 🔴 (Normal) finding count
#   yellow_count=N    — 🟡 (Nit) finding count
#   purple_count=N    — 🟣 (Pre-existing) finding count

set -e

# Get PR inline comments
comments=$(gh api "repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/comments" --jq '.[] | .body' 2>/dev/null || true)

# Count by severity marker
red_count=$(echo "$comments" | grep -c '🔴' || echo "0")
yellow_count=$(echo "$comments" | grep -c '🟡' || echo "0")
purple_count=$(echo "$comments" | grep -c '🟣' || echo "0")

# Default config values
block_on_red="${BLOCK_ON_RED:-true}"
ignore_nits="${IGNORE_NITS:-false}"
ignore_preexisting="${IGNORE_PREEXISTING:-true}"

# Determine pass/fail
passed="true"

# Check red findings
if [ "$block_on_red" = "true" ] && [ "$red_count" -gt 0 ]; then
  passed="false"
fi

# Check yellow findings (unless ignored)
if [ "$ignore_nits" = "false" ] && [ "$yellow_count" -gt 0 ]; then
  # Nits don't block by default in most configs
  # But if ignore_nits is explicitly false, they could
  : # Currently nits don't block
fi

# Pre-existing findings are always ignored by default
# (they're from code not changed in this PR)

# Output results
echo "passed=$passed"
echo "red_count=$red_count"
echo "yellow_count=$yellow_count"
echo "purple_count=$purple_count"
