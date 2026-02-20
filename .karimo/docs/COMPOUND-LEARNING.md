# KARIMO Compound Learning

KARIMO has a two-scope compound learning system that makes agents smarter over time. This closes the gap between "agents made a mistake" and "agents never make that mistake again."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      COMPOUND LEARNING                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Scope 1: Quick Capture (/karimo:feedback)                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Single observation → Single rule                            │   │
│   │  Time: ~2 minutes                                            │   │
│   │  Use: Immediate capture of patterns/anti-patterns            │   │
│   │  Output: Appends rule to CLAUDE.md                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Scope 2: Deep Learning (/karimo:learn)                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Three-mode investigation cycle                              │   │
│   │  Time: ~45 minutes                                           │   │
│   │  Use: Periodic deep dive (every 2-4 weeks)                   │   │
│   │                                                              │   │
│   │  Mode 1: Interview (Opus)                                    │   │
│   │    Pain points → Audit directives                            │   │
│   │                                                              │   │
│   │  Mode 2: Audit (karimo-learn-auditor)                        │   │
│   │    Evidence gathering → Root cause analysis                  │   │
│   │                                                              │   │
│   │  Mode 3: Review & Act                                        │   │
│   │    Action plan → Human approval → Apply changes              │   │
│   │                                                              │   │
│   │  Output: Multiple config/doc changes with evidence           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Scope 1: Quick Capture

The `/karimo:feedback` command captures single observations immediately.

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
  First flagged: 2024-02-19
```

### When to Use Scope 1

- Immediate capture after observing an issue
- Quick patterns worth reinforcing
- Non-obvious constraints discovered
- Single, isolated observations

---

## Scope 2: Deep Learning

The `/karimo:learn` command conducts a comprehensive three-mode investigation.

### The Three Modes

#### Mode 1: Interview (~25 min)

Opus-guided conversation following `LEARN_INTERVIEW_PROTOCOL.md`:

| Round | Focus | Output |
|-------|-------|--------|
| 1 | What's Hurting | Pain points with severity |
| 2 | Configuration Health | Config gaps and issues |
| 3 | Workflow and Process | Workflow friction points |
| 4 | Deep Dive | Top 2-3 priorities with specifics |
| 5 | Summary | Audit directives for Mode 2 |

**Output:** `.karimo/learn/{timestamp}/interview.md`

#### Mode 2: Audit (~10 min)

`karimo-learn-auditor` agent investigates each directive:

- **Status files:** Task completion, iterations, failures
- **PR history:** Reviews, revisions, patterns via `gh` CLI
- **Codebase:** Pattern verification, boundary compliance
- **Config:** Rule accuracy, boundary effectiveness

**Output:** `.karimo/learn/{timestamp}/findings.md`

#### Mode 3: Review & Act (~10 min)

Interactive change approval:

```
╭─────────────────────────────────────────────────────────────╮
│  Change 1 of 4                                              │
├─────────────────────────────────────────────────────────────┤
│  Target: CLAUDE.md                                          │
│  Type: Add rule to Anti-Patterns                            │
│  Evidence: PR #42, #45, #51 all had inline styles reverted │
│                                                              │
│  + - **Never use inline styles.** Always use Tailwind       │
│  +   utility classes. Reference existing components.        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [A]pprove  [R]eject  [E]dit  [S]kip                        │
╰─────────────────────────────────────────────────────────────╯
```

**Output:**
- `.karimo/learn/{timestamp}/action-plan.md`
- `.karimo/learn/{timestamp}/changes-applied.md`
- Git commit with all approved changes

### When to Use Scope 2

- After completing several PRDs
- When agents repeatedly make the same mistakes
- When configuration feels out of sync
- Periodically (every 2-4 weeks) for system health
- When onboarding new team members

---

## Learn Cycle Flow

```
/karimo:learn
    │
    ▼
INIT: Create .karimo/learn/{timestamp}/, load context
    │
    ▼
MODE 1: INTERVIEW (Opus, ~25 min)
  Round 1: What's Hurting
  Round 2: Configuration Health
  Round 3: Workflow and Process
  Round 4: Deep Dive (top 2-3 priorities)
  Round 5: Summary + Audit Directives
  → Save interview.md
    │
    ▼
MODE 2: AUDIT (karimo-learn-auditor, ~10 min)
  For each directive:
    - Gather evidence (status.json, gh pr, codebase)
    - Analyze patterns, find root cause
    - Produce recommended fix
  → Save findings.md
    │
    ▼
MODE 3: REVIEW & ACT (~10 min)
  Generate action-plan.md from interview + findings
  For each proposed change:
    - Show file, diff, evidence
    - Human: approve / reject / edit
  Apply approved changes directly
  Commit: "chore(karimo): apply learning - {summary}"
  → Save changes-applied.md
    │
    ▼
COMPLETE: Summary of applied vs rejected changes
```

---

## Learn Cycle Artifacts

```
.karimo/learn/{timestamp}/
├── interview.md        # Mode 1: Pain points, audit directives
├── findings.md         # Mode 2: Evidence, root causes
├── action-plan.md      # Mode 3: Proposed changes
└── changes-applied.md  # Mode 3: What was actually applied
```

---

## Learning Categories

Both scopes use the same rule categories:

| Category | Purpose | Example |
|----------|---------|---------|
| **Patterns to Follow** | Positive practices | "Use existing component patterns from `src/components/`" |
| **Anti-Patterns to Avoid** | Mistakes to prevent | "Never use inline styles — use Tailwind" |
| **Rules** | Mandatory guidelines | "All API calls must include error handling" |
| **Gotchas** | Non-obvious constraints | "Supabase auth requires server-side session refresh" |

---

## Learning Storage

### CLAUDE.md Section

Learnings are stored in `CLAUDE.md` under a dedicated section:

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

## Continuity Across Cycles

Learn cycles build on each other:

- **Opening questions** reference past issues: "Last time you flagged X..."
- **Audit** checks if previous changes resolved issues
- **Changes-applied.md** tracks what was fixed and when
- **Patterns emerge** over multiple cycles

### Example Continuity

```
Learn Cycle 1 (Feb 1):
  - Flagged: Agents using inline styles
  - Applied: Added anti-pattern rule

Learn Cycle 2 (Feb 15):
  - Interview: "Has the inline styles issue improved?"
  - Developer: "Yes, but now they're using wrong Tailwind classes"
  - Applied: Added specific Tailwind conventions to CLAUDE.md
```

---

## Scope Comparison

| Aspect | Scope 1: /karimo:feedback | Scope 2: /karimo:learn |
|--------|---------------------------|------------------------|
| **Time** | ~2 minutes | ~45 minutes |
| **Trigger** | Single observation | Periodic review |
| **Investigation** | None | Evidence-based audit |
| **Output** | One rule | Multiple changes |
| **Approval** | Single confirm | Per-change approval |
| **Evidence** | Developer's word | PR history, status files, codebase |
| **Best for** | Quick captures | Systemic improvements |

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

The investigator agent surfaces relevant learnings when scanning:
- "Previous tasks had issues with X — be aware of Y"

---

## Best Practices

### For Scope 1 (/karimo:feedback)

- Be specific about what went wrong
- Include file paths when relevant
- Mention the desired behavior
- Capture immediately after observation

### For Scope 2 (/karimo:learn)

- Run every 2-4 weeks
- Come prepared with specific examples
- Be honest about what's not working
- Review and maintain accumulated rules

### Rule Maintenance

- Periodically review accumulated rules
- Remove rules that no longer apply
- Consolidate similar rules
- Add context when rules become unclear

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
| [CODE-INTEGRITY.md](CODE-INTEGRITY.md) | Code quality practices |
| [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) | Configuration guide |
