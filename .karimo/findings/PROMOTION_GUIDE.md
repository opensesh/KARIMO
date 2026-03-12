# Cross-PRD Pattern Promotion Guide

This document describes how findings are promoted from PRD-specific to cross-PRD patterns.

## Promotion Flow

```
PRD-specific finding (in .karimo/prds/{slug}/findings.md)
    │
    ▼
PM Agent finalizes PRD (Step 4)
    │
    ├─► Scan existing by-pattern/ entries
    │
    ├─► Match found?
    │   ├─ YES → Link finding to existing pattern
    │   │         Update pattern with new PRD reference
    │   │
    │   └─ NO  → Check if finding is cross-PRD candidate
    │             │
    │             ├─ Generic (not project-specific) → Create by-pattern/ entry
    │             │
    │             └─ Project-specific → Keep in by-prd/ only
    │
    └─► Update by-prd/index.md with PRD findings summary
```

## Criteria for Promotion

A finding is promoted to cross-PRD when it meets ALL of these criteria:

1. **Actionable** — Provides guidance for future tasks
2. **Generic** — Applies beyond the specific PRD context
3. **Repeated** — Appeared in 2+ PRDs (or is likely to)
4. **Documented** — Has clear description and example

## Pattern Entry Format

```markdown
# Pattern: {pattern-name}

**Category:** implementation | testing | documentation | integration
**First Seen:** PRD-{first-slug}
**Occurrences:** {count}

## Description

{What this pattern is and why it matters}

## When to Apply

{Conditions under which this pattern applies}

## Example

{Code example or scenario}

## PRDs Using This Pattern

- PRD-{slug-1}: {context}
- PRD-{slug-2}: {context}

## Related Learnings

- `.karimo/learnings/{category}/{file}.md` (if promoted to learnings)
```

## PM Agent Detection Logic

During Step 4 (Finalization), PM Agent:

1. Reads `findings.md` from the completed PRD
2. Extracts finding categories and keywords
3. Searches `by-pattern/` for similar entries:
   - Keyword matching in titles
   - Category matching
   - File pattern matching
4. For each match:
   - Adds PRD reference to existing pattern
   - Links finding to pattern
5. For non-matches:
   - Creates `by-prd/{prd-slug}.md` entry
   - Flags potential new patterns for review

## Learning Promotion

Patterns that appear in 3+ PRDs may be candidates for promotion to `.karimo/learnings/`:

1. PM Agent flags pattern as learning candidate
2. `/karimo-feedback --from-metrics` includes finding
3. User approves promotion
4. Learning created in appropriate category

---

*Promotion is automatic during PRD execution.*
*Manual promotion can be done by editing files directly.*
