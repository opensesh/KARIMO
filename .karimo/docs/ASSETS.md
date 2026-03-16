# KARIMO Asset Management

Store and track images, screenshots, and visual artifacts throughout the PRD lifecycle.

---

## Overview

KARIMO's asset management system enables you to capture and reference visual context (mockups, diagrams, screenshots) at every stage of development:

- **Research** → External research findings, architecture diagrams
- **Planning** → User-provided mockups and designs during PRD interview
- **Execution** → Bug screenshots, error states discovered during implementation

**Key benefits:**

- **Stage-aware organization** — Assets organized by when they were added (research/planning/execution)
- **Lightweight metadata** — JSON manifest tracks source, timestamp, description without loading images into context
- **Cross-platform** — Works on macOS, Linux, WSL with no external dependencies
- **Duplicate detection** — SHA256 hashing prevents redundant storage
- **Portable references** — Markdown references work in PRDs, briefs, and documentation

---

## When to Use Asset Management

### Use Assets For

- **UI/UX mockups** from designers or product team
- **Architecture diagrams** from documentation or research
- **User flow visualizations** for complex interactions
- **Error screenshots** from bug reports or user testing
- **Design system references** showing component patterns
- **API diagrams** illustrating relationships and flows

### Don't Use Assets For

- Generic stock photos or decorative images
- Screenshots of text that can be quoted inline
- Copyrighted design work (link to original source instead)
- Temporary debugging images (use console logs instead)

---

## Quick Start

### Adding Assets During Planning

When running `/karimo-plan`, provide image URLs or file paths:

```
User: Here's the dashboard mockup: https://example.com/dashboard.png

Interviewer:
✓ Image stored: planning-dashboard-mockup-20260315151500.png
I've embedded the mockup in the PRD.
```

The interviewer agent automatically:
1. Downloads or copies the file
2. Stores in `assets/planning/` with timestamped filename
3. Updates `assets.json` metadata
4. Inserts markdown reference in PRD

### Adding Assets During Research

When running `/karimo-research`, the researcher agent captures relevant visuals:

```bash
# Researcher encounters OAuth2 flow diagram during documentation scraping
# Automatically downloads and stores:
✓ Asset stored: research-oauth2-flow-20260315143022.png

# References in findings:
![OAuth2 Flow](./assets/research/research-oauth2-flow-20260315143022.png)
```

### Adding Assets During Execution

The PM agent can store bug screenshots or runtime context:

```
User: Here's a screenshot of the error: /Users/me/Desktop/error.png

PM:
✓ Asset stored: execution-error-state-20260315163000.png
I've added this to task 2a's brief.
```

---

## Storage Structure

### Folder Organization

```
.karimo/prds/{prd-slug}/
├── assets/
│   ├── research/                           # Research-phase assets
│   │   ├── research-user-flow-20260315143022.png
│   │   └── research-api-diagram-20260315144500.svg
│   ├── planning/                           # Planning/interview assets
│   │   ├── planning-mockup-20260315151500.png
│   │   └── planning-figma-export-20260315152200.jpg
│   └── execution/                          # Execution-phase assets
│       └── execution-bug-screenshot-20260315163000.png
├── assets.json                             # Metadata manifest
└── PRD_my-feature.md                      # PRD with asset references
```

### Filename Convention

**Pattern:** `{stage}-{description}-{timestamp}.{ext}`

**Examples:**
- `research-authentication-flow-20260315143022.png`
- `planning-mockup-dashboard-20260315151500.jpg`
- `execution-error-state-20260315163000.png`

**Benefits:**
- Human-readable without metadata lookup
- Stage prefix enables quick visual scanning
- Description provides context at a glance
- Timestamp ensures uniqueness and chronological ordering

### Metadata Format (assets.json)

```json
{
  "version": "1.0",
  "assets": [
    {
      "id": "asset-001",
      "filename": "research-user-flow-20260315143022.png",
      "originalSource": "https://example.com/designs/flow.png",
      "sourceType": "url",
      "stage": "research",
      "timestamp": "2026-03-15T14:30:22Z",
      "addedBy": "karimo-researcher",
      "description": "User flow mockup from product team",
      "referencedIn": ["PRD_my-feature.md"],
      "size": 45678,
      "mimeType": "image/png",
      "sha256": "a3b5c7d9..."
    }
  ]
}
```

**Fields:**
- `id` — Unique identifier (sequential: asset-001, asset-002, ...)
- `filename` — Actual filename on disk
- `originalSource` — URL or path where asset came from
- `sourceType` — "url" (downloaded) or "upload" (local file copied)
- `stage` — research | planning | execution
- `timestamp` — ISO 8601 timestamp when asset was added
- `addedBy` — Agent or user who added it (karimo-researcher, karimo-interviewer, karimo-pm)
- `description` — Human-readable description
- `referencedIn` — Array of files that reference this asset
- `size` — File size in bytes
- `mimeType` — MIME type (image/png, image/jpeg, etc.)
- `sha256` — Hash for duplicate detection

---

## Supported File Types

| Type | Extensions | Use Case |
|------|------------|----------|
| Images | png, jpg, jpeg, gif | Mockups, screenshots, UI designs |
| Vectors | svg | Diagrams, icons, scalable graphics |
| Documents | pdf | Design specs, architecture docs |
| Videos | mp4 | Interaction demos, screen recordings |

**File size recommendations:**
- ✅ Under 1 MB: Optimal
- ⚠️  1-10 MB: Acceptable (warning shown)
- ❌ Over 10 MB: Not recommended (consider compression or external hosting)

---

## Bash Utilities Reference

All asset operations are handled by bash functions in the `karimo-bash-utilities` skill.

### karimo_add_asset()

Download from URL or copy from local path, store with metadata.

**Signature:**
```bash
karimo_add_asset <prd_slug> <source> <stage> <description> <added_by>
```

**Parameters:**
- `prd_slug` — PRD identifier (e.g., "user-profiles")
- `source` — URL (https://...) or local file path (/Users/...)
- `stage` — research | planning | execution
- `description` — Brief description (e.g., "Dashboard mockup")
- `added_by` — Agent name (e.g., "karimo-interviewer")

**Returns:** Markdown reference string

**Example:**
```bash
source .claude/skills/karimo-bash-utilities.md
karimo_add_asset "user-profiles" \
  "https://example.com/mockup.png" \
  "planning" \
  "Dashboard mockup" \
  "karimo-interviewer"

# Output:
# ✅ Asset stored: planning-dashboard-mockup-20260315151500.png
#    Stage: planning
#    Size: 128 KB
#    Reference: ![Dashboard mockup](./assets/planning/planning-dashboard-mockup-20260315151500.png)
```

### karimo_list_assets()

Display all assets for a PRD with metadata.

**Signature:**
```bash
karimo_list_assets <prd_slug> [stage]
```

**Parameters:**
- `prd_slug` — PRD identifier
- `stage` — Optional filter (research | planning | execution)

**Example:**
```bash
karimo_list_assets "user-profiles"

# Output:
# Assets for PRD: user-profiles
#
# Research (2 assets):
#   [asset-001] research-user-flow-20260315143022.png
#         Source: https://example.com/flow.png
#         Added: 2026-03-15 14:30:22 by karimo-researcher
#         Size: 45 KB
#
# Planning (1 asset):
#   [asset-002] planning-mockup-20260315151500.png
#         Source: /Users/me/Desktop/mockup.png (upload)
#         Added: 2026-03-15 15:15:00 by karimo-interviewer
#         Size: 128 KB
```

### karimo_get_asset_reference()

Generate markdown reference for an asset by ID or filename.

**Signature:**
```bash
karimo_get_asset_reference <prd_slug> <identifier>
```

**Parameters:**
- `prd_slug` — PRD identifier
- `identifier` — Asset ID (e.g., "asset-001") or filename

**Returns:** Markdown reference string

**Example:**
```bash
karimo_get_asset_reference "user-profiles" "asset-001"

# Output:
# ![User flow mockup from product team](./assets/research/research-user-flow-20260315143022.png)
```

### karimo_validate_assets()

Check asset integrity (files exist, manifest is valid).

**Signature:**
```bash
karimo_validate_assets <prd_slug>
```

**Checks:**
1. All files in manifest exist on disk
2. All files on disk are tracked in manifest
3. File sizes match manifest
4. Report orphaned assets (on disk but not in manifest)
5. Report broken references (in manifest but missing from disk)

**Example:**
```bash
karimo_validate_assets "user-profiles"

# Output:
# Asset Integrity Validation
# ──────────────────────────
#
# PRD: user-profiles
#   ✅ 5/5 assets validated
#
# ✅ All assets valid
```

---

## Agent Integration

### Interviewer Agent (Planning Stage)

During `/karimo-plan` interview, when user provides images:

1. Agent calls `karimo_add_asset()` with stage="planning"
2. Returns markdown reference for PRD embedding
3. Confirms storage to user

**User interaction:**
```
User: Here's the mockup: https://example.com/design.png

Interviewer:
✓ Image stored: planning-mockup-20260315151500.png
I've embedded the mockup in the PRD under "Visual Design".
```

### Researcher Agent (Research Stage)

During `/karimo-research`, when encountering relevant images:

1. Uses Firecrawl screenshot tools or WebFetch
2. Calls `karimo_add_asset()` with stage="research"
3. References in `research/external/findings.md`

**Automatic capture:**
```
Researcher found OAuth2 diagram during documentation scraping:
✓ Asset stored: research-oauth2-flow-20260315143022.png

Referenced in findings with source attribution.
```

### PM Agent (Execution Stage)

During `/karimo-run`, if user provides additional context:

1. Calls `karimo_add_asset()` with stage="execution"
2. Updates relevant task brief or creates findings file
3. Notifies active workers via PR comments

**Runtime context:**
```
User: Screenshot of bug: /Users/me/Desktop/error.png

PM:
✓ Asset stored: execution-bug-screenshot-20260315163000.png
Added to task 2a brief under "Additional Context".
```

### Brief Writer Agent

When generating task briefs:

1. Checks for asset references in PRD
2. Uses `karimo_list_assets()` to find relevant assets
3. Includes "Visual References" section if task mentions UI/design
4. Uses relative paths from briefs/ subdirectory

**Brief section:**
```markdown
## Visual References

![Dashboard Mockup](../assets/planning/planning-mockup-dashboard-20260315151500.png)
*Dashboard design showing card-based layout with metrics at the top*
```

---

## Validation & Health Checks

### Running /karimo-doctor

The doctor command includes asset integrity validation:

```bash
/karimo-doctor

# Includes Check 8: Asset Integrity
# - Validates all manifest assets exist on disk
# - Detects orphaned assets (not in manifest)
# - Validates file sizes match metadata
```

**Example output:**
```
Check 8: Asset Integrity
────────────────────────

PRD: user-profiles
  ✅ 5/5 assets validated

PRD: token-studio
  ⚠️  1 orphaned file: assets/planning/old-mockup.png

Summary:
  ✅ 8 assets validated across 2 PRDs
  ⚠️  1 orphaned asset (non-blocking)
```

### Detecting Orphaned Assets

**Orphaned asset:** File on disk but not tracked in `assets.json`

**Causes:**
- Manual file addition to assets/ folder
- Manifest corruption or incomplete update
- Failed asset addition operation

**Resolution:**
1. Identify file: `/karimo-doctor` shows filename
2. Options:
   - Add to manifest manually (regenerate ID and metadata)
   - Delete file: `rm .karimo/prds/{slug}/assets/{stage}/{filename}`

### Fixing Broken References

**Broken reference:** Entry in `assets.json` but file missing from disk

**Causes:**
- Accidental file deletion
- Incomplete download or copy operation
- Disk cleanup or migration issue

**Resolution:**
1. Re-download asset:
   ```bash
   karimo_add_asset "{prd_slug}" "{original_source}" "{stage}" "{description}" "manual"
   ```
2. Or remove from manifest:
   ```bash
   # Edit assets.json and remove the broken entry
   ```

---

## Best Practices

### When to Upload vs. Link

**Upload (copy/download):**
- Mockups from designers (may change or be deleted)
- Bug screenshots from users
- Research findings from external docs
- Critical design references

**Link (reference only):**
- Public documentation images (stable URLs)
- Large video files (>10MB)
- Third-party design systems
- Figma files (use Figma URLs in PRD text)

### File Size Considerations

- **Compress images** before uploading (use tools like ImageOptim, TinyPNG)
- **Use appropriate formats:**
  - PNG for screenshots and mockups (lossless)
  - JPG for photographs (lossy, smaller)
  - SVG for diagrams and icons (scalable)
- **Warning threshold:** 10 MB (shown during upload)
- **Consider external hosting** for videos and large files

### Duplicate Detection

The system detects duplicates via SHA256 hash:

```
⚠️  Duplicate detected: This asset content already exists in the PRD
   Existing: planning-mockup-20260315151500.png
   New: planning-mockup-v2-20260315152000.png

Continue anyway? (y/n)
```

**Scenarios:**
- Same mockup uploaded twice (skip upload)
- Updated version of mockup (proceed with new version)
- Different description, same file (use existing reference)

### Cross-Referencing Assets

**In PRDs:**
```markdown
See dashboard mockup: ![Dashboard](./assets/planning/planning-mockup-20260315151500.png)
```

**In task briefs:**
```markdown
![Dashboard Mockup](../assets/planning/planning-mockup-20260315151500.png)
```

**In research findings:**
```markdown
![OAuth2 Flow](./assets/research/research-oauth2-flow-20260315143022.png)
Source: https://oauth.net/2/grant-types/authorization-code/
```

---

## Troubleshooting

### Download Failures

**Symptom:** `❌ Download failed: <URL>`

**Causes:**
- Invalid or broken URL
- Network connectivity issues
- Server requires authentication
- CORS or access restrictions

**Solutions:**
1. Verify URL is accessible in browser
2. Download manually and use local file path instead
3. Check network connection
4. Use screenshot tool to capture instead

### Missing Dependencies

**Symptom:** `❌ curl/wget not found` or `❌ Node.js not found`

**Required tools:**
- **curl** or **wget** — For downloading from URLs
- **shasum** or **sha256sum** — For hash calculation
- **Node.js** — For JSON manipulation

**Installation:**
- macOS: `brew install curl node`
- Ubuntu: `apt install curl nodejs`
- WSL: `apt install curl nodejs`

### Broken References

**Symptom:** Asset listed in `assets.json` but file missing

**Detection:**
```bash
/karimo-doctor
# Shows: ❌ 1 broken reference: asset-003 (file missing from disk)
```

**Resolution:**
```bash
# Option 1: Re-download from original source
karimo_add_asset "{prd_slug}" "{original_source}" "{stage}" "{description}" "manual"

# Option 2: Edit assets.json and remove broken entry
```

### Cross-Platform Issues

**macOS vs. Linux differences:**

1. **File size detection:**
   - macOS: `stat -f%z`
   - Linux: `stat -c%s`
   - **Solution:** Bash utilities handle both automatically

2. **Hash command:**
   - macOS/Linux: `shasum -a 256`
   - Some Linux: `sha256sum`
   - **Solution:** Bash utilities detect and use available command

3. **Path separators:**
   - Use forward slashes `/` (works on all platforms including WSL)
   - Avoid backslashes `\` (Windows-specific)

---

## Examples

### Complete Workflow Example

```bash
# 1. Run research
/karimo-research "authentication-flow"

# Researcher captures OAuth2 diagram:
# ✓ Asset stored: research-oauth2-flow-20260315143022.png

# 2. Create PRD
/karimo-plan --prd authentication-flow

# During interview, user provides mockup:
User: Login screen: https://example.com/login-mockup.png

# Interviewer stores asset:
# ✓ Asset stored: planning-login-screen-20260315151500.png

# 3. Execute tasks
/karimo-run --prd authentication-flow

# Brief writer includes assets in task briefs
# Workers see mockups during implementation

# 4. Bug reported during execution
User: Error screenshot: /Users/me/Desktop/auth-error.png

# PM stores execution asset:
# ✓ Asset stored: execution-auth-error-20260315163000.png

# 5. Validate integrity
/karimo-doctor

# Check 8: Asset Integrity
# PRD: authentication-flow
#   ✅ 3/3 assets validated
```

### Multi-Stage Asset Example

**Research stage:**
```bash
karimo_add_asset "dashboard" \
  "https://docs.example.com/architecture.svg" \
  "research" \
  "System architecture" \
  "karimo-researcher"
```

**Planning stage:**
```bash
karimo_add_asset "dashboard" \
  "https://figma.com/mockup.png" \
  "planning" \
  "Dashboard mockup" \
  "karimo-interviewer"
```

**Execution stage:**
```bash
karimo_add_asset "dashboard" \
  "/Users/dev/Desktop/bug-screenshot.png" \
  "execution" \
  "Rendering bug" \
  "karimo-pm"
```

**Result:**
```
.karimo/prds/dashboard/
├── assets/
│   ├── research/
│   │   └── research-system-architecture-20260315143022.svg
│   ├── planning/
│   │   └── planning-dashboard-mockup-20260315151500.png
│   └── execution/
│       └── execution-rendering-bug-20260315163000.png
└── assets.json (3 entries)
```

---

*For implementation details, see the bash utilities in `.claude/skills/karimo-bash-utilities.md`*
