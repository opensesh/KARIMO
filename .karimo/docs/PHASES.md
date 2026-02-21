# KARIMO Adoption Phases

KARIMO uses three optional adoption phases. Start in Phase 1 and build up as needed. Each phase adds capabilities without requiring the next.

---

## Why Phases?

Autonomous development is high-stakes. Before letting agents run overnight, you need to:

- See what agents actually produce
- Understand how cost controls behave
- Verify that code integrity checks catch real problems

Phases are **optional progression**, not requirements. Phase 1 is fully functional — many teams will never need Phase 2 or 3.

---

## Phase Overview

| Phase | Name | Description | Required? |
|-------|------|-------------|-----------|
| **1** | Execute PRD | Full PRD-to-PR workflow | Yes (starting point) |
| **2** | Automate Review | Greptile integration, revision loops | Optional |
| **3** | Monitor & Review | Dashboard for oversight | Future |

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

- **Task Execution** (`/karimo:execute`)
  - PM Agent coordinates task work
  - Git worktrees for isolation
  - Feature branches per task
  - PRs created automatically

- **Code Integration** (v2.1)
  - Review/Architect Agent validates task PRs
  - Two-tier merge model (task→feature→main)
  - Merge conflict resolution
  - Feature reconciliation before merge to main

- **Runtime Dependencies** (v2.1)
  - Task agents can discover new dependencies
  - Dependency Watch workflow notifies PM Agent
  - Urgent dependencies get immediate attention

- **GitHub Integration**
  - Issues created for tasks
  - GitHub Projects tracking
  - Labels for status (ready, running, done)

- **Compound Learning** (`/karimo:feedback`)
  - Capture patterns and anti-patterns
  - Rules appended to CLAUDE.md
  - Future agents learn from feedback

### Prerequisites

- Claude Code installed
- GitHub CLI authenticated (`gh auth login`)
- Git with worktree support (Git 2.5+)

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
/karimo:execute --prd {slug}
```

---

## Phase 2: Automate Review

**Add automated code review to your workflow.**

Phase 2 adds Greptile integration for automated code review. This enables:

### What You Get

- **Greptile Code Review**
  - Automated review on PR open
  - Score-based assessment
  - Detailed feedback comments

- **Review/Architect + Greptile Coordination** (v2.1)
  - Review/Architect validates integration first
  - Then Greptile reviews code quality
  - Architectural issues escalated to PM Agent
  - Code quality issues trigger revision loops

- **Agentic Revision Loops**
  - Score < 3 triggers revision (0-5 scale)
  - Agent reads feedback, fixes issues
  - Model escalation (Sonnet → Opus) after first failure
  - Hard gate after 3 failed attempts (needs-human-review)

- **Review Workflow**
  - `karimo-review.yml` triggers Greptile
  - `karimo-integration.yml` runs on pass
  - Labels track review state

### Why Greptile is Highly Recommended

Greptile acts as a force multiplier — catching issues before human review and enabling automated revision loops. While optional, most teams find it significantly improves code quality outcomes.

### Prerequisites

- Phase 1 complete
- Greptile API key (`GREPTILE_API_KEY` in GitHub secrets)

### Setup

1. Get a Greptile API key from [greptile.com](https://greptile.com)
2. Add `GREPTILE_API_KEY` to your GitHub repository secrets
3. Ensure `karimo` label exists on your repository
4. PRs with `karimo` label trigger automated review

### How Revision Loops Work

Greptile uses a **0-5 scale**. Score ≥ 3 passes, < 3 enters revision loop.

```
Task Complete → PR Created → Greptile Review
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                Score ≥ 3                    Score < 3
                    │                             │
                    ▼                             ▼
             Integration             Attempt 1: Revise code
                Checks                    │
                    │              ┌──────┴──────┐
                    ▼              │             │
               Ready to         Pass          Fail
                Merge             │             │
                                  ▼             ▼
                             Integration   Escalate model
                                Checks     (Sonnet → Opus)
                                                │
                                           Attempts 2-3
                                                │
                                         ┌──────┴──────┐
                                         │             │
                                       Pass          Fail
                                         │             │
                                         ▼             ▼
                                    Integration   HARD GATE
                                       Checks    needs-human-review
```

---

## Phase 3: Monitor & Review

**Coming soon.** Dashboard for team-wide visibility and oversight.

Phase 3 will provide a web-based dashboard for reviewing PRDs, visualizing dependencies, and tracking team metrics. Until then, GitHub Projects Kanban + `/karimo:status` serve the same purpose.

See [DASHBOARD.md](DASHBOARD.md) for the planned specification.

---

## Phase Comparison

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| PRD Interview | Yes | Yes | Yes |
| Task Execution | Yes | Yes | Yes |
| Git Worktrees | Yes | Yes | Yes |
| Automatic PRs | Yes | Yes | Yes |
| GitHub Issues | Yes | Yes | Yes |
| Manual Review | Yes | Yes | Yes |
| Review/Architect Agent | Yes | Yes | Yes |
| Two-Tier Merge Model | Yes | Yes | Yes |
| Runtime Dependencies | Yes | Yes | Yes |
| Greptile Review | — | Yes | Yes |
| Revision Loops | — | Yes | Yes |
| Dashboard | — | — | Yes |
| Team Analytics | — | — | Yes |

---

## Upgrading Between Phases

### Phase 1 → Phase 2

1. Get Greptile API key
2. Add to GitHub secrets as `GREPTILE_API_KEY`
3. Ensure `karimo` label exists
4. Workflows automatically use Greptile on next PR

### Phase 2 → Phase 3

Instructions will be provided when the dashboard is available.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [SAFEGUARDS.md](SAFEGUARDS.md) | Worktrees, validation, Greptile |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
