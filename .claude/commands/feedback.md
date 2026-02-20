# /karimo:feedback — Compound Learning Command

Capture learnings from execution to improve future agent behavior.

## Purpose

Simple compound learning: you describe what went wrong or what worked well, and KARIMO processes it into rules that are appended to CLAUDE.md under `## KARIMO Learnings`.

## Usage

```
/karimo:feedback

> "The agent kept using inline styles instead of Tailwind classes"
```

## Behavior

### 1. Collect Feedback

Prompt the user:

> "What feedback do you have from the recent execution? Describe what went wrong, what worked well, or patterns you want agents to follow."

Accept free-form input. Examples:
- "The agent used deprecated API methods"
- "Error handling was inconsistent — some used try/catch, others didn't"
- "Great job following the existing component patterns"
- "Tests were too brittle — they relied on implementation details"

### 2. Categorize Feedback

Classify the feedback as:

| Category | Example |
|----------|---------|
| `anti-pattern` | "Don't use inline styles" |
| `pattern` | "Always use existing component patterns" |
| `rule` | "Error handling must use structured error types" |
| `gotcha` | "The auth middleware has a race condition on first load" |
| `praise` | "Good job with test coverage" |

### 3. Generate Rule

Transform feedback into an actionable rule:

**Input:** "The agent kept using inline styles instead of Tailwind classes"

**Output:**
```markdown
- **Anti-pattern:** Never use inline styles. Always use Tailwind utility classes. Reference existing components for class patterns.
```

**Input:** "Error handling was inconsistent"

**Output:**
```markdown
- **Rule:** All error handling must use structured error types from `src/utils/errors.ts`. Never use bare try/catch without proper error classification.
```

### 4. Confirm with User

Present the generated rule:

> "I'll add this to CLAUDE.md:
>
> ```
> - **Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
> ```
>
> Does this capture your feedback correctly?"

Allow user to:
- Confirm as-is
- Edit the rule
- Cancel

### 5. Append to CLAUDE.md

Add the rule under the `## KARIMO Learnings` section:

```markdown
## KARIMO Learnings

Rules learned from execution feedback. These are applied to all agent tasks.

### Patterns to Follow

- Always use existing component patterns from `src/components/`

### Anti-Patterns to Avoid

- **Never use inline styles.** Always use Tailwind utility classes. Reference existing components for class patterns.

### Rules

- All error handling must use structured error types from `src/utils/errors.ts`.

### Gotchas

- The auth middleware has a race condition on first load. Always check auth state before rendering protected routes.
```

### 6. Update Config (Optional)

If the feedback suggests a config change:

**Input:** "Don't let agents touch the middleware file"

**Action:** Add to `.karimo/config.yaml`:
```yaml
boundaries:
  require_review:
    - "middleware.ts"  # Added from feedback
```

### 7. Confirm

> "Learning captured. This will be applied to future agent tasks.
>
> Updated:
> - CLAUDE.md (added anti-pattern rule)
> - .karimo/config.yaml (added middleware.ts to require_review)"

## Output Format

### CLAUDE.md Section

```markdown
## KARIMO Learnings

Rules learned from execution feedback. These are applied to all agent tasks.

### Patterns to Follow

{positive patterns}

### Anti-Patterns to Avoid

{things to never do}

### Rules

{explicit rules}

### Gotchas

{project-specific quirks}

---
*Last updated: {date}*
```

## Multiple Feedback Items

Users can provide multiple items:

```
/karimo:feedback

> "Several things:
> 1. Agents should always add JSDoc comments to exported functions
> 2. Don't use deprecated React lifecycle methods
> 3. The database connection pool has a 10-second timeout"
```

Process each item separately, confirm all at once:

> "I'll add these learnings:
>
> 1. **Rule:** Add JSDoc comments to all exported functions
> 2. **Anti-pattern:** Never use deprecated React lifecycle methods (componentWillMount, etc.)
> 3. **Gotcha:** Database connection pool has a 10-second timeout — handle connection errors gracefully
>
> Confirm?"

## Undo

If a rule was added incorrectly:

```
/karimo:feedback --undo
```

Shows recent learnings and allows removal:

> "Recent learnings:
>
> 1. [2024-02-19] Anti-pattern: Never use inline styles
> 2. [2024-02-18] Rule: Add JSDoc to exported functions
>
> Which would you like to remove?"
