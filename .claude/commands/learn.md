# /karimo:learn — Deep Learning Cycle

Conduct a comprehensive learning cycle to improve KARIMO configuration based on pain points, usage patterns, and execution history.

## Purpose

Unlike `/karimo:feedback` (quick, single-rule capture), `/karimo:learn` is a deep, three-mode investigation cycle:

1. **Mode 1: Interview** — Opus-guided conversation to surface pain points and create audit directives
2. **Mode 2: Audit** — Agent investigates directives using status.json, PR history, and codebase patterns
3. **Mode 3: Review & Act** — Present findings as action plan, apply approved changes

## Usage

```
/karimo:learn
```

No arguments required. The command guides you through all three modes sequentially.

## When to Use

- After completing several PRDs and noticing patterns
- When agents repeatedly make the same mistakes
- When configuration feels out of sync with your workflow
- Periodically (every 2-4 weeks) for system health checks
- When onboarding new team members to assess documentation quality

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

## Behavior

### Initialization

1. **Create learn cycle folder:**
   ```
   .karimo/learn/{timestamp}/
   ```
   Where `{timestamp}` is ISO format: `2024-02-19T14-30-00`

2. **Load context:**
   - Previous learn cycles from `.karimo/learn/`
   - PRD index from `.karimo/prds/`
   - Current CLAUDE.md KARIMO Learnings section
   - Current `.karimo/config.yaml`

3. **Check for interrupted cycles:**
   - If a recent learn folder exists without `changes-applied.md`, offer to resume

### Mode 1: Interview

Follow the LEARN_INTERVIEW_PROTOCOL.md template:

1. **Pre-interview setup** — Load previous cycles, scan PRD index, read config
2. **Round 1: What's Hurting** — Surface frustrations and pain points
3. **Round 2: Configuration Health** — Assess config accuracy
4. **Round 3: Workflow and Process** — Evaluate KARIMO workflow
5. **Round 4: Deep Dive** — Go deep on top 2-3 issues
6. **Round 5: Summary** — Confirm scope and generate audit directives

**Output:** `.karimo/learn/{timestamp}/interview.md`

### Mode 2: Audit

Spawn `@karimo-learn-auditor.md` with the interview output:

```
Investigate the audit directives in interview.md.
Learn cycle folder: .karimo/learn/{timestamp}/
```

The auditor agent:
1. Parses audit directives from interview.md
2. Gathers evidence from status files, PR history, codebase
3. Analyzes patterns and identifies root causes
4. Produces specific recommendations

**Output:** `.karimo/learn/{timestamp}/findings.md`

### Mode 3: Review & Act

Generate and execute an action plan:

1. **Generate action plan:**
   Create `.karimo/learn/{timestamp}/action-plan.md` combining interview and findings into concrete changes.

2. **Present each change for approval:**
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

3. **Handle responses:**
   - **Approve:** Apply change immediately
   - **Reject:** Skip change, note in log
   - **Edit:** Allow user to modify the change before applying
   - **Skip:** Defer to later

4. **Apply approved changes:**
   - Edit target files directly
   - Changes target config/docs, not code (CLAUDE.md, config.yaml, templates, agent definitions)

5. **Commit changes:**
   ```bash
   git add -A
   git commit -m "chore(karimo): apply learning - {summary}

   Applied changes from learn cycle {timestamp}:
   - {change 1 summary}
   - {change 2 summary}

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
   ```

**Output:** `.karimo/learn/{timestamp}/changes-applied.md`

### Completion

Display summary:

```
╭──────────────────────────────────────────────────────────────╮
│  Learn Cycle Complete                                        │
╰──────────────────────────────────────────────────────────────╯

Cycle: 2024-02-19T14-30-00
Duration: ~45 min

Changes Applied: 3
  ✓ CLAUDE.md: Added anti-pattern rule (inline styles)
  ✓ config.yaml: Added middleware.ts to require_review
  ✓ KARIMO_RULES.md: Clarified task boundary enforcement

Changes Rejected: 1
  ✗ config.yaml: Change models.threshold (user prefers current)

Next Steps:
- Changes take effect on next agent invocation
- Run /karimo:learn again in 2-4 weeks
- Use /karimo:feedback for quick single-rule captures

Artifacts saved to: .karimo/learn/2024-02-19T14-30-00/
```

## Learn Cycle Artifacts

```
.karimo/learn/{timestamp}/
├── interview.md        # Mode 1: Pain points, audit directives
├── findings.md         # Mode 2: Evidence, root causes
├── action-plan.md      # Mode 3: Proposed changes
└── changes-applied.md  # Mode 3: What was actually applied
```

## Resuming Interrupted Cycles

If `/karimo:learn` detects an incomplete cycle:

```
Found incomplete learn cycle from 2024-02-19.
Last completed: Mode 1 (interview.md exists)

Options:
1. Resume from Mode 2 (Audit)
2. Start fresh (archive previous)
3. Cancel
```

## Continuity Across Cycles

Each learn cycle builds on previous ones:

- **Opening questions** reference past issues: "Last time you flagged X..."
- **Audit** checks if previous changes resolved issues
- **Changes-applied.md** tracks what was fixed and when
- **Patterns emerge** over multiple cycles

## Comparison: /karimo:feedback vs /karimo:learn

| Aspect | /karimo:feedback | /karimo:learn |
|--------|------------------|---------------|
| **Scope** | Single observation | Full system review |
| **Time** | ~2 minutes | ~45 minutes |
| **Output** | One rule in CLAUDE.md | Multiple config changes |
| **Investigation** | None | Evidence-based audit |
| **Use when** | Quick capture | Periodic deep dive |

## Related Documentation

| Document | Purpose |
|----------|---------|
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-scope learning system |
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design |
