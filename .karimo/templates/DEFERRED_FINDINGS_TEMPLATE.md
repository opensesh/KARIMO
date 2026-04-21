# Deferred Findings Template

This template documents findings that were classified as non-actionable during automated code review but need verification at the merge gate.

## File Location

```
.karimo/prds/{NNN}_{slug}/deferred_findings.md
```

## Template Format

```markdown
# Deferred Findings: {prd_slug}

## Metadata
- **PRD:** {prd_slug} ({prd_number})
- **Created:** {ISO timestamp}
- **Last Updated:** {ISO timestamp}
- **Total Deferred:** {count}

## Summary

| Classification | Count | Status |
|----------------|-------|--------|
| future-work-overlap | {n} | pending |
| false-positive-factual | {n} | logged |

---

## Deferred Items

### Task {task_id} (Wave {wave})

**Review Provider:** {greptile|code-review}
**Original Score:** {score}/{threshold}
**Deferred At:** {ISO timestamp}

#### future-work-overlap

| Finding | Referenced File | Created By Task | Status |
|---------|-----------------|-----------------|--------|
| {finding_text} | {file_path} | {later_task_id} | pending |

#### false-positive-factual

| Finding | Contradiction Source | Reason | Status |
|---------|---------------------|--------|--------|
| {finding_text} | CLAUDE.md / config | {reason} | logged |

---

## Merge Gate Verification

At `/karimo:merge`, the following checks are performed:

### future-work-overlap Items

For each deferred `future-work-overlap` finding:

1. **File Existence Check:**
   - Verify the referenced file now exists
   - If missing: warn user, offer to proceed or abort

2. **Cross-Reference:**
   - Compare against Greptile's final review
   - If still flagged after later task completes: escalate to human

### false-positive-factual Items

These are logged for audit but not re-checked:
- Contradicts project configuration (documented)
- Matches established patterns in CLAUDE.md

---

## Entry Format

Each deferred finding is stored in pipe-separated format:

```
{finding_text}|{classification}:{detail}
```

**Examples:**

```
P2: Missing null check in ProfileService|future-work-overlap:File src/services/ProfileService.ts created by task 2a
P2: Inconsistent naming: useProfile vs useUserProfile|false-positive-factual:Matches CLAUDE.md naming convention
```

---

## Resolution Workflow

1. **During Review (pm-reviewer.md):**
   - Classify findings using `classify_findings()`
   - Write deferred items to `deferred_findings.md`
   - Pass PR if `actionable_count == 0`

2. **At Merge Gate (merge.md):**
   - Load `deferred_findings.md`
   - Verify `future-work-overlap` files exist
   - Log unresolved items in final PR description
   - Warn user if any remain unresolved

3. **Post-Merge:**
   - Archive `deferred_findings.md` in PRD folder
   - Include summary in metrics.json

---

## Version

Template Version: 1.0
KARIMO Version: 8.2.0
