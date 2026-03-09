# /karimo-configure — Configuration Command

Create or update KARIMO configuration in `.karimo/config.yaml`. Use this when you want to configure KARIMO separately from planning.

## Usage

```
/karimo-configure              # Create new config or update existing
/karimo-configure --reset      # Start fresh, ignore existing config
/karimo-configure --greptile   # Install Greptile workflow only
```

**This command writes configuration to `.karimo/config.yaml` (single source of truth).**

## Source of Truth

**`.karimo/config.yaml`** is the authoritative source for KARIMO configuration:
- Agents read config.yaml for runtime, framework, commands, and boundaries
- Learnings are stored separately in `.karimo/learnings.md`
- CLAUDE.md contains only a minimal reference block (~8 lines)

## Behavior

### Quick Install: `--greptile` Flag

When the `--greptile` flag is passed, skip the full configuration flow and install only the Greptile workflow:

```bash
# Create workflows directory if needed
mkdir -p .github/workflows

# Check if greptile workflow template exists
if [ -f ".karimo/workflow-templates/karimo-greptile-review.yml" ]; then
    cp .karimo/workflow-templates/karimo-greptile-review.yml .github/workflows/
    echo "✅ Installed karimo-greptile-review.yml"
else
    echo "❌ Greptile workflow template not found"
    echo "   Expected at: .karimo/workflow-templates/karimo-greptile-review.yml"
    exit 1
fi
```

**Display instructions:**

```
╭──────────────────────────────────────────────────────────────╮
│  Greptile Workflow Installed                                 │
╰──────────────────────────────────────────────────────────────╯

✅ Copied karimo-greptile-review.yml to .github/workflows/

Next steps:
  1. Add GREPTILE_API_KEY to your repository secrets
     → Settings → Secrets and variables → Actions → New repository secret
  2. Push changes to trigger workflow on PRs

Greptile provides automated code review for KARIMO task PRs:
  • Score ≥ 3: PR passes review
  • Score < 3: Triggers revision with model escalation
  • After 3 failures: Requires human review

Learn more: https://greptile.com
```

**Exit after installation.** The `--greptile` flag is a quick-install shortcut, not a configuration flow.

---

### Step 0: Check Existing Configuration

Check if `.karimo/config.yaml` exists:

```bash
[ -f .karimo/config.yaml ] && echo "Config exists" || echo "No config"
```

**If config.yaml exists and no `--reset`:**

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Configure                                            │
╰──────────────────────────────────────────────────────────────╯

Existing configuration found in .karimo/config.yaml

Options:
  1. Update — Review and modify existing values
  2. Reset  — Start fresh with auto-detection
  3. Cancel — Exit without changes

Choose [1/2/3]:
```

**If config.yaml does not exist (or --reset):**

Proceed to Step 0.5 (Mode Selection).

---

### Step 0.5: Select Execution Mode

Present mode options using AskUserQuestion:

```
header: "Mode"
question: "Which execution mode should KARIMO use?"
options:
  - label: "Full Mode (Recommended)"
    description: "Complete GitHub integration with issues, PRs, and Projects. Requires GitHub MCP + gh CLI."
  - label: "Fast Track Mode"
    description: "Commit-only workflow without GitHub. Best for small teams and prototyping."
```

**If Full Mode selected:**

1. **Validate GitHub MCP is configured:**
   ```bash
   # Test MCP connection by calling mcp__github__get_me
   # This validates the MCP server is available
   ```
   Use `mcp__github__get_me` to test. If it fails:
   ```
   ❌ GitHub MCP not configured. Required for Full Mode.

   To configure GitHub MCP:
   1. Add the GitHub MCP server to your Claude Code settings
   2. Configure with your GitHub token
   3. See: https://github.com/modelcontextprotocol/servers/tree/main/src/github

   Would you like to:
     1. Switch to Fast Track Mode
     2. Exit and configure MCP first
   ```

2. **Validate gh CLI authentication:**
   ```bash
   gh auth status 2>/dev/null || { echo "❌ gh CLI not authenticated"; }
   ```

3. **Validate project scope:**
   ```bash
   SCOPES=$(gh auth status 2>&1)
   if ! echo "$SCOPES" | grep -q "project"; then
     echo "❌ Missing 'project' scope. Run: gh auth refresh -s project"
   fi
   ```

4. If all validations pass, proceed to Step 1 (Auto-Detection)

**If Fast Track Mode selected:**

1. **Validate git repository exists:**
   ```bash
   [ -d .git ] || { echo "❌ Not a git repository. Run: git init"; }
   ```

2. **Display trade-off warning:**
   ```
   ⚠️ Fast Track Mode Selected

   Trade-offs:
   - No GitHub Issues or PRs created for tasks
   - No GitHub Projects visualization
   - No Greptile integration for code review
   - Tasks committed directly with structured messages

   Best for: Small teams, rapid prototyping, solo developers

   Proceed? [Y/n]
   ```

3. Skip GitHub Configuration steps (Step 4.5)
4. Proceed to Step 1 (Auto-Detection)

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

**Write to `.karimo/config.yaml`:**

```yaml
github:
  owner_type: organization
  owner: opensesh
  repository: my-project
```

---

### Step 5: Execution Settings

Configure agent execution behavior. **All settings are customizable.**

Use AskUserQuestion to let the user configure each setting:

**Question 1: Default Model**
```
header: "Model"
question: "Which model should agents use by default?"
options:
  - label: "Sonnet (Recommended)"
    description: "Fast and cost-effective for most tasks. Opus auto-escalates for complex work."
  - label: "Opus"
    description: "Most capable model. Higher cost but better for complex codebases."
```

**Question 2: Parallel Tasks**
```
header: "Parallelism"
question: "How many tasks can run simultaneously?"
options:
  - label: "3 tasks (Recommended)"
    description: "Good balance of speed and resource usage for most projects."
  - label: "1 task"
    description: "Sequential execution. Safer but slower."
  - label: "5 tasks"
    description: "Faster execution. Requires more context awareness."
```

**Question 3: Pre-PR Checks**
```
header: "PR Checks"
question: "Which commands must pass before creating a PR?"
multiSelect: true
options:
  - label: "Build"
    description: "Run build command to verify compilation"
  - label: "Typecheck"
    description: "Run typecheck command to verify types"
  - label: "Lint"
    description: "Run lint command to check code style"
  - label: "Test"
    description: "Run test command to verify functionality"
```

**Display confirmation after selection:**

```
Section 5 of 6: Execution Settings
──────────────────────────────────

Your selections:

  Default model: sonnet
    (Used for most tasks; opus for complex work)

  Max parallel tasks: 3
    How many tasks can run simultaneously

  Pre-PR checks: build, typecheck, lint
    Commands that must pass before creating a PR

These settings can be changed anytime by running /karimo-configure
```

---

### Step 6: Cost Controls

Configure model escalation and attempt limits. **All settings are customizable.**

Use AskUserQuestion to let the user configure each setting:

**Question 1: Model Escalation**
```
header: "Escalation"
question: "When should agents escalate from Sonnet to Opus?"
options:
  - label: "After 1 failed attempt (Recommended)"
    description: "Balance of cost and quality. Escalates quickly when needed."
  - label: "Never escalate"
    description: "Always use default model. Lower cost but may struggle on complex tasks."
  - label: "After 2 failed attempts"
    description: "More attempts before escalating. Saves cost but may delay completion."
```

**Question 2: Max Attempts**
```
header: "Attempts"
question: "How many attempts before requiring human review?"
options:
  - label: "3 attempts (Recommended)"
    description: "Good balance. Allows retries but doesn't spin endlessly."
  - label: "2 attempts"
    description: "Fail faster. Requires more human intervention."
  - label: "5 attempts"
    description: "More autonomous. May spend more on difficult tasks."
```

**Question 3: Greptile Integration**
```
header: "Greptile"
question: "Enable Greptile for automated code review?"
options:
  - label: "No (default)"
    description: "Skip Greptile integration. Can enable later."
  - label: "Yes"
    description: "Enable automated code review. Requires GREPTILE_API_KEY secret."
```

**If "Yes" selected, install the Greptile workflow:**

```bash
# Copy workflow template to .github/workflows/
mkdir -p .github/workflows
cp .karimo/workflow-templates/karimo-greptile-review.yml .github/workflows/

echo "✅ Installed karimo-greptile-review.yml"
echo "   Configure GREPTILE_API_KEY secret in GitHub repository settings"
```

**Display confirmation after selection:**

```
Section 6 of 6: Cost Controls
─────────────────────────────

Your selections:

  Escalate to Opus after: 1 failed attempt(s)
    (0 = never escalate, always use default model)

  Max attempts before human review: 3
    After this many failures, task marked needs-human-review

  Greptile enabled: no
    Requires GREPTILE_API_KEY secret in repository

These settings can be changed anytime by running /karimo-configure
```

---

### Step 7: CD Integration (Optional)

Check for CD provider presence:

```bash
# Detection priority
if [ -f "vercel.json" ] || [ -f "vercel.ts" ] || [ -d ".vercel" ]; then
  PROVIDER="vercel"
elif [ -f "netlify.toml" ]; then
  PROVIDER="netlify"
elif [ -f "render.yaml" ]; then
  PROVIDER="render"
elif [ -f "railway.json" ] || [ -f "railway.toml" ]; then
  PROVIDER="railway"
elif [ -f "fly.toml" ]; then
  PROVIDER="fly"
else
  PROVIDER="none"
fi
```

**If a CD provider is detected, present the CD integration prompt:**

```
╭──────────────────────────────────────────────────────────────╮
│  Step 7: CD Integration                                      │
╰──────────────────────────────────────────────────────────────╯

Since KARIMO uses worktrees and creates PRs for each task, preview
deployments (Vercel, Netlify, etc.) may fail on partial code.

This is expected — the code works once all wave tasks merge to main.
The failures are just noise, not real problems.

Detected: Vercel (vercel.json found)

Options:
  1. Configure now — Skip preview builds for KARIMO branches
  2. Skip for now — I'll handle this later with /karimo-cd-config
  3. Learn more — What does this mean?

Your choice:
```

Use AskUserQuestion with:

```
header: "CD Config"
question: "Configure CD provider to skip KARIMO task branch previews?"
options:
  - label: "Configure now (Recommended)"
    description: "Add ignore rule for KARIMO branches. Prevents noise from partial code failures."
  - label: "Skip for now"
    description: "Handle later with /karimo-cd-config. Preview builds may fail on task PRs."
  - label: "Learn more"
    description: "Open CI-CD.md documentation for details."
```

**If "Configure now" selected:**

Apply the appropriate configuration based on detected provider:

**Vercel** — Add `ignoreCommand` to `vercel.json`:
```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
}
```

**Netlify** — Add `ignore` to `netlify.toml`:
```toml
[build]
  ignore = "[[ \"$HEAD\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
```

**Render/Railway** — Add comment noting dashboard configuration required.

Display confirmation:
```
✓ Updated vercel.json with KARIMO ignore rule
  KARIMO task branches will skip preview deployments
```

**If "Skip for now" selected:**

Note in final summary: "CD integration: skipped (run /karimo-cd-config later)"

**If "Learn more" selected:**

Display brief explanation, then re-prompt with options 1 and 2.

**If no CD provider detected:**

Skip this step silently and proceed to Step 8.

---

### Step 8: Confirm and Write

Present final configuration for confirmation:

```
Section 8 of 9: Confirm and Write
─────────────────────────────────

Configuration Summary:

  Mode: full

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

  GitHub (Full Mode only):
    owner_type: organization
    owner: opensesh
    repository: my-project
    merge_strategy: squash

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

**On confirmation, write `.karimo/config.yaml`:**

```yaml
# KARIMO Configuration
# Generated by /karimo-configure

# Execution Mode: full | fast-track
mode: full

project:
  name: my-project
  runtime: Node.js 20
  framework: Next.js 14
  package_manager: pnpm

commands:
  build: pnpm build
  lint: pnpm lint
  test: pnpm test
  typecheck: pnpm typecheck

boundaries:
  never_touch:
    - ".env*"
    - "*.lock"
    - "pnpm-lock.yaml"
  require_review:
    - "migrations/**"
    - "auth/**"
    - "**/middleware.*"

# GitHub Configuration (required for mode: full)
github:
  owner_type: organization
  owner: opensesh
  repository: my-project
  merge_strategy: squash  # squash | merge | rebase

execution:
  default_model: sonnet
  max_parallel: 3
  pre_pr_checks:
    - build
    - typecheck
    - lint

cost:
  escalate_after_failures: 1
  max_attempts: 3
  greptile_enabled: false
```

---

### Step 9: Update CLAUDE.md GitHub Configuration

After writing config.yaml, update the GitHub Configuration table in CLAUDE.md.

**Step 9a: Detect CLAUDE.md path**

```bash
# Check all possible locations for CLAUDE.md (case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f ".claude/claude.md" ]; then
    CLAUDE_MD=".claude/claude.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
elif [ -f "claude.md" ]; then
    CLAUDE_MD="claude.md"
else
    echo "⚠️  CLAUDE.md not found"
    echo "   Skipping CLAUDE.md update"
    exit 0
fi
```

**Step 9b: Check if KARIMO section exists with markers**

```bash
if ! grep -q "<!-- KARIMO:START" "$CLAUDE_MD"; then
  echo "⚠️  KARIMO section not found with markers in $CLAUDE_MD"
  echo "   CLAUDE.md not updated (re-run installer to add marker-based section)"
  exit 0
fi
```

**Step 9c: Update the GitHub Configuration table**

Replace the `_pending_` values in the table with actual values:

```bash
# Read values from just-written config.yaml
OWNER_TYPE=$(grep "owner_type:" .karimo/config.yaml | head -1 | awk '{print $2}')
OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
REPO=$(grep "repository:" .karimo/config.yaml | head -1 | awk '{print $2}')

# Update CLAUDE.md GitHub Configuration table in-place
# Uses sed to replace _pending_ values within the KARIMO section
sed -i '' \
  -e "/<!-- KARIMO:START/,/KARIMO:END -->/ {
    s/| Owner Type | _pending_ |/| Owner Type | $OWNER_TYPE |/
    s/| Owner | _pending_ |/| Owner | $OWNER |/
    s/| Repository | _pending_ |/| Repository | $REPO |/
  }" "$CLAUDE_MD"

echo "✅ Updated GitHub Configuration in $CLAUDE_MD"
```

**Example output:**

```
Section 9 of 9: Update CLAUDE.md
────────────────────────────────

  ✅ Found CLAUDE.md at: .claude/CLAUDE.md
  ✅ Found KARIMO section with markers
  ✅ Updated GitHub Configuration table:
      Owner Type: organization
      Owner: opensesh
      Repository: my-project

```

---

## config.yaml Structure

The command writes to `.karimo/config.yaml`. See the YAML structure in Step 7 above.

**Key sections:**
- `mode` — Execution mode (`full` or `fast-track`)
- `project` — Name, runtime, framework, package manager
- `commands` — Build, lint, test, typecheck commands
- `boundaries` — Never touch and require review patterns
- `github` — Owner type, owner, repository, merge strategy (Full Mode only)
- `execution` — Default model, max parallel, pre-PR checks
- `cost` — Escalation settings, Greptile integration

---

## Output

On completion:

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Complete                                       │
╰──────────────────────────────────────────────────────────────╯

✅ Wrote .karimo/config.yaml
   - Project: my-project (Node.js 20, Next.js 14)
   - Commands: build, lint, test, typecheck
   - Boundaries: 3 never_touch, 3 require_review
   - GitHub: opensesh/my-project
   - Execution: sonnet, max 3 parallel

✅ Updated CLAUDE.md GitHub Configuration
   - Owner Type: organization
   - Owner: opensesh
   - Repository: my-project

Next steps:
  • Run /karimo-plan to create your first PRD
  • Run /karimo-doctor to verify installation health
```

---

## Update Mode

When updating existing configuration, show current vs new values from config.yaml:

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

## Relationship to /karimo-plan

| Aspect | /karimo-configure | /karimo-plan |
|--------|-------------------|--------------|
| Purpose | Setup config only | Create PRD (config should exist) |
| Output | .karimo/config.yaml | PRD + tasks.yaml + execution_plan.yaml |
| Duration | ~5 minutes | ~30 minutes |
| When to use | Initial setup, config changes | New feature planning |

**Recommended workflow:**

1. **Fresh install:** `install.sh` sets up minimal CLAUDE.md reference block
2. **Configure:** Run `/karimo-configure` to create `.karimo/config.yaml`
3. **Verify:** Run `/karimo-doctor` to check configuration health
4. **Create PRDs:** Run `/karimo-plan` with configuration already in place

**Note:** `/karimo-plan` checks for `.karimo/config.yaml`. If missing, it offers to run `/karimo-configure` first. The preferred path is to have configuration complete before planning.

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Create PRD (includes auto-detection) |
| `/karimo-doctor` | Verify installation health |
| `/karimo-status` | View execution state |
