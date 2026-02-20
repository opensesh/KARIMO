# KARIMO Compound Learning System

KARIMO has a two-layer compound learning architecture that makes agents smarter over time. This is not optional instrumentation — it's a core loop that closes the gap between "agents made a mistake" and "agents never make that mistake again."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPOUND LEARNING                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Layer 1: Orchestrator-Level (Deterministic, Code-Driven) │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Runs automatically after every task completion     │   │
│   │  Collects: cost data, scores, failures, iterations  │   │
│   │  Updates: CLAUDE.md, config.yaml, caution files     │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│   Layer 2: Agent-Level (Developer-Facing, Plugin-Driven)   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  /karimo:feedback — Correct agent behavior          │   │
│   │  /karimo:status — Current phase/task status         │   │
│   │  /karimo:checkpoint — Interactive checkpoint         │   │
│   │  /karimo:plan — Start PRD interview                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Orchestrator-Level Learning

After every task completion, level completion, and phase completion, the orchestrator collects structured checkpoint data and programmatically updates agent configuration files. This is code that runs automatically — not an agent prompt, not a skill description.

### What the Orchestrator Collects

- Cost data (estimated vs. actual, delta)
- Greptile scores
- Build failures and type errors
- Iteration counts
- Caution file triggers
- Error classifications

### What It Generates

Structured checkpoint JSON with `patternsToReinforce` and `antiPatternsToAdd`.

### Data Source → Update Target

| Data Source | Updates To | Example |
|-------------|------------|---------|
| Anti-patterns from checkpoints | CLAUDE.md rules section | "NEVER use `border: 1px solid` on container divs — use `shadow-sm` or design token `--border-subtle`. Flagged 4 times." |
| Files causing integration failures | `config.yaml` `require_review` list | New file added to caution list |
| Cost estimate accuracy | `config.yaml` `cost_multiplier` / `iteration_multiplier` | Multiplier adjusted from 3 to 4 |
| Patterns agents follow well | `agent_context` in future PRD tasks | "Reference the token-service.ts pattern from Phase 1" |
| Common failure modes | PRD Interview Round 5 (Retrospective Input) | "Agents struggle with Supabase migrations — add more context" |

### Why This Works

Agents read CLAUDE.md at the start of every session. If the orchestrator has appended a rule, that rule is present before the agent writes a single line of code. Cost multipliers and iteration limits self-calibrate based on actual data. The `require_review` list grows organically as files that cause integration failures get flagged.

---

## Layer 2: Agent-Level Learning

This is the human interface to the compound learning system. Delivered as a Claude Code plugin (with future sync support for Codex, Cursor, etc.), it provides slash commands for injecting your expertise into the pipeline.

### Key Command: `/karimo:feedback`

This is the developer's channel for correcting agent behavior. It can be triggered at any point — during a PR review, after merging, after a failed task, or proactively.

**How it works:**

1. Developer describes what went wrong or what should change (natural language)
2. Plugin captures this as structured feedback linked to the task, PR, or phase
3. Feedback stored in checkpoint data structure
4. On the next checkpoint processing cycle, the orchestrator (Layer 1) promotes validated feedback into configuration files

**Result:** you tell the system "stop doing X" once, and it propagates to every future agent session through deterministic config updates.

### Other Plugin Commands

| Command | Purpose |
|---------|---------|
| `/karimo:feedback` | Correct agent behavior — captured and promoted to config |
| `/karimo:status` | Current phase/task status from GitHub Projects |
| `/karimo:checkpoint` | Interactive checkpoint with qualitative feedback alongside automated analysis |
| `/karimo:plan` | Kicks off PRD interview for a new phase, loading checkpoint learnings |

---

## Why Two Layers

- **Layer 1** is reliable and automatic. It doesn't depend on an agent choosing to invoke a skill. It's code that runs after every task.
- **Layer 2** is for the human in the loop. It gives you a native-feeling interface to inject expertise, frustrations, and corrections.
- **Together** they create a closed loop: you observe problems → Layer 2 captures your feedback → Layer 1 promotes it to config → agents read updated config → fewer problems.

---

## Environment Portability

- **Layer 1** (orchestrator) is environment-agnostic — TypeScript that writes to files. Works regardless of which agent engine is running.
- **Layer 2** (plugin) is Claude Code-native for now. Future support for other environments uses config sync tooling (similar to the Compound Engineering plugin's sync command that converts Claude Code configs to OpenCode, Codex, Cursor formats).

---

## Checkpoint Storage

Checkpoints are stored in `.karimo/checkpoints/`:

```
.karimo/
  checkpoints/
    level-0-foundation.json
    level-0-foundation.md          # Human-readable summary
    level-1-state-management.json
    task-1a-supabase-tokens.json
    phase-1-token-studio.json
```

---

## Checkpoint Data Structure

```typescript
interface Checkpoint {
  id: string;                    // "level-1" or "task-1a" or "phase-1"
  type: 'level' | 'task' | 'phase';
  timestamp: Date;

  // Automated analysis
  whatWorked: string[];
  whatBroke: string[];
  costAnalysis: {
    estimated: number;
    actual: number;
    delta: number;
    deltaPercent: number;
  } | null;

  qualitySignals: {
    greptileScores: number[];
    buildFailures: number;
    typeErrors: number;
    integrationFailures: number;
    cautionFilesTriggered: string[];
  } | null;

  recommendations: string[];

  // Human input (from Layer 2)
  userNotes: string;
  surprises: string;
  changes: string;

  // Feed-forward (consumed by Layer 1)
  patternsToReinforce: string[];     // → Appended to CLAUDE.md
  antiPatternsToAdd: string[];       // → Added to config.yaml rules
  estimateAdjustments: {
    complexityBias: number;          // e.g., +2 iterations per complexity point
    costBias: number;                // e.g., +$1 per task
  } | null;
}
```

---

## Feed-Forward Mechanism

1. **PRD Interview:** Round 5 (Retrospective Input) presents checkpoint learnings and asks if they change the approach
2. **Agent prompts:** `agent_context` for future tasks includes checkpoint patterns
3. **Config updates:** Anti-patterns appended to `rules` in `config.yaml`; new caution files added to `require_review`
4. **Estimate calibration:** If checkpoints consistently show cost underestimates, `cost_multiplier` and `iteration_multiplier` are adjusted automatically

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview and module structure
- [COMPONENTS.md](./COMPONENTS.md) — Component specifications including CLI commands
- [LEVELS.md](./LEVELS.md) — Layer 1 introduced in Level 3, Layer 2 in Level 4
