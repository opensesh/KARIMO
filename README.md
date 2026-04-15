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
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet.svg)]()

**PRD-driven autonomous development for Claude Code.**

> You are the architect, agents are the builders.

---

## See It In Action

<!-- TODO: Embed demo video here -->

Want to see exactly how KARIMO works? Check out the [interactive demo](https://karimo-overview.vercel.app/) to understand why it was built and how it works in detail.

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

## Quick Start

### Option 1: Terminal

Clone the repo and run the install script from your terminal.

```bash
git clone https://github.com/opensesh/KARIMO
bash KARIMO/.karimo/install.sh ./my-project
```

### Option 2: Claude Code

Paste this prompt into Claude Code and it will handle the rest.

```
Clone github.com/opensesh/KARIMO and run the install script to set up KARIMO in this project.
```

*Works in Claude Code CLI, desktop app, or IDE extensions.*

### Your First Feature

```bash
/karimo:research "feature-name"   # Creates PRD folder + runs research
/karimo:plan --prd {slug}         # Interactive PRD creation (~10 min)
/karimo:run --prd {slug}          # Execute tasks in waves
/karimo:merge --prd {slug}        # Final PR to main
```

**Prerequisites:** [Claude Code](https://claude.ai/code), [GitHub CLI](https://cli.github.com/) (`gh auth login`), Git 2.5+

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

**Do I need to use a feature branch?**

No. KARIMO supports two modes configured via `/karimo:configure`: feature branch mode (tasks branch from a feature branch) or main mode (tasks branch directly from main). Choose what fits your workflow.

**Can I run multiple KARIMO orchestration sessions at once?**

Yes, but be careful when running multiple feature branches with worktrees simultaneously. With Claude Opus 4.5, we've seen occasional conflicts. For best results, let one orchestration complete before starting another.

**Do I need to use Greptile?**

No. You can use manual review, Claude Code Review, or any other review mechanism. Greptile is one option for automated review in Phase 2, but it's entirely optional.

**Can I use other tools for research?**

Yes. We use Firecrawl MCP for deeper web research capability. You can integrate any MCP servers or tools that fit your workflow.

**Can I customize KARIMO for my use case?**

Yes. You can modify your local installation directly or fork the repository for more extensive customization. Agent definitions, templates, and skills are all editable.

**Having issues?**

Run `/karimo:doctor` to diagnose. Still stuck? [hello@opensession.co](mailto:hello@opensession.co)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensession.co)*
