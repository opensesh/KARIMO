# KARIMO

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
[![Ring](https://img.shields.io/badge/Ring-0-orange.svg)]()

**Open-source autonomous development framework — agent, tool, and repo agnostic.**

KARIMO turns product requirements into shipped code using AI agents, automated code review, and structured human oversight.

**You are the architect, agents are the builders, Greptile is the inspector.**

---

## How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Interview  │ →  │  Generate   │ →  │   Execute   │ →  │   Review    │ →  │    Merge    │
│   (human)   │    │     PRD     │    │    Tasks    │    │  (Greptile) │    │   (human)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

1. **Interview** — KARIMO interviews you about a feature: what it does, how it should work, what patterns to follow
2. **Generate PRD** — The interview produces a structured PRD with tasks, dependencies, and success criteria
3. **Execute Tasks** — Each task runs in an isolated worktree with cost controls and iteration limits
4. **Review** — Greptile auto-reviews PRs; scores below threshold trigger revision loops
5. **Merge** — PRs pass integration checks and merge; compound learning captures what worked

---

## Ring-Based Adoption

KARIMO uses a ring-based build plan — each ring is a loop, not just a milestone. You start small (one agent, one task, one manual review), prove it works, and then add the next layer.

This matters because autonomous development is high-stakes. You need to see what agents produce, understand how cost controls behave, and verify that integrity checks catch real problems — all before letting the system run overnight. By Ring 5, you've validated every component in isolation.

| Ring | Capability | What You Prove | Status |
| ---- | ---------- | -------------- | ------ |
| **0** | Basic agent execution | Agents can produce mergeable code | **Current** |
| 1 | GitHub Projects integration | State management works end-to-end | Planned |
| 2 | Automated review (Greptile) | Greptile + revision loops are reliable | Planned |
| 3 | Full orchestration | Overnight runs complete safely | Planned |
| 4 | Parallel execution + fallback engines | Scale without file conflicts | Planned |
| 5 | Dashboard | Morning review from a single screen | Planned |

Each ring is designed to be completed as a self-contained loop that builds trust before moving on.

---

## Key Differentiators

| Feature | How KARIMO Does It |
|---------|-------------------|
| **Task Source** | PRD.md per phase, generated through structured interview |
| **Task State** | GitHub Projects with custom fields (complexity, cost, greptile_score) |
| **Agent Execution** | TypeScript orchestrator with dependency resolution, cost ceilings, sandbox |
| **Code Review** | Greptile auto-reviews (Ring 2+); score < 4 triggers cost-budgeted revision loop |
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
- `/karimo:checkpoint` — Capture learnings at ring/phase boundaries
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

## Quick Start

> **Note:** KARIMO is in early development (Ring 0). The quick start below is a placeholder for when Ring 0 is complete.

```bash
# Install
bun add @karimo/core

# Initialize your project (auto-detects settings, you confirm)
karimo init

# Run the PRD interview
karimo plan

# Execute tasks
karimo orchestrate --phase 1

# Check status
karimo status
```

### First-Time Setup vs. Team Onboarding

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `karimo init` | Creates `.karimo/config.yaml` via auto-detection + confirmation | First-time project setup |
| `bun run onboard` | Verifies existing setup for new team member | Joining a configured project |

**Auto-detection scans your project for:**
- Project metadata (name, language, framework, runtime)
- Build commands (build, lint, test, typecheck)
- Architecture rules (from existing config files)
- File boundaries (never_touch, require_review patterns)
- Sandbox variables (from .env.example)

Each detected value shows a confidence indicator: `●` high, `◐` medium, `○` low, `?` not detected. You confirm or edit before saving.

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [Architecture](docs/ARCHITECTURE.md) | System architecture and component design |
| [Rings](docs/RINGS.md) | Ring-based build plan (Ring 0-5) |
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

**In Development — Ring 0**

This repository contains the scaffolding for KARIMO. The Ring 0 implementation (basic agent execution) is the current focus.

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

---

## License

[Apache 2.0](LICENSE)
