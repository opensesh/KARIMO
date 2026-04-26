# Review Providers Guide

**Version:** 9.7.0
**Status:** Active

---

## Overview

KARIMO v9.6 introduces a pluggable review provider architecture. Instead of hardcoded Greptile and Code Review integration, providers are now defined via manifest files with capabilities, hooks, and configuration schemas.

**Benefits:**
- Easy addition of new review providers
- Provider-specific configuration per project
- Consistent integration interface
- Custom providers for specialized workflows

---

## Built-in Providers

### Greptile

**Pricing:** $30/month flat rate
**Location:** `.karimo/providers/greptile/`

| Capability | Supported |
|------------|-----------|
| Auto-review | ✓ |
| Inline comments | ✓ |
| Score output (1-5) | ✓ |
| Revision tracking | ✗ |

**Configuration:**
```yaml
# .karimo/config.yaml
review:
  providers:
    active: greptile
    config:
      greptile:
        threshold: 5          # Pass score (1-5)
```

### Claude Code Review

**Pricing:** ~$15-25 per PR
**Location:** `.karimo/providers/code-review/`

| Capability | Supported |
|------------|-----------|
| Auto-review | ✓ |
| Inline comments | ✓ |
| Score output | ✗ (pass/fail) |
| Revision tracking | ✓ |

**Configuration:**
```yaml
# .karimo/config.yaml
review:
  providers:
    active: code-review
    config:
      code-review:
        block_on_red: true    # Block on 🔴 findings
        ignore_nits: false    # Don't ignore 🟡 findings
```

---

## Selecting a Provider

### Via Configuration

```yaml
# .karimo/config.yaml
review:
  providers:
    active: greptile
```

### Via `/karimo:configure`

```bash
/karimo:configure --review

# Prompts:
# 1. Select active provider
# 2. Configure provider settings
```

### Per-PRD Override

```json
// .karimo/prds/{slug}/.execution_config.json
{
  "review": {
    "provider": "code-review"
  }
}
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
  threshold:
    type: number
    default: 80
```

### Step 3: Create Hook Scripts

**Trigger script (optional):**
```bash
#!/bin/bash
# .karimo/providers/my-provider/scripts/trigger.sh
#
# Environment: PR_NUMBER, PR_URL, REPO_OWNER, REPO_NAME

curl -X POST "$MY_PROVIDER_ENDPOINT/review" \
  -H "Authorization: Bearer $MY_PROVIDER_API_KEY" \
  -d "{\"pr_url\": \"$PR_URL\"}"
```

**Parse script (required if score_output: true):**
```bash
#!/bin/bash
# .karimo/providers/my-provider/scripts/parse.sh
#
# Output format (key=value on stdout):
#   score=N
#   passed=true|false

score=$(curl -s "$MY_PROVIDER_ENDPOINT/results/$PR_NUMBER" | jq '.score')
passed=$([[ $score -ge 80 ]] && echo true || echo false)

echo "score=$score"
echo "passed=$passed"
```

### Step 4: Register Provider

```yaml
# .karimo/config.yaml
review:
  providers:
    registered:
      - greptile
      - code-review
      - my-provider          # Add here

    active: my-provider

    config:
      my-provider:
        threshold: 80
```

---

## Provider Manifest Reference

See [PROVIDER_MANIFEST_SCHEMA.md](../templates/PROVIDER_MANIFEST_SCHEMA.md) for the complete schema.

### Required Fields

| Field | Description |
|-------|-------------|
| `name` | Provider identifier |
| `version` | Semantic version |
| `description` | Human-readable description |
| `pricing_model` | `per-pr`, `flat-rate`, or `free` |
| `capabilities` | What the provider supports |

### Capabilities

| Capability | Description |
|------------|-------------|
| `auto_review` | Automatically reviews PRs |
| `inline_comments` | Posts inline code comments |
| `score_output` | Provides numeric score |
| `revision_tracking` | Tracks revision history |
| `batch_review` | Can review multiple PRs |

### Hooks

| Hook | When Called |
|------|-------------|
| `on_pr_create` | When PR is created (optional) |
| `on_review_complete` | When review finishes |
| `on_revision_push` | When revision is pushed |

---

## Environment Variables

Available in hook scripts:

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
| `THRESHOLD` | Pass threshold |

---

## Provider Migration

### From v9.5 to v9.6

Existing configurations continue to work. The PM-Reviewer falls back to legacy behavior if no manifest is found.

**To migrate:**

1. Keep existing `review.provider` setting
2. Add `review.providers.registered` array
3. Move provider-specific config to `review.providers.config`

**Before (v9.5):**
```yaml
review:
  provider: greptile
  threshold: 5
```

**After (v9.6):**
```yaml
review:
  providers:
    registered:
      - greptile
    active: greptile
    config:
      greptile:
        threshold: 5
```

---

## Troubleshooting

### Provider not found

```
Error: Provider manifest not found: .karimo/providers/my-provider/manifest.yaml
```

**Solution:** Create the manifest file or add the provider to `registered` list.

### Hook script fails

```
Error: Hook failed with exit code 1
```

**Solution:** Check script permissions (`chmod +x`) and environment variables.

### Score not parsed

```
Error: Could not parse score from provider output
```

**Solution:** Ensure parse script outputs `score=N` and `passed=true|false`.

---

*Generated by [KARIMO v9.7](https://github.com/opensesh/KARIMO)*
