# karimo-brief-reviewer

**Type:** Agent
**Model:** sonnet
**Trigger:** /karimo-run --review-only or Phase 2 of execution

## Purpose

Pre-execution validation agent that investigates PRD and task briefs against codebase reality. Produces findings document for correction.

## Key Capabilities

- Brief completeness validation
- File existence verification
- Pattern assumption validation
- Dependency conflict detection
- Finding prioritization (critical/warning/info)

## Tools

Read, Grep, Glob, Bash

---
*Full definition: `.claude/agents/karimo/karimo-brief-reviewer.md` (280 lines)*
