# karimo-implementer

**Type:** Agent
**Model:** sonnet
**Trigger:** PM Agent assigns for complexity 1-4 coding tasks

## Purpose

Executes coding tasks from KARIMO PRDs. Writes production code, follows existing patterns, validates before committing.

## Key Capabilities

- Pattern detection and matching in existing codebase
- Production code implementation with validation
- Boundary enforcement (never_touch, require_review)
- Findings generation for downstream tasks
- Pre-completion validation (build, lint, typecheck, test)

## Tools

Read, Write, Edit, Bash, Glob, Grep

---
*Full definition: `.claude/agents/karimo/implementer.md` (315 lines)*
