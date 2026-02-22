# /karimo:configure — Configuration Command

Create or update KARIMO configuration in `CLAUDE.md`. Use this when you want to configure KARIMO separately from planning.

## Usage

```
/karimo:configure              # Create new config or update existing
/karimo:configure --reset      # Start fresh, ignore existing config
```

**This command writes configuration directly to CLAUDE.md (single source of truth).**

## Source of Truth

**`CLAUDE.md`** is the authoritative source for KARIMO configuration:
- Agents read CLAUDE.md for runtime, framework, commands, and boundaries
- All configuration lives in the `## KARIMO Framework` section
- Tables provide structured, human-readable configuration

## Behavior

### Step 0: Check Existing Configuration

Check if CLAUDE.md has existing KARIMO configuration by looking for `_pending_` markers:

```bash
grep "_pending_" CLAUDE.md | grep -E "(Runtime|Framework|Package Manager|Build|Lint|Test|Typecheck)" || echo "No pending markers"
```

**If no `_pending_` markers and no `--reset`:**

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Configure                                            │
╰──────────────────────────────────────────────────────────────╯

Existing configuration found in CLAUDE.md

Options:
  1. Update — Review and modify existing values
  2. Reset  — Start fresh with auto-detection
  3. Cancel — Exit without changes

Choose [1/2/3]:
```

**If `_pending_` markers exist (or --reset):**

Proceed to Step 1 with auto-detection.

---

### Step 1: Auto-Detection

Scan project for smart defaults:

```bash
# Check for package.json
cat package.json 2>/dev/null

# Check for common config files
ls -la *.config.* 2>/dev/null
ls -la tsconfig.json 2>/dev/null
ls -la pyproject.toml 2>/dev/null

# Check directory structure
ls -la src/ app/ lib/ 2>/dev/null
```

**Important:** Auto-detection provides suggestions only. The user confirms all values. Never silently rely on package.json as source of truth.

---

### Step 2: Project Identity

Collect basic project information:

```
Section 1 of 6: Project Identity
─────────────────────────────────

Detected: Node.js project with Next.js

  Project name: [my-project]
  Runtime: [Node.js 20]
  Framework: [Next.js 14]
  Package manager: [pnpm]

Accept these values? [Y/n/edit]
```

**On edit:** Allow field-by-field modification.

---

### Step 3: Build Commands

Collect project commands:

```
Section 2 of 6: Build Commands
──────────────────────────────

I found these scripts in package.json:
  build: next build
  lint: eslint .
  test: jest
  typecheck: tsc --noEmit

Map these to KARIMO commands:

  Build command: [pnpm build]
  Lint command: [pnpm lint]
  Test command: [pnpm test]
  Typecheck command: [pnpm typecheck]

Accept these values? [Y/n/edit]
```

**If no package.json or scripts missing:**

```
Section 2 of 6: Build Commands
──────────────────────────────

No package.json found (or no scripts defined).

Enter your build commands:

  Build command: _______
  Lint command: _______ (or 'none' to skip)
  Test command: _______ (or 'none' to skip)
  Typecheck command: _______ (or 'none' to skip)
```

---

### Step 4: File Boundaries

Define files agents should not touch or must flag for review:

```
Section 3 of 6: File Boundaries
───────────────────────────────

Detected sensitive files:
  - .env, .env.*
  - package-lock.json, pnpm-lock.yaml, yarn.lock
  - migrations/

Never Touch (agents cannot modify these):

  Current: .env*, *.lock, pnpm-lock.yaml
  Edit? [Y/n]:

Require Review (agents must flag these for human attention):

  Current: migrations/**, auth/**, **/middleware.*
  Edit? [Y/n]:
```

**Boundary patterns use glob syntax.**

---

### Step 4.5: GitHub Configuration

Detect GitHub repository settings for project creation:

```bash
gh repo view --json owner,name -q '.owner.type + "|" + .owner.login + "|" + .name'
```

**Display for confirmation:**

```
Section 4 of 6: GitHub Configuration
────────────────────────────────────

Detected from repository:
  Owner type: organization
  Owner: opensesh
  Repository: my-project

GitHub Project will use: --owner opensesh

Accept? [Y/n]
```

**If not a git repository or gh not authenticated:**

```
Section 4 of 6: GitHub Configuration
────────────────────────────────────

⚠️  Could not detect GitHub repository settings.

Options:
  1. Run 'gh auth login' and retry
  2. Enter manually:
     Owner type (personal/organization): _______
     Owner: _______
     Repository: _______
  3. Skip (GitHub Projects will not work)
```

**Write to CLAUDE.md (in KARIMO Framework section):**

```markdown
### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | organization |
| Owner | opensesh |
| Repository | my-project |
```

---

### Step 5: Execution Settings

Configure agent execution behavior:

```
Section 5 of 6: Execution Settings
──────────────────────────────────

These settings control how agents execute tasks:

  Default model: [sonnet]
    Options: sonnet, opus

  Max parallel tasks: [3]
    How many tasks can run simultaneously

  Pre-PR checks: [build, typecheck, lint]
    Commands that must pass before creating a PR
    (comma-separated, or 'none')

Accept these values? [Y/n/edit]
```

---

### Step 6: Cost Controls

Configure model escalation and attempt limits:

```
Section 5 of 5: Cost Controls
─────────────────────────────

These settings control cost and quality tradeoffs:

  Escalate to Opus after: [1] failed attempt(s)
    (0 = never escalate, always use default model)

  Max attempts before human review: [3]
    After this many failures, task marked needs-human-review

  Greptile enabled: [no]
    Requires GREPTILE_API_KEY secret in repository
    Run /karimo:doctor to verify secrets are configured

Accept these values? [Y/n/edit]
```

---

### Step 7: Confirm and Write

Present final configuration for confirmation:

```
Section 6 of 6: Confirm and Write
─────────────────────────────────

Configuration Summary:

  Project:
    name: my-project
    runtime: Node.js 20
    framework: Next.js 14
    package_manager: pnpm

  Commands:
    build: pnpm build
    lint: pnpm lint
    test: pnpm test
    typecheck: pnpm typecheck

  Boundaries:
    never_touch:
      - ".env*"
      - "*.lock"
      - "pnpm-lock.yaml"
    require_review:
      - "migrations/**"
      - "auth/**"
      - "**/middleware.*"

  Execution:
    default_model: sonnet
    max_parallel: 3
    pre_pr_checks:
      - build
      - typecheck
      - lint

  Cost:
    escalate_after_failures: 1
    max_attempts: 3
    greptile_enabled: false

Write this configuration? [Y/n]
```

**On confirmation, update CLAUDE.md:**

1. **Update `### Project Context` table:**
   - Runtime, Framework, Package Manager values

2. **Update `### Commands` table:**
   - Build, Lint, Test, Typecheck commands

3. **Update `### Boundaries` section:**
   - Never Touch patterns
   - Require Review patterns

4. **Replace any `_pending_` markers** with actual values

---

## CLAUDE.md Structure

The command writes to these sections in CLAUDE.md:

```markdown
## KARIMO Framework

### Project Context

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20 |
| Framework | Next.js 14 |
| Package Manager | pnpm |

### Commands

| Command | Script |
|---------|--------|
| Build | pnpm build |
| Lint | pnpm lint |
| Test | pnpm test |
| Typecheck | pnpm typecheck |

### Boundaries

**Never Touch:**
- `.env*`
- `*.lock`
- `pnpm-lock.yaml`

**Require Review:**
- `migrations/**`
- `auth/**`
- `**/middleware.*`

### Execution Settings

| Setting | Value |
|---------|-------|
| Default Model | sonnet |
| Max Parallel | 3 |
| Pre-PR Checks | build, typecheck, lint |
| Escalate After | 1 failure |
| Max Attempts | 3 |
| Greptile | disabled |
```

---

## Output

On completion:

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Complete                                       │
╰──────────────────────────────────────────────────────────────╯

✅ Updated CLAUDE.md
   - Updated Project Context table
   - Updated Commands table
   - Updated Boundaries section
   - Updated Execution Settings table
   - Replaced _pending_ markers: 0 remaining

Next steps:
  • Run /karimo:plan to create your first PRD
  • Run /karimo:doctor to verify installation health
```

---

## Update Mode

When updating existing configuration, show current vs new values:

```
Section 2 of 6: Build Commands
──────────────────────────────

  Build command:
    Current: pnpm build
    New: [pnpm build] (press Enter to keep)

  Lint command:
    Current: pnpm lint
    New: [pnpm lint:fix] ← changed

  ...
```

Only write changes if at least one value modified.

---

## Relationship to /karimo:plan

| Aspect | /karimo:configure | /karimo:plan |
|--------|-------------------|--------------|
| Purpose | Setup config only | Create PRD (config should exist) |
| Output | CLAUDE.md updates | PRD + tasks.yaml + dag.json |
| Duration | ~5 minutes | ~30 minutes |
| When to use | Initial setup, config changes | New feature planning |

**Recommended workflow:**

1. **Fresh install:** `install.sh` sets up CLAUDE.md with `_pending_` markers
2. **Configure:** Run `/karimo:configure` to populate actual values
3. **Verify:** Run `/karimo:doctor` to check configuration health
4. **Create PRDs:** Run `/karimo:plan` with configuration already in place

**Note:** `/karimo:plan` checks CLAUDE.md for `_pending_` markers. If found, it offers to run auto-detection as a fallback. The preferred path is to have configuration complete before planning.

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Create PRD (includes auto-detection) |
| `/karimo:doctor` | Verify installation health |
| `/karimo:status` | View execution state |
