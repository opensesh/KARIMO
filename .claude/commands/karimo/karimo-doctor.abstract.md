# /karimo-doctor

**Type:** Command
**Invokes:** None (read-only diagnostics)

## Purpose

Check the health of a KARIMO installation, identify issues, and provide actionable recommendations.

## Key Arguments

- (default): Full diagnostic with recommendations
- `--test`: Quick pass/fail verification (smoke test)

## Diagnostic Categories

1. **File Presence**: Verify files per MANIFEST.json
2. **Template Parsing**: Valid markdown structure
3. **GitHub CLI Auth**: gh authentication status
4. **State File Integrity**: Valid JSON in state files
5. **CLAUDE.md Integration**: Config section present
6. **PRD Health**: Active PRD status validation
7. **Worktree Status**: Git worktree integrity
8. **Asset Integrity**: Manifest vs disk verification

---
*Full definition: `.claude/commands/karimo/karimo-doctor.md` (1309 lines)*
