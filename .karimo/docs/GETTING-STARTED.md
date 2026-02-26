# Getting Started with KARIMO

This guide walks you through installing KARIMO and creating your first PRD.

**Total time: ~20 minutes** (5 min install + 10 min first PRD + 5 min verification)

---

## Prerequisites (~2 min)

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

## Installation (~3 min)

### Option A: One-liner (fastest)

```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash -s /path/to/your/project
```

This downloads KARIMO to a temp directory, runs the installer, and cleans up automatically.

### Option B: Clone first (inspect before running)

```bash
git clone https://github.com/opensesh/KARIMO.git
bash KARIMO/.karimo/install.sh /path/to/your/project
```

**Configuration:** After installation, run `/karimo-configure` to auto-detect your project:
- Package manager (pnpm, yarn, npm, bun, poetry, etc.)
- Runtime (Node.js, Bun, Deno, Python, Go, Rust)
- Framework (Next.js, Nuxt, SvelteKit, Astro, etc.)
- Build commands from package.json scripts

Configuration is written to `.karimo/config.yaml`.

**Options:**
- `--ci` — CI mode: non-interactive, installs all workflows, skips prompts

The installer uses `.karimo/MANIFEST.json` as the single source of truth for file inventory.

The installer will prompt you for optional workflow tiers:

```
GitHub Workflow Installation
KARIMO uses a three-tier workflow system:

Tier 1 (Required):
  - karimo-sync.yml: Status sync on PR merge
  - karimo-dependency-watch.yml: Runtime dependency alerts
  Installed

Tier 2 (CI Integration):
  - karimo-ci-integration.yml: Observes your existing CI, labels PRs
  - This workflow does NOT run build commands - it watches external CI

Install CI integration workflow? (Y/n) Y
  Installed

Tier 3 (Greptile Review):
  - karimo-greptile-review.yml: Automated code review via Greptile
  - Requires GREPTILE_API_KEY secret in your repository

Install Greptile review workflow? (y/N) n
  Skipped
```

**Recommendations:**
- **CI Integration (Tier 2):** Accept the default (Y) if you have any CI workflows
- **Greptile Review (Tier 3):** Install if you have a Greptile API key

This installs:
- Agent definitions to `.claude/agents/`
- Slash commands to `.claude/commands/`
- Skills to `.claude/skills/`
- Agent rules to `.claude/KARIMO_RULES.md`
- Templates to `.karimo/templates/`
- Learnings template to `.karimo/learnings.md`
- GitHub Actions based on your tier selections
- Minimal reference block appended to `CLAUDE.md` (~8 lines)

### 3. Verify Installation

```bash
cd /path/to/your/project
ls -la .claude/
ls -la .karimo/
```

You should see the KARIMO components in both directories.

---

## Updating KARIMO (~1 min)

To update KARIMO in a project that already has it installed:

```bash
bash KARIMO/.karimo/update.sh /path/to/your/project
```

This shows a diff of what changed and asks for confirmation before applying updates.

Your existing `CLAUDE.md`, `.karimo/config.yaml`, `.karimo/learnings.md`, and `.gitignore` are never overwritten.

---

## Two Installation Paths

KARIMO works whether you're starting fresh or adding to an existing Claude Code project.

### Path A: Fresh Project

If your project doesn't have `.claude/` yet:

1. Run `install.sh` as shown above
2. New `CLAUDE.md` created with minimal KARIMO reference block (~8 lines)
3. All components installed to empty directories
4. Ready to use immediately

### Path B: Existing Claude Code Project

If your project already has `.claude/` with custom agents, commands, or `CLAUDE.md`:

**What gets preserved:**
- Your existing agents in `.claude/agents/`
- Your existing commands in `.claude/commands/`
- Your existing skills in `.claude/skills/`
- Your existing `CLAUDE.md` content

**What gets added (from MANIFEST.json):**
- 13 KARIMO agents (prefixed `karimo-*`)
- 10 slash commands (prefixed `karimo:`)
- 5 KARIMO skills
- `.claude/KARIMO_RULES.md`
- `.karimo/` directory with templates, manifest, and learnings
- GitHub Actions workflows
- Minimal reference block appended to `CLAUDE.md` (~8 lines)

**Naming conflicts:** KARIMO agents use the `karimo-` prefix and commands use the `karimo:` prefix to avoid conflicts with your existing configuration. If you happen to have agents named `karimo-interviewer`, `karimo-investigator`, etc., rename yours before installing.

---

## Your First PRD (~10 min)

### 1. Start Claude Code

```bash
cd your-project
claude
```

### 2. Verify Configuration (Optional)

If install.sh auto-detected your project, configuration is ready. To verify:

```
/karimo-doctor
```

This confirms your configuration is valid. If issues are found, run `/karimo-configure` to fix them.

### 3. Run the Plan Command

```
/karimo-plan
```

Since configuration is already in place, the interview starts immediately.

### 4. Follow the Interview (~8 min)

The interviewer agent guides you through 6 rounds:

| Round | Focus | Time |
|-------|-------|------|
| 1 | **Vision** — What are you building and why? | ~2 min |
| 2 | **Scope** — Where are the boundaries? | ~2 min |
| 3 | **Investigation** — Agent scans your codebase | ~1 min |
| 4 | **Tasks** — Break down into executable units | ~2 min |
| 5 | **Review** — Validate and generate dependency graph | ~30 sec |
| 6 | **Approve** — Confirm PRD is ready for execution | ~30 sec |

### 5. Approve the PRD

After review, you'll see a summary with options:
- **Approve** — Marks PRD as `ready` for execution
- **Modify** — Make changes and re-run the reviewer
- **Save as draft** — Come back later with `/karimo-plan --resume {slug}`

### 6. Check the Generated PRD

After approval, verify your PRD:

```bash
cat .karimo/prds/{slug}/prd.md
cat .karimo/prds/{slug}/tasks.yaml
```

**Example output structure:**

```
.karimo/prds/user-profiles/
├── prd.md              # Full PRD document
├── tasks.yaml          # Task definitions with dependencies
├── execution_plan.yaml # DAG for parallel execution
└── status.json         # Execution state (created during /karimo-execute)
```

The `tasks.yaml` contains entries like:

```yaml
tasks:
  - id: T001
    title: Create user profile model
    type: implementation
    complexity: 2
    dependencies: []
  - id: T002
    title: Add profile API endpoints
    type: implementation
    complexity: 3
    dependencies: [T001]
```

---

## Executing Tasks

### 1. Run the Execute Command

```
/karimo-execute --prd {slug}
```

Replace `{slug}` with your PRD slug (e.g., `user-profiles`).

### 2. What Happens During Execution

**Phase 1: Brief Generation** (~2 min)
- Generates self-contained briefs for each task
- User reviews briefs and can adjust or exclude tasks

**Phase 2: Task Execution** (varies by PRD size)
- PM Agent creates a feature branch: `karimo/{prd-slug}`
- Creates worktrees for each task: `.worktrees/{prd-slug}/{task-id}/`
- Spawns agents for ready tasks (respects dependency order)
- Propagates findings between related tasks
- Creates PRs when tasks complete

Example worktree structure during execution:

```
.worktrees/user-profiles/
├── T001/    # Implementing user profile model
├── T002/    # Waiting on T001 (dependency)
└── T003/    # Running in parallel with T001
```

### 3. Monitor Progress

The PM Agent coordinates execution in real-time. Check status:

```
/karimo-status
```

Shows progress across all PRDs:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 in-review
```

---

## After Execution

### Review PRs (~5 min per PR)

Agent-created PRs appear in your repository. Review and merge as normal.

### Capture Learnings

If you notice agent patterns worth capturing:

```
/karimo-feedback

> "Always use the existing Button component"
```

This appends rules to `.karimo/learnings.md` for future agents.

---

## Configuration

Configuration is stored in `.karimo/config.yaml` (single source of truth). Learnings are stored separately in `.karimo/learnings.md`.

### Configure After Install

After running `install.sh`, configure your project:

```
/karimo-configure
```

This auto-detects and writes to `.karimo/config.yaml`:
- **Runtime** — Node.js, Bun, Deno, Python, Go, Rust
- **Framework** — Next.js, Nuxt, SvelteKit, Astro, Vue, etc.
- **Package manager** — pnpm, yarn, npm, bun, poetry, pip
- **Commands** — build, lint, test, typecheck from package.json
- **Boundaries** — Default patterns for lock files, .env files, migrations, auth
- **GitHub** — Owner, repository, default branch

### Verify Configuration

After configuration, verify everything is valid:

```
/karimo-doctor
```

This checks for:
- KARIMO section exists in CLAUDE.md
- `.karimo/config.yaml` exists with valid structure
- `.karimo/learnings.md` exists
- Configuration drift (values vs actual project state)

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

Check GitHub Actions tab for errors. KARIMO workflows use unique names (`karimo-*`) and self-exclude from CI detection. If you skipped a tier during installation, you can add it later:

```bash
# Copy missing workflow from KARIMO source
cp KARIMO/.github/workflows/karimo-ci-integration.yml .github/workflows/
```

### "CI always shows skipped"

The CI Integration workflow only monitors external CI. If you don't have GitHub Actions, CircleCI, Jenkins, or similar, it will apply `ci-skipped`. This is expected — add CI workflows to your project and KARIMO will automatically detect them.

---

## FAQ

### Will KARIMO disrupt my existing configuration?

No. KARIMO uses prefixed names (`karimo-` for agents, `karimo:` for commands) to avoid conflicts. Your existing agents, commands, and skills remain unchanged.

### How does KARIMO modify CLAUDE.md?

KARIMO appends a minimal reference block (~8 lines) after your existing content, separated by `---`. Your existing CLAUDE.md content remains untouched. All configuration is stored in `.karimo/config.yaml` and learnings in `.karimo/learnings.md`.

### What if I have agents with the same names?

KARIMO agents are named `karimo-interviewer`, `karimo-investigator`, `karimo-reviewer`, `karimo-pm`, and `karimo-learn-auditor`. If you have agents with these exact names, rename yours before installing. This is rare since KARIMO uses a consistent prefix.

### Can I uninstall KARIMO?

Yes. Remove these files:

```bash
rm -rf .karimo/
rm .claude/agents/karimo-*.md
rm .claude/commands/{plan,execute,status,configure,feedback,learn,doctor,overview,test}.md
rm .claude/skills/{git-worktree-ops,github-project-ops,karimo-code-standards,karimo-testing-standards,karimo-doc-standards}.md
rm .claude/KARIMO_RULES.md
rm .github/workflows/karimo-*.yml
```

Then remove the `## KARIMO` section from `CLAUDE.md`.

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

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [PHASES.md](PHASES.md) | Adoption phases explained |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and integration |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
