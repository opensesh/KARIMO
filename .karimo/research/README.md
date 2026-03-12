# General Research Folder

This folder contains **general research** that is not tied to specific PRDs.

## Purpose

General research allows you to explore topics, patterns, and best practices that can be reused across multiple PRDs.

## Folder Structure

```
.karimo/research/
├── index.yaml              # Research catalog with metadata
├── README.md               # This file
├── {topic}-001.md          # First general research document
├── {topic}-002.md          # Second general research document
└── ...
```

## Creating General Research

Run the research command without a `--prd` flag:

```bash
/karimo-research "authentication patterns"
```

The researcher agent will:
1. Ask questions about research focus
2. Conduct internal and external research
3. Save findings to `.karimo/research/{topic}-{NNN}.md`
4. Update `index.yaml` with metadata

## Using General Research

### Import into PRD

During `/karimo-plan`, after PRD approval, you'll be prompted:

```
Found 3 general research documents:

  1. react-auth-patterns-001.md — React authentication patterns
  2. file-upload-patterns-002.md — File upload best practices
  ...

Import any into this PRD? [y/n or select numbers]:
```

Selected research will be copied to `.karimo/prds/{slug}/research/imported/` and available to the PRD-scoped research agent.

### Manual Import

You can also manually import research during PRD-scoped research:

```bash
/karimo-research --prd {slug}
```

The agent will ask if you want to import existing general research.

## Research Format

Each research file follows `GENERAL_RESEARCH_TEMPLATE.md`:

- **Summary:** Brief overview
- **Key Findings:** Categorized discoveries
- **Recommended Patterns:** Code patterns to follow
- **Recommended Libraries:** npm packages with evaluation
- **Issues Identified:** Problems found in codebase
- **Architectural Considerations:** Design decisions
- **References:** External sources

## Annotation and Refinement

Add inline annotations to research files:

```markdown
### Pattern: Authentication Flow

<!-- ANNOTATION
type: question
text: "Should this pattern apply to API routes too?"
-->
```

Then refine (note: general research refinement uses same research file, not PRD-specific):

```bash
# For general research, edit the file directly and document changes
# PRD-scoped research uses /karimo-research --refine --prd {slug}
```

## Benefits

**Knowledge Accumulation:**
- Research once, use many times
- Build project pattern library over time
- Onboard new team members with accumulated knowledge

**Efficiency:**
- Avoid re-researching same topics
- Quick import into new PRDs
- Cross-PRD pattern consistency

**Quality:**
- Iterative refinement via annotations
- External validation via multiple PRDs using same research
- Documentation as research artifact

## Related Documentation

- `.karimo/templates/GENERAL_RESEARCH_TEMPLATE.md` — Research format
- `.karimo/templates/ANNOTATION_GUIDE.md` — Annotation syntax
- `.karimo/docs/RESEARCH.md` — Full research methodology guide

---

*Part of [KARIMO v5.6+](https://github.com/opensesh/KARIMO)*
