# /karimo:configure — Configuration Command

Create or update KARIMO configuration in `.karimo/config.yaml`. Use this when you want to configure KARIMO separately from planning.

## Usage

```
/karimo:configure              # Basic Mode (default): 3 questions, ~5 min
/karimo:configure --advanced   # Advanced Mode: Full control, 9+ questions, ~15 min
/karimo:configure --auto       # Auto Mode: Zero prompts, accepts all defaults, <1 min
/karimo:configure --reset      # Start fresh, ignore existing config
/karimo:configure --preview    # Preview auto-detected config without saving
/karimo:configure --validate   # Validate existing config against current project
/karimo:configure --greptile   # Install Greptile workflow only
/karimo:configure --code-review  # Setup Claude Code Review (instructions only)
/karimo:configure --review       # Choose between review providers (interactive)
/karimo:configure --cd           # Configure CD provider to skip KARIMO branches
/karimo:configure --check        # Show current configuration status
```

**Configuration Modes:**

| Mode | Time | Questions | Best For |
|------|------|-----------|----------|
| **Basic** (default) | ~5 min | 3 | Quick setup, standard projects |
| **Advanced** (`--advanced`) | ~15 min | 9+ | Custom setup, non-standard projects |
| **Auto** (`--auto`) | <1 min | 0 | CI/CD, testing, scripted installs |

**This command writes configuration to `.karimo/config.yaml` (single source of truth).**

## Source of Truth

**`.karimo/config.yaml`** is the authoritative source for KARIMO configuration:
- Agents read config.yaml for runtime, framework, commands, and boundaries
- Learnings are stored separately in `.karimo/learnings/` (categorized directories)
- CLAUDE.md contains only a minimal reference block (~8 lines)

## Behavior

### Quick Install: `--greptile` Flag

When the `--greptile` flag is passed, skip the full configuration flow and configure Greptile GitHub App integration:

**Step 1: Display dashboard setup requirements**

```
╭──────────────────────────────────────────────────────────────╮
│  Greptile Setup                                               │
╰──────────────────────────────────────────────────────────────╯

Greptile provides automated code review for KARIMO PRs.

Step 1: Greptile Dashboard Setup (Required)
──────────────────────────────────────────

  1. Install Greptile GitHub App: https://app.greptile.com
  2. Add your repository in Greptile dashboard
  3. Wait for repository indexing (~1-2 hours for large repos)
  4. Navigate to Code Review Agent section
  5. Enable ALL these settings:
     ✓ PR Summary
     ✓ Confidence Score
     ✓ Issue Tables
     ✓ Diagram
     ✓ Comments Outside Diff
  6. Custom Context (we'll handle this automatically):
     - KARIMO will generate .greptile/rules.md with project-specific context
     - After setup, you'll need to link this file in Greptile dashboard

Have you completed the dashboard setup?
```

Use AskUserQuestion:

```
header: "Dashboard"
question: "Have you completed Greptile dashboard setup (installed app, added repo, configured settings)?"
options:
  - label: "Yes, proceed with setup"
    description: "Dashboard configured, ready to install config files and workflow"
  - label: "Not yet, show me the steps"
    description: "Display detailed setup instructions first"
  - label: "Cancel"
    description: "Exit without making changes"
```

**If "Not yet" selected:**

Display detailed setup instructions:

```
╭──────────────────────────────────────────────────────────────╮
│  Greptile Dashboard Setup Guide                               │
╰──────────────────────────────────────────────────────────────╯

Follow these steps to configure Greptile for your repository:

STEP 1: Install Greptile GitHub App
───────────────────────────────────
  1. Go to https://app.greptile.com
  2. Sign in with your GitHub account
  3. Authorize the Greptile GitHub App when prompted
  4. Grant access to your repository (or organization)

STEP 2: Add Your Repository
───────────────────────────
  1. In the Greptile dashboard, click "Add Repository"
  2. Select your repository from the list
  3. Click "Index Repository"
  4. Wait for indexing to complete (progress shown in dashboard)
     - Small repos: ~5 minutes
     - Large repos: ~1-2 hours

STEP 3: Configure Code Review Agent
───────────────────────────────────
  1. Navigate to your repo in the Greptile dashboard
  2. Go to Settings → Code Review Agent
  3. Enable these settings (all required for KARIMO):

     ✓ PR Summary           → Generates overview of changes
     ✓ Confidence Score     → Required for KARIMO threshold
     ✓ Issue Tables         → Organizes findings by severity
     ✓ Diagram              → Visual representation of changes
     ✓ Comments Outside Diff → Reviews non-changed context

STEP 4: Link Custom Context (After KARIMO Setup)
────────────────────────────────────────────────
  KARIMO auto-generates .greptile/rules.md with project-specific context.
  After running /karimo:configure --greptile, link this file in Greptile:

  1. In Greptile dashboard, go to Code Review Agent → Custom Context
  2. Click "+ Add Context"
  3. Set Context Type: "File"
  4. Set File Path: .greptile/rules.md
  5. Leave Scope as "all" (or customize if needed)
  6. Click "Save"

  This tells Greptile to use your auto-generated project rules for reviews.

STEP 5: Verify Setup
────────────────────
  1. Check that your repo shows "Indexed" status
  2. Create a test PR with the 'karimo' label
  3. Wait for @greptileai to post a review (~3 minutes)
  4. Verify the confidence score appears (e.g., "4/5")

Need help? https://docs.greptile.com/code-review

```

Then re-prompt the dashboard setup question.

**If "Cancel" selected:**

Exit without changes.

**Step 2: Install configuration files**

```bash
# Create .greptile directory
mkdir -p .greptile

# Copy config.json template
cp .karimo/templates/greptile/config.json .greptile/config.json
echo "✅ Created .greptile/config.json (review settings)"
```

**Step 2b: Generate project-specific rules**

Spawn the `karimo-greptile-rules-writer` agent to generate rich, project-specific review rules:

```
Use Task tool to spawn karimo-greptile-rules-writer agent:

Prompt: "Generate .greptile/rules.md for this project by analyzing:
- .karimo/config.yaml (project settings, boundaries)
- CLAUDE.md (coding standards, forbidden elements)
- .karimo/learnings/ (patterns and anti-patterns)
- docs/*.md (existing documentation)
- Codebase patterns (sample components, API routes)

Write comprehensive rules with code examples showing CORRECT and WRONG patterns."
```

The agent will:
1. Read project configuration and documentation
2. Analyze codebase patterns from sample files
3. Generate `.greptile/rules.md` with project-specific rules
4. Return a summary of sections created

```
✅ Generated .greptile/rules.md (project-specific review rules)
   - {N} critical review rules with code examples
   - {N} forbidden elements
   - {N} high-risk files flagged
```

**Step 3: Install workflow**

```bash
# Create workflows directory if needed
mkdir -p .github/workflows

# Install the trigger workflow
cp .karimo/workflow-templates/karimo-greptile-trigger.yml .github/workflows/
echo "✅ Created .github/workflows/karimo-greptile-trigger.yml"
```

**Step 4: Ask for threshold configuration**

Use AskUserQuestion:

```
header: "Threshold"
question: "What confidence score should PRs meet before merging?"
options:
  - label: "5/5 (Recommended)"
    description: "Highest quality standard. All issues must be addressed."
  - label: "4/5"
    description: "High quality. Minor issues may be acceptable."
  - label: "3/5"
    description: "Moderate quality. Suitable for rapid iteration."
```

**Step 5: Update config.yaml with review settings**

```yaml
# Add to .karimo/config.yaml
review:
  enabled: true
  provider: greptile
  threshold: 5  # or selected value
  max_revision_loops: 3
```

**Step 6: Display completion summary**

```
╭──────────────────────────────────────────────────────────────╮
│  Greptile Configuration Complete                              │
╰──────────────────────────────────────────────────────────────╯

✅ Configuration files installed:
   - .greptile/config.json (review settings)
   - .greptile/rules.md (project-specific review rules)
   - .github/workflows/karimo-greptile-trigger.yml

✅ Review settings added to .karimo/config.yaml:
   - Provider: greptile
   - Threshold: 5/5
   - Max revision loops: 3

⚠️  IMPORTANT: Link rules.md in Greptile Dashboard
───────────────────────────────────────────────────
   Greptile needs to know about your rules file:

   1. Go to app.greptile.com → Code Review Agent → Custom Context
   2. Click "+ Add Context"
   3. Context Type: File
   4. File Path: .greptile/rules.md
   5. Click "Save"

   This tells Greptile to use your project-specific rules for reviews.
   You can edit .greptile/rules.md anytime — changes apply immediately.

How Greptile works with KARIMO:
  1. PM Agent creates PR with 'karimo' label
  2. Workflow triggers @greptileai comment
  3. Greptile reviews PR using your rules.md (~3 minutes)
  4. If score < threshold: PM spawns revision agent
  5. Revision loop until score >= threshold or max loops

To verify setup:
  1. Create a test PR with the 'karimo' label
  2. Wait for @greptileai to post a review (~3 minutes)
  3. Check that confidence score appears

Note: Greptile auto-reviews on every push after initial trigger.
```

**Exit after installation.** The `--greptile` flag is a quick-install shortcut, not a configuration flow.

---

### Quick Install: `--code-review` Flag

When the `--code-review` flag is passed, skip the full configuration flow and provide Code Review setup instructions:

**Display instructions:**

```
╭──────────────────────────────────────────────────────────────╮
│  Claude Code Review Setup                                     │
╰──────────────────────────────────────────────────────────────╯

Claude Code Review provides automated PR reviews with inline findings.

Prerequisites:
  • Claude Teams or Enterprise subscription
  • Admin access to your Claude organization

Setup steps:
  1. Go to claude.ai/admin-settings/claude-code
  2. Enable "Code Review" in the Code Review section
  3. Install the Claude GitHub App on your repository
  4. Enable the repository for Code Review in admin settings

Review behavior:
  • Multi-agent fleet examines code in full codebase context
  • Posts inline comments with severity markers:
      🔴 Normal — Bug to fix before merge
      🟡 Nit — Minor issue, worth fixing
      🟣 Pre-existing — Bug in codebase, not from this PR
  • Auto-resolves threads when issues are fixed
  • Completes in ~20 minutes on average

Cost: $15-25 per review (token-based)

Best for: Low-medium PR volume, Teams/Enterprise users

Learn more: https://code.claude.com/docs/en/code-review
```

**Generate REVIEW.md if it doesn't exist:**

```bash
if [ ! -f "REVIEW.md" ]; then
  cp .karimo/templates/REVIEW_TEMPLATE.md REVIEW.md

  # Inject boundaries from config.yaml if it exists
  if [ -f ".karimo/config.yaml" ]; then
    # Add never_touch patterns to Skip section
    NEVER_TOUCH=$(grep -A 20 'never_touch:' .karimo/config.yaml | grep '^\s*-' | head -10 | sed 's/^\s*- //' | sed 's/"//g')
    if [ -n "$NEVER_TOUCH" ]; then
      echo "" >> REVIEW.md
      echo "### Project-Specific Skip Patterns" >> REVIEW.md
      echo "" >> REVIEW.md
      for pattern in $NEVER_TOUCH; do
        echo "- \`$pattern\`" >> REVIEW.md
      done
    fi

    # Add require_review patterns to Always check section
    REQUIRE_REVIEW=$(grep -A 20 'require_review:' .karimo/config.yaml | grep '^\s*-' | head -10 | sed 's/^\s*- //' | sed 's/"//g')
    if [ -n "$REQUIRE_REVIEW" ]; then
      echo "" >> REVIEW.md
      echo "### Files Requiring Extra Attention" >> REVIEW.md
      echo "" >> REVIEW.md
      for pattern in $REQUIRE_REVIEW; do
        echo "- Changes to \`$pattern\` require careful review" >> REVIEW.md
      done
    fi
  fi

  echo "✅ Created REVIEW.md from template"
fi
```

**Display confirmation:**

```
✅ REVIEW.md created (customize review guidelines in this file)

Next steps:
  1. Complete admin setup at claude.ai/admin-settings/claude-code
  2. Install Claude GitHub App on your repository
  3. Open a PR to trigger your first Code Review
```

**Exit after instructions.** The `--code-review` flag is a setup guide, not a configuration flow.

---

### Preview Mode: `--preview` Flag

When the `--preview` flag is passed, run auto-detection and show what would be configured WITHOUT saving to config.yaml:

**Step 1: Spawn investigator agent**

Use Task tool to spawn the investigator agent:

```
Spawn karimo-investigator agent to detect:
- Runtime (Node.js, Python, Ruby, etc.)
- Framework (Next.js, Django, Rails, etc.)
- Package manager (npm, yarn, pnpm, pip, etc.)
- Build/test/lint commands from project files

Do NOT save results. Just return detected values.
```

**Step 2: Display preview**

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Preview (NOT SAVED)                            │
╰──────────────────────────────────────────────────────────────╯

Auto-detected settings:

Project:
  Runtime: node
  Framework: next
  Package manager: pnpm

Commands:
  Build: pnpm build
  Test: pnpm test
  Lint: pnpm lint
  Typecheck: pnpm typecheck

Suggested Boundaries:
  never_touch:
    - "node_modules/**"
    - ".next/**"
    - "*.lock"
    - ".env*"

  require_review:
    - "package.json"
    - "next.config.js"
    - "tsconfig.json"

To save this configuration, run:
  /karimo:configure

To customize settings, run:
  /karimo:configure --advanced
```

**Exit without saving.** The `--preview` flag is for inspection only.

---

### Validate Mode: `--validate` Flag

When the `--validate` flag is passed, compare existing config.yaml against current project state:

**Step 1: Check if config exists**

```bash
if [ ! -f ".karimo/config.yaml" ]; then
    echo "❌ Error: No configuration found"
    echo ""
    echo "Create configuration first:"
    echo "  /karimo:configure"
    exit 1
fi
```

**Step 2: Read existing config**

Read current values from `.karimo/config.yaml`:
- Runtime
- Framework
- Package manager
- Build/test/lint commands
- Boundaries

**Step 3: Spawn investigator to detect current state**

Use Task tool to spawn investigator agent (same as --preview).

**Step 4: Compare and report drift**

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Validation                                     │
╰──────────────────────────────────────────────────────────────╯

Checking .karimo/config.yaml against current project...

✅ Runtime: node (matches)
✅ Framework: next (matches)
❌ Package manager: npm → pnpm (DRIFT DETECTED)
❌ Build command: npm run build → pnpm build (DRIFT DETECTED)
✅ Test command: pnpm test (matches)
✅ Lint command: pnpm lint (matches)
✅ Boundaries: No changes detected

Summary:
  • 4 settings match current project
  • 2 settings have drifted
  • Last configured: 2026-01-15 (57 days ago)

Recommended action:
  Run /karimo:configure to update configuration

Specific fixes needed:
  1. Package manager changed from npm to pnpm
     → Update: project.package_manager: "pnpm"
  2. Build command references old package manager
     → Update: commands.build: "pnpm build"

Auto-fix available:
  /karimo:configure
  → Will detect current state and update config
```

**If no drift detected:**

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Validation                                     │
╰──────────────────────────────────────────────────────────────╯

✅ All settings match current project state

Configuration is up to date:
  • Runtime: node
  • Framework: next
  • Package manager: pnpm
  • All commands valid
  • Boundaries align with project structure

Last configured: 2026-03-11 (today)

No action needed.
```

**Exit after validation.** The `--validate` flag is for checking only, not updating.

---

### Quick Install: `--review` Flag (Provider Choice)

When the `--review` flag is passed, prompt user to choose their review provider:

Use AskUserQuestion:

```
header: "Review Provider"
question: "Which automated code review provider would you like to use?"
options:
  - label: "Claude Code Review (Recommended)"
    description: "$15-25 per PR. Native Claude integration. Auto-resolves issues."
  - label: "Greptile"
    description: "$30/month flat. Score-based reviews. Best for high PR volume."
  - label: "Skip for now"
    description: "Configure review provider later. Manual PR review only."
```

**If Code Review selected:**
- Run the `--code-review` flow above
- Generate REVIEW.md if it doesn't exist

**If Greptile selected:**
- Run the `--greptile` flow above (includes dashboard verification, config files, threshold question)
- Install workflow file and update config.yaml with review settings

**If Skip selected:**
- Display message: "Skipped. Run `/karimo:configure --review` anytime to set up automated review."
- Exit

**Exit after selection.** The `--review` flag is a provider choice shortcut.

---

### Quick Install: `--cd` Flag (CD Provider Configuration)

When the `--cd` flag is passed, skip the full configuration flow and configure CD provider directly:

**Prerequisites:**
- `.karimo/config.yaml` must exist. If not, show error: "Run /karimo:configure first to set up project configuration."

**Step 1: Auto-detect CD provider**

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

**Step 2: Present options**

Use AskUserQuestion:

```
header: "CD Config"
question: "Which CD provider would you like to configure?"
options:
  - label: "Vercel (Detected)"
    description: "Add ignoreCommand to vercel.json to skip KARIMO branches"
  - label: "Netlify"
    description: "Add ignore rule to netlify.toml"
  - label: "Render"
    description: "Show dashboard configuration instructions"
  - label: "Railway"
    description: "Show dashboard configuration instructions"
  - label: "Fly.io"
    description: "Show configuration guidance"
  - label: "Skip / None"
    description: "No CD provider, or I'll configure manually"
```

Note: The "(Detected)" label should only appear on the detected provider option.

**Step 3: Apply configuration based on selection**

**For Vercel:**

Check if `vercel.json` exists. If not, create it.

```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ ^feature/|-[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
}
```

If `vercel.json` already exists:
- Parse existing JSON
- Add or update the `ignoreCommand` field
- Preserve all other fields

Display confirmation:
```
✓ Updated vercel.json with KARIMO ignore rule
  KARIMO task branches will skip preview deployments
```

**For Netlify:**

Check if `netlify.toml` exists. If not, create it with:

```toml
[build]
  ignore = "[[ \"$HEAD\" =~ ^feature/|-[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
```

If `netlify.toml` already exists:
- Check if `[build]` section exists
- Add `ignore` command to `[build]` section

Display confirmation:
```
✓ Updated netlify.toml with KARIMO ignore rule
  KARIMO task branches will skip preview deployments
```

**For Render:**

Add comment to `render.yaml`:

```yaml
# KARIMO: Configure "Auto-Deploy" in dashboard to exclude branches matching: (^feature/|-[0-9]+[a-z]?$)
# See: https://render.com/docs/deploys#skip-deploys
```

Display instructions:
```
Render requires dashboard configuration for branch filtering.

In the Render dashboard:
1. Go to your service settings
2. Under "Auto-Deploy", configure branch patterns to exclude:
   - feature/* (feature branches)
   - *-[0-9]+[a-z]$ (task branches)

Added comment to render.yaml as a reminder.
```

**For Railway:**

Add comment to `railway.toml` (or create file):

```toml
# KARIMO: Railway requires dashboard configuration
# Settings → Deploys → Watch Patterns
# Exclude: feature/* and *-[0-9]+[a-z]$
```

Display instructions:
```
Railway requires dashboard configuration for branch filtering.

In the Railway dashboard:
1. Go to project settings → Deploys → Watch Patterns
2. Add exclude patterns:
   - feature/* (feature branches)
   - *-[0-9]+[a-z]$ (task branches)
```

**For Fly.io:**

Display instructions:
```
Fly.io doesn't auto-deploy on PR branches by default.

If you've configured GitHub Actions for Fly deployment:
- Add branch condition to skip KARIMO branches
- Patterns to exclude:
  - feature/* (feature branches)
  - *-[0-9]+[a-z]$ (task branches)

No configuration needed if using default Fly.io setup.
```

**For Skip/None:**

Display message:
```
Skipped CD configuration. Run /karimo:configure --cd anytime to configure.
```

**Step 4: Update config.yaml with CD section**

For all providers (except "Skip/None"), update `.karimo/config.yaml` to add CD section:

```yaml
cd:
  provider: vercel  # vercel | netlify | render | railway | fly | none
  status: configured  # configured | skipped | pending
  pattern: "^feature/|-[0-9]+[a-z]?$"
  configured_at: "2026-03-11T10:30:00Z"
```

For "Skip/None" selection, update config.yaml:

```yaml
cd:
  provider: none
  status: skipped
  configured_at: "2026-03-11T10:30:00Z"
```

**Display final confirmation:**

```
╭──────────────────────────────────────────────────────────────╮
│  CD Configuration Complete                                   │
╰──────────────────────────────────────────────────────────────╯

✅ Provider: vercel
✅ Status: configured
✅ Pattern: ^feature/|-[0-9]+[a-z]?$

Updated .karimo/config.yaml with CD configuration.

Test by pushing:
  - A feature branch: feature/test
  - A task branch: test-1a
```

**Exit after configuration.** The `--cd` flag is a quick-configuration shortcut.

---

### Quick Check: `--check` Flag (View Configuration Status)

When the `--check` flag is passed, display current configuration without making changes:

**Prerequisites:**
- `.karimo/config.yaml` must exist. If not, show message: "No configuration found. Run /karimo:configure to set up."

**Display configuration summary:**

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Configuration Status                                 │
╰──────────────────────────────────────────────────────────────╯

Project:        my-project
Runtime:        Node.js 20
Framework:      Next.js 14
Package Mgr:    pnpm

GitHub:         opensesh/my-project
Review Provider: greptile
CD Provider:    vercel (configured)

Last Updated:   2026-03-11 10:30 AM
```

Read values from `.karimo/config.yaml`:
- Project name, runtime, framework, package_manager
- GitHub owner/repository
- Review provider (none, greptile, code-review)
- CD provider and status from `cd` section (if exists)
- Last modified timestamp of config.yaml file

**If CD section doesn't exist in config.yaml:**

Display `CD Provider: not configured` in the status output.

**Exit after displaying status.** The `--check` flag is informational only.

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

## Configuration Modes

KARIMO offers three configuration modes to match your needs:

| Mode | Questions | Time | Use Case | Flag |
|------|-----------|------|----------|------|
| **Basic** | 3 | ~5 min | Quick setup, trust auto-detection | (default) |
| **Advanced** | 9+ | ~15 min | Full control, custom setup | `--advanced` |
| **Auto** | 0 | <1 min | CI/CD, testing, scripted | `--auto` |

### Mode Selection Logic

**Determine which mode to use based on flags:**

```bash
if [ "$1" == "--auto" ]; then
    MODE="auto"
elif [ "$1" == "--advanced" ]; then
    MODE="advanced"
else
    MODE="basic"  # Default
fi
```

**Route to appropriate flow:**
- **Basic Mode** → See "Basic Mode Flow" below
- **Advanced Mode** → See "Advanced Mode Flow" (Step 1-6)
- **Auto Mode** → See "Auto Mode Flow" below

---

## Basic Mode Flow (Default)

**Time: ~5 minutes | Questions: 3**

Basic Mode auto-detects everything and asks only essential questions.

### Basic Step 1: Auto-Detect Project

Spawn investigator agent to detect:
- Runtime (Node.js, Python, Ruby, etc.)
- Framework (Next.js, Django, Rails, etc.)
- Package manager (npm, yarn, pnpm, pip, etc.)
- Build/test/lint commands from project files
- Common boundary patterns for framework

**Display detected values:**

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Configuration (Basic Mode)                            │
╰──────────────────────────────────────────────────────────────╯

Auto-detected project settings:

Runtime: Node.js 20
Framework: Next.js 14
Package manager: pnpm

Commands:
  Build: pnpm build
  Test: pnpm test
  Lint: pnpm lint
  Typecheck: pnpm typecheck

Suggested boundaries:
  never_touch: node_modules/**, .next/**, *.lock, .env*
  require_review: package.json, next.config.js, tsconfig.json

Let's confirm a few key settings...
```

---

### Basic Step 2: Confirm Detection

**Question 1 of 3: Confirm detected settings**

Use AskUserQuestion:

```
header: "Detection"
question: "Confirm auto-detected runtime and framework?"
options:
  - label: "Yes, use detected settings (Recommended)"
    description: "Runtime: Node.js 20, Framework: Next.js 14, Package manager: pnpm"
  - label: "Edit runtime/framework"
    description: "Manually specify runtime, framework, or package manager"
```

**If "Edit" selected:**
- Prompt for runtime (dropdown: Node.js, Python, Ruby, Go, Rust, other)
- Prompt for framework (dropdown based on runtime)
- Prompt for package manager (dropdown based on runtime)
- Prompt for commands (text input, pre-filled with detected values)

**If "Use detected" selected:**
- Skip to next question

---

### Basic Step 3: File Boundaries

**Question 2 of 3: Which files should agents never touch?**

Show common patterns based on detected framework:

Use AskUserQuestion:

```
header: "Boundaries"
question: "Which files should agents NEVER modify?"
multiSelect: true
options:
  - label: "Dependencies (node_modules, vendor, etc.)"
    description: "Prevents agents from editing package dependencies"
  - label: "Build outputs (.next, dist, build, etc.)"
    description: "Generated files that should not be manually edited"
  - label: "Lock files (package-lock.json, yarn.lock, etc.)"
    description: "Package manager lock files"
  - label: "Environment files (.env, .env.*, secrets.*)"
    description: "Secrets and environment configuration"
  - label: "Database migrations (*/migrations/**, db/migrate/**)"
    description: "Historical migration files (for Django, Rails, etc.)"
```

**Additional patterns:**

Display detected framework-specific patterns and ask for confirmation:

```
Additional patterns suggested for Next.js:
  never_touch:
    - .next/**
    - out/**

  require_review:
    - next.config.js
    - middleware.ts

Include these? [Y/n]
```

**See GLOB_PATTERNS.md for more framework-specific patterns**

Link to: `.karimo/docs/GLOB_PATTERNS.md`

---

### Basic Step 4: Automated Review

**Question 3 of 3: Enable automated code review?**

Use AskUserQuestion:

```
header: "Review"
question: "Enable automated code review for task PRs?"
options:
  - label: "No (Manual review only)"
    description: "Review PRs manually via GitHub. No additional cost."
  - label: "Yes - Greptile ($30/month flat)"
    description: "Automated review with revision loops. Best for high volume (50+ PRs/month)"
  - label: "Yes - Claude Code Review ($15-25/PR)"
    description: "Automated review via Claude. Best for low-medium volume"
```

**If "No" selected:**
- Skip review setup
- Document in config.yaml: `review.enabled: false`

**If "Greptile" selected:**
- Run `/karimo:configure --greptile` flow (dashboard verification, config files, threshold question, workflow)
- Document in config.yaml:
  ```yaml
  review:
    enabled: true
    provider: greptile
    threshold: 5  # user-selected value
    max_revision_loops: 3
  ```

**If "Code Review" selected:**
- Run `/karimo:configure --code-review` flow (setup instructions)
- Document in config.yaml: `review.provider: "code-review"`

---

### Basic Mode: Save Configuration

After 3 questions answered, save to `.karimo/config.yaml`:

```yaml
config_version: "2.0"

project:
  runtime: "node"
  framework: "next"
  package_manager: "pnpm"

commands:
  build: "pnpm build"
  test: "pnpm test"
  lint: "pnpm lint"
  typecheck: "pnpm typecheck"

boundaries:
  never_touch:
    - "node_modules/**"
    - ".next/**"
    - "*.lock"
    - ".env*"
    - "out/**"

  require_review:
    - "package.json"
    - "next.config.js"
    - "tsconfig.json"
    - "middleware.ts"

github:
  owner_type: "organization"  # Auto-detected from gh repo view
  owner: "opensesh"
  repository: "my-project"

execution:
  default_model: "sonnet"
  max_parallel_tasks: 3
  pre_pr_checks:
    - "build"
    - "typecheck"
    - "lint"

review:
  enabled: false
  provider: null
  threshold: 5           # Target score (1-5), used when provider is greptile
  max_revision_loops: 3  # Max attempts before human review

cost_controls:
  enable_escalation: true
  max_attempts: 3
  retry_delay_seconds: 10
```

**Display confirmation:**

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Complete                                       │
╰──────────────────────────────────────────────────────────────╯

✅ Saved to .karimo/config.yaml

Project: Next.js 14 (Node.js 20)
Package manager: pnpm
Review: Manual (no automated review)

Boundaries:
  • Never touch: node_modules, build outputs, lock files, env files
  • Require review: package.json, config files

Next steps:
  1. Create your first PRD: /karimo:plan
  2. View configuration: cat .karimo/config.yaml
  3. Modify settings: /karimo:configure --advanced

Tip: Run /karimo:doctor to verify installation
```

**Exit after saving.** Basic Mode is complete.

---

## Auto Mode Flow (--auto flag)

**Time: <1 minute | Questions: 0**

Auto Mode accepts all defaults without user interaction. For CI/CD pipelines and automated testing.

### Auto Mode Behavior

1. **Spawn investigator agent** to auto-detect all settings
2. **Use all detected defaults** (no prompts)
3. **Set safe defaults for undetected values:**
   - Default model: sonnet
   - Max parallel tasks: 3
   - Pre-PR checks: build, typecheck (if commands detected)
   - Review: disabled
   - Escalation: enabled
   - Max attempts: 3
4. **Save to config.yaml** immediately
5. **Display summary** (no confirmation needed)

**Display only:**

```
╭──────────────────────────────────────────────────────────────╮
│  Auto Configuration Complete                                  │
╰──────────────────────────────────────────────────────────────╯

✅ Saved to .karimo/config.yaml (auto-detected settings)

Runtime: Node.js 20
Framework: Next.js 14
Package manager: pnpm
Review: Disabled

All defaults applied. Run /karimo:configure to customize.
```

**Exit after saving.** No user interaction.

---

## Advanced Mode Flow (--advanced flag)

**Time: ~15 minutes | Questions: 9+**

Advanced Mode provides complete control over all settings. Recommended for non-standard projects or when auto-detection fails.

**Proceed to detailed steps below (Step 1-6).**

---

### Step 1: Auto-Detection (Advanced Mode)

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

These settings can be changed anytime by running /karimo:configure
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

**Question 3: Automated Review**
```
header: "Review"
question: "Enable automated code review?"
options:
  - label: "No (default)"
    description: "Skip automated review. Can enable later with /karimo:configure --review."
  - label: "Claude Code Review"
    description: "$15-25 per PR. Native Claude integration. Requires Teams/Enterprise."
  - label: "Greptile"
    description: "$30/month flat. Score-based reviews. Requires GREPTILE_API_KEY secret."
```

**If "Claude Code Review" selected:**

1. Generate REVIEW.md if it doesn't exist:
   ```bash
   if [ ! -f "REVIEW.md" ]; then
     cp .karimo/templates/REVIEW_TEMPLATE.md REVIEW.md
     # Inject boundaries from config.yaml (see --code-review section for details)
     echo "✅ Created REVIEW.md from template"
   fi
   ```

2. Display setup instructions:
   ```
   Claude Code Review selected.

   Complete setup at claude.ai/admin-settings/claude-code:
     1. Enable "Code Review" in the Code Review section
     2. Install Claude GitHub App on your repository
     3. Enable the repository for Code Review

   REVIEW.md created — customize review guidelines as needed.
   ```

3. Update config.yaml with `review_provider: code-review`

**If "Greptile" selected:**

Run the full Greptile setup flow (same as `--greptile` flag):

1. Dashboard verification prompt (user confirms Greptile app installed)
2. Install config files:
   ```bash
   mkdir -p .greptile
   cp .karimo/templates/greptile/config.json .greptile/config.json
   ```
3. Spawn `karimo-greptile-rules-writer` agent to generate project-specific rules
   (writes `.greptile/rules.md` with code examples from codebase analysis)
4. Install workflow:
   ```bash
   mkdir -p .github/workflows
   cp .karimo/workflow-templates/karimo-greptile-trigger.yml .github/workflows/
   ```
5. Ask threshold question (5/5 recommended, 4/5, or 3/5)
6. Update config.yaml:
   ```yaml
   review:
     enabled: true
     provider: greptile
     threshold: 5  # user-selected
     max_revision_loops: 3
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

  Review provider: none | code-review | greptile
    Automated code review configuration

These settings can be changed anytime by running /karimo:configure
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
  2. Skip for now — I'll handle this later with /karimo:configure --cd
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
    description: "Handle later with /karimo:configure --cd. Preview builds may fail on task PRs."
  - label: "Learn more"
    description: "Open CI-CD.md documentation for details."
```

**If "Configure now" selected:**

Apply the appropriate configuration based on detected provider:

**Vercel** — Add `ignoreCommand` to `vercel.json`:
```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ ^feature/|-[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
}
```

**Netlify** — Add `ignore` to `netlify.toml`:
```toml
[build]
  ignore = "[[ \"$HEAD\" =~ ^feature/|-[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
```

**Render** — Add comment to `render.yaml`:
```yaml
# KARIMO: Configure "Auto-Deploy" in dashboard to exclude branches matching: (^feature/|-[0-9]+[a-z]?$)
```

**Railway** — Add comment to `railway.toml`:
```toml
# KARIMO: Railway requires dashboard configuration
# Settings → Deploys → Watch Patterns
# Exclude: feature/* and *-[0-9]+[a-z]$
```

**Fly.io** — Display instructions only (no file changes).

Display confirmation:
```
✓ Updated vercel.json with KARIMO ignore rule
  KARIMO task branches will skip preview deployments
```

**Update config.yaml with CD section:**

After applying configuration, add CD section to `.karimo/config.yaml`:

```yaml
cd:
  provider: vercel  # vercel | netlify | render | railway | fly | none
  status: configured
  pattern: "^feature/|-[0-9]+[a-z]?$"
  configured_at: "2026-03-11T10:30:00Z"
```

**If "Skip for now" selected:**

Update config.yaml to mark CD as skipped:

```yaml
cd:
  provider: [detected-provider or none]
  status: skipped
  configured_at: "2026-03-11T10:30:00Z"
```

Note in final summary: "CD integration: skipped (run /karimo:configure --cd later)"

**If "Learn more" selected:**

Display brief explanation:
```
KARIMO task branches contain partial code:
- Task 1a adds types
- Task 1b uses those types
- Building 1b alone fails (types don't exist yet)

This is expected. The code works once all wave tasks merge to main.

Configuring your CD provider to skip KARIMO branches prevents noise
from these expected failures.
```

Then re-prompt with options 1 and 2.

**If no CD provider detected:**

Update config.yaml to indicate no provider:

```yaml
cd:
  provider: none
  status: pending
  configured_at: "2026-03-11T10:30:00Z"
```

Skip this step in the UI and proceed to Step 8.

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
# Generated by /karimo:configure

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

# Review provider: none | greptile | code-review
review_provider: none

# CD provider configuration (optional)
cd:
  provider: vercel  # vercel | netlify | render | railway | fly | none
  status: configured  # configured | skipped | pending
  pattern: "^feature/|-[0-9]+[a-z]?$"
  configured_at: "2026-03-11T10:30:00Z"
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

The command writes to `.karimo/config.yaml`. See the YAML structure in Step 8 above.

**Key sections:**
- `mode` — Execution mode (`full` or `fast-track`)
- `project` — Name, runtime, framework, package manager
- `commands` — Build, lint, test, typecheck commands
- `boundaries` — Never touch and require review patterns
- `github` — Owner type, owner, repository, merge strategy (Full Mode only)
- `execution` — Default model, max parallel, pre-PR checks
- `cost` — Escalation settings
- `review_provider` — Automated review provider (`none`, `greptile`, `code-review`)
- `cd` — CD provider configuration (provider, status, pattern, configured_at)

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
  • Run /karimo:plan to create your first PRD
  • Run /karimo:doctor to verify installation health
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

## Relationship to /karimo:plan

| Aspect | /karimo:configure | /karimo:plan |
|--------|-------------------|--------------|
| Purpose | Setup config only | Create PRD (config should exist) |
| Output | .karimo/config.yaml | PRD + tasks.yaml + execution_plan.yaml |
| Duration | ~5 minutes | ~30 minutes |
| When to use | Initial setup, config changes | New feature planning |

**Recommended workflow:**

1. **Fresh install:** `install.sh` sets up minimal CLAUDE.md reference block
2. **Configure:** Run `/karimo:configure` to create `.karimo/config.yaml`
3. **Verify:** Run `/karimo:doctor` to check configuration health
4. **Create PRDs:** Run `/karimo:plan` with configuration already in place

**Note:** `/karimo:plan` checks for `.karimo/config.yaml`. If missing, it offers to run `/karimo:configure` first. The preferred path is to have configuration complete before planning.

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Create PRD (includes auto-detection) |
| `/karimo:doctor` | Verify installation health |
| `/karimo:dashboard` | View execution state |
