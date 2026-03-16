# /karimo-plan

**Type:** Command
**Invokes:** karimo-interviewer, karimo-investigator

## Purpose

Start a structured interview to create a Product Requirements Document (PRD) that can be executed by KARIMO agents.

## Key Arguments

- `--prd {slug}`: Use existing research folder from `/karimo-research`
- `--skip-research`: Allow planning without prior research (not recommended)
- `--resume {slug}`: Resume a draft PRD

## Workflow

1. Research validation (checks for existing research)
2. Configuration check (auto-detects if needed)
3. 4-round structured interview (Framing → Requirements → Dependencies → Retrospective)
4. PRD generation with tasks.yaml

---
*Full definition: `.claude/commands/karimo-plan.md` (873 lines)*
