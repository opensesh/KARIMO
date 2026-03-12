#!/bin/bash
# KARIMO Lifecycle Hook: on-failure
#
# Runs when a task fails during /karimo-run execution (after each retry attempt).
#
# Environment variables available:
#   TASK_ID          - Task identifier (e.g., "1a", "2b")
#   PRD_SLUG         - PRD slug (e.g., "user-auth")
#   TASK_NAME        - Human-readable task name
#   TASK_TYPE        - Task type: "implementation", "testing", "documentation"
#   COMPLEXITY       - Complexity score (1-10)
#   WAVE             - Wave number (1, 2, 3, etc.)
#   BRANCH_NAME      - Git branch for this task
#   PR_NUMBER        - Pull request number (if created before failure)
#   PR_URL           - Pull request URL (if created)
#   FAILURE_REASON   - Error message or failure description
#   ATTEMPT          - Retry attempt number (1, 2, 3)
#   MAX_ATTEMPTS     - Maximum retry attempts (usually 3)
#   ESCALATED_MODEL  - Model used for this attempt (e.g., "sonnet", "opus")
#   PROJECT_ROOT     - Absolute path to project root
#
# Exit codes:
#   0 - Success, continue execution
#   1 - Soft failure, log warning but continue
#   2 - Hard failure, abort wave

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Example: Send critical alert via PagerDuty
send_pagerduty_alert() {
    local pd_key="${PAGERDUTY_INTEGRATION_KEY:-}"

    if [ -z "$pd_key" ]; then
        echo "Info: PAGERDUTY_INTEGRATION_KEY not set, skipping alert"
        return 0
    fi

    # Only alert on final failure (after all retries exhausted)
    if [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; then
        echo "Not final attempt ($ATTEMPT/$MAX_ATTEMPTS), skipping PagerDuty alert"
        return 0
    fi

    echo "Sending PagerDuty alert for critical failure: $TASK_NAME"

    curl -X POST https://events.pagerduty.com/v2/enqueue \
        -H 'Content-Type: application/json' \
        -d "{
            \"routing_key\": \"$pd_key\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"KARIMO task failed after $MAX_ATTEMPTS attempts: $TASK_NAME\",
                \"severity\": \"error\",
                \"source\": \"KARIMO\",
                \"custom_details\": {
                    \"prd\": \"$PRD_SLUG\",
                    \"task_id\": \"$TASK_ID\",
                    \"task_type\": \"$TASK_TYPE\",
                    \"wave\": \"$WAVE\",
                    \"complexity\": \"$COMPLEXITY\",
                    \"failure_reason\": \"$FAILURE_REASON\",
                    \"attempts\": \"$ATTEMPT/$MAX_ATTEMPTS\",
                    \"escalated_model\": \"$ESCALATED_MODEL\",
                    \"pr_url\": \"${PR_URL:-N/A}\",
                    \"branch\": \"$BRANCH_NAME\"
                }
            }
        }" && {
            echo "PagerDuty alert sent successfully"
            return 0
        } || {
            echo "Warning: Failed to send PagerDuty alert"
            return 1
        }
}

# Example: Send Slack failure notification
send_slack_alert() {
    local webhook="${SLACK_WEBHOOK_URL:-}"

    if [ -z "$webhook" ]; then
        echo "Info: SLACK_WEBHOOK_URL not set, skipping notification"
        return 0
    fi

    # Determine severity color based on attempt number
    local color
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        color="#dc143c"  # Critical red (final failure)
    elif [ "$ATTEMPT" -eq 2 ]; then
        color="#ffa500"  # Warning orange (2nd attempt)
    else
        color="#ffff00"  # Caution yellow (1st attempt)
    fi

    local status_text
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        status_text="❌ CRITICAL: Task failed after all retries"
    else
        status_text="⚠️ Task failed (attempt $ATTEMPT/$MAX_ATTEMPTS, will retry with $ESCALATED_MODEL)"
    fi

    echo "Sending Slack alert for task failure: $TASK_NAME"

    curl -X POST "$webhook" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"$status_text\",
            \"attachments\": [{
                \"color\": \"$color\",
                \"title\": \"$TASK_NAME\",
                \"fields\": [
                    {\"title\": \"PRD\", \"value\": \"$PRD_SLUG\", \"short\": true},
                    {\"title\": \"Task ID\", \"value\": \"$TASK_ID\", \"short\": true},
                    {\"title\": \"Attempt\", \"value\": \"$ATTEMPT/$MAX_ATTEMPTS\", \"short\": true},
                    {\"title\": \"Model\", \"value\": \"$ESCALATED_MODEL\", \"short\": true},
                    {\"title\": \"Wave\", \"value\": \"$WAVE\", \"short\": true},
                    {\"title\": \"Complexity\", \"value\": \"$COMPLEXITY/10\", \"short\": true},
                    {\"title\": \"Failure Reason\", \"value\": \"$FAILURE_REASON\", \"short\": false}
                ],
                \"actions\": [
                    {\"type\": \"button\", \"text\": \"View PR\", \"url\": \"${PR_URL:-}\"}
                ]
            }]
        }" 2>&1 | grep -q "ok" && echo "Slack alert sent successfully" || {
            echo "Warning: Failed to send Slack alert"
            return 1
        }

    return 0
}

# Example: Create GitHub issue for critical failures
create_github_issue() {
    # Only create issue on final failure
    if [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; then
        echo "Not final attempt, skipping GitHub issue creation"
        return 0
    fi

    if ! command -v gh &> /dev/null; then
        echo "Info: gh CLI not installed, skipping GitHub issue creation"
        return 0
    fi

    echo "Creating GitHub issue for critical task failure"

    local issue_title="[KARIMO] Task failed after retries: $TASK_NAME"
    local issue_body="## Task Failure Report

**PRD:** $PRD_SLUG
**Task ID:** $TASK_ID
**Task Name:** $TASK_NAME
**Task Type:** $TASK_TYPE
**Wave:** $WAVE
**Complexity:** $COMPLEXITY/10

### Failure Details

**Attempts:** $ATTEMPT/$MAX_ATTEMPTS
**Final Model:** $ESCALATED_MODEL
**Branch:** $BRANCH_NAME
**PR:** ${PR_URL:-N/A}

**Failure Reason:**
\`\`\`
$FAILURE_REASON
\`\`\`

### Next Steps

1. Review the PR: ${PR_URL:-N/A}
2. Check task logs in \`.karimo/logs/tasks.log\`
3. Investigate failure reason above
4. Manual intervention required to complete this task

### Context

This task was part of wave $WAVE in PRD \`$PRD_SLUG\`. After $MAX_ATTEMPTS retry attempts with model escalation, the task could not be completed automatically.

---
*Auto-generated by KARIMO on-failure hook*"

    gh issue create \
        --title "$issue_title" \
        --body "$issue_body" \
        --label "karimo,task-failure,needs-review" && {
            echo "GitHub issue created successfully"
            return 0
        } || {
            echo "Warning: Failed to create GitHub issue"
            return 1
        }
}

# Example: Log failure details
log_failure() {
    local log_file="$PROJECT_ROOT/.karimo/logs/failures.log"
    mkdir -p "$(dirname "$log_file")"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat >> "$log_file" <<EOF
[$timestamp] FAILURE
  PRD:             $PRD_SLUG
  Task:            $TASK_ID - $TASK_NAME
  Type:            $TASK_TYPE
  Wave:            $WAVE
  Complexity:      $COMPLEXITY/10
  Attempt:         $ATTEMPT/$MAX_ATTEMPTS
  Model:           $ESCALATED_MODEL
  Branch:          $BRANCH_NAME
  PR:              ${PR_URL:-N/A}
  Failure Reason:  $FAILURE_REASON
  ────────────────────────────────────────

EOF

    echo "Logged failure to: $log_file"

    return 0
}

# Example: Rollback changes on critical failure
rollback_on_critical_failure() {
    # Only rollback on final failure
    if [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; then
        echo "Not final attempt, skipping rollback"
        return 0
    fi

    echo "WARNING: Critical failure detected, considering rollback"

    # Check if we should rollback (customize this logic)
    local should_rollback="${AUTO_ROLLBACK_ON_FAILURE:-false}"

    if [ "$should_rollback" != "true" ]; then
        echo "Info: AUTO_ROLLBACK_ON_FAILURE not set to 'true', skipping rollback"
        echo "Branch $BRANCH_NAME and PR ${PR_URL:-} will remain for manual review"
        return 0
    fi

    echo "Performing automatic rollback..."

    # Delete branch (if PR not created or closed)
    if [ -z "${PR_NUMBER:-}" ]; then
        git push origin --delete "$BRANCH_NAME" 2>/dev/null || true
        echo "Deleted branch: $BRANCH_NAME"
    else
        echo "PR exists (#$PR_NUMBER), keeping branch for manual review"
    fi

    # Notify about rollback
    echo "Rollback completed. Branch status preserved for investigation."

    return 0
}

# Main execution
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "KARIMO On-Failure Hook"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PRD:            $PRD_SLUG"
    echo "Task:           $TASK_ID - $TASK_NAME"
    echo "Type:           $TASK_TYPE"
    echo "Complexity:     $COMPLEXITY/10"
    echo "Wave:           $WAVE"
    echo "Attempt:        $ATTEMPT/$MAX_ATTEMPTS"
    echo "Model:          $ESCALATED_MODEL"
    echo "Branch:         $BRANCH_NAME"
    echo "PR:             ${PR_URL:-Not created}"
    echo "Failure Reason: $FAILURE_REASON"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Determine if this is a critical failure
    local is_critical=false
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        is_critical=true
        echo "🚨 CRITICAL FAILURE: All retry attempts exhausted"
    else
        echo "⚠️  Retry $ATTEMPT/$MAX_ATTEMPTS failed, will retry with model: $ESCALATED_MODEL"
    fi

    # Run failure handling (customize as needed)
    # Uncomment the functions you want to use:

    # send_slack_alert  # Send to Slack (all attempts)
    # log_failure       # Log to file (all attempts)

    # Critical-only alerts (final attempt only):
    # if [ "$is_critical" = true ]; then
    #     send_pagerduty_alert
    #     create_github_issue
    #     rollback_on_critical_failure
    # fi

    # Add your custom logic here

    if [ "$is_critical" = true ]; then
        echo "Critical failure hook completed - manual intervention required"
    else
        echo "Failure hook completed - retry will begin shortly"
    fi

    exit 0
}

# Execute main function
main
