# Project Notes

Project-specific context that agents should be aware of. Not rules, but helpful context.

## Entries

_No project notes captured yet._

---

## How to Add

Project notes are added via `/karimo-feedback` or manually using the [template](../TEMPLATE.md).

### File Naming

`{YYYY-MM-DD}-{short-slug}.md`

### Example Entry

```markdown
# Authentication Uses Supabase

**Category:** project-note
**Severity:** info
**Added:** 2026-03-12
**Source:** PRD-user-auth

## Description

This project uses Supabase for authentication. All auth-related code uses their SDK.

## Context

Supabase was chosen for its real-time capabilities and PostgreSQL backend.
Auth functions are centralized in `src/lib/supabase/auth.ts`.

## Related

- `src/lib/supabase/client.ts` - Supabase client configuration
- `src/middleware.ts` - Auth middleware for route protection
```

---

*For full template, see [TEMPLATE.md](../TEMPLATE.md)*
