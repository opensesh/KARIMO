```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-v2-green.svg)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Framework-blueviolet.svg)]()

---

## What is KARIMO?

A product design framework based on the development cycle inside most big tech companies. This is a PRD-driven framework that starts with a detailed plan for a feature. Agents help plan, execute, and ship. You review and merge. That's the loop.

> **Philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

**What KARIMO produces:**
- Structured PRDs from conversational interviews
- Parallel task execution across git worktrees
- Pull requests ready for your review
- Automated code quality checks (optional)

---

## How It Works

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
│   Plan   │ ──▸ │  Execute  │ ──▸ │  Review  │ ──▸ │   Merge   │
│ (you +   │     │ (agents)  │     │(Greptile)│     │  (you)    │
│  agents) │     │           │     │          │     │           │
└──────────┘     └───────────┘     └──────────┘     └───────────┘
```

1. **Plan** — `/karimo:plan` starts an interview to capture requirements
2. **Execute** — Agents work in parallel across git worktrees
3. **Review** — Greptile scores code quality (optional Phase 2)
4. **Merge** — You review PRs and merge what's ready

---

## Get Started in 5 Minutes

### Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| Claude Code | `claude --version` | [claude.ai/code](https://claude.ai/code) |
| GitHub CLI | `gh auth status` | `brew install gh && gh auth login` |
| Git 2.5+ | `git --version` | Included on macOS/Linux |

### Install

**Option A: One-liner** (fastest)
```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash -s /path/to/your/project
```

**Option B: Clone first** (inspect before running)
```bash
git clone https://github.com/opensesh/KARIMO.git
bash KARIMO/.karimo/install.sh /path/to/your/project
```

### Verify

```bash
cd your-project && claude
/karimo:doctor   # Check installation health
```

### Create Your First PRD

```
/karimo:plan
```

The interview takes ~10 minutes. See [Getting Started](.karimo/docs/GETTING-STARTED.md) for the full walkthrough.

---

## Core Commands

| Command | What it does |
|---------|--------------|
| `/karimo:plan` | Interactive PRD creation (~10 min) |
| `/karimo:execute --prd {slug}` | Run tasks from a PRD |
| `/karimo:status` | View execution progress |
| `/karimo:overview` | Dashboard across all PRDs |
| `/karimo:modify --prd {slug}` | Edit an approved PRD |
| `/karimo:doctor` | Diagnose installation issues |
| `/karimo:feedback` | Capture a single learning (~2 min) |
| `/karimo:learn` | Deep learning cycle (~45 min) |

Full reference: [COMMANDS.md](.karimo/docs/COMMANDS.md)

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1: Execute PRD** | PRD interviews, agent execution, worktrees, PRs — fully functional out of the box |
| **Phase 2: Automate Review** | Add Greptile for code quality gates, revision loops, model escalation (requires API key) |
| **Phase 3: Monitor & Review** | Dashboard for team-wide visibility (coming soon) |

Everyone starts at Phase 1. Add phases as you build trust with the system.

Full details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Agents

KARIMO includes 13 specialized agents:

| Type | Agents |
|------|--------|
| **Coordination** | interviewer, investigator, reviewer, brief-writer, pm, review-architect, learn-auditor |
| **Task** | implementer, tester, documenter (each with Sonnet + Opus variants) |

Agents follow rules defined in [KARIMO_RULES.md](.claude/KARIMO_RULES.md).

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

Configuration lives in `CLAUDE.md` and is auto-detected on first `/karimo:plan`:

- **Runtime** — Node.js, Bun, Deno, Python, etc.
- **Framework** — Next.js, React, Vue, FastAPI, etc.
- **Commands** — build, lint, test, typecheck
- **Boundaries** — Files agents must not touch

Run `/karimo:configure` to update configuration manually.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, commands, skills, and templates.

---

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
