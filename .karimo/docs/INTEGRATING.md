# Integrating KARIMO into Existing Projects

Guide for adding KARIMO to projects that already use Claude Code.

---

## Before You Start

### Existing Claude Code Setup

If your project already has:
- `.claude/` directory with custom agents or commands
- `CLAUDE.md` with project-specific rules
- Existing worktree workflows

KARIMO integrates alongside these without conflict.

### What Gets Added

| Location | New Files | Conflicts? |
|----------|-----------|------------|
| `.claude/agents/` | 4 KARIMO agents | No — adds to existing |
| `.claude/commands/` | 4 slash commands | No — prefixed `karimo:` |
| `.claude/skills/` | 2 skills | No — adds to existing |
| `.claude/KARIMO_RULES.md` | Agent rules | No — separate file |
| `.karimo/` | Templates, PRDs | No — new directory |
| `.github/workflows/` | 3 workflows | Possible — see below |
| `CLAUDE.md` | Reference block | Appended — see below |

---

## Installation

### 1. Clone KARIMO

```bash
git clone https://github.com/opensesh/KARIMO.git /tmp/KARIMO
```

### 2. Run Install Script

```bash
bash /tmp/KARIMO/.karimo/install.sh /path/to/your/project
```

### 3. Review Changes

```bash
cd /path/to/your/project
git status
```

---

## CLAUDE.md Integration

### What Happens

The install script appends a KARIMO reference block to your existing `CLAUDE.md`:

```markdown
---

## KARIMO Framework

This project uses KARIMO for autonomous development.

**Commands:** `/karimo:plan`, `/karimo:execute`, `/karimo:status`, `/karimo:feedback`
**Rules:** See `.claude/KARIMO_RULES.md` for agent behavior rules
**Learnings:** Captured below via `/karimo:feedback`

## KARIMO Learnings

_Rules learned from execution feedback._

### Patterns to Follow
_No patterns captured yet._

### Anti-Patterns to Avoid
_No anti-patterns captured yet._
```

### Your Existing Content

Your existing CLAUDE.md content remains **unchanged**. KARIMO content is appended after a `---` separator.

### Re-Running Install

The script checks for existing KARIMO sections and skips if already present.

---

## Handling Existing Configurations

### Existing Agents

Your existing agents in `.claude/agents/` remain unchanged. KARIMO adds:
- `interviewer.md`
- `investigator.md`
- `pm.md`
- `reviewer.md`

**Naming conflicts:** If you have agents with these names, rename yours before installing.

### Existing Commands

KARIMO commands are prefixed with `karimo:` to avoid conflicts:
- `/karimo:plan`
- `/karimo:execute`
- `/karimo:status`
- `/karimo:feedback`

Your existing custom commands remain available.

### Existing Skills

KARIMO adds two skills to `.claude/skills/`:
- `git-worktree-ops.md`
- `github-project-ops.md`

These don't conflict with existing skills.

---

## GitHub Workflows

### What Gets Added

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `karimo-integration.yml` | Pre-PR checks | PR creation |
| `karimo-review.yml` | Greptile review | PR creation |
| `karimo-sync.yml` | Status sync | PR merge |

### Potential Conflicts

If you have existing workflows that:
- Run on `pull_request` events
- Modify PR labels
- Post PR comments

Review for conflicts. KARIMO workflows use unique job names and label prefixes.

### Disabling Workflows

To skip a workflow:

```yaml
# In the workflow file, change:
on:
  pull_request:
# To:
on:
  workflow_dispatch:  # Manual trigger only
```

---

## Project Configuration

### Creating config.yaml

After installation, create `.karimo/config.yaml` to customize:

```yaml
project:
  name: "your-project"

commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"

boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
  require_review:
    - "src/auth/*"
```

### Using Existing Build Commands

Reference your existing `package.json` scripts:

```yaml
commands:
  build: "npm run build"      # Your existing build script
  lint: "npm run lint"        # Your existing lint script
  test: "npm test"            # Your existing test script
```

---

## Worktree Considerations

### KARIMO Worktree Location

KARIMO creates worktrees in `.worktrees/{prd-slug}/{task-id}/`.

### Existing Worktrees

If you already use Git worktrees:
- KARIMO uses a separate `.worktrees/` directory
- Your existing worktree workflow is unaffected
- Add `.worktrees/` to `.gitignore` if not already present

### .gitignore Update

The install script adds to `.gitignore`:

```gitignore
# KARIMO worktrees
.worktrees/
```

---

## Validating Integration

### 1. Verify Installation

```bash
ls -la .claude/agents/
ls -la .claude/commands/
ls -la .karimo/
```

### 2. Test Commands

In Claude Code:

```
/karimo:status
```

Should show no active PRDs (expected for new installation).

### 3. Create Test PRD

```
/karimo:plan
```

Follow the interview to create a simple test PRD.

### 4. Dry Run Execution

```
/karimo:execute --prd test-prd --dry-run
```

Verify the execution plan looks correct.

---

## Troubleshooting

### "Command not found"

Restart Claude Code to reload commands:

```bash
claude
```

### "Agent not found"

Verify agents are installed:

```bash
ls .claude/agents/
```

Should show KARIMO agents alongside any existing agents.

### "Workflow conflicts"

Check GitHub Actions tab for errors. Review workflow triggers and job names.

### "CLAUDE.md too long"

If your CLAUDE.md is already large, the appended KARIMO block adds ~20 lines. Consider reorganizing existing content or using include files.

---

## Uninstalling

### Remove KARIMO Files

```bash
rm -rf .karimo/
rm .claude/agents/{interviewer,investigator,pm,reviewer}.md
rm .claude/commands/{plan,execute,status,feedback}.md
rm .claude/skills/{git-worktree-ops,github-project-ops}.md
rm .claude/KARIMO_RULES.md
rm .github/workflows/karimo-*.yml
```

### Clean CLAUDE.md

Remove the `## KARIMO Framework` section and everything below it from `CLAUDE.md`.

### Clean .gitignore

Remove KARIMO-related patterns from `.gitignore`.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Fresh installation walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) | Configuration options |
