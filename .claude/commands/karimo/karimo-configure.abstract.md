# /karimo-configure

**Type:** Command
**Invokes:** karimo-investigator

## Purpose

Create or update KARIMO configuration in `.karimo/config.yaml`. Auto-detects project settings.

## Key Arguments

- (default): Basic mode (~5 min, 3 questions)
- `--advanced`: Full control (~15 min, 9+ questions)
- `--auto`: Zero prompts, accepts defaults
- `--preview`: Preview config without saving
- `--validate`: Validate existing config
- `--greptile`: Install Greptile workflow only
- `--review`: Choose between review providers
- `--cd`: Configure CD provider for KARIMO branches

## Configuration Scope

- Runtime and framework detection
- Build/lint/test commands
- Boundary files (never_touch, require_review)
- GitHub repository settings

---
*Full definition: `.claude/commands/karimo/karimo-configure.md` (1799 lines)*
