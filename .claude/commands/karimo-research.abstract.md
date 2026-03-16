# /karimo-research

**Type:** Command
**Invokes:** karimo-researcher, karimo-refiner

## Purpose

Conduct two-phase research (internal codebase + external web) to gather implementation context for PRDs. **Required first step before planning.**

## Key Arguments

- `"feature-name"`: Creates PRD folder and runs initial research
- `--prd {slug}`: Add research to existing PRD (iterate loop)
- `--refine --prd {slug}`: Process human annotations
- `--internal-only` / `--external-only`: Limit research scope

## Workflow

1. Create PRD folder structure
2. Internal codebase research (patterns, gaps, dependencies)
3. External research (libraries, best practices)
4. Commit research findings

---
*Full definition: `.claude/commands/karimo-research.md` (477 lines)*
