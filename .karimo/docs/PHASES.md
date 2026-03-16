# KARIMO Adoption Phases

KARIMO uses three optional adoption phases. Start in Phase 1 and build up as needed. Each phase adds capabilities without requiring the next.

---

## Why Phases?

Autonomous development is high-stakes. Before letting agents run overnight, you need to:

- See what agents actually produce
- Understand how loop limits and model assignment work
- Verify that code integrity checks catch real problems

Phases are **optional progression**, not requirements. Phase 1 is fully functional — many teams will never need Phase 2 or 3.

---

## Phase Overview

| Phase | Name | Description | Required? |
|-------|------|-------------|-----------|
| **1** | Execute PRD | Full PRD-to-PR workflow | Yes (starting point) |
| **2** | Automate Review | Choose Greptile or Code Review | Optional |
| **3** | Monitor & Review | GitHub-native oversight | Optional |

**Phase Progression Flow:**

```mermaid
graph TB
    subgraph "Phase 1: Execute PRD"
        A[/karimo:plan] --> B[Interview + Investigation]
        B --> C[Task Execution]
        C --> D[PRs to main]
        D --> E{Manual<br/>Review}
        E -->|Approved| F[Merge]
        E -->|Changes| G[Manual Fix]
        G --> E
    end

    subgraph "Phase 2: Automate Review"
        H[/karimo:run] --> I[Task Execution]
        I --> J[PRs to main]
        J --> K{Automated<br/>Review}
        K -->|Pass| L[Merge]
        K -->|Issues Found| M[Agent Revises]
        M --> K
        K -->|3+ Loops| N[Hard Gate:<br/>Human Review]
    end

    subgraph "Phase 3: Monitor & Review"
        O[/karimo:dashboard] --> P[Execution Metrics]
        O --> Q[Review Analytics]
        O --> R[Task Timeline]
        O --> S[Model Usage]
        P --> T[Insights:<br/>Bottlenecks, Patterns]
        Q --> T
        R --> T
        S --> T
    end

    F -.->|"Upgrade:<br/>/karimo:configure --review"| H
    L -.->|"Monitor:<br/>/karimo:dashboard"| O

    style A fill:#e1f5ff
    style H fill:#fff4e1
    style O fill:#e8f5e9
```

---

## Phase 1: Execute PRD

**Your first planning process with KARIMO.**

This is where everyone starts. Phase 1 provides everything needed to go from idea to merged PRs:

### What You Get

- **PRD Interview** (`/karimo:plan`)
  - 5-round structured conversation
  - Codebase investigation
  - Task decomposition with dependencies
  - Automated DAG generation

- **Task Execution** (`/karimo:run`)
  - PM Agent coordinates wave-ordered execution
  - Claude Code handles worktrees via `isolation: worktree`
  - PRs target main directly
  - PR labels for tracking (`karimo`, `wave-{n}`, etc.)

- **Code Integration** (v4.0)
  - Wave-ordered execution (wave 2 waits for wave 1)
  - PRs merge directly to main
  - Git state reconstruction for crash recovery
  - Findings propagation between waves
  - **Parallel execution safety (v7.6.0):**
    - Worktree manifest prevents branch contamination
    - 4-layer branch assertion validates commits
    - Semantic loop detection catches stuck tasks
    - Orphan cleanup removes abandoned worktrees
  - **Traceability & transparency (v7.7.0):**
    - Incremental PRD commits (4 commits track interview progression)
    - Enhanced merge reports (markdown vs code breakdown)
    - Git-based crash recovery for planning phase
    - PR descriptions show docs/code separation

- **PR-Centric Tracking**
  - PRs are the source of truth
  - Labels replace GitHub Projects for tracking
  - Dashboard queries via `gh pr list --label karimo`

- **Compound Learning** (`/karimo:feedback`)
  - Capture patterns and anti-patterns
  - Rules created in `.karimo/learnings/{category}/`
  - Future agents learn from feedback

### Prerequisites

- Claude Code installed
- GitHub CLI authenticated (`gh auth login`)
- GitHub MCP server configured

### Getting Started

```bash
# Install KARIMO in your project
bash KARIMO/.karimo/install.sh /path/to/your/project

# Start Claude Code
cd your-project
claude

# Create your first PRD
/karimo:plan

# Execute tasks
/karimo:run --prd {slug}
```

---

## Phase 2: Automate Review

**Add automated code review to your workflow.**

Phase 2 adds automated code review through your choice of provider. Both options enable revision loops and model escalation.

### Provider Comparison

| Feature | Greptile | Claude Code Review |
|---------|----------|-------------------|
| **Pricing** | $30/month flat (14-day trial) | $15-25 per PR |
| **Setup** | API key + GitHub workflow | Claude admin settings |
| **Review Style** | Score-based (0-5) | Finding-based (severity tags) |
| **Integration** | GitHub Actions workflow | Native Claude Code (automatic) |
| **Auto-resolve** | Manual | Threads auto-resolve on fix |
| **Best for** | High PR volume (50+/month) | Low-medium PR volume |

**Recommendation:**
- **High volume (50+ PRs/month):** Greptile ($30 flat)
- **Low-medium volume:** Claude Code Review ($15-25 per PR)
- **Teams/Enterprise users:** Code Review (native integration)

### Choose Your Provider

Run `/karimo:configure --review` to choose interactively, or use:
- `/karimo:configure --greptile` for Greptile
- `/karimo:configure --code-review` for Claude Code Review

---

### Option A: Greptile

**Score-based review with GitHub Actions workflow.**

**Prerequisites:**
- Greptile account ($30/month, 14-day trial)
- `GREPTILE_API_KEY` in GitHub repository secrets

**Setup:**
1. Get API key from [greptile.com](https://greptile.com)
2. Run `/karimo:configure --greptile`
3. Add `GREPTILE_API_KEY` to repository secrets
4. PRs with `karimo` label trigger automated review

**How it works:**
- Sends PR diff to Greptile for review
- Posts review comments with 0-5 quality score
- Labels PRs `greptile-passed` (score >= 3) or `greptile-needs-revision` (score < 3)
- Score < 3 triggers revision loop

**Revision flow (Greptile):**
```
PR Created → Greptile Review → Score 0-5
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                 Score ≥ 3                 Score < 3
                     │                         │
                  ✅ Pass                 🔄 Revision Loop
```

---

### Option B: Claude Code Review

**Finding-based review with native Claude integration.**

**Prerequisites:**
- Claude Teams or Enterprise subscription
- Admin access to your Claude organization

**Setup:**
1. Go to `claude.ai/admin-settings/claude-code`
2. Enable "Code Review" in the Code Review section
3. Install Claude GitHub App on your repository
4. Enable repository for Code Review in admin settings
5. Run `/karimo:configure --code-review` to create REVIEW.md

**How it works:**
- Multi-agent fleet examines code in full codebase context
- Posts inline comments with severity markers
- Auto-resolves threads when issues are fixed
- Completes in ~20 minutes on average

**Severity markers:**

| Marker | Level | Action |
|--------|-------|--------|
| 🔴 | Normal | Bug to fix before merge |
| 🟡 | Nit | Minor issue, worth fixing |
| 🟣 | Pre-existing | Bug in codebase, not from this PR |

**Revision flow (Code Review):**
```
PR Created → Code Review → Findings Posted
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         No Findings      Only 🟡 Nit       🔴 Normal
              │                │                │
           ✅ Pass         ✅ Pass*         🔄 Revision Loop
                          (minor issues)
```

*Pass with nits: PM Agent logs nits but doesn't block.

**Customization:**
- `REVIEW.md` — Review-specific guidance (what to flag/skip)
- `CLAUDE.md` — Shared project instructions

> **Note:** Code Review is currently available for Teams and Enterprise users.

---

### Revision Loop (Both Providers)

Both providers support automated revision loops with model escalation:

1. Review finds issues → PM Agent reads feedback
2. Increment `loop_count`, re-spawn worker with context
3. Worker pushes fixes to same branch
4. Provider re-reviews automatically
5. Repeat until pass or hard gate

**Model escalation:**
- If Sonnet fails on architectural issue → Escalate to Opus
- Simple bugs → Retry with same model

**Hard gate (after 3 failed attempts):**
1. Task marked `needs-human-review`
2. PR receives `blocked-needs-human` label
3. Human must intervene

---

## Phase 3: Monitor & Review

**CLI-based monitoring with comprehensive insights and analytics.**

Phase 3 uses KARIMO's CLI dashboard for monitoring — no separate web dashboard needed.

### What You Get

- **`/karimo:dashboard`** — Comprehensive CLI dashboard
  - **Executive Summary** — System health score, quick stats, next completions
  - **Critical Alerts** — Blocked, stale, crashed tasks needing intervention
  - **Execution Velocity** — Completion rate, loop efficiency, wave progress, ETAs
  - **Resource Usage** — Model distribution, loop distribution, parallel capacity
  - **Recent Activity** — Timeline of events across all PRDs
  - Replaces `/karimo-overview` with enhanced capabilities

- **`/karimo:dashboard`** — PRD-specific deep dive
  - Task progress, wave status, PR links
  - Loop counts and model usage
  - Blocked tasks and error details

- **GitHub PR Dashboard**
  - `gh pr list --label karimo` — All KARIMO PRs
  - `gh pr list --label karimo-{slug}` — PRs for a feature
  - `gh pr list --label needs-revision` — PRs needing attention
  - `gh pr list --label blocked-needs-human` — Hard gate PRs

- **Claude Code Analytics** (if using Code Review)
  - Review usage and spend at `claude.ai/admin-settings`
  - Cost per PR and monthly totals

### Dashboard Queries

```bash
# All PRs for a feature
gh pr list --label karimo-{slug} --state all

# All KARIMO PRs this month
gh pr list --label karimo --search "merged:>2026-02-01" --state merged

# PRs needing attention
gh pr list --label karimo,needs-revision

# PRs blocked by hard gate
gh pr list --label blocked-needs-human
```

### Why GitHub-Native?

- **No extra infrastructure** — Use what you already have
- **Real-time** — GitHub is the source of truth
- **Team access** — Anyone with repo access can view
- **Integrations** — Works with existing GitHub workflows

---

## Phase Comparison

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| PRD Interview | Yes | Yes | Yes |
| Wave-Ordered Execution | Yes | Yes | Yes |
| Claude Code Worktrees | Yes | Yes | Yes |
| PRs to Main | Yes | Yes | Yes |
| PR Label Tracking | Yes | Yes | Yes |
| Manual Review | Yes | Yes | Yes |
| Git State Reconstruction | Yes | Yes | Yes |
| Crash Recovery | Yes | Yes | Yes |
| Automated Review | — | Yes (choice) | Yes |
| Revision Loops | — | Yes | Yes |
| /karimo:dashboard | Yes | Yes | Yes |
| /karimo:dashboard | Yes | Yes | Yes |
| GitHub Queries | Yes | Yes | Yes |

---

## Upgrading Between Phases

### Phase 1 → Phase 2

**Choose your review provider:**

Run `/karimo:configure --review` to choose interactively, or:

**Option A: Greptile**
1. Get API key from [greptile.com](https://greptile.com)
2. Run `/karimo:configure --greptile`
3. Add `GREPTILE_API_KEY` to repository secrets
4. PRs with `karimo` label trigger automated review

**Option B: Claude Code Review**
1. Go to `claude.ai/admin-settings/claude-code`
2. Enable Code Review, install GitHub App
3. Enable repository for Code Review
4. Run `/karimo:configure --code-review` to create REVIEW.md

### Phase 2 → Phase 3

Phase 3 uses existing tooling — no upgrade required:
- `/karimo:dashboard` for comprehensive monitoring and analytics
- `/karimo:dashboard` for per-PRD deep dives
- `gh pr list --label karimo` for GitHub queries

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [SAFEGUARDS.md](SAFEGUARDS.md) | Worktrees, validation, Greptile |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
