```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
[![Level](https://img.shields.io/badge/Level-0--5-orange.svg)]()

**Open-Source Autonomous Development Framework**

Choose your model, select your codebase, and turn product requirements into shipped code using AI agents, automated code review, and structured human oversight.

---

## Getting Started

KARIMO guides you through three steps:

1. **Setup** — Run `karimo` and answer questions about your project
2. **Interview** — Have a conversation to define what you want to build
3. **Execute** — Let agents turn your requirements into pull requests

### First Run

```bash
bun link              # Install globally (one time)
cd your-project
karimo                # Start guided flow
```

That's it. KARIMO detects your project state and guides you to the next step.

---

## Two Ways to Use KARIMO

### Guided Flow (Recommended)

Just run `karimo` with no arguments. KARIMO detects where you are and guides you:

| If you have... | KARIMO will... |
|----------------|----------------|
| No `.karimo/` folder | Show welcome and start setup |
| Config but no PRDs | Start the PRD interview |
| PRD in progress | Offer to resume where you left off |
| Finalized PRD | Show tasks ready for execution |

### Direct Commands

For experienced users who know what they need:

| Command | Purpose |
|---------|---------|
| `karimo init` | Initialize project config |
| `karimo orchestrate --phase X --task Y` | Run a specific task |
| `karimo status` | Show current project state |
| `karimo help` | Show all commands |

---

## How It Works

```
┌──────────────┐    ┌───────────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐
│   Interview  │ →  │   PRD File    │ →  │   Execute   │ →  │   Review   │ →  │   Merge   │
│  (5 rounds)  │    │  (generated)  │    │   (agents)  │    │  (checks)  │    │   (PR)    │
└──────────────┘    └───────────────┘    └─────────────┘    └────────────┘    └───────────┘
```

1. **Interview** — Answer questions about what you're building (~28 min)
2. **PRD Generated** — Your answers become a structured document
3. **Execute** — Agents work on tasks from the PRD
4. **Review** — Pre-PR checks (build, typecheck, boundaries)
5. **Merge** — Pull request created for human review

---

## The PRD Interview

KARIMO interviews you in 5 rounds to understand what you're building:

| Round | Duration | What You'll Discuss |
|-------|----------|---------------------|
| 1. Framing | ~5 min | What's the feature? Who's it for? Why now? |
| 2. Requirements | ~10 min | What must it do? What's out of scope? |
| 3. Dependencies | ~5 min | What depends on what? Which files are involved? |
| 4. Agent Context | ~5 min | What patterns should agents follow? |
| 5. Retrospective | ~3 min | What did we learn from previous work? |

You can pause anytime. Run `karimo` again to resume where you left off.

---

## Level-Based Adoption

KARIMO uses a level-based build plan — each level is a loop, not just a milestone. You start small (one agent, one task, one manual review), prove it works, and then add the next layer.

This matters because autonomous development is high-stakes. You need to see what agents produce, understand how cost controls behave, and verify that integrity checks catch real problems — all before letting the system run overnight. By Level 5, you've validated every component in isolation.

| Level | Capability | What You Prove | Status |
| ----- | ---------- | -------------- | ------ |
| **0** | Basic agent execution | Agents can produce mergeable code | **Current** |
| 1 | GitHub Projects integration | State management works end-to-end | Planned |
| 2 | Automated review (Greptile) | Greptile + revision loops are reliable | Planned |
| 3 | Full orchestration | Overnight runs complete safely | Planned |
| 4 | Parallel execution + fallback engines | Scale without file conflicts | Planned |
| 5 | Dashboard | Morning review from a single screen | Planned |

Each level is designed to be completed as a self-contained loop that builds trust before moving on.

---

## Key Differentiators

| Feature | How KARIMO Does It |
|---------|-------------------|
| **Task Source** | PRD.md per phase, generated through structured interview |
| **Task State** | GitHub Projects with custom fields (complexity, cost, greptile_score) |
| **Agent Execution** | TypeScript orchestrator with dependency resolution, cost ceilings, sandbox |
| **Code Review** | Greptile auto-reviews (Level 2+); score < 4 triggers cost-budgeted revision loop |
| **Code Integrity** | Mandatory rebase, file-overlap detection, caution-file enforcement |
| **Cost Control** | Per-task ceilings, complexity-scaled iteration limits, phase/session budgets |
| **Learning** | Two-layer compound system (see below) |

---

## Compound Learning

A two-layer architecture that makes agents smarter over time.

### Layer 1: Orchestrator (Automatic)

After every task, the orchestrator collects cost data, Greptile scores, and build failures. It automatically updates:

- **CLAUDE.md rules** — Anti-patterns from real mistakes
- **config.yaml cost multipliers** — Calibrated from actual spend
- **require_review lists** — Files that caused integration failures

### Layer 2: Developer (On-Demand)

Plugin commands for injecting your expertise:

- `/karimo:feedback` — Correct agent behavior; promoted to config
- `/karimo:checkpoint` — Capture learnings at level/phase boundaries
- `/karimo:plan` — Start a new PRD interview with checkpoint context

### The Closed Loop

Mistakes captured → Config updated → Future agents avoid them.

---

## Safeguards

| Safeguard | When It Runs |
|-----------|--------------|
| Cost ceiling check | Every 5 iterations during execution |
| File-overlap detection | Before launching parallel tasks |
| Mandatory rebase | Before PR creation |
| Caution file detection | After rebase, flags PR for human review |
| Integration check | After each PR merge |

---

## Glossary

| Term | What It Means |
|------|---------------|
| **PRD** | Product Requirements Document — describes what to build |
| **Phase** | A set of related tasks from one PRD |
| **Task** | A single unit of work for an agent |
| **Complexity** | How hard a task is (1-10 scale) |
| **Agent** | AI that writes code based on your requirements |
| **Worktree** | Isolated git branch where agents work |
| **Checkpoint** | Saved learnings from previous tasks |

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [Architecture](docs/ARCHITECTURE.md) | System architecture and component design |
| [Components](docs/COMPONENTS.md) | Detailed component specifications |
| [Levels](docs/LEVELS.md) | Level-based build plan (Level 0-5) |
| [Contributing](docs/CONTRIBUTING.md) | How to contribute |
| [Changelog](docs/CHANGELOG.md) | Version history |

### Templates

| Template | Purpose |
| -------- | ------- |
| [PRD Template](templates/PRD_TEMPLATE.md) | Output format for generated PRDs |
| [Interview Protocol](templates/INTERVIEW_PROTOCOL.md) | How the PRD interview works |
| [Config Example](templates/config.example.yaml) | Complete configuration reference |

---

## Status

**In Development — Level 0**

This repository contains the scaffolding for KARIMO. The Level 0 implementation (basic agent execution) is the current focus.

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

---

## License

[Apache 2.0](LICENSE)
