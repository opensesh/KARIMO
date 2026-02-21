```
██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗
██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗
█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║
██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║
██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝
╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝
```

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-v2-green.svg)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Framework-blueviolet.svg)]()

**Autonomous Development Framework for Claude Code**

KARIMO is a Claude Code configuration framework that transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight — all through slash commands.

---

## Philosophy

**"You are the architect, agents are the builders, Greptile is the inspector."**

KARIMO provides a structured methodology for autonomous development:
- **You** define what to build through a guided interview
- **Agents** execute tasks in isolated worktrees
- **Greptile** reviews code before human approval
- **GitHub Actions** automate the review-merge pipeline

### Design Principles

**Single-PRD scope.** KARIMO operates within one PRD at a time. Each PRD maps to one feature branch. Cross-feature dependencies are your responsibility — you sequence PRDs so that dependent features execute only after their prerequisites are merged to main.

**Sequential feature execution.** If Feature 8 depends on Feature 3, you finish Feature 3's PRD cycle (plan → execute → review → merge to main) before starting Feature 8. You may run Features 1, 2, and 3 in parallel if they're independent, but Feature 8 waits.

This is intentional: the goal isn't to produce a hundred features simultaneously, it's to let agents autonomously execute a few features at a time while building trust between you, the codebase, and the agents.

---

## How It Works

```
┌──────────────┐    ┌───────────────┐    ┌─────────────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐
│   Interview  │ →  │   PRD + DAG   │ →  │   Execute   │ →  │   Review   │ →  │ Reconcile   │ →  │   Merge   │
│  (/plan)     │    │  (generated)  │    │   (agents)  │    │ (Greptile) │    │ (Architect) │    │   (PR)    │
└──────────────┘    └───────────────┘    └─────────────┘    └────────────┘    └─────────────┘    └───────────┘
```

### Interview Phase

The interviewer agent conducts a structured conversation:

1. Understands your vision and goals
2. Identifies scope and boundaries
3. Spawns investigator to scan your codebase
4. Breaks work into tasks with dependencies
5. Reviewer validates and generates execution graph

### Execution Phase

The PM Agent coordinates parallel execution:

1. Parses `dag.json` for task dependencies
2. Creates worktrees for parallel work
3. Spawns agents for ready tasks
4. Monitors completion, propagates findings
5. Creates PRs when tasks complete

### Review Phase (Phase 2)

GitHub Actions handle automated review:

1. **karimo-review.yml** — Triggers Greptile code review
2. **karimo-integration.yml** — Runs build/test on review pass
3. **karimo-sync.yml** — Updates status when PRs merge

---

## Adoption Phases

KARIMO uses three optional adoption phases. Start in Phase 1 and build up as needed.

### Phase 1: Execute PRD
Your first planning process with KARIMO:
- Run `/karimo:plan` to create PRD through agent interviews
- Agent teams coordinate task execution
- GitHub Projects integration for tracking
- Git worktrees and feature branches by default
- PRs created for each completed task

**This is where everyone starts.** Phase 1 is fully functional out of the box.

### Phase 2: Automate Review
Add automated code review to your workflow:
- Integrate Greptile for code integrity checks (0-5 scale)
- Score ≥ 3 passes, < 3 triggers revision loop
- Model escalation (Sonnet → Opus) after first failure
- Hard gate after 3 failed attempts (needs human review)

**Optional but highly recommended.** Greptile acts as a force multiplier. Requires Greptile API key.

### Phase 3: Monitor & Review

**Coming soon.** Dashboard for team-wide visibility and oversight.

---

## Quick Start

### 1. Install KARIMO in Your Project

```bash
# Clone KARIMO
git clone https://github.com/opensesh/KARIMO.git

# Install into your project
bash KARIMO/.karimo/install.sh /path/to/your/project
```

This copies:
- Agent definitions to `.claude/agents/`
- Slash commands to `.claude/commands/`
- Skills to `.claude/skills/`
- KARIMO rules to `.claude/KARIMO_RULES.md`
- Templates to `.karimo/templates/`
- GitHub Actions to `.github/workflows/`
- Reference block appended to `CLAUDE.md`

To update an existing installation, run `bash KARIMO/.karimo/update.sh /path/to/your/project`.

### 2. Create Your First PRD

```bash
cd your-project
claude

# In Claude Code:
/karimo:plan
```

The interviewer agent guides you through a 5-round conversation to define your feature.

### 3. Execute the PRD

```bash
# In Claude Code:
/karimo:execute --prd user-profiles
```

Agents work through tasks in parallel, creating PRs for each.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Start PRD interview — 5 rounds with codebase analysis |
| `/karimo:review` | Cross-PRD dashboard: blocked tasks, revision loops, completions |
| `/karimo:review --prd {slug}` | Approve PRD and generate task briefs |
| `/karimo:execute --prd {slug}` | Execute approved tasks from a PRD |
| `/karimo:status` | View execution progress across all PRDs |
| `/karimo:configure` | Create or update .karimo/config.yaml (~5 min) |
| `/karimo:feedback` | Quick capture of single learnings (~2 min) |
| `/karimo:learn` | Deep learning cycle with investigation (~45 min) |
| `/karimo:doctor` | Check installation health and diagnose issues |

### /karimo:plan

Orchestrates a structured interview to create a PRD:

1. **Vision** — What are we building and why?
2. **Scope** — Where are the boundaries?
3. **Investigation** — Agent scans codebase for patterns
4. **Tasks** — Break down into executable units
5. **Review** — Validate and generate dependency graph

Output: `.karimo/prds/{slug}/PRD.md` with `tasks.yaml` and `dag.json`

### /karimo:review

**Primary human oversight touchpoint** for KARIMO:

**Default mode (no args):** Cross-PRD dashboard showing:
- 🚫 Blocked tasks (failed 3 Greptile attempts)
- ⚠️ Tasks in revision loops
- 🔀 Tasks needing human rebase
- ✅ Recently completed work

**PRD approval mode (`--prd {slug}`):**
- Review the PRD and task breakdown
- Approve or exclude specific tasks
- Generates self-contained briefs for each task
- Updates status from `ready` to `approved`

Check this each morning or after a run completes.

### /karimo:execute

Runs the PM Agent to coordinate task execution:

- Creates feature branch and worktrees
- Spawns agents for ready tasks (respects dependencies)
- Monitors progress and propagates findings
- Creates PRs when tasks complete

### /karimo:status

Shows real-time execution state:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 in-review
    Models: 4 sonnet, 1 opus • Loops: 8
```

### /karimo:feedback

Captures learnings that improve future execution:

```
/karimo:feedback

> "The agent kept using inline styles instead of Tailwind"
```

Generates rules appended to `CLAUDE.md` under `## KARIMO Learnings`.

---

## Agents

KARIMO includes specialized agents:

### Coordination Agents

| Agent | Role | Writes Code? |
|-------|------|--------------|
| `karimo-interviewer` | Conducts 5-round PRD interview | No |
| `karimo-investigator` | Scans codebase for patterns and context | No |
| `karimo-reviewer` | Validates PRD, generates task DAG | No |
| `karimo-brief-writer` | Generates self-contained task briefs | No |
| `karimo-pm` | Coordinates execution, never writes code | No |
| `karimo-review-architect` | Code-level integration, merge conflict resolution | Conflict resolution only |
| `karimo-learn-auditor` | Investigates learning directives | No |

### Task Agents

| Agent | Role | Writes Code? |
|-------|------|--------------|
| `karimo-implementer` | Executes coding tasks, writes production code | Yes |
| `karimo-tester` | Writes and maintains tests | Yes |
| `karimo-documenter` | Creates and updates documentation | Yes (docs) |

Agents live in `.claude/agents/` and follow strict rules from `KARIMO_RULES.md`.

---

## Skills

Reusable capabilities available to agents:

### Coordination Skills

| Skill | Purpose |
|-------|---------|
| `git-worktree-ops` | Worktree creation, management, cleanup |
| `github-project-ops` | GitHub Projects and Issues via `gh` CLI |

### Task Agent Skills

| Skill | Purpose |
|-------|---------|
| `karimo-code-standards` | Coding patterns for implementer agent |
| `karimo-testing-standards` | Testing patterns for tester agent |
| `karimo-doc-standards` | Documentation patterns for documenter agent |

Skills live in `.claude/skills/`.

---

## Directory Structure

After installation, your project contains:

```
.claude/
  agents/
    karimo-interviewer.md
    karimo-investigator.md
    karimo-reviewer.md
    karimo-brief-writer.md
    karimo-pm.md
    karimo-review-architect.md
    karimo-learn-auditor.md
    karimo-implementer.md      # Task agent
    karimo-tester.md           # Task agent
    karimo-documenter.md       # Task agent
  commands/
    plan.md
    review.md
    execute.md
    status.md
    configure.md
    feedback.md
    learn.md
    doctor.md
  skills/
    git-worktree-ops.md
    github-project-ops.md
    karimo-code-standards.md       # Task agent skill
    karimo-testing-standards.md    # Task agent skill
    karimo-doc-standards.md        # Task agent skill
  KARIMO_RULES.md

.karimo/
  templates/
    PRD_TEMPLATE.md
    INTERVIEW_PROTOCOL.md
    TASK_SCHEMA.md
    STATUS_SCHEMA.md
    DEPENDENCIES_TEMPLATE.md
    LEARN_INTERVIEW_PROTOCOL.md
  prds/
    {prd-slug}/
      prd.md
      tasks.yaml
      dag.json
      status.json
  learn/
    {timestamp}/
      interview.md
      findings.md
      action-plan.md
      changes-applied.md

.github/
  workflows/
    karimo-sync.yml              # Tier 1
    karimo-dependency-watch.yml  # Tier 1
    karimo-ci-integration.yml    # Tier 2 (opt-in)
    karimo-greptile-review.yml   # Tier 3 (opt-in)
  ISSUE_TEMPLATE/
    karimo-task.yml

CLAUDE.md  # Updated with KARIMO reference block

.worktrees/  # Git worktrees (gitignored)
```

---

## Configuration

Configuration is stored in `CLAUDE.md` and auto-detected on your first `/karimo:plan`.

The investigator agent scans your project for:
- **Runtime** — Node.js, Bun, Deno, Python, etc.
- **Framework** — Next.js, React, Vue, FastAPI, etc.
- **Package manager** — npm, yarn, pnpm, bun
- **Commands** — build, lint, test, typecheck from package.json
- **Boundaries** — Lock files, .env files, migrations, auth directories

You can review and edit the detected values before they're saved to `CLAUDE.md`.

---

## GitHub Actions (Three-Tier System)

KARIMO uses a portable three-tier workflow architecture. **Key principle:** KARIMO never runs your build commands — it observes your existing CI instead.

### Tier 1 (Always Installed)

| Workflow | Purpose |
|----------|---------|
| `karimo-sync.yml` | Status sync on PR merge, creates final merge PR |
| `karimo-dependency-watch.yml` | Runtime dependency alerts |

### Tier 2: CI Integration (Opt-in, default Y)

| Workflow | Purpose |
|----------|---------|
| `karimo-ci-integration.yml` | Observes external CI, labels PRs |

- Detects GitHub Actions, CircleCI, Jenkins, and other CI systems
- Labels: `ci-passed`, `ci-failed`, `ci-skipped`
- **Does NOT run build commands** — only observes

### Tier 3: Greptile Review (Opt-in, default N)

| Workflow | Purpose |
|----------|---------|
| `karimo-greptile-review.yml` | Automated code review via Greptile |

- Requires `GREPTILE_API_KEY` secret
- Labels: `greptile-passed`, `greptile-needs-revision`, `greptile-skipped`
- Gracefully skips if no API key configured

---

## Compound Learning

KARIMO learns from execution through two scopes:

### Scope 1: Quick Capture (`/karimo:feedback`)
Single observation → single rule in ~2 minutes:

```
/karimo:feedback

> "Always use the existing Button component, don't create new ones"
```

### Scope 2: Deep Learning (`/karimo:learn`)
Three-mode investigation cycle in ~45 minutes:

1. **Interview** — Opus-guided conversation surfaces pain points
2. **Audit** — Agent investigates with evidence from PRs, status files
3. **Review & Act** — Human approves changes before applying

```
/karimo:learn
# Mode 1: 5-round interview → audit directives
# Mode 2: Evidence-based investigation → findings
# Mode 3: Per-change approval → applied to config/docs
```

Learnings are stored in `CLAUDE.md` under `## KARIMO Learnings`.

---

## Prerequisites

- **Claude Code** — [Install from Anthropic](https://claude.ai/code)
- **GitHub CLI** — `brew install gh && gh auth login`
- **Git** — With worktree support (Git 2.5+)

Optional but highly recommended:
- **Greptile** — Automated code review, a force multiplier (set `GREPTILE_API_KEY`)

---

## Safeguards

| Safeguard | Description |
|-----------|-------------|
| **Never-touch files** | Agents cannot modify protected files |
| **Require-review files** | Changes flagged for human attention |
| **Loop awareness** | Stall detection with model upgrade capability |
| **Worktree isolation** | Each task works in isolated branch |
| **Pre-PR checks** | Build/typecheck must pass before PR |
| **Two-tier merge** | Task PRs to feature, feature PR to main (human gate) |
| **Integration validation** | Review/Architect ensures tasks integrate cleanly |
| **Greptile review** | Automated code quality checks (optional but highly recommended) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design and integration |
| [COMMANDS.md](.karimo/docs/COMMANDS.md) | Slash command reference |
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-scope learning system |
| [DASHBOARD.md](.karimo/docs/DASHBOARD.md) | Dashboard spec (Phase 3) |
| [GETTING-STARTED.md](.karimo/docs/GETTING-STARTED.md) | Installation and first PRD |
| [PHASES.md](.karimo/docs/PHASES.md) | Adoption phases explained |
| [SAFEGUARDS.md](.karimo/docs/SAFEGUARDS.md) | Code integrity, security, Greptile |

**Also see:**
- [CLAUDE.md](CLAUDE.md) — Project configuration reference
- [KARIMO_RULES.md](.claude/KARIMO_RULES.md) — Agent behavior rules
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, commands, skills, and templates.

---

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
