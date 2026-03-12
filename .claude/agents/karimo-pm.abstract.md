# karimo-pm

**Type:** Agent
**Model:** sonnet
**Trigger:** /karimo-run spawns this agent for PRD execution

## Purpose

Coordinates autonomous task execution — manages git workflows, spawns worker agents, monitors progress, creates PRs. Never writes code.

## Key Capabilities

- Wave-based task orchestration and dependency management
- Git worktree creation and branch management
- Worker agent spawning (implementer, tester, documenter)
- PR creation and status tracking
- Crash recovery from git state

## Tools

Read, Write, Edit, Bash, Grep, Glob

---
*Full definition: `.claude/agents/karimo-pm.md` (830 lines)*
