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

---

## What is KARIMO?

KARIMO is a **framework and Claude Code plugin** for PRD-driven autonomous development. Think of it as **plan mode on steroids** — leveraging Anthropic's latest innovations, including [native worktree isolation](https://code.claude.com/docs/en/common-workflows), [sub-agents](https://code.claude.com/docs/en/sub-agents), [agent teams](https://code.claude.com/docs/en/agent-teams), [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks), and [model routing](https://code.claude.com/docs/en/model-config).

> **Philosophy:** You are the architect, agents are the builders

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
| **Research** | Discover patterns, libraries, gaps — creates PRD folder |
| **Plan** | Structured interview captures requirements |
| **Tasks** | Generate task briefs from research + PRD |
| **Review** | Claude validates briefs against codebase |
| **Orchestrate** | Execute in waves |
| **Inspect** | Review each PR (manual, Code Review, or Greptile) |
| **Merge** | Final PR to main |

---

## Strategic Looping

KARIMO has **three strategic loops** with increasing automation:

| Loop | Stages | Driver | What Happens |
|------|--------|--------|--------------|
| **1** | Research ↔ Plan | **You** | Iterate until PRD captures requirements |
| **2** | Tasks ↔ Auto-Review | **Claude** | Built-in validation before execution starts |
| **3** | Orchestrate ↔ Inspect | **Configurable** | Manual, Claude Code Review, or Greptile |

**Loop 1 — Human-Driven:** `/karimo:research` ↔ `/karimo:plan` — You iterate until PRD is ready

**Loop 2 — Claude Built-In:** `/karimo:run` triggers Tasks → Auto-Review → you approve

**Loop 3 — Review Automation:** Orchestrate creates PRs → Inspect (your choice of tooling) → merge

After all waves complete → `/karimo:merge` creates final PR to main.

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
| **Branch assertion** | 4-layer validation prevents commits to wrong branches ([v7.6.0](.karimo/docs/SAFEGUARDS.md#parallel-execution-safety)) |
| **Loop detection** | Semantic fingerprinting catches stuck tasks ([v7.7.0](#changelog)) |
| **Orphan cleanup** | Git-native detection and removal of abandoned worktrees ([v7.7.0](#changelog)) |
| **Incremental PRD commits** | PRD sections committed after each interview round for traceability ([v7.7.0](#changelog)) |
| **Enhanced merge reports** | PR descriptions show markdown vs code breakdown for transparency ([v7.7.0](#changelog)) |
| **Asset management** | Store and track visual context (mockups, screenshots, diagrams) throughout PRD lifecycle ([v7.8.0](#changelog)) |
| **Model routing** | Sonnet for simple tasks, Opus for complex, auto-escalation on failures |
| **22 agents** | 16 coordination + 6 task agents ([details](.karimo/docs/ARCHITECTURE.md#agents)) |
| **Crash recovery** | Git state reconstruction via `/karimo:dashboard --reconcile` |

---

## Feature Architecture

KARIMO is built on 10 core features — 5 native Claude Code APIs and 5 custom systems. Understanding this boundary helps explain what KARIMO adds vs what Claude Code provides out of the box.

### Native Features (Using Claude Code Directly)

These features use Claude Code's built-in capabilities with no custom logic:

| # | Feature | Claude Code API | How KARIMO Uses It |
|---|---------|-----------------|-------------------|
| **1** | Worktree Isolation | `isolation: worktree` in agent frontmatter | Each task gets isolated git worktree, preventing file conflicts |
| **2** | Sub-Agents | Task tool spawning | PM Agent spawns worker agents (implementer, tester, documenter) |
| **3** | Skills | `skills:` in agent frontmatter | Agents inherit code/testing/doc standards automatically |
| **4** | Hooks | Native hook events in `.claude/settings.json` | `WorktreeRemove`, `SubagentStop`, `SessionEnd` trigger cleanup scripts |
| **5** | Commands | `.claude/commands/*.md` files | All `/karimo:*` commands are standard Claude Code command files |

These work without KARIMO — we simply configure them correctly.

### Custom Features (Built on Git/Bash/GitHub CLI)

These features have **no native Claude Code equivalent**. KARIMO implements them using git operations, bash logic, and GitHub CLI:

| # | Feature | What It Does | Why It's Custom |
|---|---------|--------------|-----------------|
| **6** | [Agent Teams](#agent-teams-wave-execution) | Wave-based parallel execution with max 3 concurrent tasks | Claude Code spawns agents but doesn't coordinate completion order or dependencies |
| **7** | [Model Routing](#model-routing-complexity-escalation) | Complexity-based Sonnet/Opus selection + auto-escalation on failure | Claude Code has `model:` param but no complexity assessment or escalation triggers |
| **8** | [Branch Assertion](#branch-assertion-4-layer-validation) | 4-layer validation preventing commits to wrong branches | Native worktrees isolate files but don't verify branch identity before commits |
| **9** | [Loop Detection](#loop-detection-semantic-fingerprinting) | Semantic fingerprinting catches stuck tasks via diff comparison | Claude Code has no built-in loop/repetition detection |
| **10** | [Crash Recovery](#crash-recovery-git-state-reconciliation) | Git-based state reconstruction when sessions crash | Native worktrees persist but don't track what was "in progress" |

---

### Agent Teams (Wave Execution)

**Location:** `pm.md` lines 285-310

Tasks execute in dependency-ordered waves:

```
Wave 1: [1a, 1b] ──▸ parallel (max 3) ──▸ wait for all PRs to merge
                              ↓
Wave 2: [2a, 2b] ──▸ parallel (max 3) ──▸ wait for all PRs to merge
                              ↓
Wave 3: [3a]     ──▸ final task
```

**Why custom:** Claude Code's Task tool spawns agents but doesn't:
- Understand task dependencies (task 2a needs task 1a's output)
- Enforce concurrency limits (could overwhelm CI/CD)
- Wait for PR merges between waves
- Propagate findings from completed tasks to dependent tasks

**Without this:** Tasks would race, later tasks would miss earlier changes, merge conflicts would accumulate.

---

### Model Routing (Complexity + Escalation)

**Location:** `pm.md` lines 312-317, `pm-reviewer.md` lines 265-298

Two-tier model selection:

| Complexity | Model | Agent |
|------------|-------|-------|
| 1-2 (simple) | Sonnet | karimo-implementer, karimo-tester, karimo-documenter |
| 3-10 (complex) | Opus | karimo-implementer-opus, karimo-tester-opus, karimo-documenter-opus |

Auto-escalation triggers:
- Architectural keywords in review findings (`refactor`, `decouple`, `design pattern`)
- Type system issues (`interface`, `contract`, `abstraction`)
- Second failed revision attempt

**Why custom:** Claude Code's `model:` parameter is static per agent. It doesn't:
- Assess task complexity to route dynamically
- Detect failure patterns that indicate need for stronger model
- Escalate Sonnet → Opus when simpler model is stuck

**Without this:** Simple tasks would waste Opus tokens, complex tasks would fail repeatedly with Sonnet.

---

### Branch Assertion (4-Layer Validation)

**Location:** `pm.md` lines 201-233, `KARIMO_RULES.md` lines 74-105

Defense-in-depth against cross-branch commits:

```
Layer 1: ensure_branch() function ──▸ Recovery mechanism in PM Agent
Layer 2: KARIMO_RULES.md Section 2 ──▸ Mandatory pre-commit check
Layer 3: Spawn prompt context ──▸ Visual branch reminder
Layer 4: Task agent verification ──▸ All 6 agents check branch
```

Invocation points:
1. Before each wave starts
2. Before spawning each worker
3. Before committing wave state
4. Before running validation
5. Before finalization commit

**Why custom:** Native `isolation: worktree` creates separate worktrees but doesn't:
- Enforce predictable branch naming (`worktree/{prd-slug}-{task-id}`)
- Verify branch identity before git operations
- Recover if agent accidentally checks out different branch

**Without this:** A confused agent could commit to main or another task's branch, corrupting the repository.

---

### Loop Detection (Semantic Fingerprinting)

**Location:** `pm-reviewer.md` lines 357-412

Detects stuck tasks by comparing execution state:

```bash
fingerprint = "${files_changed}|${error_patterns}"
# Example: "src/api.ts,src/types.ts|TypeError:,build failed"
```

Circuit breaker behavior:

| Condition | Action |
|-----------|--------|
| Same fingerprint + Sonnet | Escalate to Opus, reset loop count |
| Same fingerprint + Opus | Return `escalate` verdict → human review |
| 3 revision loops | Return `escalate` verdict |
| 5 total loops (hard limit) | Return `escalate` verdict |

**Why custom:** Claude Code has no built-in mechanism to detect when:
- Same files are being modified repeatedly with same errors
- Agent is making identical changes on each attempt
- Task is genuinely stuck vs making incremental progress

**Without this:** Revision loops would continue indefinitely, burning tokens on unsolvable problems.

---

### Crash Recovery (Git State Reconciliation)

**Location:** `pm.md` lines 235-280

Reconstructs execution state from git + GitHub when session crashes:

```bash
for task_id in all_tasks:
  if branch_exists(local OR remote):
    pr = gh pr list --head $branch
    if pr.merged: status = "done"
    elif pr.needs_revision: status = "needs-revision"
    elif pr.open: status = "in-review"
    else: status = "crashed"
  else:
    status = "pending"
```

**Why custom:** Claude Code doesn't maintain state about:
- Which tasks were running when session ended
- Whether PRs were created/merged/closed
- How to resume partial execution

**Without this:** After a crash, you'd have to start over or manually inspect git state.

---

## Hooks

KARIMO uses a **hybrid hook system** for reliable resource management:

| Hook Type | Configuration | Purpose |
|-----------|---------------|---------|
| **Native (Claude Code)** | `.claude/settings.json` | Worktree/branch cleanup (guaranteed execution) |
| **Orchestration (KARIMO)** | `.karimo/hooks/*.sh` | Wave/task lifecycle customization |

### Native Hooks (Automatic)

| Event | When | What it Cleans |
|-------|------|----------------|
| `WorktreeRemove` | Before worktree removal | Local + remote branches |
| `SubagentStop` | After worker finishes | Stale worktree references |
| `SessionEnd` | Session termination | Orphaned branches |

Native hooks fire even on session crash, guaranteeing cleanup.

### KARIMO Orchestration Hooks (Customizable)

| Hook | When | Example Use |
|------|------|-------------|
| `pre-wave.sh` | Before wave starts | Slack notification |
| `post-wave.sh` | After wave completes | Metrics collection |
| `on-merge.sh` | After PR merges | Deploy trigger |
| `on-failure.sh` | Task fails | PagerDuty alert |

Details: [Hooks Documentation](.karimo/hooks/README.md)

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
| `/karimo:research "feature"` | **Start here** — Creates PRD folder + runs research |
| `/karimo:plan --prd {slug}` | Interactive PRD creation (~10 min) |
| `/karimo:run --prd {slug}` | Brief generation → review → execution |
| `/karimo:merge --prd {slug}` | Final PR to main |
| `/karimo:dashboard` | Monitor progress |
| `/karimo:feedback` | Capture learnings |
| `/karimo:doctor` | Diagnose issues |

Full reference: [COMMANDS.md](.karimo/docs/COMMANDS.md)

---

## Adoption Phases

| Phase | What You Get |
|-------|--------------|
| **Phase 1** | PRD interviews, agent execution, worktrees, PRs — works out of the box |
| **Phase 2** | Automated review via Greptile ($30/mo) or Claude Code Review ($15-25/PR) |
| **Phase 3** | CLI dashboard with velocity metrics via `/karimo:dashboard` |

Details: [PHASES.md](.karimo/docs/PHASES.md)

---

## Context Architecture

KARIMO uses layered context management for efficient token usage:

| Layer | Size | Purpose |
|-------|------|---------|
| **L1 Overviews** | ~2K tokens | Discover all items in category |
| **L2 Full Definitions** | Variable | Complete content for execution |

**Key files:**
- `.claude/agents.overview.md` — All agents at a glance
- `.claude/plugins/karimo/agents/*.md` — Full agent definitions
- `.claude/skills.overview.md` — All skills with agent mapping
- `.karimo/learnings/` — Categorized project learnings
- `.karimo/findings/` — Cross-PRD pattern index

Details: [Context Architecture](.karimo/docs/CONTEXT-ARCHITECTURE.md)

### Compound Learning

KARIMO has a two-tier knowledge system that makes agents smarter over time:

| Tier | Scope | Created By | Storage |
|------|-------|------------|---------|
| **Findings** | Per-PRD | Worker agents (automatic) | `.karimo/prds/{slug}/findings.md` |
| **Learnings** | Project-wide | User via `/karimo:feedback` | `.karimo/learnings/` |

**Findings** are task-to-task communication during a single PRD execution:
```
.karimo/prds/{slug}/
├── findings.md          # Aggregated discoveries from all tasks
└── briefs/
    └── {task}/findings.md  # Per-task discoveries (in worktree)
```

When a worker discovers something downstream tasks need (new API, gotcha, pattern), it writes to `findings.md`. The PM Agent propagates these to dependent task briefs. Findings are ephemeral — they exist for one PRD cycle.

**Learnings** are permanent project wisdom captured via `/karimo:feedback`:
```
.karimo/learnings/
├── index.md             # Navigation + stats
├── patterns/            # Positive practices to replicate
├── anti-patterns/       # Mistakes to avoid
├── project-notes/       # Project-specific context
└── execution-rules/     # Mandatory guidelines
```

Learnings are read by all agents before task execution. They prevent the same mistake from happening twice.

**Promotion path:** Findings that appear in 3+ PRDs can be promoted to learnings via `/karimo:feedback --from-metrics`.

Details: [Compound Learning](.karimo/docs/COMPOUND-LEARNING.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [Commands](.karimo/docs/COMMANDS.md) | Full command reference |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design + agent details |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |
| [Safeguards](.karimo/docs/SAFEGUARDS.md) | Code integrity & security |

Configuration lives in `.karimo/config.yaml` — run `/karimo:configure` after install.

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
