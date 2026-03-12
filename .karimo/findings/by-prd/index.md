# Findings by PRD

Findings organized by source PRD. Each PRD gets a summary file linking to specific findings.

## PRD Summaries

_No PRD findings indexed yet._

PRD summaries are created automatically when:
- PRD execution completes (Step 4: Finalization)
- PM Agent extracts findings from `findings.md`

## Summary Format

Each `{prd-slug}.md` file contains:
- Link to original PRD
- List of findings from that PRD
- Links to any promoted cross-PRD patterns

## Example Entry

```markdown
# PRD: user-profiles

**PRD Path:** `.karimo/prds/001_user-profiles/`
**Completed:** 2026-03-12
**Finding Count:** 3

## Findings

1. **Error boundary pattern needed**
   - Category: implementation
   - Status: promoted to by-pattern/
   - Pattern: [error-boundary-components.md](../by-pattern/error-boundary-components.md)

2. **Form validation schema sharing**
   - Category: implementation
   - Status: PRD-specific

3. **API route test patterns**
   - Category: testing
   - Status: PRD-specific
```

---

*PRD summaries are managed by PM Agent during finalization.*
