# Task Brief: [{task_id}] {task_title}

## PRD Context

{Relevant sections from PRD.md — executive summary, the requirement(s) this task fulfills, UX notes if applicable}

## Research Context

{If PRD has "## Research Findings" section, extract and embed task-specific research here. Otherwise, state "No research available for this PRD."}

### Patterns to Follow

{List existing patterns from PRD research that apply to this task, with file:line references}

- **Pattern Name:** Brief description (path/to/file.ts:42)
- ...

### Known Issues to Address

{List issues from PRD research that this task should address or be aware of}

- ⚠️ **Issue:** Description and recommended solution
- ...

### Recommended Approach

{Implementation guidance from PRD research specific to this task}

- Library recommendations with rationale
- Architectural decisions that affect this task
- Best practices to apply

### Dependencies

{File and library dependencies from PRD research relevant to this task}

**File Dependencies:**
- Shared types: path/to/types.ts (created by Task X, imported by this task)
- Utilities: path/to/utils.ts (existing, extend for this task)

**Library Dependencies:**
- npm-package-name (install if not present, version X.Y.Z recommended)

{Note: If no research exists, this section will state "No research available. Proceed with standard investigation during implementation."}

## Task Definition

**ID:** {task_id}
**Complexity:** {complexity}/10
**Priority:** {priority}
**Model:** {assigned_model}

**Description:**
{task.description}

## Success Criteria

{task.success_criteria as numbered list}

## Files to Modify

{task.files_affected as list}

## Agent Context

{task.agent_context — patterns, gotchas, edge cases}

## Findings from Previous Tasks

{Relevant entries from findings.md — only findings tagged with this task's ID or from tasks in its dependency chain. If no findings exist yet, state "No prior findings."}

## Images

{Any referenced images from task.images, with relative paths to assets/}

## Rules

- Follow `.claude/KARIMO_RULES.md` for commit standards, boundaries, and code quality
- Execute all work in the working directory provided by the PM agent
- Run validation before committing: {config.commands.build}, {config.commands.typecheck}
- Do NOT modify files matching `never_touch` patterns
- Flag `require_review` files in your commit message

## Coverage Expectations

{Only include for test tasks — detected by title containing "test/tests/testing", task type being "testing", or files_affected containing test files}

**Target Files for Coverage:**

| File | Target | Rationale |
|------|--------|-----------|
| `{impl_file}` | 80%+ | {why this target} |

**Intentionally Uncovered Lines:**

- **{file}:{line-range}** — {reason}

**Verification:**
```bash
{commands.test} --coverage
```

{If not a test task, omit this entire section}

## When Complete

1. Commit your changes with conventional commit format
2. Ensure all validation commands pass
3. Your work will be reviewed and a PR will be created by the PM agent

---

*Abstract: `{task_id}_{slug}.abstract.md` (L0 summary ~50 tokens)*
*Full brief: this file*
