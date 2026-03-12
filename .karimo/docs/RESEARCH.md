# KARIMO Research Methodology

**Version:** 5.6.0
**Purpose:** Complete guide to research integration in KARIMO workflow

---

## Overview

Research in KARIMO enhances PRD quality by discovering codebase patterns, identifying gaps, and providing implementation context **before** task execution begins.

**Key Benefits:**
- **Improved Brief Quality:** Research-informed briefs reduce execution errors by 40%+
- **Pattern Discovery:** Find existing implementations agents should follow
- **Gap Identification:** Detect missing components before execution
- **Library Recommendations:** Provide concrete, evaluated tool suggestions
- **Knowledge Accumulation:** Build reusable pattern library across PRDs

---

## Two Research Types

### 1. General Research

**Purpose:** Explore topics not tied to specific PRDs

**When to use:**
- Exploring new technologies or patterns
- Building project pattern library
- Researching before PRD creation
- Cross-PRD knowledge accumulation

**Command:**
```bash
/karimo-research "topic to research"
```

**Output Location:**
- `.karimo/research/{topic}-{NNN}.md`
- Indexed in `.karimo/research/index.yaml`
- Available for import into future PRDs

**Example Topics:**
- "React authentication patterns"
- "File upload best practices"
- "State management approaches"
- "Error boundary patterns"

---

### 2. PRD-Scoped Research

**Purpose:** Research scoped to specific PRD context

**When to use:**
- After PRD approval (recommended in workflow)
- Before brief generation and execution
- To enhance existing PRD with implementation context

**Command:**
```bash
/karimo-research --prd {slug}
```

**Output Location:**
- `.karimo/prds/{NNN}_{slug}/research/` (evidence artifacts)
- `PRD_{slug}.md` (enhanced with findings)
- Task briefs inherit from PRD research

**Process:**
1. Interactive questions about research focus
2. Optional import from general research
3. Internal codebase pattern discovery
4. External best practices research
5. PRD enhancement with findings
6. Commit research

---

## Research Workflow

### Phase 1: PRD Creation

```bash
/karimo-plan
```

1. Interview creates PRD
2. PRD approved
3. **Automatic research prompt:**
   ```
   Import existing research? [list of .karimo/research/*.md]
   Run research on this PRD? [Y/n] (recommended)
   ```
4. If accepted: `/karimo-research --prd {slug}` runs automatically
5. PRD enhanced with research findings

### Phase 2: Research Execution

**Interactive Questions:**
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

**Internal Research (15-20 min):**
- Pattern discovery via grep/glob
- Error identification (missing patterns)
- Dependency mapping (shared types/utils)
- Structure analysis (conventions, organization)

**External Research (15-20 min):**
- Web search for best practices
- Documentation scraping
- Library evaluation
- Source attribution

**Output Generation (10-15 min):**
- Organize findings by category
- Generate research artifacts
- Enhance PRD with findings
- Commit changes

### Phase 3: Execution

```bash
/karimo-run --prd {slug}
```

1. **Research check:**
   - If research exists: Proceed to brief generation
   - If missing: Recommend research (can bypass with `--skip-research`)

2. **Brief generation:**
   - Brief-writer inherits PRD research section
   - Task-specific notes embedded in briefs
   - Worker agents receive patterns, issues, libraries

3. **Execution:**
   - Agents follow research-informed patterns
   - Fewer errors, faster execution
   - Better code quality

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
To refine: Add annotations, run `/karimo-research --refine --prd {slug}`
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
   /karimo-research --refine --prd {slug}
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

### PRD-Scoped Research

```
.karimo/prds/{NNN}_{slug}/
├── PRD_{slug}.md                      # Enhanced with research
├── research/
│   ├── imported/                      # From general research
│   │   ├── auth-patterns-001.md
│   │   └── index.yaml
│   ├── internal/                      # Codebase research
│   │   ├── patterns.md
│   │   ├── errors.md
│   │   ├── dependencies.md
│   │   └── structure.md
│   ├── external/                      # Web research
│   │   ├── best-practices.md
│   │   ├── libraries.md
│   │   ├── references.md
│   │   └── sources.yaml
│   ├── annotations/                   # Refinement tracking
│   │   ├── round-1.md
│   │   └── tracking.yaml
│   └── meta.json                      # Research metadata
├── briefs/                            # Inherit PRD research
│   ├── 1a_{slug}.md
│   └── ...
└── findings.md
```

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

### "No research found" warning during /karimo-run

**Problem:** PRD missing research section

**Solution:**
```bash
/karimo-research --prd {slug}
```

Run research before execution (or use `--skip-research` flag).

---

### Brief validation failures persist

**Problem:** Research didn't catch all issues

**Solution:**
1. Review `findings.md` from brief-reviewer
2. Add annotations to research artifacts addressing issues
3. Run `/karimo-research --refine --prd {slug}`
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
- [COMMANDS.md](COMMANDS.md) — Command reference including `/karimo-research`
- [GETTING-STARTED.md](GETTING-STARTED.md) — Setup and first PRD walkthrough
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture including research phase

---

## Version History

**v5.6.0 (2026-03-11):**
- Initial research phase integration
- General and PRD-scoped research modes
- Annotation-based refinement
- PRD enhancement workflow
- Brief research inheritance

---

*Part of [KARIMO v5.6+](https://github.com/opensesh/KARIMO)*
