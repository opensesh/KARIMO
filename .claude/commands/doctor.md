# /karimo:doctor — Diagnostic Command

Check the health of a KARIMO installation, identify issues, and provide actionable recommendations.

## Usage

```
/karimo:doctor
```

**This command is read-only and never modifies files.**

## Behavior

Run five diagnostic checks and display results with clear status indicators.

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

### Check 2: Installation Integrity

Verify all KARIMO files are present:

**Agents (10 expected):**
- `.claude/agents/karimo-interviewer.md`
- `.claude/agents/karimo-investigator.md`
- `.claude/agents/karimo-reviewer.md`
- `.claude/agents/karimo-brief-writer.md`
- `.claude/agents/karimo-pm.md`
- `.claude/agents/karimo-review-architect.md`
- `.claude/agents/karimo-learn-auditor.md`
- `.claude/agents/karimo-implementer.md`
- `.claude/agents/karimo-tester.md`
- `.claude/agents/karimo-documenter.md`

**Commands (7 expected):**
- `.claude/commands/plan.md`
- `.claude/commands/review.md`
- `.claude/commands/execute.md`
- `.claude/commands/status.md`
- `.claude/commands/feedback.md`
- `.claude/commands/learn.md`
- `.claude/commands/doctor.md`

**Skills (5 expected):**
- `.claude/skills/git-worktree-ops.md`
- `.claude/skills/github-project-ops.md`
- `.claude/skills/karimo-code-standards.md`
- `.claude/skills/karimo-testing-standards.md`
- `.claude/skills/karimo-doc-standards.md`

**Rules:**
- `.claude/KARIMO_RULES.md`

**Templates (7 expected):**
- `.karimo/templates/PRD_TEMPLATE.md`
- `.karimo/templates/INTERVIEW_PROTOCOL.md`
- `.karimo/templates/TASK_SCHEMA.md`
- `.karimo/templates/STATUS_SCHEMA.md`
- `.karimo/templates/LEARN_INTERVIEW_PROTOCOL.md`
- `.karimo/templates/FINDINGS_TEMPLATE.md`
- `.karimo/templates/TASK_BRIEF_TEMPLATE.md`

**GitHub Workflows:**
- `.github/workflows/karimo-sync.yml` (required)
- `.github/workflows/karimo-dependency-watch.yml` (required)
- `.github/workflows/karimo-ci-integration.yml` (optional)
- `.github/workflows/karimo-greptile-review.yml` (optional)

**Other:**
- `CLAUDE.md` contains `## KARIMO Framework` section
- `.gitignore` contains `.worktrees/`

**Example output:**

```
Check 2: Installation Integrity
───────────────────────────────

  ✅ Agents          10/10 present
  ✅ Commands        7/7 present
  ✅ Skills          5/5 present
  ✅ Rules           KARIMO_RULES.md present
  ✅ Templates       7/7 present
  ✅ Workflows       4/4 present (2 required, 2 optional)
  ✅ CLAUDE.md       KARIMO Framework section present
  ✅ .gitignore      .worktrees/ entry present

  Or if issues found:

  ⚠️  Agents          9/10 present
      Missing: karimo-documenter.md
  ❌ Commands        5/7 present
      Missing: doctor.md, learn.md
```

### Check 3: Configuration Validation

Parse `CLAUDE.md` and validate the KARIMO configuration section.

**If no config section:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ⚠️  No KARIMO Framework section in CLAUDE.md

  Recommendation:
    Run /karimo:plan to auto-detect project configuration
```

**If config exists, validate:**

1. **Placeholder check** — Look for `_pending_` values:
   ```
   ⚠️  Unresolved placeholders:
       - Runtime: _pending_
       - Build command: _pending_

   Recommendation:
     Run /karimo:plan to auto-detect, or edit CLAUDE.md manually
   ```

2. **Schema validation** — Check for expected keys in tables:
   - Project Context: Runtime, Framework, Package Manager
   - Commands: Build, Lint, Test, Typecheck
   - Boundaries: Never Touch, Require Review

**Example output:**

```
Check 3: Configuration Validation
──────────────────────────────────

  ✅ Project Context
      Runtime: Node.js 20
      Framework: Next.js 14
      Package Manager: pnpm

  ✅ Commands
      Build: pnpm build
      Lint: pnpm lint
      Test: pnpm test
      Typecheck: pnpm typecheck

  ✅ Boundaries
      Never Touch: 3 patterns defined
      Require Review: 2 patterns defined
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
      ○ auth-refactor     approved (ready for execution)
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

  ✅ 4 checks passed
  ⚠️  1 warning (placeholder in config)
  ❌ 0 errors

  Recommendations:
    1. Run /karimo:plan to resolve _pending_ placeholders
```

Or if all checks pass:

```
Summary
───────

  ✅ All 5 checks passed

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
# Check 1: Environment
which claude
gh auth status
git --version

# Check 2: Installation (via file existence)
ls .claude/agents/*.md | wc -l
ls .claude/commands/*.md | wc -l
# etc.

# Check 3: Configuration
grep "_pending_" CLAUDE.md
grep "## KARIMO Framework" CLAUDE.md

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
| `/karimo:plan` | Create PRD and auto-detect configuration |
| `/karimo:status` | View execution progress |
| `/karimo:feedback` | Capture learnings |
