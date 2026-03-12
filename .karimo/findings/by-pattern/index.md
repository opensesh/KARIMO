# Findings by Pattern

Cross-PRD patterns that appear in multiple PRDs. These are reusable insights that inform future task execution.

## Pattern Categories

| Category | Description |
|----------|-------------|
| **implementation** | Code patterns and architectural decisions |
| **testing** | Test patterns and coverage strategies |
| **documentation** | Documentation patterns and standards |
| **integration** | API and system integration patterns |

## Pattern Index

_No cross-PRD patterns promoted yet._

Patterns are promoted when:
- Same finding appears in 2+ PRDs
- PM Agent detects match during finalization
- User manually promotes via `/karimo-feedback`

## Pattern Format

Each pattern file follows this structure:

```markdown
# Pattern: {pattern-name}

**Category:** {category}
**First Seen:** PRD-{slug}
**Occurrences:** {count}

## Description
{What this pattern is}

## When to Apply
{Conditions for application}

## Example
{Code or scenario}

## PRDs Using This Pattern
- PRD-{slug-1}: {context}
- PRD-{slug-2}: {context}
```

## Related

- [Promotion Guide](../PROMOTION_GUIDE.md) — How patterns get promoted
- [Learnings](../../learnings/index.md) — Patterns promoted to learnings

---

*Pattern files are created by PM Agent during PRD finalization.*
