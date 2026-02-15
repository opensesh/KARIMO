# KARIMO Architecture

**Version:** 1.2
**Status:** Active

---

## Overview

KARIMO is an open-source autonomous development framework — agent, tool, and repo agnostic. It turns product requirements into shipped code using AI agents, automated code review, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## How It Works

KARIMO is a human-centric engineering pipeline:

1. **Interview** — KARIMO interviews you about a feature: what it does, how it should work, what patterns to follow
2. **PRD Generation** — The interview generates a PRD with structured tasks
3. **Task Execution** — Each task is executed by an agent in a cost-controlled loop until it meets success criteria
4. **Code Review** — Greptile reviews the output automatically; score < 4 triggers revision loop
5. **Merge** — PRs are created, reviewed, and merged with integration checks
6. **Learning** — Compound learning system updates configs based on what worked and what didn't

---

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOU (Product Architect)                      │
│                                                                 │
│  1. Choose a phase from the Implementation Plan                 │
│  2. Run PRD Interview (references latest checkpoint learnings)  │
│  3. PRD.md generated → Tasks auto-created as GitHub Issues      │
│     → Added to GitHub Project with custom fields                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────────┐  ┌────────────────────────────────────┐
│   CLI (Execution)        │  │   DASHBOARD (Review & Merge)       │
│                          │  │   [Ring 5 — optional]              │
│  karimo orchestrate      │  │                                    │
│    --phase 1             │  │  Phase Overview                    │
│  karimo status           │  │  Dependency Graph                  │
│  karimo checkpoint       │  │  Merge Report                      │
│                          │  │  Cost Tracker                      │
└──────────────┬───────────┘  └──────────────┬─────────────────────┘
               │                             │
               ▼                             │
┌──────────────────────────┐  ┌──────────────┴──────────────────┐
│   ORCHESTRATOR ENGINE    │  │       GITHUB PROJECTS           │
│                          │  │  (Single source of truth)       │
│  Reads PRD tasks         │  │                                 │
│  Resolves dependencies   │  │  Ready → In Progress → Review   │
│  Checks file overlaps    │  │  → Revision → Done / Failed     │
│  Enforces cost ceilings  ├─▶│                                 │
│  Spawns sandboxed agents │  └─────────────────────────────────┘
│  Updates GitHub Project  │
│  Runs compound learning  │
└──────────────┬───────────┘
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐
│WORKTREE│ │WORKTREE│ │WORKTREE│
│Phase 1 │ │Phase 2 │ │Phase 3 │
│ Agent  │ │ Agent  │ │ Agent  │
│Sandbox │ │Sandbox │ │Sandbox │
└────────┘ └────────┘ └────────┘
```

---

## Module Structure

| Module | Purpose |
| ------ | ------- |
| `src/orchestrator` | Core execution loop, task runner, phase management |
| `src/config` | Config schema, validator, init command |
| `src/prd` | PRD parser, YAML task extraction, dependency resolver |
| `src/git` | Worktree management, branch ops, PR creation, rebase |
| `src/github` | GitHub Projects API integration, issue creation |
| `src/agents` | Agent spawning, sandbox, environment filtering |
| `src/learning` | Compound learning system (Layer 1 + Layer 2) |
| `src/cost` | Cost tracking, ceiling enforcement, token parsing |
| `src/cli` | CLI entry point, command routing |
| `src/types` | Shared TypeScript types and interfaces |

---

## Compound Learning System

Two-layer architecture that makes agents smarter over time:

### Layer 1: Orchestrator-Level (Deterministic)

After every task completion, the orchestrator:
- Collects cost data, Greptile scores, build failures
- Generates checkpoint JSON with patterns and anti-patterns
- Updates CLAUDE.md rules, config.yaml, and caution file lists

### Layer 2: Agent-Level (Developer-Facing)

Plugin commands for injecting expertise:
- `/karimo:feedback` — Correct agent behavior, promoted to config
- `/karimo:status` — Current phase/task status
- `/karimo:checkpoint` — Interactive checkpoint with qualitative feedback
- `/karimo:plan` — Kicks off PRD interview

---

## Cost Control

| Control | Description |
| ------- | ----------- |
| Per-task ceiling | `complexity × cost_multiplier` |
| Iteration limit | `base_iterations + (complexity × iteration_multiplier)` |
| Revision budget | `cost_ceiling × (revision_budget_percent / 100)` |
| Phase budget cap | Soft cap with overflow for running tasks |
| Session budget cap | Hard cap, no overflow |

---

## Code Integrity

| Safeguard | When It Runs |
| --------- | ------------ |
| File-overlap detection | Before launching parallel tasks |
| Cost ceiling check | Every 5 iterations during execution |
| Mandatory rebase | Before PR creation |
| Caution file detection | After rebase, flags PR |
| Integration check | After PR merge |
| Compound learning | After task marked done |

---

## Configuration

Project-specific settings live in `.karimo/config.yaml`:

- **Project metadata** — Name, language, framework, runtime
- **Build commands** — build, lint, test, typecheck
- **Rules** — Architecture rules agents must follow
- **Boundaries** — `never_touch` and `require_review` file lists
- **Cost settings** — Multipliers, caps, budgets
- **Sandbox** — Allowed environment variables

See `templates/config.example.yaml` for a complete example.

---

## GitHub Projects Integration

One GitHub Project per feature phase with:

**Custom Fields:**
- complexity, assigned_to, depends_on
- cost_ceiling, actual_cost
- estimated_iterations, iterations_used
- greptile_score, pr_number
- agent_status, revision_count
- require_review_triggered

**Status Columns:**
- Ready → In Progress → In Review → Review Pending
- Revision → Done → Failed
- Needs Human Rebase → Integration Failure

---

## Further Reading

- [RINGS.md](./RINGS.md) — Ring-based build plan (Ring 0-5)
- [CHANGELOG.md](./CHANGELOG.md) — Version history
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contributing guide
- [templates/PRD_TEMPLATE.md](../templates/PRD_TEMPLATE.md) — PRD format
- [templates/INTERVIEW_PROTOCOL.md](../templates/INTERVIEW_PROTOCOL.md) — Interview process
