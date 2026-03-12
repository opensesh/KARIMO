# Execution Rules

Mandatory guidelines that must be followed. Critical for project integrity.

## Entries

_No execution rules captured yet._

---

## How to Add

Execution rules are added via `/karimo-feedback` or manually using the [template](../TEMPLATE.md).

### File Naming

`{YYYY-MM-DD}-{short-slug}.md`

### Example Entry

```markdown
# Never Modify Migration Files

**Category:** execution-rule
**Severity:** critical
**Added:** 2026-03-12
**Source:** manual

## Description

Never modify existing migration files in `prisma/migrations/`. Create new migrations only.

## Context

Modifying existing migrations breaks database consistency across environments.
This is enforced in `.karimo/config.yaml` under `never_touch` patterns.

## Example

```bash
# Wrong: Editing existing migration
edit prisma/migrations/20240101_init/migration.sql

# Correct: Create new migration
npx prisma migrate dev --name add_user_avatar
```
```

---

*For full template, see [TEMPLATE.md](../TEMPLATE.md)*
