<command-name>/karimo-research</command-name>

# KARIMO Research Command

## Purpose

Conduct research to enhance PRD context or explore general topics. Research discovers codebase patterns, identifies gaps, recommends libraries, and provides implementation guidance.

**Two research modes:**
1. **General Research** — Exploratory research not tied to specific PRD
2. **PRD-Scoped Research** — Research scoped to specific PRD context

## Command Syntax

```bash
# General research (exploratory)
/karimo-research "topic to research"

# PRD-scoped research (after PRD creation)
/karimo-research --prd {slug}

# Refine research based on annotations
/karimo-research --refine --prd {slug}

# Research with constraints
/karimo-research --prd {slug} --internal-only
/karimo-research --prd {slug} --external-only
```

## Workflow

### General Research Mode

When invoked without `--prd` flag:

1. **Topic Discovery**
   - Ask: "What topic would you like to research?"
   - Ask: "What specific aspects interest you?" (checkboxes)
   - Store user input for context

2. **Research Execution**
   - Internal research (codebase patterns, if relevant)
   - External research (web search, documentation)
   - Save findings to `.karimo/research/{topic}-{NNN}.md`
   - Update `.karimo/research/index.yaml` catalog

3. **Completion**
   - Display summary of findings
   - Note: "Available for import into future PRDs"

### PRD-Scoped Research Mode

When invoked with `--prd {slug}`:

1. **Context Loading**
   - Read PRD from `.karimo/prds/{NNN}_{slug}/PRD_{slug}.md`
   - Display PRD summary (feature name, tasks)

2. **Import Prompt**
   - Check for general research in `.karimo/research/`
   - If found: "Import existing research?" with list
   - Copy selected research to `.karimo/prds/{slug}/research/imported/`

3. **Research Focus Questions**
   ```
   What would you like to research for this PRD?

   □ Existing patterns in codebase
   □ External best practices
   □ Library recommendations
   □ Error/gap identification
   □ Dependencies and integration points
   □ Performance considerations
   □ Security considerations

   Additional research notes: [free text]
   ```

4. **Research Execution**
   - Internal research (patterns, errors, dependencies, structure)
   - External research (best practices, libraries, references)
   - Save evidence to `.karimo/prds/{slug}/research/internal/` and `external/`

5. **PRD Enhancement**
   - Parse research findings
   - Generate `## Research Findings` section
   - Embed in `PRD_{slug}.md` after existing content
   - Commit: `docs(karimo): add research findings to PRD {slug}`

6. **Completion**
   - Display summary of findings
   - Note: "PRD enhanced. Briefs will inherit this context during /karimo-run"

### Refinement Mode

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

## Agent Invocation

### General Research

```yaml
agent: karimo-researcher
model: sonnet
mode: general
parameters:
  topic: {user_input}
  aspects: {selected_checkboxes}
  output_path: .karimo/research/{topic}-{NNN}.md
```

### PRD-Scoped Research

```yaml
agent: karimo-researcher
model: sonnet
mode: prd_scoped
parameters:
  prd_slug: {slug}
  prd_path: .karimo/prds/{NNN}_{slug}/PRD_{slug}.md
  research_folder: .karimo/prds/{NNN}_{slug}/research/
  imported_research: {selected_general_research}
  focus_areas: {selected_checkboxes}
  additional_notes: {user_input}
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

## Flags

| Flag | Description |
|------|-------------|
| `--prd {slug}` | Research scoped to specific PRD |
| `--refine` | Process annotations and refine research |
| `--internal-only` | Skip external research (codebase only) |
| `--external-only` | Skip internal research (web/docs only) |

## Integration with Other Commands

### `/karimo-plan`

After PRD creation, automatically prompts:
```
Import existing research? [list of .karimo/research/*.md]
Run research on this PRD? [Y/n] (recommended)
```

If user accepts, executes `/karimo-research --prd {slug}` automatically.

### `/karimo-run`

Before execution, checks for PRD research:
- If `## Research Findings` exists in PRD → Load into brief generation
- If missing → Strongly recommend research (can skip with `--skip-research`)

## Output Structure

### General Research Output

```
.karimo/research/
├── {topic}-001.md          # Research document
├── {topic}-002.md
└── index.yaml              # Research catalog
```

### PRD-Scoped Research Output

```
.karimo/prds/{NNN}_{slug}/
├── PRD_{slug}.md                      # ✨ Enhanced with research
├── research/
│   ├── imported/                      # Imported from general research
│   │   ├── {topic}-001.md
│   │   └── index.yaml
│   ├── internal/                      # Codebase research
│   │   ├── patterns.md
│   │   ├── errors.md
│   │   ├── dependencies.md
│   │   └── structure.md
│   ├── external/                      # Web/docs research
│   │   ├── best-practices.md
│   │   ├── libraries.md
│   │   ├── references.md
│   │   └── sources.yaml
│   ├── annotations/                   # Refinement tracking
│   │   ├── round-1.md
│   │   ├── round-2.md
│   │   └── tracking.yaml
│   └── meta.json                      # Research metadata
```

## Error Handling

**Missing PRD:**
```
Error: PRD '{slug}' not found
Run /karimo-plan to create a PRD first
```

**Invalid refine mode:**
```
Error: --refine requires --prd flag
Usage: /karimo-research --refine --prd {slug}
```

**No annotations found:**
```
No annotations found in research artifacts
Add annotations using: <!-- ANNOTATION type: ... text: "..." -->
See .karimo/templates/ANNOTATION_GUIDE.md for syntax
```

## Success Criteria

- ✓ General research saved to `.karimo/research/`
- ✓ PRD-scoped research enhances PRD with `## Research Findings`
- ✓ Evidence artifacts saved to research folder
- ✓ Annotations processed and tracked
- ✓ Commits created with descriptive messages

## Related Commands

- `/karimo-plan` — Creates PRD, offers research
- `/karimo-run` — Checks for research before execution
- `/karimo-status` — Shows research status per PRD

## Related Documentation

- `.karimo/docs/RESEARCH.md` — Research methodology guide
- `.karimo/docs/ANNOTATIONS.md` — Annotation syntax reference
- `.karimo/templates/ANNOTATION_GUIDE.md` — Quick annotation guide
