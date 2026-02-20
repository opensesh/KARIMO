# Findings Log

**PRD:** {feature_name}
**Slug:** {prd_slug}
**Maintained by:** PM Agent (not worker agents)

---

## About This File

This file is the cross-task communication channel. When a worker agent completes a task, the PM agent reviews the diff and extracts any discoveries, decisions, or artifacts that downstream tasks need to know about. Worker agents never write to this file directly — the PM agent is the sole author.

Task briefs for downstream tasks include the relevant findings from this file, so worker agents receive the information they need without having to read this file themselves.

### What Gets Recorded

- **New types, interfaces, or APIs** created that other tasks will consume
- **Patterns established** (e.g., "used X library for form validation across all forms")
- **Gotchas encountered** (e.g., "this API returns paginated results, needs cursor handling")
- **Files created or moved** that weren't in the original `files_affected` list
- **Architecture decisions** made under ambiguity (e.g., "chose server components over client for this page")
- **Deviation from PRD** with rationale (e.g., "split component differently than planned because...")

### What Does NOT Get Recorded

- Routine implementation details (normal code patterns)
- Build/lint fixes (these are expected)
- Anything already documented in `agent_context` for the task

---

## Findings

_Entries are appended by the PM agent after each task completes._

<!--
TEMPLATE FOR EACH ENTRY (PM agent copies this):

## [{task_id}] {task_title}
**Completed:** {ISO timestamp}
**Relevant to:** {comma-separated task IDs from depends_on graph}

### What was created or discovered
{1-2 sentences: the finding}

### Details
{Specific information — file paths, interface signatures, API shapes, pattern descriptions}

### What downstream tasks need to know
{Direct guidance: "Task 2a should import UserProfile from src/components/user/UserProfile.tsx" or "Task 3a needs to handle the new pagination cursor returned by the API"}

---
-->

_No findings yet. This file will be populated as tasks complete._
