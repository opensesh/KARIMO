# /karimo-feedback — Compound Learning Command

Capture learnings from execution to improve future agent behavior.

## Purpose

Simple compound learning: you describe what went wrong or what worked well, and KARIMO processes it into rules that are appended to `.karimo/learnings.md`.

## Usage

```
/karimo-feedback                           # Interactive mode
/karimo-feedback --from-metrics {prd-slug} # Batch mode from execution metrics
/karimo-feedback --undo                    # Remove recent learnings
```

### Interactive Mode

```
/karimo-feedback

> "The agent kept using inline styles instead of Tailwind classes"
```

### Batch Mode from Metrics

```
/karimo-feedback --from-metrics user-profiles
```

Reads `metrics.json` from the specified PRD and presents suggested learnings for batch capture.

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

> "Adding to `.karimo/learnings.md`:
>
> ```
> - **Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
> ```
>
> Correct? [Y/n/edit]"

Allow user to:
- Confirm as-is
- Edit the rule
- Cancel

### 5. Append to .karimo/learnings.md

Add the rule under the appropriate section in `.karimo/learnings.md`:

```markdown
# KARIMO Learnings

_Rules learned from execution feedback via `/karimo-feedback` and `/karimo-learn`._

## Patterns to Follow

- Always use existing component patterns from `src/components/`

## Anti-Patterns to Avoid

- **Never use inline styles.** Always use Tailwind utility classes. Reference existing components for class patterns.

## Rules

- All error handling must use structured error types from `src/utils/errors.ts`.

## Gotchas

- The auth middleware has a race condition on first load. Always check auth state before rendering protected routes.
```

### 6. Update Boundaries (Optional)

If the feedback suggests a boundary change:

**Input:** "Don't let agents touch the middleware file"

**Action:** Add to `.karimo/config.yaml` boundaries section:
```yaml
boundaries:
  require_review:
    - middleware.ts  # Added from feedback
```

### 7. Confirm

> "Learning captured. This will be applied to future agent tasks.
>
> Updated:
> - `.karimo/learnings.md` (added anti-pattern rule)
> - `.karimo/config.yaml` boundaries (added middleware.ts to require_review)"

## Output Format

### .karimo/learnings.md Structure

```markdown
# KARIMO Learnings

_Rules learned from execution feedback via `/karimo-feedback` and `/karimo-learn`._

## Patterns to Follow

{positive patterns}

## Anti-Patterns to Avoid

{things to never do}

## Rules

{explicit rules}

## Gotchas

{project-specific quirks}

---
*Last updated: {date}*
```

---

## Batch Mode: --from-metrics

Batch mode reads execution metrics and presents suggested learnings automatically.

### Usage

```bash
/karimo-feedback --from-metrics {prd-slug}
```

### Behavior

1. **Read metrics.json:**
   ```bash
   # Read from PRD folder
   METRICS_FILE=".karimo/prds/${prd_slug}/metrics.json"
   ```

2. **Extract learning candidates:**
   - High-loop tasks (loops > 3)
   - Escalated tasks (Sonnet → Opus)
   - Hard gate tasks (failed 3 Greptile attempts)
   - Runtime dependency tasks

3. **Present suggested learnings:**
   ```
   📊 Learnings from: user-profiles

   Found 4 learning candidates in metrics.json:

   1. [2a] High loops (5)
      → "Profile form validation patterns may be more complex than estimated"
      Category: gotcha

   2. [2a] Runtime dependency
      → "Always check authentication requirements for API tasks during PRD planning"
      Category: rule

   3. [3b] Model escalation (Sonnet → Opus)
      → "Tasks involving complex state management should start at complexity 5+"
      Category: rule

   4. [4a] Hard gate (3 Greptile failures)
      → "Integration tests for external services need mocking patterns"
      Category: gotcha

   Select learnings to capture: [all/1,2,4/none]
   ```

4. **Capture selected learnings:**
   - Append to `.karimo/learnings.md` under appropriate sections
   - Update metrics.json to mark learnings as captured

### Output Example

```
✓ Captured 3 learnings from user-profiles execution

Added to .karimo/learnings.md:
  - [gotcha] Profile form validation patterns...
  - [rule] Always check authentication requirements...
  - [gotcha] Integration tests for external services...

Skipped: 1 (Model escalation — declined by user)
```

### Metrics Source

Learning candidates come from `metrics.json.learning_candidates.suggested_learnings`:

```json
{
  "learning_candidates": {
    "suggested_learnings": [
      {
        "task_id": "2a",
        "reason": "high_loops",
        "details": "5 loops before passing validation",
        "suggested_learning": "Profile form validation patterns..."
      }
    ]
  }
}
```

**Reference:** `.karimo/templates/METRICS_SCHEMA.md`

---

## Multiple Feedback Items

Users can provide multiple items:

```
/karimo-feedback

> "Several things:
> 1. Agents should always add JSDoc comments to exported functions
> 2. Don't use deprecated React lifecycle methods
> 3. The database connection pool has a 10-second timeout"
```

Process each item separately, confirm all at once:

> "Adding these learnings:
>
> 1. **Rule:** Add JSDoc comments to all exported functions
> 2. **Anti-pattern:** Never use deprecated React lifecycle methods (componentWillMount, etc.)
> 3. **Gotcha:** Database connection pool has a 10-second timeout — handle connection errors gracefully
>
> Correct? [Y/n]"

## Undo

If a rule was added incorrectly:

```
/karimo-feedback --undo
```

Shows recent learnings and allows removal:

> "Recent learnings:
>
> 1. [2024-02-19] Anti-pattern: Never use inline styles
> 2. [2024-02-18] Rule: Add JSDoc to exported functions
>
> Which would you like to remove?"
