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

Verify all required KARIMO files exist.

**Agents (10 expected):**
```bash
ls .claude/agents/karimo-*.md | wc -l
```

Expected files:
- `karimo-interviewer.md`
- `karimo-investigator.md`
- `karimo-reviewer.md`
- `karimo-brief-writer.md`
- `karimo-pm.md`
- `karimo-review-architect.md`
- `karimo-learn-auditor.md`
- `karimo-implementer.md`
- `karimo-tester.md`
- `karimo-documenter.md`

**Commands (10 expected):**
```bash
ls .claude/commands/*.md | wc -l
```

Expected files:
- `plan.md`
- `review.md`
- `overview.md`
- `execute.md`
- `status.md`
- `configure.md`
- `feedback.md`
- `learn.md`
- `doctor.md`
- `test.md` (this file)

**Skills (5 expected):**
```bash
ls .claude/skills/*.md | wc -l
```

Expected files:
- `git-worktree-ops.md`
- `github-project-ops.md`
- `karimo-code-standards.md`
- `karimo-testing-standards.md`
- `karimo-doc-standards.md`

**Templates (7 expected):**
```bash
ls .karimo/templates/*.md | wc -l
```

Expected files:
- `PRD_TEMPLATE.md`
- `INTERVIEW_PROTOCOL.md`
- `TASK_SCHEMA.md`
- `STATUS_SCHEMA.md`
- `LEARN_INTERVIEW_PROTOCOL.md`
- `FINDINGS_TEMPLATE.md`
- `TASK_BRIEF_TEMPLATE.md`

**Output:**
```
Test 1: File Presence
─────────────────────

  ✅ Agents     10/10 present
  ✅ Commands   10/10 present
  ✅ Skills     5/5 present
  ✅ Templates  7/7 present
```

### Test 2: Template Parsing Validation

Ensure all templates have valid markdown structure with expected sections.

**Checks:**
- Each template file is readable
- Each template contains at least one markdown heading (`#`)
- No syntax errors in template structure

```bash
# Check each template is readable and has headings
for f in .karimo/templates/*.md; do
  head -20 "$f" | grep -q "^#" && echo "OK: $f" || echo "FAIL: $f"
done
```

**Output:**
```
Test 2: Template Parsing
────────────────────────

  ✅ PRD_TEMPLATE.md              Valid structure
  ✅ INTERVIEW_PROTOCOL.md        Valid structure
  ✅ TASK_SCHEMA.md               Valid structure
  ✅ STATUS_SCHEMA.md             Valid structure
  ✅ LEARN_INTERVIEW_PROTOCOL.md  Valid structure
  ✅ FINDINGS_TEMPLATE.md         Valid structure
  ✅ TASK_BRIEF_TEMPLATE.md       Valid structure
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
