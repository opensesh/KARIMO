# KARIMO Ring-Based Build Plan

KARIMO uses a ring-based adoption strategy. Each ring is a concentric circle of capability — complete one before starting the next. The ring sequence matters more than dates.

---

## Ring 0: Foundation

**Goal:** Prove that one agent can produce one mergeable PR from one task spec.

**Entry criteria:**
- Clean target project repo
- Claude Code installed
- Bun installed

**What you build:**
- Auto-detection system for `karimo init`:
  - 5 parallel detectors: project, commands, rules, boundaries, sandbox
  - Confidence levels: `●` high, `◐` medium, `○` low, `?` not detected
  - Conservative detection (null over wrong guess)
  - Performance target: < 500ms
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

**Exit criteria:**
- `karimo init` generates valid config via auto-detection (< 500ms scan time)
- Agent produced a PR from the task spec
- PR passes `bun run build && bun run typecheck`
- You reviewed the PR manually and it's mergeable

---

## Ring 1: State Management

**Goal:** Task state flows through GitHub Projects. The orchestrator reads and writes project state.

**Entry criteria:** Ring 0 complete.

**What you build:**
- `lib/github-projects.ts` — thin wrapper over GitHub Projects GraphQL API
- GitHub Project with status columns and custom fields
- Orchestrator creates GitHub Issues from PRD, moves issues through columns
- Offline mode: `--offline` flag stores state in `.karimo/local-state.json`

**What you skip:**
- Greptile
- Parallel execution
- Dashboard
- Cost tracking in SQLite
- Fallback engines

**Exit criteria:**
- Task state flows through GitHub Projects columns
- `karimo status` reads from GitHub Projects and prints current state
- Orchestrator skips completed tasks on re-run
- Offline mode works with local JSON

**Dependencies added:** GitHub fine-grained personal access token.

---

## Ring 2: Automated Review

**Goal:** Greptile reviews PRs automatically. Revision loops work end-to-end with cost budgets.

**Entry criteria:** Ring 1 complete.

**What you build:**
- Greptile configuration on the target repo
- Greptile polling in orchestrator (async, non-blocking)
- Revision loop with cost budget (50% of original task cost)
- `review-pending` status for Greptile timeouts
- Mandatory rebase before PR creation
- Cost ceiling enforcement
- Resilient token parsing (multi-strategy)
- SQLite cost tracking

**Exit criteria:**
- Greptile reviews a PR and returns a score
- Score < 4 triggers revision loop with Greptile feedback
- Revision loop respects cost budget
- Cost ceiling aborts tasks exceeding limit
- Greptile timeout moves task to `review-pending`

**Dependencies added:** Greptile account, SQLite.

---

## Ring 3: Orchestration

**Goal:** Full sequential multi-task execution overnight. Error classification, caution-file enforcement.

**Entry criteria:** Ring 2 complete.

**What you build:**
- Full sequential phase execution: `karimo orchestrate --phase 1`
- Error classification (fatal vs. retryable) with appropriate handling
- Caution-file enforcement (`require_review` list)
- Phase-level integration check (build + typecheck + test after each merge)
- Merge rollback on integration failure
- Cumulative phase review
- Agent sandbox setup
- Compound learning Layer 1 — checkpoint data collection
- First full overnight run

**Exit criteria:**
- `karimo orchestrate --phase 1` runs a full phase overnight
- Fatal errors abort immediately; retryable errors use backoff
- Caution file modifications get flagged with PR label
- Phase-level integration check catches failures and rolls back
- You woke up to a terminal summary of what happened

---

## Ring 4: Scale

**Goal:** Parallel execution with safety. Fallback engines. Full cost reporting.

**Entry criteria:** Ring 3 complete.

**What you build:**
- Parallel execution with file-overlap detection
- Fallback engine support (Codex, Gemini)
- Engine evaluation tracking
- Task ownership (`assigned_to` field), multi-user CLI
- Full cost reporting in terminal
- Compound learning Layer 2 — `/karimo:feedback` plugin
- Onboarding flow for new team members

**Exit criteria:**
- Multiple tasks run in parallel safely
- File-overlap detection forces sequential when needed
- Fallback engine activates on rate-limit errors
- Cost reporting shows accurate breakdowns
- `/karimo:feedback` captures and promotes corrections

---

## Ring 5: Dashboard

**Goal:** Visual command center for morning review.

**Entry criteria:** Ring 4 complete.

**What you build:**
- Standalone Next.js dashboard app
- Phase Overview
- Dependency Graph (React Flow)
- Merge Report
- Cost Tracker
- Dashboard authentication
- Deploy to Vercel
- One-click merge with dependency-aware ordering
- `review-pending` and `require_review` indicators

**Exit criteria:**
- Entire morning review from the dashboard
- Merge from dashboard works with confirmation token
- Cost tracker matches SQLite data

---

## Current Status

**In Development — Ring 0**

This repository contains the scaffolding for KARIMO. The Ring 0 implementation is the next step.
