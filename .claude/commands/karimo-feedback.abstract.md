# /karimo-feedback

**Type:** Command
**Invokes:** karimo-interviewer, karimo-feedback-auditor

## Purpose

Intelligent feedback capture with automatic complexity detection. Handles both simple rule creation and complex issue investigation.

## Key Arguments

- (default): Interactive mode with auto-detection
- `--from-metrics {prd-slug}`: Batch mode from execution metrics
- `--undo`: Remove recent learnings

## Paths

- **Simple (70%)**: 0-3 questions → Generate rule → Write to learnings/
- **Complex (30%)**: Adaptive interview → Spawn auditor → Create feedback document

## Output

- Simple: Rule added to `.karimo/learnings/{category}/`
- Complex: Feedback document in `.karimo/feedback/{slug}.md`

---
*Full definition: `.claude/commands/karimo-feedback.md` (538 lines)*
