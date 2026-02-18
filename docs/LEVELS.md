# KARIMO Level-Based Build Plan

KARIMO uses a level-based adoption strategy. Each level is a validation loop. Complete one before starting the next. The level sequence matters more than dates.

---

## Why Levels?

Autonomous development is high-stakes. Before letting agents run overnight, you need to:

- See what agents actually produce
- Understand how cost controls behave
- Verify that code integrity checks catch real problems

Each level is a self-contained loop — not just a milestone. You complete a level, validate it works, then add the next layer of capability. This provides a slow, steady integration path that builds trust without disrupting your existing workflow.

By the time you reach Level 5 (dashboard, parallel execution, overnight runs), you've already validated every component in isolation.

---

## Agent Capabilities by Level

| Capability | Available At | Description |
|------------|--------------|-------------|
| Extended Thinking | Level 0+ | Auto-enabled based on complexity signals |
| Structured Output | Level 0+ | JSON schema validation for agent outputs |
| Interview Subagents | Level 0+ | Focused subagents for clarification, research, review |
| Task Queue | Level 3+ | File-based queue for sequential multi-task execution |
| Findings System | Level 3+ | Cross-task communication for discovered dependencies |
| PMAgent Coordination | Level 4+ | TypeScript coordinator for parallel execution |
| File Overlap Detection | Level 4+ | Forces overlapping tasks to run sequentially |

---

## Level 0: Foundation (Day 1–2)

**Goal:** Prove that one agent can produce one mergeable PR from one task spec.

**Entry criteria:**
- Clean target project repo
- Claude Code installed
- Bun installed

**What you build:**
- **Auto-detection system** (`src/config/detect/`):
  - 5 parallel detectors: project, commands, rules, boundaries, sandbox
  - Confidence levels: `●` high, `◐` medium, `○` low, `?` not detected
  - Conservative detection (null over wrong guess)
  - Performance target: < 500ms
- **`karimo init` command** with detect-first, confirm-second flow
- `.karimo/config.yaml` generated via auto-detection + confirmation
- Minimal orchestrator script that can:
  - Read a single task from a PRD.md YAML block
  - Create a git branch in a worktree
  - Launch Claude Code with the task prompt + config rules
  - Wait for completion
  - Create a PR targeting the phase branch
- Manual PRD: hand-write one PRD.md for a single task

**What you skip:**
- GitHub Projects integration
- Greptile
- Dashboard
- Parallel execution
- Cost tracking
- Fallback engines
- Revision loops

**Agent Capabilities Available:**
- Extended thinking (auto-enabled based on complexity)
- Structured output validation (for interview agents)
- Interview subagents (clarification, research, scope validation)

**Exit criteria:**
- `karimo init` generates valid config from project scan
- Auto-detection completes in < 500ms
- Agent produced a PR from the task spec
- PR passes `bun run build && bun run typecheck`
- You reviewed the PR manually and it's mergeable

**Day 1 dependencies:** git, Bun, Claude Code. That's it.

---

## Level 1: State Management (Day 3–5)

**Goal:** Task state flows through GitHub Projects. The orchestrator reads and writes project state.

**Entry criteria:** Level 0 complete.

**What you build:**
- `bun run init-project` — scaffolds GitHub Project with all fields and columns
- `lib/github-projects.ts` — thin wrapper over GitHub Projects GraphQL API:
  - `createItem`, `updateField`, `moveToColumn`, `getProjectState`
- GitHub Project with status columns and custom fields (see [COMPONENTS.md](./COMPONENTS.md#52-github-projects-integration))
- Orchestrator creates GitHub Issues from PRD, moves issues through columns
- Orchestrator skips completed tasks on re-run
- Offline mode: `--offline` flag stores state in `.karimo/local-state.json`

**What you skip:**
- Greptile
- Parallel execution
- Dashboard
- Cost tracking in SQLite
- Fallback engines

**Exit criteria:**
- Task state flows through GitHub Projects columns (Ready → In Progress → In Review → Done)
- `karimo status` reads from GitHub Projects and prints current state
- Orchestrator skips completed tasks on re-run
- Offline mode works with local JSON

**Dependencies added:** GitHub fine-grained personal access token (scoped).

---

## Level 2: Automated Review (Day 6–8)

**Goal:** Greptile reviews PRs automatically. Revision loops work end-to-end with cost budgets.

**Entry criteria:** Level 1 complete.

**What you build:**
- Greptile configuration on the target repo
- Greptile polling in orchestrator (async, non-blocking)
- Revision loop with cost budget (50% of original task cost)
- `review-pending` status for Greptile timeouts
- Mandatory rebase before PR creation
- Cost ceiling enforcement (`complexity × cost_multiplier`)
- Resilient token parsing (multi-strategy, never returns $0)
- SQLite cost tracking

**Exit criteria:**
- Greptile reviews a PR and returns a score
- Score < 4 triggers revision loop with Greptile feedback
- Revision loop respects cost budget
- Cost ceiling aborts tasks exceeding `complexity × $3`
- Token parsing works with at least 2 strategies
- Greptile timeout moves task to `review-pending`

**Dependencies added:** Greptile account, SQLite.

---

## Level 3: Orchestration (Day 9–12)

**Goal:** Full sequential multi-task execution overnight. Error classification, caution-file enforcement.

**Entry criteria:** Level 2 complete.

**What you build:**
- Full sequential phase execution: `karimo orchestrate --phase 1`
- Task queue system for tracking execution state
- Findings propagation between dependent tasks
- Error classification (fatal vs. retryable) with appropriate handling
- Caution-file enforcement (`require_review` list — flags PRs, blocks auto-merge)
- Phase-level integration check (build + typecheck + test after each merge)
- Merge rollback on integration failure
- Cumulative phase review (Greptile reviews entire phase branch diff against main)
- Agent sandbox setup (restricted env vars, read-only config)
- Compound learning Layer 1 — checkpoint data collection and config auto-updates
- Task lockfiles for partial work recovery
- `karimo recover` command
- First full overnight run

**Agent Capabilities Used:**
- Extended thinking for complex tasks
- Structured output for review agents
- Subagents for section-level reviews

**Exit criteria:**
- `karimo orchestrate --phase 1` runs a full phase sequentially overnight
- Fatal errors abort immediately; retryable errors use backoff
- Caution file modifications get flagged with PR label
- Phase-level integration check catches build failures and rolls back merges
- You woke up to a terminal summary of what happened
- Checkpoint data written and config files updated after task completions
- `karimo recover` handles interrupted tasks

---

## Level 4: Scale (Week 3)

**Goal:** Parallel execution with safety. Fallback engines. Full cost reporting.

**Entry criteria:** Level 3 complete.

**What you build:**
- **PMAgent coordinator** for parallel task execution:
  - File-based task queue with atomic locking
  - File-overlap detection (overlaps force sequential)
  - Findings system for cross-agent communication
  - Scheduler with dependency resolution
- Fallback engine support (Codex, Gemini) with budget caps and `--engine` flag
- Engine evaluation tracking (Greptile scores per engine)
- Task ownership (`assigned_to` field), multi-user CLI (`--user` flag)
- Full cost reporting in terminal (per-task, per-phase, per-engine)
- Compound learning Layer 2 — `/karimo:feedback` plugin for Claude Code
- Onboarding flow for new team members
- Docker/Podman container isolation for agents (hardened sandbox)

**Agent Capabilities Used:**
- All Level 3 capabilities
- PMAgent coordinates multiple concurrent agents
- Findings propagate discoveries between tasks

**Exit criteria:**
- Multiple tasks run in parallel safely
- File-overlap detection forces sequential when needed
- Findings from Task A appear in Task B's context
- Fallback engine activates on rate-limit errors
- Cost reporting shows accurate per-task and per-engine breakdowns
- `/karimo:feedback` captures developer corrections and promotes them to config

---

## Level 5: Dashboard (Week 4+)

**Goal:** Visual command center for morning review.

**Entry criteria:** Level 4 complete.

**What you build:**
- Standalone Next.js dashboard app
- Phase Overview
- Dependency Graph (React Flow)
- Merge Report
- Cost Tracker
- Dashboard authentication (API key + confirmation tokens)
- Deploy to Vercel
- One-click merge with dependency-aware ordering
- `review-pending` and `require_review` indicators
- Assignee filter, engine column, cost confidence display

**Exit criteria:**
- Entire morning review from the dashboard
- Merge from dashboard works with confirmation token
- Cost tracker matches SQLite data

---

## Current Status

**In Development — Level 0**

This repository contains the scaffolding for KARIMO. The Level 0 implementation is the current focus.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview
- [COMPONENTS.md](./COMPONENTS.md) — Component specifications
- [DEPENDENCIES.md](./DEPENDENCIES.md) — Dependency inventory by level
- [DASHBOARD.md](./DASHBOARD.md) — Dashboard specifications (Level 5)
