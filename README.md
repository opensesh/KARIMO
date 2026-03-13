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

KARIMO is a **framework and Claude Code plugin** for PRD-driven autonomous development. Think of it as **plan mode on steroids** — leveraging [native worktree isolation](https://docs.anthropic.com/en/docs/claude-code/common-workflows), [sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents), and model routing.

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

| Step | What Happens |
|------|--------------|
| **Research** | Discover patterns, libraries, gaps — creates PRD folder |
| **Plan** | Structured interview captures requirements |
| **Run** | Generate task briefs from research + PRD |
| **Tasks** | Auto-review challenges briefs, iterate until approved |
| **Orchestrate** | Execute tasks in waves — PRs created |
| **Merge** | Final PR to main |

---

## Strategic Looping

KARIMO has **two human-in-the-loop gates** before any code runs:

### Loop 1: Research ↔ Plan
```
/karimo-research "feature"  ←──┐
         │                     │
         ▼                     │ iterate until PRD is ready
/karimo-plan --prd feature  ───┘
```
- Research discovers existing patterns, libraries, and gaps
- Interview uses research to ask informed questions
- You can run research again after planning to fill gaps

### Loop 2: Tasks ↔ Auto-Review
```
/karimo-run --prd feature
         │
    [brief generation]
         │
         ▼
   ┌───────────┐
   │ TASKS     │◀──┐
   └─────┬─────┘   │
         │         │ iterate until briefs approved
         ▼         │
   ┌───────────┐   │
   │AUTO-REVIEW│───┘
   └───────────┘
         │
         ▼
   [orchestration begins]
```
- Brief-reviewer validates assumptions against codebase
- You approve, reject, or request changes
- Only approved briefs execute

**Once orchestration starts, you're on the path.** Tasks run in waves, PRs get created, and you review before merge.

---

## Orchestration

Tasks execute in waves with automatic parallelization:

```
Wave 1: [task-1a, task-1b] ─── parallel, PRs to main
              ↓ (wait for merge)
Wave 2: [task-2a, task-2b] ─── parallel, PRs to main
              ↓ (wait for merge)
Wave 3: [task-3a] ─────────── final task
```

| Feature | How It Works |
|---------|--------------|
| **Worktree isolation** | Claude Code's native `isolation: worktree` |
| **Model routing** | Sonnet for simple tasks, Opus for complex, auto-escalation on failures |
| **17 agents** | 11 coordination + 6 task agents ([details](.karimo/docs/ARCHITECTURE.md#agents)) |
| **Crash recovery** | Git state reconstruction via `/karimo-status --reconcile` |

---

## Getting Started

### Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| Claude Code | `claude --version` | [claude.ai/code](https://claude.ai/code) |
| GitHub CLI | `gh auth status` | `brew install gh && gh auth login` |
| Git 2.5+ | `git --version` | Included on macOS/Linux |

### Install

```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash
```

### Update

```bash
.karimo/update.sh
```

### What's Preserved Across Updates

| Updated | Preserved |
|:-------:|:---------:|
| Agents, commands, skills, templates | `config.yaml`, `learnings/`, `prds/*` |
| `KARIMO_RULES.md`, `VERSION` | Your content in CLAUDE.md |

Full walkthrough: [Getting Started](.karimo/docs/GETTING-STARTED.md)

---

## Core Commands

| Command | What it does |
|---------|--------------|
| `/karimo-research "feature"` | **Start here** — Creates PRD folder + runs research |
| `/karimo-plan --prd {slug}` | Interactive PRD creation (~10 min) |
| `/karimo-run --prd {slug}` | Brief generation → review → execution |
| `/karimo-merge --prd {slug}` | Final PR to main |
| `/karimo-status` | Monitor progress |
| `/karimo-feedback` | Capture learnings |
| `/karimo-doctor` | Diagnose issues |

Full reference: [COMMANDS.md](.karimo/docs/COMMANDS.md)

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1** | PRD interviews, agent execution, worktrees, PRs — works out of the box |
| **Phase 2** | Automated review via Greptile ($30/mo) or Claude Code Review ($15-25/PR) |
| **Phase 3** | CLI dashboard with velocity metrics via `/karimo-dashboard` |

Details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Context Architecture

KARIMO uses the [OpenViking Protocol](https://github.com/ArcadeAI/OpenViking) for efficient context management:

| Layer | Size | Purpose |
|-------|------|---------|
| **L0 Abstracts** | ~100 tokens | Single-item verification |
| **L1 Overviews** | ~2K tokens | Discover all items in category |
| **L2 Full Definitions** | Variable | Complete content for execution |

**Key files:**
- `.claude/agents.overview.md` — All agents at a glance (L1)
- `.claude/agents/*.abstract.md` — Verify specific agent (L0)
- `.claude/skills.overview.md` — All skills with agent mapping (L1)
- `.karimo/learnings/` — Categorized project learnings

Details: [Context Architecture](.karimo/docs/CONTEXT-ARCHITECTURE.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [Commands](.karimo/docs/COMMANDS.md) | Full command reference |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design + agent details |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |
| [Safeguards](.karimo/docs/SAFEGUARDS.md) | Code integrity & security |

Configuration lives in `.karimo/config.yaml` — run `/karimo-configure` after install.

---

## FAQ

**Can I run without automated review?**
Yes. Review is optional (Phase 2). PRD interviews, execution, and PRs all work out of the box.

**Having issues?**
Run `/karimo-doctor` to diagnose. Still stuck? [hello@opensession.co](mailto:hello@opensession.co)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
