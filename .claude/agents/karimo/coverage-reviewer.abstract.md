# karimo-coverage-reviewer

**Type:** Agent
**Model:** sonnet
**Trigger:** /karimo-merge when coverage reports exist

## Purpose

Analyzes coverage reports and adds explanatory PR comments. Cross-references gaps with task briefs to distinguish intentional vs unexpected uncovered lines.

## Key Capabilities

- Multi-format coverage parsing (istanbul, lcov, cobertura, Python)
- Task brief cross-referencing for intentional gaps
- Coverage gap categorization (expected, needs attention)
- Automated PR comment generation with explanations

## Tools

Read, Grep, Glob

---
*Full definition: `.claude/agents/karimo/coverage-reviewer.md` (240 lines)*
