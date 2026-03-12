#!/bin/bash
# KARIMO Lifecycle Hook: post-task
#
# Runs after each task completes successfully during /karimo-run execution.
#
# Environment variables available:
#   TASK_ID       - Task identifier (e.g., "1a", "2b")
#   PRD_SLUG      - PRD slug (e.g., "user-auth")
#   TASK_NAME     - Human-readable task name
#   TASK_TYPE     - Task type: "implementation", "testing", "documentation"
#   COMPLEXITY    - Complexity score (1-10)
#   WAVE          - Wave number (1, 2, 3, etc.)
#   BRANCH_NAME   - Git branch for this task
#   PR_NUMBER     - Pull request number
#   PR_URL        - Pull request URL
#   PROJECT_ROOT  - Absolute path to project root
#
# Exit codes:
#   0 - Success, continue execution
#   1 - Soft failure, log warning but continue
#   2 - Hard failure, abort wave

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Example: Send Slack notification when task completes
send_slack_notification() {
    local webhook="${SLACK_WEBHOOK_URL:-}"

    if [ -z "$webhook" ]; then
        echo "Info: SLACK_WEBHOOK_URL not set, skipping notification"
        return 0
    fi

    echo "Sending Slack notification for completed task: $TASK_NAME"

    curl -X POST "$webhook" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"✅ Task completed: *$TASK_NAME*\",
            \"attachments\": [{
                \"color\": \"#2eb886\",
                \"fields\": [
                    {\"title\": \"PRD\", \"value\": \"$PRD_SLUG\", \"short\": true},
                    {\"title\": \"Task ID\", \"value\": \"$TASK_ID\", \"short\": true},
                    {\"title\": \"PR\", \"value\": \"<$PR_URL|#$PR_NUMBER>\", \"short\": true},
                    {\"title\": \"Wave\", \"value\": \"$WAVE\", \"short\": true}
                ]
            }]
        }" 2>&1 | grep -q "ok" && echo "Notification sent successfully" || {
            echo "Warning: Failed to send Slack notification"
            return 1
        }

    return 0
}

# Example: Update Jira ticket status
update_jira_ticket() {
    local jira_url="${JIRA_BASE_URL:-}"
    local jira_token="${JIRA_API_TOKEN:-}"

    if [ -z "$jira_token" ]; then
        echo "Info: JIRA_API_TOKEN not set, skipping Jira integration"
        return 0
    fi

    # Find ticket by KARIMO task ID in summary or labels
    local jql="project = ${JIRA_PROJECT_KEY} AND labels = 'karimo' AND text ~ '${PRD_SLUG}/${TASK_ID}'"

    echo "Searching for Jira ticket with JQL: $jql"

    local search_response
    search_response=$(curl -s -X GET \
        -H "Authorization: Bearer $jira_token" \
        -H "Content-Type: application/json" \
        "$jira_url/rest/api/3/search?jql=$(echo "$jql" | sed 's/ /%20/g')")

    if command -v jq &> /dev/null; then
        local ticket_key
        ticket_key=$(echo "$search_response" | jq -r '.issues[0].key // empty')

        if [ -n "$ticket_key" ]; then
            echo "Found Jira ticket: $ticket_key, transitioning to Done"

            # Transition to Done (adjust transition ID for your workflow)
            curl -X POST \
                -H "Authorization: Bearer $jira_token" \
                -H "Content-Type: application/json" \
                "$jira_url/rest/api/3/issue/$ticket_key/transitions" \
                -d "{\"transition\": {\"id\": \"31\"}}"  # 31 = Done (may vary)

            # Add PR link as comment
            curl -X POST \
                -H "Authorization: Bearer $jira_token" \
                -H "Content-Type: application/json" \
                "$jira_url/rest/api/3/issue/$ticket_key/comment" \
                -d "{\"body\": \"PR created: $PR_URL\"}"

            echo "Updated Jira ticket: $ticket_key"
            return 0
        else
            echo "Info: No Jira ticket found for task $TASK_ID"
            return 0
        fi
    else
        echo "Info: jq not installed, cannot parse Jira response"
        return 0
    fi
}

# Example: Trigger staging deployment
trigger_deployment() {
    local deploy_webhook="${STAGING_DEPLOY_WEBHOOK:-}"

    if [ -z "$deploy_webhook" ]; then
        echo "Info: STAGING_DEPLOY_WEBHOOK not set, skipping deployment trigger"
        return 0
    fi

    echo "Triggering staging deployment for branch: $BRANCH_NAME"

    curl -X POST "$deploy_webhook" \
        -H 'Content-Type: application/json' \
        -d "{
            \"environment\": \"staging\",
            \"branch\": \"$BRANCH_NAME\",
            \"prd\": \"$PRD_SLUG\",
            \"task\": \"$TASK_ID\",
            \"pr_url\": \"$PR_URL\"
        }" && {
            echo "Deployment triggered successfully"
            return 0
        } || {
            echo "Warning: Failed to trigger deployment"
            return 1
        }
}

# Example: Log task completion
log_task_completion() {
    local log_file="$PROJECT_ROOT/.karimo/logs/tasks.log"
    mkdir -p "$(dirname "$log_file")"

    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] PRD=$PRD_SLUG TASK=$TASK_ID WAVE=$WAVE STATUS=completed PR=$PR_NUMBER" >> "$log_file"
    echo "Logged task completion to: $log_file"

    return 0
}

# Example: Run custom tests on PR
run_pr_tests() {
    echo "Running custom validation on PR #$PR_NUMBER"

    # Example: Check if PR has specific labels
    if command -v gh &> /dev/null; then
        local pr_labels
        pr_labels=$(gh pr view "$PR_NUMBER" --json labels -q '.labels[].name')

        if echo "$pr_labels" | grep -q "needs-review"; then
            echo "Info: PR has 'needs-review' label, skipping automated tests"
            return 0
        fi

        echo "PR labels: $pr_labels"
    else
        echo "Info: gh CLI not installed, skipping PR label check"
    fi

    # Add your custom test logic here
    # For example: integration tests, security scans, etc.

    return 0
}

# Main execution
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "KARIMO Post-Task Hook"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PRD:        $PRD_SLUG"
    echo "Task:       $TASK_ID - $TASK_NAME"
    echo "Type:       $TASK_TYPE"
    echo "Complexity: $COMPLEXITY/10"
    echo "Wave:       $WAVE"
    echo "Branch:     $BRANCH_NAME"
    echo "PR:         #$PR_NUMBER ($PR_URL)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run integrations (customize as needed)
    # Uncomment the functions you want to use:

    # send_slack_notification
    # update_jira_ticket
    # trigger_deployment
    # log_task_completion
    # run_pr_tests

    # Add your custom logic here

    echo "Post-task hook completed successfully"
    exit 0
}

# Execute main function
main
