# Patterns

Approaches that work well in this project. Agents should follow these patterns when applicable.

## Entries

_No patterns captured yet._

---

## How to Add

Patterns are added via `/karimo-feedback` or manually using the [template](../TEMPLATE.md).

### File Naming

`{YYYY-MM-DD}-{short-slug}.md`

### Example Entry

```markdown
# Use Server Components for Data Fetching

**Category:** pattern
**Severity:** important
**Added:** 2026-03-12
**Source:** /karimo-feedback

## Description

Use React Server Components for data fetching instead of client-side useEffect.

## Context

This project uses Next.js App Router. Server Components reduce client bundle size
and provide better SEO.

## Example

```tsx
// Good: Server Component
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId);
  return <Profile user={user} />;
}
```
```

---

*For full template, see [TEMPLATE.md](../TEMPLATE.md)*
