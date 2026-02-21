# KARIMO Code Standards Skill

Coding patterns and validation protocols for the karimo-implementer agent.

---

## Task Boundaries

### Complete Your Task Only

- Stay within the `files_affected` list from your task brief
- Do not modify code outside your scope unless absolutely necessary
- If you need to touch additional files, document in findings.json

### Never Touch Files

These files are completely off-limits. Violation causes task failure.

From CLAUDE.md Boundaries → Never Touch:
- Lock files (`*.lock`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Environment files (`.env`, `.env.*`)
- Migration files (`migrations/`, `prisma/migrations/`)
- Any files explicitly listed in project configuration

**If your task requires modifying a never-touch file:**
1. STOP immediately
2. Document as a blocker in findings.json
3. Do not proceed with the task

### Require Review Files

These files need human attention. Complete the task but flag prominently.

From CLAUDE.md Boundaries → Require Review:
- Authentication code (`src/auth/*`, `lib/auth/*`)
- Configuration files (`*.config.js`, `*.config.ts`)
- Security-sensitive files
- Files explicitly listed in project configuration

**When modifying require-review files:**
1. Complete the modification as needed
2. Add to commit message: `[REVIEW: modified {file}]`
3. The PM will ensure these are highlighted in the PR

---

## Commit Standards

### Conventional Commits Format

```
<type>(<scope>): <description>

[optional body explaining what and why]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature for users | `feat(profile): add avatar upload` |
| `fix` | Bug fix | `fix(auth): correct token refresh logic` |
| `refactor` | Code restructure, no behavior change | `refactor(api): extract validation helpers` |
| `docs` | Documentation only | `docs(readme): add setup instructions` |
| `test` | Adding or fixing tests | `test(profile): add avatar upload tests` |
| `chore` | Maintenance, config changes | `chore(deps): update eslint config` |
| `perf` | Performance improvements | `perf(query): add database index` |

### Co-Authored-By Footer

**ALWAYS include on every commit:**
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Frequency

- Commit after completing logical units of work
- Prefer multiple small commits over one large commit
- Each commit should leave the codebase in a working state

---

## Code Quality

### Follow Existing Patterns

Before creating new code:
1. Read similar files in `files_affected`
2. Check for existing utilities that do what you need
3. Match the codebase's architectural patterns
4. Use existing component libraries and design systems

### Style Matching

- Use the same formatting as surrounding code
- Match naming conventions (camelCase, PascalCase, etc.)
- Follow existing import organization patterns
- Use the same error handling approaches

### TypeScript Rules

- **Never use `any`** — Use `unknown` and narrow, or define proper types
- Define interfaces for data structures
- Use discriminated unions for state machines
- Export types that consumers need

### Error Handling

- Handle errors explicitly with structured types
- Never use bare try/catch without proper handling
- Use Zod or similar for runtime validation
- Log security-relevant events

### Security

- Never commit secrets (API keys, tokens, passwords)
- Use environment variables for sensitive values
- Validate all external inputs
- Default to restrictive permissions

---

## Pre-Completion Validation Protocol

Before signaling task completion, run ALL validation commands.

### Step 1: Build

```bash
{commands.build}  # From CLAUDE.md Commands table
```

**If build fails:**
1. Read the error output
2. Fix the issue in your code
3. Re-run build
4. Maximum 2 fix attempts

### Step 2: Type Check

```bash
{commands.typecheck}  # If configured in CLAUDE.md
```

**If typecheck fails:**
1. Fix type errors in your code
2. Never add `// @ts-ignore` to bypass
3. Define proper types instead of using `any`

### Step 3: Lint

```bash
{commands.lint}  # If configured in CLAUDE.md
```

**If lint fails:**
1. Fix linting issues
2. Follow the existing code style
3. Don't disable rules without justification

### Step 4: Test

```bash
{commands.test}  # If configured in CLAUDE.md
```

**If tests fail:**
1. Check if the failure is from your changes
2. Fix tests you broke
3. Don't modify tests to make them pass artificially
4. If pre-existing failure, document in findings.json

### Failure After Maximum Attempts

If any command fails after 2 fix attempts:
1. Document the failure in findings.json as a blocker
2. Do NOT signal task completion
3. The PM agent will handle escalation

---

## findings.json Contract

Create this file in your worktree root when you have discoveries for downstream tasks.

### Schema

```json
{
  "task_id": "string",
  "completed_at": "ISO 8601 timestamp",
  "findings": [
    {
      "type": "discovery | blocker | api_change | pattern",
      "severity": "info | warning | blocker",
      "description": "What was discovered",
      "affected_tasks": ["task IDs that need to know"],
      "files": ["paths to relevant files"],
      "action_required": "Optional: what needs to happen"
    }
  ]
}
```

### Finding Types

| Type | Description | Example |
|------|-------------|---------|
| `discovery` | New types, hooks, utilities created | "Created useProfile hook" |
| `pattern` | Patterns established others should follow | "Using Zod for all API validation" |
| `api_change` | Interface changes affecting downstream | "getUser now returns paginated results" |
| `blocker` | Issues preventing task completion | "Requires auth middleware that doesn't exist" |

### Severity Levels

| Severity | Meaning | PM Action |
|----------|---------|-----------|
| `info` | Helpful but not blocking | Include in PR description |
| `warning` | Important for downstream tasks | Append to downstream agent_context |
| `blocker` | Blocks dependent tasks | Halt dependent tasks, report immediately |

### When to Create findings.json

Create this file when:
- You created new types/interfaces other tasks will consume
- You established patterns that should be followed
- You discovered gotchas or constraints
- You made API changes affecting downstream tasks
- You encountered blockers preventing completion

---

## Efficient Execution

### Do

- Complete success criteria directly
- Use provided `agent_context` and learnings
- Match existing code style exactly
- Ask for clarification rather than guessing
- Focus on your task only

### Don't

- Over-engineer solutions
- Create unnecessary abstractions
- Add features not in the success criteria
- Refactor unrelated code
- Scope creep into adjacent tasks

### Use Available Context

1. **Task Brief** — Primary source of requirements
2. **agent_context** — PRD-specific guidance
3. **CLAUDE.md Learnings** — Project-specific patterns
4. **Upstream findings** — Discoveries from dependent tasks

---

## Completion Checklist

Before signaling done:

- [ ] All success criteria met
- [ ] All validation commands pass (`build`, `typecheck`, `lint`, `test`)
- [ ] Commits use Conventional Commits format
- [ ] All commits have Co-Authored-By footer
- [ ] No `never_touch` files modified
- [ ] `require_review` files flagged in commits
- [ ] findings.json written if discoveries exist
- [ ] No `any` types in TypeScript
- [ ] Errors handled with structured types
- [ ] JSDoc added for new exported functions
