# KARIMO Plugin Development Guide

**Version:** 7.15.0
**Status:** Deferred

---

> **Note:** Plugin development is currently deferred. The `/karimo-plugin` command is not available in this version. This documentation is preserved for future reference when the plugin ecosystem is implemented.

---

## Overview

KARIMO plugins extend KARIMO's capabilities by adding custom agents, commands, skills, or review providers. Plugins are distributed as Git repositories and installed via `/karimo-plugin install`.

**Use Cases:**
- Custom review providers (e.g., Greptile alternatives)
- Domain-specific agents (e.g., mobile development, data science)
- Workflow integrations (e.g., Linear, Notion, custom tools)
- Custom skills for task agents

---

## Plugin Manifest

Every plugin must include a `karimo-plugin.yaml` manifest at the repository root:

```yaml
# karimo-plugin.yaml
name: "greptile-integration"
version: "1.0.0"
author: "Greptile"
description: "Official Greptile review integration for KARIMO"
repository: "https://github.com/greptile/karimo-plugin"
license: "MIT"

# KARIMO compatibility
requires:
  min_karimo_version: "5.5.0"
  max_karimo_version: null  # null = no upper bound

# What this plugin provides
provides:
  agents: ["greptile-reviewer.md"]
  commands: []
  skills: []
  templates: []

# Configuration requirements
config:
  env_vars:
    - name: "GREPTILE_API_KEY"
      description: "Greptile API key from greptile.app"
      required: true
    - name: "GREPTILE_GITHUB_TOKEN"
      description: "GitHub token with repo scope"
      required: false

  # Fields to add to .karimo/config.yaml
  config_fields:
    - path: "review.provider"
      value: "greptile"
      description: "Set Greptile as review provider"
    - path: "review.greptile_enabled"
      value: true
      description: "Enable Greptile integration"

# Installation hooks (optional)
hooks:
  post_install: "scripts/setup-greptile.sh"
  post_update: "scripts/update-greptile.sh"
  pre_uninstall: "scripts/cleanup-greptile.sh"
```

---

## Plugin Types

### 1. Review Provider Plugins

Integrate alternative code review services.

**Example:** Greptile plugin

**Provides:**
- Custom reviewer agent
- GitHub workflow for PR review
- Review configuration templates

**Implementation:**
```
greptile-plugin/
├── karimo-plugin.yaml
├── agents/
│   └── greptile-reviewer.md     # Custom review agent
├── workflows/
│   └── greptile-review.yml       # GitHub Actions workflow
└── scripts/
    └── setup-greptile.sh         # Post-install configuration
```

**greptile-reviewer.md:**
```markdown
---
name: greptile-reviewer
description: Coordinates Greptile code review for KARIMO PRs
model: sonnet
tools: Read, Bash, Grep
---

# Greptile Reviewer Agent

Monitors Greptile review status for KARIMO task PRs and handles revision loops.

## Behavior

1. Check Greptile review score on PR
2. If score < 3, extract feedback and trigger revision
3. Monitor for re-review after fixes
4. Update PR labels based on Greptile status

...
```

---

### 2. Domain-Specific Agent Plugins

Add specialized agents for specific technologies.

**Example:** Mobile development plugin

**Provides:**
- React Native implementer agent
- iOS/Android-specific testing agent
- Mobile app documentation agent

**Implementation:**
```
mobile-dev-plugin/
├── karimo-plugin.yaml
├── agents/
│   ├── karimo-mobile-implementer.md
│   ├── karimo-mobile-tester.md
│   └── karimo-mobile-documenter.md
├── skills/
│   └── karimo-mobile-standards.md
└── templates/
    └── MOBILE_TASK_BRIEF.md
```

---

### 3. Workflow Integration Plugins

Connect KARIMO to external tools.

**Example:** Linear plugin

**Provides:**
- Linear ticket creation on PRD approval
- Linear status sync with task status
- Linear comment updates on PR events

**Implementation:**
```
linear-plugin/
├── karimo-plugin.yaml
├── hooks/
│   ├── pre-task.sh    # Create Linear ticket
│   ├── post-task.sh   # Update ticket status
│   └── on-failure.sh  # Add failure comment
└── scripts/
    └── linear-auth.sh  # OAuth setup
```

---

### 4. Custom Skill Plugins

Extend task agent capabilities.

**Example:** Security scanning plugin

**Provides:**
- Security validation skill
- Dependency vulnerability checks
- OWASP compliance validation

**Implementation:**
```
security-plugin/
├── karimo-plugin.yaml
├── skills/
│   └── karimo-security-standards.md
└── templates/
    └── SECURITY_CHECKLIST.md
```

---

## Installation Flow

When user runs `/karimo-plugin install <plugin-name>`:

1. **Fetch manifest from repository:**
   ```bash
   curl -sL https://raw.githubusercontent.com/{org}/{repo}/main/karimo-plugin.yaml
   ```

2. **Validate compatibility:**
   - Check `min_karimo_version` ≤ current KARIMO version
   - Check `max_karimo_version` ≥ current KARIMO version (if set)

3. **Clone plugin:**
   ```bash
   git clone {repository} .karimo/plugins/{name}
   ```

4. **Install files:**
   - Copy agents → `.claude/agents/`
   - Copy commands → `.claude/commands/`
   - Copy skills → `.claude/skills/`
   - Copy templates → `.karimo/templates/`

5. **Update config:**
   - Add plugin entry to `.karimo/plugins.yaml`
   - Apply `config_fields` to `.karimo/config.yaml`

6. **Run post-install hook:**
   ```bash
   bash .karimo/plugins/{name}/scripts/setup.sh
   ```

7. **Verify installation:**
   - Check all files copied successfully
   - Validate YAML manifests
   - Test plugin components

---

## Plugin Manifest (.karimo/plugins.yaml)

After installation, plugins are tracked in `.karimo/plugins.yaml`:

```yaml
# .karimo/plugins.yaml
plugins:
  - name: "greptile-integration"
    version: "1.0.0"
    author: "Greptile"
    source: "https://github.com/greptile/karimo-plugin"
    type: "review-provider"
    enabled: true
    installed_at: "2026-03-11T18:30:00Z"
    provides:
      agents: ["greptile-reviewer"]
      commands: []
      skills: []
      templates: []
    requires:
      env_vars: ["GREPTILE_API_KEY"]
      min_karimo_version: "5.5.0"

  - name: "mobile-dev"
    version: "2.1.0"
    author: "KARIMO Community"
    source: "https://github.com/karimo-plugins/mobile-dev"
    type: "agent-extension"
    enabled: true
    installed_at: "2026-03-10T15:00:00Z"
    provides:
      agents: ["karimo-mobile-implementer", "karimo-mobile-tester"]
      skills: ["karimo-mobile-standards"]
    requires:
      min_karimo_version: "5.0.0"
```

---

## Plugin Commands

### /karimo-plugin install

Install a plugin from a repository:

```bash
# Install from GitHub
/karimo-plugin install greptile/karimo-plugin

# Install from full URL
/karimo-plugin install https://github.com/greptile/karimo-plugin

# Install specific version
/karimo-plugin install greptile/karimo-plugin@v1.2.0
```

### /karimo-plugin list

List installed plugins:

```bash
/karimo-plugin list
```

Output:
```
Installed KARIMO Plugins (2)

✓ greptile-integration (v1.0.0)
  Author: Greptile
  Type: review-provider
  Status: Enabled
  Provides: 1 agent

✓ mobile-dev (v2.1.0)
  Author: KARIMO Community
  Type: agent-extension
  Status: Enabled
  Provides: 2 agents, 1 skill
```

### /karimo-plugin enable/disable

Toggle plugin without uninstalling:

```bash
/karimo-plugin disable greptile-integration
/karimo-plugin enable greptile-integration
```

### /karimo-plugin update

Update installed plugins:

```bash
# Update all plugins
/karimo-plugin update

# Update specific plugin
/karimo-plugin update greptile-integration
```

### /karimo-plugin uninstall

Remove a plugin:

```bash
/karimo-plugin uninstall greptile-integration
```

Uninstallation:
1. Run `pre_uninstall` hook
2. Remove plugin files from `.claude/` and `.karimo/`
3. Remove plugin directory
4. Remove from `.karimo/plugins.yaml`
5. Optionally revert config changes

---

## Plugin Development Best Practices

### 1. Versioning

Use semantic versioning (semver):
- **Major**: Breaking changes (e.g., renamed agent, removed skill)
- **Minor**: New features (e.g., added agent, new hook)
- **Patch**: Bug fixes, docs updates

### 2. Compatibility

Specify KARIMO version requirements:

```yaml
requires:
  min_karimo_version: "5.5.0"  # This plugin requires 5.5.0+
  max_karimo_version: "6.9.9"  # Known to work up to 6.9.9
```

### 3. Namespacing

Prefix plugin files to avoid conflicts:

```
# Bad: Could conflict with other plugins
agents/reviewer.md
skills/standards.md

# Good: Plugin-specific namespace
agents/greptile-reviewer.md
skills/greptile-standards.md
```

### 4. Configuration

Minimize required environment variables:

```yaml
config:
  env_vars:
    - name: "GREPTILE_API_KEY"
      required: true   # Only require truly essential vars
    - name: "GREPTILE_TIMEOUT"
      required: false  # Optional with sensible defaults
      default: "300"
```

### 5. Documentation

Include comprehensive README in plugin repository:

```markdown
# Greptile Integration Plugin

## Installation

/karimo-plugin install greptile/karimo-plugin

## Configuration

1. Get API key from greptile.app
2. Set environment variable:
   export GREPTILE_API_KEY="your-key"
3. Run /karimo:configure --review

## Usage

Plugin automatically activates when review.provider is set to "greptile".

## Troubleshooting

...
```

### 6. Testing

Test plugin installation:

```bash
# Create test KARIMO project
mkdir test-project && cd test-project
# Install KARIMO
# Install plugin
/karimo-plugin install your-plugin
# Verify
/karimo:doctor
```

---

## Plugin Distribution

### GitHub Release

1. Tag version:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Create GitHub release:
   ```bash
   gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
   ```

### Plugin Registry (Future)

KARIMO will maintain an official plugin registry:

```yaml
# plugins-registry.yaml (hosted by KARIMO)
plugins:
  - name: "greptile-integration"
    repository: "https://github.com/greptile/karimo-plugin"
    official: true
    verified: true
    downloads: 1250
```

Users can install by short name:

```bash
/karimo-plugin install greptile-integration
# Resolves to full GitHub URL via registry
```

---

## Security Considerations

### Plugin Review

Before publishing:
- No hardcoded secrets
- No malicious code execution
- Dependencies documented
- License specified

### User Trust Model

- **Official plugins**: Verified by KARIMO maintainers
- **Community plugins**: User installs at own risk
- **Private plugins**: For internal use only

### Sandboxing (Future)

Future versions may sandbox plugins:
- Restricted file system access
- Limited API permissions
- Resource quotas

---

## Example: Creating a Simple Plugin

### Goal

Create a "Notion Integration" plugin that:
- Creates Notion pages for each PRD
- Updates page status as tasks complete
- Links PRs to Notion tasks

### Step 1: Create Repository

```bash
mkdir karimo-notion-plugin
cd karimo-notion-plugin
git init
```

### Step 2: Create Manifest

```yaml
# karimo-plugin.yaml
name: "notion-integration"
version: "1.0.0"
author: "Your Name"
description: "Sync KARIMO PRDs and tasks with Notion"
repository: "https://github.com/yourname/karimo-notion-plugin"
license: "MIT"

requires:
  min_karimo_version: "6.0.0"

provides:
  agents: []
  commands: []
  skills: []
  templates: []

config:
  env_vars:
    - name: "NOTION_API_KEY"
      description: "Notion API key from notion.so/my-integrations"
      required: true
    - name: "NOTION_DATABASE_ID"
      description: "Notion database ID for KARIMO PRDs"
      required: true

hooks:
  post_install: "scripts/setup-notion.sh"
```

### Step 3: Create Lifecycle Hooks

```bash
# hooks/pre-task.sh
#!/bin/bash
# Create Notion task page

NOTION_API="https://api.notion.com/v1"

curl -X POST "$NOTION_API/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d "{
    \"parent\": {\"database_id\": \"$NOTION_DATABASE_ID\"},
    \"properties\": {
      \"Name\": {\"title\": [{\"text\": {\"content\": \"$TASK_NAME\"}}]},
      \"PRD\": {\"rich_text\": [{\"text\": {\"content\": \"$PRD_SLUG\"}}]},
      \"Status\": {\"status\": {\"name\": \"In Progress\"}}
    }
  }"
```

### Step 4: Create Setup Script

```bash
# scripts/setup-notion.sh
#!/bin/bash

echo "Setting up Notion integration..."

# Check for required env vars
if [ -z "$NOTION_API_KEY" ]; then
  echo "Error: NOTION_API_KEY not set"
  echo "Get your API key from: https://notion.so/my-integrations"
  exit 1
fi

# Copy hooks to .karimo/hooks/
cp hooks/*.sh ../.karimo/hooks/
chmod +x ../.karimo/hooks/*.sh

echo "✓ Notion integration ready"
echo "  - Hooks installed to .karimo/hooks/"
echo "  - Set NOTION_DATABASE_ID to your Notion database"
```

### Step 5: Test & Publish

```bash
# Test locally
/karimo-plugin install ./karimo-notion-plugin

# Publish to GitHub
git add .
git commit -m "Initial Notion plugin"
git tag v1.0.0
git remote add origin https://github.com/yourname/karimo-notion-plugin
git push origin main --tags

# Users install via:
/karimo-plugin install yourname/karimo-notion-plugin
```

---

## Troubleshooting

### Plugin Installation Failed

**Symptoms:**
- `/karimo-plugin install` reports error
- Plugin files not copied

**Causes:**
1. Invalid `karimo-plugin.yaml`
2. KARIMO version incompatibility
3. Network error fetching repository

**Fix:**
```bash
# Validate manifest
python3 -c "import yaml; yaml.safe_load(open('karimo-plugin.yaml'))"

# Check KARIMO version
cat .karimo/VERSION

# Try manual clone
git clone https://github.com/{org}/{repo} /tmp/test-plugin
cd /tmp/test-plugin
cat karimo-plugin.yaml
```

### Plugin Not Appearing in Commands

**Symptoms:**
- Installed plugin commands don't show in `/` autocomplete
- Agents not available

**Causes:**
1. Files not copied to correct location
2. Claude Code cache not refreshed
3. Plugin disabled

**Fix:**
```bash
# Check files copied
ls .claude/commands/  # Should see plugin commands
ls .claude/agents/    # Should see plugin agents

# Restart Claude Code to refresh cache

# Check plugin status
/karimo-plugin list
# Should show "Status: Enabled"
```

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — KARIMO component structure
- [COMMANDS.md](COMMANDS.md) — Slash command reference
- [GETTING-STARTED.md](GETTING-STARTED.md) — KARIMO setup basics

---

*Plugin system added in KARIMO v6.0*
