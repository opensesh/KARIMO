<command-name>/karimo:research</command-name>

# KARIMO Research Command

## Purpose

Conduct research to discover codebase patterns, identify gaps, recommend libraries, and provide implementation guidance. **This is the REQUIRED first step before planning.**

**Three research modes:**
1. **Feature Init** — `/karimo:research "feature-name"` creates PRD folder and runs initial research
2. **PRD-Scoped** — `/karimo:research --prd {slug}` adds research to existing PRD (iterate loop)
3. **Refinement** — `/karimo:research --refine --prd {slug}` processes annotations

## Command Syntax

```bash
# Start new feature (REQUIRED first step)
# Creates PRD folder and runs research
/karimo:research "feature-name"

# Add research to existing PRD (iterate loop after planning)
/karimo:research --prd {slug}

# Refine research based on annotations
/karimo:research --refine --prd {slug}

# Research with constraints
/karimo:research "feature-name" --internal-only
/karimo:research "feature-name" --external-only
/karimo:research --prd {slug} --internal-only
/karimo:research --prd {slug} --external-only
```

## Feature Init Mode (Default)

When invoked with a bare feature name (no `--prd` flag), this is the **first step** in the KARIMO workflow.

### Workflow

1. **Sanitize Feature Name**
   - Convert `"My Feature Name"` to `my-feature-name` (slug)
   - Validate slug format (lowercase, hyphens, no special chars)

2. **Create PRD Folder Structure**
   - Create `.karimo/prds/{slug}/` (no NNN prefix yet — plan adds it)
   - Create research subfolder structure:
     ```
     .karimo/prds/{slug}/
     ├── assets/                    # Flat folder for screenshots/mockups
     ├── research/
     │   ├── internal/
     │   │   ├── patterns.md        # Evidence
     │   │   ├── errors.md          # Evidence
     │   │   ├── dependencies.md    # Evidence
     │   │   ├── structure.md       # Evidence
     │   │   └── findings.md        # Consolidated output
     │   ├── external/
     │   │   ├── best-practices.md  # Evidence
     │   │   ├── libraries.md       # Evidence
     │   │   ├── references.md      # Evidence
     │   │   ├── sources.yaml       # Attribution
     │   │   └── findings.md        # Consolidated output
     │   ├── summary.md             # Combined executive summary
     │   └── meta.json              # Research metadata
     └── status.json                # Initial status
     ```

3. **Asset Preparation Prompt**

   Before beginning research, ask the user:

   > "Do you have any reference screenshots, diagrams, or mockups for this feature?
   >
   > If yes, drag them into: `.karimo/prds/{slug}/assets/`
   >
   > Reply 'done' when ready, or 'skip' to continue without."

   If user adds files:
   1. Run `node .karimo/scripts/karimo-assets.js import {slug}`
   2. Review imported assets and their auto-generated names
   3. Reference them in `research/findings.md` with clear descriptions

4. **Feature Name Resolution**
   - If invoked with argument (`/karimo:research "embedding engine"`):
     - Use argument directly as feature description
     - Derive slug: "embedding-engine"
     - Proceed immediately to research execution
   - If invoked bare (`/karimo:research`):
     - Respond conversationally: "What feature would you like me to research?"
     - User types naturally (no structured input)
     - Derive slug from their natural language description

   **DO NOT use AskUserQuestion for this step.** Let the user type naturally.
   The agent determines appropriate research focus based on the feature description.

   Default focus areas (always included):
   - Existing patterns in codebase
   - External best practices
   - Library recommendations (when relevant)

   Additional areas (included when relevant to feature):
   - Security considerations (for auth, data, API features)
   - Performance considerations (for data-heavy, real-time features)
   - Error handling patterns (for user-facing features)

5. **Research Execution (Two-Phase)**
   - Spawn `karimo-researcher` agent:
     ```
     @karimo-researcher.md --mode feature-init
     ```

   **Phase 1: Internal Research**
   - Pattern discovery (grep, glob, read)
   - Dependency mapping
   - Error identification
   - Structure analysis
   - Output: `research/internal/findings.md`
   - **Commit after Phase 1**

   **Phase 2: External Research**
   - Best practices (Firecrawl/WebSearch)
   - Library evaluation
   - Documentation references
   - Output: `research/external/findings.md`
   - **Commit after Phase 2**

6. **Generate Summary**
   - Compile combined summary into `research/summary.md`
   - **Commit after summary**

7. **Commit Workflow (3 commits per session)**
   ```bash
   # Commit 1: Internal research
   git commit -m "docs(karimo): internal research for {slug}

   Discovered {N} patterns, mapped {N} dependencies, identified {N} issues.

   Co-Authored-By: Claude <noreply@anthropic.com>"

   # Commit 2: External research
   git commit -m "docs(karimo): external research for {slug}

   Researched {N} best practices, evaluated {N} libraries, found {N} references.

   Co-Authored-By: Claude <noreply@anthropic.com>"

   # Commit 3: Summary
   git commit -m "docs(karimo): complete research summary for {slug}

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

8. **Completion Output**
   ```
   ╭──────────────────────────────────────────────────────╮
   │  Research Complete: {slug}                           │
   ╰──────────────────────────────────────────────────────╯

   ✓ Created folder: .karimo/prds/{slug}/
   ✓ Internal research: 4 files
   ✓ External research: 4 files
   ✓ Findings summary: research/findings.md

   Key discoveries:
     • {pattern_1_summary}
     • {pattern_2_summary}
     • {recommended_library}

   Continue with planning:

     /karimo:plan --prd {slug}

   Tip: After planning, loop back with /karimo:research --prd {slug}
        if you need more context.
   ```

---

## PRD-Scoped Mode (Iterate Loop)

When invoked with `--prd {slug}`, adds research to an existing PRD folder.

### Workflow

1. **Context Loading**
   - Check for existing research in `.karimo/prds/{NNN}_{slug}/research/` OR `.karimo/prds/{slug}/research/`
   - If PRD exists: Read PRD from `.karimo/prds/{NNN}_{slug}/PRD_{slug}.md`
   - Display summary (feature name, tasks if present, existing research)

2. **Import Prompt**
   - Check for general research in `.karimo/research/`
   - If found: "Import existing research?" with list
   - Copy selected research to `.karimo/prds/{slug}/research/imported/`

3. **Research Scope Determination**
   - If `--prd` without value: Present list of existing PRDs to select
     (This IS a valid use of structured selection via AskUserQuestion)
   - If `--prd {slug}`: Load PRD directly, no questions needed
   - Research all relevant aspects by default based on PRD content

   **DO NOT use AskUserQuestion to ask what to research.** The agent analyzes
   the PRD content and determines appropriate research focus automatically.

   If additional context is truly needed, ask conversationally in plain text.

4. **Research Execution**
   - Spawn `karimo-researcher` agent:
     ```
     @karimo-researcher.md --mode prd-scoped
     ```
   - Internal research (patterns, errors, dependencies, structure)
   - External research (best practices, libraries, references)
   - Append to existing research artifacts

5. **PRD Enhancement**
   - Parse research findings
   - Generate `## Research Findings` section
   - Embed in `PRD_{slug}.md` (if PRD exists)
   - Commit: `docs(karimo): add research findings to PRD {slug}`

6. **Completion**
   ```
   ╭──────────────────────────────────────────────────────╮
   │  Research Updated: {slug}                            │
   ╰──────────────────────────────────────────────────────╯

   ✓ Research artifacts updated
   ✓ PRD enhanced with ## Research Findings section

   Next steps:
     • Continue planning: /karimo:plan --prd {slug}
     • Execute tasks: /karimo:run --prd {slug}
     • Refine research: /karimo:research --refine --prd {slug}
   ```

---

## Refinement Mode

When invoked with `--refine --prd {slug}`:

1. **Annotation Detection**
   - Scan research artifacts for `<!-- ANNOTATION -->` comments
   - Parse annotation type (question, correction, addition, challenge, decision)

2. **Refinement Execution**
   - Spawn `karimo-refiner` agent
   - Agent addresses each annotation
   - Updates research artifacts
   - Creates `research/annotations/round-N.md` tracking document

3. **PRD Re-Enhancement**
   - Regenerate `## Research Findings` section with refined data
   - Update PRD
   - Commit: `docs(karimo): refine research findings (round N)`

---

## Agent Invocation

### Feature Init

```yaml
agent: karimo-researcher
model: sonnet
mode: feature-init
parameters:
  slug: {sanitized_slug}
  feature_description: {user_description}  # Full natural language description
  output_folder: .karimo/prds/{slug}/research/
  # focus_areas determined by agent based on feature_description
```

### PRD-Scoped Research

```yaml
agent: karimo-researcher
model: sonnet
mode: prd-scoped
parameters:
  prd_slug: {slug}
  prd_path: .karimo/prds/{NNN}_{slug}/PRD_{slug}.md
  research_folder: .karimo/prds/{NNN}_{slug}/research/
  imported_research: {selected_general_research}
  # focus_areas determined by agent based on PRD content
```

### Refinement

```yaml
agent: karimo-refiner
model: sonnet
parameters:
  prd_slug: {slug}
  research_folder: .karimo/prds/{NNN}_{slug}/research/
  annotations: {parsed_annotations}
```

---

## Flags

| Flag | Description |
|------|-------------|
| `--prd {slug}` | Research scoped to specific PRD (iterate loop) |
| `--refine` | Process annotations and refine research |
| `--internal-only` | Skip external research (codebase only) |
| `--external-only` | Skip internal research (web/docs only) |

---

## Integration with Other Commands

### `/karimo:plan`

**v7.0 Change:** `/karimo:plan` now REQUIRES `--prd {slug}`:
- Must run `/karimo:research "feature"` first
- Then `/karimo:plan --prd feature` uses the research

After PRD creation, can loop back:
```
/karimo:research --prd {slug}   # Add more research
/karimo:plan --prd {slug}       # Resume planning
```

### `/karimo:run`

Before execution, checks for PRD research:
- If `## Research Findings` exists in PRD → Load into brief generation
- If missing → Warning but proceeds (legacy PRDs without research)

---

## Output Structure

### Feature Init Output

```
.karimo/prds/{slug}/
├── assets/                       # Flat folder for screenshots/mockups
│   └── *.png, *.jpg, ...        # Renamed with timestamps after import
├── assets.json                   # Asset metadata manifest
├── research/
│   ├── internal/
│   │   ├── patterns.md           # Evidence: pattern details
│   │   ├── errors.md             # Evidence: issue details
│   │   ├── dependencies.md       # Evidence: dependency mapping
│   │   ├── structure.md          # Evidence: project organization
│   │   └── findings.md           # CONSOLIDATED: agents read this
│   ├── external/
│   │   ├── best-practices.md     # Evidence: practice details
│   │   ├── libraries.md          # Evidence: library evaluations
│   │   ├── references.md         # Evidence: documentation links
│   │   ├── sources.yaml          # Source attribution
│   │   └── findings.md           # CONSOLIDATED: agents read this
│   ├── summary.md                # Combined executive summary
│   └── meta.json
└── status.json
```

**Output Hierarchy:**
1. `summary.md` — Combined executive summary (primary)
2. `internal/findings.md` — Consolidated internal research
3. `external/findings.md` — Consolidated external research
4. Evidence files — Detailed audit trail

### PRD-Scoped Research Output (After Planning)

```
.karimo/prds/{NNN}_{slug}/
├── PRD_{slug}.md                      # Enhanced with research
├── assets/                            # Flat folder for screenshots/mockups
│   └── *.png, *.jpg, ...             # User-added assets (renamed after import)
├── assets.json                        # Asset metadata manifest
├── research/
│   ├── imported/                      # Imported from general research
│   │   ├── {topic}-001.md
│   │   └── index.yaml
│   ├── internal/                      # Codebase research
│   │   ├── patterns.md               # Evidence
│   │   ├── errors.md                 # Evidence
│   │   ├── dependencies.md           # Evidence
│   │   ├── structure.md              # Evidence
│   │   └── findings.md               # CONSOLIDATED
│   ├── external/                      # Web/docs research
│   │   ├── best-practices.md         # Evidence
│   │   ├── libraries.md              # Evidence
│   │   ├── references.md             # Evidence
│   │   ├── sources.yaml              # Attribution
│   │   └── findings.md               # CONSOLIDATED
│   ├── annotations/                   # Refinement tracking
│   │   ├── round-1.md
│   │   ├── round-2.md
│   │   └── tracking.yaml
│   ├── summary.md                     # Combined executive summary
│   └── meta.json                      # Research metadata
```

---

## Error Handling

**Folder Already Exists:**
```
❌ Error: Research folder for '{slug}' already exists

A PRD folder with this slug has already been created.

Options:
  1. Add research to existing: /karimo:research --prd {slug}
  2. Check existing research: cat .karimo/prds/{slug}/research/findings.md
  3. Start fresh: rm -rf .karimo/prds/{slug} && /karimo:research "{slug}"

Recommendation: Use --prd flag to add to existing research
```

**Missing PRD for --prd Flag:**
```
❌ Error: PRD '{slug}' not found

No PRD folder found for this slug.

How to fix:
  1. Start with research: /karimo:research "{slug}"
  2. Check available PRDs: ls .karimo/prds/

Note: v7.0 requires /karimo:research before /karimo:plan
```

**Invalid Refine Mode:**
```
❌ Error: --refine requires --prd flag
Usage: /karimo:research --refine --prd {slug}
```

**No Annotations Found:**
```
No annotations found in research artifacts
Add annotations using: <!-- ANNOTATION type: ... text: "..." -->
See .karimo/templates/ANNOTATION_GUIDE.md for syntax
```

---

## Success Criteria

- ✓ Feature init creates PRD folder with research structure
- ✓ Research findings saved to `research/findings.md`
- ✓ PRD-scoped research enhances PRD with `## Research Findings`
- ✓ Evidence artifacts saved to research folder
- ✓ Annotations processed and tracked
- ✓ Commits created with descriptive messages

---

## New Workflow (v7.0)

```
═══════════════════════════════════════════════════════
STAGE 1: RESEARCH → PLAN (iterate loop)
═══════════════════════════════════════════════════════

USER: /karimo:research "dark-mode-toggle"
  → Creates: .karimo/prds/dark-mode-toggle/
  → Creates: .karimo/prds/dark-mode-toggle/research/
  → Runs: internal codebase scan + external research
  → Saves: research/findings.md
  → Outputs: "Research complete. Run /karimo:plan --prd dark-mode-toggle"

USER: /karimo:plan --prd dark-mode-toggle
  → Loads: research/findings.md into context
  → Runs: 5-round interview (research-informed)
  → Renames: folder to {NNN}_dark-mode-toggle
  → Creates: PRD.md, tasks.yaml
  → Offers: "Need more research? Run /karimo:research --prd dark-mode-toggle"

[ITERATE if needed — research the plan]
USER: /karimo:research --prd dark-mode-toggle
  → Adds: additional research to existing findings
  → Returns to planning or proceeds to execution
```

---

## Related Commands

- `/karimo:plan` — Uses research, creates PRD (requires `--prd {slug}`)
- `/karimo:run` — Checks for research before execution
- `/karimo:dashboard` — Shows research status per PRD

## Related Documentation

- `.karimo/docs/RESEARCH.md` — Research methodology guide
- `.karimo/templates/ANNOTATION_GUIDE.md` — Annotation syntax reference
- `.karimo/templates/PRD_RESEARCH_SECTION_TEMPLATE.md` — Research section format

---

*Generated by [KARIMO v7.0](https://github.com/opensesh/KARIMO)*
