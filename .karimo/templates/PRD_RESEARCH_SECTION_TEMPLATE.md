# PRD Research Section Template

This template defines the format for the `## Research Findings` section embedded in PRD files.

**Location:** Inserted into `PRD_{slug}.md` after overview, before tasks section

**Purpose:** Provide implementation context, patterns, and guidance to inform task brief generation

---

## Research Findings

**Last Updated:** {timestamp}
**Research Status:** Draft | In Progress | Approved
**Research Rounds:** {number of annotation rounds}

### Implementation Context

**Existing Patterns (Internal Research):**

- **Pattern Name:** Brief description of pattern
  - **Location:** `path/to/file.ts:42`
  - **Usage:** When and how to use this pattern
  - **Example:** Brief code snippet or reference
  - **Relevance:** Tasks {1a, 1b, 2a}

- **Pattern Name:** {Repeat for each pattern}

**Best Practices (External Research):**

- **Practice Name:** Brief description
  - **Source:** [{Title}]({URL}) (2026)
  - **Recommendation:** How to apply in this project
  - **Relevance:** Tasks {1a, 3b}

- **Practice Name:** {Repeat for each practice}

**Recommended Libraries:**

- **Library Name** (`npm-package-name`)
  - **Purpose:** What problem it solves
  - **Why:** Rationale for recommendation
  - **Version:** Current stable version
  - **Alternative:** {Alternative library if applicable}
  - **Relevance:** Tasks {2a, 2b}
  - **Documentation:** {url}

- **Library Name:** {Repeat for each library}

**Critical Issues Identified:**

- ⚠️ **Issue Title:** Description of issue
  - **Impact:** What breaks or degrades
  - **Affected Tasks:** {1a, 1b}
  - **Recommended Fix:** How to address
  - **Priority:** Critical | High | Medium | Low

- ⚠️ **Issue Title:** {Repeat for each issue}

**Architectural Decisions:**

- **Decision Title:** Decision made based on research
  - **Context:** Why this decision matters
  - **Choice:** What was chosen
  - **Rationale:** Why this choice over alternatives
  - **Implications:** How this affects implementation
  - **Affected Tasks:** {All tasks | Specific tasks}

- **Decision Title:** {Repeat for each decision}

---

### Task-Specific Research Notes

**Task 1a: {Task Title}**

**Patterns to Follow:**
- Pattern from internal research (file:line reference)
- External best practice with source

**Known Issues to Address:**
- Issue identified in research
- Recommended solution approach

**Implementation Guidance:**
- Concrete implementation steps informed by research
- Libraries to use
- Files to reference or extend

**Dependencies:**
- File dependencies: Shared types, utilities (with paths)
- Library dependencies: npm packages to install
- Task dependencies: Must complete Task {X} first

---

**Task 1b: {Task Title}**

{Repeat structure above for each task}

---

**Task 2a: {Task Title}**

{Repeat structure above}

---

### Research Artifacts

Full research details available in:
- Internal patterns: `.karimo/prds/{slug}/research/internal/`
- External research: `.karimo/prds/{slug}/research/external/`
- Imported research: `.karimo/prds/{slug}/research/imported/`

To refine this research:
1. Add annotations to research artifacts using `<!-- ANNOTATION -->` syntax
2. Run: `/karimo-research --refine --prd {slug}`

See `.karimo/templates/ANNOTATION_GUIDE.md` for annotation syntax.

---

## Template Usage Notes

**For karimo-researcher agent:**

1. Generate this section after completing research
2. Parse research artifacts from `research/internal/` and `research/external/`
3. Synthesize findings into above format
4. Embed into PRD after overview, before tasks
5. Include task-specific notes for each task
6. Link to full research artifacts at bottom

**For karimo-brief-writer agent:**

1. Read `## Research Findings` section from PRD
2. Extract task-specific notes for current task
3. Embed in brief's `## Research Context` section
4. Include pattern references, issues, guidance, dependencies

**For karimo-refiner agent:**

1. After processing annotations, regenerate this entire section
2. Mark refined findings with "Refined:" prefix
3. Update task-specific notes if affected
4. Preserve structure and format
