# Provider Manifest Schema

**Version:** 9.6.0
**Purpose:** Document the provider manifest format for pluggable review providers

---

## Overview

KARIMO v9.6 introduces a pluggable provider architecture. Each review provider defines a manifest file that describes its capabilities, configuration, and integration hooks.

**Provider Location:**
- Built-in: `.karimo/providers/{provider}/manifest.yaml`
- Custom: `.karimo/providers/{provider}/manifest.yaml` (project-specific)

---

## Manifest Structure

```yaml
# Provider Manifest v9.6
name: my-provider
version: 1.0.0
description: My custom code review provider
pricing_model: per-pr              # per-pr | flat-rate | free

# Capabilities
capabilities:
  auto_review: true                # Automatically reviews PRs
  inline_comments: true            # Posts inline code comments
  score_output: true               # Provides numeric score (0-5, 0-100, etc.)
  revision_tracking: true          # Tracks revision attempts
  batch_review: false              # Can review multiple PRs at once

# Integration hooks
hooks:
  on_pr_create: "scripts/trigger_review.sh"
  on_review_complete: "scripts/parse_findings.sh"
  on_revision_push: "scripts/re_trigger.sh"
  on_batch_review: "scripts/batch_review.sh"

# Configuration schema
config_schema:
  api_key:
    type: string
    required: true
    env: MY_PROVIDER_API_KEY
    description: API key for authentication
  threshold:
    type: number
    default: 80
    description: Pass threshold (0-100)
  custom_rules:
    type: array
    default: []
    description: Custom linting rules

# Score mapping (optional)
score_mapping:
  type: numeric                    # numeric | letter | pass-fail
  min: 0
  max: 100
  pass_threshold: 80
  greptile_equivalent:             # For UI normalization
    - range: [0, 20]
      greptile: 1
    - range: [21, 40]
      greptile: 2
    - range: [41, 60]
      greptile: 3
    - range: [61, 80]
      greptile: 4
    - range: [81, 100]
      greptile: 5
```

---

## Field Reference

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Provider identifier (lowercase, hyphenated) |
| `version` | string | Yes | Semantic version |
| `description` | string | Yes | Human-readable description |
| `pricing_model` | string | Yes | Pricing model: `per-pr`, `flat-rate`, `free` |

### Capabilities Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `auto_review` | boolean | true | Provider automatically reviews PRs |
| `inline_comments` | boolean | false | Provider posts inline code comments |
| `score_output` | boolean | false | Provider outputs a numeric score |
| `revision_tracking` | boolean | false | Provider tracks revision history |
| `batch_review` | boolean | false | Provider can review multiple PRs at once |

### Hooks Object

| Field | Type | Description |
|-------|------|-------------|
| `on_pr_create` | string | Script to run when PR is created |
| `on_review_complete` | string | Script to run when review completes |
| `on_revision_push` | string | Script to run when revision is pushed |
| `on_batch_review` | string | Script to run for batch review |

**Hook Scripts:**
- Paths are relative to the provider directory
- Scripts receive environment variables with context
- Exit code 0 = success, non-zero = failure

### Config Schema Object

Each config field has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Data type: `string`, `number`, `boolean`, `array` |
| `required` | boolean | No | Whether field is required |
| `default` | any | No | Default value |
| `env` | string | No | Environment variable to read from |
| `description` | string | No | Human-readable description |

### Score Mapping Object

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Score type: `numeric`, `letter`, `pass-fail` |
| `min` | number | Minimum score value |
| `max` | number | Maximum score value |
| `pass_threshold` | number | Score threshold to pass |
| `greptile_equivalent` | array | Mapping to Greptile 1-5 scale |

---

## Built-in Providers

### Greptile

Location: `.karimo/providers/greptile/manifest.yaml`

```yaml
name: greptile
version: 1.0.0
description: Greptile AI-powered code review
pricing_model: flat-rate

capabilities:
  auto_review: true
  inline_comments: true
  score_output: true
  revision_tracking: false
  batch_review: false

hooks:
  on_pr_create: null               # Auto-triggers via GitHub webhook
  on_review_complete: scripts/parse_greptile.sh
  on_revision_push: null           # Auto-re-triggers

config_schema:
  threshold:
    type: number
    default: 5
    description: Greptile pass score (1-5)

score_mapping:
  type: numeric
  min: 1
  max: 5
  pass_threshold: 5
```

### Claude Code Review

Location: `.karimo/providers/code-review/manifest.yaml`

```yaml
name: code-review
version: 1.0.0
description: Claude Code Review integration
pricing_model: per-pr

capabilities:
  auto_review: true
  inline_comments: true
  score_output: false
  revision_tracking: true
  batch_review: false

hooks:
  on_pr_create: null               # Auto-triggers via GitHub check
  on_review_complete: scripts/parse_code_review.sh
  on_revision_push: null           # Auto-re-triggers

config_schema:
  block_on_red:
    type: boolean
    default: true
    description: Block merge on red (🔴) findings
  ignore_nits:
    type: boolean
    default: false
    description: Ignore yellow (🟡) nit findings
```

---

## Creating a Custom Provider

### Step 1: Create Provider Directory

```bash
mkdir -p .karimo/providers/my-provider/scripts
```

### Step 2: Create Manifest

```yaml
# .karimo/providers/my-provider/manifest.yaml
name: my-provider
version: 1.0.0
description: My custom review provider
pricing_model: free

capabilities:
  auto_review: true
  inline_comments: false
  score_output: true

hooks:
  on_pr_create: scripts/trigger.sh
  on_review_complete: scripts/parse.sh

config_schema:
  api_endpoint:
    type: string
    required: true
    env: MY_PROVIDER_ENDPOINT
```

### Step 3: Create Hook Scripts

```bash
# .karimo/providers/my-provider/scripts/trigger.sh
#!/bin/bash
# Environment variables available:
#   PR_NUMBER, PR_URL, REPO_OWNER, REPO_NAME, BRANCH_NAME

curl -X POST "$MY_PROVIDER_ENDPOINT/review" \
  -H "Authorization: Bearer $MY_PROVIDER_API_KEY" \
  -d "{\"pr_url\": \"$PR_URL\"}"
```

```bash
# .karimo/providers/my-provider/scripts/parse.sh
#!/bin/bash
# Environment variables available:
#   PR_NUMBER, REVIEW_DATA (JSON output from provider)

score=$(echo "$REVIEW_DATA" | jq -r '.score')
echo "score=$score"
echo "passed=$([[ $score -ge 80 ]] && echo true || echo false)"
```

### Step 4: Register Provider

```yaml
# .karimo/config.yaml
review:
  providers:
    registered:
      - greptile
      - code-review
      - my-provider          # Add custom provider

    active: my-provider       # Set as active
```

---

## Provider Registration

### In `.karimo/config.yaml`

```yaml
review:
  providers:
    registered:
      - greptile           # Built-in
      - code-review        # Built-in
      - my-provider        # Custom

    active: greptile       # Currently active provider

    # Per-provider configuration (optional)
    config:
      greptile:
        threshold: 5
      code-review:
        block_on_red: true
      my-provider:
        api_endpoint: https://api.example.com
```

### Via `/karimo:configure`

```bash
/karimo:configure --review

# Prompts for:
# 1. Select active provider
# 2. Configure provider settings
# 3. Register new providers
```

---

## Environment Variables for Hooks

| Variable | Description |
|----------|-------------|
| `PR_NUMBER` | Pull request number |
| `PR_URL` | Full PR URL |
| `REPO_OWNER` | Repository owner |
| `REPO_NAME` | Repository name |
| `BRANCH_NAME` | Branch being reviewed |
| `TASK_ID` | KARIMO task ID |
| `PRD_SLUG` | PRD slug |
| `WAVE` | Wave number |
| `PROVIDER_CONFIG` | JSON of provider config |
| `REVIEW_DATA` | JSON output from review (on_review_complete) |

---

## PM-Reviewer Integration

The PM-Reviewer agent loads providers dynamically:

```bash
load_review_provider() {
  local provider_name="$1"
  local manifest_path=".karimo/providers/${provider_name}/manifest.yaml"

  if [ ! -f "$manifest_path" ]; then
    echo "Provider not found: $provider_name"
    return 1
  fi

  # Load capabilities
  provider_auto_review=$(yq '.capabilities.auto_review' "$manifest_path")
  provider_score_output=$(yq '.capabilities.score_output' "$manifest_path")
  provider_inline_comments=$(yq '.capabilities.inline_comments' "$manifest_path")

  # Load hooks
  on_pr_create=$(yq '.hooks.on_pr_create' "$manifest_path")
  on_review_complete=$(yq '.hooks.on_review_complete' "$manifest_path")
}

trigger_provider_review() {
  local pr_number="$1"

  if [ -n "$on_pr_create" ] && [ "$on_pr_create" != "null" ]; then
    export PR_NUMBER="$pr_number"
    export PR_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${pr_number}"
    bash ".karimo/providers/${active_provider}/${on_pr_create}"
  fi
}
```

---

*Generated by [KARIMO v9.6](https://github.com/opensesh/KARIMO)*
