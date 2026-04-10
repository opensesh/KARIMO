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

### Manual Import (Recommended)

The primary workflow for user-provided screenshots and mockups:

**Step 1: Prompt User**

During research or planning interview:
```
Do you have any screenshots or mockups to add?
If yes, please drag them into:
  .karimo/prds/{slug}/assets/

Let me know when you're done, or say 'skip' to continue without.
```

**Step 2: Scan & Rename**

After user confirms, agent runs:
```bash
node .karimo/scripts/karimo-assets.js import {prd-slug}
```

This command:
1. Scans `assets/` for files NOT in `assets.json`
2. Auto-generates description from filename
3. Renames: `Screenshot 2026-03-19.png` → `{description}-{timestamp}.png`
4. Adds to `assets.json` manifest
5. Returns markdown references for embedding

**Example Output:**
```
Scanning .karimo/prds/user-auth/assets/...

✅ Imported: login-mockup-20260319220000.png
   Was: Screenshot 2026-03-19 at 10.30.45 AM.png

✅ Imported: dashboard-wireframe-20260319220001.png
   Was: dashboard wireframe.png

⚠️  Skipped: logo.png (already tracked)

Markdown references:
![login-mockup](./assets/login-mockup-20260319220000.png)
![dashboard-wireframe](./assets/dashboard-wireframe-20260319220001.png)
```

**Step 3: Reference in Findings/PRD**

Agent embeds the markdown references with clear descriptions so future agents understand what each screenshot shows.

**Anytime Import:** User can add more screenshots at any point and say "I added more screenshots" — agent re-runs import (idempotent, only processes new files).

---

### URL-Based Import

For images from URLs during research or interviews:

```bash
node .karimo/scripts/karimo-assets.js add "{prd-slug}" "{image-url}" "{stage}" "{description}" "{added-by}"
```

The agent automatically:
1. Downloads the file from URL
2. Stores in `assets/{stage}/` with timestamped filename
3. Updates `assets.json` metadata
4. Returns markdown reference for embedding

---

## Storage Structure

### Folder Organization

There are two folder structures depending on how assets are added:

**Manual Import (Flat Structure):**
```
.karimo/prds/{prd-slug}/
├── assets/                                 # Flat folder (no subfolders)
│   ├── login-mockup-20260319220000.png    # Auto-renamed from user file
│   ├── dashboard-wireframe-20260319220001.png
│   └── *.png, *.jpg, ...
├── assets.json                             # Metadata manifest
└── PRD_my-feature.md                      # PRD with asset references
```

**URL-Based Import (Staged Structure):**
```
.karimo/prds/{prd-slug}/
├── assets/
│   ├── research/                           # Research-phase assets (from URLs)
│   │   ├── research-user-flow-20260315143022.png
│   │   └── research-api-diagram-20260315144500.svg
│   ├── planning/                           # Planning/interview assets (from URLs)
│   │   └── planning-mockup-20260315151500.png
│   └── execution/                          # Execution-phase assets (from URLs)
│       └── execution-bug-screenshot-20260315163000.png
├── assets.json                             # Metadata manifest
└── PRD_my-feature.md                      # PRD with asset references
```

### Filename Convention

**Manual Import Pattern:** `{description}-{timestamp}.{ext}`

Examples:
- `login-mockup-20260319220000.png`
- `dashboard-wireframe-20260319220001.png`

**URL Import Pattern:** `{stage}-{description}-{timestamp}.{ext}`

Examples:
- `research-authentication-flow-20260315143022.png`
- `planning-mockup-dashboard-20260315151500.jpg`
- `execution-error-state-20260315163000.png`

**Benefits:**
- Human-readable without metadata lookup
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

## CLI Reference

All asset operations use the Node.js CLI script at `.karimo/scripts/karimo-assets.js`.

```bash
node .karimo/scripts/karimo-assets.js <command> [arguments]
```

### import — Import Untracked Files (Recommended)

Scan the assets folder for files not in `assets.json`, auto-rename, and add to manifest.

**Usage:**
```bash
node .karimo/scripts/karimo-assets.js import <prd-slug> [--dry-run]
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `prd-slug` | PRD identifier (e.g., "user-profiles") |
| `--dry-run` | Show what would be renamed without changing anything |

**Example:**
```bash
node .karimo/scripts/karimo-assets.js import user-profiles

# Output:
# Scanning .karimo/prds/user-profiles/assets/...
#
# ✅ Imported: login-mockup-20260319220000.png
#    Was: Screenshot 2026-03-19 at 10.30.45 AM.png
#
# ✅ Imported: dashboard-wireframe-20260319220001.png
#    Was: dashboard wireframe.png
#
# ⚠️  Skipped: logo.png (already tracked)
#
# Markdown references:
# ![login-mockup](./assets/login-mockup-20260319220000.png)
# ![dashboard-wireframe](./assets/dashboard-wireframe-20260319220001.png)
#
# Imported: 2 file(s)
# Skipped: 1 file(s)
```

**Auto-Description Logic:**

The import command auto-generates descriptions from filenames:
1. Strips common prefixes: "Screenshot ", "Screen Shot ", "IMG_", "Image ", "Untitled"
2. Strips date patterns: "2026-03-19", "at 10.30.45 AM", timestamps
3. Strips leading numbers: "001-", "1_"
4. Converts spaces/underscores to kebab-case
5. Fallback if nothing left: `asset-{N}`

**Examples:**
- `Screenshot 2026-03-19 at 10.30.45 AM.png` → `asset-001-20260319220000.png`
- `login-mockup.png` → `login-mockup-20260319220000.png`
- `Dashboard Wireframe Final v2.png` → `dashboard-wireframe-final-20260319220001.png`

---

### add — Add an Asset (URL-Based)

Download from URL or copy from local path, store with metadata.

**Usage:**
```bash
node .karimo/scripts/karimo-assets.js add <prd-slug> <source> <stage> <description> <added-by>
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `prd-slug` | PRD identifier (e.g., "user-profiles") |
| `source` | URL or local file path to the asset |
| `stage` | Lifecycle stage: `research`, `planning`, or `execution` |
| `description` | Human-readable description for the asset |
| `added-by` | Agent or user name who added the asset |

**Example:**
```bash
node .karimo/scripts/karimo-assets.js add user-profiles \
  "https://example.com/mockup.png" \
  planning \
  "Dashboard mockup" \
  "karimo-interviewer"

# Output:
# ✅ Asset stored: planning-dashboard-mockup-20260315151500.png
#    Stage: planning
#    Size: 128 KB
#    ID: asset-001
#
# Markdown reference:
# ![Dashboard mockup](./assets/planning/planning-dashboard-mockup-20260315151500.png)
```

### list — List Assets

Display all assets for a PRD with metadata.

**Usage:**
```bash
node .karimo/scripts/karimo-assets.js list <prd-slug> [stage]
```

**Parameters:**
- `prd-slug` — PRD identifier
- `stage` — Optional filter (research | planning | execution)

**Example:**
```bash
node .karimo/scripts/karimo-assets.js list user-profiles

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

### reference — Get Markdown Reference

Generate markdown reference for an asset by ID or filename.

**Usage:**
```bash
node .karimo/scripts/karimo-assets.js reference <prd-slug> <identifier>
```

**Parameters:**
- `prd-slug` — PRD identifier
- `identifier` — Asset ID (e.g., "asset-001") or filename

**Example:**
```bash
node .karimo/scripts/karimo-assets.js reference user-profiles asset-001

# Output:
# ![User flow mockup from product team](./assets/research/research-user-flow-20260315143022.png)
```

### validate — Check Asset Integrity

Verify files exist on disk and manifest is consistent.

**Usage:**
```bash
node .karimo/scripts/karimo-assets.js validate <prd-slug>
```

**Checks:**
1. All files in manifest exist on disk
2. All files on disk are tracked in manifest
3. File sizes match manifest
4. Report orphaned assets (on disk but not in manifest)
5. Report broken references (in manifest but missing from disk)

**Example:**
```bash
node .karimo/scripts/karimo-assets.js validate user-profiles

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

During `/karimo:plan` interview, the interviewer prompts for visual assets:

**Manual Import (Recommended):**
```
Interviewer: Do you have any mockups or wireframes?
If yes, drag them into: .karimo/prds/{slug}/assets/
Say 'done' when ready, or 'skip' to continue.

User: Done, I added some mockups.

Interviewer:
$ node .karimo/scripts/karimo-assets.js import my-feature
✅ Imported: dashboard-mockup-20260319220000.png
   Was: Dashboard Mockup Final.png

I've embedded the mockup in the PRD under "Visual Design".
```

**URL-Based (For Direct URLs):**
```
User: Here's the mockup: https://example.com/design.png

Interviewer:
$ node .karimo/scripts/karimo-assets.js add my-feature "https://example.com/design.png" planning "Design mockup" "karimo-interviewer"
✅ Asset stored: planning-mockup-20260315151500.png

I've embedded the mockup in the PRD under "Visual Design".
```

### Researcher Agent (Research Stage)

During `/karimo:research`, the researcher prompts for assets before beginning:

**Manual Import:**
```
Researcher: Do you have reference screenshots or diagrams?
If yes, drag them into: .karimo/prds/{slug}/assets/

User: Done.

Researcher:
$ node .karimo/scripts/karimo-assets.js import my-feature
✅ Imported: architecture-diagram-20260319220000.png
   Was: system-arch.png

Referenced in findings with description.
```

**URL-Based (For Research Findings):**
```
Researcher found OAuth2 diagram during documentation scraping:
$ node .karimo/scripts/karimo-assets.js add auth-flow "https://oauth.net/diagram.png" research "OAuth2 flow diagram" "karimo-researcher"
✅ Asset stored: research-oauth2-flow-20260315143022.png

Referenced in findings with source attribution.
```

### PM Agent (Execution Stage)

During `/karimo:run`, if user provides additional context:

```
User: I added a bug screenshot to the assets folder.

PM:
$ node .karimo/scripts/karimo-assets.js import my-feature
✅ Imported: error-state-20260319220000.png
   Was: bug-screenshot.png

Added to task 2a brief under "Additional Context".
```

### Brief Writer Agent

When generating task briefs:

1. Checks for asset references in PRD
2. Uses `node .karimo/scripts/karimo-assets.js list` to find relevant assets
3. Includes "Visual References" section if task mentions UI/design
4. Uses relative paths from briefs/ subdirectory

**Brief section (flat structure):**
```markdown
## Visual References

![Dashboard Mockup](../assets/dashboard-mockup-20260319220000.png)
*Dashboard design showing card-based layout with metrics at the top*
```

**Brief section (staged structure):**
```markdown
## Visual References

![Dashboard Mockup](../assets/planning/planning-mockup-dashboard-20260315151500.png)
*Dashboard design showing card-based layout with metrics at the top*
```

---

## Validation & Health Checks

### Running /karimo:doctor

The doctor command includes asset integrity validation:

```bash
/karimo:doctor

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
1. Identify file: `/karimo:doctor` shows filename
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
   node .karimo/scripts/karimo-assets.js add "{prd_slug}" "{original_source}" "{stage}" "{description}" "manual"
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
/karimo:doctor
# Shows: ❌ 1 broken reference: asset-003 (file missing from disk)
```

**Resolution:**
```bash
# Option 1: Re-download from original source
node .karimo/scripts/karimo-assets.js add "{prd_slug}" "{original_source}" "{stage}" "{description}" "manual"

# Option 2: Edit assets.json and remove broken entry
```

### Cross-Platform Issues

**macOS vs. Linux differences:**

1. **File size detection:**
   - macOS: `stat -f%z`
   - Linux: `stat -c%s`
   - **Solution:** Node.js CLI handles both automatically

2. **Hash command:**
   - macOS/Linux: `shasum -a 256`
   - Some Linux: `sha256sum`
   - **Solution:** Node.js CLI uses native crypto module (no shell dependency)

3. **Path separators:**
   - Use forward slashes `/` (works on all platforms including WSL)
   - Avoid backslashes `\` (Windows-specific)

---

## Examples

### Complete Workflow Example (Manual Import)

```bash
# 1. Run research
/karimo:research "authentication-flow"

# Researcher prompts for assets:
Agent: "Do you have reference screenshots?"

# User drags files to .karimo/prds/authentication-flow/assets/
User: Done, I added some reference diagrams.

# Agent imports:
$ node .karimo/scripts/karimo-assets.js import authentication-flow
✅ Imported: oauth-flow-diagram-20260319220000.png
   Was: OAuth2 Flow.png

# 2. Create PRD
/karimo:plan --prd authentication-flow

# During interview, user adds more files:
User: I added mockups to the assets folder.

# Agent imports:
$ node .karimo/scripts/karimo-assets.js import authentication-flow
✅ Imported: login-screen-mockup-20260319220100.png
   Was: login mockup v2.png

# 3. Execute tasks
/karimo:run --prd authentication-flow

# Brief writer includes assets in task briefs
# Workers see mockups during implementation

# 4. Bug reported during execution
User: I added a bug screenshot to assets.

# PM imports:
$ node .karimo/scripts/karimo-assets.js import authentication-flow
✅ Imported: error-state-20260319220200.png
   Was: auth-error.png

# 5. Validate integrity
/karimo:doctor

# Check 8: Asset Integrity
# PRD: authentication-flow
#   ✅ 3/3 assets validated
```

**Result:**
```
.karimo/prds/authentication-flow/
├── assets/
│   ├── oauth-flow-diagram-20260319220000.png
│   ├── login-screen-mockup-20260319220100.png
│   └── error-state-20260319220200.png
└── assets.json (3 entries)
```

### URL-Based Import Example

For assets from URLs (e.g., during research or when user provides URLs):

**Research stage:**
```bash
node .karimo/scripts/karimo-assets.js add "dashboard" \
  "https://docs.example.com/architecture.svg" \
  "research" \
  "System architecture" \
  "karimo-researcher"
```

**Planning stage:**
```bash
node .karimo/scripts/karimo-assets.js add "dashboard" \
  "https://figma.com/mockup.png" \
  "planning" \
  "Dashboard mockup" \
  "karimo-interviewer"
```

**Result:**
```
.karimo/prds/dashboard/
├── assets/
│   ├── research/
│   │   └── research-system-architecture-20260315143022.svg
│   └── planning/
│       └── planning-dashboard-mockup-20260315151500.png
└── assets.json (2 entries)
```

---

*For implementation details, see the Node.js CLI script at `.karimo/scripts/karimo-assets.js` and usage documentation in `.claude/plugins/karimo/skills/bash-utilities.md`*
