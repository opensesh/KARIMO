# KARIMO Config Migrations

This directory contains migration scripts for upgrading KARIMO configuration files between versions. Migrations run automatically during `/karimo-update` when your config version differs from the latest KARIMO version.

---

## Overview

**Purpose:** Ensure config.yaml stays compatible with the latest KARIMO features and schema changes.

**When They Run:** Automatically during `/karimo-update` if your `config_version` is older than the latest KARIMO version.

**Safety:** Migrations create backups before making changes. Original config saved to `.karimo/config.yaml.backup-{timestamp}`.

---

## How It Works

### 1. Version Detection

When you run `/karimo-update`, KARIMO compares:
- **Your config version** — `config_version` field in `.karimo/config.yaml`
- **Latest KARIMO version** — Version from updated KARIMO release

If your config is outdated, `/karimo-update` runs the necessary migrations to bring it up to date.

### 2. Migration Chain

Migrations run sequentially:

```
Config v1.0 → v1-to-v2.sh → Config v2.0 → v2-to-v3.sh → Config v3.0
```

Example:
- Your config: `config_version: "1.0"`
- Latest KARIMO: `2.5`
- Migrations run: `v1-to-v2.sh`, then `v2-to-v2.5.sh`

### 3. Backup Strategy

Before any migration runs:
```bash
cp .karimo/config.yaml .karimo/config.yaml.backup-$(date +%Y%m%d-%H%M%S)
```

Backups are never deleted automatically. You can restore manually if needed.

---

## Migration Script Format

Each migration is a bash script that:
1. Receives the config file path as an argument
2. Makes schema changes
3. Updates the `config_version` field
4. Exits with code 0 on success, 1 on failure

**Naming Convention:** `v{old}-to-v{new}.sh`

**Example:** `v1-to-v2.sh` migrates from version 1.0 to 2.0.

---

## Creating a Migration

### Step 1: Identify Changes

What changed between versions?

**Example (v1 → v2):**
- Added: `review.enabled` and `review.provider` fields
- Removed: `greptile.enabled` (merged into `review`)
- Changed: `execution.max_agents` renamed to `execution.max_parallel_tasks`

### Step 2: Write Migration Script

Create `v1-to-v2.sh`:

```bash
#!/bin/bash
# Migration: v1.0 → v2.0
# Changes:
#   - Add review.enabled and review.provider fields
#   - Remove greptile.enabled field
#   - Rename execution.max_agents to execution.max_parallel_tasks

set -e
set -o pipefail

CONFIG_FILE="$1"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "Migrating config from v1.0 to v2.0..."

# Create backup
BACKUP_FILE="${CONFIG_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

# Temporary file for changes
TMP_FILE=$(mktemp)

# Step 1: Add review section if greptile.enabled exists
if grep -q "greptile:" "$CONFIG_FILE"; then
    # Extract greptile.enabled value
    greptile_enabled=$(grep "greptile:" -A 5 "$CONFIG_FILE" | grep "enabled:" | awk '{print $2}')

    # Add review section
    awk '
    /^greptile:/ {
        print "review:"
        print "  enabled: '"$greptile_enabled"'"
        if ('"$greptile_enabled"' == "true") {
            print "  provider: \"greptile\""
        } else {
            print "  provider: null"
        }
        print ""
        # Skip original greptile section
        skip = 1
        next
    }
    skip && /^[a-z]/ { skip = 0 }
    !skip { print }
    ' "$CONFIG_FILE" > "$TMP_FILE"

    mv "$TMP_FILE" "$CONFIG_FILE"
fi

# Step 2: Rename execution.max_agents to execution.max_parallel_tasks
sed -i.tmp 's/max_agents:/max_parallel_tasks:/' "$CONFIG_FILE"
rm -f "${CONFIG_FILE}.tmp"

# Step 3: Update config_version to 2.0
sed -i.tmp 's/config_version: "1\.0"/config_version: "2.0"/' "$CONFIG_FILE"
rm -f "${CONFIG_FILE}.tmp"

echo "Migration complete: v1.0 → v2.0"
exit 0
```

### Step 3: Make Executable

```bash
chmod +x .karimo/migrations/v1-to-v2.sh
```

### Step 4: Test Migration

```bash
# Create test config
cat > test-config.yaml << EOF
config_version: "1.0"

greptile:
  enabled: true
  api_key: "test-key"

execution:
  max_agents: 3
EOF

# Run migration
./.karimo/migrations/v1-to-v2.sh test-config.yaml

# Verify result
cat test-config.yaml
# Should show:
#   config_version: "2.0"
#   review:
#     enabled: true
#     provider: "greptile"
#   execution:
#     max_parallel_tasks: 3
```

---

## Migration Best Practices

### 1. Preserve User Data

Never delete user-configured values without migrating them:

```bash
# Bad: Deletes user's API key
sed -i '/greptile:/,/api_key:/d' config.yaml

# Good: Migrates to new location
old_key=$(grep "api_key:" config.yaml | awk '{print $2}')
sed -i "s/review_provider_key: null/review_provider_key: $old_key/" config.yaml
```

### 2. Handle Optional Fields

Not all configs have all fields:

```bash
# Check if field exists before migrating
if grep -q "greptile:" "$CONFIG_FILE"; then
    # Migration logic
fi
```

### 3. Use Safe sed Patterns

Always backup with `-i.tmp` and test regex:

```bash
# Safe: Creates backup, deletes after success
sed -i.tmp 's/old/new/' config.yaml
rm -f config.yaml.tmp

# Unsafe: No backup
sed -i 's/old/new/' config.yaml
```

### 4. Validate After Migration

```bash
# Check config is valid YAML
if ! python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
    echo "Error: Migration produced invalid YAML"
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    exit 1
fi
```

### 5. Document Changes

Include comment header in migration script:

```bash
#!/bin/bash
# Migration: v2.0 → v2.5
# Date: 2026-03-15
# Changes:
#   - Add hooks.enabled field (default: false)
#   - Add cost_controls.max_cost_per_task field
#   - Deprecate execution.auto_merge (now ignored, always false)
#
# Breaking Changes: None
# Rollback: Restore from backup if needed
```

---

## Testing Migrations

### Unit Testing

Test each migration independently:

```bash
# Create fixture with v1 config
cat > fixtures/config-v1.yaml << EOF
config_version: "1.0"
# ... old schema ...
EOF

# Run migration
./.karimo/migrations/v1-to-v2.sh fixtures/config-v1.yaml

# Assert expected changes
if grep -q 'config_version: "2.0"' fixtures/config-v1.yaml; then
    echo "✓ Version updated"
else
    echo "✗ Version update failed"
    exit 1
fi
```

### Integration Testing

Test full migration chain:

```bash
# Start with v1 config
cp fixtures/config-v1.yaml test-config.yaml

# Run all migrations in sequence
for migration in .karimo/migrations/v*.sh; do
    echo "Running: $migration"
    $migration test-config.yaml || {
        echo "Migration failed: $migration"
        exit 1
    }
done

# Verify final version matches latest
final_version=$(grep "config_version:" test-config.yaml | awk '{print $2}' | tr -d '"')
expected_version="3.0"  # Latest KARIMO version

if [ "$final_version" = "$expected_version" ]; then
    echo "✓ Migration chain complete"
else
    echo "✗ Expected v$expected_version, got v$final_version"
    exit 1
fi
```

---

## Troubleshooting

### Migration Failed

**Symptoms:**
- `/karimo-update` reports "Migration failed"
- Config file corrupt or missing fields

**Fix:**
1. Restore from backup:
   ```bash
   ls -lt .karimo/config.yaml.backup-* | head -1
   # Copy path from output
   cp .karimo/config.yaml.backup-TIMESTAMP .karimo/config.yaml
   ```

2. Report issue with:
   - Your original `config_version`
   - Target KARIMO version
   - Migration script that failed
   - Error message from `/karimo-update`

### Backup Not Created

**Symptoms:**
- No `.karimo/config.yaml.backup-*` files

**Cause:**
- Migration script didn't create backup
- Permissions issue

**Fix:**
1. Manually backup before updating:
   ```bash
   cp .karimo/config.yaml .karimo/config.yaml.manual-backup
   ```

2. Check file permissions:
   ```bash
   ls -la .karimo/
   # config.yaml should be writable
   ```

### Invalid YAML After Migration

**Symptoms:**
- KARIMO commands fail with YAML parse errors
- `/karimo-status` shows "Config invalid"

**Fix:**
1. Restore from backup:
   ```bash
   cp .karimo/config.yaml.backup-TIMESTAMP .karimo/config.yaml
   ```

2. Validate YAML manually:
   ```bash
   python3 -c "import yaml; print(yaml.safe_load(open('.karimo/config.yaml')))"
   ```

3. Report issue to KARIMO maintainers

---

## Version History

### Config Schema Versions

| Version | KARIMO Release | Key Changes |
|---------|----------------|-------------|
| **1.0** | v1.0 - v4.9 | Initial schema |
| **2.0** | v5.0 - v5.5 | Added `review` section, renamed `max_agents` → `max_parallel_tasks` |
| **2.5** | v5.6 | Added `research.enabled` field |
| **3.0** | v6.0 | Added `config_version` field, `hooks.enabled`, plugin support |

### Migration Scripts

| Script | From | To | Status |
|--------|------|-----|--------|
| `v1-to-v2.example.sh` | 1.0 | 2.0 | Example only |
| `v2-to-v2.5.sh` | 2.0 | 2.5 | Planned |
| `v2.5-to-v3.sh` | 2.5 | 3.0 | Planned |

---

## Manual Migration

If automatic migration fails, you can migrate manually:

### 1. Check Current Version

```bash
grep "config_version:" .karimo/config.yaml
```

### 2. Compare Schemas

View latest schema:
```bash
cat KARIMO/.karimo/templates/CONFIG_SCHEMA.md  # If exists
# Or check /karimo-configure output
```

### 3. Add Missing Fields

```yaml
# Example: Adding review section (v1 → v2)

# Before (v1.0):
config_version: "1.0"
greptile:
  enabled: true

# After (v2.0):
config_version: "2.0"
review:
  enabled: true
  provider: "greptile"
```

### 4. Update Version

```yaml
config_version: "2.0"  # Update to latest
```

### 5. Validate

```bash
/karimo-doctor  # Check config health
```

---

## Related Documentation

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Config file role in KARIMO
- [COMMANDS.md](../docs/COMMANDS.md) — `/karimo-update` command reference
- [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) — Config issues

---

*Migrations system added in KARIMO v6.0*
