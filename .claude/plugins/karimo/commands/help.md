# /karimo:help — Help & Documentation Search

Get help with KARIMO commands or search documentation for specific topics.

## Usage

```
/karimo:help                    # List all commands by category
/karimo:help {query}            # Search documentation for query
/karimo:help worktrees          # Search docs for "worktrees"
/karimo:help waves              # Search docs for "waves"
/karimo:help "error recovery"   # Search docs for phrase
```

## Behavior

### No Query: List All Commands

When called without arguments, display all commands organized by category:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Commands                                              │
╰──────────────────────────────────────────────────────────────╯

Core Workflow:
  /karimo:plan                    Create new PRD through interview
  /karimo:run --prd {slug}        Execute PRD tasks (feature branch)
  /karimo:dashboard               Check execution progress (all PRDs)
  /karimo:dashboard --prd {slug}  Detailed status for specific PRD
  /karimo:merge --prd {slug}      Create final PR to main

Configuration:
  /karimo:configure               Project setup (basic mode, auto-detect)
  /karimo:configure --advanced    Full 9-step configuration
  /karimo:configure --preview     Preview config without saving
  /karimo:configure --validate    Validate existing config

Management:
  /karimo:feedback                Capture learnings (auto-detection)

Diagnostics:
  /karimo:doctor                  Health check (7 diagnostic categories)
  /karimo:doctor --test           Quick installation smoke test

Maintenance:
  /karimo:update                  Update to latest KARIMO version
  /karimo:configure --cd          Configure preview deployments

Help:
  /karimo:help                    This command
  /karimo:help {query}            Search documentation

Advanced:
  /karimo:research --prd {slug}   Add research to existing PRD

Need more details? Run: /karimo:help {command-name}
Example: /karimo:help plan

Documentation: .karimo/docs/
```

---

### With Query: Search Documentation

When called with a query, search all `.karimo/docs/*.md` files for relevant content.

**Step 1: Search for query in documentation**

Use Grep tool to search `.karimo/docs/` directory:

```bash
# Search for query in all markdown files
# Use case-insensitive search
# Show context (2 lines before/after)
# Return up to 10 results
```

**Step 2: Format and display results**

Present results in readable format:

```
╭──────────────────────────────────────────────────────────────╮
│  Help: "{query}"                                              │
╰──────────────────────────────────────────────────────────────╯

Found {N} matches in documentation:

📄 GLOSSARY.md:
   Wave: Group of independent tasks that execute in parallel. Tasks in
   Wave 2 cannot start until all Wave 1 tasks are merged. Waves enforce
   dependency ordering without over-serializing work.

   → Full file: .karimo/docs/GLOSSARY.md

📄 ARCHITECTURE.md:
   Wave-Based Execution Flow:
   1. PM Agent reads execution_plan.yaml for wave-based scheduling
   2. Creates worktrees for ready tasks
   3. Spawns agents for tasks (respects max_parallel)
   4. Wave 2 waits for Wave 1 completion

   → Full file: .karimo/docs/ARCHITECTURE.md (line 263)

📄 TROUBLESHOOTING.md:
   ### Wave 2 won't start despite Wave 1 complete
   Causes: PM agent hasn't detected Wave 1 completion
   Solution: Re-trigger execution with /karimo:run --prd {slug}

   → Full file: .karimo/docs/TROUBLESHOOTING.md (line 312)

Related topics you might find helpful:
  • Dependencies (GLOSSARY.md)
  • Task execution (ARCHITECTURE.md)
  • Error recovery (TROUBLESHOOTING.md)

Didn't find what you need? Try:
  /karimo:help {different query}
  /karimo:doctor (for diagnostics)
```

**Step 3: Handle no results**

If no matches found:

```
╭──────────────────────────────────────────────────────────────╮
│  Help: "{query}"                                              │
╰──────────────────────────────────────────────────────────────╯

No matches found for "{query}"

Try searching for related terms:
  • waves → execution, tasks, dependencies
  • PRD → plan, interview, requirements
  • review → greptile, code-review, automated
  • errors → troubleshooting, doctor, diagnostics

Available documentation:
  📄 GLOSSARY.md           Terminology and concepts
  📄 GETTING-STARTED.md    Installation and first PRD
  📄 ARCHITECTURE.md       System design and integration
  📄 COMMANDS.md           Detailed command reference
  📄 TROUBLESHOOTING.md    Common errors and solutions
  📄 DECISION_TREES.md     Command selection guidance
  📄 PHASES.md             Adoption phases explained
  📄 GLOB_PATTERNS.md      Boundary pattern library
  📄 SAFEGUARDS.md         Code integrity and security
  📄 CI-CD.md              Deployment integration
  📄 COMPOUND-LEARNING.md  Two-scope learning system

Run: /karimo:help {term} to search any of these
```

---

## Search Implementation

### Query Preprocessing

Before searching, normalize the query:

1. **Trim whitespace**
2. **Handle multi-word queries**: Keep spaces, search for exact phrase
3. **Case insensitive**: Use `-i` flag in grep
4. **Word boundaries**: Don't require exact word match (allow partial)

### Grep Parameters

```bash
# Example Grep tool call
pattern: "{query}"
path: ".karimo/docs/"
output_mode: "content"
-i: true              # Case insensitive
-C: 2                 # 2 lines context before/after
-n: true              # Show line numbers
glob: "*.md"          # Only markdown files
head_limit: 10        # Max 10 results
```

### Result Processing

For each match:
1. **Extract filename** from path
2. **Extract line number**
3. **Extract context** (matched line + 2 lines before/after)
4. **Truncate long lines** to 80 characters max
5. **Highlight query term** (if possible, use subtle emphasis)

### Special Queries

Handle these queries specially:

| Query | Action |
|-------|--------|
| `commands` | List all commands (same as no query) |
| `getting started` or `start` | Point to GETTING-STARTED.md |
| `install` or `installation` | Point to installation section |
| `troubleshoot` or `errors` | Point to TROUBLESHOOTING.md |
| `glossary` or `terms` | Point to GLOSSARY.md |
| Command name (e.g., `plan`) | Show usage for that command |

### Command-Specific Help

If query matches a command name (e.g., `plan`, `run`, `status`):

```bash
# Read the command file directly
Read tool: .claude/commands/karimo/{query}.md
# Display the Usage section
```

Example output:

```
╭──────────────────────────────────────────────────────────────╮
│  Help: /karimo:plan                                           │
╰──────────────────────────────────────────────────────────────╯

Create new PRD through structured interview.

Usage:
  /karimo:plan                    # Start new PRD
  /karimo:plan --resume {slug}    # Resume draft PRD

What it does:
  1. Runs investigator agent (if no config)
  2. Conducts 6-round interview
  3. Validates PRD with reviewer
  4. Generates dependency graph (DAG)
  5. Saves to .karimo/prds/{slug}/

Time: ~10 minutes for first PRD

Related commands:
  /karimo:run       Execute approved PRD
  /karimo:dashboard Check PRD execution state

Full reference: .claude/commands/karimo/plan.md
Documentation: .karimo/docs/GETTING-STARTED.md
```

---

## Examples

### Example 1: List all commands

```
User: /karimo:help
→ Shows full command list by category
```

### Example 2: Search for "worktree"

```
User: /karimo:help worktree
→ Searches docs, finds:
  - GLOSSARY.md: Definition of worktree
  - ARCHITECTURE.md: Worktree isolation explained
  - TROUBLESHOOTING.md: Worktree errors and fixes
```

### Example 3: Search for command

```
User: /karimo:help dashboard
→ Recognizes command name
→ Reads .claude/commands/karimo/dashboard.md
→ Shows usage, examples, and related commands
```

### Example 4: Multi-word query

```
User: /karimo:help "automated review"
→ Searches for exact phrase "automated review"
→ Finds matches in PHASES.md, DECISION_TREES.md
```

### Example 5: No results

```
User: /karimo:help foobar
→ No matches found
→ Shows list of available documentation
→ Suggests related terms
```

---

## Implementation Notes

### Performance

- Use Grep tool (fast, indexed search)
- Limit results to 10 matches max
- Only search `.karimo/docs/*.md` (exclude PRDs)
- Cache documentation file list (optional)

### User Experience

- **Clear formatting**: Use boxes, bullets, emoji for readability
- **Actionable results**: Always provide next steps or related commands
- **Progressive disclosure**: Show summary first, link to full docs
- **Helpful when lost**: If query unclear, suggest alternative searches

### Error Handling

If Grep tool fails:
```
❌ Error: Unable to search documentation

Possible causes:
  1. .karimo/docs/ directory not found
  2. Permission issues

Fallback: Check documentation directly at .karimo/docs/

Available files:
  ls .karimo/docs/
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:doctor` | Diagnose installation and config issues |
| `/karimo:doctor --test` | Verify KARIMO installation works |
| `/karimo:dashboard` | Check PRD execution and view metrics |

---

## Documentation Map

All documentation is in `.karimo/docs/`:

| File | Description | Keywords |
|------|-------------|----------|
| **GLOSSARY.md** | Terminology reference | worktree, wave, DAG, complexity, loop, agent |
| **GETTING-STARTED.md** | Installation walkthrough | install, first PRD, setup |
| **ARCHITECTURE.md** | System design | agents, execution, coordination, PM |
| **COMMANDS.md** | Command reference | all commands, flags, examples |
| **TROUBLESHOOTING.md** | Error solutions | errors, fixes, recovery, diagnostics |
| **DECISION_TREES.md** | Command selection | which command, when to use |
| **PHASES.md** | Adoption phases | Phase 1, 2, 3, review, metrics |
| **GLOB_PATTERNS.md** | Boundary patterns | never_touch, require_review, frameworks |
| **SAFEGUARDS.md** | Code integrity | security, boundaries, review |
| **CI-CD.md** | Deployment integration | Vercel, Netlify, preview |
| **COMPOUND-LEARNING.md** | Learning system | feedback, learnings, patterns |
| **DASHBOARD.md** | Analytics spec | metrics, dashboard, visualization |

---

## Tips for Effective Searching

### Use specific terms
✅ Good: `worktree error`
❌ Vague: `problem`

### Try variations
If "review" doesn't work, try:
- `code review`
- `greptile`
- `automated review`

### Use quotes for phrases
Search for exact matches:
- `"wave 2 won't start"`
- `"boundary violation"`

### Start broad, then narrow
1. `/karimo:help errors` → See all error topics
2. `/karimo:help worktree error` → Narrow to specific issue

---

*Tip: Bookmark `.karimo/docs/DECISION_TREES.md` for quick command selection guidance*
