# KARIMO Compound Learning

KARIMO has a two-layer compound learning system that makes agents smarter over time. This is a core loop that closes the gap between "agents made a mistake" and "agents never make that mistake again."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPOUND LEARNING                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Layer 1: Automatic (GitHub Actions)                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Runs automatically after task/PR completion        │   │
│   │  Tracks: outcomes, timing, cost, failures           │   │
│   │  Updates: status.json, GitHub Project labels        │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│   Layer 2: Manual (/karimo:feedback)                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Developer captures insights after observation      │   │
│   │  Agent generates structured rules                   │   │
│   │  Rules appended to CLAUDE.md                        │   │
│   │  Future agents read and follow rules                │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Automatic Learning

GitHub Actions track outcomes and update status automatically after each task completion.

### What Gets Tracked

| Data | Source | Stored In |
|------|--------|-----------|
| Task completion time | Workflow timestamps | `status.json` |
| Build success/failure | `karimo-integration.yml` | `status.json` |
| PR merge status | `karimo-sync.yml` | `status.json` |
| Greptile score | `karimo-review.yml` | PR metadata |
| Revision count | PR commits | `status.json` |

### Status Updates

After each task:
- `status.json` updated with completion data
- GitHub Project card moved to appropriate column
- Labels updated (done, failed, needs-revision)
- Milestone progress recalculated

### Example status.json

```json
{
  "prd_slug": "user-profiles",
  "status": "active",
  "started_at": "2026-02-19T10:30:00Z",
  "tasks": {
    "1a": {
      "status": "done",
      "pr_number": 42,
      "started_at": "2026-02-19T10:35:00Z",
      "completed_at": "2026-02-19T11:45:00Z",
      "greptile_score": 4,
      "revisions": 1,
      "merged_at": "2026-02-19T12:00:00Z"
    }
  }
}
```

---

## Layer 2: Manual Learning

The `/karimo:feedback` command captures developer insights and generates rules for future agents.

### How It Works

1. **Developer observes** — Notices an agent pattern or mistake
2. **Runs `/karimo:feedback`** — Describes the observation
3. **Agent analyzes** — Classifies as pattern, anti-pattern, rule, or gotcha
4. **Generates rule** — Creates actionable instruction
5. **Appends to CLAUDE.md** — Under `## KARIMO Learnings`
6. **Future agents read** — Apply rule to subsequent tasks

### Example Usage

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

### Learning Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Patterns to Follow** | Positive practices to reinforce | "Use existing component patterns from `src/components/`" |
| **Anti-Patterns to Avoid** | Mistakes to prevent | "Never use inline styles — use Tailwind" |
| **Rules** | Mandatory guidelines | "All API calls must include error handling" |
| **Gotchas** | Non-obvious constraints | "Supabase auth requires server-side session refresh" |

---

## Learning Storage

### CLAUDE.md Section

Learnings are appended to `CLAUDE.md` under a dedicated section:

```markdown
## KARIMO Learnings

_Rules learned from execution feedback._

### Patterns to Follow

- Always use existing component patterns from `src/components/`
- Reference established utility functions before creating new ones

### Anti-Patterns to Avoid

- Never use inline styles — use Tailwind utility classes
- Don't create new button variants — use the Button component

### Rules

- Error handling must use structured error types from `src/utils/errors.ts`
- All database queries must include proper error handling

### Gotchas

- Supabase auth requires server-side session refresh on route change
- Environment variables need restart to take effect
```

### Why CLAUDE.md?

Claude Code reads `CLAUDE.md` at the start of every session. By storing learnings here:
- All agents see rules immediately
- No separate configuration needed
- Version controlled with the project
- Human-readable and editable

---

## Learning Flow

```
Task Complete → Observation → /karimo:feedback → Rule Generated
                                                       │
                                                       ▼
                                               Append to CLAUDE.md
                                                       │
                                                       ▼
                                               Next Agent Session
                                                       │
                                                       ▼
                                               Agent Reads CLAUDE.md
                                                       │
                                                       ▼
                                               Applies Learned Rules
```

---

## Best Practices

### When to Use /karimo:feedback

- After observing repeated agent mistakes
- When you notice a pattern worth reinforcing
- After discovering a non-obvious constraint
- When integrating new libraries or services

### Writing Effective Rules

**Good:**
> "Always use the existing Button component instead of creating new button variants"

**Better:**
> "Always use the existing Button component from `src/components/ui/Button.tsx` instead of creating new button variants — it has all necessary styles and accessibility built in"

### Rule Maintenance

- Periodically review accumulated rules
- Remove rules that no longer apply
- Consolidate similar rules
- Add context when rules become unclear

---

## Integration with Other Systems

### Boundaries

Learnings can inform `config.yaml` boundaries:
- Repeated caution file triggers → add to `require_review`
- Critical failure patterns → add to `never_touch`

### Task Context

PRD tasks can reference learned patterns:
```yaml
agent_context: |
  Reference the token-service.ts pattern from Phase 1.
  Follow the Button component style established in learnings.
```

### Investigation

The investigator agent can surface relevant learnings when scanning:
- "Previous tasks had issues with X — be aware of Y"

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [CODE-INTEGRITY.md](CODE-INTEGRITY.md) | Code quality practices |
