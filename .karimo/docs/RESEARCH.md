# KARIMO Research Methodology

**Version:** 7.15.0
**Purpose:** Complete guide to research integration in KARIMO workflow

---

## Overview

Research in KARIMO is a **required first step** before planning. It discovers codebase patterns, identifies gaps, and provides implementation context that informs the PRD interview.

**Key Benefits:**
- **Improved Brief Quality:** Research-informed briefs reduce execution errors by 40%+
- **Pattern Discovery:** Find existing implementations agents should follow
- **Gap Identification:** Detect missing components before execution
- **Library Recommendations:** Provide concrete, evaluated tool suggestions
- **Research-Informed Interviews:** Interviewer uses findings to ask better questions

---

## Two-Phase Research Model (v7.2)

Research is executed in **two distinct phases** with commits after each:

### Phase 1: Internal Research

**Focus:** Codebase analysis
**Tools:** Grep, Glob, Read, Bash (read-only)
**Output:** `research/internal/findings.md`
**Skill:** `.claude/plugins/karimo/skills/research-methods.md`

| Component | Purpose |
|-----------|---------|
| Pattern Discovery | Find existing implementations to follow |
| Dependency Mapping | Identify shared types/utilities |
| Error Identification | Find missing patterns, inconsistencies |
| Structure Analysis | Understand project organization |

**Commit:** "docs(karimo): internal research for {slug}"

### Phase 2: External Research

**Focus:** Web research, documentation, libraries
**Tools:** Firecrawl (recommended), WebSearch, WebFetch
**Output:** `research/external/findings.md`
**Skill:** `.claude/plugins/karimo/skills/external-research.md`

| Component | Purpose |
|-----------|---------|
| Best Practices | Search for current recommendations (2025-2026) |
| Library Evaluation | Recommend tools with full evaluation |
| Documentation | Extract relevant guides and references |
| Source Attribution | Track all sources in sources.yaml |

**Commit:** "docs(karimo): external research for {slug}"

### Phase 3: Summary

**Output:** `research/summary.md`
**Content:** Combined executive summary from both phases
**Commit:** "docs(karimo): complete research summary for {slug}"

### Why Two Phases?

1. **Internal findings inform external queries** — Knowing existing patterns helps focus external research
2. **Incremental commits** — Progress saved after each phase (crash recovery)
3. **Clear separation** — Different tools, different outputs, different commits
4. **Parallel review** — User can review internal findings while external runs

---

## Choosing Research Tools

### Firecrawl (Recommended for External)

Firecrawl is the **recommended tool** for external research when available.

**Full Reference:** `.claude/plugins/karimo/skills/firecrawl-web-tools.md`

**Tool Decision Tree:**

| Need | Tool |
|------|------|
| Read documentation page | `firecrawl_scrape` |
| Extract library metadata | `firecrawl_scrape` with JSON |
| Compare multiple packages | `firecrawl_extract` |
| Find docs pages | `firecrawl_map` |
| Web search | `firecrawl_search` |
| JS-heavy sites | `firecrawl_browser_*` |

**Escalation Ladder:**
```
scrape → scrape + waitFor → map + scrape → browser tools → agent
```

### Fallback Tools

When Firecrawl is not available:
- `WebSearch` — Basic web search
- `WebFetch` — Single page fetch with AI processing

### Internal Research Tools

| Tool | Purpose |
|------|---------|
| `Grep` | Pattern discovery, finding implementations |
| `Glob` | File discovery, type/utility location |
| `Read` | Analyzing discovered files |
| `Bash` | Directory structure (read-only) |

---

## Research Modes (v7.0)

### 1. Feature Init Mode (Required First Step)

**Purpose:** Create PRD folder and gather context for a new feature

**When to use:**
- Starting any new feature (required before `/karimo:plan`)
- Beginning the KARIMO workflow

**Command:**
```bash
/karimo:research "feature-name"
```

**What it does:**
1. Creates `.karimo/prds/{slug}/` folder structure
2. Creates `research/` subfolder with internal/external directories
3. Runs research (internal codebase scan + external best practices)
4. Generates `research/findings.md` summary

**Output Location:**
- `.karimo/prds/{slug}/research/findings.md`
- `.karimo/prds/{slug}/research/internal/` (codebase patterns)
- `.karimo/prds/{slug}/research/external/` (best practices)

**Next Step:**
```bash
/karimo:plan --prd {slug}
```

---

### 2. PRD-Scoped Mode (Iterate Loop)

**Purpose:** Add more research to existing PRD folder

**When to use:**
- After planning, when you need more context
- During the research ↔ plan iterate loop
- To enhance existing research with additional findings

**Command:**
```bash
/karimo:research --prd {slug}
```

**Output Location:**
- Adds to existing `.karimo/prds/{slug}/research/` folder
- Updates `research/findings.md` summary

---

### 3. Refinement Mode

**Purpose:** Process annotations and refine research

**When to use:**
- After adding annotations to research files
- To clarify or expand specific findings

**Command:**
```bash
/karimo:research --refine --prd {slug}
```

---

## Research Workflow (v7.0)

### Step 1: Research First

```bash
/karimo:research "my-feature"
```

1. Creates PRD folder: `.karimo/prds/my-feature/`
2. Creates research subfolder structure
3. Asks research focus questions
4. Runs internal + external research
5. Generates `research/findings.md`

### Step 2: Plan with Research Context

```bash
/karimo:plan --prd my-feature
```

1. Loads research findings into context
2. Interviewer uses findings to inform questions
3. Research summary shown at start of Round 1
4. PRD created with research-informed requirements

### Step 3: Iterate (Optional)

If more research needed after planning:

```bash
/karimo:research --prd my-feature
```

Returns to planning to incorporate new findings.

### Step 4: Run with Research

```bash
/karimo:run --prd my-feature
```

1. **Brief generation:**
   - Brief-writer reads research findings
   - Task-specific patterns embedded in briefs
   - Agents receive library recommendations, issues

2. **Auto-review:**
   - Validates briefs against research findings
   - Checks pattern compliance
   - Identifies gaps

3. **User iterate:**
   - Review recommendations
   - Approve or modify briefs

4. **Orchestrate:**
   - Agents follow research-informed patterns
   - Fewer errors, faster execution
   - Better code quality

### Skip Research (Not Recommended)

For urgent hotfixes:

```bash
/karimo:plan --prd my-feature --skip-research
```

This bypasses the research requirement but shows a warning.

---

## Research Components

### Internal Research

**Pattern Discovery:**
- Authentication & authorization patterns
- Form handling & validation patterns
- Error handling & boundary patterns
- State management patterns
- Data fetching & caching patterns
- Component composition patterns

**Search Strategy:**
```bash
# Find authentication patterns
grep -r "auth\|Auth" src/ --include="*.ts" --include="*.tsx" -n

# Find form patterns
grep -r "form\|Form\|validation" src/ --include="*.ts" --include="*.tsx" -n

# Find error handling
grep -r "ErrorBoundary\|error\|Error" src/ --include="*.ts" --include="*.tsx" -n
```

**Output:**
- Pattern name and location (file:line)
- Purpose and usage guidelines
- Code examples or references
- Variations and alternatives

**Error Identification:**
- Missing patterns (e.g., no error boundaries)
- Inconsistent implementations
- Gaps between PRD requirements and existing code

**Dependency Mapping:**
- Shared types (imported by multiple files)
- Utility functions (common helpers)
- Cross-task dependencies (coordination needs)

**Structure Analysis:**
- Naming conventions (kebab-case, PascalCase, etc.)
- Module organization (feature-first, type-first)
- Architectural patterns (client/server, routing)

---

### External Research

**Web Search Best Practices:**

Query Formulation:
```
# Best practices (always include year)
"React file upload best practices 2026"
"Next.js authentication best practices 2026"

# Library comparisons
"react-dropzone vs react-file-drop 2026"
"Redux vs Zustand vs Jotai comparison"

# Implementation patterns
"Next.js middleware authentication implementation"
"React error boundary implementation guide"

# Security and performance
"file upload security best practices"
"React form validation performance optimization"
```

**Source Evaluation:**

**Trusted Sources (High Priority):**
- Official documentation (React, Next.js, framework docs)
- MDN (Mozilla Developer Network)
- Established technical blogs (LogRocket, Smashing Magazine)
- Library documentation (npm README, official sites)

**Secondary Sources (Validate):**
- Stack Overflow (for specific issues)
- Dev.to, Medium (check author credibility)
- GitHub discussions and RFCs

**Information Extraction (Copyright Compliant):**
- ✓ Paraphrase and synthesize
- ✓ Link to sources instead of reproducing
- ✓ Maximum ONE quote per source, <15 words
- ✓ Attribute all sources in `sources.yaml`
- ✗ Never reproduce large blocks (>20 words)
- ✗ Never quote song lyrics (hard ban)

**Library Evaluation:**

Criteria:
- **Maintenance:** Last updated within 6 months
- **Quality:** TypeScript support, documentation, test coverage
- **Compatibility:** Works with project tech stack
- **License:** MIT, Apache 2.0 safe for commercial use
- **Bundle Size:** Check impact (use Bundlephobia)

Format:
```markdown
### Library: react-dropzone (`react-dropzone`)

**Purpose:** Drag-drop file upload with validation
**Version:** 14.2.3
**Bundle Size:** 8.2kB (minified + gzipped)
**License:** MIT

**Pros:**
- Active maintenance (updated 2 weeks ago)
- Excellent TypeScript support
- Small bundle size
- Well-documented with examples

**Cons:**
- No built-in preview component
- Requires custom styling

**Documentation:** https://react-dropzone.js.org
**npm:** https://www.npmjs.com/package/react-dropzone
```

---

## PRD Enhancement

### Research Findings Section

After research completes, PRD is enhanced with:

```markdown
## Research Findings

**Last Updated:** 2026-03-11T14:30:00Z
**Research Status:** Approved
**Research Rounds:** 1

### Implementation Context

**Existing Patterns (Internal):**
- **requireAuth() wrapper:** Route protection pattern (src/lib/auth/middleware.ts:42)
  - Usage: All protected routes use this wrapper
  - Relevance: Tasks 1a, 1b

**Best Practices (External):**
- **File upload with progress:** Use XHR + FormData pattern
  - Source: [MDN FormData Guide](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
  - Relevance: Task 2a

**Recommended Libraries:**
- **react-dropzone** (`react-dropzone`)
  - Purpose: Drag-drop file upload with validation
  - Why: Active, TypeScript support, small bundle
  - Version: 14.2.3
  - Relevance: Task 2a
  - Docs: https://react-dropzone.js.org

**Critical Issues Identified:**
- ⚠️ **No Error Boundaries:** Grep returned no results
  - Impact: Errors crash entire app
  - Affected Tasks: 1a, 1b
  - Fix: Create shared ErrorBoundary component in Task 1a
  - Priority: High

**Architectural Decisions:**
- **Image Storage:** S3 for production, local filesystem for dev
  - Context: File upload requires storage strategy
  - Choice: S3 (scalable, CDN support)
  - Rationale: Prod-ready, cheaper than alternatives
  - Tasks: 2a, 2b

### Task-Specific Research Notes

**Task 1a: Add authentication middleware**

**Patterns to Follow:**
- requireAuth() wrapper from src/lib/auth/middleware.ts:42
- Middleware pattern from src/lib/

**Known Issues:**
- Create ErrorBoundary component (missing)

**Libraries:**
- zod (already installed, use for validation)

**Dependencies:**
- File: src/types/user.ts (shared with Task 1b)

{Repeat for each task}

### Research Artifacts

Full details: `.karimo/prds/{slug}/research/`
To refine: Add annotations, run `/karimo:research --refine --prd {slug}`
```

---

## Annotation System

### Purpose

Refine research iteratively based on human feedback using inline annotations.

### Syntax

```html
<!-- ANNOTATION
type: {type}
text: "{feedback}"
-->
```

### Types

**1. Question:**
```markdown
### Pattern: Authentication Flow

<!-- ANNOTATION
type: question
text: "Should this pattern apply to API routes too?"
-->
```

**2. Correction:**
```markdown
**File:** src/lib/auth/middleware.ts

<!-- ANNOTATION
type: correction
text: "File moved to src/middleware/auth.ts in recent refactor"
-->
```

**3. Addition:**
```markdown
## Patterns

<!-- ANNOTATION
type: addition
text: "Please research error boundary patterns as well"
-->
```

**4. Challenge:**
```markdown
**Recommended:** old-library v2.0

<!-- ANNOTATION
type: challenge
text: "This library has security issues. Use react-dropzone instead."
-->
```

**5. Decision:**
```markdown
**Options:** Redux | Zustand | Context

<!-- ANNOTATION
type: decision
text: "We've decided to use Zustand for consistency with existing code"
-->
```

### Refinement Workflow

1. **Add annotations** to research artifacts
2. **Run refinement:**
   ```bash
   /karimo:research --refine --prd {slug}
   ```
3. **Agent processes annotations:**
   - Answers questions
   - Applies corrections
   - Conducts additional research
   - Re-evaluates challenges
   - Incorporates decisions
4. **PRD re-enhanced** with refined findings
5. **Review and iterate** if needed

### Tracking

Refinement creates:
- `research/annotations/round-N.md` — Annotation resolution log
- `research/annotations/tracking.yaml` — Status tracking
- Updated PRD with refined findings

---

## Folder Structure

### General Research

```
.karimo/research/
├── index.yaml                  # Research catalog
├── README.md                   # Documentation
├── auth-patterns-001.md        # Research document
├── file-upload-002.md
└── ...
```

### PRD-Scoped Research (v7.2)

```
.karimo/prds/{NNN}_{slug}/
├── PRD_{slug}.md                      # Enhanced with research
├── research/
│   ├── imported/                      # From general research
│   │   ├── auth-patterns-001.md
│   │   └── index.yaml
│   ├── internal/                      # Phase 1 output
│   │   ├── patterns.md               # Evidence: pattern details
│   │   ├── errors.md                 # Evidence: issue details
│   │   ├── dependencies.md           # Evidence: dependency mapping
│   │   ├── structure.md              # Evidence: project organization
│   │   └── findings.md               # CONSOLIDATED: agents read this
│   ├── external/                      # Phase 2 output
│   │   ├── best-practices.md         # Evidence: practice details
│   │   ├── libraries.md              # Evidence: library evaluations
│   │   ├── references.md             # Evidence: documentation links
│   │   ├── sources.yaml              # Source attribution
│   │   └── findings.md               # CONSOLIDATED: agents read this
│   ├── annotations/                   # Refinement tracking
│   │   ├── round-1.md
│   │   └── tracking.yaml
│   ├── summary.md                     # Combined executive summary
│   └── meta.json                      # Research metadata
├── briefs/                            # Inherit PRD research
│   ├── 1a_{slug}.md
│   └── ...
└── findings.md                        # Legacy (deprecated)
```

### Output Hierarchy

Agents read consolidated findings in this order:
1. **summary.md** — Combined executive summary (primary)
2. **internal/findings.md** — Consolidated internal research
3. **external/findings.md** — Consolidated external research
4. **Evidence files** — Detailed audit trail (patterns.md, errors.md, etc.)

---

## Quality Standards

### Specificity

❌ **Vague:** "Use a good pattern"
✓ **Specific:** "Use requireAuth() wrapper from src/lib/auth/middleware.ts:42"

❌ **Vague:** "Handle errors"
✓ **Specific:** "Create ErrorBoundary component (none exist, grep returned no results)"

### Actionability

Every finding should inform implementation:
- Pattern discovery → Follow in Task X
- Error identification → Fix in Task Y
- Library recommendation → Install for Task Z
- Best practice → Apply in implementation

### Evidence-Based

Always provide evidence:
- **Internal:** File path and line number
- **External:** Source URL and date
- **Libraries:** npm stats, GitHub stars
- **Issues:** Grep results showing absence

Never guess or assume:
- ❌ "This probably uses Redux"
- ✓ Search codebase, verify, then document

---

## Success Metrics

### Quality Improvements

| Metric | Before Research | Target with Research |
|--------|-----------------|---------------------|
| Brief validation failures | 40% | <20% |
| Task revision loops | 2.3 avg | <1.5 avg |
| Execution time per task | 15 min | 12 min |
| Human interventions | 3.2 per PRD | <2.0 per PRD |

### Research Efficiency

- **Time Investment:** 50-75 min per PRD
- **Time Saved:** 3-5 hours reduced execution errors
- **ROI:** ~4x time savings
- **Quality:** Measurable reduction in errors

---

## Best Practices

### Do:

✓ Research after PRD approval, before execution
✓ Answer all research focus questions
✓ Import relevant general research
✓ Provide file:line references for patterns
✓ Evaluate libraries (maintenance, size, license)
✓ Attribute all external sources
✓ Use annotations for iterative refinement
✓ Commit research immediately after completion

### Don't:

✗ Skip research (reduces brief quality)
✗ Reproduce large blocks from documentation
✗ Guess or assume codebase patterns
✗ Recommend libraries without evaluation
✗ Ignore missing patterns (document absence)
✗ Forget copyright compliance (<15 word quotes)
✗ Leave annotations unprocessed

---

## Troubleshooting

### "No research found" warning during /karimo:run

**Problem:** PRD missing research section

**Solution:**
```bash
/karimo:research --prd {slug}
```

Run research before execution (or use `--skip-research` flag).

---

### Brief validation failures persist

**Problem:** Research didn't catch all issues

**Solution:**
1. Review `findings.md` from brief-reviewer
2. Add annotations to research artifacts addressing issues
3. Run `/karimo:research --refine --prd {slug}`
4. Re-generate briefs

---

### Research takes too long

**Problem:** Comprehensive research is time-consuming

**Solutions:**
- Focus on critical topics only (uncheck optional boxes)
- Use `--internal-only` to skip external research
- Reuse general research across PRDs
- Refine incrementally via annotations

---

### Annotations not being processed

**Problem:** Malformed annotation syntax

**Check:**
- Valid HTML comment syntax
- Required fields: `type`, `text`
- Valid type (question, correction, addition, challenge, decision)
- Proper placement (after content being annotated)

**Fix:**
```html
<!-- ANNOTATION
type: question
text: "Your question here?"
-->
```

See `.karimo/templates/ANNOTATION_GUIDE.md` for full syntax.

---

## Related Documentation

- [ANNOTATION_GUIDE.md](../templates/ANNOTATION_GUIDE.md) — Annotation syntax reference
- [COMMANDS.md](COMMANDS.md) — Command reference including `/karimo:research`
- [GETTING-STARTED.md](GETTING-STARTED.md) — Setup and first PRD walkthrough
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture including research phase

---

## Version History

**v7.2.0 (2026-03-12):**
- Two-phase research model (internal → external with commits after each)
- Consolidated findings outputs (internal/findings.md, external/findings.md)
- Firecrawl elevated to recommended tool for external research
- New templates: INTERNAL_FINDINGS_TEMPLATE.md, EXTERNAL_FINDINGS_TEMPLATE.md
- karimo-firecrawl-web-tools.md skill added

**v7.0.0 (2026-03-11):**
- Research-first workflow (required before planning)
- Feature init mode creates PRD folder structure
- Research informs PRD interview

**v5.6.0 (2026-03-11):**
- Initial research phase integration
- General and PRD-scoped research modes
- Annotation-based refinement
- PRD enhancement workflow
- Brief research inheritance

---

*Part of [KARIMO v7.2+](https://github.com/opensesh/KARIMO)*
