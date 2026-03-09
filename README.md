```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-v4-green.svg)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Framework-blueviolet.svg)]()

---

## What is KARIMO?

KARIMO is a **framework and Claude Code plugin** for PRD-driven autonomous development — one of the most comprehensive Claude Code plugins available.

Think of it as **plan mode on steroids**:

| Feature | What It Means |
|---------|---------------|
| **Structured interviews** | Multi-round questions following a user-controlled template |
| **Two-tier planning** | PRDs decomposed into self-contained task briefs |
| **Wave-based execution** | Dependency graph determines parallel vs sequential tasks |
| **Agent teams** | 13 specialized agents using Claude Code's sub-agent architecture |
| **Native worktree isolation** | Parallel execution via `isolation: worktree` |
| **Optional code review** | Greptile integration for automated quality gates |

> **Philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## How It Works

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│   Plan   │ ──▸ │  Tasks   │ ──▸ │  Execute  │ ──▸ │  Review  │ ──▸ │   Merge   │
└──────────┘     └──────────┘     └───────────┘     └──────────┘     └───────────┘
                                        │                                  │
                                        │          ┌───────────┐           │
                                        └────────▸ │  Monitor  │ ◂─────────┘
                                                   └───────────┘
```

| Step | What Happens | Key Details |
|------|--------------|-------------|
| **Plan** | Structured PRD interview captures requirements | 5-round interview, codebase investigation, agent-optimized output |
| **Tasks** | PRD decomposed into isolated task briefs | Self-contained briefs, dependency graph, parallel-ready |
| **Execute** | Agents work in parallel isolation | Git worktrees, feature branches, findings propagation |
| **Review** | Greptile provides objective code review | 0-5 scoring, revision loops, model escalation (optional) |
| **Merge** | Clear audit trail at both levels | Task PRs target main directly, wave-ordered merges |
| **Monitor** | Real-time visibility into progress | `/karimo-status`, `/karimo-overview`, PR labels |

---

## Key Differentiators

| Feature | What It Means |
|---------|---------------|
| **Markdown automation** | PRDs and task briefs as agent-optimized markdown with structured interviews |
| **PR-centric workflow** | Full auditability via PRs targeting main — wave-ordered merges with PR labels |
| **Agent teams** | 13 specialized agents (7 coordination + 6 task) using Claude Code sub-agents |
| **Native worktree isolation** | Claude Code's `isolation: worktree` for automatic parallel task execution |
| **Compound learning** | `/karimo-feedback` and `/karimo-learn` capture patterns for future agents |
| **Model routing** | Sonnet for complexity 1-4, Opus for 5+, with automatic escalation on failures |

---

## v4.0 Execution Model

KARIMO v4.0 uses a simplified PR-centric workflow:

```
Wave 1: [task-1a, task-1b] ─── parallel execution, PRs to main
              ↓ (wait for merge)
Wave 2: [task-2a, task-2b] ─── parallel execution, PRs to main
              ↓ (wait for merge)
Wave 3: [task-3a] ─────────── final task, PR to main
```

| Feature | How It Works |
|---------|--------------|
| **PRs target main** | No feature branches — task PRs merge directly to main |
| **Wave-based execution** | Wave 2 waits for all wave 1 PRs to merge |
| **Worktree isolation** | Claude Code's native `isolation: worktree` handles automatically |
| **PR label tracking** | Labels: `karimo`, `karimo-{slug}`, `wave-{n}`, `complexity-{n}` |
| **Branch naming** | `{prd-slug}-{task-id}` (e.g., `user-profiles-1a`) |
| **Crash recovery** | Git state reconstruction via `/karimo-status --reconcile` |

---

## Installation & Updates

### Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| Claude Code | `claude --version` | [claude.ai/code](https://claude.ai/code) |
| GitHub CLI | `gh auth status` | `brew install gh && gh auth login` |
| Git 2.5+ | `git --version` | Included on macOS/Linux |

### Quick Start (Recommended)

**Install KARIMO:**
```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash -s /path/to/project
```

**Update existing installation:**
```bash
cd your-project && .karimo/update.sh
```

That's it. The update script fetches the latest release, shows a diff preview, and applies changes with your confirmation.

### Local Installation (For Inspection/Offline)

If you want to inspect the source code before running, or need offline installation:

**Install from cloned repository:**
```bash
git clone https://github.com/opensesh/KARIMO.git
bash KARIMO/.karimo/install.sh /path/to/project
```

**Update from local source:**
```bash
bash KARIMO/.karimo/update.sh --local KARIMO /path/to/project
```

### What Gets Updated vs Preserved

| Category | Updated | Preserved |
|----------|:-------:|:---------:|
| Agents (`.claude/agents/`) | ✓ | |
| Commands (`.claude/commands/`) | ✓ | |
| Skills (`.claude/skills/`) | ✓ | |
| Templates (`.karimo/templates/`) | ✓ | |
| Workflows (`.github/workflows/`) | ✓ | |
| `KARIMO_RULES.md` | ✓ | |
| `VERSION`, `MANIFEST.json` | ✓ | |
| `CLAUDE.md` (KARIMO section) | ✓ | |
| `CLAUDE.md` (YOUR content) | | ✓ |
| `config.yaml` | | ✓ |
| `learnings.md` | | ✓ |
| `prds/*` | | ✓ |

> The KARIMO section uses markers (`<!-- KARIMO:START -->` to `<!-- KARIMO:END -->`). Content between markers may be updated; everything else in CLAUDE.md is preserved.

### Command Reference

| Flag | install.sh | update.sh | Description |
|------|:----------:|:---------:|-------------|
| `--ci` | ✓ | ✓ | Non-interactive mode |
| `--check` | | ✓ | Check for updates only |
| `--force` | | ✓ | Update even if current |
| `--local <src> <dst>` | | ✓ | Update from local source |

### Verify Installation

```bash
cd your-project && claude
/karimo-doctor   # Check installation health
/karimo-test     # Run smoke tests
```

### Create Your First PRD

```
/karimo-plan
```

The interview takes ~10 minutes. See [Getting Started](.karimo/docs/GETTING-STARTED.md) for the full walkthrough.

---

## Core Commands

| Command | What it does |
|---------|--------------|
| `/karimo-plan` | Interactive PRD creation (~10 min) |
| `/karimo-execute --prd {slug}` | Run tasks from a PRD |
| `/karimo-status` | View execution progress |
| `/karimo-overview` | Dashboard across all PRDs |
| `/karimo-modify --prd {slug}` | Edit an approved PRD |
| `/karimo-doctor` | Diagnose installation issues |
| `/karimo-feedback` | Capture a single learning (~2 min) |
| `/karimo-learn` | Deep learning cycle (~45 min) |
| `/karimo-configure` | Create or update project configuration |
| `/karimo-cd-config` | Configure CD provider to skip task branch previews |
| `/karimo-update` | Update KARIMO to latest version |
| `/karimo-test` | Verify installation works end-to-end |

Full reference: [COMMANDS.md](.karimo/docs/COMMANDS.md)

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1: Execute PRD** | PRD interviews, agent execution, worktrees, PRs — fully functional out of the box |
| **Phase 2: Automate Review** | Add Greptile for code quality gates, revision loops, model escalation (requires API key) |
| **Phase 3: Monitor & Review** | Dashboard for team-wide visibility (work in progress) |

Everyone starts at Phase 1. Add phases as you build trust with the system.

Full details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Workflows

KARIMO installs GitHub workflows that align with adoption phases:

| Phase | Workflow | Purpose |
|-------|----------|---------|
| **Phase 1** | `karimo-ci.yml` | Core CI workflow — labels PRs, tracks wave status |
| **Phase 1** | `karimo-dependency-watch.yml` | Alerts on runtime dependency changes |
| **Phase 2** | `karimo-greptile-review.yml` | Automated Greptile code review gates |

- **Phase 1 workflows** are always installed — they're required for PR label tracking
- **Phase 2 workflows** require `GREPTILE_API_KEY` secret in your repository

See [PHASES.md](.karimo/docs/PHASES.md) for detailed adoption guidance.

---

## Agents

KARIMO includes 13 specialized agents in two categories:

**Coordination agents** orchestrate work without writing code:
- `karimo-interviewer` — Conducts PRD interviews
- `karimo-investigator` — Scans codebase for patterns
- `karimo-reviewer` — Validates PRDs and generates task DAGs
- `karimo-brief-writer` — Creates self-contained task briefs
- `karimo-pm` — Coordinates execution, spawns task agents
- `karimo-review-architect` — Resolves merge conflicts
- `karimo-learn-auditor` — Investigates learnings from feedback

**Task agents** write and modify code:
- `karimo-implementer` — Writes production code (Sonnet + Opus)
- `karimo-tester` — Writes tests (Sonnet + Opus)
- `karimo-documenter` — Writes documentation (Sonnet + Opus)

Agent definitions: [`.claude/agents/`](.claude/agents/)
Behavior rules: [`KARIMO_RULES.md`](.claude/KARIMO_RULES.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [Commands](.karimo/docs/COMMANDS.md) | Slash command reference |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |
| [Safeguards](.karimo/docs/SAFEGUARDS.md) | Code integrity & security |
| [Compound Learning](.karimo/docs/COMPOUND-LEARNING.md) | Two-scope learning system |
| [Changelog](CHANGELOG.md) | Version history |

---

## Configuration

Configuration lives in `.karimo/config.yaml` (run `/karimo-configure` after install):

- **Runtime** — Node.js, Bun, Deno, Python, etc.
- **Framework** — Next.js, React, Vue, FastAPI, etc.
- **Commands** — build, lint, test, typecheck
- **Boundaries** — Files agents must not touch
- **Learnings** — Stored separately in `.karimo/learnings.md`

CLAUDE.md contains only a minimal reference block (~8 lines).

---

## FAQ

### Have questions about KARIMO?

Point Claude to this directory and ask. Run `claude` in the KARIMO repo (or your project with KARIMO installed) and ask your question. 90% of challenges can be answered by letting Claude read the documentation and understand the repository.

### Can I run KARIMO without Greptile?

Yes. Phase 1 is fully functional without Greptile — PRD interviews, agent execution, worktrees, and PRs all work out of the box. Greptile adds automated code review with revision loops (Phase 2), but it's optional. Without Greptile, task PRs are created and you review them manually.

The workflow automatically applies the `greptile-skipped` label when no API key is configured, so everything continues to work.

### How do I set up Greptile?

1. Get an API key from [greptile.com](https://greptile.com)
2. Add `GREPTILE_API_KEY` to your GitHub repository secrets
3. Ensure the `karimo` label exists on your repository
4. PRs with the `karimo` label will trigger automated review

That's it. The `karimo-greptile-review.yml` workflow handles the rest — scoring PRs on a 0-5 scale, posting review comments, and triggering revision loops when scores fall below 3.

### Having issues?

Run `/karimo-doctor` to diagnose installation problems. If that doesn't help, reach out to us at [hello@opensession.co](mailto:hello@opensession.co).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, commands, skills, and templates.

---

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
