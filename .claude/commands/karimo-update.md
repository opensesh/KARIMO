# /karimo-update — Update Command

Check for and apply KARIMO updates from GitHub releases.

## Usage

```
/karimo-update              # Check for updates and install if available
/karimo-update --check      # Only check for updates, don't install
/karimo-update --force      # Update even if already on latest version
```

## Behavior

### Step 1: Run Update Script

Execute the update script:

```bash
bash .karimo/update.sh
```

**For check-only mode:**
```bash
bash .karimo/update.sh --check
```

**For force update:**
```bash
bash .karimo/update.sh --force
```

### Step 2: Interpret Results

The script will:

1. **Check current version** from `.karimo/VERSION`
2. **Fetch latest release** from GitHub (opensesh/KARIMO)
3. **Compare versions** using semver
4. **Show what will be updated** (if update available)
5. **Apply updates** after user confirmation

### Step 3: Post-Update

If updates were applied, suggest:

```
╭──────────────────────────────────────────────────────────────╮
│  Update Complete                                              │
╰──────────────────────────────────────────────────────────────╯

Updated to version: X.Y.Z

Recommended next steps:
  1. Run /karimo-doctor to verify the updated installation
  2. Review changelog at https://github.com/opensesh/KARIMO/releases
  3. Commit: git add -A && git commit -m "chore: update KARIMO to X.Y.Z"
```

---

## What Gets Updated

The update replaces these KARIMO-managed files:

| Category | Location | Files |
|----------|----------|-------|
| Commands | `.claude/commands/` | All karimo slash commands |
| Agents | `.claude/agents/` | All karimo agent definitions |
| Skills | `.claude/skills/` | All karimo skill definitions |
| Templates | `.karimo/templates/` | PRD, task, status templates |
| Rules | `.claude/KARIMO_RULES.md` | Agent behavior rules |
| Workflows | `.github/workflows/` | Only existing workflows (won't add new optional ones) |

---

## What Is Preserved

These files are **never modified** by updates:

| File | Reason |
|------|--------|
| `.karimo/config.yaml` | Your project configuration |
| `.karimo/learnings.md` | Your accumulated learnings |
| `.karimo/prds/*` | Your PRD files |
| `CLAUDE.md` | Your project instructions |

---

## Offline/Manual Updates

If GitHub is unreachable, the script provides manual instructions:

1. Download latest release from https://github.com/opensesh/KARIMO/releases
2. Extract the release
3. Run: `.karimo/update.sh --local <extracted-karimo> .`

---

## CI/Automated Updates

For automated pipelines:

```bash
bash .karimo/update.sh --ci
```

This runs non-interactively and auto-confirms the update.

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-doctor` | Verify installation health after update |
| `/karimo-configure` | Reconfigure after major updates |
| `/karimo-status` | Check current execution state |
