# KARIMO Hooks

KARIMO uses a **hybrid hook system** combining Claude Code native hooks for reliable cleanup with KARIMO orchestration hooks for workflow events.

---

## Two Hook Systems

| Aspect | Claude Code Native Hooks | KARIMO Orchestration Hooks |
|--------|--------------------------|----------------------------|
| **Location** | `.claude/settings.json` | `.karimo/hooks/*.sh` |
| **Execution** | Built into Claude Code runtime | Invoked by PM Agent |
| **Reliability** | Guaranteed (even on crash) | Only at orchestration points |
| **Purpose** | Worktree/branch cleanup | Wave/task lifecycle events |

### Why Two Systems?

- **Native hooks** run at the Claude Code runtime level — they fire even if a session crashes mid-execution, guaranteeing cleanup
- **KARIMO hooks** run at orchestration points — they provide workflow customization but only execute when explicitly invoked by the PM Agent

---

## Native Hooks (Automatic)

These hooks are configured in `.claude/settings.json` and fire automatically:

| Event | Script | When it Fires |
|-------|--------|---------------|
| `WorktreeRemove` | `native-hooks/worktree-cleanup.sh` | Before worktree removal |
| `SubagentStop` | `native-hooks/subagent-cleanup.sh` | After worker agent finishes |
| `SessionEnd` | `native-hooks/session-cleanup.sh` | When Claude Code session ends |

**What they clean:**
- Local branches (`worktree/{prd-slug}-{task-id}`)
- Remote branches (pushed during execution)
- Stale worktree references
- Orphaned Claude Code internal branches (`worktree-agent-*`)

**Configuration:** See `.claude/settings.json` for hook definitions. These hooks are installed with KARIMO and should not be modified unless you understand the implications.

---

## KARIMO Orchestration Hooks (Customizable)

These hooks allow you to integrate KARIMO with your team's workflows, notification systems, monitoring tools, or custom automation.

**Key Features:**
- **Event-driven**: Hooks trigger automatically at lifecycle points
- **Context-aware**: Receive full task/PRD context via environment variables
- **Optional**: Hooks are completely optional — KARIMO works without them
- **Team-wide**: Commit hooks to your repository for consistent team workflows
- **Flexible**: Any executable script (bash, python, node, etc.)

### Available Orchestration Hooks

| Hook | When It Runs | Use Cases |
|------|--------------|-----------|
| `pre-task.sh` | Before each task starts | Send Slack notification, create Jira ticket, log to tracking system |
| `post-task.sh` | After each task completes | Update project management tools, trigger deployments, notify stakeholders |
| `pre-wave.sh` | Before wave starts | Reserve cloud resources, notify team of batch start, prepare infrastructure |
| `post-wave.sh` | After wave completes | Send batch completion reports, trigger CI/CD |
| `on-failure.sh` | When task fails (after retries) | Alert on-call engineer, create incident ticket, trigger rollback |
| `on-merge.sh` | After PR merges to main | Trigger production deployment, update changelog, notify customers |

---

## Quick Start

### 1. Create a Hook

```bash
# Create a hook from example
cp .karimo/hooks/pre-task.example.sh .karimo/hooks/pre-task.sh

# Make it executable
chmod +x .karimo/hooks/pre-task.sh

# Edit with your logic
vim .karimo/hooks/pre-task.sh
```

### 2. Test the Hook

```bash
# Test manually with sample env vars
TASK_ID="1a" \
PRD_SLUG="user-auth" \
TASK_NAME="Implement logout button" \
COMPLEXITY="2" \
.karimo/hooks/pre-task.sh
```

### 3. Run KARIMO

Hooks execute automatically during `/karimo-run`:

```bash
/karimo-run --prd user-auth
# pre-wave.sh runs before wave 1 starts
# pre-task.sh runs before each task
# post-task.sh runs after each task completes
# post-wave.sh runs after wave completes
# on-failure.sh runs if a task fails
```

---

## Hook Interface

### Environment Variables

All hooks receive these environment variables:

**Task Context:**
- `TASK_ID` — Task identifier (e.g., "1a", "2b")
- `PRD_SLUG` — PRD slug (e.g., "user-auth")
- `TASK_NAME` — Human-readable task name
- `TASK_TYPE` — Task type: "implementation", "testing", "documentation"
- `COMPLEXITY` — Complexity score (1-10)
- `WAVE` — Wave number (1, 2, 3, etc.)
- `BRANCH_NAME` — Git branch for this task

**Additional Context (where applicable):**
- `PR_NUMBER` — Pull request number (post-task, on-merge)
- `PR_URL` — Pull request URL
- `FAILURE_REASON` — Failure message (on-failure only)
- `ATTEMPT` — Retry attempt number (on-failure only)
- `MERGE_SHA` — Merge commit SHA (on-merge only)

**Project Context:**
- `PROJECT_ROOT` — Absolute path to project root
- `KARIMO_VERSION` — KARIMO version

### Exit Codes

Hooks can control execution flow via exit codes:

| Exit Code | Meaning | Effect |
|-----------|---------|--------|
| `0` | Success | Continue execution |
| `1` | Soft failure | Log warning, continue execution |
| `2` | Hard failure | Abort current task/wave |

**Example:**
```bash
#!/bin/bash
# pre-task.sh — Block task if Jira ticket doesn't exist

if ! check_jira_ticket "$TASK_ID"; then
  echo "ERROR: Jira ticket not found for task $TASK_ID"
  exit 2  # Abort task
fi

exit 0  # Continue
```

### Output

Hook output (stdout/stderr) is captured and logged:
- Stdout → Logged at INFO level
- Stderr → Logged at ERROR level

---

## Hook Examples

### Example 1: Slack Notifications

**Use case:** Notify team when tasks start and complete

**File:** `.karimo/hooks/pre-task.sh`

```bash
#!/bin/bash
# Send Slack notification when task starts

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

if [ -z "$SLACK_WEBHOOK" ]; then
  echo "Warning: SLACK_WEBHOOK_URL not set, skipping notification"
  exit 0
fi

curl -X POST "$SLACK_WEBHOOK" \
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
  }"

exit 0
```

**Setup:**
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

### Example 2: Jira Integration

**Use case:** Create Jira tickets for each task

**File:** `.karimo/hooks/pre-task.sh`

```bash
#!/bin/bash
# Create Jira ticket for task tracking

JIRA_URL="${JIRA_BASE_URL}"
JIRA_PROJECT="${JIRA_PROJECT_KEY}"
JIRA_TOKEN="${JIRA_API_TOKEN}"

if [ -z "$JIRA_TOKEN" ]; then
  echo "Warning: JIRA_API_TOKEN not set, skipping Jira integration"
  exit 0
fi

# Create ticket
RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue" \
  -d "{
    \"fields\": {
      \"project\": {\"key\": \"$JIRA_PROJECT\"},
      \"summary\": \"$TASK_NAME\",
      \"description\": \"KARIMO task: $PRD_SLUG/$TASK_ID\",
      \"issuetype\": {\"name\": \"Task\"},
      \"labels\": [\"karimo\", \"wave-$WAVE\", \"complexity-$COMPLEXITY\"]
    }
  }")

TICKET_KEY=$(echo "$RESPONSE" | jq -r '.key')
echo "Created Jira ticket: $TICKET_KEY"

exit 0
```

---

### Example 3: Deployment Trigger

**Use case:** Trigger staging deployment when wave completes

**File:** `.karimo/hooks/post-wave.sh`

```bash
#!/bin/bash
# Trigger staging deployment after wave completes

DEPLOY_ENV="staging"
DEPLOY_WEBHOOK="${STAGING_DEPLOY_WEBHOOK}"

if [ -z "$DEPLOY_WEBHOOK" ]; then
  echo "Warning: STAGING_DEPLOY_WEBHOOK not set, skipping deployment"
  exit 0
fi

echo "Triggering $DEPLOY_ENV deployment for PRD: $PRD_SLUG (Wave $WAVE)"

curl -X POST "$DEPLOY_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"environment\": \"$DEPLOY_ENV\",
    \"prd\": \"$PRD_SLUG\",
    \"wave\": \"$WAVE\",
    \"branch\": \"$BRANCH_NAME\"
  }"

if [ $? -eq 0 ]; then
  echo "Deployment triggered successfully"
  exit 0
else
  echo "ERROR: Deployment trigger failed"
  exit 1  # Soft failure — log warning but continue
fi
```

---

### Example 4: Failure Alerting

**Use case:** Alert on-call engineer when task fails

**File:** `.karimo/hooks/on-failure.sh`

```bash
#!/bin/bash
# Alert on-call engineer via PagerDuty when task fails

PAGERDUTY_KEY="${PAGERDUTY_INTEGRATION_KEY}"

if [ -z "$PAGERDUTY_KEY" ]; then
  echo "Warning: PAGERDUTY_INTEGRATION_KEY not set, skipping alert"
  exit 0
fi

# Only alert after final attempt (3rd retry)
if [ "$ATTEMPT" -lt 3 ]; then
  echo "Not final attempt ($ATTEMPT/3), skipping alert"
  exit 0
fi

curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d "{
    \"routing_key\": \"$PAGERDUTY_KEY\",
    \"event_action\": \"trigger\",
    \"payload\": {
      \"summary\": \"KARIMO task failed: $TASK_NAME\",
      \"severity\": \"error\",
      \"source\": \"KARIMO\",
      \"custom_details\": {
        \"prd\": \"$PRD_SLUG\",
        \"task_id\": \"$TASK_ID\",
        \"wave\": \"$WAVE\",
        \"complexity\": \"$COMPLEXITY\",
        \"failure_reason\": \"$FAILURE_REASON\",
        \"pr_url\": \"$PR_URL\"
      }
    }
  }"

exit 0
```

---

### Example 5: Resource Reservation

**Use case:** Reserve cloud resources before wave starts

**File:** `.karimo/hooks/pre-wave.sh`

```bash
#!/bin/bash
# Reserve cloud resources for wave execution

CLOUD_PROVIDER="aws"
INSTANCE_TYPE="t3.medium"
WAVE_SIZE=$(echo "$TASK_IDS" | wc -w)

echo "Reserving $WAVE_SIZE $INSTANCE_TYPE instances for wave $WAVE"

# Call cloud provider API to reserve capacity
aws ec2 request-spot-instances \
  --instance-count "$WAVE_SIZE" \
  --type "one-time" \
  --launch-specification "{
    \"InstanceType\": \"$INSTANCE_TYPE\",
    \"ImageId\": \"ami-xxxxx\",
    \"TagSpecifications\": [{
      \"ResourceType\": \"instance\",
      \"Tags\": [{\"Key\": \"karimo-prd\", \"Value\": \"$PRD_SLUG\"}]
    }]
  }"

if [ $? -eq 0 ]; then
  echo "Resources reserved successfully"
  exit 0
else
  echo "ERROR: Failed to reserve resources"
  exit 2  # Hard failure — abort wave
fi
```

---

## Best Practices

### 1. Keep Hooks Fast

Hooks run synchronously and block execution:
- Target < 5 seconds for pre/post hooks
- Target < 30 seconds for wave hooks
- Use background jobs for long-running operations

```bash
# Bad: Blocks for 2 minutes
sleep 120

# Good: Fire and forget
{
  sleep 120
  notify_completion
} &
```

### 2. Handle Missing Dependencies Gracefully

Don't assume tools are installed:

```bash
# Bad: Crashes if jq not installed
TICKET=$(echo "$RESPONSE" | jq -r '.key')

# Good: Check first, degrade gracefully
if command -v jq &> /dev/null; then
  TICKET=$(echo "$RESPONSE" | jq -r '.key')
else
  echo "Warning: jq not installed, skipping JSON parsing"
  exit 0
fi
```

### 3. Use Soft Failures for Non-Critical Hooks

Reserve hard failures (exit 2) for critical validations:

```bash
# Notification failed? Log warning, continue
if ! send_slack_message; then
  echo "Warning: Failed to send Slack notification"
  exit 1  # Soft failure
fi

# Security check failed? Abort task
if ! security_scan_passed; then
  echo "ERROR: Security scan failed"
  exit 2  # Hard failure
fi
```

### 4. Log Verbosely

Hooks run in the background — log everything:

```bash
echo "Starting deployment trigger for $PRD_SLUG"
echo "Wave: $WAVE, Tasks: $WAVE_SIZE"
echo "Webhook: $DEPLOY_WEBHOOK"

# ... perform action ...

echo "Deployment triggered: $DEPLOY_ID"
```

### 5. Version Control Your Hooks

Commit hooks to your repository for team-wide consistency:

```bash
# Add hooks to git
git add .karimo/hooks/*.sh
git commit -m "feat(hooks): add Slack notifications and Jira integration"
```

### 6. Test Hooks Independently

Test hooks before running full PRD execution:

```bash
# Export test environment
export TASK_ID="test-1"
export PRD_SLUG="test-prd"
export TASK_NAME="Test task"
export COMPLEXITY="5"
export WAVE="1"

# Run hook
./.karimo/hooks/pre-task.sh

# Check exit code
echo "Exit code: $?"
```

---

## Security Considerations

### 1. Never Commit Secrets

Use environment variables for sensitive data:

```bash
# Bad: Secret in hook file
SLACK_WEBHOOK="https://hooks.slack.com/services/SECRET"

# Good: Secret in environment
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
```

### 2. Validate External Data

Don't trust environment variables blindly:

```bash
# Validate PRD slug format
if [[ ! "$PRD_SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "ERROR: Invalid PRD slug format: $PRD_SLUG"
  exit 2
fi
```

### 3. Use Restricted Permissions

Hooks have full access to your project — restrict what they can do:

```bash
# Restrict to read-only operations
if [ -n "$DRY_RUN" ]; then
  echo "DRY_RUN mode: would send notification"
  exit 0
fi
```

---

## Troubleshooting

### Hook Not Executing

**Possible causes:**
1. Hook file not executable
2. Hook file doesn't exist
3. Syntax error in hook script

**Fix:**
```bash
# Check if hook exists
ls -l .karimo/hooks/pre-task.sh

# Make executable
chmod +x .karimo/hooks/pre-task.sh

# Test syntax
bash -n .karimo/hooks/pre-task.sh

# Run manually
./.karimo/hooks/pre-task.sh
```

### Hook Failing Silently

**Possible causes:**
1. Exit code 0 even on failure
2. Errors not logged

**Fix:**
```bash
# Enable error handling
set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Log all errors
exec 2>&1  # Redirect stderr to stdout
```

### Hook Blocking Execution

**Possible causes:**
1. Hook takes too long
2. Hook waiting for user input

**Fix:**
```bash
# Add timeout
timeout 30s ./.karimo/hooks/pre-task.sh

# Run in background
{
  ./.karimo/hooks/pre-task.sh
} &
```

---

## Advanced: Multi-Language Hooks

Hooks can be written in any language — just make them executable:

### Python Hook

**File:** `.karimo/hooks/pre-task.py`

```python
#!/usr/bin/env python3
import os
import sys
import requests

def send_notification():
    webhook = os.getenv('SLACK_WEBHOOK_URL')
    if not webhook:
        print("Warning: SLACK_WEBHOOK_URL not set")
        return 0

    task_name = os.getenv('TASK_NAME', 'Unknown')
    prd_slug = os.getenv('PRD_SLUG', 'Unknown')

    payload = {
        'text': f'🚀 Task started: {task_name}',
        'attachments': [{
            'color': '#36a64f',
            'fields': [
                {'title': 'PRD', 'value': prd_slug, 'short': True}
            ]
        }]
    }

    try:
        response = requests.post(webhook, json=payload)
        response.raise_for_status()
        print(f"Notification sent successfully")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(send_notification())
```

```bash
chmod +x .karimo/hooks/pre-task.py
ln -s pre-task.py .karimo/hooks/pre-task.sh
```

### Node.js Hook

**File:** `.karimo/hooks/post-task.js`

```javascript
#!/usr/bin/env node
const https = require('https');

const webhook = process.env.SLACK_WEBHOOK_URL;
if (!webhook) {
  console.log('Warning: SLACK_WEBHOOK_URL not set');
  process.exit(0);
}

const payload = JSON.stringify({
  text: `✅ Task completed: ${process.env.TASK_NAME}`,
  attachments: [{
    color: '#36a64f',
    fields: [
      { title: 'PRD', value: process.env.PRD_SLUG, short: true },
      { title: 'PR', value: process.env.PR_URL, short: true }
    ]
  }]
});

const url = new URL(webhook);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Notification sent: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.write(payload);
req.end();
```

```bash
chmod +x .karimo/hooks/post-task.js
ln -s post-task.js .karimo/hooks/post-task.sh
```

---

## Hook Execution Order

When `/karimo-run` executes a PRD:

```
1. pre-wave.sh (Wave 1)
2. pre-task.sh (Task 1a)
3. [Task 1a executes]
4. post-task.sh (Task 1a)
5. pre-task.sh (Task 1b)
6. [Task 1b executes]
7. post-task.sh (Task 1b)
8. post-wave.sh (Wave 1)
9. pre-wave.sh (Wave 2)
   ... (repeat for remaining waves)
```

**On failure:**
```
1. pre-task.sh
2. [Task fails]
3. on-failure.sh (Attempt 1)
4. [Retry with model escalation]
5. [Task fails again]
6. on-failure.sh (Attempt 2)
7. [Final retry]
8. [Task fails]
9. on-failure.sh (Attempt 3, FINAL)
10. [Task marked as failed, human review required]
```

**On merge:**
```
1. [PR approved]
2. [PR merges]
3. on-merge.sh
```

---

## Disabling Hooks

To temporarily disable a hook without deleting it:

```bash
# Rename to .disabled
mv .karimo/hooks/pre-task.sh .karimo/hooks/pre-task.sh.disabled

# Or remove execute permission
chmod -x .karimo/hooks/pre-task.sh
```

KARIMO only executes files ending in `.sh` with executable permissions.

---

## Related Documentation

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) — How hooks fit into KARIMO
- [PHASES.md](../docs/PHASES.md) — When to add hooks (Phase 2+)
- [SAFEGUARDS.md](../docs/SAFEGUARDS.md) — Security best practices

---

## Support

- Hook not working? Check TROUBLESHOOTING.md
- Need hook examples? See this README's examples section
- Want to share a hook? Submit a PR to KARIMO repository

---

*Lifecycle hooks added in KARIMO v6.0*
