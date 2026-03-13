```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-v7.3.0-blue)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Framework_&_Plugin-blueviolet.svg)]()

---

## What is KARIMO?

KARIMO is a **framework and Claude Code plugin** for PRD-driven autonomous development — one of the most comprehensive Claude Code plugins available. Think of it as **plan mode on steroids**, leveraging Claude Code's latest features including [native worktree isolation](https://docs.anthropic.com/en/docs/claude-code/common-workflows), [sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents), [agent-teams](https://code.claude.com/docs/en/agent-teams#when-to-use-agent-teams) and model routing.


> **Philosophy:** You are the architect, agents are the builders, automated review is the *optional* inspector.

---

## How It Works

```
┌──────────┐   ┌──────────┐   ┌───────┐   ┌─────────┐   ┌─────────────┐   ┌─────────┐
│ RESEARCH │──▸│   PLAN   │──▸│  RUN  │──▸│  TASKS  │──▸│ ORCHESTRATE │──▸│  MERGE  │
└──────────┘   └──────────┘   └───────┘   └─────────┘   └─────────────┘   └─────────┘
      │              │                        │ ▲               │               ▲
      ▼              ▼                        ▼ │               ▼               │
   ┌─────────────────────┐              ┌─────────────┐   ┌───────────┐         │
   │       ITERATE       │              │ AUTO-REVIEW │   │  INSPECT* │─────────┘
   └─────────────────────┘              └─────────────┘   └───────────┘
```

*\*INSPECT can be manual review, Claude Code Review, or Greptile automated review*

**Two gates before execution:**
- **Research ↔ Plan** — Iterate until PRD is ready (at least one research pass required)
- **Tasks ↔ Auto-Review** — Iterate until briefs are approved

**Once you hit Orchestrate, you're on the path.** Tasks execute in waves, PRs get created, and inspection validates before merge.

| Step | What Happens |
|------|--------------|
| **Research** | Discover patterns, libraries, and gaps — creates PRD folder |
| **Plan** | Structured interview captures requirements — uses research context |
| **Run** | Generate task briefs from research + PRD |
| **Tasks** | Auto-review challenges briefs, user iterates until approved |
| **Orchestrate** | Execute tasks in waves — PRs created |
| **Inspect*** | Review PRs (manual, Code Review, or Greptile) |
| **Merge** | Create final PR to main |

---

## Key Differentiators

| Feature | What It Means |
|---------|---------------|
| **Native worktree isolation** | Parallel execution via Claude Code's [`isolation: worktree`](https://docs.anthropic.com/en/docs/claude-code/common-workflows) |
| **Sub-agent architecture** | 17 specialized agents (11 coordination + 6 task) using [Claude Code sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) |
| **Model routing** | Sonnet for complexity 1-2, Opus for 3+, with automatic escalation on failures |
| **Structured interviews** | Multi-round PRD questions following user-controlled templates |
| **Two-tier planning** | PRDs decomposed into self-contained task briefs |
| **Pre-execution review** | Brief-reviewer validates assumptions against codebase before execution *(v5.5+)* |
| **Wave-based execution** | Dependency graph determines parallel vs sequential tasks |
| **Compound learning** | `/karimo-feedback` captures patterns with intelligent complexity detection |
| **PR-centric workflow** | Full auditability via PRs targeting main with wave-ordered merges |
| **Flexible code review** | Choose Greptile ($30/mo) or Claude Code Review ($15-25/PR) for automated review |

---

## Execution Model

KARIMO uses a PR-centric workflow with wave-based execution:

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

**One-line install (from your project directory):**
```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash
```

_Auto-detects git repository root. Supports explicit paths: `bash -s /path/to/project`_

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
/karimo-research "my-feature"    # Start with research (~5 min)
/karimo-plan --prd my-feature    # Then plan with context (~10 min)
```

See [Getting Started](.karimo/docs/GETTING-STARTED.md) for the full walkthrough.

### Optional: Set Up Automated Review

```
/karimo-configure --review
```

Choose Greptile or Claude Code Review. See [Adoption Phases](.karimo/docs/PHASES.md) for details.

---

## Core Commands

| Command | What it does |
|---------|--------------|
| `/karimo-research "feature-name"` | **REQUIRED first step** — Creates PRD folder + runs research |
| `/karimo-plan --prd {slug}` | Interactive PRD creation using research (~10 min) |
| `/karimo-run --prd {slug}` | 4-phase execution (briefs → review → iterate → orchestrate) |
| `/karimo-merge --prd {slug}` | Create final PR to main after execution |
| `/karimo-status [--prd {slug}]` | Monitor progress (no arg = all PRDs, with arg = details) |
| `/karimo-feedback` | Intelligent feedback (simple or complex path) |
| `/karimo-configure` | Create or update project configuration |
| `/karimo-doctor` | Diagnose installation issues |
| `/karimo-update` | Update KARIMO to latest version |

See [COMMANDS.md](.karimo/docs/COMMANDS.md) for full command reference.

---

## Choosing Your Workflow

KARIMO v7.0 uses a research-first workflow:

### Recommended Workflow (v7.0)

```bash
/karimo-research "my-feature"    # Creates folder, runs research
                                 # ↕ iterate (can research the plan)
/karimo-plan --prd my-feature    # Uses research, creates PRD

/karimo-run --prd my-feature     # Generates briefs, auto-reviews
                                 # ↕ iterate (user feedback on briefs)
                                 # Then orchestrates execution

/karimo-merge --prd my-feature   # Final PR to main
```

**Benefits:**
- Research-informed brief generation (40% fewer errors)
- User approval loop before execution starts
- Single production deployment per PRD
- Consolidated review before main merge

**Use for:** All new features. Research is required by default.

### Skip Research (Not Recommended)

```bash
/karimo-plan --prd my-feature --skip-research    # Skip research requirement
/karimo-run --prd my-feature                     # Execute without research
```

**Use for:** Hotfixes, urgent changes where research adds no value

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1: Execute PRD** | PRD interviews, agent execution, worktrees, PRs — fully functional out of the box |
| **Phase 2: Automate Review** | Choose Greptile ($30/mo) or Claude Code Review ($15-25/PR) for quality gates, revision loops, model escalation |
| **Phase 3: Monitor & Review** | CLI dashboard with health scoring, velocity metrics, and alerts via `/karimo-dashboard` |

Everyone starts at Phase 1. Add phases as you build trust with the system.

Full details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Agents

KARIMO includes 17 specialized agents in two categories:

**Coordination agents** orchestrate work without writing code:
- `karimo-interviewer` — Conducts PRD interviews
- `karimo-investigator` — Scans codebase for patterns
- `karimo-researcher` — Conducts research (internal + external)
- `karimo-refiner` — Processes annotations and refines research
- `karimo-reviewer` — Validates PRDs and generates task DAGs
- `karimo-brief-reviewer` — Validates task briefs before execution
- `karimo-brief-corrector` — Applies fixes to briefs after review
- `karimo-brief-writer` — Creates self-contained task briefs
- `karimo-pm` — Coordinates execution, spawns task agents
- `karimo-review-architect` — Resolves merge conflicts
- `karimo-feedback-auditor` — Investigates complex feedback issues

**Task agents** write and modify code:
- `karimo-implementer` — Writes production code (Sonnet + Opus)
- `karimo-tester` — Writes tests (Sonnet + Opus)
- `karimo-documenter` — Writes documentation (Sonnet + Opus)

Agent definitions: [`.claude/agents/`](.claude/agents/)
Behavior rules: [`KARIMO_RULES.md`](.claude/KARIMO_RULES.md)

---

## Context Architecture

KARIMO uses the [OpenViking Protocol](https://github.com/ArcadeAI/OpenViking) for efficient context management:

| Layer | Size | Query Order | Purpose |
|-------|------|-------------|---------|
| **L0 Abstracts** | ~100 tokens | 2nd | Single-item verification |
| **L1 Overviews** | ~2K tokens | 1st | Discover all items in category |
| **L2 Full Definitions** | Variable | 3rd | Complete content for execution |

> **Note:** "L" = Level of Detail (L0 = minimal, L2 = full), not query order.

**Key files:**
- `.claude/agents.overview.md` — Query first: all agents at a glance (L1)
- `.claude/agents/*.abstract.md` — Query second: verify specific agent (L0)
- `.claude/skills.overview.md` — All skills with agent mapping (L1)
- `.karimo/learnings/` — Categorized project learnings
- `.karimo/findings/` — Cross-PRD pattern index

For projects wanting vector-enhanced search, see the [OpenViking repository](https://github.com/ArcadeAI/OpenViking) for embedding setup guidance.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [Commands](.karimo/docs/COMMANDS.md) | Slash command reference |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design |
| [Context Architecture](.karimo/docs/CONTEXT-ARCHITECTURE.md) | L0/L1/L2 layering system |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |
| [Safeguards](.karimo/docs/SAFEGUARDS.md) | Code integrity & security |
| [Compound Learning](.karimo/docs/COMPOUND-LEARNING.md) | Categorized learning system |
| [Changelog](CHANGELOG.md) | Version history |

---

## Configuration

Configuration lives in `.karimo/config.yaml` (run `/karimo-configure` after install):

- **Runtime** — Node.js, Bun, Deno, Python, etc.
- **Framework** — Next.js, React, Vue, FastAPI, etc.
- **Commands** — build, lint, test, typecheck
- **Boundaries** — Files agents must not touch
- **Learnings** — Stored in `.karimo/learnings/` (categorized by type)

CLAUDE.md contains only a minimal reference block (~8 lines).

---

## FAQ

### Have questions about KARIMO?

Point Claude to this directory and ask. Run `claude` in the KARIMO repo (or your project with KARIMO installed) and ask your question. 90% of challenges can be answered by letting Claude read the documentation and understand the repository.

### Can I run KARIMO without automated code review?

Yes. KARIMO installs zero review workflows by default. PRD interviews, agent execution, worktrees, and PRs all work out of the box. Automated review (Phase 2) adds revision loops and quality gates, but it's optional. Without it, task PRs are created and you review them manually.

### How do I set up automated code review?

Run `/karimo-configure --review` to choose your provider:

| Provider | Pricing | Best For | Setup |
|----------|---------|----------|-------|
| **Greptile** | $30/month flat | High volume (50+ PRs/month) | API key + GitHub workflow |
| **Claude Code Review** | $15-25 per PR | Low-medium volume | Claude admin settings |

**Greptile setup:**
1. Run `/karimo-configure --greptile`
2. Add `GREPTILE_API_KEY` to GitHub secrets

**Claude Code Review setup:**
1. Run `/karimo-configure --code-review`
2. Enable at `claude.ai/admin-settings/claude-code`
3. Install Claude GitHub App

Both providers support revision loops and model escalation.

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
