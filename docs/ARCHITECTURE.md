# KARIMO Architecture

**Version:** 1.5
**Status:** Active

---

## Overview

KARIMO is an open-source autonomous development framework — agent, tool, and repo agnostic. It turns product requirements into shipped code using AI agents, automated code review, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## State Detection & Guided Flow

When you run `karimo` without arguments, it detects your project state and routes you automatically.

### Project Phases

```
welcome → init → create-prd → resume-prd → execute → complete
```

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| `welcome` | No `.karimo/` folder | Show introduction, proceed to init |
| `init` | `.karimo/` exists, no config | Run interactive setup |
| `create-prd` | Config exists, no PRDs | Start PRD interview |
| `resume-prd` | PRD in progress | Resume interview at last round |
| `execute` | Finalized PRD exists | Show task menu, run agents |
| `complete` | All tasks done | Show completion summary |

### State Storage

State is persisted in `.karimo/state.json`:

```json
{
  "level": 0,
  "current_prd": "001_token-studio",
  "current_prd_section": "requirements",
  "completed_prds": [],
  "completed_cycles": 0,
  "last_activity": "2024-01-15T10:30:00Z"
}
```

### PRD Sections (Interview Rounds)

| Section | Round | PRD Sections Filled |
|---------|-------|---------------------|
| `framing` | 1 | §1 Executive Summary |
| `requirements` | 2 | §3 Goals, §4 Requirements, §5 UX Notes |
| `dependencies` | 3 | §6 Dependencies, §7 Rollout, §8 Milestones |
| `agent-context` | 4 | §11 Agent Boundaries |
| `retrospective` | 5 | §10 Checkpoint Learnings |
| `review` | — | Review agent checks for gaps |
| `finalized` | — | PRD ready for execution |

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

## PRD Interview System

The interview system uses direct Anthropic API calls (not Claude Code subagents) to have a conversation that generates a PRD.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Interview System                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │  Interview  │  │  Investigation   │  │    Review    │   │
│  │    Agent    │  │      Agent       │  │    Agent     │   │
│  └─────────────┘  └──────────────────┘  └──────────────┘   │
│         │                  │                    │           │
│         ▼                  ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Session State Machine                   │   │
│  │  (tracks round, messages, summaries, PRD progress)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    PRD File                          │   │
│  │            .karimo/prds/NNN_slug.md                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| Interview Agent | Section-by-section conversation | None (conversational) |
| Investigation Agent | Codebase scanning (opt-in during Round 3) | find_files, read_file, search_content, list_directory |
| Review Agent | Gap detection after interview | None (analysis only) |

### Context Management

- Token count tracked (~4 chars/token estimate)
- At 90% capacity: conversation summarized, API call restarted
- User sees seamless continuation
- Session resumable across terminal sessions

### Interview Subagents

Interview agents can spawn focused subagents for specialized tasks:

```
┌─────────────────────────────────────────────────────────────┐
│                    Parent Agent                              │
│  (Interview, Investigation, or Review)                       │
├─────────────────────────────────────────────────────────────┤
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Subagent A  │  │ Subagent B  │  │ Subagent C  │         │
│  │(clarify)    │  │(research)   │  │(validate)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           ▼                                  │
│               Results injected back                          │
│               into parent context                            │
└─────────────────────────────────────────────────────────────┘
```

Subagent types:
- **clarification** — Deep-dive on ambiguous requirements
- **research** — Investigate codebase during interview
- **scope-validator** — Validate scope against existing code
- **pattern-analyzer** — Analyze specific code patterns
- **section-reviewer** — Review specific PRD section (parallelizable)
- **complexity-validator** — Validate complexity scores

---

## Agent Architecture Enhancements

### Extended Thinking

Auto-enables deeper reasoning based on task complexity signals:

```
Complexity Score (0-100)
    │
    ├── 0-30:  Disabled (0 tokens)
    ├── 31-50: Minimal (1,024 tokens)
    ├── 51-70: Moderate (4,096 tokens)
    └── 71+:   Deep (16,384 tokens)
```

Signal weights:
- Complexity >= 7: +25 points
- Files affected >= 8: +15 points
- Success criteria >= 6: +15 points
- Architecture keywords: +20 points
- Refactor keywords: +15 points
- Review agent calls: +30 points (always triggers)

### Structured Output

Enforces JSON schemas on agent outputs:

1. Extract JSON from output (handles markdown blocks)
2. Parse with retry logic (trailing commas, etc.)
3. Validate against Zod schema
4. On failure: return errors with optional fallback to raw output

Includes Zod-to-JSON Schema converter for CLI tools.

### Agent Teams

Parallel task execution with coordination:

```
┌─────────────────────────────────────────────────────────────┐
│                      PMAgent Coordinator                     │
│                   (TypeScript orchestration)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent N  │   │
│  │ Task 1a  │  │ Task 1b  │  │ Task 1c  │  │   ...    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┼─────────────┼─────────────┘          │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              File-Based Task Queue                   │   │
│  │  .karimo/team/{phaseId}/queue.json                  │   │
│  │  - Atomic file locking                              │   │
│  │  - Optimistic concurrency (version checking)        │   │
│  │  - Findings propagation between tasks               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

Key capabilities:
- **File overlap detection** — Tasks with shared files run sequentially
- **Findings system** — Cross-agent communication (affects-file, interface-change, warnings)
- **Dependency resolution** — Tasks wait for dependencies before starting
- **Graceful failure handling** — Stop-on-failure mode or continue-on-failure

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
│                          │  │   [Level 5 — not needed until then] │
│  karimo                  │  │                                    │
│  karimo init             │  │  ┌─────────┐  ┌────────────────┐   │
│  karimo orchestrate      │  │  │ Phase   │  │ Dependency     │   │
│    --phase 1 --task 1a   │  │  │ Overview│  │ Graph          │   │
│  karimo status           │  │  └─────────┘  └────────────────┘   │
│  bun run checkpoint      │  │  ┌─────────┐  ┌────────────────┐   │
│    --level 1             │  │  │ Merge   │  │ Cost           │   │
│  Ctrl+C                  │  │  │ Report  │  │ Tracker        │   │
└──────────────┬───────────┘  │  └─────────┘  └────────────────┘   │
               │              └──────────────┬─────────────────────┘
               ▼                             │ reads from
┌──────────────────────────┐  ┌──────────────┴──────────────────┐
│   ORCHESTRATOR ENGINE    │  │       GITHUB PROJECTS           │
│                          │  │  (Single source of truth for    │
│  Reads PRD tasks         │  │   task state across all phases) │
│  Resolves dependencies   ├─▶│                                 │
│  Checks file overlaps    │  │  Ready → In Progress → In Review│
│  Enforces cost ceilings  │  │  → Revision → Done / Failed     │
│  Mandatory rebase pre-PR │  │                                 │
│  Spawns sandboxed agents │  │  [Offline fallback: local JSON] │
│  Updates GitHub Project  │  │                                 │
│  Logs costs to SQLite    │  └─────────────────────────────────┘
│  Polls Greptile (async)  │
│  Runs compound learning  │
└──────────────┬───────────┘
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐
│WORKTREE│ │WORKTREE│ │WORKTREE│
│Phase 1 │ │Phase 2 │ │Phase 3 │
│        │ │        │ │        │
│ Agent  │ │ Agent  │ │ Agent  │
│Sandbox │ │Sandbox │ │Sandbox │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    ▼          ▼          ▼
┌─────────────────────────────────────┐
│          PRE-PR CHECKS              │
│  1. Mandatory rebase onto phase     │
│     branch HEAD                     │
│  2. bun run build && typecheck      │
│  3. Caution file detection          │
│  4. Cost ceiling check              │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│        GITHUB PRs CREATED           │
│  task branch → PR → phase branch    │
│  Labels: caution files, cost,       │
│  complexity                         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          CODE REVIEW                │
│  Level 0-1: Manual (you review)      │
│  Level 2+: Greptile auto-review      │
│  Async — doesn't block pipeline     │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
     Score ≥ 4/5      Score < 4/5
         │                 │
         ▼                 ▼
┌──────────────┐  ┌───────────────────┐
│  MARK DONE   │  │  REVISION LOOP    │
│  Log cost    │  │  Cost-budgeted    │
│              │  │  Max 3 attempts   │
│              │  │  Revision budget: │
│              │  │  50% of original  │
└──────────────┘  └───────────────────┘
         │                 │
         └────────┬────────┘
                  ▼
┌─────────────────────────────────────┐
│   POST-MERGE INTEGRATION CHECK      │
│   bun run build && typecheck &&     │
│   test on phase branch              │
│   Failure → rollback merge          │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   COMPOUND LEARNING (Layer 1)       │
│   Checkpoint data collected         │
│   Config files updated automatically│
│   CLAUDE.md rules appended          │
│   Cost multipliers recalibrated     │
└─────────────────────────────────────┘
```

---

## Module Structure

| Module | Purpose |
| ------ | ------- |
| `src/cli` | CLI entry point, command routing |
| `src/cli/state/` | State detection, phase routing, persistence |
| `src/cli/welcome.ts` | Welcome screen display |
| `src/cli/execute-flow.ts` | Execution flow wrapper |
| `src/orchestrator` | Core execution loop, task runner, phase management |
| `src/config` | Config schema, validator, init command |
| `src/interview/` | PRD interview system |
| `src/interview/agents/` | Interview, Investigation, Review agents |
| `src/interview/subagents/` | Spawnable focused subagents (clarification, research, review) |
| `src/interview/section-mapper.ts` | Round-to-PRD-section mapping |
| `src/prd` | PRD parser, YAML task extraction, dependency resolver |
| `src/git` | Worktree management, branch ops, rebase |
| `src/github` | GitHub API integration, PR creation, issue management |
| `src/agents` | Agent spawning, sandbox, environment filtering |
| `src/thinking` | Extended thinking auto-enablement based on complexity |
| `src/structured-output` | Zod schema validation, JSON Schema conversion |
| `src/team` | Agent team coordination (PMAgent, queue, findings, scheduler) |
| `src/learning` | Compound learning system (Layer 1 + Layer 2) |
| `src/cost` | Cost tracking, ceiling enforcement, token parsing |
| `src/types` | Shared TypeScript types and interfaces |

---

## CLI Command Reference

### Guided Mode (Default)

```bash
karimo              # Detect state, guide to next step
```

### Direct Commands

| Command | Description | Available In |
|---------|-------------|--------------|
| `karimo init` | Initialize project config | Any phase |
| `karimo orchestrate --phase X --task Y` | Execute specific task | execute phase |
| `karimo orchestrate --phase X --task Y --dry-run` | Preview execution plan | execute phase |
| `karimo status` | Show project state | Any phase |
| `karimo help` | Show help | Any phase |
| `karimo version` | Show version | Any phase |

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
- **Build commands** — Required: build, lint. Recommended: test, typecheck
  - Required commands must be provided during `karimo init`
  - Recommended commands can be set to `null` if not applicable
- **Rules** — Architecture rules agents must follow
- **Boundaries** — `never_touch` and `require_review` file lists
- **Cost settings** — Multipliers, caps, budgets
- **Sandbox** — Allowed environment variables

See `templates/config.example.yaml` for a complete example.

---

## Auto-Detection System

When you run `karimo init`, the system performs intelligent scanning before prompting for configuration:

### Detection Modules

| Detector | Source Signals | Output |
|----------|----------------|--------|
| **project** | package.json, pyproject.toml, go.mod, Cargo.toml | name, language, framework, runtime, database |
| **commands** | package.json scripts, Makefile, existing configs | build, lint, test, typecheck commands |
| **rules** | tsconfig, eslint, biome, prettier configs | Architecture rules (max 10) |
| **boundaries** | Common patterns, existing .gitignore | never_touch, require_review file lists |
| **sandbox** | .env.example (never actual .env) | Safe environment variable list |

### Confidence Levels

Each detected value carries a confidence indicator:

| Symbol | Level | Meaning |
|--------|-------|---------|
| `●` | High | Strong signal, auto-accepted |
| `◐` | Medium | Good signal, user should verify |
| `○` | Low | Weak signal, likely needs correction |
| `?` | Not detected | User must fill in |

### Init Flow

1. **Scan** — All 5 detectors run in parallel (target: < 500ms)
2. **Display** — Show detected values with confidence indicators
3. **Confirm** — User confirms or edits each section
4. **Write** — Generate and save `.karimo/config.yaml`

### Design Principles

- **Conservative detection** — Prefer null over wrong guess
- **Parallel execution** — All detectors run via Promise.all
- **Privacy-safe** — Never read actual .env files, only .env.example
- **Bounded output** — Rules capped at 10, boundaries only include existing files

### Init vs. Onboard

| Command | Purpose |
|---------|---------|
| `karimo init` | First-time setup: scan → confirm → write config |
| `bun run onboard` | Team onboarding: verify existing config works |

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

## Risk Mitigation

| Risk | How KARIMO Handles It |
|------|----------------------|
| Agent breaks existing functionality | Mandatory rebase, phase-level integration check, merge rollback |
| Runaway costs | Per-task cost ceiling, complexity-scaled iterations, revision cost budget, resilient token parsing |
| Agent goes rogue | Agent sandbox, filtered environment variables, caution-file enforcement |
| Merge cascade (sibling branches go stale) | Mandatory rebase before PR creation; conflicts → needs-human-rebase |
| File overlap in parallel tasks | File-overlap detection forces sequential execution |
| Greptile misses interaction bugs | Cumulative phase review against main |
| Caution files modified silently | `require_review` enforcement — PR label + merge block |
| Auth/rate-limit errors waste iterations | Scoped GitHub token, error classification, fallback engines |
| Dashboard is attacked | API key auth + confirmation tokens on merge |
| Secrets leak to agents | Environment variable filtering, explicit allowlist |
| GitHub Projects API is painful | `lib/github-projects.ts` wrapper + offline mode |
| Greptile blocks pipeline | Non-blocking — tasks move to `review-pending`, async processing |
| Too many Day 1 dependencies | Level-based: Day 1 needs git, Bun, Claude Code only |
| No cross-phase learning | Two-layer compound learning with structured checkpoints and feed-forward |
| New team member confusion | `bun run onboard` flow + checkpoint-based learning |

---

## Key Principles

1. **You design the product, agents execute the plan.** The PRD interview is where your product expertise lives. Agents handle implementation.

2. **PRD is the narrative truth, GitHub Projects is the execution truth.** The PRD tells the story. GitHub Projects tracks where every task is right now.

3. **Dependencies before execution.** Never let an agent start a task whose dependencies aren't met.

4. **Fail fast, fail cheap.** Fatal errors abort immediately. Cost ceilings enforce budgets. Revision loops are cost-budgeted.

5. **Compound the learnings — with structure.** Two layers: automatic orchestrator updates + developer feedback. Both feed forward into config, PRDs, and agent prompts.

6. **Graceful degradation.** Dashboard → GitHub Projects → PRD.md. Online → offline. Greptile → manual review.

7. **Build in levels.** Each level is a loop — run it, validate it works, then unlock the next.

8. **Security is a constraint, not a feature.** Scoped tokens, sandboxed agents, authenticated endpoints — requirements from Level 0.

---

## Further Reading

- [LEVELS.md](./LEVELS.md) — Level-based build plan (Level 0-5)
- [COMPONENTS.md](./COMPONENTS.md) — Component specifications
- [COMPOUND-LEARNING.md](./COMPOUND-LEARNING.md) — Checkpoint system
- [SECURITY.md](./SECURITY.md) — Security model and agent sandbox
- [CODE-INTEGRITY.md](./CODE-INTEGRITY.md) — Pre-PR checks and safeguards
- [DASHBOARD.md](./DASHBOARD.md) — Dashboard specifications (Level 5)
- [DEPENDENCIES.md](./DEPENDENCIES.md) — Dependency inventory
- [CHANGELOG.md](./CHANGELOG.md) — Version history
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contributing guide
- [templates/PRD_TEMPLATE.md](../templates/PRD_TEMPLATE.md) — PRD format
- [templates/INTERVIEW_PROTOCOL.md](../templates/INTERVIEW_PROTOCOL.md) — Interview process
