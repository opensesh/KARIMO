# /karimo-update

**Type:** Command
**Invokes:** None (runs update.sh script)

## Purpose

Check for and apply KARIMO updates from GitHub releases.

## Key Arguments

- (default): Check for updates and install if available
- `--check`: Only check, don't install
- `--force`: Update even if on latest version

## Workflow

1. Check current version from `.karimo/VERSION`
2. Fetch latest release from GitHub (opensesh/KARIMO)
3. Compare versions using semver
4. Show what will be updated
5. Apply updates after user confirmation
6. Run config migrations if needed

---
*Full definition: `.claude/commands/karimo/karimo-update.md` (202 lines)*
