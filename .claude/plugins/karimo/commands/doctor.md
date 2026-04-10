# /karimo:doctor — Diagnostic Command

Check the health of a KARIMO installation, identify issues, and provide actionable recommendations.

## Usage

```
/karimo:doctor              # Full diagnostic with recommendations
/karimo:doctor --test       # Quick pass/fail verification (replaces /karimo-test)
```

**This command is read-only and never modifies files.**

---

## `--test` Mode (Quick Verification)

When the `--test` flag is passed, run a lightweight pass/fail verification instead of the full diagnostic.

**Purpose:** Verify KARIMO installation works end-to-end without creating real PRDs or spawning agents. This is a lightweight alternative to running a full PRD cycle for verification.

### Test Suite

Run these 4 tests:

| Test | Description |
|------|-------------|
| **1. File Presence** | Verify all required files exist per MANIFEST.json |
| **2. Template Parsing** | Ensure templates have valid markdown structure |
| **3. GitHub CLI Auth** | Verify `gh auth status` succeeds |
| **4. CLAUDE.md Integration** | Verify KARIMO section and config files exist |

### Output Format

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Smoke Test                                           │
╰──────────────────────────────────────────────────────────────╯

Test 1: File Presence
─────────────────────

  ✅ Manifest    Present (.karimo/MANIFEST.json)
  ✅ Agents      22/22 present (from manifest)
  ✅ Commands    11/11 present (from manifest)
  ✅ Skills      7/7 present (from manifest)
  ✅ Templates   18/18 present (from manifest)

Test 2: Template Parsing
────────────────────────

  ✅ All templates have valid markdown structure

Test 3: GitHub CLI Auth
───────────────────────

  ✅ Authenticated as @username

Test 4: CLAUDE.md Integration
─────────────────────────────

  ✅ KARIMO section        Present in CLAUDE.md (with markers)
  ✅ learnings/            Present in .karimo/ (categorized directories)
  ✅ KARIMO_RULES.md       Present in .claude/plugins/karimo/
  ✅ prds/ directory       Exists

Summary
───────

  ✅ 4/4 tests passed

  KARIMO installation verified.
```

### Exit Codes

- **0** — All tests passed
- **1** — One or more tests failed

### Key Behaviors

1. **Read-only** — Never modify any files
2. **Fast** — No agent spawning or network calls (except gh auth check)
3. **Safe** — No worktree creation, PR simulation, or state changes
4. **Lightweight** — Quick validation suitable for CI/pre-commit

---

## Behavior (Full Diagnostic)

Run seven diagnostic checks and display results with clear status indicators.

### Check 0: Version Status

Check if the installed KARIMO version is current by fetching the latest release from GitHub.

**Steps:**
1. Read `.karimo/VERSION` from the project root
2. Fetch latest version from GitHub releases API
3. Compare installed version against latest release

**Output:**

```
Check 0: Version Status
───────────────────────

  ✅ Version current    7.11.0

  Or if update available:

  ⚠️  Update available
      Installed: 7.10.0
      Available: 7.11.0
      Run: .karimo/update.sh

  Or if GitHub unreachable:

  ℹ️  Version: 7.11.0 (could not check GitHub for updates)
```

**Bash commands:**
```bash
# Read installed version
INSTALLED=$(cat .karimo/VERSION 2>/dev/null | tr -d '[:space:]')

# Fetch latest from GitHub
LATEST=$(curl -sL "https://api.github.com/repos/opensesh/KARIMO/releases/latest" | grep '"tag_name"' | head -1 | sed 's/.*"v\([^"]*\)".*/\1/')

# Compare
if [ -z "$LATEST" ]; then
    echo "ℹ️  Version: $INSTALLED (could not check GitHub for updates)"
elif [ "$INSTALLED" = "$LATEST" ]; then
    echo "✅ Version current    $INSTALLED"
else
    echo "⚠️  Update available"
    echo "    Installed: $INSTALLED"
    echo "    Available: $LATEST"
    echo "    Run: .karimo/update.sh"
fi
```

### Check 1: Environment

Verify required tools are available:

| Check | Command | Status |
|-------|---------|--------|
| Claude Code | `which claude` | ✅ Installed / ❌ Not found |
| GitHub CLI | `gh auth status` | ✅ Authenticated / ❌ Not authenticated |
| Git | `git --version` | ✅ 2.5+ (worktree support) / ⚠️ Older version |
| Review Provider | `config.yaml review_provider` | ✅ Configured / ℹ️ Not set (optional for Phase 2) |

**1c: Git Version Check**

```bash
GIT_VERSION=$(git --version | awk '{print $3}')
GIT_MAJOR=$(echo "$GIT_VERSION" | cut -d. -f1)
GIT_MINOR=$(echo "$GIT_VERSION" | cut -d. -f2)

if [ "$GIT_MAJOR" -lt 2 ] || { [ "$GIT_MAJOR" -eq 2 ] && [ "$GIT_MINOR" -lt 5 ]; }; then
    echo "⚠️  Git $GIT_VERSION (worktrees require 2.5+)"
else
    echo "✅ Git $GIT_VERSION (worktree support)"
fi
```

If Git version is < 2.5, show warning with upgrade recommendation:
- `⚠️ Git 2.4.0 — Worktrees require Git 2.5+. Upgrade before running /karimo:run.`

**Example output:**

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Doctor                                               │
╰──────────────────────────────────────────────────────────────╯

Check 1: Environment
────────────────────

  ✅ Claude Code     Installed
  ✅ GitHub CLI      Authenticated as @username
  ✅ Git             v2.43.0 (worktree support)
  ℹ️  Review         Not configured (optional for Phase 2)
                     Run /karimo:configure --review to set up
```

**Example output with Greptile:**

```
Check 1: Environment
────────────────────

  ✅ Claude Code     Installed
  ✅ GitHub CLI      Authenticated as @username
  ✅ Git             v2.43.0 (worktree support)
  ✅ Review          Greptile (workflow installed, API key set)
```

**Example output with Code Review:**

```
Check 1: Environment
────────────────────

  ✅ Claude Code     Installed
  ✅ GitHub CLI      Authenticated as @username
  ✅ Git             v2.43.0 (worktree support)
  ✅ Review          Claude Code Review
                     Setup at claude.ai/admin-settings/claude-code
```

### Check 1.5: GitHub Project Access

Verify GitHub Project permissions are configured and accessible.

**Step 0: Detect CLAUDE.md path**

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
    echo "❌ CLAUDE.md not found"
    CLAUDE_MD=""
fi
```

**Step 1: Check KARIMO section exists with markers**

```bash
# Check for marker-based KARIMO section (preferred)
grep -q "<!-- KARIMO:START" "$CLAUDE_MD"

# Or fall back to legacy ## KARIMO header
grep -q "## KARIMO" "$CLAUDE_MD"
```

**Step 2: Check GitHub Configuration exists**

```bash
# Check for GitHub Configuration table (within KARIMO section)
grep -q "### GitHub Configuration" "$CLAUDE_MD"
```

**Step 3: Read configuration and test project access**

```bash
# Parse owner from CLAUDE.md (or fall back to config.yaml)
OWNER=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
OWNER_TYPE=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner Type |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')

# If CLAUDE.md values are _pending_, try config.yaml
if [ "$OWNER" = "_pending_" ] && [ -f .karimo/config.yaml ]; then
  OWNER=$(grep "owner:" .karimo/config.yaml | head -1 | awk '{print $2}')
  OWNER_TYPE=$(grep "owner_type:" .karimo/config.yaml | head -1 | awk '{print $2}')
fi

# Test project access
if [ "$OWNER_TYPE" = "personal" ]; then
  gh project list --owner @me --limit 1
else
  gh project list --owner "$OWNER" --limit 1
fi
```

**Example output (success):**

```
Check 1.5: GitHub Project Access
────────────────────────────────

  ✅ KARIMO section present (with markers)
  ✅ GitHub Configuration present
      Owner: opensesh (organization)
  ✅ Project access verified
```

**Example output (pending configuration):**

```
Check 1.5: GitHub Project Access
────────────────────────────────

  ✅ KARIMO section present (with markers)
  ⚠️  GitHub Configuration has pending values
      Run /karimo:configure to detect and populate
```

**Example output (configuration missing):**

```
Check 1.5: GitHub Project Access
────────────────────────────────

  ❌ GitHub Configuration not found in CLAUDE.md
      Run /karimo:configure to add GitHub settings
```

**Example output (access denied):**

```
Check 1.5: GitHub Project Access
────────────────────────────────

  ✅ KARIMO section present (with markers)
  ✅ GitHub Configuration present
      Owner: opensesh (organization)
  ❌ Project access denied
      Cannot access projects for 'opensesh'
      Fix: gh auth refresh -s project
```

### Check 2: Installation Integrity

Verify all KARIMO files listed in `.karimo/MANIFEST.json` are present.

**Step 2a: Check manifest exists**

```bash
if [ ! -f .karimo/MANIFEST.json ]; then
  echo "❌ MANIFEST.json not found"
  exit 1
fi
```

**Step 2b: Read expected counts from manifest**

```bash
# Helper function for manifest parsing (jq-free, skips deprecated section)
# Uses 2-space indent to find root-level arrays (not nested in deprecated)
manifest_count() {
  local key="$1"
  sed -n "/^  \"$key\":/,/^  ]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | wc -l | tr -d ' '
}

EXPECTED_AGENTS=$(manifest_count "agents")
EXPECTED_COMMANDS=$(manifest_count "commands")
EXPECTED_SKILLS=$(manifest_count "skills")
EXPECTED_TEMPLATES=$(manifest_count "templates")
```

**Step 2c: Count actual files and compare**

```bash
ACTUAL_AGENTS=$(ls .claude/plugins/karimo/agents/*.md 2>/dev/null | wc -l)
ACTUAL_COMMANDS=$(ls .claude/plugins/karimo/commands/*.md 2>/dev/null | wc -l)
ACTUAL_SKILLS=$(ls .claude/plugins/karimo/skills/*.md 2>/dev/null | wc -l)
ACTUAL_TEMPLATES=$(ls .karimo/templates/*.md 2>/dev/null | wc -l)
```

**Step 2d: Verify each manifest file exists**

```bash
# Helper function to list manifest items (jq-free, skips deprecated section)
# Uses 2-space indent to find root-level arrays (not nested in deprecated)
manifest_list() {
  local key="$1"
  sed -n "/^  \"$key\":/,/^  ]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

# Check each file from manifest (handles plugins/karimo/ prefix in entries)
for agent in $(manifest_list "agents"); do
  [ -f ".claude/$agent" ] || echo "Missing: .claude/$agent"
done

for command in $(manifest_list "commands"); do
  [ -f ".claude/$command" ] || echo "Missing: .claude/$command"
done

for skill in $(manifest_list "skills"); do
  [ -f ".claude/$skill" ] || echo "Missing: .claude/$skill"
done

for template in $(manifest_list "templates"); do
  [ -f ".karimo/templates/$template" ] || echo "Missing: .karimo/templates/$template"
done
```

**Other checks:**
- `.claude/plugins/karimo/KARIMO_RULES.md` exists
- `CLAUDE.md` contains KARIMO section (check for `<!-- KARIMO:START` markers, fall back to `## KARIMO`)
- `.karimo/learnings/` directory exists with category subdirectories
- `.gitignore` contains `.worktrees/`

**Example output:**

```
Check 2: Installation Integrity
───────────────────────────────

  ✅ Manifest        Present (.karimo/MANIFEST.json)
  ✅ Agents          22/22 present (from manifest)
  ✅ Commands        11/11 present (from manifest)
  ✅ Skills          7/7 present (from manifest)
  ✅ Rules           KARIMO_RULES.md present
  ✅ Learnings       .karimo/learnings/ present (categorized)
  ✅ Templates       18/18 present (from manifest)
  ✅ CLAUDE.md       KARIMO section present (with markers)
  ✅ .gitignore      .worktrees/ entry present

  Or if issues found:

  ⚠️  Agents          21/22 present
      Missing: karimo/documenter-opus.md
  ❌ Commands        9/11 present
      Missing: karimo/doctor.md, karimo/help.md
```

### Check 2.5: Deprecated Files

Scan for deprecated files that should be removed.

**Deprecated Commands:**

```bash
# Check for deprecated command files
DEPRECATED_FOUND=0

[ -f ".claude/commands/karimo/cd-config.md" ] && DEPRECATED_FOUND=$((DEPRECATED_FOUND + 1))
[ -f ".claude/commands/karimo/execute.md" ] && DEPRECATED_FOUND=$((DEPRECATED_FOUND + 1))
[ -f ".claude/commands/karimo/orchestrate.md" ] && DEPRECATED_FOUND=$((DEPRECATED_FOUND + 1))
```

**Deprecated command mapping:**
- `karimo-cd-config.md` → Use `/karimo:configure --cd` instead
- `karimo-execute.md` → Use `/karimo:run` instead
- `karimo-orchestrate.md` → Use `/karimo:run` instead

**Example output (deprecated files found):**

```
Check 2.5: Deprecated Files
───────────────────────────

  ⚠️  Deprecated commands found (3)
      • karimo-cd-config.md
      • karimo-execute.md
      • karimo-orchestrate.md

  Action:
    These will be removed automatically on next /karimo:update

  Manual removal:
    rm -f .claude/commands/karimo/cd-config.md
    rm -f .claude/commands/karimo/execute.md
    rm -f .claude/commands/karimo/orchestrate.md
```

**Example output (no deprecated files):**

```
Check 2.5: Deprecated Files
───────────────────────────

  ✅ No deprecated files found
```

### Check 3: Configuration Validation

Validate KARIMO configuration files exist and detect drift from actual project state.

**Step 3a: Check CLAUDE.md has KARIMO section with markers**

```bash
# First detect CLAUDE.md path (case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f ".claude/claude.md" ]; then
    CLAUDE_MD=".claude/claude.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
elif [ -f "claude.md" ]; then
    CLAUDE_MD="claude.md"
else
    echo "CLAUDE.md not found"
    CLAUDE_MD=""
fi

# Prefer marker-based detection
if [ -n "$CLAUDE_MD" ] && grep -q "<!-- KARIMO:START" "$CLAUDE_MD"; then
  echo "KARIMO section found (with markers) in $CLAUDE_MD"
elif [ -n "$CLAUDE_MD" ] && grep -q "## KARIMO" "$CLAUDE_MD"; then
  echo "KARIMO section found (legacy format without markers) in $CLAUDE_MD"
  echo "⚠️  Consider reinstalling to use new marker format"
else
  echo "KARIMO section not found"
fi
```

**Step 3b: Check required config files exist**

```bash
# Check learnings directory
[ -d ".karimo/learnings" ] && echo "✅ learnings/" || echo "❌ learnings/ missing"

# Check rules file
[ -f ".claude/plugins/karimo/KARIMO_RULES.md" ] && echo "✅ KARIMO_RULES.md" || echo "❌ KARIMO_RULES.md missing"

# Check config file (created by /karimo:configure)
[ -f ".karimo/config.yaml" ] && echo "✅ config.yaml" || echo "⚠️ config.yaml missing (run /karimo:configure)"
```

**If no KARIMO section found:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ❌ No KARIMO section in CLAUDE.md

  The KARIMO reference block is missing from CLAUDE.md.

  Recommendation:
    Re-run the installer or manually add the KARIMO section
```

**Step 3c: Check for _pending_ markers in config.yaml**

Look for unresolved configuration placeholders:

```bash
grep "_pending_" .karimo/config.yaml 2>/dev/null
```

**If placeholders found:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ⚠️  Unresolved placeholders in config.yaml:
      - runtime: _pending_
      - build: _pending_

  Recommendation:
    Run /karimo:configure to complete configuration
```

**Step 3d: Drift detection**

Compare `.karimo/config.yaml` values against actual project state:

1. **Package manager drift** — Compare configured package_manager vs actual lock files:
   ```bash
   # Check for lock files
   ls pnpm-lock.yaml yarn.lock package-lock.json bun.lockb 2>/dev/null
   # Parse configured value from config.yaml
   grep "package_manager:" .karimo/config.yaml | awk '{print $2}'
   ```

2. **Command drift** — Compare configured commands vs `package.json` scripts:
   ```bash
   # Check if configured commands exist in package.json
   cat package.json | grep -o '"[^"]*"[[:space:]]*:' | tr -d '":' | head -20
   ```

**If drift detected:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ⚠️  Configuration drift detected

    - Package manager: config.yaml says "npm", found pnpm-lock.yaml
    - Test command: "npm test" but package.json has no test script
    - New lock file: bun.lockb appeared (not in config)

  Recommendation:
    Run /karimo:configure to update configuration
```

**Example output (healthy):**

```
Check 3: Configuration Validation
──────────────────────────────────

  ✅ CLAUDE.md         KARIMO section present (with markers)
  ✅ learnings/        Present (categorized directories)
  ✅ KARIMO_RULES.md   Present
  ✅ config.yaml       Present, no placeholders
  ✅ No drift          Config matches project state

  Project Context (from config.yaml):
      Runtime: Node.js 20
      Framework: Next.js 14
      Package Manager: pnpm

  Commands:
      Build: pnpm build
      Lint: pnpm lint
      Test: pnpm test
      Typecheck: pnpm typecheck

  Boundaries:
      Never Touch: 5 patterns defined
      Require Review: 3 patterns defined
```

### Check 4: Configuration Sanity

Verify configuration values are valid and match the project.

**Command cross-reference:**
- Check if configured commands exist in `package.json` scripts (for Node.js projects)
- Or equivalent for other runtimes

**Boundary pattern matching:**
- Verify glob patterns in Never Touch / Require Review match actual files
- Warn if patterns match no files (might be stale)

**Cost sanity checks:**
- Warn if no Never Touch patterns defined
- Warn if no Require Review patterns defined

**Example output:**

```
Check 4: Configuration Sanity
─────────────────────────────

  ✅ Commands verified
      All 4 commands exist in package.json scripts

  ✅ Boundary patterns
      Never Touch: 3 patterns, 12 files matched
      Require Review: 2 patterns, 5 files matched

  Or warnings:

  ⚠️  Command not found
      Typecheck: pnpm typecheck
      Not in package.json scripts

  ⚠️  Pattern matches no files
      Never Touch: migrations/**/*.sql
      Consider removing or updating pattern
```

### Check 5: Execution Mode Validation

Validate that the execution mode is properly configured and required tools are available.

**Step 5a: Read mode from config.yaml**

```bash
MODE=$(grep "^mode:" .karimo/config.yaml 2>/dev/null | awk '{print $2}')
if [ -z "$MODE" ]; then
  MODE="full"  # Default to full mode if not specified
  echo "ℹ️  Mode not specified in config.yaml, defaulting to: full"
fi
```

**If `mode: full`:**

1. **Validate GitHub MCP is configured:**

   Use `mcp__github__get_me` to test MCP connectivity:
   - If succeeds: ✅ "GitHub MCP configured"
   - If fails: ❌ "GitHub MCP not configured. Required for Full Mode."

   ```
   ❌ GitHub MCP not configured. Required for Full Mode.

   To configure GitHub MCP:
   1. Add the GitHub MCP server to your Claude Code settings
   2. Configure with your GitHub token
   3. See: https://github.com/modelcontextprotocol/servers/tree/main/src/github

   Alternatively, switch to Fast Track mode in .karimo/config.yaml:
     mode: fast-track
   ```

2. **Validate gh CLI authenticated:**
   ```bash
   gh auth status 2>/dev/null || { echo "❌ gh CLI not authenticated. Run: gh auth login"; }
   ```

3. **Validate project scope:**
   ```bash
   SCOPES=$(gh auth status 2>&1)
   if ! echo "$SCOPES" | grep -q "project"; then
     echo "❌ Missing 'project' scope. Run: gh auth refresh -s project"
   fi
   ```

4. **If all pass:**
   ```
   ✅ Full Mode ready
      GitHub MCP: configured
      gh CLI: authenticated as @username
      Project scope: available
   ```

**If `mode: fast-track`:**

1. **Validate git repository:**
   ```bash
   [ -d .git ] || { echo "❌ Not a git repository. Run: git init"; }
   ```

2. **If passes:**
   ```
   ✅ Fast Track Mode ready
      Git repository: initialized

   ⚠️  Fast Track Mode: No GitHub integration
      - Tasks will be committed directly (no issues/PRs)
      - No GitHub Projects visualization
      - Limited traceability and auditability
      - Consider Full Mode for production projects
   ```

**Example output (Full Mode ready):**

```
Check 5: Execution Mode Validation
──────────────────────────────────

  Mode: full

  ✅ GitHub MCP       Configured (authenticated as @username)
  ✅ gh CLI           Authenticated as @username
  ✅ Project scope    Available

  ✅ Full Mode ready. GitHub MCP + CLI configured.
```

**Example output (Fast Track Mode ready):**

```
Check 5: Execution Mode Validation
──────────────────────────────────

  Mode: fast-track

  ✅ Git repository   Initialized

  ✅ Fast Track Mode ready. Commits will go directly to main.

  ⚠️  Fast Track Mode: No GitHub integration
      - Tasks will be committed directly (no issues/PRs)
      - No GitHub Projects visualization
      - Limited traceability and auditability
```

---

### Check 6: Phase Assessment

Assess current adoption phase and PRD status.

**Phase detection:**
- **Phase 1:** Config exists, agents installed, commands work
- **Phase 2:** Review provider configured (Greptile workflow OR Code Review)
- **Phase 3:** GitHub-native monitoring (no additional setup)

**Review provider detection:**
```bash
# Read from config.yaml
REVIEW_PROVIDER=$(grep "^review_provider:" .karimo/config.yaml 2>/dev/null | awk '{print $2}')

# Check for Greptile workflow if provider is greptile
if [ "$REVIEW_PROVIDER" = "greptile" ]; then
  [ -f ".github/workflows/karimo-greptile-review.yml" ] || echo "⚠️ Workflow missing"
  [ -n "$GREPTILE_API_KEY" ] || echo "⚠️ API key not set"

  # Check for rules.md and whether it's project-specific
  if [ ! -f ".greptile/rules.md" ]; then
    echo "⚠️ Rules missing — Run /karimo:configure --greptile to generate"
  elif grep -q "GENERIC_TEMPLATE" ".greptile/rules.md" 2>/dev/null; then
    echo "⚠️ Rules generic — Run /karimo:configure --greptile to generate project-specific rules"
  fi
fi

# Check for REVIEW.md if provider is code-review
if [ "$REVIEW_PROVIDER" = "code-review" ]; then
  [ -f "REVIEW.md" ] || echo "ℹ️ Consider creating REVIEW.md for custom guidelines"
fi
```

**PRD inventory:**
- Count PRDs in `.karimo/prds/`
- Summarize statuses: draft, ready, approved, active, complete

**Example output (Greptile - fully configured):**

```
Check 5: Phase Assessment
─────────────────────────

  Phase Status:
    ✅ Phase 1    Configured (config + agents + commands)
    ✅ Phase 2    Greptile (workflow + rules + API key)
    ✅ Phase 3    GitHub-native monitoring

  PRDs:
    Total: 3
      ✓ user-profiles     complete
      ⋯ token-studio      active (4/8 tasks)
      ○ auth-refactor     ready (for execution)
```

**Example output (Greptile - missing project-specific rules):**

```
Check 5: Phase Assessment
─────────────────────────

  Phase Status:
    ✅ Phase 1    Configured (config + agents + commands)
    ⚠️  Phase 2    Greptile (workflow installed)
                  Rules generic — Run /karimo:configure --greptile to generate
    ✅ Phase 3    GitHub-native monitoring

  PRDs:
    Total: 1
      ○ user-profiles     ready (for execution)
```

**Example output (Code Review):**

```
Check 5: Phase Assessment
─────────────────────────

  Phase Status:
    ✅ Phase 1    Configured (config + agents + commands)
    ✅ Phase 2    Claude Code Review
    ✅ Phase 3    GitHub-native monitoring

  PRDs:
    Total: 2
      ✓ user-profiles     complete
      ⋯ auth-refactor     active (2/5 tasks)
```

**Example output (no review):**

```
Check 5: Phase Assessment
─────────────────────────

  Phase Status:
    ✅ Phase 1    Configured (config + agents + commands)
    ℹ️  Phase 2    No review provider (run /karimo:configure --review)
    ✅ Phase 3    GitHub-native monitoring

  PRDs:
    Total: 1
      ○ user-profiles     ready (for execution)
```

### Check 7: Execution Health

**Purpose:** Detect inconsistencies between status.json, git state, and GitHub that indicate interrupted execution.

**Skip this check if no active PRDs exist.**

#### 6a. Stale Running Tasks

Detect tasks marked "running" for > 4 hours:

```bash
# For each active PRD, parse status.json
# Compare started_at timestamps to current time
# If elapsed > 4 hours, report as stale

for prd in .karimo/prds/*/status.json; do
  # Parse running tasks with started_at
  # Calculate elapsed time
  # Report if > 4 hours (14400 seconds)
done
```

#### 6b. Worktree Health

Detect orphaned worktree branches and uncommitted changes.

**6b.1. Orphaned Worktree Branches (Git-Native Detection)**

Detect worktree branches for deleted PRDs or without open PRs (stale branches).

```bash
echo "Checking for orphaned worktree branches..."

# Get all worktree branches from git
worktree_branches=$(git branch --list 'worktree/*' --format='%(refname:short)')

orphans_deleted_prd=()
orphans_no_pr=()

for branch in $worktree_branches; do
  # Extract PRD slug from branch name (format: worktree/{prd-slug}-{task-id})
  # Task ID is always {digit}{letter}, so extract everything before final -{digit}{letter}
  prd_slug=$(echo "$branch" | sed 's|worktree/\(.*\)-[0-9][a-z]$|\1|')

  # Check if PRD folder exists
  if [ ! -d ".karimo/prds/$prd_slug" ]; then
    orphans_deleted_prd+=("$branch (PRD $prd_slug deleted)")
    continue
  fi

  # Check if branch has open PR
  if ! gh pr list --head "$branch" --state open --json number -q '.[0].number' >/dev/null 2>&1; then
    orphans_no_pr+=("$branch (no open PR)")
  fi
done

# Report orphans from deleted PRDs
if [ ${#orphans_deleted_prd[@]} -gt 0 ]; then
  echo "⚠️  Found ${#orphans_deleted_prd[@]} orphaned branches (PRD deleted):"
  for branch in "${orphans_deleted_prd[@]}"; do
    echo "   - $branch"
  done
  echo ""
fi

# Report stale branches (no PR)
if [ ${#orphans_no_pr[@]} -gt 0 ]; then
  echo "⚠️  Found ${#orphans_no_pr[@]} stale branches (no open PR):"
  for branch in "${orphans_no_pr[@]}"; do
    echo "   - $branch"
  done
  echo ""
fi

# Offer cleanup
if [ ${#orphans_deleted_prd[@]} -gt 0 ] || [ ${#orphans_no_pr[@]} -gt 0 ]; then
  total_orphans=$((${#orphans_deleted_prd[@]} + ${#orphans_no_pr[@]}))
  read -p "Delete these $total_orphans branches? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    for branch_info in "${orphans_deleted_prd[@]}" "${orphans_no_pr[@]}"; do
      branch=$(echo "$branch_info" | cut -d' ' -f1)
      git branch -D "$branch" 2>/dev/null
      git push origin --delete "$branch" 2>/dev/null
      echo "   ✅ Deleted $branch"
    done
  fi
else
  echo "✅ No orphaned worktree branches found"
fi
```

**Detection logic:**
1. **Orphan Type 1 (Deleted PRD):** Branch exists but `.karimo/prds/{prd-slug}/` doesn't
2. **Orphan Type 2 (Stale):** Branch exists but no open PR found via `gh pr list`

**No jq dependency:** Uses only standard bash, git, and gh CLI commands.

#### 6c. Ghost Branches

Detect branches referenced in status.json that no longer exist:

```bash
# Extract branch names from status.json
# Check each with: git rev-parse --verify {branch} 2>/dev/null
# Report missing branches
```

#### 6d. Status-PR Mismatch

Detect PRs that merged but status.json still shows `in-review`:

```bash
# Get merged PRs with karimo label
gh pr list --repo {owner}/{repo} --label karimo --state merged --json number

# Check status.json for tasks with matching pr_number still "in-review"
# Report mismatches
```

#### 6e. Pending Cleanup

Detect worktrees marked "pending-cleanup" for > 6 hours:

```bash
# Find tasks with worktree_status: "pending-cleanup"
# Compare merged_at to current time
# Check if worktree still exists on disk
# Report stale cleanup
```

**Example output:**

```
Check 6: Execution Health
─────────────────────────

  ⚠️  Stale running tasks (2)
      [2a] user-profiles — 6h 23m (threshold: 4h)
      [1c] token-studio — 4h 15m

  ⚠️  Pending cleanup (1)
      .worktrees/user-profiles/1a — 8h since merge

  ✅ No orphaned worktrees
  ✅ No ghost branches
  ✅ No status-PR mismatches

  Recovery:
    /karimo:run --prd user-profiles
    /karimo:run --prd token-studio
```

**Example output (healthy):**

```
Check 6: Execution Health
─────────────────────────

  ✅ No stale running tasks
  ✅ No orphaned worktrees
  ✅ No ghost branches
  ✅ No status-PR mismatches
  ✅ No pending cleanup

  Execution state is consistent.
```

## Output Format

Use KARIMO box-style header:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Doctor                                               │
╰──────────────────────────────────────────────────────────────╯
```

### Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Check passed |
| ⚠️ | Warning (non-blocking) |
| ❌ | Error (needs attention) |
| ℹ️ | Informational |

### Summary

End with a summary of findings:

```
Summary
───────

  ✅ 8 checks passed
  ⚠️  1 warning (placeholder in config)
  ❌ 0 errors

  Recommendations:
    1. Run /karimo:configure to resolve _pending_ placeholders
```

**Recommendation mapping:**

| Issue Type | Recommendation |
|------------|----------------|
| Version drift | Run `update.sh` from KARIMO source |
| Missing KARIMO section | `/karimo:configure` |
| Configuration drift | `/karimo:configure` |
| Placeholder values | `/karimo:configure` |
| Missing GitHub config | `/karimo:configure` |
| GitHub MCP not configured | Configure GitHub MCP server or switch to fast-track mode |
| Project access denied | `gh auth refresh -s project` |
| Missing project scope | `gh auth refresh -s project` |
| Missing files | Re-run installer |
| PRD creation | `/karimo:plan` |
| Stale running tasks | Re-run `/karimo:run --prd {slug}` |
| Orphaned worktrees | `git worktree remove <path>` |
| Ghost branches | Re-run `/karimo:run --prd {slug}` |
| Status-PR mismatch | Re-run `/karimo:run --prd {slug}` |
| Pending cleanup | Re-run `/karimo:run --prd {slug}` |
| Orphaned assets | Remove manually: `rm <filepath>` |
| Broken asset references | Re-download asset or remove from manifest |
| Asset size mismatch | Re-download asset |
| Greptile rules missing/generic | `/karimo:configure --greptile` |

Or if all checks pass:

```
Summary
───────

  ✅ All 8 checks passed

  KARIMO installation is healthy.
```

---

### Check 8: Asset Integrity

**Purpose:** Validate asset storage consistency across all PRDs.

**Skip this check if no PRDs exist or no assets.json files found.**

#### 8a. Manifest Validation

For each PRD with an `assets.json` file:

```bash
for prd_dir in .karimo/prds/*/; do
  prd_slug=$(basename "$prd_dir")
  manifest="${prd_dir}assets.json"

  if [ ! -f "$manifest" ]; then
    continue  # No assets for this PRD
  fi

  # Validate assets using Node.js CLI
  node .karimo/scripts/karimo-assets.js validate "$prd_slug"
done
```

#### 8b. Issues Detected

**Broken References:**
- Files listed in manifest but missing from disk
- Indicates accidental deletion or incomplete asset download

**Orphaned Files:**
- Files on disk in `assets/*/` folders but not tracked in manifest
- Indicates manual file additions or manifest corruption

**Size Mismatches:**
- File size on disk doesn't match manifest metadata
- Indicates file corruption or partial download

#### Output Format

```bash
Check 8: Asset Integrity
────────────────────────

PRD: user-profiles
  ✅ 5/5 assets validated

PRD: token-studio
  ✅ 3/3 assets validated
  ⚠️  1 orphaned file: assets/planning/old-mockup.png
      Run: rm .karimo/prds/token-studio/assets/planning/old-mockup.png

PRD: authentication-flow
  ❌ 1 broken reference: asset-003 (file missing from disk)
      Asset: planning-design-system-20260315151500.png
      Action: Re-download or remove from manifest

Summary:
  ✅ 8 assets validated across 3 PRDs
  ⚠️  1 orphaned asset (non-blocking)
  ❌ 1 broken reference (requires action)
```

**Status determination:**
- ✅ **Pass:** All assets valid (orphans are warnings, not failures)
- ⚠️  **Warning:** Orphaned files exist (cleanup recommended)
- ❌ **Fail:** Broken references exist (requires user action)

#### Recommendations

| Issue Type | Recommendation |
|------------|----------------|
| Orphaned files | Remove manually or update manifest to track them |
| Broken references | Re-download asset or remove manifest entry |
| Size mismatches | Re-download asset (indicates corruption) |

---

## Error States

### Not a KARIMO Project

If no KARIMO installation detected:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Doctor                                               │
╰──────────────────────────────────────────────────────────────╯

❌ KARIMO not installed in this project.

No .karimo/ directory or .claude/commands/ found.

To install KARIMO:
  bash /path/to/KARIMO/.karimo/install.sh .

See: https://github.com/opensesh/KARIMO
```

### Partial Installation

If some files missing:

```
❌ Partial installation detected.

Missing components:
  - .claude/plugins/karimo/agents/pm.md
  - .karimo/templates/TASK_SCHEMA.md

Recommendation:
  Re-run the installer to repair:
  bash /path/to/KARIMO/.karimo/install.sh .
```

## Implementation Notes

### Bash Commands Used

```bash
# Check 0: Version Status
cat .karimo/VERSION 2>/dev/null
curl -sL "https://api.github.com/repos/opensesh/KARIMO/releases/latest" | grep '"tag_name"'

# Check 1: Environment
which claude
gh auth status
git --version

# Check 1.5: GitHub Project Access
# First detect CLAUDE.md path (case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then CLAUDE_MD=".claude/CLAUDE.md"; elif [ -f ".claude/claude.md" ]; then CLAUDE_MD=".claude/claude.md"; elif [ -f "CLAUDE.md" ]; then CLAUDE_MD="CLAUDE.md"; elif [ -f "claude.md" ]; then CLAUDE_MD="claude.md"; else CLAUDE_MD=""; fi
grep -q "### GitHub Configuration" "$CLAUDE_MD"
# Parse owner from CLAUDE.md
OWNER=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
OWNER_TYPE=$(grep -A5 "### GitHub Configuration" "$CLAUDE_MD" | grep "Owner Type |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
# Test project access
if [ "$OWNER_TYPE" = "personal" ]; then
  gh project list --owner @me --limit 1
else
  gh project list --owner "$OWNER" --limit 1
fi

# Check 2: Installation (manifest-driven, jq-free)
# Helper functions for manifest parsing (skips deprecated section)
# Uses 2-space indent to find root-level arrays (not nested in deprecated)
manifest_list() {
  local key="$1"
  sed -n "/^  \"$key\":/,/^  ]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

manifest_count() {
  manifest_list "$1" | wc -l | tr -d ' '
}

# Read expected counts from manifest
EXPECTED_AGENTS=$(manifest_count "agents")
EXPECTED_COMMANDS=$(manifest_count "commands")
EXPECTED_SKILLS=$(manifest_count "skills")
EXPECTED_TEMPLATES=$(manifest_count "templates")

# Count actual files (plugins/karimo/ subdirectory per manifest structure)
ACTUAL_AGENTS=$(ls .claude/plugins/karimo/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_COMMANDS=$(ls .claude/plugins/karimo/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_SKILLS=$(ls .claude/plugins/karimo/skills/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_TEMPLATES=$(ls .karimo/templates/*.md 2>/dev/null | wc -l | tr -d ' ')

# Verify each file from manifest exists (handles plugins/karimo/ prefix)
for agent in $(manifest_list "agents"); do
  [ -f ".claude/$agent" ] || echo "Missing: .claude/$agent"
done

for command in $(manifest_list "commands"); do
  [ -f ".claude/$command" ] || echo "Missing: .claude/$command"
done

for skill in $(manifest_list "skills"); do
  [ -f ".claude/$skill" ] || echo "Missing: .claude/$skill"
done

# Check 3: Configuration
# 3a: Detect CLAUDE.md path and check KARIMO section exists (prefer markers, case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then CLAUDE_MD=".claude/CLAUDE.md"; elif [ -f ".claude/claude.md" ]; then CLAUDE_MD=".claude/claude.md"; elif [ -f "CLAUDE.md" ]; then CLAUDE_MD="CLAUDE.md"; elif [ -f "claude.md" ]; then CLAUDE_MD="claude.md"; else CLAUDE_MD=""; fi
[ -n "$CLAUDE_MD" ] && { grep -q "<!-- KARIMO:START" "$CLAUDE_MD" || grep -q "## KARIMO" "$CLAUDE_MD"; }

# 3b: Check required config files exist
[ -d ".karimo/learnings" ]
[ -f ".claude/plugins/karimo/KARIMO_RULES.md" ]
[ -f ".karimo/config.yaml" ]

# 3c: Check for _pending_ markers in config.yaml
grep "_pending_" .karimo/config.yaml 2>/dev/null

# 3d: Drift detection
# Compare configured package manager vs actual lock files
ls pnpm-lock.yaml yarn.lock package-lock.json bun.lockb 2>/dev/null
# Read configured package manager from config.yaml
grep "package_manager:" .karimo/config.yaml | awk '{print $2}'
# Check if configured commands exist in package.json
cat package.json | grep -o '"[^"]*"[[:space:]]*:' | tr -d '":' | head -20

# Check 4: Sanity
# Parse package.json for script names
# Use glob to check boundary patterns

# Check 5: Phase Assessment
ls .karimo/prds/*/status.json
# Parse status.json files for state

# Check 6: Execution Mode Validation
grep "^execution_mode:" .karimo/config.yaml

# Check 7: Execution Health
# Parse status.json for running tasks with timestamps
# Check git worktree list for orphaned worktrees
git worktree list
git branch --list 'worktree/*'

# Check 8: Asset Integrity
# For each PRD with assets.json
for prd_dir in .karimo/prds/*/; do
  prd_slug=$(basename "$prd_dir")
  manifest="${prd_dir}assets.json"

  if [ -f "$manifest" ]; then
    node .karimo/scripts/karimo-assets.js validate "$prd_slug"
  fi
done
```

### Key Implementation Behaviors

1. **Read-only** — Never modify any files
2. **Graceful degradation** — Report what can be checked even if some checks fail
3. **Actionable recommendations** — Always tell the user what to do next
4. **Exit early if not installed** — Don't run checks if clearly not a KARIMO project

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:configure` | Create or update project configuration |
| `/karimo:plan` | Create PRD (configuration should be ready first) |
| `/karimo:dashboard` | View execution progress and system health |
| `/karimo:feedback` | Capture learnings |

---

## Migration from /karimo-test

`/karimo-test` has been merged into `/karimo:doctor --test`.

**Old:** `/karimo-test`
**New:** `/karimo:doctor --test`

The `--test` flag provides the same quick pass/fail verification as the former `/karimo-test` command.
