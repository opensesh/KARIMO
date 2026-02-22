# /karimo:test — Installation Smoke Test

Verify KARIMO installation works end-to-end without creating real PRDs or spawning agents.

## Usage

```
/karimo:test
```

**This command is read-only and never modifies files.**

## Purpose

Run synthetic validation tests to ensure all KARIMO components are correctly installed and functional. This is a lightweight alternative to running a full PRD cycle for verification.

## Test Suite

### Test 1: File Presence Validation

Verify all required KARIMO files exist. Expected counts are read from `.karimo/MANIFEST.json`.

**Read expected counts from manifest:**
```bash
# Check manifest exists
if [ ! -f .karimo/MANIFEST.json ]; then
  echo "❌ MANIFEST.json not found"
  exit 1
fi

# Read expected counts
EXPECTED_AGENTS=$(jq '.agents | length' .karimo/MANIFEST.json)
EXPECTED_COMMANDS=$(jq '.commands | length' .karimo/MANIFEST.json)
EXPECTED_SKILLS=$(jq '.skills | length' .karimo/MANIFEST.json)
EXPECTED_TEMPLATES=$(jq '.templates | length' .karimo/MANIFEST.json)
```

**Count actual files:**
```bash
ACTUAL_AGENTS=$(ls .claude/agents/karimo-*.md 2>/dev/null | wc -l)
ACTUAL_COMMANDS=$(ls .claude/commands/*.md 2>/dev/null | wc -l)
ACTUAL_SKILLS=$(ls .claude/skills/*.md 2>/dev/null | wc -l)
ACTUAL_TEMPLATES=$(ls .karimo/templates/*.md 2>/dev/null | wc -l)
```

**Verify counts match:**
```bash
[ "$ACTUAL_AGENTS" -eq "$EXPECTED_AGENTS" ] && echo "✅ Agents" || echo "❌ Agents"
[ "$ACTUAL_COMMANDS" -eq "$EXPECTED_COMMANDS" ] && echo "✅ Commands" || echo "❌ Commands"
[ "$ACTUAL_SKILLS" -eq "$EXPECTED_SKILLS" ] && echo "✅ Skills" || echo "❌ Skills"
[ "$ACTUAL_TEMPLATES" -eq "$EXPECTED_TEMPLATES" ] && echo "✅ Templates" || echo "❌ Templates"
```

**Output:**
```
Test 1: File Presence
─────────────────────

  ✅ Manifest    Present (.karimo/MANIFEST.json)
  ✅ Agents      13/13 present (from manifest)
  ✅ Commands    10/10 present (from manifest)
  ✅ Skills      5/5 present (from manifest)
  ✅ Templates   9/9 present (from manifest)
```

### Test 2: Template Parsing Validation

Ensure all templates listed in manifest have valid markdown structure.

**Checks:**
- Each template listed in manifest exists
- Each template file is readable
- Each template contains at least one markdown heading (`#`)

```bash
# Check each template from manifest
for template in $(jq -r '.templates[]' .karimo/MANIFEST.json); do
  if [ -f ".karimo/templates/$template" ]; then
    head -20 ".karimo/templates/$template" | grep -q "^#" && echo "✅ $template" || echo "❌ $template (no heading)"
  else
    echo "❌ $template (missing)"
  fi
done
```

**Output:**
```
Test 2: Template Parsing
────────────────────────

  ✅ DAG_SCHEMA.md                  Valid structure
  ✅ DEPENDENCIES_TEMPLATE.md       Valid structure
  ✅ FINDINGS_TEMPLATE.md           Valid structure
  ✅ INTERVIEW_PROTOCOL.md          Valid structure
  ✅ LEARN_INTERVIEW_PROTOCOL.md    Valid structure
  ✅ PRD_TEMPLATE.md                Valid structure
  ✅ STATUS_SCHEMA.md               Valid structure
  ✅ TASK_BRIEF_TEMPLATE.md         Valid structure
  ✅ TASK_SCHEMA.md                 Valid structure
```

### Test 3: GitHub CLI Authentication

Verify `gh auth status` succeeds.

```bash
gh auth status
```

**Output:**
```
Test 3: GitHub CLI Auth
───────────────────────

  ✅ Authenticated as @username
```

Or on failure:
```
  ❌ Not authenticated
     Run: gh auth login
```

### Test 4: State File Integrity

Verify `.karimo/state.json` is valid JSON (if it exists).

```bash
# Check if state.json exists
if [ -f .karimo/state.json ]; then
  # Validate JSON structure
  jq empty .karimo/state.json 2>/dev/null && echo "Valid JSON" || echo "Invalid JSON"
else
  echo "No state.json (OK for new installations)"
fi
```

**Output:**
```
Test 4: State File Integrity
────────────────────────────

  ✅ state.json           Valid JSON structure
  ✅ prds/ directory      Exists with .gitkeep
```

Or for new installations:
```
  ℹ️  state.json           Not present (OK for new installations)
  ✅ prds/ directory      Exists with .gitkeep
```

### Test 5: CLAUDE.md Integration

Verify KARIMO Framework section exists and parses correctly in CLAUDE.md.

```bash
# Check for KARIMO Framework section
grep -q "## KARIMO Framework" CLAUDE.md && echo "Section found" || echo "Section missing"

# Check for key subsections
grep -q "### Slash Commands" CLAUDE.md
grep -q "### Project Context" CLAUDE.md
```

**Output:**
```
Test 5: CLAUDE.md Integration
─────────────────────────────

  ✅ KARIMO Framework section    Present
  ✅ Project Context subsection  Present
  ✅ Slash Commands subsection   Present
  ✅ Workflows subsection        Present
```

## Output Format

Use KARIMO box-style header:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Smoke Test                                           │
╰──────────────────────────────────────────────────────────────╯
```

### Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Test passed |
| ⚠️ | Warning (non-blocking) |
| ❌ | Test failed |
| ℹ️ | Informational |

### Summary

End with a summary of test results:

```
Summary
───────

  ✅ 5/5 tests passed

  KARIMO installation verified.
```

Or on failure:

```
Summary
───────

  ✅ 4/5 tests passed
  ❌ 1 test failed

  Failed tests:
    - Test 3: GitHub CLI not authenticated

  Recommendations:
    1. Run `gh auth login` to authenticate
```

## Difference from /karimo:doctor

| Aspect | `/karimo:doctor` | `/karimo:test` |
|--------|------------------|----------------|
| Purpose | Diagnose issues, check health | Verify installation works |
| Scope | Configuration, environment, PRD status | File presence, structure validity |
| When to use | When something seems broken | After install, before first PRD |
| Output focus | Problems and recommendations | Pass/fail verification |

## Implementation Notes

### Key Behaviors

1. **Read-only** — Never modify any files
2. **Fast** — No agent spawning or network calls (except gh auth check)
3. **Safe** — No worktree creation, PR simulation, or state changes
4. **Lightweight** — Quick validation suitable for CI/pre-commit

### No Artifacts

This command does not:
- Create PRDs
- Spawn agents
- Create worktrees
- Make API calls (except `gh auth status`)
- Modify state files

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:doctor` | Detailed health check with recommendations |
| `/karimo:configure` | Create or update configuration |
| `/karimo:plan` | Create first PRD (after tests pass) |
