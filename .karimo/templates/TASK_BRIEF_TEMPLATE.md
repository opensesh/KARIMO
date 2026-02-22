# Task Brief: [{task_id}] {task_title}

## PRD Context

{Relevant sections from PRD.md — executive summary, the requirement(s) this task fulfills, UX notes if applicable}

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

## When Complete

1. Commit your changes with conventional commit format
2. Ensure all validation commands pass
3. Your work will be reviewed and a PR will be created by the PM agent
