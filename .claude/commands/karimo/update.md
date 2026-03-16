# /karimo:update — Update Command

Check for and apply KARIMO updates from GitHub releases.

## Usage

```
/karimo:update              # Check for updates and install if available
/karimo:update --check      # Only check for updates, don't install
/karimo:update --force      # Update even if already on latest version
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

### Step 3: Check Config Version & Run Migrations

After update script completes successfully, check if config migration is needed:

```bash
# Get current config version
if [ -f .karimo/config.yaml ]; then
    config_version=$(grep -E "^config_version:" .karimo/config.yaml | sed 's/.*"\(.*\)".*/\1/' || echo "unknown")
else
    echo "Warning: No config.yaml found, skipping migrations"
    config_version="unknown"
fi

# Get latest KARIMO version (should match updated VERSION file)
karimo_version=$(cat .karimo/VERSION)

echo "Config version: $config_version"
echo "KARIMO version: $karimo_version"

# Determine if migration needed
if [ "$config_version" != "unknown" ] && [ "$config_version" != "$karimo_version" ]; then
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Config Migration Required"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Your config: v$config_version"
    echo "Latest KARIMO: v$karimo_version"
    echo

    # Check for migration scripts
    migration_count=0
    for script in .karimo/migrations/v*.sh; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            # Extract version numbers from script name (e.g., v1-to-v2.sh)
            script_name=$(basename "$script")
            if [[ "$script_name" =~ v([0-9.]+)-to-v([0-9.]+) ]]; then
                from_ver="${BASH_REMATCH[1]}"
                to_ver="${BASH_REMATCH[2]}"

                # Check if this migration applies to current config
                if [ "$config_version" = "$from_ver" ]; then
                    echo "Running migration: $script_name"
                    echo "  From: v$from_ver"
                    echo "  To:   v$to_ver"
                    echo

                    # Run migration
                    if bash "$script" .karimo/config.yaml; then
                        echo "✓ Migration succeeded: v$from_ver → v$to_ver"
                        echo
                        config_version="$to_ver"  # Update for next migration
                        migration_count=$((migration_count + 1))
                    else
                        echo "✗ Migration failed: $script_name"
                        echo
                        echo "Error: Config migration failed. Please review the error above."
                        echo "Your config has been backed up to: .karimo/config.yaml.backup-*"
                        echo
                        exit 1
                    fi
                fi
            fi
        fi
    done

    if [ $migration_count -eq 0 ]; then
        echo "No migrations found for v$config_version → v$karimo_version"
        echo
        echo "Manual migration may be required. See:"
        echo "  .karimo/migrations/README.md"
        echo
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✓ Applied $migration_count migration(s)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo
    fi
elif [ "$config_version" = "$karimo_version" ]; then
    echo "Config is up to date (v$config_version)"
fi
```

### Step 4: Post-Update Summary

After migrations (if any), show completion summary:

```
╭──────────────────────────────────────────────────────────────╮
│  Update Complete                                              │
╰──────────────────────────────────────────────────────────────╯

Updated to version: X.Y.Z
Config migrated: vA.B → vX.Y (if applicable)

Recommended next steps:
  1. Run /karimo:doctor to verify the updated installation
  2. Review changelog at https://github.com/opensesh/KARIMO/releases
  3. Check migration backups: ls .karimo/config.yaml.backup-*
  4. Commit: git add -A && git commit -m "chore: update KARIMO to X.Y.Z"
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
| `.karimo/learnings/` | Your accumulated learnings (categorized) |
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
| `/karimo:doctor` | Verify installation health after update |
| `/karimo:configure` | Reconfigure after major updates |
| `/karimo:dashboard` | Check current execution state |
