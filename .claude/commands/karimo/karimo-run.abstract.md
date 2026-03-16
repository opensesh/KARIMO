# /karimo-run

**Type:** Command
**Invokes:** karimo-pm, karimo-brief-writer, karimo-brief-reviewer, task agents

## Purpose

Execute an approved PRD using the 4-phase workflow: brief generation, auto-review, user iteration, and orchestrated execution.

## Key Arguments

- `--prd {slug}` (required): The PRD to execute
- `--dry-run`: Preview execution plan without changes
- `--skip-review`: Skip brief review, execute immediately
- `--review-only`: Generate and review briefs, stop before execution
- `--resume`: Resume paused execution
- `--task {id}`: Execute specific task only

## Phases

1. **Brief Generation**: Create task briefs from PRD
2. **Auto-Review**: Validate briefs against codebase
3. **User Iterate**: Present recommendations, get feedback
4. **Orchestrate**: Execute tasks in waves, create PRs

---
*Full definition: `.claude/commands/karimo-run.md` (537 lines)*
