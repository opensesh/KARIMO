# KARIMO

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
[![Ring](https://img.shields.io/badge/Ring-0-orange.svg)]()

**Open-source autonomous development framework — agent, tool, and repo agnostic.**

KARIMO turns product requirements into shipped code using AI agents, automated code review, and structured human oversight.

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

KARIMO uses a ring-based build plan — start small, prove it works, add capability:

| Ring | Capability | Status |
| ---- | ---------- | ------ |
| **0** | Basic agent execution | **Current** |
| 1 | GitHub Projects integration | Planned |
| 2 | Automated review (Greptile) | Planned |
| 3 | Full orchestration | Planned |
| 4 | Parallel execution + fallback engines | Planned |
| 5 | Dashboard | Planned |

Each ring is designed to be completed as a self-contained loop that builds trust before moving on.

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

## Key Features

| Feature | Description |
| ------- | ----------- |
| **Agent Agnostic** | Works with Claude Code, Codex, Gemini |
| **Cost Control** | Per-task ceilings, phase budgets, session caps |
| **Compound Learning** | Agents get smarter from your corrections |
| **Code Integrity** | Mandatory rebase, integration checks, caution files |
| **GitHub Native** | Tasks live in GitHub Projects |

---

## Philosophy

**You are the architect, agents are the builders, Greptile is the inspector.**

KARIMO is a human-centric engineering pipeline. You define what to build through a structured interview. Agents execute within guardrails you control. Automated review catches issues before your eyes see them. Everything stays in GitHub for full traceability.

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
