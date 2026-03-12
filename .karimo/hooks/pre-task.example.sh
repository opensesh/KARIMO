#!/bin/bash
# KARIMO Lifecycle Hook: pre-task
#
# Runs before each task starts during /karimo-run execution.
#
# Environment variables available:
#   TASK_ID       - Task identifier (e.g., "1a", "2b")
#   PRD_SLUG      - PRD slug (e.g., "user-auth")
#   TASK_NAME     - Human-readable task name
#   TASK_TYPE     - Task type: "implementation", "testing", "documentation"
#   COMPLEXITY    - Complexity score (1-10)
#   WAVE          - Wave number (1, 2, 3, etc.)
#   BRANCH_NAME   - Git branch for this task
#   PROJECT_ROOT  - Absolute path to project root
#
# Exit codes:
#   0 - Success, continue execution
#   1 - Soft failure, log warning but continue
#   2 - Hard failure, abort task

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Example: Send Slack notification when task starts
send_slack_notification() {
    local webhook="${SLACK_WEBHOOK_URL:-}"

    if [ -z "$webhook" ]; then
        echo "Info: SLACK_WEBHOOK_URL not set, skipping notification"
        return 0
    fi

    echo "Sending Slack notification for task: $TASK_NAME"

    curl -X POST "$webhook" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"🚀 Task started: *$TASK_NAME*\",
            \"attachments\": [{
                \"color\": \"#36a64f\",
                \"fields\": [
                    {\"title\": \"PRD\", \"value\": \"$PRD_SLUG\", \"short\": true},
                    {\"title\": \"Task ID\", \"value\": \"$TASK_ID\", \"short\": true},
                    {\"title\": \"Complexity\", \"value\": \"$COMPLEXITY/10\", \"short\": true},
                    {\"title\": \"Wave\", \"value\": \"$WAVE\", \"short\": true}
                ]
            }]
        }" 2>&1 | grep -q "ok" && echo "Notification sent successfully" || {
            echo "Warning: Failed to send Slack notification"
            return 1
        }

    return 0
}

# Example: Create Jira ticket for task tracking
create_jira_ticket() {
    local jira_url="${JIRA_BASE_URL:-}"
    local jira_project="${JIRA_PROJECT_KEY:-}"
    local jira_token="${JIRA_API_TOKEN:-}"

    if [ -z "$jira_token" ]; then
        echo "Info: JIRA_API_TOKEN not set, skipping Jira integration"
        return 0
    fi

    echo "Creating Jira ticket for task: $TASK_NAME"

    local response
    response=$(curl -X POST \
        -H "Authorization: Bearer $jira_token" \
        -H "Content-Type: application/json" \
        "$jira_url/rest/api/3/issue" \
        -d "{
            \"fields\": {
                \"project\": {\"key\": \"$jira_project\"},
                \"summary\": \"$TASK_NAME\",
                \"description\": \"KARIMO task: $PRD_SLUG/$TASK_ID\",
                \"issuetype\": {\"name\": \"Task\"},
                \"labels\": [\"karimo\", \"wave-$WAVE\", \"complexity-$COMPLEXITY\"]
            }
        }")

    if command -v jq &> /dev/null; then
        local ticket_key
        ticket_key=$(echo "$response" | jq -r '.key // empty')
        if [ -n "$ticket_key" ]; then
            echo "Created Jira ticket: $ticket_key"
            return 0
        else
            echo "Warning: Failed to create Jira ticket"
            return 1
        fi
    else
        echo "Info: jq not installed, cannot parse Jira response"
        return 0
    fi
}

# Example: Log task start to file
log_task_start() {
    local log_file="$PROJECT_ROOT/.karimo/logs/tasks.log"
    mkdir -p "$(dirname "$log_file")"

    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] PRD=$PRD_SLUG TASK=$TASK_ID WAVE=$WAVE STATUS=started" >> "$log_file"
    echo "Logged task start to: $log_file"

    return 0
}

# Main execution
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "KARIMO Pre-Task Hook"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PRD:        $PRD_SLUG"
    echo "Task:       $TASK_ID - $TASK_NAME"
    echo "Type:       $TASK_TYPE"
    echo "Complexity: $COMPLEXITY/10"
    echo "Wave:       $WAVE"
    echo "Branch:     $BRANCH_NAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run integrations (customize as needed)
    # Uncomment the functions you want to use:

    # send_slack_notification
    # create_jira_ticket
    # log_task_start

    # Add your custom logic here

    echo "Pre-task hook completed successfully"
    exit 0
}

# Execute main function
main
