# KARIMO Testing Standards Skill

Testing patterns and protocols for the karimo-tester agent.

---

## Framework Detection Protocol

**MANDATORY: Execute before writing ANY test.**

### Step 1: Find Existing Test Files

```bash
# Search for test files
find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" | head -10

# Search for E2E tests
find . -name "*.e2e.ts" -o -name "*.e2e.tsx" | head -10
```

### Step 2: Identify Test Framework

```bash
# Check package.json for framework
cat package.json | grep -E '"vitest"|"jest"|"mocha"|"playwright"|"@testing-library"'
```

| Framework | Indicators |
|-----------|------------|
| Vitest | `"vitest"` in devDependencies |
| Jest | `"jest"` or `"@jest/globals"` |
| Mocha | `"mocha"` or `"chai"` |
| Playwright | `"@playwright/test"` |
| Testing Library | `"@testing-library/react"` |

### Step 3: Read Existing Tests

Read 2-3 existing test files and extract:
- Import style
- Describe/it naming conventions
- Setup/teardown patterns
- Mock/stub patterns
- Assertion library (expect, assert)

### Step 4: Document Framework in Context

Before writing, confirm:
```
Framework: Vitest
File naming: *.test.ts
Test location: __tests__/ or co-located
Mocking: vi.mock()
Assertions: expect().toBe(), toEqual(), etc.
```

---

## Test Structure

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// or for Jest:
// import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { functionUnderTest } from '../functionUnderTest';

describe('functionUnderTest', () => {
  // Setup shared test data
  let testInput: InputType;

  beforeEach(() => {
    testInput = createTestInput();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when called with valid input', () => {
    it('should return expected result', () => {
      const result = functionUnderTest(testInput);
      expect(result).toBe('expected');
    });
  });

  describe('when called with invalid input', () => {
    it('should throw ValidationError', () => {
      expect(() => functionUnderTest(null)).toThrow(ValidationError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = functionUnderTest('');
      expect(result).toBe('');
    });

    it('should handle undefined', () => {
      expect(() => functionUnderTest(undefined)).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../test-utils';

describe('UserService Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create and retrieve user', async () => {
    const created = await userService.create({ name: 'Test' });
    const retrieved = await userService.get(created.id);

    expect(retrieved).toEqual(created);
  });
});
```

### React Component Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Test Coverage Requirements

### Happy Path Tests

Every function/component needs:
- Normal operation with valid inputs
- Expected success cases
- Typical use scenarios

### Error State Tests

Test all failure modes:
- Invalid inputs (wrong type, format)
- Missing required fields
- Network/API failures
- Permission/auth errors
- Timeout scenarios

### Edge Case Tests

**Always test:**

| Category | Cases to Test |
|----------|---------------|
| Empty values | `null`, `undefined`, `''`, `[]`, `{}` |
| Boundaries | `0`, `-1`, `MAX_VALUE`, `MIN_VALUE` |
| Special chars | Unicode, emoji, HTML entities |
| Long inputs | Max length strings, large arrays |
| Concurrent | Race conditions if applicable |

### UI-Specific Tests

| Category | What to Test |
|----------|--------------|
| Rendering | Component renders without crashing |
| Interactions | Click, hover, focus, keyboard events |
| States | Loading, error, empty, success |
| Accessibility | Roles, labels, keyboard navigation |

### API-Specific Tests

| Category | What to Test |
|----------|--------------|
| Request | Correct URL, method, headers, body |
| Response | Success parsing, error handling |
| Auth | Token refresh, unauthorized handling |
| Errors | 4xx, 5xx responses, network errors |

---

## Testing Rules

### From KARIMO_RULES.md

- **Add tests for new functionality.** If your task creates new code, include tests.
- **Don't break existing tests.** Run the test suite before committing.
- **Test edge cases.** Check for null, undefined, empty arrays, and error states.

### Additional Rules

- **Match existing patterns.** Your tests should be indistinguishable from existing tests.
- **One assertion focus per test.** Each `it` block should test one specific behavior.
- **Descriptive test names.** Test names should explain what and when.
- **Clean test data.** Use factories or fixtures, not hardcoded values.
- **Isolate tests.** Tests should not depend on each other.

---

## Naming Conventions

### Test File Names

| Convention | Example | When to Use |
|------------|---------|-------------|
| `.test.ts` | `UserService.test.ts` | Unit tests (default) |
| `.spec.ts` | `UserService.spec.ts` | Some projects prefer spec |
| `.e2e.ts` | `UserService.e2e.ts` | End-to-end tests |
| `.integration.ts` | `UserService.integration.ts` | Integration tests |

**Match the existing project convention.**

### Test Descriptions

```typescript
// Pattern: "should [expected behavior] when [condition]"

describe('UserService', () => {
  describe('createUser', () => {
    it('should create user when all fields are valid', () => {});
    it('should throw ValidationError when email is missing', () => {});
    it('should return null when user already exists', () => {});
  });
});
```

### Variable Naming

```typescript
// Use descriptive names
const validUser = { name: 'Test', email: 'test@example.com' };
const invalidEmail = 'not-an-email';
const emptyInput = '';

// Avoid
const x = { name: 'Test' };
const data = 'not-an-email';
```

---

## Mocking Patterns

### Module Mocking

```typescript
// Vitest
vi.mock('../service', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));

// Jest
jest.mock('../service', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'test' }),
}));
```

### Function Mocking

```typescript
// Vitest
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked');
mockFn.mockResolvedValue('async mocked');

// Jest
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked');
mockFn.mockResolvedValue('async mocked');
```

### API Mocking with MSW

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/user/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Test' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Assertion Patterns

### Common Assertions

```typescript
// Equality
expect(result).toBe(expected);           // Strict equality
expect(result).toEqual(expected);        // Deep equality
expect(result).toStrictEqual(expected);  // Strict deep equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeUndefined();
expect(result).toBeDefined();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThan(10);
expect(result).toBeCloseTo(0.3, 5);

// Strings
expect(result).toMatch(/pattern/);
expect(result).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject(partial);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('message');
expect(() => fn()).toThrow(ErrorType);

// Async
await expect(asyncFn()).resolves.toBe(value);
await expect(asyncFn()).rejects.toThrow();
```

---

## Pre-Completion Protocol

### Step 1: Run Full Test Suite

```bash
{commands.test}
```

### Step 2: Verify Your Tests Pass

All tests (existing + new) must pass.

### Step 3: Check Coverage (if configured)

```bash
{commands.test} --coverage
```

### Step 4: Commit

```
test(scope): add tests for feature

- Happy path: successful operation
- Error handling: invalid input
- Edge cases: empty values, boundaries

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## findings.json for Test Discoveries

Create when you find coverage gaps or test infrastructure issues:

```json
{
  "task_id": "1a-tests",
  "completed_at": "2026-02-21T10:00:00Z",
  "findings": [
    {
      "type": "discovery",
      "severity": "warning",
      "description": "No existing tests for error boundaries",
      "affected_tasks": [],
      "files": ["src/components/ErrorBoundary.tsx"],
      "action_required": "Consider adding error boundary tests"
    }
  ]
}
```

---

## Completion Checklist

- [ ] Framework detection complete
- [ ] Read and analyzed existing test patterns
- [ ] Tests match existing structure exactly
- [ ] Happy path tests implemented
- [ ] Error state tests implemented
- [ ] Edge case tests implemented
- [ ] All tests passing (including existing)
- [ ] Commits use `test(scope):` format
- [ ] findings.json written if gaps discovered
