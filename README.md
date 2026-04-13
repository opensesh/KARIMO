```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-v8.1.0-blue)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Framework_&_Plugin-blueviolet.svg)]()

**PRD-driven autonomous development for Claude Code.**

> You are the architect, agents are the builders.

---

## Quick Start

```bash
# Install
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash

# Your first feature
/karimo:research "feature-name"   # Creates PRD folder + runs research
/karimo:plan --prd {slug}         # Interactive PRD creation (~10 min)
/karimo:run --prd {slug}          # Execute tasks in waves
/karimo:merge --prd {slug}        # Final PR to main
```

**Prerequisites:** [Claude Code](https://claude.ai/code), [GitHub CLI](https://cli.github.com/) (`gh auth login`), Git 2.5+

---

## How It Works

```
┌──────────┐   ┌──────┐   ┌───────┐   ┌────────┐   ┌─────────────┐   ┌─────────┐
│ RESEARCH │──▸│ PLAN │──▸│ TASKS │──▸│ REVIEW │──▸│ ORCHESTRATE │──▸│ INSPECT │
└──────────┘   └──────┘   └───────┘   └────────┘   └─────────────┘   └─────────┘
      │            │           │              │                 │              │
      └────────────┘           └──────────────┘                 └──────────────┘
          Loop 1                    Loop 2                           Loop 3
          Human                     Claude                        Configurable
```

| Step | What Happens |
|------|--------------|
| **Research** | Discover patterns, libraries, gaps |
| **Plan** | Structured interview captures requirements |
| **Tasks** | Generate task briefs from research + PRD |
| **Review** | Claude validates briefs against codebase |
| **Orchestrate** | Execute in waves (parallel tasks, sequential waves) |
| **Inspect** | Review each PR (manual, Code Review, or Greptile) |

---

## Commands

| Command | Purpose |
|---------|---------|
| `/karimo:research "feature"` | **Start here** — Create PRD folder + research |
| `/karimo:plan --prd {slug}` | Interactive PRD creation |
| `/karimo:run --prd {slug}` | Brief generation → review → execution |
| `/karimo:merge --prd {slug}` | Final PR to main |
| `/karimo:dashboard` | Monitor progress |
| `/karimo:feedback` | Capture learnings |
| `/karimo:doctor` | Diagnose issues |

Full reference: [COMMANDS.md](.karimo/docs/COMMANDS.md)

---

## What KARIMO Adds

KARIMO builds on Claude Code's native APIs with custom orchestration:

| Capability | Claude Code (Native) | KARIMO (Custom) |
|------------|---------------------|-----------------|
| **Isolation** | Worktree per agent | + Branch identity verification |
| **Execution** | Task spawning | + Wave-ordered parallelism |
| **Models** | Static `model:` param | + Complexity routing + escalation |
| **Recovery** | Worktree persistence | + Git state reconciliation |
| **Quality** | — | + Semantic loop detection |

**Why custom?** Claude Code provides foundations (worktrees, sub-agents, hooks) but doesn't coordinate task dependencies, detect stuck loops, or recover from crashes. KARIMO adds these as a coordination layer.

Details: [Feature Architecture](.karimo/docs/ARCHITECTURE.md#feature-architecture)

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1** | PRD interviews, agent execution, worktrees, PRs — works out of the box |
| **Phase 2** | Automated review via Greptile ($30/mo) or Claude Code Review |
| **Phase 3** | CLI dashboard with velocity metrics |

Details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [Commands](.karimo/docs/COMMANDS.md) | Full command reference |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design, agents, feature breakdown |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |
| [Safeguards](.karimo/docs/SAFEGUARDS.md) | Code integrity & security |
| [Hooks](.karimo/hooks/README.md) | Lifecycle hooks (Slack, Jira, etc.) |
| [Context Architecture](.karimo/docs/CONTEXT-ARCHITECTURE.md) | Token-efficient context layering |
| [Compound Learning](.karimo/docs/COMPOUND-LEARNING.md) | How agents get smarter over time |

---

## FAQ

**Can I run without automated review?**
Yes. Review is optional (Phase 2). PRD interviews, execution, and PRs all work out of the box.

**Having issues?**
Run `/karimo:doctor` to diagnose. Still stuck? [hello@opensession.co](mailto:hello@opensession.co)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
