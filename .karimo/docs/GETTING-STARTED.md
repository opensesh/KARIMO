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

### Optional

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Greptile** | Automated code review (Phase 2) | [greptile.com](https://greptile.com) |

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

## Configuration (Optional)

Create `.karimo/config.yaml` to customize behavior:

```yaml
project:
  name: "my-project"

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

See [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) for all options.

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

---

## Next Steps

| Task | Documentation |
|------|---------------|
| Learn about adoption phases | [PHASES.md](PHASES.md) |
| Explore slash commands | [COMMANDS.md](COMMANDS.md) |
| Configure your project | [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) |
| Integrate with existing setup | [INTEGRATING.md](INTEGRATING.md) |
