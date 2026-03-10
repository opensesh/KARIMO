# /karimo-modify — PRD Modification Command

Modify an approved PRD before execution. Add, remove, or change tasks, then regenerate the execution plan.

## Arguments

- `--prd {slug}` (required): The PRD slug to modify.

## Prerequisites

The PRD must have status `ready` (approved but not yet executing).

**Cannot modify if:**
- Status is `draft` → Use `/karimo-plan --resume {slug}` instead
- Status is `active` or `complete` → PRD is already executing or done

## Behavior

### 1. PRD Validation

Validate the PRD can be modified:

```bash
# Check status (using grep/sed, no jq dependency)
status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' ".karimo/prds/${slug}/status.json" | \
  sed 's/.*"\([^"]*\)"$/\1/')

if [ "$status" != "ready" ]; then
  # Cannot modify
fi
```

**If status is not `ready`:**

```
Cannot modify PRD: {slug}

Current status: {status}

Modification is only allowed for PRDs with status "ready" (approved but not executing).

Options:
  - draft: Run /karimo-plan --resume {slug}
  - active: Wait for execution to complete or cancel first
  - complete: Create a new PRD instead
```

### 2. Load Current State

Load and display the current PRD state:

```
╭──────────────────────────────────────────────────────────────╮
│  Modify PRD: {slug}                                          │
╰──────────────────────────────────────────────────────────────╯

Current PRD has {count} tasks in {wave_count} waves:

Wave 1: [{ids}]
  [{id}] {title}    complexity: {n}  priority: {priority}

Wave 2: [{ids}]
  [{id}] {title}    complexity: {n}  priority: {priority}
    depends_on: {deps}

Wave 3: [{ids}]
  [{id}] {title}    complexity: {n}  priority: {priority}
    depends_on: {deps}

Longest chain: {chain}
Total complexity: {sum} points

What would you like to change?
```

### 3. Accept Modifications

Accept natural language modifications:

**Adding tasks:**
```
User: "Add a new task for writing tests after 2a"

Understanding:
  - New task type: testing
  - Depends on: [2a]
  - Position: After wave containing 2a
```

**Changing dependencies:**
```
User: "Change 1c to also depend on 1b"

Understanding:
  - Task: 1c
  - Add dependency: 1b
  - May move 1c to a later wave
```

**Removing tasks:**
```
User: "Remove task 1d"

Understanding:
  - Remove: 1d
  - Check for tasks depending on 1d
  - Warn if dependencies exist
```

**Splitting tasks:**
```
User: "Split task 2a into two smaller tasks"

Understanding:
  - Task to split: 2a
  - Need user input on split boundaries
  - Maintain dependency relationships
```

### 4. Apply Changes to tasks.yaml

After understanding the modification, update `tasks.yaml`:

**For new tasks:**
1. Generate task ID (next available in sequence)
2. Create task definition with required fields
3. Set `depends_on` based on user specification
4. Estimate complexity (or ask user)

**For dependency changes:**
1. Update the `depends_on` array
2. Validate no cycles introduced

**For removals:**
1. Check if other tasks depend on this task
2. If yes, warn and confirm:
   ```
   Task 2b depends on 1d. Removing 1d will leave 2b with an unmet dependency.

   Options:
     1. Remove dependency from 2b
     2. Remove both 1d and 2b
     3. Cancel removal
   ```
3. Remove task and update any references

### 5. Regenerate Execution Plan

After modifying `tasks.yaml`, regenerate `execution_plan.yaml`:

```
Regenerating execution plan...

Wave generation:
  Wave 1: [1a]
  Wave 2: [1b, 1c]
  Wave 3: [2a, 2b]
  Wave 4: [3a]  ← NEW (test task added)

Validation:
  ✓ All dependencies in earlier waves
  ✓ All tasks assigned to exactly one wave
  ✓ No cycles detected

Execution plan updated.
```

### 6. Show Diff

Display what changed:

```
╭──────────────────────────────────────────────────────────────╮
│  Changes Applied                                             │
╰──────────────────────────────────────────────────────────────╯

Tasks:
  + Added [3a] Write integration tests
      complexity: 3  priority: should
      depends_on: [2a]
      files_affected: [tests/integration/]

Execution Plan:
  Before: 3 waves, max 2 parallel
  After:  4 waves, max 2 parallel

  Wave 1: [1a]        (unchanged)
  Wave 2: [1b, 1c]    (unchanged)
  Wave 3: [2a, 2b]    (unchanged)
  Wave 4: [3a]        (NEW)

Longest chain: 1a → 1b → 2a → 3a (4 tasks, was 3)

Summary:
  Tasks: 6 → 7 (+1)
  Complexity: 24 → 27 (+3)
  Waves: 3 → 4 (+1)
```

### 7. Confirm Changes

```
Options:
  1. Save changes — Update PRD files
  2. Continue editing — Make more modifications
  3. Discard — Revert to original state

Your choice:
```

**Option 1 — Save changes:**
1. Write updated `tasks.yaml`
2. Write updated `execution_plan.yaml`
3. Update `status.json` with modification timestamp:
   ```json
   {
     "status": "ready",
     "modified_at": "ISO timestamp",
     "modification_count": 1
   }
   ```
4. Confirm:
   ```
   PRD modified: {slug}

   Changes saved. Ready for execution:
     /karimo-execute --prd {slug}
   ```

**Option 2 — Continue editing:**
- Loop back to "What would you like to change?"

**Option 3 — Discard:**
- Revert any in-memory changes
- Exit without modifying files:
  ```
  Changes discarded. PRD unchanged.
  ```

## Modification Types

| Type | Description | Affects |
|------|-------------|---------|
| Add task | New task with dependencies | tasks.yaml, execution_plan.yaml |
| Remove task | Delete task, handle orphan deps | tasks.yaml, execution_plan.yaml |
| Change dependency | Add/remove depends_on entries | tasks.yaml, execution_plan.yaml |
| Split task | Break into multiple tasks | tasks.yaml, execution_plan.yaml |
| Merge tasks | Combine multiple into one | tasks.yaml, execution_plan.yaml |
| Update details | Change title, description, complexity | tasks.yaml only |

## Validation Rules

After any modification:

1. **No cycles:** Dependencies must form a DAG
2. **All references valid:** Every `depends_on` ID must exist
3. **Unique IDs:** No duplicate task IDs
4. **Required fields:** All tasks have required fields

If validation fails:

```
❌ Validation failed:

  - Cycle detected: 2a → 2b → 2a
  - Missing dependency: 3a depends on "2c" which doesn't exist

Cannot save changes. Fix these issues first.
```

## State Machine

```
draft → ready → active → complete
          ↑
          └── (modify via /karimo-modify, stays "ready")
```

Modification keeps the PRD in `ready` state. The only change is the `modified_at` timestamp.

## Briefs Handling

If briefs exist in `.karimo/prds/{slug}/briefs/`:

- **Added tasks:** No brief yet (will be generated at execution)
- **Removed tasks:** Delete the corresponding brief
- **Modified tasks:** Delete the brief (will be regenerated)

```
Brief cleanup:
  - Deleted: briefs/1d_{slug}.md (task removed)
  - Marked stale: briefs/2a_{slug}.md (task modified)

Briefs will be regenerated at execution time.
```

## Output

### On Success

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Modified: {slug}                                        │
╰──────────────────────────────────────────────────────────────╯

Changes:
  + [3a] Write integration tests (added)
  ~ [2a] Implement profile form (modified complexity: 5 → 6)

Execution Plan:
  Waves: 4 (was 3)
  Tasks: 7 (was 6)
  Ready for execution

Run: /karimo-execute --prd {slug}
```

### On Validation Error

```
❌ Cannot apply changes:

  Cycle detected: 2a depends on 3a, 3a depends on 2a

Remove one of these dependencies to continue.
```

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | List available PRDs |
| Status not ready | Explain status requirements |
| Cycle detected | Show cycle, suggest fix |
| Invalid dependency | Show missing task ID |
| Empty PRD (all tasks removed) | Warn, suggest deletion |
