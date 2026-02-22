# /karimo:doctor — Diagnostic Command

Check the health of a KARIMO installation, identify issues, and provide actionable recommendations.

## Usage

```
/karimo:doctor
```

**This command is read-only and never modifies files.**

## Behavior

Run six diagnostic checks and display results with clear status indicators.

### Check 0: Version Status

Check if the installed KARIMO version is current.

**Steps:**
1. Read `.karimo/VERSION` from the project root
2. If `KARIMO_SOURCE_PATH` environment variable is set, read `VERSION` from source
3. Compare installed version against source version

**Output:**

```
Check 0: Version Status
───────────────────────

  ✅ Version current    2.6.0

  Or if update available:

  ⚠️  Update available
      Installed: 2.5.0
      Available: 2.6.0
      Run: bash $KARIMO_SOURCE_PATH/.karimo/update.sh .

  Or if source path unknown:

  ℹ️  Version: 2.6.0 (source path unknown, cannot check for updates)
      Set KARIMO_SOURCE_PATH to enable version checking
```

**Bash commands:**
```bash
# Read installed version
cat .karimo/VERSION 2>/dev/null

# Read source version (if path known)
cat "$KARIMO_SOURCE_PATH/.karimo/VERSION" 2>/dev/null
```

### Check 1: Environment

Verify required tools are available:

| Check | Command | Status |
|-------|---------|--------|
| Claude Code | `which claude` | ✅ Installed / ❌ Not found |
| GitHub CLI | `gh auth status` | ✅ Authenticated / ❌ Not authenticated |
| Git | `git --version` | ✅ 2.5+ (worktree support) / ⚠️ Older version |
| Greptile API | `GREPTILE_API_KEY` env var | ✅ Set / ℹ️ Not set (optional for Phase 2) |

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
  ℹ️  Greptile       Not configured (optional for Phase 2)
```

### Check 1.5: GitHub Project Access

Verify GitHub Project permissions are configured and accessible.

**Step 1: Check GitHub Configuration exists in CLAUDE.md**

```bash
grep -q "### GitHub Configuration" CLAUDE.md
```

**Step 2: Read configuration and test project access**

```bash
# Parse owner from CLAUDE.md
OWNER=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
OWNER_TYPE=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner Type |" | awk -F'|' '{print $3}' | tr -d ' ')

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

  ✅ GitHub Configuration present
      Owner: opensesh (organization)
  ✅ Project access verified
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
# Helper function for manifest parsing (jq-free)
manifest_count() {
  local key="$1"
  sed -n "/\"$key\"/,/]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | wc -l | tr -d ' '
}

EXPECTED_AGENTS=$(manifest_count "agents")
EXPECTED_COMMANDS=$(manifest_count "commands")
EXPECTED_SKILLS=$(manifest_count "skills")
EXPECTED_TEMPLATES=$(manifest_count "templates")
```

**Step 2c: Count actual files and compare**

```bash
ACTUAL_AGENTS=$(ls .claude/agents/karimo-*.md 2>/dev/null | wc -l)
ACTUAL_COMMANDS=$(ls .claude/commands/*.md 2>/dev/null | wc -l)
ACTUAL_SKILLS=$(ls .claude/skills/*.md 2>/dev/null | wc -l)
ACTUAL_TEMPLATES=$(ls .karimo/templates/*.md 2>/dev/null | wc -l)
```

**Step 2d: Verify each manifest file exists**

```bash
# Helper function to list manifest items (jq-free)
manifest_list() {
  local key="$1"
  sed -n "/\"$key\"/,/]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

# Check each agent from manifest
for agent in $(manifest_list "agents"); do
  [ -f ".claude/agents/$agent" ] || echo "Missing: $agent"
done

# Similar for commands, skills, templates
```

**Other checks:**
- `.claude/KARIMO_RULES.md` exists
- `CLAUDE.md` contains `## KARIMO Framework` section
- `.gitignore` contains `.worktrees/`

**Example output:**

```
Check 2: Installation Integrity
───────────────────────────────

  ✅ Manifest        Present (.karimo/MANIFEST.json)
  ✅ Agents          13/13 present (from manifest)
  ✅ Commands        10/10 present (from manifest)
  ✅ Skills          5/5 present (from manifest)
  ✅ Rules           KARIMO_RULES.md present
  ✅ Templates       9/9 present (from manifest)
  ✅ Workflows       5/5 present (1 required, 4 optional)
  ✅ CLAUDE.md       KARIMO Framework section present
  ✅ .gitignore      .worktrees/ entry present

  Or if issues found:

  ⚠️  Agents          12/13 present
      Missing: karimo-documenter-opus.md
  ❌ Commands        8/10 present
      Missing: doctor.md, test.md
```

### Check 3: Configuration Validation

Validate CLAUDE.md configuration and detect drift from actual project state.

**Step 3a: Check CLAUDE.md exists with KARIMO section**

```bash
grep -q "## KARIMO Framework" CLAUDE.md
```

**If no KARIMO section found:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ❌ No KARIMO Framework section in CLAUDE.md

  CLAUDE.md is the source of truth for KARIMO configuration.
  Without it, agents cannot execute tasks properly.

  Recommendation:
    Run /karimo:configure to create configuration
```

**Step 3b: Check for _pending_ markers**

Look for unresolved configuration placeholders:

```bash
grep "_pending_" CLAUDE.md | grep -E "(Runtime|Framework|Package Manager|Build|Lint|Test|Typecheck)"
```

**If placeholders found:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ⚠️  Unresolved placeholders:
      - Runtime: _pending_
      - Build command: _pending_

  Recommendation:
    Run /karimo:configure to complete configuration
```

**Step 3c: Drift detection**

Compare CLAUDE.md values against actual project state:

1. **Package manager drift** — Compare configured package_manager vs actual lock files:
   ```bash
   # Check for lock files
   ls pnpm-lock.yaml yarn.lock package-lock.json bun.lockb 2>/dev/null
   # Parse configured value from CLAUDE.md
   grep "Package Manager" CLAUDE.md | sed 's/.*| *\([^|]*\) *|$/\1/' | tr -d ' '
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

    - Package manager: CLAUDE.md says "npm", found pnpm-lock.yaml
    - Test command: "npm test" but package.json has no test script
    - New lock file: bun.lockb appeared (not in config)

  Recommendation:
    Run /karimo:configure to update configuration
```

**Example output (healthy):**

```
Check 3: Configuration Validation
──────────────────────────────────

  ✅ CLAUDE.md         KARIMO Framework section present
  ✅ No placeholders   All configuration values set
  ✅ No drift          Config matches project state

  Project Context:
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

### Check 5: Phase Assessment

Assess current adoption phase and PRD status.

**Phase detection:**
- **Phase 1:** Config exists, agents installed, commands work
- **Phase 2:** Greptile workflow installed + API key configured
- **Phase 3:** Coming soon

**PRD inventory:**
- Count PRDs in `.karimo/prds/`
- Summarize statuses: draft, ready, approved, active, complete

**Example output:**

```
Check 5: Phase Assessment
─────────────────────────

  Phase Status:
    ✅ Phase 1    Configured (config + agents + commands)
    ✅ Phase 2    Enabled (Greptile workflow + API key)
    ℹ️  Phase 3    Coming soon

  PRDs:
    Total: 3
      ✓ user-profiles     complete
      ⋯ token-studio      active (4/8 tasks)
      ○ auth-refactor     ready (for execution)
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

  ✅ 6 checks passed
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
| Project access denied | `gh auth refresh -s project` |
| Missing files | Re-run installer |
| PRD creation | `/karimo:plan` |

Or if all checks pass:

```
Summary
───────

  ✅ All 6 checks passed

  KARIMO installation is healthy.
```

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
  - .claude/agents/karimo-pm.md
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
cat "$KARIMO_SOURCE_PATH/.karimo/VERSION" 2>/dev/null

# Check 1: Environment
which claude
gh auth status
git --version

# Check 1.5: GitHub Project Access
grep -q "### GitHub Configuration" CLAUDE.md
# Parse owner from CLAUDE.md
OWNER=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
OWNER_TYPE=$(grep -A5 "### GitHub Configuration" CLAUDE.md | grep "Owner Type |" | head -1 | awk -F'|' '{print $3}' | tr -d ' ')
# Test project access
if [ "$OWNER_TYPE" = "personal" ]; then
  gh project list --owner @me --limit 1
else
  gh project list --owner "$OWNER" --limit 1
fi

# Check 2: Installation (manifest-driven, jq-free)
# Helper functions for manifest parsing
manifest_list() {
  local key="$1"
  sed -n "/\"$key\"/,/]/p" .karimo/MANIFEST.json | grep '"' | grep -v "\"$key\"" | sed 's/.*"\([^"]*\)".*/\1/'
}

manifest_count() {
  manifest_list "$1" | wc -l | tr -d ' '
}

# Read expected counts from manifest
EXPECTED_AGENTS=$(manifest_count "agents")
EXPECTED_COMMANDS=$(manifest_count "commands")
EXPECTED_SKILLS=$(manifest_count "skills")
EXPECTED_TEMPLATES=$(manifest_count "templates")

# Count actual files
ACTUAL_AGENTS=$(ls .claude/agents/karimo-*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_COMMANDS=$(ls .claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_SKILLS=$(ls .claude/skills/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_TEMPLATES=$(ls .karimo/templates/*.md 2>/dev/null | wc -l | tr -d ' ')

# Verify each file from manifest exists
for agent in $(manifest_list "agents"); do
  [ -f ".claude/agents/$agent" ] || echo "Missing: $agent"
done

# Check 3: Configuration (CLAUDE.md is source of truth)
# 3a: Check KARIMO Framework section exists
grep -q "## KARIMO Framework" CLAUDE.md

# 3b: Check for _pending_ markers
grep "_pending_" CLAUDE.md | grep -E "(Runtime|Framework|Package Manager|Build|Lint|Test|Typecheck)"

# 3c: Drift detection
# Compare configured package manager vs actual lock files
ls pnpm-lock.yaml yarn.lock package-lock.json bun.lockb 2>/dev/null
# Read configured package manager from CLAUDE.md
grep "Package Manager" CLAUDE.md | sed 's/.*| *\([^|]*\) *|$/\1/'
# Check if configured commands exist in package.json
cat package.json | grep -o '"[^"]*"[[:space:]]*:' | tr -d '":' | head -20

# Check 4: Sanity
# Parse package.json for script names
# Use glob to check boundary patterns

# Check 5: Phase Assessment
ls .karimo/prds/*/status.json
# Parse status.json files for state
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
| `/karimo:status` | View execution progress |
| `/karimo:feedback` | Capture learnings |
