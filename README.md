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
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-blueviolet.svg)]()

**Autonomous Development Framework for Claude Code**

Turn product requirements into shipped code using AI agents, automated code review, and structured human oversight — all through Claude Code slash commands.

---

## Philosophy

**"You are the architect, agents are the builders, Greptile is the inspector."**

KARIMO provides a structured methodology for autonomous development:
- **You** define what to build through a guided interview
- **Agents** execute tasks in isolated worktrees
- **Greptile** reviews code before human approval
- **GitHub Actions** automate the review-merge pipeline

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
- Templates to `.karimo/templates/`
- GitHub Actions to `.github/workflows/`

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
| `/karimo:execute --prd {slug}` | Execute tasks from a PRD |
| `/karimo:status` | View execution progress across all PRDs |
| `/karimo:feedback` | Capture learnings to improve future execution |

### /karimo:plan

Orchestrates a structured interview to create a PRD:

1. **Vision** — What are we building and why?
2. **Scope** — Where are the boundaries?
3. **Investigation** — Agent scans codebase for patterns
4. **Tasks** — Break down into executable units
5. **Review** — Validate and generate dependency graph

Output: `.karimo/prds/{slug}/prd.md` with `tasks.yaml` and `dag.json`

### /karimo:execute

Runs the PM Agent to coordinate task execution:

- Creates feature branch and worktrees
- Spawns agents for ready tasks (respects dependencies)
- Monitors progress and propagates findings
- Creates PRs with Greptile review

### /karimo:status

Shows real-time execution state:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 in-review
    Cost: $32.50 / $60 ceiling
```

### /karimo:feedback

Captures learnings that improve future execution:

```
/karimo:feedback

> "The agent kept using inline styles instead of Tailwind"
```

Generates rules appended to `CLAUDE.md` under `## KARIMO Learnings`.

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

### Review Phase

GitHub Actions handle automated review:

1. **karimo-review.yml** — Triggers Greptile code review
2. **karimo-integration.yml** — Runs build/test on review pass
3. **karimo-sync.yml** — Updates status when PRs merge

---

## Agents

KARIMO includes specialized agents:

| Agent | Role |
|-------|------|
| `karimo-interviewer` | Conducts 5-round PRD interview |
| `karimo-investigator` | Scans codebase for patterns and context |
| `karimo-reviewer` | Validates PRD, generates task DAG |
| `karimo-pm` | Coordinates execution, never writes code |

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
  commands/
    plan.md
    execute.md
    status.md
    feedback.md
  skills/
    git-worktree-ops.md
    github-project-ops.md

.karimo/
  templates/
    PRD_TEMPLATE.md
    INTERVIEW_PROTOCOL.md
    TASK_SCHEMA.md
    STATUS_SCHEMA.md
  prds/
    {prd-slug}/
      prd.md
      tasks.yaml
      dag.json
      status.json

.github/
  workflows/
    karimo-review.yml
    karimo-integration.yml
    karimo-sync.yml
  ISSUE_TEMPLATE/
    karimo-task.yml

CLAUDE.md  # Updated with KARIMO rules

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

cost:
  cost_multiplier: 2.0
  base_iterations: 3
  iteration_multiplier: 1.5
  revision_budget_percent: 20

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

KARIMO learns from execution:

### Automatic Learning

- Task outcomes update cost multipliers
- Build failures add to `never_touch` lists
- Pattern violations become rules

### Manual Learning

Use `/karimo:feedback` to capture learnings:

```
/karimo:feedback

> "Always use the existing Button component, don't create new ones"
```

Learnings are stored in `CLAUDE.md` under `## KARIMO Learnings`:

```markdown
## KARIMO Learnings

### Patterns to Follow

- Always use existing component patterns from `src/components/`

### Anti-Patterns to Avoid

- Never create new button variants — use the Button component

### Rules

- Error handling must use structured error types from `src/utils/errors.ts`
```

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
| **Cost ceilings** | Per-task spending limits |
| **Worktree isolation** | Each task works in isolated branch |
| **Pre-PR checks** | Build/typecheck must pass before PR |
| **Greptile review** | Automated code quality checks |

---

## Task Schema

Tasks in `tasks.yaml` follow this structure:

```yaml
tasks:
  - id: "1a"
    title: "Create UserProfile component"
    complexity: 5
    depends_on: []
    files_affected:
      - "src/components/UserProfile.tsx"
      - "src/components/UserProfile.test.tsx"
    success_criteria:
      - "Component renders user data"
      - "Tests pass with 80% coverage"
    agent_context: |
      Reference the existing Card component pattern.
      Use React Query for data fetching.
```

See `.karimo/templates/TASK_SCHEMA.md` for complete documentation.

---

## Status Tracking

Execution state is tracked in `status.json`:

```json
{
  "prd_slug": "user-profiles",
  "status": "active",
  "started_at": "2026-02-19T10:30:00Z",
  "tasks": {
    "1a": {
      "status": "done",
      "pr_number": 42,
      "cost": 8.50,
      "iterations": 3,
      "merged_at": "2026-02-19T11:45:00Z"
    },
    "1b": {
      "status": "running",
      "started_at": "2026-02-19T11:30:00Z"
    }
  }
}
```

---

## Migration from v1

If you used the TypeScript orchestrator (v1):

1. Keep your existing PRDs in `.karimo/prds/`
2. Run the install script to add v2 components
3. The new slash commands work with existing PRD format
4. TypeScript orchestrator is no longer required

---

## Troubleshooting

### "GitHub CLI not authenticated"

```bash
gh auth login
gh auth status
```

### "Worktree already exists"

```bash
git worktree list
git worktree remove .worktrees/{prd-slug}/{task-id}
```

### "Greptile review not triggering"

Check that:
- `GREPTILE_API_KEY` is set in GitHub secrets
- PR has the `karimo` label
- Workflow has correct permissions

---

## Documentation

| Document | Description |
|----------|-------------|
| [KARIMO Rules](.claude/KARIMO_RULES.md) | Agent behavior rules |
| [PRD Template](.karimo/templates/PRD_TEMPLATE.md) | PRD output format |
| [Interview Protocol](.karimo/templates/INTERVIEW_PROTOCOL.md) | How interviews work |
| [Task Schema](.karimo/templates/TASK_SCHEMA.md) | Task definition format |
| [Status Schema](.karimo/templates/STATUS_SCHEMA.md) | Status tracking format |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See the agents and commands as examples for extending KARIMO.

---

## License

[Apache 2.0](LICENSE)

---

*Built with Claude Code by [Open Session](https://opensesh.com)*
