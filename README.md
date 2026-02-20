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

---

## How It Works

```
┌──────────────┐    ┌───────────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐
│   Interview  │ →  │   PRD + DAG   │ →  │   Execute   │ →  │   Review   │ →  │   Merge   │
│  (/plan)     │    │  (generated)  │    │   (agents)  │    │ (Greptile) │    │   (PR)    │
└──────────────┘    └───────────────┘    └─────────────┘    └────────────┘    └───────────┘
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
- Integrate Greptile for code integrity checks
- Ranking system enables agentic revision loops
- Score < 4 triggers automated revision attempts

**Optional upgrade.** Requires Greptile API key.

### Phase 3: Monitor & Review
Connect to a dashboard for oversight:
- Review all features, issues, and status
- Visualize dependencies and progress
- Team-wide visibility into execution

**Future phase.** Dashboard to be built.

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
| `/karimo:review --prd {slug}` | Approve PRD and generate task briefs |
| `/karimo:execute --prd {slug}` | Execute approved tasks from a PRD |
| `/karimo:status` | View execution progress across all PRDs |
| `/karimo:feedback` | Quick capture of single learnings (~2 min) |
| `/karimo:learn` | Deep learning cycle with investigation (~45 min) |

### /karimo:plan

Orchestrates a structured interview to create a PRD:

1. **Vision** — What are we building and why?
2. **Scope** — Where are the boundaries?
3. **Investigation** — Agent scans codebase for patterns
4. **Tasks** — Break down into executable units
5. **Review** — Validate and generate dependency graph

Output: `.karimo/prds/{slug}/PRD.md` with `tasks.yaml` and `dag.json`

### /karimo:review

Human checkpoint before execution:

- Review the PRD and task breakdown
- Approve or exclude specific tasks
- Generates self-contained briefs for each task
- Updates status from `ready` to `approved`

Output: `.karimo/prds/{slug}/briefs/{task_id}.md` for each approved task

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

| Agent | Role |
|-------|------|
| `karimo-interviewer` | Conducts 5-round PRD interview |
| `karimo-investigator` | Scans codebase for patterns and context |
| `karimo-reviewer` | Validates PRD, generates task DAG |
| `karimo-brief-writer` | Generates self-contained task briefs |
| `karimo-pm` | Coordinates execution, never writes code |
| `karimo-learn-auditor` | Investigates learning directives |

Agents live in `.claude/agents/` and follow strict rules from `KARIMO_RULES.md`.

---

## Skills

Reusable capabilities available to agents:

| Skill | Purpose |
|-------|---------|
| `git-worktree-ops` | Worktree creation, management, cleanup |
| `github-project-ops` | GitHub Projects and Issues via `gh` CLI |

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
    karimo-pm.md
    karimo-learn-auditor.md
  commands/
    plan.md
    execute.md
    status.md
    feedback.md
    learn.md
  skills/
    git-worktree-ops.md
    github-project-ops.md
  KARIMO_RULES.md

.karimo/
  templates/
    PRD_TEMPLATE.md
    INTERVIEW_PROTOCOL.md
    TASK_SCHEMA.md
    STATUS_SCHEMA.md
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
    karimo-review.yml
    karimo-integration.yml
    karimo-sync.yml
  ISSUE_TEMPLATE/
    karimo-task.yml

CLAUDE.md  # Updated with KARIMO reference block

.worktrees/  # Git worktrees (gitignored)
```

---

## Configuration

KARIMO reads optional configuration from `.karimo/config.yaml`:

```yaml
project:
  name: "my-project"

commands:
  build: "npm run build"
  lint: "npm run lint"
  test: "npm test"
  typecheck: "npm run typecheck"

models:
  simple: "sonnet"
  complex: "opus"
  threshold: 5

boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"
```

---

## GitHub Actions

### karimo-review.yml

Triggered on PR open/synchronize with `karimo` label:
- Calls Greptile API for code review
- Posts review as PR comment
- Adds `review-passed` or `needs-revision` label

### karimo-integration.yml

Triggered when PR has `review-passed` label:
- Runs build, lint, test, typecheck
- Adds `ready-to-merge` label on success

### karimo-sync.yml

Triggered when KARIMO PR is merged:
- Updates `status.json` with completion
- Creates final merge PR when all tasks done

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

Optional:
- **Greptile** — For automated code review (set `GREPTILE_API_KEY`)

---

## Safeguards

| Safeguard | Description |
|-----------|-------------|
| **Never-touch files** | Agents cannot modify protected files |
| **Require-review files** | Changes flagged for human attention |
| **Loop awareness** | Stall detection with model upgrade capability |
| **Worktree isolation** | Each task works in isolated branch |
| **Pre-PR checks** | Build/typecheck must pass before PR |
| **Greptile review** | Automated code quality checks (Phase 2) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Configuration Guide](CLAUDE.md) | Project configuration reference |
| [KARIMO Rules](.claude/KARIMO_RULES.md) | Agent behavior rules |
| [PRD Template](.karimo/templates/PRD_TEMPLATE.md) | PRD output format |
| [Architecture](.karimo/docs/ARCHITECTURE.md) | System design |
| [Phases](.karimo/docs/PHASES.md) | Adoption phases explained |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add agents, commands, skills, and templates.

---

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
