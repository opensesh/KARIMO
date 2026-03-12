# Anti-Patterns

Approaches to avoid in this project. Agents should not use these patterns.

## Entries

_No anti-patterns captured yet._

---

## How to Add

Anti-patterns are added via `/karimo-feedback` or manually using the [template](../TEMPLATE.md).

### File Naming

`{YYYY-MM-DD}-{short-slug}.md`

### Example Entry

```markdown
# Don't Use Class Components

**Category:** anti-pattern
**Severity:** important
**Added:** 2026-03-12
**Source:** /karimo-feedback

## Description

Do not use React class components. This project uses functional components only.

## Context

Class components were used historically but have been migrated to functional.
Mixing styles causes inconsistency and makes code harder to maintain.

## Example

```tsx
// Bad: Class Component
class UserProfile extends React.Component {
  render() {
    return <div>{this.props.name}</div>;
  }
}

// Good: Functional Component
function UserProfile({ name }: { name: string }) {
  return <div>{name}</div>;
}
```
```

---

*For full template, see [TEMPLATE.md](../TEMPLATE.md)*
