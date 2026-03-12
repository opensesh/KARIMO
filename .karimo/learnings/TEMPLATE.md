# Learning Entry Template

Use this template when creating new learning entries via `/karimo-feedback`.

## File Naming

`{category}/{YYYY-MM-DD}-{short-slug}.md`

Example: `patterns/2026-03-12-use-server-components.md`

---

## Template

```markdown
# {Learning Title}

**Category:** pattern | anti-pattern | project-note | execution-rule
**Severity:** info | important | critical
**Added:** {YYYY-MM-DD}
**Source:** /karimo-feedback | PRD-{slug} | manual

## Description

{What this learning teaches — 1-2 sentences}

## Context

{Why this matters, when it applies — 2-3 sentences}

## Example

{Code example or scenario — keep brief}

```{language}
// Good example (for patterns)
// or
// Bad example (for anti-patterns)
```

## Related

- {Related learning file or documentation}
```

---

## Category Guidelines

### Patterns
- Approaches that work well in this project
- Established conventions to follow
- Successful solutions to common problems

### Anti-Patterns
- Approaches that caused issues
- Mistakes that were made and corrected
- Things to explicitly avoid

### Project Notes
- Project-specific context (not rules)
- Architectural decisions and rationale
- Integration points and dependencies

### Execution Rules
- Mandatory guidelines that must be followed
- Hard requirements from team or project
- Security or compliance constraints

---

## Severity Guidelines

### Critical
- Violation would break the build
- Security vulnerabilities
- Data integrity issues

### Important
- Violation causes warnings or issues
- Inconsistency with established patterns
- Performance concerns

### Info
- Nice to know context
- Minor optimizations
- Historical context
