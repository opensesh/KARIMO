#!/usr/bin/env node

/**
 * KARIMO Asset Management CLI
 *
 * Standalone Node.js script for managing visual assets (images, screenshots, diagrams)
 * throughout the PRD lifecycle. This replaces the bash functions that couldn't be sourced
 * from markdown files.
 *
 * Usage:
 *   node .karimo/scripts/karimo-assets.js add <prd-slug> <source> <stage> <description> <added-by>
 *   node .karimo/scripts/karimo-assets.js list <prd-slug> [stage]
 *   node .karimo/scripts/karimo-assets.js reference <prd-slug> <identifier>
 *   node .karimo/scripts/karimo-assets.js validate <prd-slug>
 *
 * No external npm dependencies - uses only Node.js built-in modules.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ==============================================================================
// CONSTANTS
// ==============================================================================

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf', 'mp4'];
const SIZE_WARNING_BYTES = 10 * 1024 * 1024; // 10MB
const PRDS_DIR = '.karimo/prds';

const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4'
};

// ==============================================================================
// HELPERS
// ==============================================================================

/**
 * Find PRD directory (handles both prefixed and non-prefixed names)
 */
function findPrdDir(prdSlug) {
  // Try exact match first
  const exactPath = path.join(PRDS_DIR, prdSlug);
  if (fs.existsSync(exactPath) && fs.statSync(exactPath).isDirectory()) {
    return exactPath;
  }

  // Try with numeric prefix pattern: NNN_prd-slug
  if (fs.existsSync(PRDS_DIR)) {
    const dirs = fs.readdirSync(PRDS_DIR);
    for (const dir of dirs) {
      if (dir.endsWith(`_${prdSlug}`)) {
        const fullPath = path.join(PRDS_DIR, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          return fullPath;
        }
      }
    }
  }

  return null;
}

/**
 * Get file extension from path/URL (lowercase)
 */
function getExtension(source) {
  const match = source.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Check if source is a URL
 */
function isUrl(source) {
  return /^https?:\/\//i.test(source);
}

/**
 * Download file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 30000 }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download ${url}`));
        return;
      }

      const file = fs.createWriteStream(destPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Clean up partial file
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Calculate SHA256 hash of a file
 */
function calculateHash(filepath) {
  const fileBuffer = fs.readFileSync(filepath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Sanitize description for use in filename
 */
function sanitizeDescription(description) {
  return description
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Generate ISO timestamp
 */
function getIsoTimestamp() {
  return new Date().toISOString();
}

/**
 * Generate filename timestamp (compact format)
 */
function getFilenameTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '')
    .replace(/\..+$/, '')
    .substring(0, 14);
}

/**
 * Read or initialize assets manifest
 */
function readManifest(manifestPath) {
  if (fs.existsSync(manifestPath)) {
    const content = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(content);
  }
  return { version: '1.0', assets: [] };
}

/**
 * Write assets manifest
 */
function writeManifest(manifestPath, manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Format file size for display
 */
function formatSize(bytes) {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

// ==============================================================================
// COMMANDS
// ==============================================================================

/**
 * Add an asset to a PRD
 */
async function addAsset(prdSlug, source, stage, description, addedBy) {
  // Validate inputs
  if (!prdSlug || !source || !stage || !description || !addedBy) {
    console.error('Usage: node karimo-assets.js add <prd-slug> <source> <stage> <description> <added-by>');
    process.exit(1);
  }

  // Validate stage
  if (!['research', 'planning', 'execution'].includes(stage)) {
    console.error(`Invalid stage: ${stage} (must be research, planning, or execution)`);
    process.exit(1);
  }

  // Find PRD directory
  const prdDir = findPrdDir(prdSlug);
  if (!prdDir) {
    console.error(`PRD not found: ${prdSlug}`);
    process.exit(1);
  }

  // Validate file extension
  const ext = getExtension(source);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    console.error(`Unsupported file type: ${ext}`);
    console.error(`Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    process.exit(1);
  }

  // Create assets directory structure
  const assetsDir = path.join(prdDir, 'assets', stage);
  fs.mkdirSync(assetsDir, { recursive: true });

  // Generate timestamped filename
  const timestamp = getFilenameTimestamp();
  const safeDescription = sanitizeDescription(description);
  const filename = `${stage}-${safeDescription}-${timestamp}.${ext}`;
  const filepath = path.join(assetsDir, filename);

  // Download or copy file
  const sourceType = isUrl(source) ? 'url' : 'upload';

  try {
    if (sourceType === 'url') {
      console.log('Downloading asset from URL...');
      await downloadFile(source, filepath);
    } else {
      if (!fs.existsSync(source)) {
        console.error(`File not found: ${source}`);
        process.exit(1);
      }
      fs.copyFileSync(source, filepath);
    }
  } catch (err) {
    console.error(`Failed to ${sourceType === 'url' ? 'download' : 'copy'} file: ${err.message}`);
    process.exit(1);
  }

  // Get file stats
  const stats = fs.statSync(filepath);
  const size = stats.size;

  // Warn if file is large
  if (size > SIZE_WARNING_BYTES) {
    const sizeMB = Math.round(size / 1048576);
    console.log(`\u26a0\ufe0f  Large file: ${sizeMB} MB. Consider compression or external hosting.`);
  }

  // Calculate hash
  const hash = calculateHash(filepath);

  // Read manifest
  const manifestPath = path.join(prdDir, 'assets.json');
  const manifest = readManifest(manifestPath);

  // Check for duplicate hash
  const existingAsset = manifest.assets.find(a => a.sha256 === hash);
  if (existingAsset) {
    console.log(`\u26a0\ufe0f  Duplicate detected: This asset content already exists in the PRD`);
    console.log(`   Existing: ${existingAsset.filename}`);
    console.log(`   New: ${filename}`);
    console.log('');
    console.log('Adding anyway (hashes match but filenames differ).');
  }

  // Generate asset ID
  const assetId = `asset-${String(manifest.assets.length + 1).padStart(3, '0')}`;

  // Add asset to manifest
  const newAsset = {
    id: assetId,
    filename: filename,
    originalSource: source,
    sourceType: sourceType,
    stage: stage,
    timestamp: getIsoTimestamp(),
    addedBy: addedBy,
    description: description,
    referencedIn: [],
    size: size,
    mimeType: MIME_TYPES[ext] || 'application/octet-stream',
    sha256: hash
  };

  manifest.assets.push(newAsset);
  writeManifest(manifestPath, manifest);

  // Generate markdown reference
  const mdReference = `![${description}](./assets/${stage}/${filename})`;

  console.log(`\u2705 Asset stored: ${filename}`);
  console.log(`   Stage: ${stage}`);
  console.log(`   Size: ${formatSize(size)}`);
  console.log(`   ID: ${assetId}`);
  console.log('');
  console.log('Markdown reference:');
  console.log(mdReference);
}

/**
 * List assets for a PRD
 */
function listAssets(prdSlug, stageFilter) {
  if (!prdSlug) {
    console.error('Usage: node karimo-assets.js list <prd-slug> [stage]');
    process.exit(1);
  }

  // Find PRD directory
  const prdDir = findPrdDir(prdSlug);
  if (!prdDir) {
    console.error(`PRD not found: ${prdSlug}`);
    process.exit(1);
  }

  const manifestPath = path.join(prdDir, 'assets.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`No assets found for PRD: ${prdSlug}`);
    return;
  }

  const manifest = readManifest(manifestPath);
  const assets = manifest.assets || [];

  if (assets.length === 0) {
    console.log(`No assets found for PRD: ${prdSlug}`);
    return;
  }

  // Group by stage
  const byStage = {};
  for (const asset of assets) {
    if (!stageFilter || asset.stage === stageFilter) {
      if (!byStage[asset.stage]) {
        byStage[asset.stage] = [];
      }
      byStage[asset.stage].push(asset);
    }
  }

  console.log(`Assets for PRD: ${prdSlug}`);
  console.log('');

  for (const [stage, stageAssets] of Object.entries(byStage)) {
    const plural = stageAssets.length !== 1 ? 's' : '';
    console.log(`${stage.charAt(0).toUpperCase() + stage.slice(1)} (${stageAssets.length} asset${plural}):`);

    for (const asset of stageAssets) {
      const sizeDisplay = formatSize(asset.size);
      const sourceDisplay = asset.sourceType === 'url'
        ? asset.originalSource
        : `${asset.originalSource} (upload)`;
      const timeDisplay = asset.timestamp.replace('T', ' ').replace('Z', '').replace(/\.\d+$/, '');

      console.log(`  [${asset.id}] ${asset.filename}`);
      console.log(`        Source: ${sourceDisplay}`);
      console.log(`        Added: ${timeDisplay} by ${asset.addedBy}`);
      console.log(`        Size: ${sizeDisplay}`);

      if (asset.referencedIn && asset.referencedIn.length > 0) {
        console.log(`        Referenced in: ${asset.referencedIn.join(', ')}`);
      }
      console.log('');
    }
  }
}

/**
 * Get markdown reference for an asset
 */
function getReference(prdSlug, identifier) {
  if (!prdSlug || !identifier) {
    console.error('Usage: node karimo-assets.js reference <prd-slug> <identifier>');
    process.exit(1);
  }

  // Find PRD directory
  const prdDir = findPrdDir(prdSlug);
  if (!prdDir) {
    console.error(`PRD not found: ${prdSlug}`);
    process.exit(1);
  }

  const manifestPath = path.join(prdDir, 'assets.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`No assets manifest found for PRD: ${prdSlug}`);
    process.exit(1);
  }

  const manifest = readManifest(manifestPath);
  const assets = manifest.assets || [];

  // Find by ID or filename
  const asset = assets.find(a => a.id === identifier || a.filename === identifier);

  if (!asset) {
    console.error(`Asset not found: ${identifier}`);
    console.log('');
    console.log('Available assets:');
    for (const a of assets) {
      console.log(`  ${a.id}: ${a.filename}`);
    }
    process.exit(1);
  }

  const reference = `![${asset.description}](./assets/${asset.stage}/${asset.filename})`;
  console.log(reference);
}

/**
 * Validate assets for a PRD
 */
function validateAssets(prdSlug) {
  if (!prdSlug) {
    console.error('Usage: node karimo-assets.js validate <prd-slug>');
    process.exit(1);
  }

  // Find PRD directory
  const prdDir = findPrdDir(prdSlug);
  if (!prdDir) {
    console.error(`PRD not found: ${prdSlug}`);
    process.exit(1);
  }

  const manifestPath = path.join(prdDir, 'assets.json');
  const assetsDir = path.join(prdDir, 'assets');

  if (!fs.existsSync(manifestPath)) {
    console.log(`No assets manifest found for PRD: ${prdSlug}`);
    return;
  }

  const manifest = readManifest(manifestPath);
  const assets = manifest.assets || [];

  let validCount = 0;
  let brokenCount = 0;
  let sizeMismatchCount = 0;
  const brokenRefs = [];
  const sizeMismatches = [];

  // Validate manifest entries
  for (const asset of assets) {
    const filepath = path.join(prdDir, 'assets', asset.stage, asset.filename);

    if (!fs.existsSync(filepath)) {
      brokenCount++;
      brokenRefs.push(`  \u274c ${asset.id}: ${asset.filename} (file missing from disk)`);
    } else {
      const stats = fs.statSync(filepath);
      if (stats.size !== asset.size) {
        sizeMismatchCount++;
        sizeMismatches.push(`  \u26a0\ufe0f  ${asset.id}: Size mismatch (manifest: ${asset.size}, disk: ${stats.size})`);
      }
      validCount++;
    }
  }

  // Find orphaned files (on disk but not in manifest)
  const orphanedFiles = [];
  if (fs.existsSync(assetsDir)) {
    const stages = ['research', 'planning', 'execution'];
    for (const stage of stages) {
      const stageDir = path.join(assetsDir, stage);
      if (fs.existsSync(stageDir)) {
        const files = fs.readdirSync(stageDir);
        for (const file of files) {
          const isTracked = assets.some(a => a.filename === file && a.stage === stage);
          if (!isTracked) {
            orphanedFiles.push(`  \u26a0\ufe0f  ${stage}/${file} (not in manifest)`);
          }
        }
      }
    }
  }

  // Print report
  console.log('Asset Integrity Validation');
  console.log('\u2500'.repeat(26));
  console.log('');
  console.log(`PRD: ${prdSlug}`);
  console.log(`  \u2705 ${validCount}/${assets.length} assets validated`);

  if (brokenCount > 0) {
    console.log('');
    console.log('Broken references:');
    for (const ref of brokenRefs) {
      console.log(ref);
    }
  }

  if (sizeMismatchCount > 0) {
    console.log('');
    console.log('Size mismatches:');
    for (const mismatch of sizeMismatches) {
      console.log(mismatch);
    }
  }

  if (orphanedFiles.length > 0) {
    console.log('');
    console.log('Orphaned files:');
    for (const file of orphanedFiles) {
      console.log(file);
    }
    console.log('');
    console.log('Run: rm <filepath> to remove orphaned assets');
  }

  console.log('');

  if (brokenCount === 0 && sizeMismatchCount === 0 && orphanedFiles.length === 0) {
    console.log('\u2705 All assets valid');
  } else {
    console.log(`\u26a0\ufe0f  Issues found: ${brokenCount} broken, ${sizeMismatchCount} size mismatches, ${orphanedFiles.length} orphaned`);
  }

  // Exit code reflects validation status
  process.exit(brokenCount > 0 ? 1 : 0);
}

/**
 * Show help
 */
function showHelp() {
  console.log(`KARIMO Asset Management CLI

Usage:
  node .karimo/scripts/karimo-assets.js <command> [arguments]

Commands:
  add <prd-slug> <source> <stage> <description> <added-by>
      Add an asset to a PRD from URL or local file path

      Arguments:
        prd-slug     PRD identifier (e.g., "user-profiles")
        source       URL or local file path to the asset
        stage        Lifecycle stage: research, planning, or execution
        description  Human-readable description for the asset
        added-by     Agent or user name who added the asset

      Example:
        node .karimo/scripts/karimo-assets.js add user-profiles \\
          "https://example.com/mockup.png" planning "Dashboard mockup" "karimo-interviewer"

  list <prd-slug> [stage]
      List all assets for a PRD, optionally filtered by stage

      Example:
        node .karimo/scripts/karimo-assets.js list user-profiles
        node .karimo/scripts/karimo-assets.js list user-profiles planning

  reference <prd-slug> <identifier>
      Get markdown reference for an asset by ID or filename

      Example:
        node .karimo/scripts/karimo-assets.js reference user-profiles asset-001
        node .karimo/scripts/karimo-assets.js reference user-profiles planning-mockup-20260315151500.png

  validate <prd-slug>
      Check asset integrity (files exist, manifest is valid)

      Example:
        node .karimo/scripts/karimo-assets.js validate user-profiles

Supported file types:
  ${SUPPORTED_EXTENSIONS.join(', ')}

Size warning:
  Files larger than 10MB will trigger a warning suggesting compression or external hosting.
`);
}

// ==============================================================================
// MAIN
// ==============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'add':
      await addAsset(args[1], args[2], args[3], args[4], args[5]);
      break;
    case 'list':
      listAssets(args[1], args[2]);
      break;
    case 'reference':
      getReference(args[1], args[2]);
      break;
    case 'validate':
      validateAssets(args[1]);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('');
      showHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
