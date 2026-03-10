# Code Review Guidelines

## Always check

- New code follows existing patterns in the codebase
- Error handling is present for edge cases
- Security: no hardcoded secrets, no SQL injection, no XSS vulnerabilities
- Database migrations are backward-compatible
- API changes are backward-compatible or versioned
- No `console.log` or debug statements left in production code

## Style

- Prefer early returns over nested conditionals
- Use structured logging, not f-string interpolation in log calls
- Follow existing naming conventions in the codebase

## Skip

- Files in `.karimo/` (KARIMO configuration)
- Files in `node_modules/`, `vendor/`, or similar dependency directories
- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Generated files under `gen/`, `dist/`, `build/`, `.next/`
- Migration files (unless they modify existing migrations)

## Context

This repository uses KARIMO for PRD-driven development.

- Tasks are executed by specialized agents in isolated worktrees
- PRs are created wave-by-wave with dependencies
- Task requirements are in `.karimo/prds/{slug}/briefs/`
- Boundary rules are in `.karimo/config.yaml` under `boundaries`
