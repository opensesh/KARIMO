# KARIMO Configuration Reference

Complete reference for `.karimo/config.yaml` settings.

---

## Overview

KARIMO reads configuration from `.karimo/config.yaml`. All settings are optional — KARIMO works without any configuration.

---

## Full Example

```yaml
project:
  name: "my-project"

commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"

execution:
  max_parallel: 3

models:
  simple: "sonnet"
  complex: "opus"
  threshold: 5

boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"

sandbox:
  safe_env:
    - "NODE_ENV"
    - "DEBUG"
    - "LOG_LEVEL"
```

---

## Section: project

Basic project information.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | Directory name | Project display name |

### Example

```yaml
project:
  name: "my-awesome-project"
```

---

## Section: commands

Shell commands for validation. Used in pre-PR checks.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `build` | string | null | Build command |
| `lint` | string | null | Lint command |
| `test` | string | null | Test command |
| `typecheck` | string | null | Type check command |

### Example

```yaml
commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"
```

### Notes

- `build` is required for pre-PR checks
- Other commands run if configured
- Use `null` to skip a check

---

## Section: execution

Task execution settings.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_parallel` | integer | 3 | Maximum concurrent tasks |

### Example

```yaml
execution:
  max_parallel: 5
```

### Notes

- Higher values = faster execution, more resource usage
- Set to 1 for sequential execution

---

## Section: models

Model assignment for task execution. The PM agent assigns models based on task complexity.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `simple` | string | "sonnet" | Model for lower-complexity tasks |
| `complex` | string | "opus" | Model for higher-complexity tasks |
| `threshold` | integer | 5 | Complexity threshold for model switch |

### Example

```yaml
models:
  simple: "sonnet"
  complex: "opus"
  threshold: 5
```

### Model Assignment Rules

| Complexity | Model | Rationale |
|------------|-------|-----------|
| 1–4 | Sonnet | Efficient for straightforward tasks |
| 5–10 | Opus | Complex reasoning, multi-file coordination |

### Loop Awareness

Instead of pre-calculated iteration limits, KARIMO uses **loop awareness**:

- **Loop count:** Tracked per task in `status.json`
- **Stall detection:** After 3 loops without progress, PM agent pauses
- **Model upgrade:** Sonnet tasks can upgrade to Opus on stall
- **Hard cap:** Maximum 5 loops per task before human intervention

### Notes

- Model assignment is recorded in `status.json` and GitHub Issue
- The PM agent can upgrade a task's model mid-execution if it stalls
- Stalled tasks with complexity 4-5 are candidates for Sonnet → Opus upgrade

---

## Section: boundaries

File protection patterns.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `never_touch` | string[] | [] | Files agents cannot modify |
| `require_review` | string[] | [] | Files flagged for review |

### Example

```yaml
boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
    - "package-lock.json"
    - ".github/workflows/*"
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"
    - "*.config.js"
    - "security/*"
```

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` |
| `?` | Any single character |
| `*.ext` | All files with extension |
| `dir/*` | Direct children of dir |
| `dir/**` | All descendants of dir |

### Behavior

**never_touch:**
- Agent attempts to modify → task fails
- Hard block, no override

**require_review:**
- Agent can modify
- PR flagged for human review
- Caution warning in PR description

---

## Section: sandbox

Environment variable filtering for task agents.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `safe_env` | string[] | [] | Additional safe variables |

### Example

```yaml
sandbox:
  safe_env:
    - "NODE_ENV"
    - "DEBUG"
    - "LOG_LEVEL"
    - "CI"
```

### Default Safe Variables

These are always included:
- `PATH`, `HOME`, `TERM`, `SHELL`
- `USER`, `LANG`, `LC_ALL`, `TZ`
- `EDITOR`, `VISUAL`

### Default Excluded Variables

These are always excluded:
- `GITHUB_TOKEN`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- `*_SECRET*` pattern

---

## Environment-Specific Config

KARIMO does not support environment-specific configs. Use a single `.karimo/config.yaml` per project.

For environment differences, use environment variables or separate branches.

---

## Validation

KARIMO validates config on load. Invalid config causes clear error messages:

```
Error: Invalid config at boundaries.never_touch[0]
  Expected string, got number
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [CODE-INTEGRITY.md](CODE-INTEGRITY.md) | How boundaries are enforced |
| [SECURITY.md](SECURITY.md) | Environment sandboxing |
