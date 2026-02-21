# Dependencies: {PRD Title}

**PRD Slug:** `{prd-slug}`
**Created:** {creation-date}
**Last Updated:** {last-update}

---

## Original Dependencies (from dag.json)

_Dependencies established during PRD planning phase._

| Task | Depends On | Rationale |
|------|------------|-----------|
| {task-id} | {dependency-ids} | {why this dependency exists} |

---

## Runtime Dependencies Discovered

_Dependencies discovered by task agents during execution. The PM Agent evaluates each entry and updates the PM Action field._

### Format

```
### [{timestamp}] Task {task-id} → {dependency} {(NEW|CROSS-FEATURE)} {⚡ URGENT if applicable}
- **Found by:** Task Agent working on {task-id}
- **Description:** {What was discovered}
- **Impact:** {How this affects execution}
- **Urgent issue:** #{issue-number} (if urgent)
- **PM Action:** PENDING | RESOLVED | DEFERRED
```

---

## Discovered Dependencies

_Runtime dependencies are appended below by task agents during execution._

<!-- DEPENDENCY_ENTRIES_START -->

_No runtime dependencies discovered yet._

<!-- DEPENDENCY_ENTRIES_END -->

---

## Dependency Types

### NEW
A dependency on a task that doesn't exist yet. The PM Agent should evaluate whether to:
- Create a new task and update the DAG
- Defer to a future PRD
- Mark as out of scope

### CROSS-FEATURE
A dependency on work in a different PRD/feature branch. The PM Agent should evaluate whether to:
- Block until the other feature merges
- Create a stub/interface and proceed
- Coordinate with the other PRD's execution

### ⚡ URGENT
A blocking dependency that prevents task completion. The PM Agent is notified immediately via the `karimo-dependency-watch` workflow and should:
- Prioritize resolution
- Consider pausing affected tasks
- Evaluate impact on parallel execution

---

## PM Action Values

| Value | Meaning |
|-------|---------|
| `PENDING` | Awaiting PM Agent evaluation |
| `RESOLVED` | Dependency addressed (task created, scope clarified, etc.) |
| `DEFERRED` | Dependency acknowledged but deferred to future work |

---

## Example Entry

```markdown
### [2026-02-20T14:30:00Z] Task 2a → Authentication middleware (NEW) ⚡ URGENT
- **Found by:** Task Agent working on 2a (Profile API endpoints)
- **Description:** The profile API requires authentication middleware that doesn't exist. Task 1a was supposed to create it but the scope was limited to the login UI.
- **Impact:** Cannot complete 2a without auth middleware. All API tasks are blocked.
- **Urgent issue:** #142
- **PM Action:** PENDING
```

---

*This file is maintained by KARIMO task agents and the PM Agent.*
*Runtime dependencies trigger the `karimo-dependency-watch` workflow when PM Action is PENDING.*
