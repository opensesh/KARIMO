# KARIMO Cross-PRD Findings Index

Reusable patterns extracted from PRD-specific findings. When the same pattern appears across multiple PRDs, it gets promoted to this index.

## Purpose

- **Reduce duplication** — Document patterns once, reference everywhere
- **Improve agent context** — Agents load cross-PRD patterns for relevant tasks
- **Enable learning** — Patterns here may be promoted to `.karimo/learnings/`

## Structure

| Directory | Purpose |
|-----------|---------|
| [by-prd/](by-prd/index.md) | Findings organized by source PRD |
| [by-pattern/](by-pattern/index.md) | Findings organized by pattern type |

## Cross-PRD Patterns

_No cross-PRD patterns promoted yet._

Patterns are promoted when:
- Same finding appears in 2+ PRDs
- Pattern is actionable for future tasks
- PM Agent detects match during finalization

## How Promotion Works

1. **Detection:** PM Agent scans findings.md during Step 4 (Finalization)
2. **Matching:** Compare against existing by-pattern/ entries
3. **Promotion:** If match found, link to existing pattern
4. **Creation:** If new pattern, create entry in by-pattern/

See [PROMOTION_GUIDE.md](PROMOTION_GUIDE.md) for details.

---

*Findings are created automatically during PRD execution.*
*Manual entries can be added following the template format.*
