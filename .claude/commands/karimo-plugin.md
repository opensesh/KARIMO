# /karimo-plugin — Plugin Management Command

Manage KARIMO plugins: install, list, enable/disable, update, and uninstall.

## Usage

```bash
/karimo-plugin install <plugin>      # Install from GitHub or URL
/karimo-plugin list                  # List installed plugins
/karimo-plugin enable <name>         # Enable disabled plugin
/karimo-plugin disable <name>        # Disable plugin without uninstalling
/karimo-plugin update [name]         # Update plugin(s)
/karimo-plugin uninstall <name>      # Remove plugin
```

---

## Subcommands

### install

Install a plugin from a GitHub repository or URL.

**Syntax:**
```bash
/karimo-plugin install <source> [--version <tag>]
```

**Examples:**
```bash
# Install from GitHub org/repo
/karimo-plugin install greptile/karimo-plugin

# Install from full URL
/karimo-plugin install https://github.com/greptile/karimo-plugin

# Install specific version
/karimo-plugin install greptile/karimo-plugin --version v1.2.0
```

**Installation Flow:**

1. **Parse source:**
   ```bash
   source="$1"
   version="${3:-main}"  # Default to main branch

   # Detect source type
   if [[ "$source" =~ ^https?:// ]]; then
       # Full URL provided
       repo_url="$source"
       plugin_name=$(basename "$source")
   elif [[ "$source" =~ / ]]; then
       # GitHub org/repo format
       repo_url="https://github.com/$source"
       plugin_name=$(basename "$source")
   else
       # TODO: Short name lookup in plugin registry
       echo "Error: Short names not yet supported"
       echo "Use: org/repo or full URL"
       exit 1
   fi
   ```

2. **Fetch manifest:**
   ```bash
   manifest_url="https://raw.githubusercontent.com/$source/$version/karimo-plugin.yaml"

   echo "Fetching plugin manifest from: $manifest_url"

   manifest=$(curl -sSL "$manifest_url" 2>/dev/null)

   if [ -z "$manifest" ]; then
       echo "Error: Could not fetch karimo-plugin.yaml from repository"
       echo "Checked: $manifest_url"
       exit 1
   fi

   # Save manifest to temp file
   echo "$manifest" > /tmp/plugin-manifest.yaml
   ```

3. **Validate compatibility:**
   ```bash
   # Extract min/max KARIMO version from manifest
   min_version=$(grep "min_karimo_version:" /tmp/plugin-manifest.yaml | awk '{print $2}' | tr -d '"')
   max_version=$(grep "max_karimo_version:" /tmp/plugin-manifest.yaml | awk '{print $2}' | tr -d '"null')

   current_version=$(cat .karimo/VERSION)

   echo "Plugin requirements:"
   echo "  Min KARIMO: $min_version"
   echo "  Max KARIMO: ${max_version:-none}"
   echo "  Current:    $current_version"

   # Compare versions (simple string comparison, could use semver)
   if [ -n "$min_version" ] && [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" != "$min_version" ]; then
       echo "Error: This plugin requires KARIMO >= $min_version"
       echo "Your version: $current_version"
       echo "Update KARIMO first: /karimo-update"
       exit 1
   fi

   if [ -n "$max_version" ] && [ "$(printf '%s\n' "$current_version" "$max_version" | sort -V | head -n1)" != "$current_version" ]; then
       echo "Error: This plugin requires KARIMO <= $max_version"
       echo "Your version: $current_version"
       exit 1
   fi

   echo "✓ Compatibility check passed"
   ```

4. **Clone plugin:**
   ```bash
   plugin_dir=".karimo/plugins/$plugin_name"

   if [ -d "$plugin_dir" ]; then
       echo "Error: Plugin already installed: $plugin_name"
       echo "Use '/karimo-plugin update $plugin_name' to update"
       exit 1
   fi

   echo "Cloning plugin repository..."
   git clone --branch "$version" --depth 1 "$repo_url" "$plugin_dir" 2>&1 | grep -v "Cloning into"

   if [ ! -d "$plugin_dir" ]; then
       echo "Error: Failed to clone plugin repository"
       exit 1
   fi

   echo "✓ Plugin cloned to: $plugin_dir"
   ```

5. **Install plugin files:**
   ```bash
   cd "$plugin_dir"

   echo "Installing plugin components..."

   # Install agents
   if [ -d "agents" ]; then
       cp agents/*.md ../../.claude/agents/ 2>/dev/null && \
           echo "  ✓ Installed $(ls agents/*.md 2>/dev/null | wc -l) agent(s)"
   fi

   # Install commands
   if [ -d "commands" ]; then
       cp commands/*.md ../../.claude/commands/ 2>/dev/null && \
           echo "  ✓ Installed $(ls commands/*.md 2>/dev/null | wc -l) command(s)"
   fi

   # Install skills
   if [ -d "skills" ]; then
       cp skills/*.md ../../.claude/skills/ 2>/dev/null && \
           echo "  ✓ Installed $(ls skills/*.md 2>/dev/null | wc -l) skill(s)"
   fi

   # Install templates
   if [ -d "templates" ]; then
       cp templates/*.md ../../templates/ 2>/dev/null && \
           echo "  ✓ Installed $(ls templates/*.md 2>/dev/null | wc -l) template(s)"
   fi

   # Install workflows (if any)
   if [ -d "workflows" ]; then
       mkdir -p ../../../.github/workflows
       cp workflows/*.yml ../../../.github/workflows/ 2>/dev/null && \
           echo "  ✓ Installed $(ls workflows/*.yml 2>/dev/null | wc -l) workflow(s)"
   fi

   cd - > /dev/null
   ```

6. **Update config:**
   ```bash
   # Extract config fields from manifest
   echo "Applying configuration..."

   # TODO: Parse config_fields from manifest and update .karimo/config.yaml

   # For now, just note required env vars
   required_vars=$(grep -A 10 "env_vars:" /tmp/plugin-manifest.yaml | grep "name:" | awk '{print $3}' | tr -d '"')

   if [ -n "$required_vars" ]; then
       echo "  ⚠️  Required environment variables:"
       echo "$required_vars" | while read var; do
           echo "      - $var"
       done
   fi
   ```

7. **Add to plugins.yaml:**
   ```bash
   # Create plugins.yaml if doesn't exist
   if [ ! -f .karimo/plugins.yaml ]; then
       cat > .karimo/plugins.yaml << 'EOF'
   plugins: []
   EOF
   fi

   # Extract plugin metadata
   plugin_version=$(grep "^version:" "$plugin_dir/karimo-plugin.yaml" | awk '{print $2}' | tr -d '"')
   plugin_author=$(grep "^author:" "$plugin_dir/karimo-plugin.yaml" | awk '{print $2}' | tr -d '"')
   plugin_type=$(grep "^type:" "$plugin_dir/karimo-plugin.yaml" | awk '{print $2}' | tr -d '"' || echo "extension")

   # Append to plugins.yaml (simplified, not true YAML manipulation)
   # In production, use yq or python yaml library
   echo "  - name: \"$plugin_name\"" >> .karimo/plugins.yaml
   echo "    version: \"$plugin_version\"" >> .karimo/plugins.yaml
   echo "    author: \"$plugin_author\"" >> .karimo/plugins.yaml
   echo "    source: \"$repo_url\"" >> .karimo/plugins.yaml
   echo "    type: \"${plugin_type:-extension}\"" >> .karimo/plugins.yaml
   echo "    enabled: true" >> .karimo/plugins.yaml
   echo "    installed_at: \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"" >> .karimo/plugins.yaml

   echo "✓ Plugin registered in .karimo/plugins.yaml"
   ```

8. **Run post-install hook:**
   ```bash
   post_install_hook=$(grep "post_install:" "$plugin_dir/karimo-plugin.yaml" | awk '{print $2}' | tr -d '"')

   if [ -n "$post_install_hook" ] && [ -f "$plugin_dir/$post_install_hook" ]; then
       echo "Running post-install hook..."
       bash "$plugin_dir/$post_install_hook"
       echo "✓ Post-install hook completed"
   fi
   ```

9. **Summary:**
   ```bash
   echo
   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
   echo "✓ Plugin Installed: $plugin_name"
   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
   echo "Version: $plugin_version"
   echo "Author:  $plugin_author"
   echo
   echo "Next steps:"
   echo "  1. Set required environment variables (see above)"
   echo "  2. Restart Claude Code to load new components"
   echo "  3. Check plugin status: /karimo-plugin list"
   ```

---

### list

List all installed plugins with their status.

**Syntax:**
```bash
/karimo-plugin list
```

**Implementation:**

```bash
if [ ! -f .karimo/plugins.yaml ]; then
    echo "No plugins installed"
    exit 0
fi

echo "Installed KARIMO Plugins"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Parse plugins.yaml and display each plugin
# Simplified version (in production, use proper YAML parser)

grep -A 7 "  - name:" .karimo/plugins.yaml | while read -r line; do
    if [[ "$line" =~ name:\ \"(.*)\" ]]; then
        name="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ version:\ \"(.*)\" ]]; then
        version="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ author:\ \"(.*)\" ]]; then
        author="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ type:\ \"(.*)\" ]]; then
        type="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ enabled:\ (.*) ]]; then
        enabled="${BASH_REMATCH[1]}"

        # Display plugin info
        status_icon="✓"
        if [ "$enabled" = "false" ]; then
            status_icon="✗"
        fi

        echo "$status_icon $name (v$version)"
        echo "  Author: $author"
        echo "  Type: $type"
        echo "  Status: $([ "$enabled" = "true" ] && echo "Enabled" || echo "Disabled")"

        # Show what plugin provides
        plugin_dir=".karimo/plugins/$name"
        if [ -d "$plugin_dir" ]; then
            agents_count=$(ls "$plugin_dir/agents/"*.md 2>/dev/null | wc -l)
            commands_count=$(ls "$plugin_dir/commands/"*.md 2>/dev/null | wc -l)
            skills_count=$(ls "$plugin_dir/skills/"*.md 2>/dev/null | wc -l)

            provides=()
            [ "$agents_count" -gt 0 ] && provides+=("$agents_count agent(s)")
            [ "$commands_count" -gt 0 ] && provides+=("$commands_count command(s)")
            [ "$skills_count" -gt 0 ] && provides+=("$skills_count skill(s)")

            if [ ${#provides[@]} -gt 0 ]; then
                echo "  Provides: $(IFS=", "; echo "${provides[*]}")"
            fi
        fi
        echo
    fi
done
```

---

### enable / disable

Enable or disable a plugin without uninstalling it.

**Syntax:**
```bash
/karimo-plugin enable <name>
/karimo-plugin disable <name>
```

**Implementation (enable):**

```bash
plugin_name="$1"

if [ -z "$plugin_name" ]; then
    echo "Error: Plugin name required"
    echo "Usage: /karimo-plugin enable <name>"
    exit 1
fi

# Update enabled status in plugins.yaml
# Simplified (in production, use proper YAML manipulation)
sed -i.tmp "/name: \"$plugin_name\"/,/enabled:/ s/enabled: false/enabled: true/" .karimo/plugins.yaml
rm -f .karimo/plugins.yaml.tmp

echo "✓ Plugin enabled: $plugin_name"
echo "Restart Claude Code to apply changes"
```

**Implementation (disable):**

```bash
plugin_name="$1"

if [ -z "$plugin_name" ]; then
    echo "Error: Plugin name required"
    echo "Usage: /karimo-plugin disable <name>"
    exit 1
fi

# Update enabled status
sed -i.tmp "/name: \"$plugin_name\"/,/enabled:/ s/enabled: true/enabled: false/" .karimo/plugins.yaml
rm -f .karimo/plugins.yaml.tmp

echo "✓ Plugin disabled: $plugin_name"
echo "Restart Claude Code to apply changes"
```

---

### update

Update one or all installed plugins.

**Syntax:**
```bash
/karimo-plugin update              # Update all plugins
/karimo-plugin update <name>       # Update specific plugin
```

**Implementation:**

```bash
plugin_name="${1:-}"

if [ -z "$plugin_name" ]; then
    # Update all plugins
    echo "Updating all plugins..."

    grep "  - name:" .karimo/plugins.yaml | awk '{print $3}' | tr -d '"' | while read name; do
        echo
        echo "Updating: $name"
        # Run update for this plugin (recursive call)
        /karimo-plugin update "$name"
    done

    exit 0
fi

# Update specific plugin
plugin_dir=".karimo/plugins/$plugin_name"

if [ ! -d "$plugin_dir" ]; then
    echo "Error: Plugin not installed: $plugin_name"
    exit 1
fi

cd "$plugin_dir"

echo "Checking for updates to: $plugin_name"

# Fetch latest from git
git fetch origin 2>&1 | grep -v "From"

# Check if updates available
if git status -uno | grep -q "Your branch is behind"; then
    echo "Updates available"

    # Pull latest
    git pull origin 2>&1 | grep -v "From"

    # Re-install files
    echo "Re-installing plugin components..."

    # Same installation logic as install command
    # (Copy agents, commands, skills, templates, workflows)

    echo "✓ Plugin updated: $plugin_name"
    echo "Restart Claude Code to apply changes"
else
    echo "Plugin is up to date"
fi

cd - > /dev/null
```

---

### uninstall

Remove a plugin completely.

**Syntax:**
```bash
/karimo-plugin uninstall <name>
```

**Implementation:**

```bash
plugin_name="$1"

if [ -z "$plugin_name" ]; then
    echo "Error: Plugin name required"
    echo "Usage: /karimo-plugin uninstall <name>"
    exit 1
fi

plugin_dir=".karimo/plugins/$plugin_name"

if [ ! -d "$plugin_dir" ]; then
    echo "Error: Plugin not installed: $plugin_name"
    exit 1
fi

echo "Uninstalling plugin: $plugin_name"

# Run pre-uninstall hook
pre_uninstall_hook=$(grep "pre_uninstall:" "$plugin_dir/karimo-plugin.yaml" | awk '{print $2}' | tr -d '"')

if [ -n "$pre_uninstall_hook" ] && [ -f "$plugin_dir/$pre_uninstall_hook" ]; then
    echo "Running pre-uninstall hook..."
    bash "$plugin_dir/$pre_uninstall_hook"
fi

# Remove plugin files from .claude/ and .karimo/
echo "Removing plugin components..."

# Remove agents
if [ -d "$plugin_dir/agents" ]; then
    for agent in "$plugin_dir/agents/"*.md; do
        agent_name=$(basename "$agent")
        rm -f ".claude/agents/$agent_name"
        echo "  - Removed agent: $agent_name"
    done
fi

# Remove commands
if [ -d "$plugin_dir/commands" ]; then
    for command in "$plugin_dir/commands/"*.md; do
        command_name=$(basename "$command")
        rm -f ".claude/commands/$command_name"
        echo "  - Removed command: $command_name"
    done
fi

# Remove skills
if [ -d "$plugin_dir/skills" ]; then
    for skill in "$plugin_dir/skills/"*.md; do
        skill_name=$(basename "$skill")
        rm -f ".claude/skills/$skill_name"
        echo "  - Removed skill: $skill_name"
    done
fi

# Remove templates
if [ -d "$plugin_dir/templates" ]; then
    for template in "$plugin_dir/templates/"*.md; do
        template_name=$(basename "$template")
        rm -f ".karimo/templates/$template_name"
        echo "  - Removed template: $template_name"
    done
fi

# Remove plugin directory
rm -rf "$plugin_dir"
echo "  - Removed plugin directory"

# Remove from plugins.yaml
# Simplified (in production, use proper YAML manipulation)
# This removes the plugin entry and its following 7 lines (metadata)
sed -i.tmp "/name: \"$plugin_name\"/,+7d" .karimo/plugins.yaml
rm -f .karimo/plugins.yaml.tmp

echo
echo "✓ Plugin uninstalled: $plugin_name"
echo "Restart Claude Code to apply changes"
```

---

## Error Handling

### Plugin Not Found

```
Error: Could not fetch karimo-plugin.yaml from repository

Possible causes:
  1. Repository doesn't exist
  2. No karimo-plugin.yaml in repository root
  3. Network connection issue

How to fix:
  • Verify repository URL
  • Check repository has karimo-plugin.yaml
  • Try again with full URL
```

### Incompatible Version

```
Error: This plugin requires KARIMO >= 6.0.0
Your version: 5.5.1

How to fix:
  • Update KARIMO first: /karimo-update
  • Or install older version of plugin: --version v1.0.0
```

### Plugin Already Installed

```
Error: Plugin already installed: greptile-integration

How to fix:
  • Update instead: /karimo-plugin update greptile-integration
  • Or uninstall first: /karimo-plugin uninstall greptile-integration
```

---

## Examples

### Install Greptile Integration

```bash
/karimo-plugin install greptile/karimo-plugin
```

Output:
```
Fetching plugin manifest from: https://raw.githubusercontent.com/greptile/karimo-plugin/main/karimo-plugin.yaml
Plugin requirements:
  Min KARIMO: 5.5.0
  Max KARIMO: none
  Current:    6.0.0
✓ Compatibility check passed
Cloning plugin repository...
✓ Plugin cloned to: .karimo/plugins/karimo-plugin
Installing plugin components...
  ✓ Installed 1 agent(s)
  ✓ Installed 0 command(s)
  ✓ Installed 0 skill(s)
Applying configuration...
  ⚠️  Required environment variables:
      - GREPTILE_API_KEY
✓ Plugin registered in .karimo/plugins.yaml
Running post-install hook...
✓ Post-install hook completed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Plugin Installed: karimo-plugin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version: 1.0.0
Author:  Greptile

Next steps:
  1. Set required environment variables (see above)
  2. Restart Claude Code to load new components
  3. Check plugin status: /karimo-plugin list
```

### List Installed Plugins

```bash
/karimo-plugin list
```

Output:
```
Installed KARIMO Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ greptile-integration (v1.0.0)
  Author: Greptile
  Type: review-provider
  Status: Enabled
  Provides: 1 agent(s)

✓ mobile-dev (v2.1.0)
  Author: KARIMO Community
  Type: agent-extension
  Status: Enabled
  Provides: 2 agent(s), 1 skill(s)
```

---

## Related Documentation

- [PLUGIN_DEVELOPMENT.md](../.karimo/docs/PLUGIN_DEVELOPMENT.md) — Plugin development guide
- [ARCHITECTURE.md](../.karimo/docs/ARCHITECTURE.md) — KARIMO component structure
- [COMMANDS.md](../.karimo/docs/COMMANDS.md) — All slash commands

---

*Plugin system added in KARIMO v6.0*
