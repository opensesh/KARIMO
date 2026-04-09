# KARIMO Context Architecture

**Version:** 7.19.0
**Protocol:** OpenViking-inspired L0/L1/L2 Layering

---

## Overview

KARIMO implements a layered context architecture inspired by the [OpenViking Protocol](https://github.com/volcengine/OpenViking). This system optimizes token usage and enables efficient context scanning for AI agents.

**Core principle:** Query category summaries first (L1), verify with compact abstracts (L0) when needed, and load full definitions (L2) only for execution.

---

## Three-Layer System

| Layer | Size | Purpose | Query Order |
|-------|------|---------|-------------|
| **L0 Abstracts** | ~100 tokens | Single-item compact summary | 2nd (verify specific item) |
| **L1 Overviews** | ~2K tokens | All-items category summary | 1st (discover options) |
| **L2 Full Definitions** | Variable | Complete content | 3rd (execute) |

### Naming Convention

The "L" stands for **Level of Detail**, not query order:
- **L0** = Level 0 detail (minimal — single item abstract)
- **L1** = Level 1 detail (moderate — all items summary)
- **L2** = Level 2 detail (full — complete definition)

> **Note:** This differs from cache hierarchies where L1 is accessed first. Here, L0 means "least detail" not "first accessed."

### Practical Query Flow

```
Traditional Approach:
Load all 22 agents = ~55K tokens upfront

OpenViking Approach:
1. Query agents.overview.md (L1) = ~2K tokens    ← "What agents exist?"
2. Load karimo-pm.abstract.md (L0) = ~100 tokens ← "Is this the right one?"
3. Load karimo-pm.md (L2) = ~3K tokens           ← "Execute with full context"

Total: ~5K tokens vs 50K = 90% reduction
```

### When to Use Each Layer

| Scenario | Start With | Then Load |
|----------|------------|-----------|
| "Which agent handles X?" | L1 overview | L0 of candidates |
| "Run task orchestration" | L2 directly (PM agent known) | — |
| "Quick context check" | L0 abstract only | L2 if needed |
| "Full codebase scan" | L1 overview | All relevant L2s |

---

## Agent & Skill Abstracts

### Directory Structure

```
.claude/
├── agents/
│   ├── karimo-pm.md              # L2: Full definition (830 lines)
│   ├── karimo-pm.abstract.md     # L0: Quick summary (~100 tokens)
│   ├── karimo-implementer.md
│   ├── karimo-implementer.abstract.md
│   └── ... (22 agents, each with .abstract.md)
│
├── skills/
│   ├── karimo-code-standards.md
│   ├── karimo-code-standards.abstract.md
│   └── ... (7 skills, each with .abstract.md)
│
├── agents.overview.md             # L1: All agents at a glance
└── skills.overview.md             # L1: All skills with agent mapping
```

### Abstract Template (~100 tokens)

Each abstract file follows this structure:

```markdown
# {agent-name}

**Type:** Agent
**Model:** sonnet | opus
**Trigger:** {When this agent activates}
**Purpose:** {One sentence from description}

## Key Capabilities
- {Capability 1}
- {Capability 2}
- {Capability 3}

## Tools
{Comma-separated list}

---
*Full definition: `.claude/agents/{name}.md` ({N} lines)*
```

### Overview File Structure (~2K tokens)

The `agents.overview.md` provides:

```markdown
# KARIMO Agents Overview

Quick reference for all 22 KARIMO agents.

## Agent Categories

### Coordination Agents (14)
| Agent | Model | Purpose |
|-------|-------|---------|
| karimo-pm | sonnet | Task orchestration, never writes code |
| karimo-interviewer | sonnet | PRD interview conductor |
| ... |

### Task Agents (6)
| Agent | Model | Complexity | Purpose |
|-------|-------|------------|---------|
| karimo-implementer | sonnet | 1-4 | Standard coding tasks |
| karimo-implementer-opus | opus | 5+ | Complex coding tasks |
| ... |

## Model Distribution
- **Opus:** 4 agents (complex reasoning)
- **Sonnet:** 13 agents (coordination, generation)

## Tool Access Summary
| Tool Category | Agents |
|---------------|--------|
| Read/Write/Edit | All task agents |
| Bash | PM, task agents |
| Web tools | Researcher only |
```

---

## Brief Abstracts

Task briefs generated during `/karimo:run` also use the L0/L1/L2 pattern.

### Directory Structure

```
.karimo/prds/{slug}/briefs/
├── 1a_{slug}.md              # L2: Full brief (~500-1000 lines)
├── 1a_{slug}.abstract.md     # L0: Abstract (~50 tokens)
├── 1b_{slug}.md
├── 1b_{slug}.abstract.md
├── 2a_{slug}.md
├── 2a_{slug}.abstract.md
└── briefs.overview.md        # L1: All briefs summary
```

### Brief Abstract Template (~50 tokens)

```markdown
# Brief: {task_id} — {title}

**Wave:** {N} | **Complexity:** {N}/10 | **Model:** {sonnet|opus}

## Objective
{1-2 sentence summary}

## Files
| File | Action |
|------|--------|
| `{path}` | create/modify |

## Dependencies
- Up: {upstream task_ids or "None"}
- Down: {downstream task_ids or "None"}

---
*Full: `{task_id}_{slug}.md`*
```

### Briefs Overview

Generated after all briefs complete:

```markdown
# Briefs Overview: {prd_slug}

## Task Summary
| Task | Title | Wave | Complexity | Model | Status |
|------|-------|------|------------|-------|--------|
| [1a](1a_{slug}.md) | Create user model | 1 | 4 | sonnet | ready |
| [1b](1b_{slug}.md) | Add validation | 1 | 3 | sonnet | ready |
| [2a](2a_{slug}.md) | API endpoints | 2 | 6 | opus | ready |

## Wave Breakdown
### Wave 1 (No dependencies)
- **1a** — Create database models
- **1b** — Add Zod validation schemas

### Wave 2 (Depends on Wave 1)
- **2a** — Implement API routes

## File Overlap Analysis
| File | Tasks | Potential Conflict |
|------|-------|-------------------|
| `src/types/user.ts` | 1a, 2a | Low (1a creates, 2a extends) |
```

---

## Categorized Learnings

Project learnings are organized into categories for efficient retrieval.

### Directory Structure

```
.karimo/learnings/
├── index.md              # Master overview + navigation + stats
├── TEMPLATE.md           # Template for new learning entries
├── patterns/
│   └── index.md          # Positive practices to replicate
├── anti-patterns/
│   └── index.md          # Mistakes to avoid
├── project-notes/
│   └── index.md          # Project-specific context
└── execution-rules/
    └── index.md          # Mandatory guidelines
```

### Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **patterns/** | Positive practices to replicate | "Always use requireAuth() wrapper for protected routes" |
| **anti-patterns/** | Mistakes to avoid | "Never use inline styles — use Tailwind classes" |
| **project-notes/** | Project-specific context | "Auth middleware has race condition on first load" |
| **execution-rules/** | Mandatory guidelines | "All PR descriptions must include test plan" |

### Learning Entry Template

```markdown
# {Learning Title}

**Category:** pattern | anti-pattern | project-note | execution-rule
**Severity:** info | important | critical
**Added:** {ISO date}
**Source:** {/karimo:feedback | PRD-{slug} | manual}

## Description
{What this learning teaches}

## Context
{Why this matters, when it applies}

## Example
{Code example or scenario}
```

### Severity Levels

| Severity | Meaning | Agent Behavior |
|----------|---------|----------------|
| **critical** | Must follow, failure blocks execution | Always loaded, hard gate |
| **important** | Should follow, impacts quality | Loaded for relevant tasks |
| **info** | Nice to know, helpful context | Loaded when context allows |

---

## Cross-PRD Findings Index

Patterns discovered during PRD execution are indexed for reuse across features.

### Directory Structure

```
.karimo/findings/
├── index.md              # Cross-PRD patterns overview
├── PROMOTION_GUIDE.md    # How patterns get promoted
├── by-prd/
│   └── index.md          # PRD-specific findings navigation
└── by-pattern/
    └── index.md          # Pattern-based index (cross-PRD)
```

### Pattern Promotion Flow

```
PRD Execution
     │
     ▼
findings.md (PRD-specific)
     │
     ▼
PM Agent detects reusable patterns
     │
     ▼
Pattern promoted to by-pattern/
     │
     ▼
Future PRDs reference promoted patterns
```

### Promotion Criteria

Patterns are promoted from PRD-specific to cross-PRD when:

1. **Appears in 2+ PRDs** — Same pattern discovered independently
2. **Generic applicability** — Not tied to specific feature domain
3. **High impact** — Prevents significant errors or improves quality
4. **Stable** — Pattern hasn't changed in last 3 PRDs

### Pattern Entry Template

```markdown
# Pattern: {pattern_name}

**First Found:** PRD-{slug} ({date})
**Occurrences:** {N} PRDs
**Category:** architecture | testing | validation | error-handling | ...

## Description
{What this pattern is}

## Usage
{How to apply this pattern}

## Examples
{Code examples from different PRDs}

## PRDs Using This Pattern
- PRD-{slug-1} — {how it was used}
- PRD-{slug-2} — {how it was used}
```

---

## Context Loading Strategy

### For Coordination Tasks

```
1. Load agents.overview.md (L1)
2. Identify relevant agents
3. Load specific agent abstracts (L0)
4. Load full agent definition (L2) for execution
```

### For Task Execution

```
1. Load briefs.overview.md (L1)
2. Identify task brief needed
3. Load task abstract (L0) for verification
4. Load full brief (L2) for execution
5. Load relevant learnings (by category)
```

### For Learning Application

```
1. Load learnings/index.md (L1)
2. Identify relevant categories
3. Load category index.md files
4. Load specific entries based on task context
```

---

## Creating New Abstracts

When adding new agents or skills, create corresponding abstract files.

### Agent Abstract Checklist

- [ ] Extract purpose from description field
- [ ] List 3-5 key capabilities from main sections
- [ ] Include model assignment
- [ ] Include tool list
- [ ] Add line count for full definition
- [ ] Update `agents.overview.md` with new entry

### Skill Abstract Checklist

- [ ] Extract purpose from description field
- [ ] List 3-5 key capabilities
- [ ] Include which agents use this skill
- [ ] Add line count for full definition
- [ ] Update `skills.overview.md` with new entry

---

## Migration from Flat Files

### learnings.md → learnings/

The update script handles migration automatically:

1. Detects existing `learnings.md` file
2. Creates new directory structure
3. Backs up old file to `learnings.md.bak`
4. Creates index.md with migration note
5. User reviews and categorizes existing learnings

### Manual Categorization

After migration, review `learnings.md.bak` and move entries:

```bash
# Example: Move a pattern learning
cat >> .karimo/learnings/patterns/auth-pattern.md << 'EOF'
# Use requireAuth() Wrapper

**Category:** pattern
**Severity:** important
**Added:** 2026-03-12
**Source:** migrated from learnings.md

## Description
Always use the requireAuth() wrapper for protected routes.

## Context
Provides consistent authentication checking and error handling.

## Example
```typescript
export const GET = requireAuth(async (req, user) => {
  // user is guaranteed to be authenticated
});
```
EOF
```

---

## Performance Considerations

### Token Budget Guidelines

| Context Type | Target Budget | Strategy |
|--------------|---------------|----------|
| Quick scan | < 500 tokens | L0 abstracts only |
| Selection | < 3K tokens | L1 overview + relevant L0s |
| Execution | < 10K tokens | L2 for active components |
| Full context | < 30K tokens | Everything (rarely needed) |

### Caching Recommendations

For projects using vector-enhanced search (see OpenViking):

1. **Embed L0 abstracts** — Quick semantic search across all components
2. **Index L1 overviews** — Category-level retrieval
3. **On-demand L2** — Load full definitions only when executing

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design overview |
| [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) | Learning system details |
| [EMBEDDINGS-OPTIONAL.md](EMBEDDINGS-OPTIONAL.md) | Optional vector search enhancement |
| [OpenViking Protocol](https://github.com/volcengine/OpenViking) | Original protocol specification |

---

*This context architecture enables KARIMO to scale efficiently while maintaining comprehensive agent capabilities.*
