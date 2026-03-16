# /karimo-merge

**Type:** Command
**Invokes:** karimo-coverage-reviewer

## Purpose

Consolidate feature branch changes and create final PR to main. Completes the workflow after all task PRs have been merged.

## Key Arguments

- `--prd {slug}` (required): The PRD to merge
- `--skip-validation`: Skip validation suite
- `--auto-merge`: Auto-merge after passing validation

## Prerequisites

- PRD orchestrated via `/karimo-run`
- All tasks complete (status: "ready-for-merge")
- Feature branch exists with all task commits

## Workflow

1. Validate PRD readiness
2. Run validation suite (build, lint, test)
3. Spawn coverage-reviewer (if reports exist)
4. Create PR to main with summary

---
*Full definition: `.claude/commands/karimo-merge.md` (628 lines)*
