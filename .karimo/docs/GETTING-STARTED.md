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
| **Claude Code Review** | Automated code review (Phase 2) | Teams/Enterprise |

Automated code review catches issues before human review and enables revision loops. Choose your provider:
- **Greptile**: $30/month flat, best for high volume (50+ PRs/month)
- **Claude Code Review**: $15-25 per PR, native Claude integration

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
- `--ci` — CI mode: non-interactive, skips prompts

The installer uses `.karimo/MANIFEST.json` as the single source of truth for file inventory.

**Note:** KARIMO installs zero workflows by default. If you want Greptile integration, run `/karimo-configure --greptile` after installation.

This installs:
- Agent definitions to `.claude/agents/`
- Slash commands to `.claude/commands/`
- Skills to `.claude/skills/`
- Agent rules to `.claude/KARIMO_RULES.md`
- Templates to `.karimo/templates/`
- Learnings template to `.karimo/learnings.md`
- Marker-delimited KARIMO section appended to `CLAUDE.md` (~20 lines)

### 3. Verify Installation

```bash
cd /path/to/your/project
ls -la .claude/
ls -la .karimo/
```

You should see the KARIMO components in both directories.

---

## Updating KARIMO (~1 min)

Two ways to update, depending on your setup:

### From within your project (recommended)

```bash
cd /path/to/your/project
.karimo/update.sh
```

This fetches the latest release from GitHub, shows a diff, and asks for confirmation.

### From a local KARIMO clone

If you have KARIMO cloned locally (e.g., for development or offline use):

```bash
bash KARIMO/.karimo/update.sh --local KARIMO /path/to/your/project
```

### Update flags

| Flag | Description |
|------|-------------|
| `--check` | Check for updates without installing |
| `--force` | Update even if already on latest version |
| `--ci` | Non-interactive mode (auto-confirm) |

### Files preserved during updates

These files are never modified by updates:
- `.karimo/config.yaml` — Your project configuration
- `.karimo/learnings.md` — Your accumulated learnings
- `.karimo/prds/*` — Your PRD files
- `CLAUDE.md` — Your content is preserved; KARIMO section (marker-delimited) may be updated

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
- 11 slash commands (prefixed `karimo-*`)
- 6 KARIMO skills (prefixed `karimo-*`)
- `.claude/KARIMO_RULES.md`
- `.karimo/` directory with templates, manifest, and learnings
- Marker-delimited KARIMO section appended to `CLAUDE.md` (~20 lines)

**Optional (installed via `/karimo-configure --greptile`):**
- `karimo-greptile-review.yml` — automated code review via Greptile

**Naming convention:** All KARIMO-managed files use the `karimo-*` prefix for agents, commands, and skills. This enables reliable cleanup during updates and clear distinction from user-added files.

**Naming conflicts:** If you have files with the `karimo-*` prefix, rename yours before installing.

---

## Your First PRD (~10 min)

### 1. Start Claude Code

```bash
cd your-project
claude
```

### 2. Run the Plan Command

```
/karimo-plan
```

**First-time setup:** If this is your first time, `/karimo-plan` detects missing configuration and guides you through inline setup:

1. Shows a brief explanation of why configuration matters
2. Spawns an investigator agent to scan your codebase
3. Presents detected settings (runtime, framework, commands, boundaries)
4. You can accept, edit, or reject the detected config
5. After config is set, the interview continues automatically

This replaces the need to run `/karimo-configure` separately — everything happens inline.

**Returning users:** If configuration already exists, the interview starts immediately.

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
├── status.json         # Execution state (created during /karimo-execute)
└── metrics.json        # Execution metrics (created at PRD completion)
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

**Phase 2: Wave-Ordered Execution** (varies by PRD size)
- PM Agent executes tasks wave by wave
- Wave 2 waits for all wave 1 PRs to merge
- Claude Code manages worktrees automatically via `isolation: worktree`
- PRs target main directly with labels for tracking
- Branch naming: `{prd-slug}-{task-id}`

Example wave structure:

```
Wave 1: [1a, 1b] — Execute in parallel, PRs to main
        ↓ (wait for merge)
Wave 2: [2a, 2b] — Execute in parallel, PRs to main
        ↓ (wait for merge)
Wave 3: [3a] — Final task
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
    Wave 2 of 3 in progress
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

### Configure CD Provider (Optional)

If you use preview deployments (Vercel, Netlify, etc.), KARIMO task PRs
may trigger build failures. This is expected — partial code doesn't build
in isolation, but works once all wave tasks merge.

To skip preview builds for KARIMO branches:

```
/karimo-cd-config
```

Or configure during initial setup — `/karimo-configure` will prompt you
if it detects a deployment provider.

See [CI-CD.md](CI-CD.md) for details on KARIMO's CI/CD integration approach.

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

### "Task crashed" or stale execution

v4.0 uses git state reconstruction. Run:
```bash
/karimo-execute --prd {slug}
```

This will reconcile status.json with git reality and resume from the correct point.

### "Want automated code review?"

KARIMO installs zero review workflows by default. Choose your provider:

**Option A: Greptile** ($30/month, best for high volume)
```
/karimo-configure --greptile
```
Then add `GREPTILE_API_KEY` to your repository secrets.

**Option B: Claude Code Review** ($15-25/PR, native integration)
```
/karimo-configure --code-review
```
Then enable at `claude.ai/admin-settings/claude-code` and install Claude GitHub App.

**Interactive choice:**
```
/karimo-configure --review
```

---

## FAQ

### Will KARIMO disrupt my existing configuration?

No. KARIMO uses the `karimo-` prefix for both agents and commands to avoid conflicts. Your existing agents, commands, and skills remain unchanged.

### How does KARIMO modify CLAUDE.md?

KARIMO appends a marker-delimited section (~20 lines) after your existing content, separated by `---`. Your existing CLAUDE.md content remains untouched.

The KARIMO section uses HTML comment markers for clear boundaries:
```markdown
<!-- KARIMO:START - Do not edit between markers -->
## KARIMO
... quick reference and GitHub Configuration table ...
<!-- KARIMO:END -->
```

Benefits of marker-based format:
- Clear visual boundaries for users
- Programmatic detection for updates and uninstall
- GitHub Configuration table auto-populated by `/karimo-configure`

All detailed configuration is stored in `.karimo/config.yaml` and learnings in `.karimo/learnings.md`.

### What if I have agents with the same names?

KARIMO agents are named `karimo-interviewer`, `karimo-investigator`, `karimo-reviewer`, `karimo-pm`, and `karimo-learn-auditor`. If you have agents with these exact names, rename yours before installing. This is rare since KARIMO uses a consistent prefix.

### Can I uninstall KARIMO?

Yes. The recommended way is to run the uninstall script:

```bash
bash /path/to/KARIMO/.karimo/uninstall.sh /path/to/your/project
```

Or manually remove these files:

```bash
rm -rf .karimo/
rm .claude/agents/karimo-*.md
rm .claude/commands/karimo-*.md
rm .claude/skills/karimo-*.md
rm .claude/KARIMO_RULES.md
rm .github/workflows/karimo-*.yml
```

Then remove the KARIMO section from `CLAUDE.md`. For marker-based installations, remove everything between `<!-- KARIMO:START -->` and `<!-- KARIMO:END -->` (inclusive). For legacy installations, remove from `## KARIMO` to the end of the file or the next `---` separator.

### Do I need automated code review?

Automated code review (Greptile or Claude Code Review) is optional but highly recommended.

**Without automated review**, KARIMO still:
- Creates PRDs through interviews
- Executes tasks with agent coordination
- Creates PRs with pre-validation

**With automated review**, you get:
- Code review on every PR
- Quality gates (score-based or finding-based)
- Automated revision loops when issues are found

**Choose your provider:**
- **Greptile**: $30/month flat. Best for high PR volume (50+/month).
- **Claude Code Review**: $15-25 per PR. Best for low-medium volume, native Claude integration.

Run `/karimo-configure --review` to choose your provider.

### How does KARIMO handle task isolation?

KARIMO v4.0 uses Claude Code's native `isolation: worktree` feature. Claude Code automatically creates and cleans up worktrees for each task agent. You don't need to manage worktrees manually.

### Vercel/Netlify previews fail on KARIMO PRs

This is expected. KARIMO task PRs contain partial code that won't build
in isolation. The code works once all wave tasks merge to main.

Run `/karimo-cd-config` to configure your deployment provider to skip
KARIMO task branches, or accept the noise (failures don't block merges).

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
