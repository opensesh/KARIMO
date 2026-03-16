# Skill: KARIMO Research Methods

## Purpose

This skill provides systematic methodologies for **internal (codebase) research** — discovering patterns, identifying gaps, and gathering implementation context from the existing codebase.

**Scope:** Internal research only (Phase 1 of two-phase model)
**External Research:** See `.claude/skills/karimo/external-research.md`
**Firecrawl Tools:** See `.claude/skills/karimo/firecrawl-web-tools.md`

**Applies to:** karimo-researcher, karimo-refiner agents

**Output:** `research/internal/findings.md` (consolidated output using `INTERNAL_FINDINGS_TEMPLATE.md`)

## Internal Research Strategies

### Pattern Discovery

**Objective:** Find existing implementation patterns to guide new implementations

**Methodology:**

1. **Define Pattern Categories**
   - Authentication & authorization
   - Form handling & validation
   - Error handling & boundaries
   - State management
   - Data fetching & caching
   - File operations (upload, download)
   - API route patterns
   - Component composition
   - Styling patterns

2. **Search Strategy**
   ```bash
   # Authentication patterns
   grep -r "auth\|Auth\|session\|Session" src/ --include="*.ts" --include="*.tsx" -n

   # Form patterns
   grep -r "form\|Form\|validation\|schema\|Schema" src/ --include="*.ts" --include="*.tsx" -n

   # Error handling
   grep -r "error\|Error\|ErrorBoundary\|catch\|try" src/ --include="*.ts" --include="*.tsx" -n

   # State management
   grep -r "useState\|useContext\|useReducer\|createContext" src/ --include="*.ts" --include="*.tsx" -n

   # Data fetching
   grep -r "fetch\|axios\|useQuery\|useMutation" src/ --include="*.ts" --include="*.tsx" -n
   ```

3. **Pattern Analysis**
   - Read files containing pattern references
   - Identify consistent approaches
   - Note file locations and line numbers
   - Extract code examples (keep short, <15 lines)
   - Document pattern purpose and usage

4. **Pattern Documentation**
   - Pattern name (e.g., "requireAuth wrapper")
   - Location (file:line)
   - Purpose (when to use)
   - Example (brief code snippet or reference)
   - Variations (if multiple approaches exist)

### Error Identification

**Objective:** Discover missing patterns, inconsistencies, and potential issues

**Methodology:**

1. **Missing Pattern Detection**
   - Search for expected patterns
   - If not found: document absence
   - Example: No error boundaries → create shared component

2. **Inconsistency Detection**
   - Compare similar implementations
   - Identify divergent approaches
   - Note: "3 components use Approach A, 1 uses Approach B"
   - Recommend standardization

3. **Gap Analysis**
   - Compare PRD requirements to existing code
   - Identify missing utilities, types, components
   - Note dependencies that need creation

4. **Issue Documentation**
   - Issue title
   - Severity (Critical | High | Medium | Low)
   - Impact (what breaks or degrades)
   - Affected files or features
   - Recommended solution

### Dependency Mapping

**Objective:** Identify file and module dependencies for coordination

**Methodology:**

1. **Shared Type Discovery**
   ```bash
   # Find type definition files
   glob "**/*types.ts" "**/*types.tsx" "**/*.d.ts"

   # Find type imports
   grep -r "import.*types\|import type" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Shared Utility Discovery**
   ```bash
   # Find utility files
   glob "**/utils/**/*.ts" "**/lib/**/*.ts" "**/helpers/**/*.ts"

   # Find common imports
   grep -r "import.*utils\|import.*lib\|import.*helpers" src/
   ```

3. **Cross-Task Dependencies**
   - Identify files used by multiple tasks
   - Note shared types that need coordination
   - Flag circular dependencies

4. **Dependency Documentation**
   - File path
   - Dependents (what uses it)
   - Type (shared type, utility, component)
   - Coordination needs (if multiple tasks modify)

### Structure Analysis

**Objective:** Understand project organization and conventions

**Methodology:**

1. **Directory Structure**
   ```bash
   # List directory structure
   find src -type d -maxdepth 3 | sort

   # Count files by type
   find src -name "*.ts" | wc -l
   find src -name "*.tsx" | wc -l
   ```

2. **Naming Conventions**
   - File naming: kebab-case, PascalCase, camelCase?
   - Component naming patterns
   - Test file patterns (*.test.ts, *.spec.ts)
   - Type file patterns (*types.ts, *.d.ts)

3. **Module Organization**
   - Feature-first vs. type-first?
   - Colocation of tests, types, styles?
   - Barrel exports (index.ts usage)?
   - Monorepo structure?

4. **Architectural Patterns**
   - Client/server separation (Next.js app dir)
   - Routing structure
   - Component organization (atomic, feature-based)
   - State management approach

## External Research (Phase 2)

**Note:** External research is covered in Phase 2 of the two-phase model.

**See:**
- `.claude/skills/karimo/external-research.md` — External research strategies
- `.claude/skills/karimo/firecrawl-web-tools.md` — Firecrawl tool reference

**Output:** `research/external/findings.md` (consolidated output using `EXTERNAL_FINDINGS_TEMPLATE.md`)

### Quick Reference

| Need | Skill |
|------|-------|
| Web search queries | `karimo-external-research.md` |
| Source evaluation | `karimo-external-research.md` |
| Library evaluation | `karimo-external-research.md` |
| Firecrawl tools | `karimo-firecrawl-web-tools.md` |

## Research Quality Standards

### Specificity

❌ **Vague:** "Use a good authentication pattern"
✓ **Specific:** "Use requireAuth() wrapper from src/lib/auth/middleware.ts:42"

❌ **Vague:** "Handle errors properly"
✓ **Specific:** "Create ErrorBoundary component (none exist in codebase, grep returned no results)"

❌ **Vague:** "Use a file upload library"
✓ **Specific:** "Use react-dropzone (v14.2.3) for drag-drop file upload with built-in validation"

### Actionability

Every finding should inform implementation:

✓ **Pattern discovery:** → Follow this pattern in Task 1a
✓ **Error identification:** → Create ErrorBoundary component in Task 1a
✓ **Library recommendation:** → Install react-dropzone for Task 2a
✓ **Dependency mapping:** → Task 1a creates types, Task 1b imports them
✓ **Best practice:** → Use XHR for upload progress (Task 2a)

### Evidence-Based

**Always provide evidence:**

- **Internal patterns:** File path and line number
- **External practices:** Source URL and date
- **Library recommendations:** npm stats, GitHub stars
- **Issues:** Grep results showing absence
- **Decisions:** Rationale based on research

**Never guess or assume:**

❌ "This probably uses Redux" → Search and verify
❌ "There might be a utils folder" → Check with glob
❌ "Most projects do X" → Find project-specific evidence

## Common Research Patterns

### New Feature (No Existing Pattern)

1. Search for similar features in codebase
2. If none found: document absence
3. Research external best practices
4. Recommend libraries and approaches
5. Provide implementation guidance

**Output:** "No existing pattern. Recommend {approach} based on {sources}."

### Extending Existing Feature

1. Find existing implementation
2. Analyze current approach
3. Identify extension points
4. Research enhancement patterns
5. Recommend approach consistent with existing code

**Output:** "Extend existing pattern from {file:line}. Add {enhancement} following {approach}."

### Replacing/Refactoring Feature

1. Find current implementation
2. Identify issues or limitations
3. Research modern alternatives
4. Compare trade-offs
5. Recommend migration approach

**Output:** "Current implementation at {file:line} has {issues}. Recommend migrating to {approach} because {rationale}."

## Research Workflow

### Phase 1: Scoping (5 min)

- Read PRD or research topic
- Identify research categories needed
- Plan search strategy

### Phase 2: Internal Research (15-20 min)

- Pattern discovery (grep, glob, read)
- Error identification (check for missing patterns)
- Dependency mapping (find shared types/utils)
- Structure analysis (understand organization)

### Phase 3: External Research (15-20 min)

- Web search for best practices
- Documentation scraping (official docs)
- Library evaluation (if needed)
- Source attribution

### Phase 4: Synthesis (10-15 min)

- Organize findings by category
- Write research artifacts
- Generate PRD research section (if PRD-scoped)
- Link findings to tasks

### Phase 5: Finalization (5 min)

- Save research artifacts
- Commit changes
- Note any follow-up needed

**Total time:** 50-75 minutes for comprehensive PRD-scoped research

## Related Files

- Agent: `.claude/agents/karimo/researcher.md`
- Agent: `.claude/agents/karimo/refiner.md`
- Skill: `.claude/skills/karimo/external-research.md` (Phase 2)
- Skill: `.claude/skills/karimo/firecrawl-web-tools.md` (Firecrawl reference)
- Templates:
  - `.karimo/templates/INTERNAL_FINDINGS_TEMPLATE.md` (consolidated output)
  - `.karimo/templates/GENERAL_RESEARCH_TEMPLATE.md`
  - `.karimo/templates/PRD_RESEARCH_SECTION_TEMPLATE.md`
