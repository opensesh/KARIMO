# Getting Started with KARIMO

This guide walks you through installing KARIMO and creating your first PRD.

---

## Prerequisites

Before installing KARIMO, ensure you have:

| Requirement | Command to Check | Installation |
|-------------|------------------|--------------|
| **Claude Code** | `claude --version` | [claude.ai/code](https://claude.ai/code) |
| **GitHub CLI** | `gh --version` | `brew install gh && gh auth login` |
| **Git 2.5+** | `git --version` | Included on macOS/Linux |

### Optional but Highly Recommended

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Greptile** | Automated code review (Phase 2) | [greptile.com](https://greptile.com) |

Greptile acts as a force multiplier — catching issues before human review and enabling automated revision loops. While KARIMO works without it, Greptile significantly improves code quality outcomes.

---

## Installation

### 1. Clone KARIMO

```bash
git clone https://github.com/opensesh/KARIMO.git
```

### 2. Run the Install Script

```bash
bash KARIMO/.karimo/install.sh /path/to/your/project
```

This installs:
- Agent definitions to `.claude/agents/`
- Slash commands to `.claude/commands/`
- Skills to `.claude/skills/`
- Agent rules to `.claude/KARIMO_RULES.md`
- Templates to `.karimo/templates/`
- GitHub Actions to `.github/workflows/`
- Reference block appended to `CLAUDE.md`

### 3. Verify Installation

```bash
cd /path/to/your/project
ls -la .claude/
ls -la .karimo/
```

You should see the KARIMO components in both directories.

---

## Two Installation Paths

KARIMO works whether you're starting fresh or adding to an existing Claude Code project.

### Path A: Fresh Project

If your project doesn't have `.claude/` yet:

1. Run `install.sh` as shown above
2. New `CLAUDE.md` created with KARIMO reference block
3. All components installed to empty directories
4. Ready to use immediately

### Path B: Existing Claude Code Project

If your project already has `.claude/` with custom agents, commands, or `CLAUDE.md`:

**What gets preserved:**
- Your existing agents in `.claude/agents/`
- Your existing commands in `.claude/commands/`
- Your existing skills in `.claude/skills/`
- Your existing `CLAUDE.md` content

**What gets added:**
- 6 KARIMO agents (prefixed `karimo-*`)
- 6 slash commands (prefixed `karimo:`)
- 2 KARIMO skills
- `.claude/KARIMO_RULES.md`
- `.karimo/` directory with templates
- GitHub Actions workflows
- Reference block appended to `CLAUDE.md`

**Naming conflicts:** KARIMO agents use the `karimo-` prefix and commands use the `karimo:` prefix to avoid conflicts with your existing configuration. If you happen to have agents named `karimo-interviewer`, `karimo-investigator`, etc., rename yours before installing.

---

## Your First PRD

### 1. Start Claude Code

```bash
cd your-project
claude
```

### 2. Run the Plan Command

```
/karimo:plan
```

### 3. Follow the Interview

The interviewer agent guides you through 5 rounds:

| Round | Focus |
|-------|-------|
| 1 | **Vision** — What are you building and why? |
| 2 | **Scope** — Where are the boundaries? |
| 3 | **Investigation** — Agent scans your codebase |
| 4 | **Tasks** — Break down into executable units |
| 5 | **Review** — Validate and generate dependency graph |

### 4. Review the Generated PRD

After the interview, check your PRD:

```bash
cat .karimo/prds/{slug}/prd.md
cat .karimo/prds/{slug}/tasks.yaml
```

---

## Executing Tasks

### 1. Run the Execute Command

```
/karimo:execute --prd {slug}
```

Replace `{slug}` with your PRD slug (e.g., `user-profiles`).

### 2. Monitor Progress

The PM Agent coordinates task execution:
- Creates worktrees for isolation
- Spawns agents for ready tasks
- Creates PRs when tasks complete

### 3. Check Status

```
/karimo:status
```

Shows real-time progress across all PRDs.

---

## After Execution

### Review PRs

Agent-created PRs appear in your repository. Review and merge as normal.

### Capture Learnings

If you notice agent patterns worth capturing:

```
/karimo:feedback

> "Always use the existing Button component"
```

This appends rules to `CLAUDE.md` for future agents.

---

## Configuration

Configuration is stored in `CLAUDE.md` and auto-detected on your first `/karimo:plan`.

The investigator agent scans your project for:
- **Runtime** — Node.js, Bun, Deno, Python, etc.
- **Framework** — Next.js, React, Vue, FastAPI, etc.
- **Package manager** — npm, yarn, pnpm, bun
- **Commands** — build, lint, test, typecheck from package.json
- **Boundaries** — Lock files, .env files, migrations, auth directories

You can review and edit the detected values before they're saved.

---

## Troubleshooting

### "GitHub CLI not authenticated"

```bash
gh auth login
gh auth status
```

### "Worktree already exists"

```bash
git worktree list
git worktree remove .worktrees/{prd-slug}/{task-id}
```

### "Claude Code not found"

Ensure Claude Code is installed and in your PATH:
```bash
which claude
```

### "Command not found" after install

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

Check GitHub Actions tab for errors. Review workflow triggers and job names. KARIMO workflows use unique job names and label prefixes to minimize conflicts.

### "CLAUDE.md too long"

If your CLAUDE.md is already large, the appended KARIMO block adds ~20 lines. Consider reorganizing existing content or using include files.

---

## FAQ

### Will KARIMO disrupt my existing configuration?

No. KARIMO uses prefixed names (`karimo-` for agents, `karimo:` for commands) to avoid conflicts. Your existing agents, commands, and skills remain unchanged.

### How does KARIMO modify CLAUDE.md?

KARIMO appends a small reference block (~20 lines) after your existing content, separated by `---`. Your existing CLAUDE.md content remains untouched above this separator.

### What if I have agents with the same names?

KARIMO agents are named `karimo-interviewer`, `karimo-investigator`, `karimo-reviewer`, `karimo-pm`, and `karimo-learn-auditor`. If you have agents with these exact names, rename yours before installing. This is rare since KARIMO uses a consistent prefix.

### Can I uninstall KARIMO?

Yes. Remove these files:

```bash
rm -rf .karimo/
rm .claude/agents/karimo-*.md
rm .claude/commands/{plan,review,execute,status,feedback,learn}.md
rm .claude/skills/{git-worktree-ops,github-project-ops}.md
rm .claude/KARIMO_RULES.md
rm .github/workflows/karimo-*.yml
```

Then remove the `## KARIMO Framework` section from `CLAUDE.md`.

### Do I need Greptile?

Greptile is optional but highly recommended. Without it, KARIMO still:
- Creates PRDs through interviews
- Executes tasks with agent coordination
- Creates PRs with pre-validation

With Greptile, you get:
- Automated code review on every PR
- Score-based quality gates
- Automated revision loops when issues are found

Most teams find Greptile significantly improves outcomes.

### What about existing Git worktrees?

KARIMO creates worktrees in `.worktrees/{prd-slug}/{task-id}/`. This is separate from any worktrees you're already using. Add `.worktrees/` to `.gitignore` if not already present (the install script handles this).

---

## Next Steps

| Task | Documentation |
|------|---------------|
| Learn about adoption phases | [PHASES.md](PHASES.md) |
| Explore slash commands | [COMMANDS.md](COMMANDS.md) |
| Understand safeguards | [SAFEGUARDS.md](SAFEGUARDS.md) |
