# KARIMO Documentation Standards Skill

Documentation patterns and guidelines for the karimo-documenter agent.

---

## Documentation Rules

### From KARIMO_RULES.md

- **Update docs if behavior changes.** If your task changes how something works, update relevant documentation.
- **Add JSDoc to exported functions.** Public APIs should have documentation.
- **Don't create unnecessary docs.** Only document what needs explanation.

### Core Principle: Concise Over Comprehensive

**Document the "what" and "how".**

Focus on:
- What does this do?
- How do I use it?
- What options are available?

Minimize:
- Why was it built this way?
- Historical context
- Implementation details

### Update, Don't Create

Prefer updating existing documentation over creating new files:
- Add to existing README sections
- Extend existing API docs
- Update component documentation in place

Only create new documentation files when:
- No existing file covers the topic
- The content would clutter existing files
- Project structure requires separate files

---

## Documentation Types

### 1. README Documentation

**Structure:**
```markdown
# Feature/Component Name

Brief description (1-2 sentences).

## Installation

(if applicable)

## Usage

Basic code example.

## API

Function/method signatures with parameters.

## Examples

Additional examples for complex usage.
```

**Example:**
```markdown
# UserProfile Hook

React hook for fetching and managing user profile data.

## Usage

\`\`\`typescript
import { useProfile } from '@/hooks/useProfile';

function ProfilePage() {
  const { profile, isLoading, error, updateProfile } = useProfile();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return <ProfileForm profile={profile} onSave={updateProfile} />;
}
\`\`\`

## API

### `useProfile(options?)`

| Param | Type | Description |
|-------|------|-------------|
| options?.userId | `string` | Specific user ID (defaults to current user) |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| profile | `UserProfile \| null` | Profile data |
| isLoading | `boolean` | Loading state |
| error | `Error \| null` | Error if failed |
| updateProfile | `(data: Partial<UserProfile>) => Promise<void>` | Update function |
```

### 2. JSDoc for Functions

**Template:**
```typescript
/**
 * Brief description of what this function does.
 *
 * @param paramName - What this parameter is for
 * @param options - Configuration options
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```ts
 * const result = functionName('input', { option: true });
 * ```
 */
```

**Example:**
```typescript
/**
 * Validates and normalizes a user email address.
 *
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns Normalized email address (lowercase, trimmed)
 * @throws {ValidationError} When email format is invalid
 *
 * @example
 * ```ts
 * const email = normalizeEmail('  User@Example.COM  ');
 * // Returns: 'user@example.com'
 * ```
 */
export function normalizeEmail(
  email: string,
  options?: EmailOptions
): string {
  // ...
}
```

### 3. TSDoc for Interfaces/Types

**Template:**
```typescript
/**
 * Brief description of what this type represents.
 *
 * @example
 * ```ts
 * const value: TypeName = {
 *   // example
 * };
 * ```
 */
export interface TypeName {
  /** Description of property */
  propertyName: Type;
}
```

**Example:**
```typescript
/**
 * User profile data returned from the API.
 *
 * @example
 * ```ts
 * const profile: UserProfile = {
 *   id: 'user_123',
 *   name: 'Jane Doe',
 *   email: 'jane@example.com',
 * };
 * ```
 */
export interface UserProfile {
  /** Unique user identifier */
  id: string;

  /** User's display name */
  name: string;

  /** Email address (verified) */
  email: string;

  /** Profile avatar URL */
  avatarUrl?: string;

  /** Account creation timestamp */
  createdAt: Date;
}
```

### 4. Component Documentation

**Structure:**
```markdown
# ComponentName

Brief description.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|

## Usage

Basic example.

## Variants

Examples of different states/variations.
```

**Example:**
```markdown
# Button

Clickable button component with multiple variants.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Visual style |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| disabled | `boolean` | `false` | Disable interactions |
| loading | `boolean` | `false` | Show loading spinner |
| onClick | `() => void` | - | Click handler |

## Usage

\`\`\`tsx
<Button variant="primary" onClick={() => save()}>
  Save Changes
</Button>
\`\`\`

## Variants

### Primary
\`\`\`tsx
<Button variant="primary">Primary Action</Button>
\`\`\`

### Secondary
\`\`\`tsx
<Button variant="secondary">Secondary Action</Button>
\`\`\`

### Loading State
\`\`\`tsx
<Button loading>Saving...</Button>
\`\`\`
```

---

## Style Guidelines

### Headers

Use proper hierarchy:
- `#` H1 — Document title (only one per file)
- `##` H2 — Major sections
- `###` H3 — Subsections
- `####` H4 — Rarely needed

### Code Blocks

Always include language tags:

````markdown
```typescript
// TypeScript code
```

```tsx
// React/TSX code
```

```bash
# Shell commands
```

```json
{
  "json": "data"
}
```
````

### Tables

Align with proper spacing:

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
```

### Links

```markdown
# Internal links
[Configuration](./configuration.md)
[API Reference](../api/README.md)

# External links
[TypeScript Docs](https://www.typescriptlang.org/docs/)
```

### Formatting

- **Bold** for emphasis
- `code` for inline code, values, and file names
- *Italic* sparingly
- > Blockquotes for notes and warnings

---

## Verification Checklist

### Before Committing

1. **Code Examples Work**
   ```bash
   # If TypeScript project
   npx tsc --noEmit path/to/example.ts
   ```

2. **Links Resolve**
   - Check all internal links
   - Verify external links are valid

3. **Types Match**
   - Documented types match actual code
   - Parameter names match

4. **Formatting Consistent**
   - Matches existing documentation style
   - Proper code block language tags

---

## Pre-Completion Protocol

### Step 1: Style Check

Compare your documentation against existing docs:
- Same heading structure?
- Same code block style?
- Same table format?

### Step 2: Verify Examples

For each code example:
- Can it be copy-pasted and run?
- Are imports included?
- Are types correct?

### Step 3: Link Check

For each link:
- Does the target file exist?
- Is the path correct (relative vs absolute)?

### Step 4: Docs Build (if configured)

```bash
{commands.docs}
```

---

## findings.json for Documentation Gaps

Report missing or inconsistent documentation:

```json
{
  "task_id": "1a-docs",
  "completed_at": "2026-02-21T10:00:00Z",
  "findings": [
    {
      "type": "discovery",
      "severity": "warning",
      "description": "No documentation exists for error codes",
      "affected_tasks": [],
      "files": ["src/errors.ts"],
      "action_required": "Consider adding error code reference"
    }
  ]
}
```

---

## Commit Standards

Use `docs` type:

```
docs(api): add UserService documentation

- Function signatures for public methods
- Usage examples
- Type documentation

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Patterns

### Avoid

- **Over-documentation**: Don't explain self-evident code
- **Redundancy**: Don't repeat information across files
- **Stale docs**: Don't leave outdated information
- **Implementation details**: Don't expose internal workings
- **Verbose examples**: Don't include unnecessary code

### Instead

- **Self-documenting code**: Use clear names
- **Single source of truth**: Link instead of copy
- **Keep current**: Update when code changes
- **API focus**: Document the interface
- **Minimal examples**: Show essential usage

---

## Completion Checklist

- [ ] Matched existing documentation style
- [ ] All success criteria met
- [ ] Code examples verified
- [ ] Links verified (internal and external)
- [ ] JSDoc added for exported functions
- [ ] Documentation is concise
- [ ] No redundant explanations
- [ ] Commits follow `docs(scope):` format
- [ ] findings.json written if gaps found
