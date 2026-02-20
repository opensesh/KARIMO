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

cost:
  cost_multiplier: 2.0
  base_iterations: 3
  iteration_multiplier: 1.5
  revision_budget_percent: 20
  phase_budget_cap: 500
  session_budget_cap: 1000

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

## Section: cost

Cost control settings for task execution.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cost_multiplier` | float | 2.0 | Base cost ceiling = complexity × multiplier |
| `base_iterations` | integer | 3 | Minimum iterations per task |
| `iteration_multiplier` | float | 1.5 | Additional iterations = complexity × multiplier |
| `revision_budget_percent` | integer | 20 | % of task budget for revisions |
| `phase_budget_cap` | float | null | Max cost per phase (soft cap) |
| `session_budget_cap` | float | null | Max cost per session (hard cap) |

### Example

```yaml
cost:
  cost_multiplier: 2.0
  base_iterations: 3
  iteration_multiplier: 1.5
  revision_budget_percent: 20
  phase_budget_cap: 500
  session_budget_cap: 1000
```

### Formulas

```
cost_ceiling = complexity × cost_multiplier
estimated_iterations = base_iterations + (complexity × iteration_multiplier)
revision_budget = cost_ceiling × (revision_budget_percent / 100)
```

### Notes

- `phase_budget_cap: null` = no limit
- `session_budget_cap: null` = no limit

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
