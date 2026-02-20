# Task Schema Reference

**Version:** 2.0
**Purpose:** Document the `tasks.yaml` format used by KARIMO v2
**Location:** `.karimo/prds/{slug}/tasks.yaml`

---

## Overview

Tasks are stored in a separate `tasks.yaml` file rather than embedded in the PRD markdown. This enables:
- Clean parsing by the orchestrator
- Validation via schema
- Independent updates without modifying narrative

---

## File Format

```yaml
# ============================================================
# KARIMO TASK DEFINITIONS
# Parsed by the orchestrator for execution planning.
# Generated from PRD interview by the reviewer agent.
# ============================================================

metadata:
  prd_slug: "feature-slug"
  created_at: "2026-02-19T10:00:00Z"
  total_complexity: 24
  task_count: 6

tasks:
  - id: "1a"
    title: "Create user profile component"
    description: |
      Build the UserProfile component that displays user information
      including avatar, name, email, and role. Should follow existing
      component patterns in src/components/user/.

      Fulfills requirement R1.
    depends_on: []
    complexity: 4
    priority: "must"
    success_criteria:
      - "Component renders user data correctly"
      - "Handles loading and error states"
      - "Follows accessibility guidelines (WCAG AA)"
      - "Has unit tests with >80% coverage"
    files_affected:
      - "src/components/user/UserProfile.tsx"
      - "src/components/user/UserProfile.test.tsx"
      - "src/types/user.ts"
    agent_context: |
      Follow the pattern in src/components/user/UserCard.tsx.
      Use the existing Avatar component from src/components/ui.
      Error states should use the ErrorBoundary pattern.
    images:
      - "./assets/user-profile-mockup.png"
```

---

## Field Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique task identifier within the PRD (e.g., "1a", "1b", "2a") |
| `title` | string | Short, descriptive title (becomes GitHub Issue title) |
| `description` | string | 2-3 sentence description of what the agent should build |
| `depends_on` | string[] | Task IDs that must complete before this task starts |
| `complexity` | number | 1-10 scale, drives cost_ceiling and estimated_iterations |
| `priority` | string | One of: "must" \| "should" \| "could" |
| `success_criteria` | string[] | 3-5 concrete, testable criteria for task completion |
| `files_affected` | string[] | File paths this task will likely modify |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent_context` | string | Free-text guidance for the agent (patterns, gotchas, edge cases) |
| `images` | string[] | Relative paths to reference images in `./assets/` |
| `assigned_to` | string | Task owner (defaults to PRD owner) |

### Computed Fields (Generated)

These fields are calculated by the reviewer agent using config values:

| Field | Formula | Description |
|-------|---------|-------------|
| `cost_ceiling` | `complexity × cost_multiplier` | Maximum cost for this task |
| `estimated_iterations` | `base_iterations + (complexity × iteration_multiplier)` | Expected iteration count |
| `revision_budget` | `cost_ceiling × (revision_budget_percent / 100)` | Budget for revision loops |

---

## Task ID Conventions

Task IDs follow a hierarchical pattern:

```
{phase_number}{sequence_letter}
```

Examples:
- `1a`, `1b`, `1c` — First phase tasks
- `2a`, `2b` — Second phase tasks (depend on phase 1)
- `1a-1`, `1a-2` — Subtasks of 1a (if split)

---

## Priority Levels

| Priority | Meaning | Execution Behavior |
|----------|---------|-------------------|
| `must` | Blocks launch; required for feature to work | Executed first, retried on failure |
| `should` | Important but not blocking; improves quality | Executed if budget allows |
| `could` | Nice to have; cut first if over budget | Skipped if approaching limits |

---

## Complexity Scale

| Complexity | Description | Typical Files | Expected Duration |
|------------|-------------|---------------|-------------------|
| 1-2 | Trivial change | 1-2 files | Single iteration |
| 3-4 | Simple feature | 2-4 files | Few iterations |
| 5-6 | Moderate feature | 4-6 files | Multiple iterations |
| 7-8 | Complex feature | 6-10 files | Many iterations, may need split |
| 9-10 | Very complex | 10+ files | Should almost always be split |

---

## Dependency Rules

1. **No circular dependencies** — Task A depends on B, B depends on A is invalid
2. **All references must exist** — `depends_on: ["1a"]` requires task `1a` to exist
3. **Implicit ordering** — Tasks with same dependencies can run in parallel
4. **Explicit ordering** — Use `depends_on` to force sequential execution

---

## Success Criteria Guidelines

Good criteria are:
- **Specific:** "Component renders user avatar" not "works correctly"
- **Testable:** Can be verified by running tests or manual inspection
- **Complete:** Cover happy path, edge cases, and error states
- **Bounded:** Don't include out-of-scope items

Examples:

```yaml
# Good criteria
success_criteria:
  - "Form validates email format before submission"
  - "Error message displays for invalid inputs"
  - "Submit button is disabled while submitting"
  - "Success toast appears after form submission"

# Bad criteria
success_criteria:
  - "Form works correctly"  # Too vague
  - "Good UX"  # Not testable
  - "All edge cases handled"  # Not specific
```

---

## Files Affected Guidelines

Include files that will be:
- **Created:** New files for this feature
- **Modified:** Existing files that need changes
- **Tested:** Test files that will be added/updated

The investigator agent helps populate this by scanning the codebase.

```yaml
files_affected:
  - "src/components/Feature/FeatureName.tsx"  # Create
  - "src/components/Feature/FeatureName.test.tsx"  # Create
  - "src/types/index.ts"  # Modify
  - "src/hooks/useFeature.ts"  # Create
```

---

## Agent Context Guidelines

Provide actionable guidance:
- **Patterns to follow:** "Use the pattern in `src/components/Similar.tsx`"
- **Gotchas to avoid:** "Don't use the deprecated `oldFunction()` API"
- **Edge case handling:** "Return empty array for undefined input"
- **Style requirements:** "Use Tailwind classes, not inline styles"

```yaml
agent_context: |
  Follow the form pattern in src/components/forms/LoginForm.tsx.
  Use react-hook-form for form state management.
  Validation should use Zod schemas from src/schemas/.
  Error messages follow the pattern in src/utils/errors.ts.

  Known gotcha: The submit handler must await the async validation.
```

---

## Validation Rules

The reviewer agent validates:

1. **Required fields present** for all tasks
2. **Complexity in range** (1-10)
3. **Priority valid** ("must" | "should" | "could")
4. **Dependencies exist** (all `depends_on` references are valid task IDs)
5. **No circular dependencies** in the dependency graph
6. **Success criteria non-empty** (at least 1 criterion per task)
7. **YAML syntax valid** (parses without errors)

---

## Example: Complete Task

```yaml
- id: "1a"
  title: "Create UserProfile component with avatar display"
  description: |
    Build the UserProfile component that displays user information
    including avatar, name, email, and role badge. The component
    should handle loading states and gracefully degrade when
    avatar URL is missing.

    Fulfills requirements R1 (user display) and R2 (role visibility).
  depends_on: []
  complexity: 5
  priority: "must"
  success_criteria:
    - "Renders user name, email, and role badge"
    - "Displays avatar image with fallback to initials"
    - "Shows skeleton loader during data fetch"
    - "Displays appropriate error state on fetch failure"
    - "Passes accessibility audit (no violations)"
  files_affected:
    - "src/components/user/UserProfile.tsx"
    - "src/components/user/UserProfile.test.tsx"
    - "src/components/user/UserAvatar.tsx"
    - "src/types/user.ts"
  agent_context: |
    Follow component structure in src/components/user/UserCard.tsx.
    Use Avatar component from @/components/ui with fallback prop.
    Role badges use the Badge component with variant based on role.

    Skeleton loader pattern: use src/components/ui/Skeleton.
    Error state: use ErrorBoundary wrapper pattern.

    Design reference: ./assets/user-profile-mockup.png
  images:
    - "./assets/user-profile-mockup.png"
```

---

*Generated by [KARIMO v2](https://github.com/opensesh/KARIMO)*
