# KARIMO Research Annotation Guide

## Purpose

Annotations allow you to provide feedback on research findings inline, directly in research artifact files. The karimo-refiner agent processes annotations and refines research accordingly.

## Syntax

Annotations use HTML comment syntax to be invisible in rendered markdown:

```html
<!-- ANNOTATION
type: {annotation_type}
text: "{your feedback text}"
-->
```

**Required fields:**
- `type` — Annotation type (see below)
- `text` — Your feedback, question, or instruction

**Placement:**
- Add immediately after the content you're annotating
- Can appear anywhere in research artifacts
- Will be removed after processing

## Annotation Types

### 1. Question

Ask for clarification or additional investigation.

**Example:**

```markdown
### Pattern: Authentication Flow

**Location:** `src/lib/auth/`
**Relevance:** Tasks 1a, 1b

<!-- ANNOTATION
type: question
text: "Should this pattern apply to API routes too?"
-->

The authentication flow uses a `requireAuth()` wrapper...
```

**Refiner Response:**
- Investigates the question
- Searches codebase for answer
- Updates research with findings
- Documents investigation in tracking

---

### 2. Correction

Correct incorrect information in research.

**Example:**

```markdown
**Key Files:**
- `src/lib/auth/middleware.ts`

<!-- ANNOTATION
type: correction
text: "File moved to src/middleware/auth.ts in recent refactor"
-->
```

**Refiner Response:**
- Verifies the correction
- Updates research with corrected information
- Fixes all related references
- Notes correction source in tracking

---

### 3. Addition

Request additional research on a topic.

**Example:**

```markdown
## Recommended Patterns

### Pattern: Form Validation

{existing content}

<!-- ANNOTATION
type: addition
text: "Please research error boundary patterns as well"
-->
```

**Refiner Response:**
- Conducts additional research on requested topic
- Adds new findings to research artifacts
- Updates PRD with new findings
- Documents addition in tracking

---

### 4. Challenge

Dispute a finding and request re-evaluation.

**Example:**

```markdown
### Recommended Library: old-library v2.0

**Purpose:** File upload handling

<!-- ANNOTATION
type: challenge
text: "This library has known security issues in v2.0. Recommend react-dropzone instead."
-->
```

**Refiner Response:**
- Re-evaluates the challenged finding
- Researches alternative (react-dropzone)
- Updates recommendation with new library
- Documents decision rationale in tracking

---

### 5. Decision

Document an architectural decision made based on research.

**Example:**

```markdown
## Architectural Considerations

**State Management Options:**
1. Redux
2. Zustand
3. React Context

<!-- ANNOTATION
type: decision
text: "We've decided to use Zustand for consistency with existing codebase"
-->
```

**Refiner Response:**
- Incorporates decision into research
- Updates PRD with architectural decision
- Adjusts affected task-specific notes
- Documents rationale in tracking

---

## Annotation Workflow

### Step 1: Review Research

After research completes, review:
- `.karimo/prds/{slug}/research/internal/*.md`
- `.karimo/prds/{slug}/research/external/*.md`
- `PRD_{slug}.md` (Research Findings section)

### Step 2: Add Annotations

Edit research files directly and add `<!-- ANNOTATION -->` comments:

```markdown
### Pattern: Error Handling

**Current State:** No global error boundaries exist

<!-- ANNOTATION
type: question
text: "Should we add error boundaries at route level or component level?"
-->

<!-- ANNOTATION
type: addition
text: "Research React Suspense integration with error boundaries"
-->

**Recommendation:** Create shared ErrorBoundary component
```

### Step 3: Run Refinement

```bash
/karimo-research --refine --prd {slug}
```

### Step 4: Review Refined Research

Check:
- Updated research artifacts (annotations removed)
- `research/annotations/round-N.md` (tracking document)
- Updated `PRD_{slug}.md` (re-enhanced with refined findings)

### Step 5: Iterate if Needed

If more refinement needed:
- Add more annotations
- Run `/karimo-research --refine --prd {slug}` again
- Repeat until satisfied

---

## Best Practices

### Do:

✓ **Be specific:** "File moved to src/middleware/auth.ts" not "File is wrong"
✓ **Provide context:** Explain why you're questioning or challenging
✓ **Request concrete additions:** "Research error boundary patterns" not "Add more research"
✓ **Document decisions with rationale:** Explain why a choice was made
✓ **Use appropriate type:** Match annotation type to intent

### Don't:

✗ **Don't be vague:** "This seems wrong" — what specifically is wrong?
✗ **Don't add non-annotation comments:** Use annotations, not freeform text
✗ **Don't leave unresolved annotations:** Process them with refiner
✗ **Don't nest annotations:** One annotation per location
✗ **Don't use invalid types:** Stick to the 5 supported types

---

## Multiple Annotations

You can add multiple annotations in one file:

```markdown
### Pattern: Authentication

<!-- ANNOTATION
type: question
text: "Does this pattern support SSO?"
-->

**Location:** `src/lib/auth/`

<!-- ANNOTATION
type: correction
text: "Location is now src/middleware/auth/"
-->

**Usage:** All protected routes

<!-- ANNOTATION
type: addition
text: "Research OAuth integration patterns"
-->
```

All will be processed in a single refinement round.

---

## Annotation Tracking

Refiner creates tracking documents:

**`research/annotations/round-N.md`:**
- Lists all annotations processed
- Documents investigation and resolution
- Provides audit trail

**`research/annotations/tracking.yaml`:**
- Counts annotations per round
- Tracks overall refinement status
- Records timestamps

---

## Common Patterns

### Question + Addition

```markdown
<!-- ANNOTATION
type: question
text: "Should this apply to API routes?"
-->

<!-- ANNOTATION
type: addition
text: "Research API route authentication patterns"
-->
```

### Challenge + Decision

```markdown
<!-- ANNOTATION
type: challenge
text: "Library has security issues"
-->

<!-- ANNOTATION
type: decision
text: "Switching to react-dropzone after security review"
-->
```

### Correction + Question

```markdown
<!-- ANNOTATION
type: correction
text: "File path is now src/middleware/auth.ts"
-->

<!-- ANNOTATION
type: question
text: "Does this affect the import statements in existing components?"
-->
```

---

## Troubleshooting

### Annotation Not Processed

**Problem:** Annotation still present after refinement

**Solutions:**
- Check syntax (must be valid HTML comment)
- Verify required fields (type, text)
- Ensure type is valid (question, correction, addition, challenge, decision)
- Check for typos in field names

### Refinement Didn't Answer Question

**Problem:** Question annotation processed but answer insufficient

**Solution:**
- Review `research/annotations/round-N.md` for investigation details
- Add new question annotation with more specific request
- Run refinement again

### Correction Not Applied Everywhere

**Problem:** Correction applied in one file but not others

**Solution:**
- Check `research/annotations/round-N.md` for what was updated
- Add additional correction annotations for missed locations
- Run refinement again

---

## Related Commands

- `/karimo-research --prd {slug}` — Initial research
- `/karimo-research --refine --prd {slug}` — Process annotations
- `/karimo-status --prd {slug}` — Check research status

---

## Example Session

### Initial Research

```bash
/karimo-research --prd user-profiles
```

Research completed, PRD enhanced.

### Review & Annotate

Edit `.karimo/prds/003_user-profiles/research/internal/patterns.md`:

```markdown
### Pattern: Form Validation

**Location:** `src/components/forms/`

<!-- ANNOTATION
type: question
text: "Are there examples of file upload forms we can reference?"
-->

**Pattern:** Zod schemas + BaseForm component

<!-- ANNOTATION
type: addition
text: "Research file upload validation patterns (size limits, file types)"
-->
```

### Refine

```bash
/karimo-research --refine --prd user-profiles
```

### Review Results

Check `.karimo/prds/003_user-profiles/research/annotations/round-1.md`:

```markdown
### 1. Question: File upload form examples

**Investigation:**
- Searched codebase for upload forms
- Found: src/components/ProfileImageUpload.tsx
- References BaseForm with custom file input

**Resolution:** Added file-upload-forms.md with examples

### 2. Addition: File upload validation

**Research:**
- Researched validation patterns
- Recommendations: size limits, MIME type checks, virus scanning
- Libraries: file-type, file-saver

**Resolution:** Added validation section to best-practices.md
```

PRD updated with refined findings. Briefs will inherit this context.

---

## Quick Reference

```html
<!-- Question -->
<!-- ANNOTATION
type: question
text: "Your question here?"
-->

<!-- Correction -->
<!-- ANNOTATION
type: correction
text: "The correct information"
-->

<!-- Addition -->
<!-- ANNOTATION
type: addition
text: "What to research additionally"
-->

<!-- Challenge -->
<!-- ANNOTATION
type: challenge
text: "Why this finding is incorrect and what to use instead"
-->

<!-- Decision -->
<!-- ANNOTATION
type: decision
text: "Architectural decision made and why"
-->
```

Run refinement: `/karimo-research --refine --prd {slug}`
