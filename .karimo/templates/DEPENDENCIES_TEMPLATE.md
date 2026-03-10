# Dependencies: {PRD Title}

**PRD Slug:** `{prd-slug}`
**Created:** {creation-date}
**Last Updated:** {last-update}

---

## Original Dependencies (from execution_plan.yaml)

_Dependencies established during PRD planning phase._

| Task | Depends On | Rationale |
|------|------------|-----------|
| {task-id} | {dependency-ids} | {why this dependency exists} |

---

## Runtime Dependencies Discovered

_Dependencies discovered by task agents during execution. The PM Agent evaluates each entry and updates the PM Action field._

### Format

```
### [{timestamp}] Task {task-id} → {dependency} {⚡ URGENT if applicable}
- **Found by:** Task Agent working on {task-id}
- **Classification:** WITHIN-PRD | SCOPE-GAP | CROSS-FEATURE
- **Description:** {What was discovered}
- **Impact:** {How this affects execution}
- **Urgent issue:** #{issue-number} (if urgent)
- **PM Action:** PENDING | RESOLVED | DEFERRED
- **Resolution:** valid | false_positive | deferred | resequenced (when resolved)
- **Resolution Notes:** {How it was addressed} (when resolved)
```

---

## Discovered Dependencies

_Runtime dependencies are appended below by task agents during execution._

<!-- DEPENDENCY_ENTRIES_START -->

_No runtime dependencies discovered yet._

<!-- DEPENDENCY_ENTRIES_END -->

---

## Dependency Classification

The PM Agent classifies each discovered dependency into one of three categories:

### WITHIN-PRD
A dependency on another task within the same PRD that was missed during planning.

**PM Agent Response:**
- Resequence tasks or add a new task
- Update the DAG
- Continue execution with adjusted ordering

### SCOPE-GAP
A dependency on functionality that should have been included but was missed entirely.

**PM Agent Response:**
- Create a new task to fill the gap
- Insert into the appropriate position in the DAG
- Flag for human review if complexity > 5

### CROSS-FEATURE
A dependency on work in a different PRD/feature branch.

**PM Agent Response:**
- **Cannot resolve autonomously** — KARIMO scopes to one PRD at a time
- Mark with appropriate resolution status
- Escalate to human architect with options:
  - Block until other feature merges
  - Create stub/interface and proceed
  - Defer this PRD

### ⚡ URGENT
A modifier that indicates the dependency is blocking task completion. Can be combined with any classification.

**PM Agent Response:**
- PM Agent escalates immediately via urgent issue creation
- Prioritize resolution
- Consider pausing affected tasks

---

## PM Action Values

| Value | Meaning |
|-------|---------|
| `PENDING` | Awaiting PM Agent evaluation |
| `RESOLVED` | Dependency addressed (task created, scope clarified, etc.) |
| `DEFERRED` | Dependency acknowledged but deferred to future work |

---

## Resolution Tracking

After the PM Agent evaluates a dependency, it assigns a resolution status:

| Resolution | Meaning | Applies To |
|------------|---------|------------|
| `valid` | Dependency was real and has been addressed | WITHIN-PRD, SCOPE-GAP |
| `false_positive` | Dependency wasn't actually needed (e.g., task could proceed without it) | All |
| `deferred` | Pushed to future work (post-MVP, next PRD) | SCOPE-GAP, CROSS-FEATURE |
| `resequenced` | Within-PRD task ordering was adjusted | WITHIN-PRD |

### Resolution Format

When resolving a dependency, update the entry:

```markdown
- **PM Action:** RESOLVED
- **Resolution:** valid
- **Resolution Notes:** Created task 2c for auth middleware, inserted before 2a in DAG
```

---

## Example Entries

### SCOPE-GAP Example (Urgent)

```markdown
### [2026-02-20T14:30:00Z] Task 2a → Authentication middleware ⚡ URGENT
- **Found by:** Task Agent working on 2a (Profile API endpoints)
- **Classification:** SCOPE-GAP
- **Description:** The profile API requires authentication middleware that doesn't exist. Task 1a was supposed to create it but the scope was limited to the login UI.
- **Impact:** Cannot complete 2a without auth middleware. All API tasks are blocked.
- **Urgent issue:** #142
- **PM Action:** RESOLVED
- **Resolution:** valid
- **Resolution Notes:** Created task 2c for auth middleware, inserted before 2a in DAG
```

### WITHIN-PRD Example

```markdown
### [2026-02-20T15:45:00Z] Task 3a → Task 2b type definitions
- **Found by:** Task Agent working on 3a (Integration tests)
- **Classification:** WITHIN-PRD
- **Description:** Task 3a needs the TypeScript types created in 2b, but DAG shows them as parallel.
- **Impact:** 3a cannot compile tests without 2b types.
- **PM Action:** RESOLVED
- **Resolution:** resequenced
- **Resolution Notes:** Updated DAG: 3a now depends on 2b completion
```

### CROSS-FEATURE Example

```markdown
### [2026-02-20T16:00:00Z] Task 4a → User permissions system
- **Found by:** Task Agent working on 4a (Admin dashboard)
- **Classification:** CROSS-FEATURE
- **Description:** Admin dashboard requires the user permissions system being built in the "rbac" PRD.
- **Impact:** Cannot implement role-based views without permission checks.
- **PM Action:** PENDING
- **Resolution:** (awaiting human decision)
- **Resolution Notes:** Options: (1) Block until rbac merges, (2) Stub permissions, (3) Defer admin dashboard
```

---

## Cross-PRD Findings Propagation

When a task discovers something that affects another PRD, the finding should be propagated to the target PRD.

### Entry Format

```markdown
### [2026-02-20T16:30:00Z] Task 2a → Finding for analytics-dashboard
- **Source PRD:** user-profiles
- **Target PRD:** analytics-dashboard
- **Found by:** Task Agent working on 2a
- **Finding Type:** DEPENDENCY | PATTERN | ANTI-PATTERN | INSIGHT
- **Description:** {What was discovered}
- **Recommended Action:** {What the target PRD should do}
- **Propagation Status:** PENDING | PROPAGATED | IGNORED
- **Propagated At:** {timestamp when propagated}
```

### Finding Types

| Type | Description | Propagate To |
|------|-------------|--------------|
| `DEPENDENCY` | Target PRD needs something from this PRD | Target's `dependencies.md` |
| `PATTERN` | Discovered pattern that target PRD should follow | Target's `findings.md` |
| `ANTI-PATTERN` | Discovered issue that target PRD should avoid | Target's `findings.md` |
| `INSIGHT` | General insight relevant to target PRD | Target's `findings.md` |

### PM Agent Propagation Protocol

When a cross-PRD finding is recorded:

1. **Check if target PRD exists:**
   ```bash
   TARGET_PRD="{target-slug}"
   if [ -d ".karimo/prds/$TARGET_PRD" ]; then
     # PRD exists, can propagate
   else
     # PRD doesn't exist, record but don't propagate
   fi
   ```

2. **Propagate to target's dependencies.md or findings.md:**
   ```markdown
   <!-- Propagated from {source-prd} task {task-id} at {timestamp} -->
   ### [{timestamp}] Cross-PRD Finding from {source-prd}/{task-id}
   - **Source PRD:** {source-slug}
   - **Source Task:** {task-id}
   - **Finding Type:** {type}
   - **Description:** {description}
   - **Recommended Action:** {action}
   ```

3. **Update source entry:**
   ```markdown
   - **Propagation Status:** PROPAGATED
   - **Propagated At:** {ISO timestamp}
   ```

### Example Cross-PRD Finding

```markdown
### [2026-02-20T17:00:00Z] Task 3b → Pattern for analytics-dashboard
- **Source PRD:** user-profiles
- **Target PRD:** analytics-dashboard
- **Found by:** Task Agent working on 3b (Profile analytics)
- **Finding Type:** PATTERN
- **Description:** User activity tracking uses a specific event format: { userId, action, timestamp, metadata }. Analytics dashboard should consume this format.
- **Recommended Action:** Use UserActivityEvent type from @/types/analytics
- **Propagation Status:** PROPAGATED
- **Propagated At:** 2026-02-20T17:05:00Z
```

---

*This file is maintained by KARIMO task agents and the PM Agent.*
*The PM Agent evaluates runtime dependencies when PM Action is PENDING.*
