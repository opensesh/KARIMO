# KARIMO Slash Commands

Reference for all KARIMO slash commands available in Claude Code.

---

## Command Summary

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Start PRD interview |
| `/karimo:execute` | Execute tasks from PRD |
| `/karimo:status` | View execution progress |
| `/karimo:feedback` | Capture learnings |

---

## /karimo:plan

Start a structured PRD interview to define a new feature.

### Usage

```
/karimo:plan
```

### What It Does

1. **Intake** — Receives your initial description
2. **Investigation** — Scans codebase for patterns
3. **Conversation** — 5-round structured interview
4. **Review** — Validates and generates task DAG

### Interview Rounds

| Round | Focus | Questions |
|-------|-------|-----------|
| 1 | Vision | What are you building? Why now? |
| 2 | Scope | What's in/out of scope? |
| 3 | Investigation | Agent scans codebase |
| 4 | Tasks | Break into executable units |
| 5 | Review | Validate and finalize |

### Output

Creates `.karimo/prds/{slug}/`:
- `prd.md` — Full PRD document
- `tasks.yaml` — Task definitions
- `dag.json` — Dependency graph
- `status.json` — Execution tracking

### Example

```
/karimo:plan

> I want to add user profile pages where users can edit their
> name, avatar, and notification preferences.
```

---

## /karimo:execute

Execute tasks from a finalized PRD.

### Usage

```
/karimo:execute --prd {slug}
```

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `--prd {slug}` | Yes | PRD slug to execute |
| `--task {id}` | No | Execute specific task only |
| `--dry-run` | No | Preview without executing |

### What It Does

1. **Reads** `dag.json` for dependencies
2. **Creates** feature branch and worktrees
3. **Spawns** agents for ready tasks
4. **Monitors** progress and propagates findings
5. **Creates** PRs when tasks complete

### Execution Flow

```
Parse DAG → Create Worktrees → Execute Tasks → Pre-PR Checks → Create PRs
```

### Example

```
/karimo:execute --prd user-profiles
```

### Dry Run

Preview what would happen without executing:

```
/karimo:execute --prd user-profiles --dry-run
```

---

## /karimo:status

View execution progress across all PRDs.

### Usage

```
/karimo:status
```

### Options

| Option | Description |
|--------|-------------|
| `--prd {slug}` | Show specific PRD only |
| `--verbose` | Include task details |

### Output Example

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Tasks: 4/5 done, 1 running
    PRs: #42 (merged), #43 (open), #44 (open)

  002_notifications          pending    ░░░░░░░░░░ 0%
    Tasks: 0/3 done
    Waiting for: user-profiles completion
```

### Task States

| State | Description |
|-------|-------------|
| `pending` | Not yet started |
| `ready` | Dependencies met, can run |
| `running` | Agent executing |
| `done` | Completed successfully |
| `failed` | Execution failed |
| `blocked` | Dependencies not met |
| `needs-human-rebase` | Merge conflicts |

---

## /karimo:feedback

Capture learnings to improve future agent execution.

### Usage

```
/karimo:feedback

> {your observation}
```

### What It Does

1. **Receives** your observation
2. **Analyzes** and classifies
3. **Generates** actionable rule
4. **Appends** to CLAUDE.md

### Learning Categories

| Category | Use For |
|----------|---------|
| **Patterns to Follow** | Positive practices |
| **Anti-Patterns to Avoid** | Mistakes to prevent |
| **Rules** | Mandatory guidelines |
| **Gotchas** | Non-obvious constraints |

### Example

```
/karimo:feedback

> "The agent kept using inline styles instead of Tailwind classes"
```

Generates:

```markdown
### Anti-Patterns to Avoid

- **Never use inline styles** — Always use Tailwind utility classes.
  First flagged: 2026-02-19
```

### Tips

- Be specific about what went wrong
- Include file paths when relevant
- Mention the desired behavior

---

## Command Locations

Commands are defined in `.claude/commands/`:

| File | Command |
|------|---------|
| `plan.md` | `/karimo:plan` |
| `execute.md` | `/karimo:execute` |
| `status.md` | `/karimo:status` |
| `feedback.md` | `/karimo:feedback` |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [PHASES.md](PHASES.md) | Adoption phases |
