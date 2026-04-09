# Embeddings Strategy (Optional)

> **Status:** Documentation only — KARIMO does not require embeddings
> **Prerequisite:** Phase 1 completed (L0/L1/L2 structure established)
> **Protocol:** OpenViking-inspired layered context

## Overview

KARIMO's layered context system (L0/L1/L2) efficiently manages tokens through
structural organization. Embeddings add **semantic search** capabilities on top
of this foundation for projects with:
- Large learnings corpus (100+ entries)
- Many PRDs (cross-PRD pattern discovery)
- Complex skill/agent selection needs

## When You Need Embeddings

| Scenario | Without Embeddings | With Embeddings |
|----------|-------------------|-----------------|
| Find relevant learnings | Read index, grep keywords | Semantic query |
| Discover similar PRDs | Manual search | "Find PRDs about auth" |
| Agent/skill selection | Read L1 overview tables | "Which agent handles X?" |
| Cross-PRD patterns | Manual review | Automatic clustering |

**Most projects don't need embeddings.** The structural L0/L1/L2 approach
works well because agent selection is deterministic and context is scoped.

## OpenViking Protocol Reference

KARIMO's context architecture is inspired by the [OpenViking Protocol](https://github.com/volcengine/OpenViking). Key concepts:

| Layer | Purpose | Embedding Strategy |
|-------|---------|-------------------|
| L0 | Quick discovery | Embed abstracts for semantic search |
| L1 | Category selection | Index overviews for retrieval |
| L2 | Execution context | Load on-demand (don't embed) |

## Implementation Options

### Option 1: MCP Vector Store Integration

Use an MCP server for vector operations:

```yaml
# .karimo/config.yaml
embeddings:
  enabled: true
  provider: mcp
  mcp_server: your-vector-mcp
```

Popular MCP vector servers:
- Pinecone MCP
- Weaviate MCP
- Qdrant MCP
- Local (sqlite-vec, LanceDB)

### Option 2: External Vector Database

Connect to existing vector infrastructure:

```yaml
embeddings:
  enabled: true
  provider: external
  endpoint: https://your-vector-db.example.com
  model: text-embedding-3-small
```

### Option 3: Local Embeddings (Development)

For development/testing:

```yaml
embeddings:
  enabled: true
  provider: local
  model: all-MiniLM-L6-v2
  storage: .karimo/embeddings/
```

## What to Embed

### Recommended (High Value)

| Content | Why | Update Frequency |
|---------|-----|-----------------|
| L0 abstracts | Agent/skill discovery | On install/update |
| Learnings index | Pattern matching | After /karimo:feedback |
| PRD summaries | Cross-PRD search | After /karimo:plan |

### Not Recommended

| Content | Why Not |
|---------|---------|
| L2 full definitions | Too large, load on-demand instead |
| Task briefs | Ephemeral, scoped to one PRD |
| Code files | Use existing code search tools |

## Example: Semantic Learnings Search

Without embeddings:
```bash
# Grep-based search
grep -r "authentication" .karimo/learnings/
```

With embeddings:
```bash
# Semantic query (via MCP or API)
karimo-search "how do we handle OAuth token refresh?"
# Returns: .karimo/learnings/patterns/oauth-refresh.md (0.89 similarity)
```

## Token Budget Impact

| Context Type | Without Embeddings | With Embeddings |
|--------------|-------------------|-----------------|
| Quick scan | Load L1 (~2K tokens) | Query, load matches (~500 tokens) |
| Agent selection | Read overview table | Query "agent for X" |
| Pattern discovery | Manual review | Automatic clustering |

**Trade-off:** Embeddings add infrastructure complexity but reduce token usage
for large projects.

## Best Practices

### 1. Start Without Embeddings

KARIMO works efficiently without embeddings for most projects:
- < 50 learnings entries
- < 10 PRDs
- Clear agent/skill selection patterns

### 2. Add Embeddings When

- Learnings corpus exceeds 100 entries
- Cross-PRD pattern discovery becomes manual burden
- Agent selection requires semantic reasoning

### 3. Embed Incrementally

1. Start with L0 abstracts only
2. Add learnings index when corpus grows
3. Add PRD summaries for cross-PRD search

### 4. Keep L2 On-Demand

Never embed full L2 definitions — they're meant to be loaded when needed,
not pre-indexed.

## Integration Points

### With /karimo:help

If embeddings are configured, `/karimo:help` could use semantic search:
```
/karimo:help "how do I handle failed Greptile reviews?"
# Semantic search across docs + learnings
```

### With /karimo:feedback

Embedding learnings enables:
- Duplicate detection before adding new learnings
- Automatic categorization suggestions
- Cross-PRD pattern promotion

### With Agent Selection

PM Agent could query embeddings for edge cases:
```
"Which agent handles database migration with rollback?"
# Returns: karimo-implementer-opus (0.87 similarity)
```

## Security Considerations

- **Don't embed secrets** — Ensure .env files are excluded
- **Scope access** — Embeddings should be project-scoped
- **Audit queries** — Log what's being searched if using external providers

## Related Documentation

| Document | Relationship |
|----------|--------------|
| [CONTEXT-ARCHITECTURE.md](CONTEXT-ARCHITECTURE.md) | L0/L1/L2 theory |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview |
| [COMPOUND-LEARNING.md](COMPOUND-LEARNING.md) | Learnings that could be embedded |
| [OpenViking Protocol](https://github.com/volcengine/OpenViking) | Original specification |

---

*Embeddings are optional. KARIMO's structural context approach works for most projects.*
